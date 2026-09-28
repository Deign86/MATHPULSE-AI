const fs = require('fs');
const path = require('path');

// Read the modules data from generate_all_swimlane_fast.js
const genScript = fs.readFileSync(path.join(__dirname, 'generate_all_swimlane_fast.js'), 'utf8');
const match = genScript.match(/const modulesData = (\[[\s\S]*?\]);\s*async function/);
if (!match) {
  console.error('Could not find modulesData in generator script');
  process.exit(1);
}
const modulesData = eval(match[1]);

// 1. Update activity-diagrams-viewer.html
const viewerPath = path.join(__dirname, '..', 'docs', 'activity-diagrams-viewer.html');
let viewerHtml = fs.readFileSync(viewerPath, 'utf8');

// Replace nav tabs
const navTabsStr = `  <nav class="nav-tabs" id="navTabs">
    <button class="tab-btn active" onclick="filterModule('all', this)">View All Modules (1-9)</button>
${modulesData.map(m => `    <button class="tab-btn" onclick="filterModule('${m.id}', this)">${m.title.replace(': ', ':\n')}</button>`).join('\n')}
  </nav>`;

viewerHtml = viewerHtml.replace(/<nav class="nav-tabs" id="navTabs">[\s\S]*?<\/nav>/, navTabsStr);

// Replace diagramsData array in viewerHtml (pure UML activity diagrams, NO data stores)
const viewerDataStr = JSON.stringify(modulesData.map(m => ({
  id: m.id,
  title: m.title,
  processName: m.processName,
  dominant: m.dominant,
  code: m.mermaid
})), null, 6);

viewerHtml = viewerHtml.replace(/const diagramsData = \[[\s\S]*?\];/, `const diagramsData = ${viewerDataStr};`);
fs.writeFileSync(viewerPath, viewerHtml, 'utf8');
console.log('Updated activity-diagrams-viewer.html without data stores');

// 2. Update ACTIVITY_DIAGRAMS.md (pure UML activity diagrams, NO data stores)
const mdPath = path.join(__dirname, '..', 'docs', 'ACTIVITY_DIAGRAMS.md');

let md = `# MathPulse AI — Modular Activity Diagrams Specification

> **Document Type:** Activity Diagrams Architecture & Defense Specification  
> **Target Standard:** Capstone Defense SAD, UML Swimlane Activity Specification & Professor Compliance  
> **Repository Location:** \`docs/ACTIVITY_DIAGRAMS.md\`

---

## 1. Executive Summary & Module Alignment

This document specifies the official **UML Swimlane Activity Diagrams** for MathPulse AI across the **9 Core System Modules**. In accordance with UML standards, these activity diagrams focus purely on **user action flows, operational logic, decision points, and cross-lane transactions** (data stores are documented separately in the Data Flow Diagrams).

| Module # | Official Module Name | Dominant User (Left Swimlane) | Secondary Actors |
|:---:|---|---|---|
| **1** | **User Authentication & Accounts** | **Student** | **Teacher**, **Administrator**, System |
| **2** | **Academic Classroom Management** | **Teacher** | **Student**, System |
| **3** | **Curriculum & Content Management** | **Teacher / Admin** | System |
| **4** | **Diagnostic Assessment & Path** | **Student** | System |
| **5** | **Quiz Creation & Examination** | **Student** *(Exam)* / **Teacher** *(Creation)* | System |
| **6** | **Learning Progress & Gamification** | **Student** | System |
| **7** | **Real-Time Quiz Battle** | **Student** | System (RTDB) |
| **8** | **Remedial Intervention & Risk** | **Teacher** | **Student**, System |
| **9** | **System Audit & AI Tutoring** | **Student** *(Chat)* | **Administrator** *(Audit)*, System |

> 🌐 **Interactive Swimlane Viewer:** Open [\`docs/activity-diagrams-viewer.html\`](activity-diagrams-viewer.html) in your browser for interactive zoom/pan and vector SVG / high-resolution PNG export.  
> 📁 **Rendered Swimlane Images Directory:** [\`docs/diagrams/activity_diagrams/\`](diagrams/activity_diagrams/)

---

## 2. Diagramming Standards Checklist

- [x] **One activity diagram per main module:** Exactly 9 modular diagrams matching Modules 1 through 9.
- [x] **Dominant User on Left Swimlane:** The primary user is placed in the leftmost column (\`Student\` on student modules; \`Teacher\` on class/remedial modules).
- [x] **Strict UML Swimlane Partitions:** Parallel vertical columns with clean horizontal interaction arrows.
- [x] **Pure UML Activity Semantics:** No DFD data store labels inside activity nodes.
- [x] **Solid Circle \`((●))\`:** Used exclusively for Start points.
- [x] **Circle with "X" \`((X))\`:** Used exclusively for Exit / Transaction Completion.
- [x] **Arrow pointing to "N" \`((N))\`:** Used exclusively for Cancelled / Aborted transactions.
- [x] **No Stretched Symbols:** Uniform node sizes and crisp decision diamonds.

---

## 3. The 9 Modular Activity Diagrams (Swimlane Architecture)

`;

for (const m of modulesData) {
  const safeName = `${m.id}_${m.processName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 50)}`;

  md += `### ${m.title}

![${m.title} Swimlane Diagram](diagrams/activity_diagrams/${safeName}.png)
*Files: [Download Vector SVG](diagrams/activity_diagrams/${safeName}.svg) • [Download PNG](diagrams/activity_diagrams/${safeName}.png)*

> **Swimlane Configuration:**
> - **Left Swimlane (Dominant User):** \`${m.dominant}\`
> - **Middle/Right Swimlanes:** \`MathPulse AI System\` (and secondary actors where applicable)
> - **UML Symbols:** Solid Circle \`((●))\` = Start • Red Circle \`((X))\` = Exit • Orange Circle \`((N))\` = Cancel

\`\`\`mermaid
${m.mermaid}
\`\`\`

---

`;
}

md += `## 4. Implementation & Defense Presentation Guidelines

1. **UML vs. DFD Distinction:**
   - **Activity Diagrams:** Focus exclusively on dynamic control flow, user decisions, role responsibilities (swimlanes), and transaction lifecycles. Data store symbols ($D1 \dots D9$) are strictly omitted.
   - **Data Flow Diagrams (DFDs):** Detail information inputs/outputs and persistent data stores ($D1 \dots D9$).
2. **Swimlane Logic:**
   - In Modules 1, 4, 5, 6, 7, 9: **Student** is on the left swimlane.
   - In Modules 2 and 8: **Teacher** is on the left swimlane.
   - In Module 3: **Teacher / Admin** is on the left swimlane.
`;

fs.writeFileSync(mdPath, md, 'utf8');
console.log('Successfully regenerated ACTIVITY_DIAGRAMS.md without data stores!');
