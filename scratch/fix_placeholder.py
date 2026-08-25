import re

file_path = 'frontend/src/pages/GoyalAgroForm.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# First, remove any accidentally added ones or row 1's one to normalize
content = content.replace(' placeholder="Enter M/C..."', '')

# Replace it using regex: find className="... transition-colors" for hodi inputs
# Actually it's easier to just find the exact string for the Hodi Katai M/C inputs.
# They all end with `transition-colors" /></td>` EXCEPT maybe Night Shift which has focus:bg-indigo-500/10 wait I changed night shift to #e67e00/10 so they are ALL identical now!
# The string is: `focus:bg-[#e67e00]/10 transition-colors" /></td>`
# Wait, some are on row 6-10 where there is no Heat/MC but they still have `focus:bg-[#e67e00]/10 transition-colors" /></td>`.
# Let's check line 150:
# `<input value={formData.hodiKataiMc[0]} onChange={e=>handleHodiChange(0,e.target.value)} className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>`

content = re.sub(
    r'(<input value=\{formData\.hodiKataiMc\[\d+\]\}[^>]*)(className=")',
    r'\1placeholder="Enter M/C..." \2',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Placeholders fixed successfully")
