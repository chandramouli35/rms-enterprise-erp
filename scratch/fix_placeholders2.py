with open('frontend/src/pages/GoyalAgroForm.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# First, remove it if it exists anywhere so we don't double it up
content = content.replace(' placeholder="Enter M/C..."', '')

# Next, apply it specifically to the class string used by hodiKataiMc
target_str = ' className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors"'
replacement = ' placeholder="Enter M/C..."' + target_str

content = content.replace(target_str, replacement)

with open('frontend/src/pages/GoyalAgroForm.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
