import { format } from "date-fns";
import jsPDF from "jspdf";

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
  let yPosition = margin;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, yPosition);
  yPosition += 8;

  // Subtitle with date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, margin, yPosition);
  yPosition += 10;

  // Reset text color
  doc.setTextColor(0);

  if (data.length === 0) {
    doc.text("No data available", margin, yPosition);
    doc.save(`${filename}_${format(new Date(), "yyyy-MM-dd_HHmm")}.pdf`);
    return;
  }

  // Calculate column widths
  const totalWidth = pageWidth - margin * 2;
  const defaultWidth = totalWidth / columns.length;
  const columnWidths = columns.map((col) => col.width || defaultWidth);

  // Table header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, yPosition, totalWidth, 8, "F");
  doc.setTextColor(255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");

  let xPosition = margin + 2;
  columns.forEach((col, index) => {
    doc.text(col.label.toUpperCase(), xPosition, yPosition + 5.5, { maxWidth: columnWidths[index] - 4 });
    xPosition += columnWidths[index];
  });
  yPosition += 8;

  // Table rows
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");

  data.forEach((row, rowIndex) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = margin;
    }

    // Alternating row colors
    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(margin, yPosition, totalWidth, 7, "F");
    }

    xPosition = margin + 2;
    columns.forEach((col, index) => {
      const value = String(row[col.key] ?? "-");
      doc.text(value, xPosition, yPosition + 5, { maxWidth: columnWidths[index] - 4 });
      xPosition += columnWidths[index];
    });
    yPosition += 7;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
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
