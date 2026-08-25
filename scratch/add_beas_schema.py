import os

model = """
model BeasAgroDryerLog {
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

  // Bin Loads (1-6) - Day Shift
  binLoad1Day   String?
  binLoad2Day   String?
  binLoad3Day   String?
  binLoad4Day   String?
  binLoad5Day   String?
  binLoad6Day   String?

  // Bin Unloads - Night Shift
  binUnload1   String?
  binUnload2   String?
  binUnload3   String?
  binUnload4   String?
  binUnload5   String?
  binUnload6   String?

  // Night Bin Load (if any, matching Goyal/Rajoa pattern for safety)
  binLoad1Night String?
  binLoad2Night String?
  binLoad3Night String?
  binLoad4Night String?
  binLoad5Night String?
  binLoad6Night String?

  fmSign          String?
  dayOilManSign   String?
  dayMunimSign    String?
  nightOilManSign String?
  nightMunimSign  String?

  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
}
"""

with open('backend/prisma/schema.prisma', 'a', encoding='utf-8') as f:
    f.write(model)

print("Appended BeasAgroDryerLog to schema.prisma")
