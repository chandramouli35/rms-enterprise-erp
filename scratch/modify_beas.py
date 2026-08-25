import re

with open('frontend/src/pages/RajoaAgroForm.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Change component name and api endpoint
content = content.replace('RajoaAgroForm', 'BeasAgroForm')
content = content.replace('RAJOA AGRO', 'BEAS AGRO')
content = content.replace('rajoa-agro', 'beas-agro')
content = content.replace('Rajoa Agro Log', 'Beas Agro Log')

# The payload mapping for Beas:
payload_replacement = """      ...formData,
      binLoad3Day: formData.binLoadDayCells[0],
      binLoad4Day: formData.binLoadDayCells[1],
      binLoad2Day: formData.binLoadDayCells[2],
      binLoad5Day: formData.binLoadDayCells[3],
      binLoad1Day: formData.binLoadDayCells[4],
      binLoad6Day: formData.binLoadDayCells[5],
      
      binUnload3: formData.binUnloadCells[0],
      binUnload4: formData.binUnloadCells[1],
      binUnload2: formData.binUnloadCells[2],
      binUnload5: formData.binUnloadCells[3],
      binUnload1: formData.binUnloadCells[4],
      binUnload6: formData.binUnloadCells[5],"""

content = re.sub(
    r'\.\.\.formData,\s*binLoad6Day.*?binUnload3:\s*formData\.binUnloadCells\[5\],',
    payload_replacement,
    content,
    flags=re.DOTALL
)

# Replace the specific bin rendering spans:
content = content.replace('<span className="text-amber-500 font-bold text-sm w-4">6</span>', '<span className="text-amber-500 font-bold text-sm w-4">3</span>')
content = content.replace('<span className="text-amber-500 font-bold text-sm w-4 ml-1">1</span>', '<span className="text-amber-500 font-bold text-sm w-4 ml-1">4</span>')

content = content.replace('<span className="text-amber-500 font-bold text-sm w-4">5</span>', '<span className="text-amber-500 font-bold text-sm w-4">2</span>')
content = content.replace('<span className="text-amber-500 font-bold text-sm w-4 ml-1">2</span>', '<span className="text-amber-500 font-bold text-sm w-4 ml-1">5</span>')

content = content.replace('<span className="text-amber-500 font-bold text-sm w-4">4</span>', '<span className="text-amber-500 font-bold text-sm w-4">1</span>')
content = content.replace('<span className="text-amber-500 font-bold text-sm w-4 ml-1">3</span>', '<span className="text-amber-500 font-bold text-sm w-4 ml-1">6</span>')

# Night shift BIN UNLOAD positions in Beas: Rows 11, 13, 15
# In Rajoa they were in rows 10, 12, 14. 
# It's too complex to move rows using regex reliably, so I'll generate BeasAgroForm by copying Rajoa and just rendering the rows cleanly.
