import { format } from "date-fns";
import jsPDF from "jspdf";

// Ethio Telecom brand colors
const ET_BLUE = [0, 114, 188] as const;    // #0072BC
const ET_GREEN = [141, 198, 63] as const;  // #8DC63F
const ET_TEAL = [0, 166, 147] as const;    // #00A693
const ET_ORANGE = [247, 148, 29] as const; // #F7941D
const ET_DARK = [0, 34, 68] as const;      // #002244

const drawEthioTelecomWatermark = (doc: jsPDF) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;

  // Draw diagonal watermark text
  doc.saveGraphicsState();
  // @ts-ignore - jsPDF supports setGState
  const gState = new (doc as any).GState({ opacity: 0.06 });
  doc.setGState(gState);
  doc.setFontSize(60);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ET_BLUE);
  
  // Rotate and draw centered watermark
  const text = "ethio telecom";
  doc.text(text, centerX, centerY, { 
    align: "center", 
    angle: 35,
  });
  
  doc.setFontSize(28);
  doc.text("CONFIDENTIAL", centerX, centerY + 25, { 
    align: "center", 
    angle: 35,
  });

  doc.restoreGraphicsState();
};

const drawProfessionalHeader = (
  doc: jsPDF, 
  title: string, 
  margin: number,
  pageWidth: number
) => {
  let y = margin;

  // Top accent bar
  doc.setFillColor(...ET_BLUE);
  doc.rect(0, 0, pageWidth, 4, "F");
  doc.setFillColor(...ET_GREEN);
  doc.rect(0, 4, pageWidth, 2, "F");

  y = 14;

  // Company name header area
  doc.setFillColor(245, 248, 252);
  doc.rect(margin, y, pageWidth - margin * 2, 22, "F");
  
  // Left: Brand text
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ET_BLUE);
  doc.text("ethio telecom", margin + 4, y + 10);
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...ET_ORANGE);
  doc.text("Fleet Management System", margin + 4, y + 16);

  // Right: Date & report info
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const dateStr = format(new Date(), "MMMM d, yyyy");
  const timeStr = format(new Date(), "h:mm a");
  doc.text(dateStr, pageWidth - margin - 4, y + 10, { align: "right" });
  doc.text(timeStr, pageWidth - margin - 4, y + 16, { align: "right" });

  y += 26;

  // Report title bar
  doc.setFillColor(...ET_DARK);
  doc.rect(margin, y, pageWidth - margin * 2, 10, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), margin + 4, y + 7);

  // Green accent line under title
  y += 10;
  doc.setFillColor(...ET_GREEN);
  doc.rect(margin, y, pageWidth - margin * 2, 1.5, "F");

  return y + 6;
};

const drawProfessionalFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const footerY = pageHeight - 16;

  // Footer separator
  doc.setDrawColor(...ET_BLUE);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  
  // Left: Confidentiality
  doc.setTextColor(150, 150, 150);
  doc.text("CONFIDENTIAL - ethio telecom Fleet Management", margin, footerY + 5);
  
  // Center: Generated timestamp
  doc.text(
    `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`, 
    pageWidth / 2, footerY + 5, 
    { align: "center" }
  );
  
  // Right: Page number
  doc.setTextColor(...ET_BLUE);
  doc.setFont("helvetica", "bold");
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY + 5, { align: "right" });

  // Bottom accent bar
  doc.setFillColor(...ET_BLUE);
  doc.rect(0, pageHeight - 4, pageWidth, 2, "F");
  doc.setFillColor(...ET_GREEN);
  doc.rect(0, pageHeight - 2, pageWidth, 2, "F");
};

// Ethio Telecom branded HTML header for Excel/Word exports
const etBrandedHeader = (title: string) => `
  <div style="border-bottom:3px solid #0072BC;padding-bottom:10px;margin-bottom:15px;">
    <div>
      <h1 style="color:#0072BC;margin:0;font-size:22px;">ethio telecom</h1>
      <p style="color:#F7941D;margin:2px 0 0 0;font-size:11px;">Fleet Management System</p>
    </div>
    <h2 style="color:#002244;margin:12px 0 4px 0;font-size:16px;">${title}</h2>
    <p style="color:#888;margin:0;font-size:10px;">Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")} | CONFIDENTIAL</p>
  </div>
`;

const etBrandedFooter = () => `
  <div style="border-top:2px solid #0072BC;margin-top:20px;padding-top:8px;">
    <p style="color:#999;font-size:9px;margin:0;">&copy; ${new Date().getFullYear()} ethio telecom — Fleet Management System. Confidential.</p>
  </div>
`;

// Excel Export utility (HTML table format, opens in Excel/LibreOffice)
export const exportToExcel = (
  title: string,
  data: Record<string, any>[],
  columns: { key: string; label: string }[],
  filename: string
) => {
  if (data.length === 0) return;

  const header = columns.map(c => `<th style="background:#002244;color:white;padding:8px 10px;border:1px solid #ddd;font-weight:bold;font-size:10pt">${c.label}</th>`).join("");
  const rows = data.map((row, i) =>
    columns.map(c => `<td style="padding:6px 10px;border:1px solid #e0e0e0;font-size:10pt;${i % 2 === 0 ? "background:#f5f8fc" : "background:#fff"}">${row[c.key] ?? ""}</td>`).join("")
  );
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt}th,td{mso-number-format:"\\@"}</style></head>
    <body>
      ${etBrandedHeader(title)}
      <table style="width:100%"><tr>${header}</tr>${rows.map(r => `<tr>${r}</tr>`).join("")}</table>
      ${etBrandedFooter()}
    </body></html>
  `;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `ET_Fleet_${filename}_${format(new Date(), "yyyy-MM-dd_HHmm")}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);
};

// Word Export utility (HTML format, opens in Word/LibreOffice Writer)
export const exportToWord = (
  title: string,
  data: Record<string, any>[],
  columns: { key: string; label: string }[],
  filename: string
) => {
  if (data.length === 0) return;

  const header = columns.map(c => `<th style="background:#002244;color:white;padding:8px 10px;border:1px solid #ddd">${c.label}</th>`).join("");
  const rows = data.map((row, i) =>
    columns.map(c => `<td style="padding:6px 10px;border:1px solid #e0e0e0;${i % 2 === 0 ? "background:#f5f8fc" : ""}">${row[c.key] ?? ""}</td>`).join("")
  );
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head><meta charset="utf-8"><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt}table{border-collapse:collapse;width:100%}</style></head>
    <body>
      ${etBrandedHeader(title)}
      <table><tr>${header}</tr>${rows.map(r => `<tr>${r}</tr>`).join("")}</table>
      ${etBrandedFooter()}
    </body></html>
  `;
  const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `ET_Fleet_${filename}_${format(new Date(), "yyyy-MM-dd_HHmm")}.doc`;
  link.click();
  URL.revokeObjectURL(link.href);
};

// CSV Export utility
export const exportToCSV = (data: Record<string, any>[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Handle values that contain commas or quotes
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? "";
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

// PDF Export utility
export const exportToPDF = (
  title: string,
  data: Record<string, any>[],
  columns: { key: string; label: string; width?: number }[],
  filename: string
) => {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const maxContentY = pageHeight - 22; // Leave space for footer

  // --- Page 1: Header + Watermark ---
  drawEthioTelecomWatermark(doc);
  let yPosition = drawProfessionalHeader(doc, title, margin, pageWidth);

  // Summary stats row
  if (data.length > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Total Records: ${data.length}`, margin, yPosition);
    doc.text(`Report Period: ${format(new Date(), "MMM yyyy")}`, margin + 60, yPosition);
    yPosition += 6;
  }

  if (data.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(150, 150, 150);
    doc.text("No data available for the selected period.", margin, yPosition + 10);
    drawProfessionalFooter(doc, 1, 1);
    doc.save(`${filename}_${format(new Date(), "yyyy-MM-dd_HHmm")}.pdf`);
    return;
  }

  // Calculate column widths
  const totalWidth = pageWidth - margin * 2;
  const defaultWidth = totalWidth / columns.length;
  const columnWidths = columns.map((col) => col.width || defaultWidth);

  // Table header
  doc.setFillColor(...ET_DARK);
  doc.rect(margin, yPosition, totalWidth, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");

  let xPosition = margin + 2;
  columns.forEach((col, index) => {
    doc.text(col.label.toUpperCase(), xPosition, yPosition + 6, { maxWidth: columnWidths[index] - 4 });
    xPosition += columnWidths[index];
  });
  yPosition += 9;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  data.forEach((row, rowIndex) => {
    if (yPosition > maxContentY) {
      doc.addPage();
      drawEthioTelecomWatermark(doc);
      yPosition = margin + 8;
      
      // Repeat table header on new page
      doc.setFillColor(...ET_DARK);
      doc.rect(margin, yPosition, totalWidth, 9, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      xPosition = margin + 2;
      columns.forEach((col, index) => {
        doc.text(col.label.toUpperCase(), xPosition, yPosition + 6, { maxWidth: columnWidths[index] - 4 });
        xPosition += columnWidths[index];
      });
      yPosition += 9;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
    }

    // Alternating row colors
    if (rowIndex % 2 === 0) {
      doc.setFillColor(245, 248, 252);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(margin, yPosition, totalWidth, 7, "F");

    // Row border
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition + 7, margin + totalWidth, yPosition + 7);

    doc.setTextColor(30, 41, 59);
    xPosition = margin + 2;
    columns.forEach((col, index) => {
      const value = String(row[col.key] ?? "-");
      doc.text(value, xPosition, yPosition + 5, { maxWidth: columnWidths[index] - 4 });
      xPosition += columnWidths[index];
    });
    yPosition += 7;
  });

  // Apply footers & watermarks to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawProfessionalFooter(doc, i, pageCount);
  }

  doc.save(`ET_Fleet_${filename}_${format(new Date(), "yyyy-MM-dd_HHmm")}.pdf`);
};

// Professional Print Report utility
export const printReport = (
  title: string,
  data: Record<string, any>[],
  columns: { key: string; label: string }[],
  options?: { dateRange?: string; totalRecords?: number }
) => {
  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) {
    return false;
  }

  const dateStr = format(new Date(), "MMMM d, yyyy 'at' h:mm a");
  const rows = data.map((row, i) =>
    columns.map(c => `<td style="padding:8px 12px;border:1px solid #e0e0e0;font-size:10pt;${i % 2 === 0 ? "background:#f5f8fc" : "background:#fff"}">${row[c.key] ?? "—"}</td>`).join("")
  );
  const headerCells = columns.map(c => `<th style="background:#002244;color:white;padding:10px 12px;border:1px solid #1a3a5c;font-weight:bold;font-size:10pt;text-transform:uppercase;letter-spacing:0.5px">${c.label}</th>`).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - ethio telecom</title>
  <style>
    @page { size: landscape; margin: 15mm; }
    * { box-sizing: border-box; }
    body { font-family: Calibri, Arial, sans-serif; margin: 0; padding: 20px; color: #333; position: relative; }
    
    /* Watermark */
    body::before {
      content: "ethio telecom";
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 80px;
      font-weight: bold;
      color: rgba(0, 114, 188, 0.06);
      z-index: 0;
      pointer-events: none;
      white-space: nowrap;
    }
    body::after {
      content: "CONFIDENTIAL";
      position: fixed;
      top: calc(50% + 50px);
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 36px;
      font-weight: bold;
      color: rgba(0, 114, 188, 0.05);
      z-index: 0;
      pointer-events: none;
    }
    
    .content { position: relative; z-index: 1; }
    .header-bar { height: 4px; background: #0072BC; margin-bottom: 0; }
    .header-bar-green { height: 2px; background: #8DC63F; margin-bottom: 16px; }
    .brand-area { background: #f5f8fc; padding: 12px 16px; border-radius: 4px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
    .brand-name { font-size: 20px; font-weight: bold; color: #0072BC; margin: 0; }
    .brand-sub { font-size: 10px; color: #F7941D; margin: 2px 0 0 0; }
    .report-date { font-size: 9px; color: #888; text-align: right; }
    .title-bar { background: #002244; color: white; padding: 8px 16px; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
    .title-accent { height: 2px; background: #8DC63F; margin-bottom: 12px; }
    .summary { font-size: 9pt; color: #555; margin-bottom: 12px; }
    table { border-collapse: collapse; width: 100%; page-break-inside: auto; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
    .footer { border-top: 2px solid #0072BC; margin-top: 20px; padding-top: 8px; display: flex; justify-content: space-between; font-size: 8pt; color: #999; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="content">
    <div class="header-bar"></div>
    <div class="header-bar-green"></div>
    
    <div class="brand-area">
      <div>
        <p class="brand-name">ethio telecom</p>
        <p class="brand-sub">Fleet Management System</p>
      </div>
      <div class="report-date">
        <div>${dateStr}</div>
        ${options?.dateRange ? `<div>Period: ${options.dateRange}</div>` : ""}
      </div>
    </div>
    
    <div class="title-bar">${title}</div>
    <div class="title-accent"></div>
    
    <div class="summary">Total Records: ${data.length}${options?.dateRange ? ` | Period: ${options.dateRange}` : ""}</div>
    
    ${data.length === 0 
      ? '<p style="text-align:center;color:#999;padding:40px;font-size:14pt;">No data available for the selected period.</p>'
      : `<table><thead><tr>${headerCells}</tr></thead><tbody>${rows.map(r => `<tr>${r}</tr>`).join("")}</tbody></table>`
    }
    
    <div class="footer">
      <span>CONFIDENTIAL — ethio telecom Fleet Management</span>
      <span>Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}</span>
      <span>© ${new Date().getFullYear()} ethio telecom</span>
    </div>
    
    <div class="no-print" style="text-align:center;margin-top:20px;">
      <button onclick="window.print()" style="padding:10px 30px;background:#0072BC;color:white;border:none;border-radius:4px;font-size:14px;cursor:pointer;margin-right:10px;">
        🖨️ Print Report
      </button>
      <button onclick="window.close()" style="padding:10px 30px;background:#666;color:white;border:none;border-radius:4px;font-size:14px;cursor:pointer;">
        Close
      </button>
    </div>
  </div>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  
  // Auto-trigger print after load
  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 500);
  };
  
  return true;
};

// Fleet Report Data Formatter
export const formatFleetReportData = (vehicles: any[], fuelEvents: any[]) => {
  return vehicles.map((v) => {
    const vehicleFuelEvents = fuelEvents.filter((e) => e.vehicle_id === v.id);
    const fuelConsumed = vehicleFuelEvents
      .filter((e) => e.event_type === "refuel")
      .reduce((sum, e) => sum + Math.abs(e.fuel_change_liters || 0), 0);

    const distance = v.odometer_km || 0;
    const efficiency = distance > 0 && fuelConsumed > 0 ? distance / fuelConsumed : 0;

    return {
      plate_number: v.plate_number || "Unknown",
      year: v.year || "-",
      make: v.make || "-",
      model: v.model || "-",
      status: v.status || "-",
      distance_km: Math.round(distance),
      fuel_consumed_l: fuelConsumed.toFixed(1),
      efficiency_kmpl: efficiency.toFixed(1),
      fuel_type: v.fuel_type || "-",
      ownership: v.ownership || "-",
    };
  });
};

// Driver Report Data Formatter
export const formatDriverReportData = (drivers: any[]) => {
  return drivers.map((d) => ({
    name: `${d.first_name} ${d.last_name}`,
    employee_id: d.employee_id || "-",
    license_number: d.license_number || "-",
    license_expiry: d.license_expiry ? format(new Date(d.license_expiry), "MMM d, yyyy") : "-",
    phone: d.phone || "-",
    email: d.email || "-",
    status: d.status || "-",
    safety_score: d.safety_score ?? "-",
    total_trips: d.total_trips ?? 0,
    total_distance_km: Math.round(d.total_distance_km || 0),
  }));
};

// Fuel Report Data Formatter
export const formatFuelReportData = (fuelEvents: any[], vehicles: any[]) => {
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v.plate_number]));

  return fuelEvents.map((e) => ({
    date: format(new Date(e.event_time), "MMM d, yyyy HH:mm"),
    vehicle: vehicleMap.get(e.vehicle_id) || "Unknown",
    event_type: e.event_type || "-",
    fuel_change_l: e.fuel_change_liters?.toFixed(1) || "-",
    fuel_level_before: e.fuel_level_before?.toFixed(1) || "-",
    fuel_level_after: e.fuel_level_after?.toFixed(1) || "-",
    location: e.location || "-",
    status: e.status || "-",
    confidence: e.confidence_score ? `${(e.confidence_score * 100).toFixed(0)}%` : "-",
  }));
};
