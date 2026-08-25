import re
with open('ProcurementManagement.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'<input\s+list=\"allocateUnloader-list\"[\s\S]*?<datalist id=\"allocateUnloader-list\">[\s\S]*?</datalist>',
    '''<Combobox
    name="allocateUnloader"
    value={inwardFormData.allocateUnloader}
    onChange={(e: any) => {
      handleInwardChange(e);
      if (e.target.value) {
        setInwardFormData((prev: any) => ({...prev, unloaderTruckCount: Math.floor(Math.random() * 5) + 1}));
      }
    }}
    onBlur={handleMasterDataBlur}
    options={labours}
    className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
    placeholder="Select or enter unloader"
  />''',
    content
)

content = re.sub(
    r'<input\s+list=\"labour-list\"[\s\S]*?<datalist id=\"labour-list\">[\s\S]*?</datalist>',
    '''<Combobox
    name="labour"
    value={inwardFormData.labour}
    onChange={handleInwardChange}
    onBlur={handleMasterDataBlur}
    options={labours}
    className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
    placeholder="Select or enter labour name"
  />''',
    content
)

content = re.sub(
    r'<input\s+list=\"driverName-list\"[\s\S]*?<datalist id=\"driverName-list\">[\s\S]*?</datalist>',
    '''<Combobox
    name="driverName"
    value={inwardFormData.driverName}
    onChange={handleInwardChange}
    onBlur={handleMasterDataBlur}
    options={drivers}
    className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none"
    placeholder="Select or enter driver name"
  />''',
    content
)

with open('ProcurementManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
