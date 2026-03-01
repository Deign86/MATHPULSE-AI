"""
Midnight Theorem Design Overhaul — Mechanical Color Replacement Script
Replaces old slate/blue/indigo/gray Tailwind patterns with new warm/violet palette.
"""
import re
import os

SRC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "components")

# Files to process (all remaining files with old patterns)
FILES = [
    # Previously missed files
    "ProfileModal.tsx",
    "QuizExperience.tsx",
    "RewardsModal.tsx",
    "TasksBoard.tsx",
    "TeacherDashboard.tsx",
    # Remaining files
    "ModulesPage.tsx",
    "TopicMasteryView.tsx",
    "StudentCompetencyTable.tsx",
    "SubjectDetailView.tsx",
    "PracticeCenter.tsx",
    "DiagnosticAssessmentModal.tsx",
    "InteractiveLesson.tsx",
    "ScientificCalculator.tsx",
    "ModuleDetailView.tsx",
    "LessonViewer.tsx",
    "AdminUserManagement.tsx",
    "MasteryHeatmap.tsx",
    "BloomsTaxonomyModal.tsx",
    "AdminContent.tsx",
    "AdminDashboard.tsx",
    "AdminAuditLog.tsx",
    "AdminSettings.tsx",
    "MathAnswerInput.tsx",
    "CircularProgress.tsx",
    "ScrollIndicator.tsx",
]

# ── Replacement map (order matters — more specific patterns first) ──
# Each tuple: (regex_pattern, replacement)
REPLACEMENTS = [
    # Gradient combos (most specific first)
    (r'from-blue-700', 'from-violet-700'),
    (r'from-blue-600', 'from-violet-600'),
    (r'from-blue-500', 'from-violet-500'),
    (r'to-cyan-600', 'to-fuchsia-600'),
    (r'to-cyan-500', 'to-fuchsia-500'),
    (r'from-cyan-500', 'from-fuchsia-500'),
    (r'to-blue-700', 'to-fuchsia-700'),
    (r'to-blue-600', 'to-fuchsia-600'),

    # Focus states
    (r'focus:border-blue-600', 'focus:border-violet-600'),
    (r'focus:border-blue-500', 'focus:border-violet-500'),
    (r'focus:ring-blue-100', 'focus:ring-violet-100'),
    (r'focus:ring-blue-500', 'focus:ring-violet-500'),
    (r'focus:ring-blue-200', 'focus:ring-violet-200'),

    # Hover states (specific combos)
    (r'hover:bg-slate-200', 'hover:bg-[#e8e5de]'),
    (r'hover:bg-slate-100', 'hover:bg-[#f0eeea]'),
    (r'hover:bg-slate-50', 'hover:bg-[#f0eeea]'),
    (r'hover:bg-gray-100', 'hover:bg-[#f0eeea]'),
    (r'hover:bg-gray-50', 'hover:bg-[#f0eeea]'),
    (r'hover:border-slate-200', 'hover:border-[#e8e5de]'),
    (r'hover:border-slate-300', 'hover:border-[#e8e5de]'),
    (r'hover:text-slate-600', 'hover:text-[#6b687a]'),
    (r'hover:text-slate-700', 'hover:text-[#1a1625]'),
    (r'hover:bg-blue-700', 'hover:bg-violet-700'),
    (r'hover:bg-blue-600', 'hover:bg-violet-600'),
    (r'hover:bg-blue-100', 'hover:bg-violet-100'),
    (r'hover:bg-blue-50', 'hover:bg-violet-50'),
    (r'hover:from-blue-700', 'hover:from-violet-700'),
    (r'hover:to-cyan-600', 'hover:to-fuchsia-600'),

    # Blue → Violet (backgrounds)
    (r'bg-blue-600', 'bg-violet-600'),
    (r'bg-blue-500', 'bg-violet-500'),
    (r'bg-blue-400', 'bg-violet-400'),
    (r'bg-blue-100', 'bg-violet-100'),
    (r'bg-blue-50', 'bg-violet-50'),

    # Blue → Violet (text)
    (r'text-blue-800', 'text-violet-800'),
    (r'text-blue-700', 'text-violet-700'),
    (r'text-blue-600', 'text-violet-600'),
    (r'text-blue-500', 'text-violet-500'),
    (r'text-blue-400', 'text-violet-400'),
    (r'text-blue-100', 'text-violet-100'),

    # Blue → Violet (border)
    (r'border-blue-500', 'border-violet-500'),
    (r'border-blue-400', 'border-violet-400'),
    (r'border-blue-300', 'border-violet-300'),
    (r'border-blue-200', 'border-violet-200'),
    (r'border-blue-100', 'border-violet-100'),

    # Indigo → Violet
    (r'bg-indigo-600', 'bg-violet-600'),
    (r'bg-indigo-500', 'bg-violet-500'),
    (r'bg-indigo-100', 'bg-violet-100'),
    (r'bg-indigo-50', 'bg-violet-50'),
    (r'text-indigo-800', 'text-violet-800'),
    (r'text-indigo-700', 'text-violet-700'),
    (r'text-indigo-600', 'text-violet-600'),
    (r'text-indigo-500', 'text-violet-500'),
    (r'text-indigo-400', 'text-violet-400'),
    (r'border-indigo-300', 'border-violet-300'),
    (r'border-indigo-200', 'border-violet-200'),
    (r'ring-indigo-500', 'ring-violet-500'),

    # Cyan → Fuchsia (standalone)
    (r'text-cyan-600', 'text-fuchsia-600'),
    (r'text-cyan-500', 'text-fuchsia-500'),
    (r'bg-cyan-500', 'bg-fuchsia-500'),
    (r'bg-cyan-100', 'bg-fuchsia-100'),
    (r'border-cyan-200', 'border-fuchsia-200'),

    # Slate → Warm tones (backgrounds)
    (r'bg-slate-800', 'bg-[#1a1625]'),
    (r'bg-slate-700', 'bg-[#1a1625]'),
    (r'bg-slate-500', 'bg-[#6b687a]'),
    (r'bg-slate-300', 'bg-[#e8e5de]'),
    (r'bg-slate-200', 'bg-[#e8e5de]'),
    (r'bg-slate-100', 'bg-[#f0eeea]'),
    (r'bg-slate-50', 'bg-[#f0eeea]'),

    # Slate → Warm tones (text)
    (r'text-slate-900', 'text-[#1a1625]'),
    (r'text-slate-800', 'text-[#1a1625]'),
    (r'text-slate-700', 'text-[#1a1625]'),
    (r'text-slate-600', 'text-[#6b687a]'),
    (r'text-slate-500', 'text-[#6b687a]'),
    (r'text-slate-400', 'text-[#a8a5b3]'),
    (r'text-slate-300', 'text-[#a8a5b3]'),

    # Slate → Warm tones (border)
    (r'border-slate-300', 'border-[#e8e5de]'),
    (r'border-slate-200', 'border-[#e8e5de]'),
    (r'border-slate-100', 'border-[#e8e5de]'),

    # Gray → Warm tones
    (r'bg-gray-800', 'bg-[#1a1625]'),
    (r'bg-gray-100', 'bg-[#f0eeea]'),
    (r'bg-gray-50', 'bg-[#f0eeea]'),
    (r'text-gray-900', 'text-[#1a1625]'),
    (r'text-gray-800', 'text-[#1a1625]'),
    (r'text-gray-700', 'text-[#1a1625]'),
    (r'text-gray-600', 'text-[#6b687a]'),
    (r'text-gray-500', 'text-[#6b687a]'),
    (r'text-gray-400', 'text-[#a8a5b3]'),
    (r'text-gray-300', 'text-[#a8a5b3]'),
    (r'border-gray-300', 'border-[#e8e5de]'),
    (r'border-gray-200', 'border-[#e8e5de]'),
    (r'border-gray-100', 'border-[#e8e5de]'),
    (r'hover:bg-gray-200', 'hover:bg-[#e8e5de]'),
    (r'divide-slate-200', 'divide-[#e8e5de]'),
    (r'divide-slate-100', 'divide-[#e8e5de]'),
    (r'divide-gray-200', 'divide-[#e8e5de]'),

    # Shadow slate
    (r'shadow-slate-200', 'shadow-violet-200'),
    (r'shadow-blue-200', 'shadow-violet-200'),
    (r'shadow-slate-900/30', 'shadow-black/30'),

    # Dark overlay / backdrop colors (slate-900 used as dark surface)
    (r'bg-slate-900/90', 'bg-[#0a0a0f]/90'),
    (r'bg-slate-900/80', 'bg-[#0a0a0f]/80'),
    (r'bg-slate-900', 'bg-[#0d0b14]'),

    # Dark border tones
    (r'border-slate-700', 'border-white/10'),
    (r'border-slate-600', 'border-white/15'),

    # Hover dark tones
    (r'hover:bg-slate-600', 'hover:bg-white/10'),
    (r'hover:bg-slate-750', 'hover:bg-white/10'),
    (r'hover:bg-slate-900', 'hover:bg-[#0d0b14]'),

    # Remaining slate/blue/indigo shades not in original script
    (r'bg-slate-600', 'bg-[#6b687a]'),
    (r'bg-slate-400', 'bg-[#a8a5b3]'),
    (r'text-slate-200', 'text-[#e8e5de]'),
    (r'text-slate-100', 'text-[#f0eeea]'),
    (r'border-slate-500', 'border-white/20'),

    # Indigo remaining shades
    (r'text-indigo-100', 'text-violet-100'),
    (r'text-indigo-200', 'text-violet-200'),
    (r'text-indigo-900', 'text-violet-900'),
    (r'bg-indigo-400', 'bg-violet-400'),
    (r'bg-indigo-700', 'bg-violet-700'),
    (r'group-hover:bg-indigo-700', 'group-hover:bg-violet-700'),
    (r'hover:bg-indigo-700', 'hover:bg-violet-700'),

    # Cyan remaining
    (r'text-cyan-400', 'text-fuchsia-400'),
    (r'text-cyan-300', 'text-fuchsia-300'),
    (r'focus:border-cyan-500', 'focus:border-violet-500'),
    (r'from-blue-50 to-indigo-50', 'from-violet-50 to-fuchsia-50'),
    (r'from-blue-50', 'from-violet-50'),
    (r'to-indigo-50', 'to-violet-50'),
    (r'to-cyan-50', 'to-fuchsia-50'),
    (r'text-blue-900', 'text-violet-900'),
    (r'bg-blue-200', 'bg-violet-200'),
    (r'bg-gray-200', 'bg-[#e8e5de]'),
    (r'divide-gray-100', 'divide-[#e8e5de]'),

    # TasksBoard slate-100
    (r'bg-slate-50 border border-slate-100', 'bg-[#f0eeea] border border-[#e8e5de]'),
    (r'border-slate-100', 'border-[#e8e5de]'),
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    changes = 0
    
    for pattern, replacement in REPLACEMENTS:
        # Use word boundary awareness to avoid partial matches
        # But for Tailwind classes, we match the exact pattern
        new_content = content.replace(pattern, replacement)
        if new_content != content:
            count = content.count(pattern) - new_content.count(pattern)
            changes += max(count, 1)
            content = new_content
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return changes
    return 0

def main():
    total_changes = 0
    for filename in FILES:
        filepath = os.path.join(SRC_DIR, filename)
        if not os.path.exists(filepath):
            print(f"SKIP {filename} (not found)")
            continue
        changes = process_file(filepath)
        if changes > 0:
            print(f"  OK {filename}: {changes} replacements")
            total_changes += changes
        else:
            print(f"SKIP {filename} (no changes)")
    
    print(f"\nTotal: {total_changes} replacements across {len(FILES)} files")

if __name__ == '__main__':
    main()
