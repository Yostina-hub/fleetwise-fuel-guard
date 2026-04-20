/**
 * Lightweight, dependency-free print + PDF export for tabular data.
 * Used by Drivers and Vehicles listings.
 *
 * - `printRecords`: opens browser print dialog with a styled, branded HTML view.
 * - `exportRecordsToPdf`: produces a downloadable, paginated PDF via jsPDF.
 *
 * Both helpers share the same column-mapping shape so callers stay DRY.
 */
import jsPDF from "jspdf";
import { format } from "date-fns";

export interface PrintColumn<T = any> {
  key: string;
  label: string;
  /** Optional formatter; receives the row + raw cell value. */
  format?: (value: any, row: T) => string;
  /** Optional fixed width hint for PDF (in mm). */
  width?: number;
}

export interface PrintOptions {
  title: string;
  subtitle?: string;
  /** Filename stem (no extension). */
  filename: string;
  /** Optional org name shown in header. */
  organizationName?: string;
}

const cell = (row: any, col: PrintColumn) => {
  const v = row?.[col.key];
  if (col.format) return col.format(v, row);
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );

/* -------------------- Browser print -------------------- */

export function printRecords<T = any>(
  rows: T[],
  columns: PrintColumn<T>[],
  opts: PrintOptions,
) {
  // Reuse a hidden iframe so print works in SPA contexts.
  const existing = document.getElementById("lov-print-frame");
  if (existing) existing.remove();

  const frame = document.createElement("iframe");
  frame.id = "lov-print-frame";
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";

  const dateStr = format(new Date(), "MMMM d, yyyy 'at' h:mm a");
  const headerCells = columns
    .map(
      (c) =>
        `<th>${escapeHtml(c.label)}</th>`,
    )
    .join("");
  const bodyRows = rows
    .map(
      (r, i) =>
        `<tr class="${i % 2 ? "alt" : ""}">${columns
          .map((c) => `<td>${escapeHtml(cell(r, c))}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(opts.title)}</title>
<style>
  @page { size: landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; margin: 0; padding: 12px; }
  .header { border-bottom: 2px solid #0072BC; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { font-size: 18px; font-weight: 700; color: #0072BC; margin: 0; }
  .org { font-size: 11px; color: #555; margin-top: 2px; }
  .title { font-size: 16px; font-weight: 600; margin: 6px 0 2px; color: #002244; }
  .subtitle { font-size: 11px; color: #666; }
  .meta { text-align: right; font-size: 10px; color: #666; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th { background: #002244; color: #fff; padding: 6px 8px; text-align: left; font-weight: 600; border: 1px solid #001932; text-transform: uppercase; letter-spacing: 0.3px; font-size: 9px; }
  td { padding: 5px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
  tr.alt td { background: #f7fafc; }
  .footer { margin-top: 16px; border-top: 1px solid #cbd5e1; padding-top: 6px; font-size: 9px; color: #6b7280; display: flex; justify-content: space-between; }
  .empty { text-align: center; padding: 40px; color: #94a3b8; font-size: 13px; }
</style></head>
<body>
  <div class="header">
    <div>
      <p class="brand">${escapeHtml(opts.organizationName ?? "Fleet Management")}</p>
      <p class="org">Fleet Operations Report</p>
      <h1 class="title">${escapeHtml(opts.title)}</h1>
      ${opts.subtitle ? `<p class="subtitle">${escapeHtml(opts.subtitle)}</p>` : ""}
    </div>
    <div class="meta">
      <div>${dateStr}</div>
      <div>Total records: <strong>${rows.length}</strong></div>
    </div>
  </div>
  ${
    rows.length === 0
      ? `<div class="empty">No records to display.</div>`
      : `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`
  }
  <div class="footer">
    <span>Confidential — for internal use only</span>
    <span>Generated ${format(new Date(), "yyyy-MM-dd HH:mm")}</span>
  </div>
</body></html>`;

  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => window.setTimeout(() => frame.remove(), 800);
  frame.onload = () => {
    const w = frame.contentWindow;
    if (!w) return cleanup();
    w.onafterprint = cleanup;
    window.setTimeout(() => {
      w.focus();
      w.print();
      window.setTimeout(cleanup, 1500);
    }, 200);
  };
}

/* -------------------- PDF download -------------------- */

export function exportRecordsToPdf<T = any>(
  rows: T[],
  columns: PrintColumn<T>[],
  opts: PrintOptions,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  const usableW = pageW - margin * 2;

  // Column widths: honor explicit widths, distribute remainder
  const fixedTotal = columns.reduce((s, c) => s + (c.width ?? 0), 0);
  const flexCols = columns.filter((c) => !c.width).length;
  const flexW = flexCols > 0 ? Math.max(15, (usableW - fixedTotal) / flexCols) : 0;
  const widths = columns.map((c) => c.width ?? flexW);

  const drawHeader = () => {
    doc.setFillColor(0, 114, 188);
    doc.rect(0, 0, pageW, 3, "F");
    doc.setTextColor(0, 34, 68);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(opts.organizationName ?? "Fleet Management", margin, 12);
    doc.setFontSize(11);
    doc.text(opts.title, margin, 18);
    if (opts.subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(opts.subtitle, margin, 23);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(
      `Generated ${format(new Date(), "yyyy-MM-dd HH:mm")}  ·  ${rows.length} records`,
      pageW - margin,
      12,
      { align: "right" },
    );
  };

  const drawTableHeader = (y: number) => {
    doc.setFillColor(0, 34, 68);
    doc.rect(margin, y, usableW, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    let x = margin + 1.5;
    columns.forEach((c, i) => {
      doc.text(c.label.toUpperCase(), x, y + 4.8, { maxWidth: widths[i] - 3 });
      x += widths[i];
    });
    return y + 7;
  };

  const drawFooter = (page: number, total: number) => {
    doc.setDrawColor(0, 114, 188);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text("Confidential — for internal use only", margin, pageH - 6);
    doc.text(
      `Page ${page} of ${total}`,
      pageW - margin,
      pageH - 6,
      { align: "right" },
    );
  };

  // Draw page 1
  drawHeader();
  let y = 28;
  y = drawTableHeader(y);

  if (rows.length === 0) {
    doc.setTextColor(140, 140, 140);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.text("No records to display.", pageW / 2, y + 20, { align: "center" });
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const rowH = 6;
    rows.forEach((r, idx) => {
      if (y + rowH > pageH - 14) {
        doc.addPage();
        drawHeader();
        y = 28;
        y = drawTableHeader(y);
      }
      if (idx % 2 === 0) {
        doc.setFillColor(247, 250, 252);
        doc.rect(margin, y, usableW, rowH, "F");
      }
      doc.setTextColor(31, 41, 55);
      let x = margin + 1.5;
      columns.forEach((c, i) => {
        const txt = cell(r, c);
        const lines = doc.splitTextToSize(txt, widths[i] - 3) as string[];
        doc.text(lines[0] ?? "", x, y + 4, { maxWidth: widths[i] - 3 });
        x += widths[i];
      });
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.1);
      doc.line(margin, y + rowH, pageW - margin, y + rowH);
      y += rowH;
    });
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(i, total);
  }
  doc.save(`${opts.filename}_${format(new Date(), "yyyy-MM-dd_HHmm")}.pdf`);
}
