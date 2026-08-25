import os

file_path = 'backend/prisma/schema.prisma'

with open(file_path, 'rb') as f:
    content = f.read()

# Try decoding ignoring errors
decoded = content.decode('utf-8', errors='ignore')
idx = decoded.find('m o d e l   G o y a l')
if idx == -1:
    idx = decoded.find('model GoyalAgroDryerLog')

if idx != -1:
    # Truncate string at idx
    clean_schema = decoded[:idx].rstrip() + '\n\n'
    
    # Append the clean model
    clean_model = """model GoyalAgroDryerLog {
  id           String   @id @default(uuid())
  plantId      String
  date         DateTime
  dryerWork    String?
  series       String?
  
  // HODI KATAI M/C (Rows 1-15) - Stored as a JSON array of 15 strings
  hodiKataiMc  Json?

  // D1 & D2 Day Shift Data
  d1HeatDay       String?
  d1McDay         String?
  d1LoadTimeDay   String?
  d1UnloadTimeDay String?
  d1HoursDay      String?

  d2HeatDay       String?
  d2McDay         String?
  d2LoadTimeDay   String?
  d2UnloadTimeDay String?
  d2HoursDay      String?

  // D1 & D2 Night Shift Data
  d1HeatNight       String?
  d1McNight         String?
  d1LoadTimeNight   String?
  d1UnloadTimeNight String?
  d1HoursNight      String?

  d2HeatNight       String?
  d2McNight         String?
  d2LoadTimeNight   String?
  d2UnloadTimeNight String?
  d2HoursNight      String?

  // Bin Loads (1, 2, 3) - Day
  binLoad1Day   String?
  binLoad2Day   String?
  binLoad3Day   String?

  // Bin Unloads
  binUnload1   String?
  binUnload2   String?
  binUnload3   String?

  // Night Bin Load
  binLoad1Night String?
  binLoad2Night String?
  binLoad3Night String?

  // Signatures
  fmSign            String?
  dayOilManSign     String?
  dayMunimSign      String?
  nightOilManSign   String?
  nightMunimSign    String?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
"""
    clean_schema += clean_model

    # Fix any remaining double spaced characters by removing NUL bytes if any leaked, but it's string now.
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(clean_schema)
    print("Fixed schema successfully")
else:
    print("Could not find the model declaration")
