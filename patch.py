import re

paths = ['src/components/AvatarShop.tsx', 'src/components/CompositeAvatar.tsx']

for path in paths:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if 'CompositeAvatar.tsx' in path:
        content = content.replace('className={relative overflow-hidden  + className}', 'className={elative overflow-hidden }')
    else:
        # For AvatarShop
        if 'className={relative aspect-square' in content:
            content = content.replace('className={relative aspect-square rounded-[1.5rem] bg-white border-[3px] transition-all p-4 flex flex-col items-center justify-center group overflow-hidden }', 'className={elative aspect-square rounded-[1.5rem] bg-white border-[3px] transition-all p-4 flex flex-col items-center justify-center group overflow-hidden }')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
