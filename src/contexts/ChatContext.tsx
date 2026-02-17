import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { apiService } from '../services/apiService';

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

/** Generate a helpful math tutor response when backend is unavailable */
function generateFallbackResponse(userText: string): string {
  const lower = userText.toLowerCase();
  
  // Greetings
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(lower)) {
    return "Hello! 👋 I'm your MathPulse AI tutor. I can help you with algebra, calculus, geometry, statistics, and more. What math topic would you like to explore today?";
  }
  
  // Quadratic formula
  if (lower.includes('quadratic') || (lower.includes('ax') && lower.includes('bx'))) {
    return "**Quadratic Equations** 📐\n\nA quadratic equation has the form **ax² + bx + c = 0**.\n\nThe **Quadratic Formula** is:\n\nx = (-b ± √(b² - 4ac)) / 2a\n\n**Steps to solve:**\n1. Identify a, b, and c from your equation\n2. Calculate the discriminant: b² - 4ac\n3. If discriminant > 0: two real solutions\n4. If discriminant = 0: one real solution\n5. If discriminant < 0: no real solutions\n\n**Example:** x² - 5x + 6 = 0\n- a=1, b=-5, c=6\n- Discriminant = 25 - 24 = 1\n- x = (5 ± 1) / 2 → x = 3 or x = 2\n\nWant me to help solve a specific quadratic?";
  }
  
  // Derivatives
  if (lower.includes('derivative') || lower.includes('differentiat')) {
    return "**Derivatives** 📊\n\nThe derivative measures the rate of change of a function.\n\n**Key Rules:**\n- **Power Rule:** d/dx[xⁿ] = nxⁿ⁻¹\n- **Constant Rule:** d/dx[c] = 0\n- **Sum Rule:** d/dx[f+g] = f' + g'\n- **Product Rule:** d/dx[fg] = f'g + fg'\n- **Chain Rule:** d/dx[f(g(x))] = f'(g(x)) · g'(x)\n\n**Common Derivatives:**\n- d/dx[sin(x)] = cos(x)\n- d/dx[cos(x)] = -sin(x)\n- d/dx[eˣ] = eˣ\n- d/dx[ln(x)] = 1/x\n\nWhat function would you like to differentiate?";
  }
  
  // Integrals
  if (lower.includes('integral') || lower.includes('integrat') || lower.includes('antiderivative')) {
    return "**Integration** ∫\n\nIntegration is the reverse of differentiation.\n\n**Key Rules:**\n- **Power Rule:** ∫xⁿ dx = xⁿ⁺¹/(n+1) + C (n ≠ -1)\n- **∫1/x dx** = ln|x| + C\n- **∫eˣ dx** = eˣ + C\n- **∫sin(x) dx** = -cos(x) + C\n- **∫cos(x) dx** = sin(x) + C\n\n**Techniques:**\n1. Substitution (u-sub)\n2. Integration by parts\n3. Partial fractions\n\nWant help with a specific integration problem?";
  }
  
  // Pythagorean theorem
  if (lower.includes('pythag') || (lower.includes('right') && lower.includes('triangle'))) {
    return "**Pythagorean Theorem** 📐\n\nFor a right triangle with legs a and b, and hypotenuse c:\n\n**a² + b² = c²**\n\n**Example:** If a = 3 and b = 4:\n3² + 4² = c²\n9 + 16 = c²\nc = √25 = 5\n\n**Common Pythagorean Triples:**\n- (3, 4, 5)\n- (5, 12, 13)\n- (8, 15, 17)\n- (7, 24, 25)\n\nNeed help with a specific problem?";
  }
  
  // Trigonometry
  if (lower.includes('trig') || lower.includes('sin') || lower.includes('cos') || lower.includes('tan')) {
    return "**Trigonometry** 📐\n\n**SOH-CAH-TOA:**\n- **sin(θ)** = Opposite / Hypotenuse\n- **cos(θ)** = Adjacent / Hypotenuse\n- **tan(θ)** = Opposite / Adjacent\n\n**Key Identities:**\n- sin²θ + cos²θ = 1\n- tan(θ) = sin(θ)/cos(θ)\n- sin(2θ) = 2sin(θ)cos(θ)\n\n**Unit Circle Values:**\n- sin(0°) = 0, cos(0°) = 1\n- sin(30°) = 1/2, cos(30°) = √3/2\n- sin(45°) = √2/2, cos(45°) = √2/2\n- sin(90°) = 1, cos(90°) = 0\n\nWhat trig topic would you like help with?";
  }
  
  // Algebra / solve
  if (lower.includes('algebra') || (lower.includes('solve') && lower.includes('x')) || lower.includes('equation')) {
    return "**Solving Equations** ✏️\n\n**Linear Equations (ax + b = c):**\n1. Isolate the variable term\n2. Divide by the coefficient\n\n**Example:** 3x + 7 = 22\n- 3x = 22 - 7 = 15\n- x = 15/3 = 5\n\n**Systems of Equations:**\n- Substitution method\n- Elimination method\n- Graphing method\n\nShare your equation and I'll help you solve it step by step!";
  }
  
  // Statistics/probability
  if (lower.includes('statistic') || lower.includes('probability') || lower.includes('mean') || lower.includes('median')) {
    return "**Statistics & Probability** 📊\n\n**Measures of Central Tendency:**\n- **Mean:** Sum of all values ÷ number of values\n- **Median:** Middle value when sorted\n- **Mode:** Most frequent value\n\n**Probability Basics:**\n- P(event) = favorable outcomes / total outcomes\n- 0 ≤ P(event) ≤ 1\n- P(A or B) = P(A) + P(B) - P(A and B)\n\n**Example:** For data {2, 5, 5, 8, 10}\n- Mean = 30/5 = 6\n- Median = 5\n- Mode = 5\n\nWhat statistics concept do you need help with?";
  }
  
  // Percentage
  if (lower.includes('percent') || lower.includes('%')) {
    return "**Percentages** 💯\n\n**Key Formulas:**\n- Percentage = (Part / Whole) × 100\n- Part = (Percentage × Whole) / 100\n- % Change = ((New - Old) / Old) × 100\n\n**Examples:**\n- 25% of 200 = (25 × 200) / 100 = 50\n- 15 is what % of 60? → (15/60) × 100 = 25%\n- % increase from 80 to 100 = (20/80) × 100 = 25%\n\nNeed help with a specific percentage problem?";
  }
  
  // Fractions
  if (lower.includes('fraction') || lower.includes('numerator') || lower.includes('denominator')) {
    return "**Fractions** 🔢\n\n**Operations:**\n- **Addition:** a/b + c/d = (ad + bc) / bd\n- **Subtraction:** a/b - c/d = (ad - bc) / bd\n- **Multiplication:** a/b × c/d = ac / bd\n- **Division:** a/b ÷ c/d = a/b × d/c\n\n**Simplifying:** Divide both numerator and denominator by their GCD\n\n**Example:** 3/4 + 2/3 = 9/12 + 8/12 = 17/12\n\nWhat fraction problem can I help you with?";
  }
  
  // Limits
  if (lower.includes('limit')) {
    return "**Limits** 📈\n\nThe limit describes the value a function approaches as x approaches some value.\n\n**Key Concepts:**\n- lim(x→a) f(x) = L means f(x) gets close to L as x gets close to a\n- **Direct substitution:** Try plugging in the value first\n- **Factoring:** Factor and cancel if you get 0/0\n- **L'Hôpital's Rule:** If 0/0 or ∞/∞, take derivative of top and bottom\n\n**Example:** lim(x→2) (x²-4)/(x-2)\n= lim(x→2) (x+2)(x-2)/(x-2)\n= lim(x→2) (x+2) = 4\n\nWhat limit problem are you working on?";
  }
  
  // Geometry
  if (lower.includes('area') || lower.includes('perimeter') || lower.includes('geometry') || lower.includes('circle') || lower.includes('triangle')) {
    return "**Geometry Formulas** 📐\n\n**Rectangle:** Area = l×w, Perimeter = 2(l+w)\n**Triangle:** Area = ½×b×h\n**Circle:** Area = πr², Circumference = 2πr\n**Trapezoid:** Area = ½(a+b)×h\n**Sphere:** Volume = (4/3)πr³, SA = 4πr²\n**Cylinder:** Volume = πr²h, SA = 2πr² + 2πrh\n\nWhat geometry problem do you need help with?";
  }
  
  // Graph/plot
  if (lower.includes('graph') || lower.includes('plot') || lower.includes('slope') || lower.includes('intercept')) {
    return "**Graphing & Linear Functions** 📈\n\n**Slope-Intercept Form:** y = mx + b\n- m = slope (rise/run)\n- b = y-intercept\n\n**Point-Slope Form:** y - y₁ = m(x - x₁)\n\n**Finding Slope:** m = (y₂ - y₁) / (x₂ - x₁)\n\n**Example:** Through (1, 3) and (4, 9)\n- m = (9-3)/(4-1) = 6/3 = 2\n- y = 2x + 1\n\nWhat would you like to graph or understand?";
  }
  
  // Thank you
  if (lower.includes('thank') || lower.includes('thanks')) {
    return "You're welcome! 😊 I'm always here to help with math. Feel free to ask about any topic — algebra, calculus, geometry, statistics, or anything else. Keep up the great work! 🌟";
  }
  
  // Default response
  return "Great question! 🧮 I'm your MathPulse AI math tutor. Here are some topics I can help with:\n\n📐 **Algebra** — equations, inequalities, functions\n📊 **Calculus** — derivatives, integrals, limits\n📏 **Geometry** — areas, volumes, theorems\n📈 **Statistics** — probability, mean, median, mode\n🔢 **Arithmetic** — fractions, percentages, ratios\n📉 **Pre-Calculus** — trigonometry, logarithms\n\nTry asking something specific like:\n- \"How do I solve quadratic equations?\"\n- \"What is the derivative of x²?\"\n- \"Explain the Pythagorean theorem\"\n\nWhat would you like to learn about?";
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
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    const newId = Date.now().toString();
    const now = new Date();

    const newSession: ChatSession = {
      id: newId,
      title: firstMessage ? generateTitleFromMessages([firstMessage]) : 'New Chat',
      date: 'Just now',
      messageCount: firstMessage ? 1 : 0,
      preview: firstMessage?.text || 'Start a new conversation...',
      topics: [],
      messages: firstMessage ? [firstMessage] : [],
      createdAt: now,
      updatedAt: now,
    };

    setSessions(prev => [newSession, ...prev]);
    return newId;
  }, []);

  const addMessageToSession = useCallback((sessionId: string, message: Message) => {
    setSessions(prev =>
      prev.map(session => {
        if (session.id === sessionId) {
          const updatedMessages = [...session.messages, message];
          return {
            ...session,
            messages: updatedMessages,
            messageCount: updatedMessages.length,
            preview: message.sender === 'user' ? message.text : session.preview,
            updatedAt: new Date(),
            title: updatedMessages.length === 2 ? generateTitleFromMessages(updatedMessages) : session.title,
          };
        }
        return session;
      })
    );
  }, []);

  /** Send a message and get AI response from the backend */
  const sendMessage = useCallback(async (sessionId: string, userText: string) => {
    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    addMessageToSession(sessionId, userMsg);
    setIsLoading(true);

    try {
      // Build history from current session messages
      const session = sessions.find(s => s.id === sessionId);
      const history = (session?.messages || []).map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: m.text,
      }));

      // Call backend API
      const data = await apiService.chat(userText.trim(), history);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addMessageToSession(sessionId, aiMsg);
    } catch (error) {
      console.error('AI chat error:', error);
      
      // Generate a helpful fallback response instead of a generic error
      const fallbackResponse = generateFallbackResponse(userText.trim());
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: fallbackResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addMessageToSession(sessionId, aiMsg);
    } finally {
      setIsLoading(false);
    }
  }, [sessions, addMessageToSession]);

  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    setSessions(prev =>
      prev.map(session => (session.id === sessionId ? { ...session, title } : session))
    );
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
    }
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
