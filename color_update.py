import re

with open('src/components/ModuleDetailView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Main background -> dynamic color overlay strategy to ensure it's "a bit darker" than the pure gradient
old_hero_start = 'className="relative mb-6 lg:mb-8 rounded-[2rem] bg-slate-600 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] shrink-0 overflow-hidden"'
new_hero_start = 'className={`relative mb-6 lg:mb-8 rounded-[2rem] bg-gradient-to-br ${module.color} shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] shrink-0 overflow-hidden`}\n      >\n        {/* Darkening overlay over the base color */}\n        <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply pointer-events-none z-0" />'

text = text.replace(old_hero_start + '\n      >', new_hero_start)

# 2. Update floating book icon to match module color, keeping it bright (matching the module color)
text = text.replace("'from-[#1FA7E1] to-[#9956DE]'", "module.color")

# 3. Update the inner progress bar to match module color
text = text.replace("'bg-gradient-to-r from-sky-400 to-indigo-400'", "`bg-gradient-to-r ${module.color}`")

with open('src/components/ModuleDetailView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Color synced to module color.")
