# Milestone 4: Client Questions & Requirements Gathering

This document outlines the pending questions and clarifications required from the client to finalize the real-world integration of the Milestone 4 modules (Power Management, Dispatch & Finance, and Finance Management).

---

## 1. Power Management Module
The standard dashboard APIs are built and integrated. However, to replace the mock data with live plant data, we need to know how the physical data will reach the system.

### Questions for Client:
* **Hardware Setup:** Do the plant's generators and main grid panels have smart energy meters, PLCs, or SCADA systems capable of transmitting data automatically?
* **Data Integration:** If automated, can these systems push data via REST API or MQTT? If not, do we need to provide a manual data entry form for operators to log shift readings?
* **Alerting Requirements:** Do you want SMS/Email alerts triggered when critical thresholds are reached (e.g., Grid Power Lost, Load > 90%), or are in-app dashboard alerts sufficient?

## 2. Dispatch & Finance Module
The Dispatch & Finance module bridges the gap between outbound logistics (gate passes, vehicle allocation) and accounting (invoicing, utility deductions). 

### Questions for Client:
* **Utility Deductions:** We currently show deductions for items like "Labor", "Weighbridge Fees", and "Packaging". Are these deductions standard fixed rates per dispatch, or do they fluctuate and require manual entry by an accountant for each shipment?
* **Invoice Generation:** Should the system automatically generate and email PDF invoices to the transporter/customer the moment a vehicle is marked as "Dispatched", or does an accountant need to manually approve the invoice first?
* **Weight Variations:** If there is a discrepancy between the loaded weight and the final weighbridge weight, what is the acceptable tolerance percentage before the system flags it for managerial approval?

## 3. Finance Management Module
The Finance module tracks cashbooks, ledgers, and expenses.

### Questions for Client:
* **Payment Gateways / Banking:** Do you require direct API integration with your corporate bank to automatically reconcile bank statements, or will accountants upload CSV statements / manually reconcile entries?
* **Taxation:** Are there specific local tax calculation rules (e.g., GST, VAT, TDS) that need to be hardcoded into the automatic invoicing, or will all invoices be generated outside this system?
* **ERP Integration:** Will this system serve as the master accounting software, or do we need to export journal entries to an external ERP like Tally, SAP, or QuickBooks?

## 4. Backup & Restore Module
Database backups for an enterprise ERP must be highly reliable. Before we build an asynchronous queue system (e.g., BullMQ) and cloud storage integration, we need to align on the technical requirements.

### Questions for Client:
* **Backup Location (Local vs. Cloud):** Do you require backups to be stored locally on the server, or uploaded to secure off-site cloud storage? If cloud storage is preferred, which provider do you use? (AWS S3, Cloudflare R2, DigitalOcean Spaces, or Azure Blob Storage)
* **Scheduling & Performance:** Rice mills operate heavily during daylight hours. Is 02:00 AM the standard low-activity window we should target for heavy database dumps?
* **Retention & Auto-Pruning:** How many days of rolling backups should the system retain before auto-deleting them to save cloud storage costs? (e.g., 30 days?)
* **Encryption Requirements:** Does the data need to be encrypted in transit via AES-256 before being streamed to the cloud bucket, or is standard bucket-level encryption sufficient?
