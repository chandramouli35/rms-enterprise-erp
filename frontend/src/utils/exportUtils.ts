import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportToPDF = (title: string, columns: string[], data: any[][], filename: string = 'export.pdf') => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

  autoTable(doc, {
    startY: 30,
    head: [columns],
    body: data,
    theme: 'grid',
    headStyles: { fillColor: [40, 40, 40] },
    styles: { fontSize: 8 }
  });

  doc.save(filename);
};

/** Format 1: one PDF page per period slice (day/week/month) — Feedback 17 */
export const exportMultiPagePDF = (
  title: string,
  pages: { label: string; columns: string[]; rows: any[][] }[],
  filename: string = 'export.pdf',
) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  pages.forEach((page, idx) => {
    if (idx > 0) doc.addPage();
    doc.setFontSize(14);
    doc.text(`${title} — ${page.label}`, 14, 14);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);
    autoTable(doc, {
      startY: 26,
      head: [page.columns],
      body: page.rows,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      styles: { fontSize: 7 },
    });
  });
  doc.save(filename);
};

export const exportToExcel = (data: any[], filename: string = 'export.xlsx') => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
};
