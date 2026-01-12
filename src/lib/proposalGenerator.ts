import jsPDF from 'jspdf';

export const generateFleetProposal = () => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  const addNewPageIfNeeded = (requiredSpace: number = 30) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  const addHeader = (text: string, fontSize: number = 16) => {
    addNewPageIfNeeded(20);
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(text, margin, yPos);
    yPos += fontSize * 0.5 + 5;
  };

  const addSubHeader = (text: string) => {
    addNewPageIfNeeded(15);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text(text, margin, yPos);
    yPos += 8;
  };

  const addParagraph = (text: string) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      addNewPageIfNeeded(8);
      doc.text(line, margin, yPos);
      yPos += 6;
    });
    yPos += 4;
  };

  const addBulletPoint = (text: string, indent: number = 5) => {
    addNewPageIfNeeded(8);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text('•', margin + indent, yPos);
    const lines = doc.splitTextToSize(text, contentWidth - indent - 10);
    lines.forEach((line: string, index: number) => {
      if (index > 0) addNewPageIfNeeded(8);
      doc.text(line, margin + indent + 8, yPos);
      if (index < lines.length - 1) yPos += 6;
    });
    yPos += 7;
  };

  const addTable = (headers: string[], rows: string[][]) => {
    const colWidth = contentWidth / headers.length;
    const rowHeight = 8;
    
    // Header
    addNewPageIfNeeded(rowHeight * (rows.length + 2));
    doc.setFillColor(30, 64, 175);
    doc.rect(margin, yPos - 5, contentWidth, rowHeight, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    headers.forEach((header, i) => {
      doc.text(header, margin + (i * colWidth) + 3, yPos);
    });
    yPos += rowHeight;

    // Rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    rows.forEach((row, rowIndex) => {
      if (rowIndex % 2 === 0) {
        doc.setFillColor(243, 244, 246);
        doc.rect(margin, yPos - 5, contentWidth, rowHeight, 'F');
      }
      row.forEach((cell, i) => {
        doc.text(cell.substring(0, 25), margin + (i * colWidth) + 3, yPos);
      });
      yPos += rowHeight;
    });
    yPos += 10;
  };

  // ========== COVER PAGE ==========
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Fleet Management System', pageWidth / 2, 40, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Enterprise Solution Proposal', pageWidth / 2, 55, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Prepared: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, 70, { align: 'center' });

  yPos = 100;
  
  doc.setFontSize(12);
  doc.setTextColor(55, 65, 81);
  doc.setFont('helvetica', 'bold');
  doc.text('Document Contents:', margin, yPos);
  yPos += 12;

  const tocItems = [
    '1. Executive Summary',
    '2. System Overview',
    '3. Core Features & Capabilities',
    '4. Module Descriptions',
    '5. Security & Compliance',
    '6. Deployment & Infrastructure',
    '7. Implementation Timeline',
    '8. Support & Maintenance',
    '9. Investment Summary',
    '10. Next Steps'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  tocItems.forEach(item => {
    doc.text(item, margin + 10, yPos);
    yPos += 8;
  });

  // ========== EXECUTIVE SUMMARY ==========
  doc.addPage();
  yPos = margin;

  addHeader('1. Executive Summary', 18);
  yPos += 5;

  addParagraph('This proposal presents a comprehensive Fleet Management System designed to transform your vehicle fleet operations through real-time tracking, intelligent analytics, and automated management capabilities. The solution addresses critical operational challenges including vehicle tracking, driver management, fuel monitoring, maintenance scheduling, and regulatory compliance.');

  addParagraph('Our system provides complete visibility into your fleet operations, enabling data-driven decisions that reduce costs, improve safety, and enhance operational efficiency. With self-hosted deployment options, you maintain full control over your data and infrastructure.');

  addSubHeader('Key Benefits');
  addBulletPoint('Real-time GPS tracking with sub-minute location updates for all vehicles');
  addBulletPoint('Comprehensive driver behavior monitoring and safety scoring');
  addBulletPoint('Automated fuel consumption analysis with theft detection capabilities');
  addBulletPoint('Predictive maintenance scheduling to minimize vehicle downtime');
  addBulletPoint('Geofence management with automated alerts and reporting');
  addBulletPoint('Complete regulatory compliance documentation and audit trails');
  addBulletPoint('Self-hosted deployment with full data sovereignty');

  addSubHeader('Expected Outcomes');
  addBulletPoint('15-25% reduction in fuel costs through consumption optimization');
  addBulletPoint('30-40% decrease in unplanned maintenance through predictive analytics');
  addBulletPoint('20-35% improvement in fleet utilization rates');
  addBulletPoint('Significant reduction in insurance premiums through safety improvements');
  addBulletPoint('Complete visibility into fleet operations with real-time dashboards');

  // ========== SYSTEM OVERVIEW ==========
  doc.addPage();
  yPos = margin;

  addHeader('2. System Overview', 18);
  yPos += 5;

  addParagraph('The Fleet Management System is an enterprise-grade solution built to handle fleets of any size, from small business operations to large-scale logistics networks. The platform integrates seamlessly with GPS tracking devices, fuel sensors, and driver identification systems to provide a unified operational view.');

  addSubHeader('Architecture Highlights');
  addBulletPoint('Scalable architecture supporting unlimited vehicles and users');
  addBulletPoint('Multi-tenant design with organization-level data isolation');
  addBulletPoint('Role-based access control with granular permissions');
  addBulletPoint('RESTful API for third-party integrations');
  addBulletPoint('Real-time data synchronization across all connected devices');
  addBulletPoint('Offline-capable mobile applications for field operations');

  addSubHeader('System Components');
  addParagraph('The solution comprises several integrated components working together:');
  addBulletPoint('Web-based Management Console - Central command center for fleet operations');
  addBulletPoint('Mobile Applications - Driver and field technician interfaces');
  addBulletPoint('Device Gateway - Protocol handlers for various GPS tracker models');
  addBulletPoint('Analytics Engine - Real-time and historical data processing');
  addBulletPoint('Notification Service - Multi-channel alert delivery system');
  addBulletPoint('Reporting Module - Automated report generation and scheduling');

  // ========== CORE FEATURES ==========
  doc.addPage();
  yPos = margin;

  addHeader('3. Core Features & Capabilities', 18);
  yPos += 5;

  addSubHeader('3.1 Real-Time Vehicle Tracking');
  addParagraph('Complete visibility into your fleet with live GPS tracking, historical route playback, and location-based analytics.');
  addBulletPoint('Live map view with vehicle clustering for large fleets');
  addBulletPoint('Historical route playback with speed and stop analysis');
  addBulletPoint('Estimated time of arrival calculations');
  addBulletPoint('Multi-vehicle route comparison and optimization');
  addBulletPoint('Address geocoding and reverse geocoding');

  addSubHeader('3.2 Driver Management');
  addParagraph('Comprehensive driver lifecycle management from onboarding through performance monitoring.');
  addBulletPoint('Digital driver profiles with document management');
  addBulletPoint('License expiry tracking and renewal alerts');
  addBulletPoint('Driver behavior scoring and safety ratings');
  addBulletPoint('Pre-trip wellness checks and fitness assessments');
  addBulletPoint('Driver assignment and scheduling tools');
  addBulletPoint('Performance analytics and coaching recommendations');

  addSubHeader('3.3 Vehicle Management');
  addParagraph('Full vehicle lifecycle management including acquisition, maintenance, and disposition.');
  addBulletPoint('Detailed vehicle registry with specifications and documentation');
  addBulletPoint('Maintenance scheduling with automated reminders');
  addBulletPoint('Service history tracking and cost analysis');
  addBulletPoint('Vehicle inspection checklists and compliance tracking');
  addBulletPoint('Insurance and registration expiry management');
  addBulletPoint('Vehicle utilization and idle time analysis');

  // ========== MORE FEATURES ==========
  doc.addPage();
  yPos = margin;

  addSubHeader('3.4 Fuel Management');
  addParagraph('Advanced fuel monitoring and analytics to control one of the largest fleet operating expenses.');
  addBulletPoint('Real-time fuel level monitoring via tank sensors');
  addBulletPoint('Fuel consumption analysis per vehicle and driver');
  addBulletPoint('Fuel theft detection with instant alerts');
  addBulletPoint('Refueling event validation against approved stations');
  addBulletPoint('Cost tracking and budget management');
  addBulletPoint('Efficiency benchmarking and trend analysis');

  addSubHeader('3.5 Geofence & Zone Management');
  addParagraph('Define virtual boundaries for automated monitoring and compliance enforcement.');
  addBulletPoint('Polygon and circular geofence creation tools');
  addBulletPoint('Entry/exit alerts with timestamp logging');
  addBulletPoint('Speed limit zones with violation tracking');
  addBulletPoint('Restricted area enforcement');
  addBulletPoint('Customer site and depot management');
  addBulletPoint('Dwell time analysis and reporting');

  addSubHeader('3.6 Alert & Notification System');
  addParagraph('Proactive alerting system to ensure timely response to critical events.');
  addBulletPoint('Configurable alert rules with severity levels');
  addBulletPoint('Multi-channel delivery: SMS, Email, Push, In-App');
  addBulletPoint('Alert escalation and acknowledgment workflows');
  addBulletPoint('Alert history and response time analytics');
  addBulletPoint('Scheduled quiet hours and recipient management');

  addSubHeader('3.7 Reporting & Analytics');
  addParagraph('Comprehensive reporting capabilities for operational insights and compliance documentation.');
  addBulletPoint('Pre-built report templates for common use cases');
  addBulletPoint('Custom report builder with drag-and-drop interface');
  addBulletPoint('Scheduled report generation and email delivery');
  addBulletPoint('Export to PDF, Excel, and CSV formats');
  addBulletPoint('Interactive dashboards with drill-down capabilities');
  addBulletPoint('Trend analysis and forecasting tools');

  // ========== MODULE DESCRIPTIONS ==========
  doc.addPage();
  yPos = margin;

  addHeader('4. Module Descriptions', 18);
  yPos += 5;

  const modules = [
    ['Dashboard Module', 'Real-time fleet overview with KPIs, alerts, and quick actions'],
    ['Live Tracking Module', 'GPS tracking, route playback, and location services'],
    ['Vehicle Module', 'Vehicle registry, specifications, and lifecycle management'],
    ['Driver Module', 'Driver profiles, licensing, and performance management'],
    ['Trip Module', 'Trip planning, execution tracking, and analysis'],
    ['Fuel Module', 'Fuel monitoring, consumption analysis, and cost tracking'],
    ['Maintenance Module', 'Scheduled and predictive maintenance management'],
    ['Geofence Module', 'Zone definition and boundary monitoring'],
    ['Alerts Module', 'Alert configuration, delivery, and management'],
    ['Reports Module', 'Report generation and scheduled distribution'],
    ['Dispatch Module', 'Job creation, assignment, and tracking'],
    ['Settings Module', 'System configuration and user management'],
  ];

  addTable(['Module', 'Description'], modules);

  addSubHeader('Driver Behavior Analytics');
  addParagraph('The driver behavior module provides detailed insights into driving patterns and safety metrics:');
  addBulletPoint('Speeding events with location and speed limit context');
  addBulletPoint('Harsh braking and acceleration detection');
  addBulletPoint('Excessive idling monitoring');
  addBulletPoint('After-hours vehicle usage tracking');
  addBulletPoint('Safety score calculation with trend analysis');
  addBulletPoint('Gamification and driver leaderboards');

  addSubHeader('Maintenance Management');
  addParagraph('Proactive maintenance capabilities to maximize vehicle availability:');
  addBulletPoint('Service schedules based on time, mileage, or engine hours');
  addBulletPoint('Work order creation and tracking');
  addBulletPoint('Parts inventory management');
  addBulletPoint('Vendor and workshop management');
  addBulletPoint('Maintenance cost analysis and budgeting');
  addBulletPoint('Warranty tracking and claims management');

  // ========== SECURITY & COMPLIANCE ==========
  doc.addPage();
  yPos = margin;

  addHeader('5. Security & Compliance', 18);
  yPos += 5;

  addSubHeader('5.1 Data Security');
  addParagraph('Enterprise-grade security measures protect your fleet data at every level.');
  addBulletPoint('End-to-end encryption for data in transit and at rest');
  addBulletPoint('Role-based access control with granular permissions');
  addBulletPoint('Multi-factor authentication support');
  addBulletPoint('API key management with rate limiting');
  addBulletPoint('Comprehensive audit logging of all system actions');
  addBulletPoint('Automated security vulnerability scanning');

  addSubHeader('5.2 Compliance Features');
  addParagraph('Built-in tools to help meet regulatory and industry requirements.');
  addBulletPoint('Driver hours of service tracking and violation alerts');
  addBulletPoint('Vehicle inspection documentation and scheduling');
  addBulletPoint('Document expiry management with automated reminders');
  addBulletPoint('Electronic logbook capabilities');
  addBulletPoint('Audit trail for all data modifications');
  addBulletPoint('Data retention policy configuration');

  addSubHeader('5.3 Data Privacy');
  addParagraph('Complete control over your fleet data with self-hosted deployment.');
  addBulletPoint('On-premises deployment option for full data sovereignty');
  addBulletPoint('Configurable data retention periods');
  addBulletPoint('Data export capabilities for portability');
  addBulletPoint('User consent management tools');
  addBulletPoint('Personal data anonymization options');

  // ========== DEPLOYMENT ==========
  doc.addPage();
  yPos = margin;

  addHeader('6. Deployment & Infrastructure', 18);
  yPos += 5;

  addSubHeader('6.1 Self-Hosted Deployment');
  addParagraph('The system is designed for self-hosted deployment, giving you complete control over your infrastructure and data.');

  addBulletPoint('Deploy on your own servers or private cloud infrastructure');
  addBulletPoint('Full control over security configurations and network policies');
  addBulletPoint('No third-party data access or dependencies');
  addBulletPoint('Customizable backup and disaster recovery procedures');
  addBulletPoint('Integration with existing enterprise systems');

  addSubHeader('6.2 Infrastructure Requirements');
  addParagraph('Recommended specifications for production deployment:');

  const infraRequirements = [
    ['Component', 'Minimum', 'Recommended'],
    ['Application Server', '4 CPU, 8GB RAM', '8 CPU, 16GB RAM'],
    ['Database Server', '4 CPU, 16GB RAM', '8 CPU, 32GB RAM'],
    ['Storage', '100GB SSD', '500GB SSD'],
    ['Network', '100 Mbps', '1 Gbps'],
  ];

  const colWidth3 = contentWidth / 3;
  const rowHeight = 8;
  
  // Table Header
  doc.setFillColor(30, 64, 175);
  doc.rect(margin, yPos - 5, contentWidth, rowHeight, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  infraRequirements[0].forEach((header, i) => {
    doc.text(header, margin + (i * colWidth3) + 3, yPos);
  });
  yPos += rowHeight;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  infraRequirements.slice(1).forEach((row, rowIndex) => {
    if (rowIndex % 2 === 0) {
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, yPos - 5, contentWidth, rowHeight, 'F');
    }
    row.forEach((cell, i) => {
      doc.text(cell, margin + (i * colWidth3) + 3, yPos);
    });
    yPos += rowHeight;
  });
  yPos += 15;

  addSubHeader('6.3 Integration Capabilities');
  addParagraph('The system provides multiple integration options:');
  addBulletPoint('RESTful API for custom integrations');
  addBulletPoint('Webhook support for real-time event notifications');
  addBulletPoint('ERP system integration (ERPNext, SAP, etc.)');
  addBulletPoint('Fuel card provider integrations');
  addBulletPoint('SMS gateway integration for notifications');
  addBulletPoint('Single Sign-On (SSO) support');

  // ========== IMPLEMENTATION TIMELINE ==========
  doc.addPage();
  yPos = margin;

  addHeader('7. Implementation Timeline', 18);
  yPos += 5;

  addParagraph('A structured implementation approach ensures successful deployment and adoption.');

  addSubHeader('Phase 1: Foundation (Weeks 1-2)');
  addBulletPoint('Infrastructure setup and configuration');
  addBulletPoint('Database initialization and security hardening');
  addBulletPoint('User account creation and role assignment');
  addBulletPoint('Initial system configuration and branding');

  addSubHeader('Phase 2: Data Migration (Weeks 3-4)');
  addBulletPoint('Vehicle data import and verification');
  addBulletPoint('Driver profile creation and documentation');
  addBulletPoint('Historical data migration (if applicable)');
  addBulletPoint('Geofence and zone configuration');

  addSubHeader('Phase 3: Device Integration (Weeks 5-6)');
  addBulletPoint('GPS tracker device provisioning');
  addBulletPoint('Fuel sensor installation and calibration');
  addBulletPoint('Driver identification system setup');
  addBulletPoint('Device communication testing and validation');

  addSubHeader('Phase 4: Training & Go-Live (Weeks 7-8)');
  addBulletPoint('Administrator training sessions');
  addBulletPoint('Dispatcher and operator training');
  addBulletPoint('Driver mobile app orientation');
  addBulletPoint('Go-live support and monitoring');

  addSubHeader('Phase 5: Optimization (Ongoing)');
  addBulletPoint('Performance monitoring and tuning');
  addBulletPoint('Report customization and automation');
  addBulletPoint('Alert rule refinement');
  addBulletPoint('Continuous improvement recommendations');

  // ========== SUPPORT & MAINTENANCE ==========
  doc.addPage();
  yPos = margin;

  addHeader('8. Support & Maintenance', 18);
  yPos += 5;

  addSubHeader('8.1 Support Services');
  addParagraph('Comprehensive support options to ensure system reliability and user satisfaction.');

  addBulletPoint('Technical documentation and knowledge base');
  addBulletPoint('Email and ticket-based support');
  addBulletPoint('Remote troubleshooting and diagnostics');
  addBulletPoint('System health monitoring and alerts');
  addBulletPoint('Quarterly business reviews and optimization recommendations');

  addSubHeader('8.2 Maintenance Services');
  addParagraph('Regular maintenance activities to keep your system running optimally.');

  addBulletPoint('Software updates and security patches');
  addBulletPoint('Database optimization and cleanup');
  addBulletPoint('Performance monitoring and tuning');
  addBulletPoint('Backup verification and disaster recovery testing');
  addBulletPoint('Capacity planning and scaling recommendations');

  addSubHeader('8.3 Training Services');
  addParagraph('Ongoing training programs to maximize user adoption and system utilization.');

  addBulletPoint('New user onboarding sessions');
  addBulletPoint('Advanced feature training workshops');
  addBulletPoint('Administrator certification programs');
  addBulletPoint('Custom training for specific workflows');
  addBulletPoint('Training materials and video tutorials');

  // ========== INVESTMENT SUMMARY ==========
  doc.addPage();
  yPos = margin;

  addHeader('9. Investment Summary', 18);
  yPos += 5;

  addParagraph('The Fleet Management System represents a strategic investment in operational excellence. Pricing is customized based on fleet size, required features, and deployment preferences.');

  addSubHeader('Pricing Components');

  addBulletPoint('One-time Setup Fee - Implementation, configuration, and training');
  addBulletPoint('Per-Vehicle License - Monthly or annual subscription per tracked vehicle');
  addBulletPoint('Support Plan - Tiered support options based on response time requirements');
  addBulletPoint('Professional Services - Custom development, integrations, and consulting');

  addSubHeader('Return on Investment');
  addParagraph('Organizations typically realize significant returns through:');

  addBulletPoint('Fuel savings: 15-25% reduction through consumption optimization and theft prevention');
  addBulletPoint('Maintenance savings: 30-40% reduction in unplanned repairs through predictive maintenance');
  addBulletPoint('Labor efficiency: 20-30% improvement in dispatcher productivity');
  addBulletPoint('Insurance savings: 10-20% premium reductions through improved safety records');
  addBulletPoint('Compliance savings: Reduced fines and penalties through automated compliance tracking');
  addBulletPoint('Asset utilization: 15-25% improvement in vehicle utilization rates');

  addSubHeader('Total Cost of Ownership');
  addParagraph('Self-hosted deployment provides long-term cost advantages including:');

  addBulletPoint('Predictable licensing costs without usage-based surprises');
  addBulletPoint('No data egress fees or API call charges');
  addBulletPoint('Leverage existing infrastructure investments');
  addBulletPoint('Reduced vendor dependency and lock-in risks');

  // ========== NEXT STEPS ==========
  doc.addPage();
  yPos = margin;

  addHeader('10. Next Steps', 18);
  yPos += 5;

  addParagraph('We recommend the following steps to move forward with implementing the Fleet Management System:');

  addSubHeader('Step 1: Discovery Session');
  addParagraph('Schedule a detailed discovery session to understand your specific requirements, current pain points, and success criteria. This helps us tailor the solution to your unique needs.');

  addSubHeader('Step 2: Technical Assessment');
  addParagraph('Our team will assess your existing infrastructure, integration requirements, and any technical constraints to ensure a smooth deployment.');

  addSubHeader('Step 3: Pilot Program');
  addParagraph('We recommend starting with a pilot deployment covering a subset of your fleet. This allows you to validate the solution and build internal expertise before full-scale rollout.');

  addSubHeader('Step 4: Custom Proposal');
  addParagraph('Based on the discovery and assessment phases, we will prepare a detailed proposal with specific pricing, timelines, and deliverables tailored to your organization.');

  addSubHeader('Step 5: Implementation');
  addParagraph('Upon agreement, we begin the structured implementation process with dedicated project management and regular progress updates.');

  yPos += 20;

  // Contact Section
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, yPos - 5, contentWidth, 40, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Ready to Get Started?', margin + 10, yPos + 5);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text('Contact us to schedule a discovery session and learn how the Fleet Management', margin + 10, yPos + 18);
  doc.text('System can transform your fleet operations.', margin + 10, yPos + 26);

  // Footer on all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('Confidential - Fleet Management System Proposal', margin, pageHeight - 10);
  }

  // Save the PDF
  const filename = `Fleet_Management_System_Proposal_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  
  return filename;
};
