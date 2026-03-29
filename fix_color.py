import re

with open('src/components/ModuleDetailView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_block = """      {/* Book Cover / Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 lg:mb-8 rounded-[2rem] bg-slate-900 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] shrink-0 overflow-hidden"
      >
        {/* Base module color, mathematically darkened for the background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-90 brightness-[0.4] saturate-[1.5] pointer-events-none z-0`} />"""

new_block = """      {/* Book Cover / Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative mb-6 lg:mb-8 rounded-[2rem] bg-gradient-to-br ${module.color} shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] shrink-0 overflow-hidden`}
      >
        {/* Simple black overlay to darken the specific module color */}
        <div className="absolute inset-0 bg-black/60 pointer-events-none z-0" />"""

text = text.replace(old_block, new_block)

with open('src/components/ModuleDetailView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed to pure gradient + black overlay.")
