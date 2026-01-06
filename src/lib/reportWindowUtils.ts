import { format } from "date-fns";

export interface ReportWindowConfig {
  reportName: string;
  category: string;
  timePeriod: string;
  dateRange: { from: Date; to: Date };
  selectedAssets: string[];
  data: Record<string, any>[];
  columns: { key: string; label: string }[];
}

export const openReportInNewWindow = (config: ReportWindowConfig) => {
  const {
    reportName,
    category,
    timePeriod,
    dateRange,
    selectedAssets,
    data,
    columns,
  } = config;

  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    alert("Please allow popups for this site to view the report.");
    return;
  }

  const formattedFrom = format(dateRange.from, "MMM d, yyyy");
  const formattedTo = format(dateRange.to, "MMM d, yyyy");
  const generatedAt = format(new Date(), "MMMM d, yyyy 'at' h:mm a");

  const tableRows = data.length > 0
    ? data.map((row, index) => `
        <tr class="${index % 2 === 0 ? 'even-row' : 'odd-row'}">
          ${columns.map(col => `<td>${row[col.key] ?? '-'}</td>`).join('')}
        </tr>
      `).join('')
    : `<tr><td colspan="${columns.length}" class="no-data">No data available for the selected criteria</td></tr>`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${reportName} - Report</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #f8fafc;
          color: #1e293b;
          line-height: 1.6;
          padding: 0;
        }
        
        .report-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px;
        }
        
        .report-header {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 32px;
          border-radius: 12px;
          margin-bottom: 24px;
        }
        
        .report-title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        
        .report-category {
          font-size: 14px;
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 16px;
        }
        
        .report-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          font-size: 14px;
        }
        
        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .meta-label {
          opacity: 0.8;
        }
        
        .meta-value {
          font-weight: 600;
        }
        
        .report-summary {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .summary-title {
          font-size: 16px;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 12px;
        }
        
        .summary-stats {
          display: flex;
          gap: 32px;
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
        }
        
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
        }
        
        .stat-label {
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
        }
        
        .report-table-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .table-title {
          font-size: 16px;
          font-weight: 600;
        }
        
        .table-actions {
          display: flex;
          gap: 8px;
        }
        
        .action-btn {
          padding: 8px 16px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .action-btn:hover {
          background: #f1f5f9;
        }
        
        .action-btn.primary {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
        
        .action-btn.primary:hover {
          background: #2563eb;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
        }
        
        th {
          background: #f8fafc;
          padding: 12px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #64748b;
          border-bottom: 1px solid #e2e8f0;
        }
        
        td {
          padding: 12px 16px;
          font-size: 14px;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .even-row {
          background: white;
        }
        
        .odd-row {
          background: #fafafa;
        }
        
        tr:hover td {
          background: #f1f5f9;
        }
        
        .no-data {
          text-align: center;
          padding: 48px 16px;
          color: #64748b;
          font-style: italic;
        }
        
        .report-footer {
          text-align: center;
          padding: 24px;
          color: #64748b;
          font-size: 12px;
        }
        
        @media print {
          body {
            background: white;
          }
          
          .report-container {
            padding: 0;
          }
          
          .action-btn {
            display: none;
          }
          
          .report-header {
            background: #3b82f6 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <div class="report-header">
          <div class="report-category">${category} Report</div>
          <h1 class="report-title">${reportName}</h1>
          <div class="report-meta">
            <div class="meta-item">
              <span class="meta-label">Period:</span>
              <span class="meta-value">${formattedFrom} - ${formattedTo}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Assets:</span>
              <span class="meta-value">${selectedAssets.length} selected</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Generated:</span>
              <span class="meta-value">${generatedAt}</span>
            </div>
          </div>
        </div>
        
        <div class="report-summary">
          <div class="summary-title">Report Summary</div>
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-value">${data.length}</span>
              <span class="stat-label">Total Records</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${columns.length}</span>
              <span class="stat-label">Data Fields</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${selectedAssets.length}</span>
              <span class="stat-label">Assets Included</span>
            </div>
          </div>
        </div>
        
        <div class="report-table-container">
          <div class="table-header">
            <div class="table-title">Report Data</div>
            <div class="table-actions">
              <button class="action-btn" onclick="window.print()">Print Report</button>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                ${columns.map(col => `<th>${col.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
        
        <div class="report-footer">
          <p>This report was generated automatically. For questions, please contact support.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  reportWindow.document.write(html);
  reportWindow.document.close();
};
