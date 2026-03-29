import re

# Modifying AIChatPage.tsx
with open('src/components/AIChatPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    '<Bot size={24} className="text-white" />',
    '<img src="/avatar/avatar_icon.png" alt="AI Tutor" className="w-8 h-8 object-contain drop-shadow-md" />'
)

text = text.replace(
    '<Bot size={32} className="text-slate-500 mx-auto mb-2" />',
    '<img src="/avatar/avatar_icon.png" alt="AI Tutor" className="w-10 h-10 object-contain mx-auto mb-2 opacity-60 drop-shadow-sm grayscale contrast-50" />'
)

text = text.replace(
    '<Bot size={48} className="text-sky-600" />',
    '<img src="/avatar/avatar_icon.png" alt="AI Tutor" className="w-16 h-16 object-contain drop-shadow-lg" />'
)

with open('src/components/AIChatPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

# Modifying FloatingAITutor.tsx
with open('src/components/FloatingAITutor.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    '<div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">\n              <Bot size={20} className="text-white" />',
    '<div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">\n              <img src="/avatar/avatar_icon.png" alt="AI Tutor" className="w-7 h-7 object-contain drop-shadow-md" />'
)

text = text.replace(
    '{isOpen ? <X size={28} /> : <Bot size={28} />}',
    '{isOpen ? <X size={28} /> : <img src="/avatar/avatar_icon.png" alt="AI Tutor" className="w-10 h-10 object-contain drop-shadow-lg" />}'
)

with open('src/components/FloatingAITutor.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Icons replaced with avatar_icon.png.")
