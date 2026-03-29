import re

with open('src/components/FloatingAITutor.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Update the header title text in FloatingAITutor
text = text.replace(
    '<h3 className="text-white font-bold text-sm">AI Math Tutor</h3>',
    '<h3 className="text-white font-bold text-sm">L.O.L.I.</h3>'
)
text = text.replace(
    '<p className="text-sky-100 text-xs">Always here to help</p>',
    '<p className="text-sky-100 text-[10px] leading-tight">Logical Operations &<br/>Learning Intelligence</p>'
)

# Replace tooltip
text = text.replace(
    'Hello! I\'m Loli, how may I help you?',
    'Hello! I\'m L.O.L.I., how may I help you?'
)

with open('src/components/FloatingAITutor.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

with open('src/components/AIChatPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Update the sidebar logo text in AIChatPage
text = text.replace(
    '<h2 className="text-base font-bold font-display text-[#0a1628]">MathPulse AI</h2>',
    '<h2 className="text-base font-bold font-display text-[#0a1628]">L.O.L.I.</h2>'
)

# Update the large welcome screen text in AIChatPage
text = text.replace(
    '<h2 className="text-2xl font-bold font-display text-[#0a1628] mb-2">Welcome to MathPulse AI</h2>',
    '<h2 className="text-2xl font-bold font-display text-[#0a1628] mb-1">Welcome to L.O.L.I.</h2>'
)

text = text.replace(
    '<p className="text-[#5a6578] mb-6 max-w-md">',
    '<p className="text-sky-600 text-sm font-bold tracking-wide uppercase mb-4">Logical Operations & Learning Intelligence</p>\n              <p className="text-[#5a6578] mb-6 max-w-md">'
)

with open('src/components/AIChatPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Applied L.O.L.I. naming!")
