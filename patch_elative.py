import re

path = 'src/components/AvatarShop.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
    
# Fix elative
content = re.sub(r'className=\{\s*elative aspect-square', 'className={elative aspect-square', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
