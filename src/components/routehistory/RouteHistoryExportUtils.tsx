import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";

interface TelemetryPoint {
  id: string;
  latitude: number | null;
  longitude: number | null;
  speed_kmh: number | null;
  fuel_level_percent: number | null;
  heading: number | null;
  last_communication_at: string;
  engine_on: boolean | null;
}

interface TripSummary {
  durationMinutes: number;
  totalPoints: number;
  movingPoints: number;
  stoppedPoints: number;
  avgSpeed: string;
  maxSpeed: number;
  fuelConsumed: string;
  totalDistanceKm: string;
  startTime: string;
  endTime: string;
}

interface ExportParams {
  vehiclePlate: string;
  vehicleMake?: string;
  vehicleModel?: string;
  driverName?: string;
  selectedDate: string;
  tripSummary: TripSummary;
  routeData: TelemetryPoint[];
}

export const exportRoutePDF = ({
  vehiclePlate,
  vehicleMake,
  vehicleModel,
  driverName,
  selectedDate,
  tripSummary,
  routeData
}: ExportParams) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Route History Report", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${format(new Date(), "PPpp")}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Vehicle Info Box
  doc.setFillColor(240, 240, 240);
  doc.rect(14, yPos, pageWidth - 28, 30, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Vehicle Information", 20, yPos + 8);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Plate: ${vehiclePlate}`, 20, yPos + 16);
  doc.text(`Make/Model: ${vehicleMake || "N/A"} ${vehicleModel || ""}`, 20, yPos + 24);
  doc.text(`Driver: ${driverName || "Not assigned"}`, pageWidth / 2, yPos + 16);
  doc.text(`Date: ${format(parseISO(selectedDate), "PPP")}`, pageWidth / 2, yPos + 24);
  yPos += 40;

  // Trip Summary Box
  doc.setFillColor(230, 245, 255);
  doc.rect(14, yPos, pageWidth - 28, 45, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Trip Summary", 20, yPos + 8);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const col1X = 20;
  const col2X = pageWidth / 3 + 10;
  const col3X = (pageWidth / 3) * 2;
  
  doc.text(`Distance: ${tripSummary.totalDistanceKm} km`, col1X, yPos + 18);
  doc.text(`Duration: ${formatDuration(tripSummary.durationMinutes)}`, col2X, yPos + 18);
  doc.text(`Data Points: ${tripSummary.totalPoints}`, col3X, yPos + 18);
  
  doc.text(`Avg Speed: ${tripSummary.avgSpeed} km/h`, col1X, yPos + 28);
  doc.text(`Max Speed: ${tripSummary.maxSpeed} km/h`, col2X, yPos + 28);
  doc.text(`Fuel Used: ${tripSummary.fuelConsumed}%`, col3X, yPos + 28);
  
  doc.text(`Start: ${tripSummary.startTime}`, col1X, yPos + 38);
  doc.text(`End: ${tripSummary.endTime}`, col2X, yPos + 38);
  doc.text(`Moving: ${tripSummary.movingPoints} pts`, col3X, yPos + 38);
  yPos += 55;

  // Driving Analysis
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Driving Analysis", 20, yPos);
  yPos += 8;

  const idlePoints = routeData.filter(p => (p.speed_kmh || 0) < 2 && p.engine_on);
  const idlePercentage = (idlePoints.length / routeData.length) * 100;
  const speedingPoints = routeData.filter(p => (p.speed_kmh || 0) > 100);
  const speedingPercentage = (speedingPoints.length / routeData.length) * 100;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`• Idle Time: ${idlePercentage.toFixed(1)}% of journey`, 20, yPos);
  yPos += 6;
  doc.text(`• High Speed (>100 km/h): ${speedingPercentage.toFixed(1)}% of journey`, 20, yPos);
  yPos += 6;
  
  // Count stops
  let stopCount = 0;
  for (let i = 1; i < routeData.length; i++) {
    const prev = routeData[i - 1];
    const curr = routeData[i];
    if ((prev.speed_kmh || 0) > 5 && (curr.speed_kmh || 0) < 2) {
      stopCount++;
    }
  }
  doc.text(`• Number of Stops: ${stopCount}`, 20, yPos);
  yPos += 15;

  // Sample Data Points Table
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Sample Data Points", 20, yPos);
  yPos += 8;

  // Table header
  doc.setFillColor(50, 50, 50);
  doc.setTextColor(255, 255, 255);
  doc.rect(14, yPos, pageWidth - 28, 8, "F");
  doc.setFontSize(9);
  doc.text("Time", 18, yPos + 6);
  doc.text("Speed", 55, yPos + 6);
  doc.text("Fuel", 85, yPos + 6);
  doc.text("Latitude", 115, yPos + 6);
  doc.text("Longitude", 155, yPos + 6);
  yPos += 8;

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  // Sample 15 evenly spaced points
  const sampleSize = Math.min(15, routeData.length);
  const step = Math.floor(routeData.length / sampleSize);
  
  for (let i = 0; i < sampleSize; i++) {
    const point = routeData[i * step];
    if (!point) continue;
    
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    const bgColor = i % 2 === 0 ? 250 : 240;
    doc.setFillColor(bgColor, bgColor, bgColor);
    doc.rect(14, yPos, pageWidth - 28, 7, "F");

    doc.text(format(parseISO(point.last_communication_at), "HH:mm:ss"), 18, yPos + 5);
    doc.text(`${point.speed_kmh || 0} km/h`, 55, yPos + 5);
    doc.text(`${point.fuel_level_percent || 0}%`, 85, yPos + 5);
    doc.text((point.latitude || 0).toFixed(5), 115, yPos + 5);
    doc.text((point.longitude || 0).toFixed(5), 155, yPos + 5);
    yPos += 7;
  }

  // Footer
  yPos = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text("This report was automatically generated by Fleet Management System", pageWidth / 2, yPos, { align: "center" });

  // Save
  const fileName = `route-history-${vehiclePlate}-${selectedDate}.pdf`;
  doc.save(fileName);
  
  return fileName;
};

export const generateShareableLink = (vehicleId: string, date: string): string => {
  const baseUrl = window.location.origin;
  const params = new URLSearchParams({
    vehicle: vehicleId,
    date: date
  });
  return `${baseUrl}/route-history?${params.toString()}`;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
};

export const printRouteReport = (
  vehiclePlate: string,
  selectedDate: string,
  tripSummary: TripSummary,
  driverName?: string
) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Route History - ${vehiclePlate} - ${selectedDate}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .info-box { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .stat { background: #e8f4ff; padding: 12px; border-radius: 6px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #0066cc; }
        .stat-label { font-size: 12px; color: #666; margin-top: 4px; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #888; text-align: center; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>Route History Report</h1>
      <div class="info-box">
        <strong>Vehicle:</strong> ${vehiclePlate}<br>
        <strong>Driver:</strong> ${driverName || "Not assigned"}<br>
        <strong>Date:</strong> ${format(parseISO(selectedDate), "PPP")}<br>
        <strong>Time Range:</strong> ${tripSummary.startTime} - ${tripSummary.endTime}
      </div>
      <h2>Trip Summary</h2>
      <div class="summary-grid">
        <div class="stat">
          <div class="stat-value">${tripSummary.totalDistanceKm}</div>
          <div class="stat-label">Distance (km)</div>
        </div>
        <div class="stat">
          <div class="stat-value">${formatDuration(tripSummary.durationMinutes)}</div>
          <div class="stat-label">Duration</div>
        </div>
        <div class="stat">
          <div class="stat-value">${tripSummary.avgSpeed}</div>
          <div class="stat-label">Avg Speed (km/h)</div>
        </div>
        <div class="stat">
          <div class="stat-value">${tripSummary.maxSpeed}</div>
          <div class="stat-label">Max Speed (km/h)</div>
        </div>
        <div class="stat">
          <div class="stat-value">${tripSummary.fuelConsumed}%</div>
          <div class="stat-label">Fuel Used</div>
        </div>
        <div class="stat">
          <div class="stat-value">${tripSummary.totalPoints}</div>
          <div class="stat-label">Data Points</div>
        </div>
      </div>
      <div class="footer">
        Generated on ${format(new Date(), "PPpp")} | Fleet Management System
      </div>
      <script>window.onload = () => { window.print(); }</script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  return true;
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};
