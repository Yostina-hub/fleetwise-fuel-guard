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
  validPoints: number;
  movingPoints: number;
  stoppedPoints: number;
  idlePoints: number;
  invalidCoordPoints: number;
  filteredSegments: number;
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

  // Calculate data quality
  const dataQuality = tripSummary.totalPoints > 0 
    ? Math.round((tripSummary.validPoints / tripSummary.totalPoints) * 100) 
    : 0;

  // Header with gradient effect (simulated with colored box)
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageWidth, 35, "F");
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Route History Report", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${format(new Date(), "PPpp")}`, pageWidth / 2, 28, { align: "center" });
  yPos = 45;
  doc.setTextColor(0, 0, 0);

  // Vehicle Info Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, yPos, pageWidth - 28, 32, 3, 3, "FD");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 64, 175);
  doc.text("Vehicle Information", 20, yPos + 10);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(`Plate: ${vehiclePlate}`, 20, yPos + 20);
  doc.text(`Make/Model: ${vehicleMake || "N/A"} ${vehicleModel || ""}`, 20, yPos + 28);
  doc.text(`Driver: ${driverName || "Not assigned"}`, pageWidth / 2, yPos + 20);
  doc.text(`Date: ${format(parseISO(selectedDate), "PPP")}`, pageWidth / 2, yPos + 28);
  yPos += 42;

  // Trip Summary Box
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(14, yPos, pageWidth - 28, 40, 3, 3, "FD");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 64, 175);
  doc.text("Trip Summary", 20, yPos + 10);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const col1X = 20;
  const col2X = pageWidth / 3 + 10;
  const col3X = (pageWidth / 3) * 2;
  
  doc.setFont("helvetica", "bold");
  doc.text(`${tripSummary.totalDistanceKm} km`, col1X, yPos + 20);
  doc.text(`${formatDuration(tripSummary.durationMinutes)}`, col2X, yPos + 20);
  doc.text(`${tripSummary.avgSpeed} km/h`, col3X, yPos + 20);
  doc.setFont("helvetica", "normal");
  doc.text("Distance", col1X, yPos + 26);
  doc.text("Duration", col2X, yPos + 26);
  doc.text("Avg Speed", col3X, yPos + 26);
  
  doc.setFont("helvetica", "bold");
  doc.text(`${tripSummary.maxSpeed} km/h`, col1X, yPos + 34);
  doc.text(`${tripSummary.fuelConsumed}%`, col2X, yPos + 34);
  doc.text(`${tripSummary.startTime} - ${tripSummary.endTime}`, col3X, yPos + 34);
  doc.setFont("helvetica", "normal");
  doc.text("Max Speed", col1X, yPos + 40);
  doc.text("Fuel Used", col2X, yPos + 40);
  doc.text("Time Range", col3X, yPos + 40);
  yPos += 50;

  // Data Quality Box
  const qualityColor = dataQuality >= 95 ? [34, 197, 94] : dataQuality >= 80 ? [234, 179, 8] : [239, 68, 68];
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(14, yPos, pageWidth - 28, 45, 3, 3, "FD");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text("Data Quality Analysis", 20, yPos + 10);
  
  // Quality percentage badge
  doc.setFillColor(qualityColor[0], qualityColor[1], qualityColor[2]);
  doc.roundedRect(pageWidth - 50, yPos + 4, 36, 10, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`${dataQuality}% valid`, pageWidth - 32, yPos + 11, { align: "center" });
  
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  
  // Data quality grid
  const qCol1X = 20;
  const qCol2X = 55;
  const qCol3X = 90;
  const qCol4X = 125;
  const qCol5X = 160;
  
  doc.setFont("helvetica", "bold");
  doc.text(tripSummary.totalPoints.toString(), qCol1X, yPos + 22);
  doc.text(tripSummary.validPoints.toString(), qCol2X, yPos + 22);
  doc.text(tripSummary.movingPoints.toString(), qCol3X, yPos + 22);
  doc.text(tripSummary.stoppedPoints.toString(), qCol4X, yPos + 22);
  doc.text(tripSummary.idlePoints.toString(), qCol5X, yPos + 22);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Total Points", qCol1X, yPos + 28);
  doc.text("Valid GPS", qCol2X, yPos + 28);
  doc.text("Moving", qCol3X, yPos + 28);
  doc.text("Stopped", qCol4X, yPos + 28);
  doc.text("Idling", qCol5X, yPos + 28);
  
  // Filtered data row
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(tripSummary.invalidCoordPoints.toString(), qCol1X, yPos + 38);
  doc.text(tripSummary.filteredSegments.toString(), qCol2X, yPos + 38);
  doc.text((tripSummary.invalidCoordPoints + tripSummary.filteredSegments).toString(), qCol3X, yPos + 38);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Invalid Coords", qCol1X, yPos + 44);
  doc.text("GPS Jumps", qCol2X, yPos + 44);
  doc.text("Total Filtered", qCol3X, yPos + 44);
  yPos += 55;

  // Driving Analysis
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text("Driving Analysis", 20, yPos);
  yPos += 10;

  const idlePercentage = tripSummary.totalPoints > 0 
    ? ((tripSummary.idlePoints / tripSummary.totalPoints) * 100).toFixed(1) 
    : "0";
  const speedingPoints = routeData.filter(p => (p.speed_kmh || 0) > 100).length;
  const speedingPercentage = routeData.length > 0 
    ? ((speedingPoints / routeData.length) * 100).toFixed(1) 
    : "0";

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`• Idle Time: ${idlePercentage}% of journey (${tripSummary.idlePoints} data points)`, 20, yPos);
  yPos += 6;
  doc.text(`• High Speed (>100 km/h): ${speedingPercentage}% of journey (${speedingPoints} points)`, 20, yPos);
  yPos += 6;
  doc.text(`• Moving Time: ${tripSummary.movingPoints} data points (speed > 2 km/h)`, 20, yPos);
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
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text("Sample Data Points", 20, yPos);
  yPos += 8;

  // Table header
  doc.setFillColor(30, 64, 175);
  doc.setTextColor(255, 255, 255);
  doc.roundedRect(14, yPos, pageWidth - 28, 8, 1, 1, "F");
  doc.setFontSize(8);
  doc.text("Time", 18, yPos + 6);
  doc.text("Speed", 50, yPos + 6);
  doc.text("Fuel", 80, yPos + 6);
  doc.text("Latitude", 105, yPos + 6);
  doc.text("Longitude", 145, yPos + 6);
  doc.text("Status", 180, yPos + 6);
  yPos += 8;

  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "normal");

  // Sample 15 evenly spaced points
  const sampleSize = Math.min(15, routeData.length);
  const step = Math.max(1, Math.floor(routeData.length / sampleSize));
  
  for (let i = 0; i < sampleSize; i++) {
    const point = routeData[i * step];
    if (!point) continue;
    
    if (yPos > 265) {
      doc.addPage();
      yPos = 20;
    }

    const bgColor = i % 2 === 0 ? [248, 250, 252] : [241, 245, 249];
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(14, yPos, pageWidth - 28, 7, "F");

    const speed = point.speed_kmh || 0;
    const status = speed > 2 ? "Moving" : (point.engine_on ? "Idle" : "Stopped");

    doc.text(format(parseISO(point.last_communication_at), "HH:mm:ss"), 18, yPos + 5);
    doc.text(`${speed} km/h`, 50, yPos + 5);
    doc.text(`${point.fuel_level_percent || 0}%`, 80, yPos + 5);
    doc.text((point.latitude || 0).toFixed(5), 105, yPos + 5);
    doc.text((point.longitude || 0).toFixed(5), 145, yPos + 5);
    doc.text(status, 180, yPos + 5);
    yPos += 7;
  }

  // Footer
  yPos = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, yPos - 5, pageWidth - 14, yPos - 5);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("This report was automatically generated by Fleet Management System", pageWidth / 2, yPos, { align: "center" });
  doc.text(`Data Quality: ${dataQuality}% • Total Points: ${tripSummary.totalPoints} • Filtered: ${tripSummary.invalidCoordPoints + tripSummary.filteredSegments}`, pageWidth / 2, yPos + 6, { align: "center" });

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

  const dataQuality = tripSummary.totalPoints > 0 
    ? Math.round((tripSummary.validPoints / tripSummary.totalPoints) * 100) 
    : 0;
  
  const qualityColor = dataQuality >= 95 ? '#22c55e' : dataQuality >= 80 ? '#eab308' : '#ef4444';
  const qualityBg = dataQuality >= 95 ? '#dcfce7' : dataQuality >= 80 ? '#fef9c3' : '#fee2e2';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Route History - ${vehiclePlate} - ${selectedDate}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 0; background: #fff; color: #334155; }
        
        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 24px; text-align: center; }
        .header h1 { font-size: 24px; margin-bottom: 4px; }
        .header .date { opacity: 0.9; font-size: 14px; }
        
        .container { max-width: 900px; margin: 0 auto; padding: 24px; }
        
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
        .info-box h3 { color: #1e40af; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .info-item { font-size: 14px; }
        .info-item strong { color: #1e293b; }
        
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
        .stat { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; padding: 16px; border-radius: 12px; text-align: center; }
        .stat-value { font-size: 28px; font-weight: 700; color: #1e40af; }
        .stat-label { font-size: 11px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .quality-section { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
        .quality-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .quality-header h3 { color: #334155; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .quality-badge { background: ${qualityBg}; color: ${qualityColor}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        
        .quality-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 16px; }
        .quality-stat { text-align: center; padding: 12px 8px; background: white; border-radius: 8px; border: 1px solid #e5e7eb; }
        .quality-stat .value { font-size: 20px; font-weight: 700; color: #1e293b; }
        .quality-stat .label { font-size: 10px; color: #64748b; margin-top: 2px; }
        
        .filtered-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding-top: 12px; border-top: 1px dashed #e5e7eb; }
        .filtered-stat { text-align: center; }
        .filtered-stat .value { font-size: 16px; font-weight: 600; color: #dc2626; }
        .filtered-stat .label { font-size: 10px; color: #94a3b8; }
        
        .time-bar { display: flex; justify-content: space-between; background: #f1f5f9; border-radius: 8px; padding: 12px 20px; margin-bottom: 20px; font-size: 13px; }
        .time-bar span { color: #64748b; }
        .time-bar strong { color: #1e293b; }
        
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
        .footer p { margin-bottom: 4px; }
        
        @media print { 
          body { padding: 0; } 
          .container { padding: 16px; }
          .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .stat { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .quality-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Route History Report</h1>
        <div class="date">${format(parseISO(selectedDate), "PPPP")}</div>
      </div>
      
      <div class="container">
        <div class="info-box">
          <h3>Vehicle Information</h3>
          <div class="info-grid">
            <div class="info-item"><strong>Plate:</strong> ${vehiclePlate}</div>
            <div class="info-item"><strong>Driver:</strong> ${driverName || "Not assigned"}</div>
          </div>
        </div>
        
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
        
        <div class="quality-section">
          <div class="quality-header">
            <h3>Data Quality Analysis</h3>
            <span class="quality-badge">${dataQuality}% Valid Data</span>
          </div>
          <div class="quality-grid">
            <div class="quality-stat">
              <div class="value">${tripSummary.totalPoints}</div>
              <div class="label">Total Points</div>
            </div>
            <div class="quality-stat">
              <div class="value">${tripSummary.validPoints}</div>
              <div class="label">Valid GPS</div>
            </div>
            <div class="quality-stat">
              <div class="value">${tripSummary.movingPoints}</div>
              <div class="label">Moving</div>
            </div>
            <div class="quality-stat">
              <div class="value">${tripSummary.stoppedPoints}</div>
              <div class="label">Stopped</div>
            </div>
            <div class="quality-stat">
              <div class="value">${tripSummary.idlePoints}</div>
              <div class="label">Idling</div>
            </div>
            <div class="quality-stat">
              <div class="value" style="color: #dc2626;">${tripSummary.invalidCoordPoints + tripSummary.filteredSegments}</div>
              <div class="label">Filtered</div>
            </div>
          </div>
          <div class="filtered-row">
            <div class="filtered-stat">
              <div class="value">${tripSummary.invalidCoordPoints}</div>
              <div class="label">Invalid Coordinates</div>
            </div>
            <div class="filtered-stat">
              <div class="value">${tripSummary.filteredSegments}</div>
              <div class="label">GPS Jump Segments</div>
            </div>
            <div class="filtered-stat">
              <div class="value">${tripSummary.invalidCoordPoints + tripSummary.filteredSegments}</div>
              <div class="label">Total Filtered Out</div>
            </div>
          </div>
        </div>
        
        <div class="time-bar">
          <span>Start: <strong>${tripSummary.startTime}</strong></span>
          <span>→</span>
          <span>End: <strong>${tripSummary.endTime}</strong></span>
        </div>
        
        <div class="footer">
          <p>Generated on ${format(new Date(), "PPpp")}</p>
          <p>Fleet Management System • Data Quality: ${dataQuality}%</p>
        </div>
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
