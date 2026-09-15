# Physical Weighbridge Integration with RMS  
## Client Questions & Answers

**Document purpose:** Clarification of requirements and approach based on the points raised by the client.  
**Software:** Rice Mill Management System (RMS) – existing Weighbridge / Paddy Inward module  
**Date:** 15 September 2026  

---

### Q1. What exactly needs to be done for the physical weighbridge?

**A1.**  
The physical weighbridge indicator must be connected to the **existing Weighbridge module** already implemented in the ERP (including the existing weight / inward workflow).  

This is **not** a request to create a new module. The live weight from the physical machine should be captured automatically into the existing Weighbridge and Paddy Inward weight fields.

---

### Q2. How should the device be tested first, before software integration?

**A2.**  
As confirmed by the hardware vendor, communication must first be tested on the PC through the **COM port** using **PuTTY** or a **Serial Monitor**.  

Test settings:

| Parameter | Value |
|-----------|--------|
| Baud Rate | **9600** and **2400** (test both; use whichever works) |
| Data Bits | **8** |
| Parity | **None** |
| Stop Bits | **1** |

Only after raw weight data is received successfully on the PC should that serial data be integrated into the ERP.

---

### Q3. Where should the live weight appear in the software?

**A3.**  
Once the serial data is confirmed, it will be integrated into the **existing Paddy Inward / Weighbridge weight fields**, so the live weight from the physical machine is captured automatically in the ERP (same screens and workflow already in use).

---

### Q4. Can COM Port and Baud Rate be changed if needed?

**A4.**  
Yes. **COM Port** and **Baud Rate** will remain **configurable**, so the mill can select the correct port and speed (for example COM3 at 9600 or 2400) without hard-coding.

---

### Q5. Will this work with a browser-based system? The weighbridge is usually used with a Windows desktop application. How will it work if we are on a web application?

**A5.**  
Yes — it will work with the **current browser-based RMS**. A full conversion of the ERP into a separate Windows desktop application is **not** required.

Clarification:

- RMS remains a **web application**. Staff will continue to use it in the browser (Chrome / Edge), as they do today.
- A standard web browser **cannot open a COM port by itself**.
- Therefore, on the **weighbridge PC only** (the Windows PC physically connected to the indicator), a **small local Windows connector / service** will:
  1. Read weight from the COM port  
  2. Send that live weight into the existing RMS Weighbridge APIs / screens  

So:

| Point | Confirmation |
|-------|----------------|
| Full Windows desktop ERP rewrite? | **No** |
| Continue using the web ERP? | **Yes** |
| How does the physical machine connect? | COM port on weighbridge PC → small local bridge → existing Weighbridge / Paddy Inward fields |
| Suitable for season start? | **Yes** — this is the standard approach for web ERP + physical weighbridge |

Operators still work in the **same web software**. Only the machine connected to the indicator needs the small Windows bridge in the background.

---

### Q6. Can we start using this soon for the season?

**A6.**  
Yes. The approach is designed for a short timeline:

1. Confirm raw weight on the PC via PuTTY / Serial Monitor (9600 / 2400, 8N1).  
2. Integrate that proven feed into the **existing** Weighbridge / Paddy Inward module.  
3. Go live on the **same web ERP** — no parallel desktop system to learn or deploy.

---

### Summary of understanding

| Client point | Our confirmation |
|--------------|------------------|
| Use existing Weighbridge / inward module | Confirmed — no new module |
| Test COM via PuTTY first (9600 / 2400, 8N1) | Confirmed |
| Auto-capture live weight in ERP fields | Confirmed |
| Configurable COM Port and Baud Rate | Confirmed |
| Web app vs Windows desktop concern | Web ERP continues; small Windows COM bridge only on weighbridge PC |
| Season urgency | Confirmed — proceed after successful PuTTY reading |

---

### Kindly confirm

Please confirm that the above matches your requirement. If available, please also share:

1. Weighbridge **indicator model**  
2. Current **COM port** shown in Windows Device Manager (e.g. COM3)  
3. Whether PuTTY already shows a stable weight reading at **9600** or **2400**

---

*End of document*
