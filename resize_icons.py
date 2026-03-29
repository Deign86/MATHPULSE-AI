import re

# Modifying AIChatPage.tsx
with open('src/components/AIChatPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    'className="w-8 h-8 object-contain drop-shadow-md"',
    'className="w-10 h-10 object-contain drop-shadow-md"'
)

text = text.replace(
    'className="w-10 h-10 object-contain mx-auto mb-2 opacity-60 drop-shadow-sm grayscale contrast-50"',
    'className="w-16 h-16 object-contain mx-auto mb-2 opacity-60 drop-shadow-sm grayscale contrast-50"'
)

text = text.replace(
    'className="w-16 h-16 object-contain drop-shadow-lg"',
    'className="w-20 h-20 object-contain drop-shadow-lg"'
)

with open('src/components/AIChatPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

# Modifying FloatingAITutor.tsx
with open('src/components/FloatingAITutor.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Increase header icon
text = text.replace(
    'className="w-7 h-7 object-contain drop-shadow-md"',
    'className="w-9 h-9 object-contain drop-shadow-md"'
)

# Increase floating button icon - the floating button is w-16 h-16
text = text.replace(
    'className="w-10 h-10 object-contain drop-shadow-lg"',
    'className="w-14 h-14 object-contain drop-shadow-lg"'
)

with open('src/components/FloatingAITutor.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Icons resized up.")
