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

// Excel Export utility (HTML table format, opens in Excel/LibreOffice)
export const exportToExcel = (
  title: string,
  data: Record<string, any>[],
  columns: { key: string; label: string }[],
  filename: string
) => {
  if (data.length === 0) return;

  const header = columns.map(c => `<th style="background:#4472C4;color:white;padding:8px;border:1px solid #ddd;font-weight:bold">${c.label}</th>`).join("");
  const rows = data.map((row, i) =>
    columns.map(c => `<td style="padding:6px;border:1px solid #ddd;${i % 2 === 0 ? "background:#f8f9fa" : ""}">${row[c.key] ?? ""}</td>`).join("")
  );
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt}th,td{mso-number-format:"\\@"}</style></head>
    <body>
      <h2>${title}</h2>
      <p>Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</p>
      <table><tr>${header}</tr>${rows.map(r => `<tr>${r}</tr>`).join("")}</table>
    </body></html>
  `;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${format(new Date(), "yyyy-MM-dd_HHmm")}.xls`;
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

  const header = columns.map(c => `<th style="background:#4472C4;color:white;padding:8px;border:1px solid #ddd">${c.label}</th>`).join("");
  const rows = data.map(row =>
    columns.map(c => `<td style="padding:6px;border:1px solid #ddd">${row[c.key] ?? ""}</td>`).join("")
  );
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head><meta charset="utf-8"><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt}table{border-collapse:collapse;width:100%}h1{color:#2B579A}</style></head>
    <body>
      <h1>${title}</h1>
      <p>Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</p>
      <table><tr>${header}</tr>${rows.map(r => `<tr>${r}</tr>`).join("")}</table>
    </body></html>
  `;
  const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${format(new Date(), "yyyy-MM-dd_HHmm")}.doc`;
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

  doc.save(`${filename}_${format(new Date(), "yyyy-MM-dd_HHmm")}.pdf`);
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
