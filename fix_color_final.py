import re

with open('src/components/ModuleDetailView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Main background
text = text.replace(
    "className={`relative mb-6 lg:mb-8 rounded-[2rem] bg-gradient-to-br ${module.color} shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] shrink-0 overflow-hidden`}",
    "className={`relative mb-6 lg:mb-8 rounded-[2rem] ${module.accentColor} shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] shrink-0 overflow-hidden`}"
)

# 2. Progress bar
text = text.replace(
    "className={`h-full rounded-full relative ${module.progress === 100 ? 'bg-gradient-to-r from-emerald-400 to-teal-300' : `bg-gradient-to-r ${module.color}`}`}",
    "className={`h-full rounded-full relative ${module.progress === 100 ? 'bg-gradient-to-r from-emerald-400 to-teal-300' : module.accentColor}`}"
)

# 3. Book Icon background
text = text.replace(
    "className={`absolute inset-0 opacity-40 rounded-[2rem] bg-gradient-to-br ${module.progress === 100 ? 'from-emerald-400 to-teal-600' : module.color}`}",
    "className={`absolute inset-0 opacity-40 rounded-[2rem] ${module.progress === 100 ? 'bg-gradient-to-br from-emerald-400 to-teal-600' : module.accentColor}`}"
)

with open('src/components/ModuleDetailView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed attribute mappings to module.accentColor")
