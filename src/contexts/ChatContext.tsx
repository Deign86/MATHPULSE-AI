import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { ApiTimeoutError, apiService } from '../services/apiService';
import { useAuth } from './AuthContext';
import {
  createChatSession as createFirebaseSession,
  getUserChatSessions,
  addMessageToSession as addFirebaseMessage,
  updateSessionTitle as updateFirebaseTitle,
  deleteSession as deleteFirebaseSession,
  getSessionMessages,
} from '../services/chatService';
import { toChatPreviewText } from '../utils/chatPreview';
import { formatAssistantResponseForStorage, formatAssistantResponseForStreaming } from '../utils/chatMessageFormatting';
import { getScopeBoundaryResponse } from '../utils/mathScope';

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  date: string;
  messageCount: number;
  preview: string;
  topics: string[];
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatContextType {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isLoading: boolean;
  loadingSessionId: string | null;
  sessionsLoaded: boolean;
  setActiveSessionId: (id: string | null) => void;
  createNewSession: (firstMessage?: Message) => string;
  addMessageToSession: (sessionId: string, message: Message) => void;
  sendMessage: (sessionId: string, userText: string) => Promise<void>;
  updateSessionTitle: (sessionId: string, title: string) => void;
  deleteSession: (sessionId: string) => void;
  getActiveSession: () => ChatSession | null;
  generateTitleFromMessages: (messages: Message[]) => string;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function isIncompleteResponse(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  const trailingSignals = [
    /```[^`]*$/,
    /\$\$[^$]*$/,
    /\$[^$\n]*$/,
    /\\\[[^\]]*$/,
    /\\\([^\)]*$/,
    /\\boxed\{[^}]*$/,
    /\\frac\{[^}]*\}\{?$/,
    /\\[a-zA-Z]+\s*$/,
    /(?:Step\s*\d+[:.]?)\s*$/i,
    /(?:Final\s*Answer[:.]?)\s*$/i,
  ];

  if (trailingSignals.some((pattern) => pattern.test(trimmed))) {
    return true;
  }

  const codeFenceCount = (trimmed.match(/```/g) ?? []).length;
  if (codeFenceCount % 2 !== 0) {
    return true;
  }

  const unescapedDollarCount = (() => {
    let count = 0;
    for (let i = 0; i < trimmed.length; i += 1) {
      if (trimmed[i] !== '$') continue;
      let slashCount = 0;
      for (let j = i - 1; j >= 0 && trimmed[j] === '\\'; j -= 1) {
        slashCount += 1;
      }
      if (slashCount % 2 === 0) {
        count += 1;
      }
    }
    return count;
  })();
  if (unescapedDollarCount % 2 !== 0) {
    return true;
  }

  const leftCount = (trimmed.match(/\\left\b/g) ?? []).length;
  const rightCount = (trimmed.match(/\\right\b/g) ?? []).length;
  if (leftCount !== rightCount) {
    return true;
  }

  const pairedChars: Array<[string, string]> = [
    ['(', ')'],
    ['[', ']'],
    ['{', '}'],
  ];
  for (const [openChar, closeChar] of pairedChars) {
    const openCount = (trimmed.match(new RegExp(`\\${openChar}`, 'g')) ?? []).length;
    const closeCount = (trimmed.match(new RegExp(`\\${closeChar}`, 'g')) ?? []).length;
    if (openCount > closeCount) {
      return true;
    }
  }

  return false;
}

function isPromptAnswerPairIncomplete(prompt: string, answer: string): boolean {
  const normalizedAnswer = answer.trim();
  const normalizedPrompt = prompt.toLowerCase();
  if (!normalizedAnswer) return true;

  if (isIncompleteResponse(normalizedAnswer)) {
    return true;
  }

  const strippedMarkdown = normalizedAnswer
    .replace(/[#*_`>|\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!strippedMarkdown) {
    return true;
  }

  if (
    strippedMarkdown.length < 24 &&
    /(derivative|integral|equation|complete|explain|step)/.test(normalizedPrompt)
  ) {
    return true;
  }

  if (normalizedPrompt.includes('derivative') && normalizedPrompt.includes('integral')) {
    const lowerAnswer = normalizedAnswer.toLowerCase();
    const hasDerivative = /derivative|f'|d\/dx/.test(lowerAnswer);
    const hasIntegral = /integral|∫|\\int/.test(lowerAnswer);
    if (!hasDerivative || !hasIntegral) {
      return true;
    }
  }

  if (
    normalizedPrompt.includes('complete equation') ||
    normalizedPrompt.includes('complete equations') ||
    normalizedPrompt.includes('step-by-step') ||
    normalizedPrompt.includes('step by step')
  ) {
    const equationSignalCount = (
      normalizedAnswer.match(/=|\\frac|\\int|∫|\\boxed|d\/dx|\b(dx|x\^\d+)\b/g) ?? []
    ).length;
    if (equationSignalCount < 2 || normalizedAnswer.length < 120) {
      return true;
    }
  }

  return false;
}

function mergeAnswerContinuation(base: string, continuation: string): string {
  const baseTrimmed = base.trim();
  const contTrimmed = continuation.trim();
  if (!baseTrimmed) return contTrimmed;
  if (!contTrimmed) return baseTrimmed;

  const maxOverlap = Math.min(baseTrimmed.length, contTrimmed.length, 220);
  for (let overlap = maxOverlap; overlap >= 24; overlap -= 1) {
    const tail = baseTrimmed.slice(-overlap);
    const head = contTrimmed.slice(0, overlap);
    if (tail === head) {
      return `${baseTrimmed}${contTrimmed.slice(overlap)}`.trim();
    }
  }

  if (baseTrimmed.endsWith(contTrimmed)) {
    return baseTrimmed;
  }
  if (contTrimmed.startsWith(baseTrimmed)) {
    return contTrimmed;
  }

  return `${baseTrimmed}\n\n${contTrimmed}`.trim();
}

function buildContinuationPrompt(originalQuestion: string, partialAnswer: string): string {
  return [
    'Continue the same solution from exactly where it stopped.',
    'Do not restart. Do not repeat completed parts. Keep the same formatting style.',
    'Finish all remaining steps and provide a complete final answer.',
    '',
    `Question: ${originalQuestion}`,
    '',
    'Current partial answer:',
    partialAnswer,
  ].join('\n');
}

function buildPlainContinuationPrompt(originalQuestion: string, partialAnswer: string): string {
  return [
    'Continue and complete the answer in plain text only.',
    'No markdown, no LaTeX, no code fences. Do not restart.',
    '',
    `Question: ${originalQuestion}`,
    '',
    'Current partial answer:',
    partialAnswer,
  ].join('\n');
}

function shouldShowStreamingChunks(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const formatSensitiveSignals = [
    'derivative',
    'integral',
    'equation',
    'latex',
    'step-by-step',
    'step by step',
    'formatting',
    'proof',
    'fraction',
    'limit',
    'matrix',
    'sqrt',
    'boxed',
    '^',
    'dx',
  ];
  return !formatSensitiveSignals.some((signal) => lower.includes(signal));
}

/** Generate a helpful math tutor response when backend is unavailable */
function generateFallbackResponse(userText: string): string {
  const scopeBoundaryResponse = getScopeBoundaryResponse(userText);
  if (scopeBoundaryResponse) {
    return scopeBoundaryResponse;
  }

  const lower = userText.toLowerCase().trim();

  // --- Conversational / non-math inputs ---
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(lower)) {
    return "Hello! I'm your MathPulse AI tutor. I can help you with algebra, calculus, geometry, statistics, and more. What math topic would you like to explore today?";
  }
  if (lower.includes('thank') || lower.includes('thanks')) {
    return "You're welcome! I'm always here to help with math. Feel free to ask about any topic — algebra, calculus, geometry, statistics, or anything else. Keep up the great work!";
  }
  if (/^(bye|goodbye|see you|later)\b/.test(lower)) {
    return "Goodbye! Come back anytime you need math help. Happy studying!";
  }

  // --- "What is X" / definitional questions ---
  const whatIsMatch = lower.match(/(?:what(?:'s| is| are)|tell me (?:about|what)|explain|define|describe)\s+(.+)/);
  if (whatIsMatch) {
    const topic = whatIsMatch[1].replace(/[?.!]+$/, '').trim();

    if (/\balgebra\b/.test(topic)) {
      return "## What is Algebra?\n\nAlgebra is a branch of mathematics that uses **letters and symbols** (like *x*, *y*, *a*, *b*) to represent numbers and quantities in equations and formulas.\n\n### Key concepts:\n- **Variables** — symbols that stand for unknown values\n- **Expressions** — combinations of numbers, variables, and operations (e.g., `3x + 5`)\n- **Equations** — statements that two expressions are equal (e.g., `2x + 3 = 11`)\n- **Functions** — rules that assign each input exactly one output\n\n### Why it matters:\nAlgebra is the foundation for almost all higher mathematics, including calculus, statistics, and physics. It teaches you to think abstractly and solve problems systematically.\n\n### Quick example:\nSolve `2x + 3 = 11`\n1. Subtract 3 from both sides → `2x = 8`\n2. Divide by 2 → `x = 4`\n\nWould you like to dive deeper into any specific area of algebra?";
    }
    if (/\bcalculus\b/.test(topic)) {
      return "## What is Calculus?\n\nCalculus is the mathematical study of **continuous change**. It has two main branches:\n\n### 1. Differential Calculus\nStudies **rates of change** and slopes of curves.\n- *Core tool:* the **derivative** — measures how fast a function changes at any point\n- *Example:* If position = t², then velocity = 2t\n\n### 2. Integral Calculus\nStudies **accumulation** of quantities and areas under curves.\n- *Core tool:* the **integral** — adds up infinitely many tiny pieces\n- *Example:* Area under y = x from 0 to 3 = ∫₀³ x dx = 9/2 = 4.5\n\n### Why it matters:\nCalculus is used in physics, engineering, economics, biology, and virtually every science. It lets you model anything that changes continuously.\n\nWant to start with derivatives, integrals, or limits?";
    }
    if (/\bgeometry\b/.test(topic)) {
      return "## What is Geometry?\n\nGeometry is the branch of mathematics that studies **shapes, sizes, positions, and properties** of figures and spaces.\n\n### Key areas:\n- **Euclidean Geometry** — points, lines, angles, triangles, circles, polygons\n- **Coordinate Geometry** — shapes on the x-y plane using algebra\n- **Solid Geometry** — 3D shapes like spheres, cylinders, cones\n- **Transformations** — rotations, reflections, translations, dilations\n\n### Fundamental concepts:\n- **Angles** — measured in degrees or radians\n- **Congruence & Similarity** — same shape/size vs. same shape/different size\n- **Pythagorean Theorem** — a² + b² = c² for right triangles\n- **Area & Volume formulas** for common shapes\n\nWhat geometry topic would you like to explore?";
    }
    if (/\btrigonometry|trig\b/.test(topic)) {
      return "## What is Trigonometry?\n\nTrigonometry is the study of relationships between **angles and sides** of triangles.\n\n### The core functions (SOH-CAH-TOA):\n- **sin(θ)** = Opposite / Hypotenuse\n- **cos(θ)** = Adjacent / Hypotenuse\n- **tan(θ)** = Opposite / Adjacent\n\n### Beyond triangles:\nTrig functions describe **periodic phenomena** like sound waves, light, tides, and circular motion.\n\n### Key identities:\n- sin²θ + cos²θ = 1\n- tan(θ) = sin(θ)/cos(θ)\n\nTrigonometry is essential for calculus, physics, and engineering. What trig topic would you like help with?";
    }
    if (/\bstatistic/.test(topic)) {
      return "## What is Statistics?\n\nStatistics is the branch of mathematics that deals with **collecting, analyzing, interpreting, and presenting data**.\n\n### Key areas:\n- **Descriptive Statistics** — summarizing data with measures like mean, median, mode, and standard deviation\n- **Inferential Statistics** — drawing conclusions about populations from samples\n- **Probability** — the mathematics of chance and uncertainty\n\n### Common measures:\n| Measure | Purpose |\n|---------|--------|\n| Mean    | Average of all values |\n| Median  | Middle value when sorted |\n| Mode    | Most frequent value |\n| Std Dev | How spread out values are |\n\nWant help with a specific statistics concept?";
    }
    if (/\bderivative/.test(topic)) {
      return "## What is a Derivative?\n\nA derivative measures the **instantaneous rate of change** of a function — essentially, how fast something is changing at a specific point.\n\n### Formal definition:\nf'(x) = lim(h→0) [f(x+h) - f(x)] / h\n\n### Intuition:\n- The derivative of **position** is **velocity**\n- The derivative of **velocity** is **acceleration**\n- Geometrically, it's the **slope of the tangent line** to the curve\n\n### Key rules:\n- **Power Rule:** d/dx[xⁿ] = nxⁿ⁻¹\n- **Product Rule:** d/dx[fg] = f'g + fg'\n- **Chain Rule:** d/dx[f(g(x))] = f'(g(x)) · g'(x)\n\nWould you like to practice finding derivatives?";
    }
    if (/\bintegral|integration/.test(topic)) {
      return "## What is Integration?\n\nIntegration is the process of finding the **accumulated total** of a quantity. It's the reverse of differentiation.\n\n### Two types:\n1. **Indefinite Integral** — finds a family of antiderivatives: ∫f(x) dx = F(x) + C\n2. **Definite Integral** — calculates the area under a curve: ∫ₐᵇ f(x) dx\n\n### Intuition:\n- If a derivative tells you *how fast* something changes, an integral tells you *how much* it accumulates\n- Area under a velocity-time graph = total distance traveled\n\n### Key rule:\n**Power Rule:** ∫xⁿ dx = xⁿ⁺¹/(n+1) + C  (n ≠ -1)\n\nWant to try some integration problems?";
    }
    if (/\blimit/.test(topic)) {
      return "## What is a Limit?\n\nA limit describes the value a function **approaches** as the input approaches some value.\n\n### Notation:\nlim(x→a) f(x) = L means \"as x gets closer and closer to a, f(x) gets closer and closer to L.\"\n\n### Why it matters:\nLimits are the **foundation of calculus** — both derivatives and integrals are defined using limits.\n\n### How to evaluate:\n1. **Direct substitution** — plug in the value first\n2. **Factor & cancel** — if you get 0/0\n3. **L'Hôpital's Rule** — for 0/0 or ∞/∞ forms\n\n### Example:\nlim(x→2) (x²-4)/(x-2) = lim(x→2) (x+2)(x-2)/(x-2) = lim(x→2) (x+2) = **4**\n\nWhat limit problem are you working on?";
    }
    if (/\bfraction/.test(topic)) {
      return "## What is a Fraction?\n\nA fraction represents a **part of a whole**. It's written as **a/b**, where:\n- **a** = numerator (parts you have)\n- **b** = denominator (total equal parts)\n\n### Operations:\n- **Addition:** a/b + c/d = (ad + bc) / bd\n- **Multiplication:** a/b × c/d = ac / bd\n- **Division:** a/b ÷ c/d = a/b × d/c (flip and multiply)\n\n### Example:\n3/4 + 2/3 = 9/12 + 8/12 = **17/12**\n\nWhat fraction problem can I help you with?";
    }
    if (/\bpercent/.test(topic)) {
      return "## What is a Percentage?\n\nA percentage is a way of expressing a number as a **fraction of 100**. The symbol **%** means \"per hundred.\"\n\n### Key formulas:\n- Percentage = (Part / Whole) × 100\n- Part = (Percentage × Whole) / 100\n- % Change = ((New - Old) / Old) × 100\n\n### Examples:\n- 25% of 200 = (25 × 200) / 100 = **50**\n- 15 is what % of 60? → (15/60) × 100 = **25%**\n\nNeed help with a specific percentage problem?";
    }
    if (/\bpythag/.test(topic)) {
      return "## What is the Pythagorean Theorem?\n\nThe Pythagorean Theorem states that in a **right triangle**, the square of the hypotenuse equals the sum of the squares of the other two sides:\n\n### **a² + b² = c²**\n\nwhere *c* is the hypotenuse (longest side, opposite the right angle).\n\n### Example:\nIf a = 3 and b = 4:\n- 3² + 4² = 9 + 16 = 25\n- c = √25 = **5**\n\n### Common Pythagorean Triples:\n- (3, 4, 5)\n- (5, 12, 13)\n- (8, 15, 17)\n\nNeed help with a specific problem?";
    }

    // Generic "what is [topic]" that we don't have a specific definition for
    return `That's a great question about **${topic}**! I'm currently in offline mode with limited responses. Here's what I can help with right now:\n\n- **Algebra** — equations, variables, functions\n- **Calculus** — derivatives, integrals, limits\n- **Geometry** — shapes, areas, volumes\n- **Trigonometry** — angles, sin/cos/tan\n- **Statistics** — data analysis, probability\n- **Arithmetic** — fractions, percentages, ratios\n\nTry asking "What is algebra?" or "How do I solve quadratic equations?" for a detailed explanation.\n\n*Tip: The AI tutor works best when the server is online for full, personalized answers.*`;
  }

  // --- "How do I" / procedural questions ---
  if (/\bhow (?:do|can|to|would|should)\b/.test(lower) || /\bsolve\b/.test(lower) || /\bfind\b/.test(lower) || /\bcalculate\b/.test(lower)) {
    if (lower.includes('quadratic') || (lower.includes('ax') && lower.includes('bx'))) {
      return "## Solving Quadratic Equations\n\nA quadratic equation has the form **ax² + bx + c = 0**.\n\n### Method 1: Quadratic Formula\n**x = (-b ± √(b² - 4ac)) / 2a**\n\n### Steps:\n1. Identify a, b, and c from your equation\n2. Calculate the discriminant: **b² - 4ac**\n3. If discriminant > 0 → two real solutions\n4. If discriminant = 0 → one real solution\n5. If discriminant < 0 → no real solutions\n\n### Example: x² - 5x + 6 = 0\n- a=1, b=-5, c=6\n- Discriminant = 25 - 24 = 1\n- x = (5 ± 1) / 2 → **x = 3** or **x = 2**\n\n### Method 2: Factoring\nx² - 5x + 6 = (x - 3)(x - 2) = 0\n\nWant me to help solve a specific quadratic?";
    }
    if (lower.includes('derivative') || lower.includes('differentiat')) {
      return "## How to Find Derivatives\n\nThe derivative measures the rate of change of a function.\n\n### Key Rules:\n| Rule | Formula |\n|------|--------|\n| Power | d/dx[xⁿ] = nxⁿ⁻¹ |\n| Constant | d/dx[c] = 0 |\n| Sum | d/dx[f+g] = f' + g' |\n| Product | d/dx[fg] = f'g + fg' |\n| Chain | d/dx[f(g(x))] = f'(g(x)) · g'(x) |\n\n### Common Derivatives:\n- d/dx[sin(x)] = cos(x)\n- d/dx[cos(x)] = -sin(x)\n- d/dx[eˣ] = eˣ\n- d/dx[ln(x)] = 1/x\n\n### Example: f(x) = 3x² + 2x - 5\nf'(x) = 6x + 2\n\nWhat function would you like to differentiate?";
    }
    if (lower.includes('integral') || lower.includes('integrat')) {
      return "## How to Integrate\n\nIntegration is the reverse of differentiation.\n\n### Key Rules:\n- **Power Rule:** ∫xⁿ dx = xⁿ⁺¹/(n+1) + C  (n ≠ -1)\n- ∫1/x dx = ln|x| + C\n- ∫eˣ dx = eˣ + C\n- ∫sin(x) dx = -cos(x) + C\n- ∫cos(x) dx = sin(x) + C\n\n### Techniques:\n1. **Substitution (u-sub)** — simplify by substituting a part of the expression\n2. **Integration by parts** — ∫u dv = uv - ∫v du\n3. **Partial fractions** — break rational functions into simpler pieces\n\nWant help with a specific integral?";
    }
    if (lower.includes('equation') || lower.includes('solve')) {
      return "## How to Solve Equations\n\n### Linear Equations (ax + b = c):\n1. Move constants to one side\n2. Divide by the coefficient of x\n\n**Example:** 3x + 7 = 22\n- 3x = 22 - 7 = 15\n- x = 15/3 = **5**\n\n### Systems of Equations:\n- **Substitution** — solve one equation for a variable, plug into the other\n- **Elimination** — add/subtract equations to eliminate a variable\n- **Graphing** — find the intersection point\n\n### Tips:\n- Always check your answer by substituting back\n- Whatever you do to one side, do to the other\n\nShare your equation and I'll help solve it step by step!";
    }
    if (lower.includes('area') || lower.includes('perimeter') || lower.includes('volume')) {
      return "## Geometry Formulas\n\n### 2D Shapes:\n| Shape | Area | Perimeter |\n|-------|------|----------|\n| Rectangle | l × w | 2(l + w) |\n| Triangle | ½ × b × h | a + b + c |\n| Circle | πr² | 2πr |\n| Trapezoid | ½(a+b) × h | sum of sides |\n\n### 3D Shapes:\n| Shape | Volume | Surface Area |\n|-------|--------|--------------|\n| Sphere | (4/3)πr³ | 4πr² |\n| Cylinder | πr²h | 2πr² + 2πrh |\n| Cone | (1/3)πr²h | πr² + πrl |\n\nWhat geometry problem do you need help with?";
    }
    if (lower.includes('graph') || lower.includes('plot') || lower.includes('slope')) {
      return "## Graphing & Linear Functions\n\n### Slope-Intercept Form: y = mx + b\n- **m** = slope (rise / run)\n- **b** = y-intercept (where the line crosses the y-axis)\n\n### Finding Slope:\nm = (y₂ - y₁) / (x₂ - x₁)\n\n### Example:\nThrough (1, 3) and (4, 9):\n- m = (9-3)/(4-1) = 6/3 = 2\n- Plug into y = mx + b: 3 = 2(1) + b → b = 1\n- Equation: **y = 2x + 1**\n\nWhat would you like to graph or understand?";
    }
    if (lower.includes('factor')) {
      return "## How to Factor\n\n### Common Techniques:\n1. **GCF (Greatest Common Factor):** Factor out the largest shared factor\n   - 6x² + 9x = **3x(2x + 3)**\n\n2. **Difference of Squares:** a² - b² = (a+b)(a-b)\n   - x² - 25 = **(x+5)(x-5)**\n\n3. **Trinomial Factoring:** x² + bx + c = (x + p)(x + q) where p·q = c and p+q = b\n   - x² + 5x + 6 = **(x+2)(x+3)**\n\n4. **Grouping:** For 4-term polynomials\n\nWhat expression would you like to factor?";
    }
  }

  // --- Specific topic keywords (catch remaining) ---
  if (lower.includes('pythag') || (lower.includes('right') && lower.includes('triangle'))) {
    return "## Pythagorean Theorem\n\nFor a right triangle with legs a and b, and hypotenuse c:\n\n### **a² + b² = c²**\n\n**Example:** If a = 3, b = 4:\n- 9 + 16 = 25\n- c = √25 = **5**\n\n### Common Pythagorean Triples:\n- (3, 4, 5)\n- (5, 12, 13)\n- (8, 15, 17)\n- (7, 24, 25)\n\nNeed help with a specific problem?";
  }
  if (lower.includes('trig') || /\b(sin|cos|tan)\b/.test(lower)) {
    return "## Trigonometry\n\n### SOH-CAH-TOA:\n- **sin(θ)** = Opposite / Hypotenuse\n- **cos(θ)** = Adjacent / Hypotenuse\n- **tan(θ)** = Opposite / Adjacent\n\n### Key Identities:\n- sin²θ + cos²θ = 1\n- tan(θ) = sin(θ)/cos(θ)\n- sin(2θ) = 2sin(θ)cos(θ)\n\n### Unit Circle Values:\n| Angle | sin | cos |\n|-------|-----|-----|\n| 0°    | 0   | 1   |\n| 30°   | 1/2 | √3/2 |\n| 45°   | √2/2 | √2/2 |\n| 90°   | 1   | 0   |\n\nWhat trig topic would you like help with?";
  }
  if (lower.includes('statistic') || lower.includes('probability') || lower.includes('mean') || lower.includes('median')) {
    return "## Statistics & Probability\n\n### Measures of Central Tendency:\n- **Mean:** Sum of all values ÷ number of values\n- **Median:** Middle value when sorted\n- **Mode:** Most frequent value\n\n### Probability Basics:\n- P(event) = favorable outcomes / total outcomes\n- 0 ≤ P(event) ≤ 1\n- P(A or B) = P(A) + P(B) - P(A and B)\n\n### Example:\nFor data {2, 5, 5, 8, 10}:\n- Mean = 30/5 = **6**\n- Median = **5**\n- Mode = **5**\n\nWhat statistics concept do you need help with?";
  }
  if (lower.includes('percent') || lower.includes('%')) {
    return "## Percentages\n\n### Key Formulas:\n- Percentage = (Part / Whole) × 100\n- Part = (Percentage × Whole) / 100\n- % Change = ((New - Old) / Old) × 100\n\n### Examples:\n- 25% of 200 = (25 × 200) / 100 = **50**\n- 15 is what % of 60? → (15/60) × 100 = **25%**\n- % increase from 80 to 100 = (20/80) × 100 = **25%**\n\nNeed help with a specific percentage problem?";
  }
  if (lower.includes('fraction') || lower.includes('numerator') || lower.includes('denominator')) {
    return "## Fractions\n\n### Operations:\n- **Addition:** a/b + c/d = (ad + bc) / bd\n- **Subtraction:** a/b - c/d = (ad - bc) / bd\n- **Multiplication:** a/b × c/d = ac / bd\n- **Division:** a/b ÷ c/d = a/b × d/c\n\n### Simplifying:\nDivide both numerator and denominator by their GCD.\n\n### Example:\n3/4 + 2/3 = 9/12 + 8/12 = **17/12**\n\nWhat fraction problem can I help you with?";
  }
  if (lower.includes('limit')) {
    return "## Limits\n\nThe limit describes what value a function **approaches** as x approaches some value.\n\n### How to evaluate:\n1. **Direct substitution** — try plugging in the value first\n2. **Factor & cancel** — if you get 0/0\n3. **L'Hôpital's Rule** — for 0/0 or ∞/∞ forms\n\n### Example:\nlim(x→2) (x²-4)/(x-2)\n= lim(x→2) (x+2)(x-2)/(x-2)\n= lim(x→2) (x+2) = **4**\n\nWhat limit problem are you working on?";
  }
  if (lower.includes('matrix') || lower.includes('matrices')) {
    return "## Matrices\n\nA matrix is a rectangular array of numbers arranged in rows and columns.\n\n### Operations:\n- **Addition:** Add corresponding elements (same dimensions required)\n- **Scalar multiplication:** Multiply every element by a constant\n- **Matrix multiplication:** Rows × Columns (dimensions must be compatible: m×n · n×p = m×p)\n\n### Determinant (2×2):\nFor matrix [[a, b], [c, d]]: det = **ad - bc**\n\n### Example:\n| 2  3 |   | 1  0 |   | 3  3 |\n| 4  1 | + | 2  5 | = | 6  6 |\n\nWhat matrix operation do you need help with?";
  }
  if (lower.includes('logarithm') || lower.includes('log')) {
    return "## Logarithms\n\nA logarithm answers: **\"What exponent gives me this number?\"**\n\nlog_b(x) = y means b^y = x\n\n### Key Properties:\n- log(ab) = log(a) + log(b)\n- log(a/b) = log(a) - log(b)\n- log(aⁿ) = n · log(a)\n- log_b(b) = 1\n- log_b(1) = 0\n\n### Common bases:\n- **log** = log₁₀ (common log)\n- **ln** = logₑ (natural log, e ≈ 2.718)\n\n### Example:\nlog₂(8) = 3 because 2³ = 8\n\nWhat logarithm problem are you working on?";
  }
  if (lower.includes('exponent') || lower.includes('power')) {
    return "## Exponents\n\nAn exponent tells you how many times to multiply a base by itself.\n\n### Key Rules:\n- aᵐ · aⁿ = aᵐ⁺ⁿ\n- aᵐ / aⁿ = aᵐ⁻ⁿ\n- (aᵐ)ⁿ = aᵐⁿ\n- a⁰ = 1 (any nonzero number)\n- a⁻ⁿ = 1/aⁿ\n- a^(1/n) = ⁿ√a\n\n### Example:\n2³ × 2⁴ = 2⁷ = **128**\n\nWhat exponent problem can I help with?";
  }

  // --- Default fallback ---
  return "I'm your **MathPulse AI** math tutor!\n\nI can help with a wide range of math topics. Try asking:\n\n- **\"What is algebra?\"** — get a clear explanation of any topic\n- **\"How do I solve quadratic equations?\"** — step-by-step instructions\n- **\"Explain the Pythagorean theorem\"** — concept breakdowns\n- **\"What is the derivative of x²?\"** — specific problems\n\n### Topics I cover:\n- Algebra, Geometry, Trigonometry\n- Calculus (derivatives, integrals, limits)\n- Statistics & Probability\n- Arithmetic (fractions, percentages)\n- Logarithms, Exponents, Matrices\n\nWhat would you like to learn about?";
}

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  // Map of tempId → Promise<firebaseId> for sessions being created
  const pendingSessionsRef = useRef<Map<string, Promise<string>>>(new Map());

  // Load sessions from Firebase on mount / user change
  useEffect(() => {
    if (!currentUser) {
      setSessions([]);
      setSessionsLoaded(false);
      return;
    }

    const loadSessions = async () => {
      try {
        const firebaseSessions = await getUserChatSessions(currentUser.uid);
        const loadedSessions: ChatSession[] = await Promise.all(
          firebaseSessions.map(async (s) => {
            const msgs = await getSessionMessages(s.id);
            const messages: Message[] = msgs.map((m) => ({
              id: m.id,
              sender: m.role === 'user' ? 'user' : 'ai',
              text: m.role === 'assistant'
                ? formatAssistantResponseForStorage(m.content)
                : m.content,
              timestamp: m.timestamp instanceof Date
                ? m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }));
            return {
              id: s.id,
              title: s.title,
              date: s.updatedAt instanceof Date
                ? s.updatedAt.toLocaleDateString()
                : new Date(s.updatedAt).toLocaleDateString(),
              messageCount: messages.length,
              preview: messages.length > 0
                ? (toChatPreviewText(messages[messages.length - 1].text) || 'No messages yet')
                : 'No messages yet',
              topics: [],
              messages,
              createdAt: s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt),
              updatedAt: s.updatedAt instanceof Date ? s.updatedAt : new Date(s.updatedAt),
            };
          })
        );
        setSessions(loadedSessions);
      } catch (err) {
        console.error('Error loading chat sessions:', err);
      } finally {
        setSessionsLoaded(true);
      }
    };

    loadSessions();
  }, [currentUser]);

  const generateTitleFromMessages = (messages: Message[]): string => {
    if (messages.length === 0) return 'New Chat';
    const firstUserMessage = messages.find(m => m.sender === 'user')?.text || '';
    const lower = firstUserMessage.toLowerCase();

    if (lower.includes('quadratic') || lower.includes('ax² + bx + c')) return 'Quadratic Equations Help';
    if (lower.includes('derivative') || lower.includes('calculus')) return 'Derivatives & Calculus';
    if (lower.includes('pythagor') || lower.includes('right triangle')) return 'Pythagorean Theorem';
    if (lower.includes('trig') || lower.includes('sin') || lower.includes('cos')) return 'Trigonometry Help';
    if (lower.includes('area') || lower.includes('perimeter')) return 'Geometry - Area & Perimeter';
    if (lower.includes('algebra') || (lower.includes('solve') && lower.includes('x'))) return 'Algebra Problem Solving';
    if (lower.includes('factor')) return 'Factoring Practice';
    if (lower.includes('graph') || lower.includes('plot')) return 'Graphing Functions';
    if (lower.includes('matrix') || lower.includes('matrices')) return 'Matrix Operations';
    if (lower.includes('integral') || lower.includes('integrate')) return 'Integration Problems';
    if (lower.includes('limit')) return 'Limits in Calculus';
    if (lower.includes('statistic') || lower.includes('probability')) return 'Statistics & Probability';

    const truncated = firstUserMessage.slice(0, 40);
    return truncated.length < firstUserMessage.length ? truncated + '...' : truncated;
  };

  const createNewSession = useCallback((firstMessage?: Message): string => {
    const tempId = Date.now().toString();
    const now = new Date();

    const newSession: ChatSession = {
      id: tempId,
      title: firstMessage ? generateTitleFromMessages([firstMessage]) : 'New Chat',
      date: 'Just now',
      messageCount: firstMessage ? 1 : 0,
      preview: firstMessage
        ? (toChatPreviewText(firstMessage.text) || 'Start a new conversation...')
        : 'Start a new conversation...',
      topics: [],
      messages: firstMessage ? [firstMessage] : [],
      createdAt: now,
      updatedAt: now,
    };

    setSessions(prev => [newSession, ...prev]);

    // Persist to Firebase in background, storing the promise so addMessageToSession can await it
    if (currentUser) {
      const title = firstMessage ? generateTitleFromMessages([firstMessage]) : 'New Chat';
      const firebasePromise = createFirebaseSession(currentUser.uid, title)
        .then(async (firebaseSession) => {
          // If there was a first message, persist it
          if (firstMessage) {
            await addFirebaseMessage(
              firebaseSession.id,
              firstMessage.sender === 'user' ? 'user' : 'assistant',
              firstMessage.text
            );
          }
          return firebaseSession.id;
        })
        .catch(err => {
          console.error('Error creating Firebase session:', err);
          return tempId; // fallback to tempId on error
        });
      // Store the promise so addMessageToSession can resolve temp IDs to real Firebase IDs
      pendingSessionsRef.current.set(tempId, firebasePromise);
    }

    return tempId;
  }, [currentUser]);

  const addMessageToSession = useCallback((sessionId: string, message: Message) => {
    const normalizedMessage = message.sender === 'ai'
      ? {
          ...message,
          text: formatAssistantResponseForStorage(message.text),
        }
      : message;

    setSessions(prev =>
      prev.map(session => {
        if (session.id === sessionId) {
          const updatedMessages = [...session.messages, normalizedMessage];
          return {
            ...session,
            messages: updatedMessages,
            messageCount: updatedMessages.length,
            preview: toChatPreviewText(normalizedMessage.text) || session.preview,
            updatedAt: new Date(),
            title: updatedMessages.length === 2 ? generateTitleFromMessages(updatedMessages) : session.title,
          };
        }
        return session;
      })
    );

    // Resolve temp ID to real Firebase ID before persisting
    const resolveFirebaseId = async (sid: string): Promise<string> => {
      const pending = pendingSessionsRef.current.get(sid);
      if (pending) {
        return await pending;
      }
      return sid;
    };

    // Persist message to Firebase in background (awaiting real session ID if needed)
    resolveFirebaseId(sessionId).then(realId =>
      addFirebaseMessage(
        realId,
        normalizedMessage.sender === 'user' ? 'user' : 'assistant',
        normalizedMessage.text
      ).catch(err => console.error('Error persisting message:', err))
    );

    // Update title in Firebase if this is the 2nd message
    setSessions(prev => {
      const session = prev.find(s => s.id === sessionId);
      if (session && session.messages.length === 2) {
        const newTitle = generateTitleFromMessages(session.messages);
        resolveFirebaseId(sessionId).then(realId =>
          updateFirebaseTitle(realId, newTitle)
            .catch(err => console.error('Error updating title:', err))
        );
      }
      return prev;
    });
  }, []);

  /** Send a message and get AI response from the backend */
  const sendMessage = useCallback(async (sessionId: string, userText: string) => {
    const trimmedUserText = userText.trim();

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: trimmedUserText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    addMessageToSession(sessionId, userMsg);
    setLoadingSessionId(sessionId);
    setIsLoading(true);

    try {
      // Build history from current session messages
      const session = sessions.find(s => s.id === sessionId);
      const history = (session?.messages || []).map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: m.text,
      }));

      const scopeBoundaryResponse = getScopeBoundaryResponse(trimmedUserText);
      if (scopeBoundaryResponse) {
        const refusalMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: scopeBoundaryResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addMessageToSession(sessionId, refusalMsg);
        return;
      }

      const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let streamedText = '';
      let streamMessageId: string | null = null;
      const showStreamingChunks = shouldShowStreamingChunks(trimmedUserText);

      const upsertStreamingMessage = (text: string) => {
        setSessions(prev =>
          prev.map(chatSession => {
            if (chatSession.id !== sessionId) return chatSession;

            if (!streamMessageId) {
              streamMessageId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
              const streamMsg: Message = {
                id: streamMessageId,
                sender: 'ai',
                text,
                timestamp: aiTimestamp,
              };
              const updatedMessages = [...chatSession.messages, streamMsg];
              return {
                ...chatSession,
                messages: updatedMessages,
                messageCount: updatedMessages.length,
                updatedAt: new Date(),
              };
            }

            return {
              ...chatSession,
              messages: chatSession.messages.map(m =>
                m.id === streamMessageId ? { ...m, text } : m
              ),
              updatedAt: new Date(),
            };
          })
        );
      };

      const removeStreamingMessage = () => {
        if (!streamMessageId) return;
        const removeId = streamMessageId;
        setSessions(prev =>
          prev.map(chatSession => {
            if (chatSession.id !== sessionId) return chatSession;
            const updatedMessages = chatSession.messages.filter(m => m.id !== removeId);
            return {
              ...chatSession,
              messages: updatedMessages,
              messageCount: updatedMessages.length,
              updatedAt: new Date(),
            };
          })
        );
      };

      try {
        const { response } = await apiService.chat(trimmedUserText, history, (chunk: string) => {
          streamedText += chunk;
          if (showStreamingChunks) {
            upsertStreamingMessage(formatAssistantResponseForStreaming(streamedText));
          }
        });

        let finalResponse = formatAssistantResponseForStorage(response || streamedText).trim();
        if (finalResponse && isPromptAnswerPairIncomplete(trimmedUserText, finalResponse)) {
          try {
            const continuation = await apiService.chatSafe(
              buildContinuationPrompt(trimmedUserText, finalResponse),
              history,
            );
            const repairedResponse = formatAssistantResponseForStorage(continuation.data.response).trim();
            finalResponse = mergeAnswerContinuation(finalResponse, repairedResponse);
          } catch (repairErr) {
            console.warn('Streaming completion repair failed:', repairErr);
          }

          if (finalResponse && isPromptAnswerPairIncomplete(trimmedUserText, finalResponse)) {
            try {
              const plainContinuation = await apiService.chatSafe(
                buildPlainContinuationPrompt(trimmedUserText, finalResponse),
                history,
              );
              const repairedPlain = formatAssistantResponseForStorage(plainContinuation.data.response).trim();
              finalResponse = mergeAnswerContinuation(finalResponse, repairedPlain);
            } catch (plainRepairErr) {
              console.warn('Streaming plain continuation repair failed:', plainRepairErr);
            }
          }
        }

        if (!finalResponse || isPromptAnswerPairIncomplete(trimmedUserText, finalResponse)) {
          finalResponse = generateFallbackResponse(trimmedUserText);
        }

        if (streamMessageId) {
          removeStreamingMessage();
        }

        const aiMsg: Message = {
          id: streamMessageId || (Date.now() + 1).toString(),
          sender: 'ai',
          text: finalResponse,
          timestamp: aiTimestamp,
        };
        addMessageToSession(sessionId, aiMsg);
      } catch (streamError) {
        if (streamError instanceof ApiTimeoutError) {
          console.warn(
            `Streaming timed out after ${streamError.timeoutMs}ms, falling back to non-streaming chat.`,
            streamError,
          );
        } else {
          console.warn('Streaming failed, falling back to non-streaming chat:', streamError);
        }
        if (streamMessageId) {
          removeStreamingMessage();
        }

        let aiResponseText = '';
        try {
          const { data } = await apiService.chatSafe(trimmedUserText, history);
          aiResponseText = formatAssistantResponseForStorage(data.response).trim();

          if (aiResponseText && isPromptAnswerPairIncomplete(trimmedUserText, aiResponseText)) {
            try {
              const continuation = await apiService.chatSafe(
                buildContinuationPrompt(trimmedUserText, aiResponseText),
                history,
              );
              const repairedResponse = formatAssistantResponseForStorage(continuation.data.response).trim();
              aiResponseText = mergeAnswerContinuation(aiResponseText, repairedResponse);
            } catch (repairErr) {
              console.warn('Non-stream completion repair failed:', repairErr);
            }
          }

          if (aiResponseText && isPromptAnswerPairIncomplete(trimmedUserText, aiResponseText)) {
            try {
              const plainContinuation = await apiService.chatSafe(
                buildPlainContinuationPrompt(trimmedUserText, aiResponseText),
                history,
              );
              const repairedPlain = formatAssistantResponseForStorage(plainContinuation.data.response).trim();
              aiResponseText = mergeAnswerContinuation(aiResponseText, repairedPlain);
            } catch (plainRepairErr) {
              console.warn('Non-stream plain continuation repair failed:', plainRepairErr);
            }
          }
        } catch (chatError) {
          console.warn('Chat request failed, using local fallback response:', chatError);
          aiResponseText = generateFallbackResponse(trimmedUserText);
        }

        if (!aiResponseText || isPromptAnswerPairIncomplete(trimmedUserText, aiResponseText)) {
          aiResponseText = generateFallbackResponse(trimmedUserText);
        }

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: formatAssistantResponseForStorage(aiResponseText),
          timestamp: aiTimestamp,
        };
        addMessageToSession(sessionId, aiMsg);
      }

      // Update session title if this is the first exchange
      if (session && session.messages.length === 1) {
        const updatedSession = sessions.find(s => s.id === sessionId);
        if (updatedSession && updatedSession.messages.length > 1) {
          const newTitle = generateTitleFromMessages(updatedSession.messages);
          const pending = pendingSessionsRef.current.get(sessionId);
          const realIdPromise = pending ? pending : Promise.resolve(sessionId);
          realIdPromise.then(realId =>
            updateFirebaseTitle(realId, newTitle)
              .catch(err => console.error('Error updating title:', err))
          );
        }
      }
    } finally {
      setIsLoading(false);
      setLoadingSessionId(null);
    }
  }, [sessions, addMessageToSession]);

  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    setSessions(prev =>
      prev.map(session => (session.id === sessionId ? { ...session, title } : session))
    );
    // Persist to Firebase (resolve temp ID if needed)
    const pending = pendingSessionsRef.current.get(sessionId);
    const realIdPromise = pending ? pending : Promise.resolve(sessionId);
    realIdPromise.then(realId =>
      updateFirebaseTitle(realId, title)
        .catch(err => console.error('Error updating session title:', err))
    );
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
    }
    // Persist to Firebase (soft delete, resolve temp ID if needed)
    const pending = pendingSessionsRef.current.get(sessionId);
    const realIdPromise = pending ? pending : Promise.resolve(sessionId);
    realIdPromise.then(realId =>
      deleteFirebaseSession(realId)
        .catch(err => console.error('Error deleting session:', err))
    );
    // Clean up the pending map entry
    pendingSessionsRef.current.delete(sessionId);
  }, [activeSessionId]);

  const getActiveSession = useCallback((): ChatSession | null => {
    return sessions.find(s => s.id === activeSessionId) || null;
  }, [sessions, activeSessionId]);

  return (
    <ChatContext.Provider
      value={{
        sessions,
        activeSessionId,
        isLoading,
        loadingSessionId,
        sessionsLoaded,
        setActiveSessionId,
        createNewSession,
        addMessageToSession,
        sendMessage,
        updateSessionTitle,
        deleteSession,
        getActiveSession,
        generateTitleFromMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
