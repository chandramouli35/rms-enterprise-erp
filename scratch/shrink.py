import sys

with open('frontend/src/pages/GoyalAgroForm.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace padding and sizes in tbody
tbody_start = content.find('<tbody')
tbody_end = content.find('</tbody>') + len('</tbody>')

tbody_content = content[tbody_start:tbody_end]

# Index col
tbody_content = tbody_content.replace('className="p-3 text-center text-[var(--text-muted-alt)] font-mono text-sm', 'className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs')
tbody_content = tbody_content.replace('className="p-3 text-center text-[var(--text-muted-alt)] font-mono text-sm bg-indigo-900/10', 'className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs bg-indigo-900/10')
tbody_content = tbody_content.replace('className="p-3 text-center text-[var(--text-muted-alt)] font-mono text-sm bg-indigo-900/10 rounded-bl-lg', 'className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs bg-indigo-900/10 rounded-bl-lg')

# input fields
tbody_content = tbody_content.replace('w-full h-full p-3 bg-transparent', 'w-full h-full p-1 bg-transparent text-xs')
tbody_content = tbody_content.replace('w-full h-full p-3 text-center', 'w-full h-full p-1 text-center text-xs')

# Labels like Heat, M/c, Load Time
tbody_content = tbody_content.replace('w-24 text-sm font-medium', 'w-16 text-xs font-medium')
tbody_content = tbody_content.replace('items-center px-4 focus-within', 'items-center px-2 focus-within')
tbody_content = tbody_content.replace('p-0 border-r', 'p-0 h-7 border-r') # Set a fixed smaller height if we want to ensure it's not tall, but maybe just p-1 is enough.

# Signatures textareas
tbody_content = tbody_content.replace('flex-col h-full p-4 focus-within', 'flex-col h-full p-2 focus-within')
tbody_content = tbody_content.replace('text-sm font-bold uppercase tracking-wider mb-2', 'text-xs font-bold uppercase tracking-wider mb-1')

# Bin Load numbers
tbody_content = tbody_content.replace('font-bold text-lg w-8', 'font-bold text-base w-6')

# Goyal Agro text
tbody_content = tbody_content.replace('text-6xl font-black', 'text-4xl font-black')

content = content[:tbody_start] + tbody_content + content[tbody_end:]

with open('frontend/src/pages/GoyalAgroForm.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('File updated successfully')
