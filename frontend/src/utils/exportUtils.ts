import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';

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

const headerStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
  fill: { fgColor: { rgb: '374151' } },
  alignment: { horizontal: 'left', vertical: 'center' },
};

const RED = 'EF4444';
const GREEN = '22C55E';
const ORANGE = 'E67E00';
const MUTED = '6B7280';

export type ExcelCellStyle = {
  font?: { bold?: boolean; color?: { rgb: string }; sz?: number };
  fill?: { fgColor: { rgb: string } };
  alignment?: { horizontal?: string; vertical?: string };
};

export type StyledExcelColumn = {
  key: string;
  header: string;
  /** Optional per-row style based on row data */
  styleFor?: (row: Record<string, any>, value: any) => ExcelCellStyle | undefined;
  format?: (row: Record<string, any>, value: any) => string | number;
};

/** Plain export (no colors) — keeps existing call sites working */
export const exportToExcel = (data: any[], filename: string = 'export.xlsx') => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
};

/**
 * Styled Excel export — preserves Boli Record colors (red overpriced / green underpriced, etc.)
 * Uses explicit column order so headers never misalign with data.
 */
export const exportStyledExcel = (
  rows: Record<string, any>[],
  columns: StyledExcelColumn[],
  filename: string = 'export.xlsx',
  sheetName: string = 'Sheet1',
) => {
  const headers = columns.map((c) => c.header);
  const aoa: any[][] = [headers];

  for (const row of rows) {
    aoa.push(
      columns.map((c) => {
        const raw = row[c.key];
        if (c.format) return c.format(row, raw);
        if (raw == null || raw === '') return '';
        return raw;
      }),
    );
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws['!cols'] = columns.map((c) => ({
    wch: Math.max(12, c.header.length + 2),
  }));

  // Header styles
  headers.forEach((_, colIdx) => {
    const addr = XLSX.utils.encode_cell({ r: 0, c: colIdx });
    if (!ws[addr]) return;
    ws[addr].s = headerStyle;
  });

  // Body styles
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    columns.forEach((col, c) => {
      const addr = XLSX.utils.encode_cell({ r: r + 1, c });
      if (!ws[addr]) return;
      const value = row[col.key];
      const custom = col.styleFor?.(row, value);
      if (custom) {
        ws[addr].s = custom;
      }
      // Force dates/numbers that look like dates to stay as text when formatted as string
      if (typeof ws[addr].v === 'string') {
        ws[addr].t = 's';
      }
    });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const name = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, name);
};

/** Shared helpers for Boli price-status coloring */
export const priceStatusFontColor = (status?: string | null): string => {
  if (status === 'OVERPRICED') return RED;
  if (status === 'UNDERPRICED') return GREEN;
  if (status === 'AT_BASE') return MUTED;
  return ORANGE;
};

export const boldColorStyle = (rgb: string): ExcelCellStyle => ({
  font: { bold: true, color: { rgb }, sz: 10 },
});

export const formatExcelDate = (value: any): string => {
  if (value == null || value === '') return '';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return String(value);
  // Stable YYYY-MM-DD — avoids Excel locale / epoch misreads
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
