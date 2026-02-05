import { format } from "date-fns";
import type { ReportColumn } from "@/hooks/useReportGenerator";

export interface ReportWindowConfig {
  reportName: string;
  reportDescription?: string;
  category: string;
  timePeriod: string;
  dateRange: { from: Date; to: Date };
  selectedAssets: string[];
  assetNames?: string[];
  data: Record<string, any>[];
  columns: ReportColumn[];
  summary?: Record<string, { label: string; value: string | number; trend?: number; icon?: string }>;
  chartData?: any[];
  generatedBy?: string;
  organizationName?: string;
}

const formatCellValue = (value: any, column: ReportColumn, row?: any): string => {
  if (value === null || value === undefined) return "-";
  
  if (column.format) {
    return column.format(value, row);
  }
  
  switch (column.type) {
    case "date":
      try {
        return format(new Date(value), "MMM d, yyyy h:mm a");
      } catch {
        return String(value);
      }
    case "number":
      return typeof value === "number" ? value.toLocaleString() : String(value);
    case "currency":
      return typeof value === "number" ? `$${value.toFixed(2)}` : String(value);
    case "percentage":
      return typeof value === "number" ? `${value.toFixed(1)}%` : String(value);
    case "duration":
      if (typeof value === "number") {
        const hours = Math.floor(value / 60);
        const mins = Math.round(value % 60);
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      }
      return String(value);
    case "badge":
      return String(value).charAt(0).toUpperCase() + String(value).slice(1).replace(/_/g, " ");
    default:
      return String(value);
  }
};

const getSeverityColor = (value: string): string => {
  const v = String(value).toLowerCase();
  if (v === "critical" || v === "high" || v === "error" || v === "danger") return "#ef4444";
  if (v === "warning" || v === "medium" || v === "moderate") return "#f59e0b";
  if (v === "low" || v === "info" || v === "minor") return "#3b82f6";
  if (v === "success" || v === "completed" || v === "active" || v === "excellent") return "#22c55e";
  return "#64748b";
};

const getStatusBadgeHtml = (value: string, column: ReportColumn): string => {
  if (column.type !== "badge") return formatCellValue(value, column);
  
  const color = getSeverityColor(value);
  const formattedValue = formatCellValue(value, column);
  
  return `<span style="
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    background: ${color}15;
    color: ${color};
    border: 1px solid ${color}30;
  ">${formattedValue}</span>`;
};

export const openReportInNewWindow = (config: ReportWindowConfig) => {
  const {
    reportName,
    reportDescription,
    category,
    timePeriod,
    dateRange,
    selectedAssets,
    assetNames,
    data,
    columns,
    summary,
    chartData,
    generatedBy,
    organizationName,
  } = config;

  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    alert("Please allow popups for this site to view the report.");
    return;
  }

  const formattedFrom = format(dateRange.from, "MMM d, yyyy");
  const formattedTo = format(dateRange.to, "MMM d, yyyy");
  const generatedAt = format(new Date(), "MMMM d, yyyy 'at' h:mm a");
  const reportId = `RPT-${Date.now().toString(36).toUpperCase()}`;

  // Generate summary cards HTML
  const summaryCardsHtml = summary && Object.keys(summary).length > 0 ? `
    <div class="summary-section">
      <h2 class="section-title">📊 Key Metrics</h2>
      <div class="summary-grid">
        ${Object.entries(summary).map(([key, item]) => `
          <div class="summary-card">
            <div class="summary-icon">${item.icon || "📈"}</div>
            <div class="summary-content">
              <div class="summary-value">${item.value}</div>
              <div class="summary-label">${item.label}</div>
              ${item.trend !== undefined ? `
                <div class="summary-trend ${item.trend >= 0 ? 'positive' : 'negative'}">
                  ${item.trend >= 0 ? '↑' : '↓'} ${Math.abs(item.trend).toFixed(1)}%
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  // Generate data table HTML
  const tableRows = data.length > 0
    ? data.map((row, index) => `
        <tr class="${index % 2 === 0 ? 'even-row' : 'odd-row'}">
          <td class="row-number">${index + 1}</td>
          ${columns.map(col => `<td>${col.type === 'badge' ? getStatusBadgeHtml(row[col.key], col) : formatCellValue(row[col.key], col, row)}</td>`).join('')}
        </tr>
      `).join('')
    : `<tr><td colspan="${columns.length + 1}" class="no-data">
        <div class="no-data-content">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 12h6M12 9v6"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>
          <h3>No Data Available</h3>
          <p>No records found for the selected criteria and time period.</p>
        </div>
      </td></tr>`;

  // Asset list display
  const assetListHtml = assetNames && assetNames.length > 0 
    ? assetNames.slice(0, 10).join(", ") + (assetNames.length > 10 ? ` +${assetNames.length - 10} more` : "")
    : `${selectedAssets.length} asset(s) selected`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${reportName} | Fleet Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        :root {
          --primary: #00bcd4;
          --primary-dark: #00838f;
          --primary-light: #4dd0e1;
          --accent: #8DC63F;
          --success: #22c55e;
          --warning: #f59e0b;
          --danger: #ef4444;
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --text-muted: #94a3b8;
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-tertiary: #f1f5f9;
          --border: #e2e8f0;
          --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
          --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          --radius: 12px;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--bg-secondary);
          color: var(--text-primary);
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
        }
        
        .report-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }
        
        /* Header Section */
        .report-header {
          background: linear-gradient(135deg, #001a33 0%, #1a2332 40%, #00838f 100%);
          color: white;
          padding: 40px;
          border-radius: var(--radius);
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        }
        
        .report-header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 60%;
          height: 200%;
          background: radial-gradient(ellipse, rgba(0, 188, 212, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          position: relative;
          z-index: 1;
        }
        
        .report-category {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          opacity: 0.9;
          background: rgba(141, 198, 63, 0.25);
          padding: 6px 14px;
          border-radius: 50px;
          margin-bottom: 12px;
        }
        
        .report-title {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        
        .report-description {
          font-size: 15px;
          opacity: 0.85;
          max-width: 600px;
        }
        
        .report-id {
          font-size: 11px;
          font-family: monospace;
          background: rgba(255,255,255,0.2);
          padding: 6px 12px;
          border-radius: 6px;
        }
        
        .report-meta {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.2);
          position: relative;
          z-index: 1;
        }
        
        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .meta-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.7;
        }
        
        .meta-value {
          font-size: 14px;
          font-weight: 600;
        }
        
        /* Summary Section */
        .summary-section {
          margin-bottom: 24px;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .summary-card {
          background: var(--bg-primary);
          border-radius: var(--radius);
          padding: 20px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
          display: flex;
          align-items: flex-start;
          gap: 16px;
          transition: all 0.2s;
        }
        
        .summary-card:hover {
          box-shadow: var(--shadow);
          transform: translateY(-2px);
        }
        
        .summary-icon {
          font-size: 28px;
          line-height: 1;
        }
        
        .summary-content {
          flex: 1;
        }
        
        .summary-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }
        
        .summary-label {
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
        }
        
        .summary-trend {
          font-size: 12px;
          font-weight: 600;
          margin-top: 8px;
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 50px;
        }
        
        .summary-trend.positive {
          color: var(--success);
          background: rgba(34, 197, 94, 0.1);
        }
        
        .summary-trend.negative {
          color: var(--danger);
          background: rgba(239, 68, 68, 0.1);
        }
        
        /* Table Section */
        .table-container {
          background: var(--bg-primary);
          border-radius: var(--radius);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
        }
        
        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-tertiary);
        }
        
        .table-title {
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .table-count {
          font-size: 12px;
          color: var(--text-muted);
          background: var(--bg-primary);
          padding: 4px 10px;
          border-radius: 50px;
          font-weight: 500;
        }
        
        .table-actions {
          display: flex;
          gap: 8px;
        }
        
        .action-btn {
          padding: 10px 18px;
          border: 1px solid var(--border);
          background: var(--bg-primary);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-primary);
        }
        
        .action-btn:hover {
          background: var(--bg-tertiary);
          border-color: var(--primary);
        }
        
        .action-btn.primary {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        
        .action-btn.primary:hover {
          background: var(--primary-dark);
        }
        
        .table-scroll {
          overflow-x: auto;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        
        th {
          background: var(--bg-tertiary);
          padding: 14px 16px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          border-bottom: 2px solid var(--border);
          white-space: nowrap;
          position: sticky;
          top: 0;
        }
        
        th:first-child {
          width: 50px;
          text-align: center;
        }
        
        td {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          color: var(--text-primary);
        }
        
        .row-number {
          text-align: center;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 500;
        }
        
        .even-row {
          background: var(--bg-primary);
        }
        
        .odd-row {
          background: var(--bg-secondary);
        }
        
        tr:hover td {
          background: rgba(59, 130, 246, 0.05);
        }
        
        .no-data {
          text-align: center;
          padding: 60px 16px;
        }
        
        .no-data-content {
          color: var(--text-muted);
        }
        
        .no-data-content svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }
        
        .no-data-content h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }
        
        .no-data-content p {
          font-size: 14px;
        }
        
        /* Footer */
        .report-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          color: var(--text-muted);
          font-size: 12px;
          margin-top: 24px;
          border-top: 1px solid var(--border);
        }
        
        .footer-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .footer-right {
          text-align: right;
        }
        
        /* Print Styles */
        @media print {
          body {
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .report-container {
            padding: 0;
          }
          
          .action-btn {
            display: none !important;
          }
          
          .table-actions {
            display: none !important;
          }
          
          .report-header {
            background: var(--primary) !important;
          }
          
          .summary-card:hover {
            transform: none;
            box-shadow: var(--shadow-sm);
          }
          
          @page {
            margin: 0.5in;
          }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .report-container {
            padding: 16px;
          }
          
          .report-header {
            padding: 24px;
          }
          
          .report-title {
            font-size: 24px;
          }
          
          .header-top {
            flex-direction: column;
            gap: 12px;
          }
          
          .summary-grid {
            grid-template-columns: 1fr;
          }
          
          .table-header {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <div class="report-header">
          <div class="header-top">
            <div>
              <div class="report-category">
                📄 ${category.charAt(0).toUpperCase() + category.slice(1)} Report
              </div>
              <h1 class="report-title">${reportName}</h1>
              ${reportDescription ? `<p class="report-description">${reportDescription}</p>` : ''}
            </div>
            <div class="report-id">${reportId}</div>
          </div>
          
          <div class="report-meta">
            <div class="meta-item">
              <span class="meta-label">Report Period</span>
              <span class="meta-value">${formattedFrom} → ${formattedTo}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Assets Included</span>
              <span class="meta-value">${assetListHtml}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Generated On</span>
              <span class="meta-value">${generatedAt}</span>
            </div>
            ${organizationName ? `
            <div class="meta-item">
              <span class="meta-label">Organization</span>
              <span class="meta-value">${organizationName}</span>
            </div>
            ` : ''}
          </div>
        </div>
        
        ${summaryCardsHtml}
        
        <div class="table-container">
          <div class="table-header">
            <div class="table-title">
              📋 Report Data
              <span class="table-count">${data.length} record${data.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="table-actions">
              <button class="action-btn" onclick="exportToCSV()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export CSV
              </button>
              <button class="action-btn primary" onclick="window.print()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print Report
              </button>
            </div>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  ${columns.map(col => `<th>${col.label}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="report-footer">
          <div class="footer-left">
            <span>Report ID: ${reportId}</span>
            <span>Generated by Fleet Management System</span>
          </div>
          <div class="footer-right">
            <span>Confidential - For Internal Use Only</span>
          </div>
        </div>
      </div>
      
      <script>
        const reportData = ${JSON.stringify(data)};
        const columns = ${JSON.stringify(columns)};
        
        function exportToCSV() {
          const headers = columns.map(c => c.label);
          const rows = reportData.map(row => 
            columns.map(col => {
              let val = row[col.key];
              if (val === null || val === undefined) return '';
              if (typeof val === 'string' && val.includes(',')) return '"' + val + '"';
              return val;
            })
          );
          
          const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = '${reportName.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv';
          a.click();
          URL.revokeObjectURL(url);
        }
      </script>
    </body>
    </html>
  `;

  reportWindow.document.write(html);
  reportWindow.document.close();
};
