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

  const addSubSubHeader = (text: string) => {
    addNewPageIfNeeded(12);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 85, 99);
    doc.text(text, margin + 5, yPos);
    yPos += 7;
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

  const addNumberedPoint = (number: string, text: string, indent: number = 5) => {
    addNewPageIfNeeded(8);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(number, margin + indent, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    const lines = doc.splitTextToSize(text, contentWidth - indent - 15);
    lines.forEach((line: string, index: number) => {
      if (index > 0) addNewPageIfNeeded(8);
      doc.text(line, margin + indent + 12, yPos);
      if (index < lines.length - 1) yPos += 6;
    });
    yPos += 7;
  };

  const addTable = (headers: string[], rows: string[][]) => {
    const colWidth = contentWidth / headers.length;
    const rowHeight = 8;
    
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

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    rows.forEach((row, rowIndex) => {
      if (rowIndex % 2 === 0) {
        doc.setFillColor(243, 244, 246);
        doc.rect(margin, yPos - 5, contentWidth, rowHeight, 'F');
      }
      row.forEach((cell, i) => {
        doc.text(cell.substring(0, 30), margin + (i * colWidth) + 3, yPos);
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
    '2. System Architecture & Overview',
    '3. Real-Time Tracking & Mapping',
    '4. Vehicle Management Module',
    '5. Driver Management & Safety',
    '6. Fuel Management & Analytics',
    '7. Geofencing & Zone Control',
    '8. Alerts & Notification System',
    '9. Reporting & Business Intelligence',
    '10. Dispatch & Job Management',
    '11. Device & Hardware Integration',
    '12. Security & Compliance',
    '13. Deployment & Infrastructure',
    '14. Support & Maintenance',
    '15. Investment Summary'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  tocItems.forEach(item => {
    doc.text(item, margin + 10, yPos);
    yPos += 7;
  });

  // ========== EXECUTIVE SUMMARY ==========
  doc.addPage();
  yPos = margin;

  addHeader('1. Executive Summary', 18);
  yPos += 5;

  addParagraph('This proposal presents a comprehensive, enterprise-grade Fleet Management System engineered to deliver complete operational visibility, cost optimization, and safety enhancement for vehicle fleet operations of any scale. The platform integrates real-time GPS tracking, advanced analytics, driver behavior monitoring, fuel management, predictive maintenance, and regulatory compliance into a unified solution.');

  addParagraph('Our system addresses the critical challenges faced by fleet operators: rising fuel costs, driver safety concerns, vehicle utilization inefficiencies, maintenance unpredictability, and compliance burdens. Through intelligent automation, real-time monitoring, and data-driven insights, organizations can transform their fleet operations from reactive cost centers into strategic competitive advantages.');

  addSubHeader('Business Challenges Addressed');
  addBulletPoint('Lack of real-time visibility into vehicle locations, status, and driver activities preventing timely operational decisions');
  addBulletPoint('Fuel costs representing 30-40% of operating expenses with limited ability to detect theft, inefficiency, or unauthorized usage');
  addBulletPoint('Reactive maintenance practices leading to unexpected breakdowns, costly emergency repairs, and vehicle downtime');
  addBulletPoint('Driver behavior issues including speeding, harsh driving, and unauthorized vehicle use increasing accident risk and costs');
  addBulletPoint('Manual compliance processes consuming administrative resources and exposing organizations to regulatory penalties');
  addBulletPoint('Disconnected systems requiring manual data reconciliation and preventing holistic operational analysis');

  addSubHeader('Solution Value Proposition');
  addBulletPoint('Unified platform consolidating all fleet operations data into a single source of truth with real-time dashboards');
  addBulletPoint('Automated monitoring and alerting enabling proactive response to events before they become costly problems');
  addBulletPoint('Advanced analytics transforming raw data into actionable insights for continuous operational improvement');
  addBulletPoint('Self-hosted deployment ensuring complete data sovereignty, security control, and regulatory compliance');
  addBulletPoint('Scalable architecture supporting growth from small fleets to enterprise-scale operations without platform changes');

  addSubHeader('Expected Business Outcomes');
  addBulletPoint('15-25% reduction in fuel costs through consumption optimization, theft detection, and driver behavior improvement');
  addBulletPoint('30-40% decrease in unplanned maintenance costs through predictive analytics and proactive scheduling');
  addBulletPoint('20-35% improvement in fleet utilization rates through better dispatching and vehicle allocation');
  addBulletPoint('40-60% reduction in administrative time through automated reporting and compliance management');
  addBulletPoint('10-20% reduction in insurance premiums through documented safety improvements and reduced incidents');

  // ========== SYSTEM ARCHITECTURE ==========
  doc.addPage();
  yPos = margin;

  addHeader('2. System Architecture & Overview', 18);
  yPos += 5;

  addParagraph('The Fleet Management System is built on a modern, scalable architecture designed for reliability, performance, and extensibility. The platform supports multi-tenant deployments with complete data isolation, role-based access control, and enterprise-grade security throughout all layers.');

  addSubHeader('2.1 Platform Components');

  addSubSubHeader('Web Management Console');
  addParagraph('The primary interface for fleet managers, dispatchers, and administrators. Features a responsive design optimized for desktop workstations with real-time data updates, interactive mapping, and comprehensive administrative capabilities. The console provides role-specific dashboards ensuring each user sees relevant information and functions based on their responsibilities.');

  addSubSubHeader('Mobile Applications');
  addParagraph('Native mobile applications for iOS and Android devices serving two distinct user groups. The Driver App provides trip management, pre-trip inspections, wellness checks, document access, and navigation assistance. The Field Technician App supports device installation, diagnostics, and maintenance task management. Both apps function offline with automatic synchronization when connectivity is restored.');

  addSubSubHeader('Device Gateway');
  addParagraph('A high-performance gateway service handling communication with GPS tracking devices. Supports multiple device protocols including GT06, TK103, H02, Teltonika, Queclink, Ruptela, Meitrack, and others. The gateway translates diverse device protocols into standardized data formats, handles device authentication, and manages bidirectional command transmission for remote device configuration.');

  addSubSubHeader('Analytics Engine');
  addParagraph('A dedicated processing layer for real-time and historical data analysis. Performs continuous calculations for driver scores, fuel efficiency metrics, utilization rates, and predictive maintenance indicators. Generates trend analysis, anomaly detection, and pattern recognition to surface actionable insights from fleet data.');

  addSubSubHeader('Notification Service');
  addParagraph('Multi-channel alert delivery system supporting SMS, email, push notifications, and in-app messaging. Manages alert routing, escalation workflows, delivery confirmation, and quiet hours. Integrates with external communication platforms and supports customizable notification templates.');

  addSubHeader('2.2 Data Architecture');
  addBulletPoint('Real-time telemetry ingestion processing thousands of location updates per minute with sub-second latency');
  addBulletPoint('Time-series data storage optimized for historical queries and trend analysis across extended periods');
  addBulletPoint('Transactional database for operational data with ACID compliance and referential integrity');
  addBulletPoint('Document storage for files, images, and unstructured data with metadata indexing');
  addBulletPoint('Caching layer for frequently accessed data reducing database load and improving response times');

  addSubHeader('2.3 Integration Capabilities');
  addBulletPoint('RESTful API with comprehensive documentation enabling custom integrations and third-party system connections');
  addBulletPoint('Webhook support for real-time event notifications to external systems');
  addBulletPoint('ERP integration adapters for ERPNext, SAP, and other enterprise systems');
  addBulletPoint('Fuel card provider integrations for automated transaction reconciliation');
  addBulletPoint('Single Sign-On (SSO) support via SAML 2.0 and OAuth 2.0 protocols');

  // ========== REAL-TIME TRACKING ==========
  doc.addPage();
  yPos = margin;

  addHeader('3. Real-Time Tracking & Mapping', 18);
  yPos += 5;

  addParagraph('The tracking module provides comprehensive real-time visibility into all fleet assets through an interactive mapping interface. Leveraging advanced GPS technology and intelligent data processing, the system delivers accurate, timely location information while minimizing communication costs and device power consumption.');

  addSubHeader('3.1 Live Fleet Map');
  addSubSubHeader('Interactive Map Interface');
  addParagraph('A full-featured mapping interface displaying all vehicles with real-time position updates. The map supports multiple base layers including street maps, satellite imagery, and terrain views. Vehicle icons display current status (moving, stopped, idle, offline) with color coding and directional indicators showing heading. The interface supports smooth pan and zoom with vehicle clustering for large fleets to maintain performance and readability.');

  addSubSubHeader('Vehicle Information Display');
  addParagraph('Clicking any vehicle reveals detailed real-time information including current speed, heading, address, engine status, fuel level, and driver identification. Quick action buttons allow immediate access to route playback, alert history, and contact options. The panel updates continuously without page refresh, ensuring information remains current.');

  addSubSubHeader('Follow Mode');
  addParagraph('An optional tracking mode that automatically centers the map on a selected vehicle as it moves. Useful for monitoring active deliveries, emergency response, or high-value asset movements. The mode includes configurable zoom levels and automatic disengagement when manual map interaction is detected.');

  addSubHeader('3.2 Route Playback & History');
  addSubSubHeader('Historical Route Visualization');
  addParagraph('Reconstruct and visualize any vehicle route for any past date. Routes are displayed with road-matched paths for accuracy, with color coding indicating speed variations along the journey. The timeline control allows precise navigation to any point in the trip with synchronized map position and telemetry display.');

  addSubSubHeader('Stop & Event Analysis');
  addParagraph('Automatic detection and marking of all stops along routes with duration calculations. Events such as speeding, harsh braking, geofence entry/exit, and alerts are marked on the route with detailed popup information. This enables comprehensive trip analysis for investigating incidents, verifying activities, or optimizing routes.');

  addSubSubHeader('Trip Comparison');
  addParagraph('Compare multiple trips on the same route to identify variations, inefficiencies, or inconsistencies. Useful for verifying route compliance, identifying unauthorized deviations, or analyzing different drivers on the same route.');

  addSubHeader('3.3 Location Services');
  addBulletPoint('Real-time geocoding converting coordinates to human-readable addresses for all location displays');
  addBulletPoint('Landmark detection identifying when vehicles are at known locations such as customer sites, depots, or fuel stations');
  addBulletPoint('Distance calculations for route lengths, point-to-point distances, and proximity searches');
  addBulletPoint('ETA calculations based on current location, destination, and historical traffic patterns');
  addBulletPoint('Nearby vehicle search finding all assets within a specified radius of any location');

  addSubHeader('3.4 Traffic & Road Analytics');
  addParagraph('Advanced analytics identifying traffic patterns, commonly used routes, and road segment performance. The system generates heatmaps showing vehicle concentration over time, identifies peak usage hours, and ranks the most frequently traveled road segments. This data supports route optimization, resource allocation, and infrastructure planning decisions.');

  // ========== VEHICLE MANAGEMENT ==========
  doc.addPage();
  yPos = margin;

  addHeader('4. Vehicle Management Module', 18);
  yPos += 5;

  addParagraph('The Vehicle Management module provides comprehensive lifecycle management for all fleet assets. From acquisition through disposition, every aspect of vehicle administration is tracked, documented, and analyzed within the platform.');

  addSubHeader('4.1 Vehicle Registry');
  addSubSubHeader('Complete Vehicle Profiles');
  addParagraph('Each vehicle has a detailed profile containing all relevant information: identification details (plate number, VIN, registration), specifications (make, model, year, engine type, fuel capacity, load capacity), current assignment (driver, department, cost center), and operational status. Profiles include photo documentation and support custom fields for organization-specific data requirements.');

  addSubSubHeader('Document Management');
  addParagraph('Centralized storage for all vehicle documents including registration certificates, insurance policies, inspection reports, and service records. The system tracks document expiration dates and generates automated alerts before renewal deadlines. Documents can be uploaded, viewed, and downloaded directly from the vehicle profile.');

  addSubSubHeader('Assignment History');
  addParagraph('Complete historical record of driver assignments, department transfers, and operational status changes. This audit trail supports accountability, enables utilization analysis, and provides context for investigating incidents or performance patterns.');

  addSubHeader('4.2 Maintenance Management');
  addSubSubHeader('Scheduled Maintenance');
  addParagraph('Define maintenance schedules based on time intervals (days, weeks, months), distance traveled (kilometers), or engine hours. The system automatically tracks actual usage and triggers maintenance alerts when service is due. Multiple maintenance types can be configured independently, such as oil changes every 5,000 km, tire rotations every 10,000 km, and annual inspections.');

  addSubSubHeader('Work Order Management');
  addParagraph('Create, assign, and track work orders for all maintenance and repair activities. Work orders include detailed descriptions, parts requirements, labor estimates, and priority levels. Technicians can update work order status through the mobile app, attach photos of completed work, and record actual time and parts used.');

  addSubSubHeader('Service History');
  addParagraph('Comprehensive service history for each vehicle including all maintenance activities, repairs, parts replacements, and associated costs. This historical data supports warranty claims, resale valuations, and pattern analysis to identify recurring issues or underperforming vehicles.');

  addSubSubHeader('Predictive Maintenance');
  addParagraph('Advanced analytics examine telemetry data, usage patterns, and historical service records to predict potential failures before they occur. The system identifies vehicles at elevated risk for specific issues based on age, mileage, operating conditions, and component life cycles, enabling proactive intervention.');

  addSubHeader('4.3 Utilization Analytics');
  addBulletPoint('Daily, weekly, and monthly utilization rates showing active hours versus total available hours');
  addBulletPoint('Distance traveled analysis comparing actual usage against expected or planned usage');
  addBulletPoint('Idle time tracking identifying vehicles spending excessive time running without movement');
  addBulletPoint('Assignment efficiency measuring how effectively vehicles are allocated across drivers and routes');
  addBulletPoint('Underutilization alerts identifying vehicles that may be candidates for reallocation or retirement');

  addSubHeader('4.4 Vehicle Inspections');
  addParagraph('Digital inspection checklists completed through the mobile app before and after trips. Inspections cover vehicle condition, safety equipment, fluid levels, tire condition, and any damage or defects. Failed inspection items automatically create maintenance tickets and can prevent trip dispatch until resolved. Inspection history provides accountability and supports regulatory compliance.');

  // ========== DRIVER MANAGEMENT ==========
  doc.addPage();
  yPos = margin;

  addHeader('5. Driver Management & Safety', 18);
  yPos += 5;

  addParagraph('The Driver Management module encompasses the complete driver lifecycle from onboarding through performance management. With safety as a core focus, the system provides tools for monitoring, coaching, and improving driver behavior while ensuring regulatory compliance.');

  addSubHeader('5.1 Driver Profiles');
  addSubSubHeader('Comprehensive Driver Records');
  addParagraph('Complete driver profiles including personal information, contact details, emergency contacts, employment history, and assigned vehicles. License information includes type, number, issue date, expiration date, and any restrictions or endorsements. Medical certification tracking ensures drivers maintain required health clearances for commercial operation.');

  addSubSubHeader('Document Management');
  addParagraph('Centralized storage for driver documents including license copies, medical certificates, training certifications, and signed policy acknowledgments. Automated expiration tracking with escalating alerts ensures timely renewals. Document verification workflows support compliance auditing.');

  addSubSubHeader('Verification & Compliance');
  addParagraph('A structured verification workflow validates driver credentials before assignment. National ID verification, license validation, and background check status are tracked with visual indicators. Unverified drivers can be restricted from vehicle assignment until compliance requirements are satisfied.');

  addSubHeader('5.2 Driver Behavior Monitoring');
  addSubSubHeader('Real-Time Event Detection');
  addParagraph('Continuous analysis of driving patterns detects safety-relevant events as they occur. Speeding events are captured with location, actual speed, and applicable speed limit. Harsh braking and acceleration events measure G-force impact. Excessive idling is tracked with duration and fuel consumption impact. Each event is timestamped, geocoded, and associated with the trip for context.');

  addSubSubHeader('Safety Scoring');
  addParagraph('A comprehensive safety score calculated from weighted behavior metrics provides an objective driver performance measure. The scoring algorithm considers speeding frequency and severity (35% weight), braking patterns (25%), acceleration habits (25%), and idle time (15%). Scores are calculated over rolling periods allowing trend analysis and improvement tracking.');

  addSubSubHeader('Risk Classification');
  addParagraph('Drivers are classified into risk categories based on safety scores and event patterns. High-risk drivers are flagged for immediate attention and coaching. The system identifies specific improvement areas for each driver, enabling targeted intervention rather than generic training.');

  addSubHeader('5.3 Driver Coaching & Training');
  addSubSubHeader('Coaching Notes');
  addParagraph('Managers can document coaching sessions directly in driver profiles. Notes include the coaching topic, specific events discussed, agreed improvement actions, and follow-up dates. This creates an auditable record of performance management activities.');

  addSubSubHeader('Acknowledgment Tracking');
  addParagraph('Safety-related communications and policy updates can require driver acknowledgment. The system tracks when drivers receive, view, and acknowledge important communications, ensuring awareness and creating a compliance record.');

  addSubSubHeader('Performance Trending');
  addParagraph('Historical score analysis shows driver improvement or decline over time. Trend visualization helps managers assess coaching effectiveness and identify drivers who may need additional support or recognition for improvement.');

  addSubHeader('5.4 Wellness & Fatigue Management');
  addSubSubHeader('Pre-Trip Wellness Checks');
  addParagraph('Drivers complete wellness assessments before starting shifts through the mobile app. Checks cover fatigue levels, hours of sleep, general health status, and sobriety confirmation. Responses are recorded with GPS coordinates and timestamps for verification.');

  addSubSubHeader('Fitness-to-Drive Determination');
  addParagraph('Based on wellness check responses, the system determines fitness to drive. Concerning responses can trigger supervisor review requirements before trip authorization. This protects both drivers and the organization from fatigue-related incidents.');

  addSubHeader('5.5 Penalty & Violation Management');
  addBulletPoint('Automated penalty point assignment for verified violations with configurable rules and thresholds');
  addBulletPoint('Progressive discipline tracking with warning counts, suspensions, and escalation history');
  addBulletPoint('Appeal workflow allowing drivers to contest violations with manager review and resolution tracking');
  addBulletPoint('Penalty summary dashboards showing organization-wide violation patterns and trends');

  // ========== FUEL MANAGEMENT ==========
  doc.addPage();
  yPos = margin;

  addHeader('6. Fuel Management & Analytics', 18);
  yPos += 5;

  addParagraph('Fuel typically represents 30-40% of fleet operating costs, making fuel management a critical focus area. This module provides comprehensive tools for monitoring fuel consumption, detecting anomalies, preventing theft, and optimizing efficiency across the fleet.');

  addSubHeader('6.1 Real-Time Fuel Monitoring');
  addSubSubHeader('Tank Level Tracking');
  addParagraph('Integration with fuel tank sensors provides real-time fuel level visibility for all equipped vehicles. The system displays current fuel levels as both volume and percentage, with configurable low-fuel alerts. Historical fuel level graphs show consumption patterns and identify unusual drainage that may indicate theft or leakage.');

  addSubSubHeader('Consumption Analysis');
  addParagraph('Automatic calculation of fuel consumption rates per vehicle, driver, route, and time period. The system tracks liters per 100 kilometers, comparing actual consumption against expected baselines. Vehicles or drivers with consumption significantly above baseline are flagged for investigation.');

  addSubSubHeader('Refueling Event Detection');
  addParagraph('Automatic detection of refueling events from fuel sensor data. Each event captures timestamp, location, fuel quantity added, and driver identification. Events are matched against authorized fuel station locations and fuel card transactions for verification.');

  addSubHeader('6.2 Fuel Theft Detection');
  addSubSubHeader('Drain Event Alerts');
  addParagraph('The system monitors for sudden fuel level decreases that exceed normal consumption rates. Potential theft events trigger immediate alerts with location information. Configurable thresholds allow sensitivity adjustment based on operating conditions and fuel sensor precision.');

  addSubSubHeader('Location Verification');
  addParagraph('Fuel drain events occurring outside approved fuel stations are flagged with higher priority. The system maintains a registry of approved fuel stations and depots, automatically validating that fuel activities occur at authorized locations.');

  addSubSubHeader('Consumption Anomaly Detection');
  addParagraph('Advanced analytics identify vehicles with consumption patterns deviating significantly from fleet averages or historical baselines. This detects gradual theft through siphoning, fuel card fraud, or mechanical issues causing fuel waste.');

  addSubHeader('6.3 Fuel Depot Management');
  addSubSubHeader('Depot Inventory Tracking');
  addParagraph('For organizations with private fuel depots, the system tracks fuel inventory levels, deliveries, and dispensing. Stock reconciliation compares physical inventory against recorded transactions to identify discrepancies.');

  addSubSubHeader('Dispensing Control');
  addParagraph('Record all fuel dispensing events with vehicle identification, driver authorization, quantity dispensed, and odometer reading. Integration with pump automation systems enables controlled dispensing with pre-authorization requirements.');

  addSubSubHeader('Approved Station Network');
  addParagraph('Maintain a registry of approved external fuel stations with geofence boundaries. The system validates refueling events against this network, alerting when fuel purchases occur at non-approved locations.');

  addSubHeader('6.4 Fuel Analytics & Reporting');
  addBulletPoint('Fleet-wide consumption summaries with breakdown by vehicle type, department, and time period');
  addBulletPoint('Driver fuel efficiency rankings identifying top performers and improvement opportunities');
  addBulletPoint('Cost tracking integrating fuel prices and calculating total fuel expenditure');
  addBulletPoint('Trend analysis showing consumption patterns over time with seasonal adjustments');
  addBulletPoint('Idle time fuel waste calculations quantifying the cost of unnecessary engine running');

  // ========== GEOFENCING ==========
  doc.addPage();
  yPos = margin;

  addHeader('7. Geofencing & Zone Control', 18);
  yPos += 5;

  addParagraph('Geofencing capabilities enable automated monitoring and enforcement of location-based policies. By defining virtual boundaries around physical locations, the system can trigger alerts, record events, and enforce rules when vehicles enter, exit, or remain within specified areas.');

  addSubHeader('7.1 Geofence Creation & Management');
  addSubSubHeader('Drawing Tools');
  addParagraph('An intuitive map-based interface allows creation of geofences using polygon or circle shapes. Polygon mode enables precise boundary definition around irregular areas such as customer sites, delivery zones, or restricted areas. Circle mode quickly creates geofences around point locations with configurable radius.');

  addSubSubHeader('Zone Categories');
  addParagraph('Organize geofences into logical categories such as customer locations, depots, service areas, restricted zones, or speed limit areas. Categories determine default alert behaviors and enable filtered reporting and analysis.');

  addSubSubHeader('Geofence Properties');
  addParagraph('Each geofence can be configured with specific behaviors including entry alerts, exit alerts, speed limits within the zone, dwell time thresholds, and operational hours. Properties can be customized per geofence to match specific requirements for each location.');

  addSubHeader('7.2 Alert & Event Types');
  addSubSubHeader('Entry & Exit Alerts');
  addParagraph('Automatic notifications when vehicles enter or exit defined geofences. Alerts include vehicle identification, driver, timestamp, and location. Useful for confirming arrivals, monitoring departures, and tracking delivery progress.');

  addSubSubHeader('Dwell Time Monitoring');
  addParagraph('Track how long vehicles remain within geofences. Configure minimum dwell time alerts to detect quick visits that may not allow completion of expected activities. Maximum dwell time alerts identify vehicles that may be delayed or experiencing issues.');

  addSubSubHeader('Speed Zone Enforcement');
  addParagraph('Define speed limits for specific geofences independent of road speed limits. Vehicles exceeding zone speed limits trigger alerts and events. Useful for enforcing safety speeds in facilities, residential areas, or construction zones.');

  addSubSubHeader('After-Hours Alerts');
  addParagraph('Configure geofences with operational hours to detect unauthorized vehicle movements. Vehicles entering or moving within restricted zones outside permitted hours trigger security alerts.');

  addSubHeader('7.3 Common Geofence Use Cases');
  addBulletPoint('Customer Sites: Track arrivals, departures, and service time at customer locations for billing and service verification');
  addBulletPoint('Depots & Facilities: Monitor vehicle check-in/check-out and ensure proper overnight parking');
  addBulletPoint('Fuel Stations: Validate refueling locations against approved station network');
  addBulletPoint('Restricted Zones: Enforce no-go areas and receive alerts for unauthorized entries');
  addBulletPoint('Speed Zones: Apply reduced speed limits in sensitive areas regardless of road limits');
  addBulletPoint('City/Region Boundaries: Track vehicle movements between operational territories');

  addSubHeader('7.4 Geofence Analytics');
  addParagraph('Comprehensive reporting on geofence activity including visit frequency, average dwell times, busiest periods, and violation patterns. This data supports operational optimization, resource planning, and compliance verification.');

  // ========== ALERTS & NOTIFICATIONS ==========
  doc.addPage();
  yPos = margin;

  addHeader('8. Alerts & Notification System', 18);
  yPos += 5;

  addParagraph('The alert system serves as the operational nervous system, ensuring relevant personnel are informed of important events in real-time. Configurable rules, multiple delivery channels, and workflow management ensure alerts drive action rather than noise.');

  addSubHeader('8.1 Alert Categories');

  addSubSubHeader('Safety Alerts');
  addParagraph('Events impacting driver or public safety including speeding violations, harsh driving events, accident detection, panic button activation, and speed governor bypasses. These alerts carry highest priority with immediate delivery and escalation.');

  addSubSubHeader('Security Alerts');
  addParagraph('Events indicating potential theft or unauthorized activity including fuel drain detection, after-hours movement, geofence violations, device tampering, and GPS jamming detection. Security alerts trigger immediate notification to designated security personnel.');

  addSubSubHeader('Maintenance Alerts');
  addParagraph('Proactive notifications for scheduled maintenance due dates, engine diagnostic trouble codes, battery voltage issues, and sensor warnings. These alerts enable preventive action before issues cause breakdowns or safety hazards.');

  addSubSubHeader('Compliance Alerts');
  addParagraph('Document expiration warnings for licenses, registrations, insurance, and certifications. Hours of service violations and inspection failures also generate compliance alerts. Escalating reminders ensure timely action.');

  addSubSubHeader('Operational Alerts');
  addParagraph('Day-to-day operational events including geofence arrivals/departures, trip completions, extended idle time, and device offline notifications. These support real-time operational awareness and dispatching.');

  addSubHeader('8.2 Alert Configuration');
  addSubSubHeader('Rule-Based Triggers');
  addParagraph('Define precise conditions that trigger alerts using combinations of event types, thresholds, vehicle groups, time windows, and geofence associations. For example: alert when any truck exceeds 90 km/h outside highways during business hours.');

  addSubSubHeader('Severity Levels');
  addParagraph('Classify alerts as informational, warning, or critical. Severity determines display priority, notification urgency, and escalation behavior. Critical alerts can trigger immediate phone calls while informational alerts may only appear in dashboards.');

  addSubSubHeader('Recipient Management');
  addParagraph('Assign alert recipients based on roles, vehicle groups, or specific individuals. Different alert types can route to different personnel ensuring relevant parties are notified without overwhelming others with irrelevant notifications.');

  addSubHeader('8.3 Delivery Channels');
  addBulletPoint('SMS Text Messages: Immediate delivery for urgent alerts, especially useful when recipients may not have data connectivity');
  addBulletPoint('Email Notifications: Detailed alerts with supporting information, suitable for non-urgent items and documentation');
  addBulletPoint('Push Notifications: Real-time delivery to mobile app users with quick action capabilities');
  addBulletPoint('In-App Alerts: Dashboard notifications with full context and history, supporting workflow management');
  addBulletPoint('Webhook Delivery: Integration with external systems for automated processing and custom workflows');

  addSubHeader('8.4 Alert Workflow');
  addBulletPoint('Acknowledgment tracking ensuring alerts are seen and addressed by responsible parties');
  addBulletPoint('Escalation rules automatically notifying supervisors when alerts remain unacknowledged');
  addBulletPoint('Resolution tracking recording how alerts were addressed with notes and outcomes');
  addBulletPoint('Alert history providing audit trail for incident investigation and pattern analysis');

  // ========== REPORTING ==========
  doc.addPage();
  yPos = margin;

  addHeader('9. Reporting & Business Intelligence', 18);
  yPos += 5;

  addParagraph('The reporting module transforms operational data into actionable business intelligence. From standard operational reports to custom analytics, the system provides the insights needed for data-driven decision making at all organizational levels.');

  addSubHeader('9.1 Standard Report Library');

  addSubSubHeader('Vehicle Reports');
  addBulletPoint('Vehicle Summary: Fleet-wide overview of status, utilization, and key metrics');
  addBulletPoint('Trip History: Detailed trip logs with routes, distances, durations, and driver assignments');
  addBulletPoint('Utilization Analysis: Usage patterns, idle time, and availability metrics');
  addBulletPoint('Maintenance History: Service records, costs, and upcoming maintenance schedules');
  addBulletPoint('Document Status: Expiration tracking for registrations, insurance, and inspections');

  addSubSubHeader('Driver Reports');
  addBulletPoint('Driver Scorecard: Safety scores, behavior events, and performance trending');
  addBulletPoint('Trip Assignment: Driver trip logs with vehicle usage and productivity metrics');
  addBulletPoint('Violation Summary: Speeding, geofence, and policy violation tracking');
  addBulletPoint('License Compliance: Certification status and expiration tracking');
  addBulletPoint('Coaching History: Documentation of performance discussions and improvement tracking');

  addSubSubHeader('Fuel Reports');
  addBulletPoint('Consumption Summary: Fleet and vehicle-level fuel usage analysis');
  addBulletPoint('Efficiency Ranking: Comparative fuel efficiency across vehicles and drivers');
  addBulletPoint('Refueling Log: Detailed record of all fuel transactions with validation status');
  addBulletPoint('Cost Analysis: Fuel expenditure tracking with trend analysis');
  addBulletPoint('Anomaly Report: Flagged events requiring investigation');

  addSubSubHeader('Operations Reports');
  addBulletPoint('Geofence Activity: Visit logs, dwell times, and zone violation summaries');
  addBulletPoint('Alert Summary: Alert volumes, response times, and resolution rates');
  addBulletPoint('Dispatch Performance: Job completion rates, on-time delivery, and SLA compliance');

  addSubHeader('9.2 Executive Dashboards');
  addParagraph('Role-specific dashboards presenting key performance indicators relevant to each user level. Executive dashboards summarize fleet health, cost metrics, and safety status. Operations dashboards focus on real-time activity and immediate action items. Analyst views provide detailed data exploration and trend analysis tools.');

  addSubHeader('9.3 Custom Reporting');
  addBulletPoint('Report builder with drag-and-drop field selection and filtering options');
  addBulletPoint('Saved report templates for frequently used custom reports');
  addBulletPoint('Scheduled generation with automatic email delivery to stakeholders');
  addBulletPoint('Export formats including PDF, Excel, and CSV for external analysis');

  addSubHeader('9.4 Analytics Capabilities');
  addBulletPoint('Trend analysis showing metric changes over configurable time periods');
  addBulletPoint('Comparative analysis between vehicle groups, drivers, or time periods');
  addBulletPoint('Anomaly detection highlighting unusual patterns or outliers');
  addBulletPoint('Forecasting projecting future metrics based on historical patterns');

  // ========== DISPATCH ==========
  doc.addPage();
  yPos = margin;

  addHeader('10. Dispatch & Job Management', 18);
  yPos += 5;

  addParagraph('The Dispatch module streamlines job assignment, tracking, and completion processes. From initial job creation through proof of delivery capture, every step is documented and tracked for operational visibility and customer service excellence.');

  addSubHeader('10.1 Job Management');
  addSubSubHeader('Job Creation');
  addParagraph('Create dispatch jobs with comprehensive details including pickup and delivery locations, scheduled times, cargo information, customer details, and special instructions. Jobs can be created manually, imported in bulk, or generated through API integrations with order management systems.');

  addSubSubHeader('Assignment & Scheduling');
  addParagraph('Assign jobs to drivers based on vehicle proximity, capacity, schedule availability, and route optimization. The system suggests optimal assignments considering current vehicle locations and existing commitments. Bulk assignment tools support high-volume dispatch operations.');

  addSubSubHeader('Priority & SLA Management');
  addParagraph('Classify jobs by priority level with associated service level agreements. The system tracks SLA deadlines and alerts dispatchers when jobs are at risk of missing targets. SLA compliance reporting supports continuous improvement.');

  addSubHeader('10.2 Real-Time Tracking');
  addSubSubHeader('Job Status Monitoring');
  addParagraph('Live visibility into all job statuses from pending through completion. Map views show job locations with vehicle positions, enabling real-time progress monitoring. Status updates are captured automatically from geofence events and manually by drivers.');

  addSubSubHeader('ETA Calculations');
  addParagraph('Continuous ETA updates based on current vehicle position, traffic conditions, and remaining stops. Customer communication can include real-time tracking links for delivery visibility.');

  addSubSubHeader('Exception Handling');
  addParagraph('Rapid identification and management of delayed, failed, or problematic jobs. Dispatch tools support job reassignment, schedule adjustments, and customer notification when issues arise.');

  addSubHeader('10.3 Proof of Delivery');
  addSubSubHeader('Electronic Signature Capture');
  addParagraph('Drivers capture recipient signatures on mobile devices as proof of delivery acceptance. Signatures are timestamped, geocoded, and permanently attached to job records.');

  addSubSubHeader('Photo Documentation');
  addParagraph('Capture photos of delivered goods, delivery locations, or any issues encountered. Photos are automatically associated with job records and available for customer service and dispute resolution.');

  addSubSubHeader('Delivery Notes');
  addParagraph('Free-form notes capturing special circumstances, recipient instructions, or issues encountered during delivery. Notes become part of the permanent job record.');

  addSubHeader('10.4 Analytics & Optimization');
  addBulletPoint('On-time delivery rates tracking and trend analysis');
  addBulletPoint('Driver productivity metrics including jobs completed and distance traveled');
  addBulletPoint('Route efficiency analysis comparing planned versus actual routes');
  addBulletPoint('Customer location analytics identifying visit patterns and service times');

  // ========== DEVICE INTEGRATION ==========
  doc.addPage();
  yPos = margin;

  addHeader('11. Device & Hardware Integration', 18);
  yPos += 5;

  addParagraph('The system supports a wide range of GPS tracking devices and sensors through a flexible integration architecture. The Device Gateway handles protocol translation, device authentication, and command management for seamless hardware integration.');

  addSubHeader('11.1 Supported Device Protocols');
  addParagraph('The Device Gateway supports industry-standard GPS tracker protocols enabling integration with devices from major manufacturers:');

  addBulletPoint('GT06 Protocol: Widely used by Concox, Coban, and compatible devices');
  addBulletPoint('TK103/GPS103 Protocol: Popular budget tracker protocol with broad device support');
  addBulletPoint('H02 Protocol: Used by Sinotrack and similar manufacturers');
  addBulletPoint('Teltonika Protocol: Enterprise-grade devices with extensive sensor support');
  addBulletPoint('Queclink Protocol: Commercial fleet tracking devices');
  addBulletPoint('Ruptela Protocol: European commercial vehicle trackers');
  addBulletPoint('Meitrack Protocol: Advanced devices with camera and sensor integration');
  addBulletPoint('Custom Protocol Support: Extensible architecture for specialized devices');

  addSubHeader('11.2 Device Management');
  addSubSubHeader('Device Registry');
  addParagraph('Complete inventory of all tracking devices including IMEI numbers, SIM card details, installation dates, and vehicle assignments. Device profiles track firmware versions, configuration status, and communication history.');

  addSubSubHeader('Remote Configuration');
  addParagraph('Send configuration commands to devices remotely including position reporting intervals, power management settings, and alert thresholds. Command queuing ensures delivery when devices reconnect after periods of poor connectivity.');

  addSubSubHeader('Diagnostics & Monitoring');
  addParagraph('Monitor device health including battery voltage, signal strength, GPS accuracy, and communication patterns. Offline device detection triggers alerts for timely investigation and resolution.');

  addSubHeader('11.3 Sensor Integration');
  addBulletPoint('Fuel Tank Sensors: Analog and digital fuel level monitoring with calibration support');
  addBulletPoint('Temperature Sensors: Cargo temperature monitoring for cold chain logistics');
  addBulletPoint('Door Sensors: Cargo compartment access detection');
  addBulletPoint('Driver ID Readers: RFID, iButton, and Bluetooth driver identification');
  addBulletPoint('OBD-II Integration: Vehicle diagnostic data and engine parameters');
  addBulletPoint('Camera Integration: Event-triggered and continuous video recording');

  addSubHeader('11.4 External API Integration');
  addParagraph('A RESTful External API enables third-party systems to submit telemetry data directly. This supports integration with existing fleet systems, OEM telematics platforms, or custom tracking solutions. The API accepts standardized JSON payloads and performs the same enrichment processing as device-originated data.');

  // ========== SECURITY & COMPLIANCE ==========
  doc.addPage();
  yPos = margin;

  addHeader('12. Security & Compliance', 18);
  yPos += 5;

  addParagraph('Enterprise-grade security measures protect fleet data throughout the platform. From user authentication to data encryption, every layer implements security best practices while supporting regulatory compliance requirements.');

  addSubHeader('12.1 Access Control');
  addSubSubHeader('User Authentication');
  addParagraph('Secure user authentication with password complexity requirements, optional multi-factor authentication (MFA), and session management. Password history prevents reuse, and account lockout protects against brute force attempts.');

  addSubSubHeader('Role-Based Permissions');
  addParagraph('Granular permission system controlling access to features, data, and functions based on user roles. Standard roles include Administrator, Fleet Manager, Dispatcher, Driver, and Technician. Custom roles can be defined for organization-specific requirements.');

  addSubSubHeader('Organization Data Isolation');
  addParagraph('Multi-tenant architecture ensures complete data isolation between organizations. Database-level row security enforces boundaries even against SQL injection or application vulnerabilities.');

  addSubHeader('12.2 Data Security');
  addSubSubHeader('Encryption');
  addParagraph('All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. Database connections, API communications, and file storage all implement encryption by default.');

  addSubSubHeader('Audit Logging');
  addParagraph('Comprehensive logging of all user actions, system events, and data modifications. Audit logs capture who did what, when, and from where. Logs are tamper-protected and retained according to configurable policies.');

  addSubSubHeader('API Security');
  addParagraph('API access requires authentication via API keys or OAuth tokens. Rate limiting prevents abuse. IP whitelisting provides additional access control for high-security environments.');

  addSubHeader('12.3 Compliance Support');
  addBulletPoint('Document expiration tracking and renewal reminders for regulatory compliance');
  addBulletPoint('Hours of service tracking for driver labor compliance');
  addBulletPoint('Vehicle inspection documentation meeting regulatory requirements');
  addBulletPoint('Data retention policies supporting legal and regulatory requirements');
  addBulletPoint('Export capabilities for audit responses and legal discovery');
  addBulletPoint('Audit trail for all data modifications supporting accountability');

  addSubHeader('12.4 Security Monitoring');
  addBulletPoint('Threat detection identifying suspicious access patterns and potential attacks');
  addBulletPoint('Anomaly detection flagging unusual system behavior for investigation');
  addBulletPoint('Security event alerting for immediate response to potential breaches');
  addBulletPoint('Regular vulnerability scanning ensuring platform security posture');

  // ========== DEPLOYMENT ==========
  doc.addPage();
  yPos = margin;

  addHeader('13. Deployment & Infrastructure', 18);
  yPos += 5;

  addParagraph('The Fleet Management System is designed for self-hosted deployment, providing complete control over infrastructure, security, and data. This approach ensures data sovereignty, regulatory compliance, and integration flexibility.');

  addSubHeader('13.1 Self-Hosted Benefits');
  addBulletPoint('Complete Data Sovereignty: All fleet data remains within your controlled infrastructure');
  addBulletPoint('Security Control: Implement security policies, network controls, and access restrictions per organizational requirements');
  addBulletPoint('Regulatory Compliance: Meet data residency and handling requirements for your industry and jurisdiction');
  addBulletPoint('Integration Flexibility: Direct access to databases and APIs for custom integrations');
  addBulletPoint('Cost Predictability: Fixed infrastructure costs without usage-based surprises');

  addSubHeader('13.2 Infrastructure Requirements');
  
  const infraRequirements = [
    ['Component', 'Minimum', 'Recommended'],
    ['Application Server', '4 CPU, 8GB RAM', '8 CPU, 16GB RAM'],
    ['Database Server', '4 CPU, 16GB RAM', '8 CPU, 32GB RAM'],
    ['Storage', '200GB SSD', '1TB SSD'],
    ['Network', '100 Mbps', '1 Gbps'],
  ];

  const colWidth3 = contentWidth / 3;
  const rowHeight = 8;
  
  doc.setFillColor(30, 64, 175);
  doc.rect(margin, yPos - 5, contentWidth, rowHeight, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  infraRequirements[0].forEach((header, i) => {
    doc.text(header, margin + (i * colWidth3) + 3, yPos);
  });
  yPos += rowHeight;

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

  addSubHeader('13.3 Scaling Considerations');
  addParagraph('The system scales horizontally to accommodate growing fleets. Load balancing distributes application traffic across multiple servers. Database replication provides read scaling and high availability. Separate device gateway instances can be deployed to handle high telemetry volumes.');

  addSubHeader('13.4 Backup & Disaster Recovery');
  addBulletPoint('Automated daily database backups with configurable retention');
  addBulletPoint('Point-in-time recovery capability for data restoration');
  addBulletPoint('Geographic backup replication for disaster recovery');
  addBulletPoint('Documented recovery procedures with tested runbooks');

  // ========== SUPPORT ==========
  doc.addPage();
  yPos = margin;

  addHeader('14. Support & Maintenance', 18);
  yPos += 5;

  addSubHeader('14.1 Support Services');
  addParagraph('Comprehensive support options ensure system reliability and user success:');

  addBulletPoint('Technical Documentation: Complete system documentation, API references, and administration guides');
  addBulletPoint('Knowledge Base: Searchable library of how-to articles, troubleshooting guides, and best practices');
  addBulletPoint('Ticket Support: Email and portal-based support with tracking and escalation');
  addBulletPoint('Remote Diagnostics: Secure remote access for troubleshooting and issue resolution');
  addBulletPoint('Health Monitoring: Proactive system monitoring with alert notification');

  addSubHeader('14.2 Maintenance Services');
  addBulletPoint('Software Updates: Regular releases with new features, improvements, and security patches');
  addBulletPoint('Database Maintenance: Optimization, cleanup, and performance tuning');
  addBulletPoint('Security Updates: Prompt patching of security vulnerabilities');
  addBulletPoint('Backup Verification: Regular testing of backup integrity and recovery procedures');
  addBulletPoint('Capacity Planning: Recommendations for infrastructure scaling as fleet grows');

  addSubHeader('14.3 Training Programs');
  addBulletPoint('Administrator Training: System configuration, user management, and advanced features');
  addBulletPoint('Operator Training: Daily operations, dispatching, and reporting');
  addBulletPoint('Driver Training: Mobile app usage, inspections, and compliance');
  addBulletPoint('Custom Workshops: Tailored training for specific workflows or use cases');
  addBulletPoint('Training Materials: Documentation, videos, and quick reference guides');

  // ========== INVESTMENT ==========
  doc.addPage();
  yPos = margin;

  addHeader('15. Investment Summary', 18);
  yPos += 5;

  addParagraph('The Fleet Management System represents a strategic investment in operational excellence. Pricing is customized based on fleet size, required modules, and deployment requirements.');

  addSubHeader('15.1 Pricing Structure');
  addBulletPoint('Implementation Fee: One-time cost covering installation, configuration, migration, and initial training');
  addBulletPoint('Vehicle License: Per-vehicle subscription covering all core functionality');
  addBulletPoint('Module Add-ons: Optional advanced modules for specialized requirements');
  addBulletPoint('Support Plans: Tiered support options based on response time and service level requirements');
  addBulletPoint('Professional Services: Custom development, integrations, and consulting as needed');

  addSubHeader('15.2 Return on Investment');
  addParagraph('Organizations implementing fleet management systems typically realize significant financial returns:');

  addNumberedPoint('1.', 'Fuel Savings (15-25%): Optimized routing, reduced idling, theft prevention, and driver behavior improvement');
  addNumberedPoint('2.', 'Maintenance Savings (30-40%): Predictive maintenance reducing emergency repairs and extending vehicle life');
  addNumberedPoint('3.', 'Labor Efficiency (20-30%): Automated reporting, streamlined dispatch, and reduced administrative burden');
  addNumberedPoint('4.', 'Insurance Savings (10-20%): Documented safety improvements and reduced incident rates');
  addNumberedPoint('5.', 'Utilization Improvement (15-25%): Better vehicle allocation and reduced idle fleet assets');
  addNumberedPoint('6.', 'Compliance Savings: Reduced fines, penalties, and audit costs through automated tracking');

  addSubHeader('15.3 Next Steps');
  addParagraph('To proceed with the Fleet Management System:');

  addNumberedPoint('1.', 'Schedule a discovery session to review your specific requirements and operational challenges');
  addNumberedPoint('2.', 'Complete a technical assessment of infrastructure and integration requirements');
  addNumberedPoint('3.', 'Receive a detailed proposal with pricing tailored to your organization');
  addNumberedPoint('4.', 'Begin pilot deployment to validate the solution with a subset of your fleet');
  addNumberedPoint('5.', 'Proceed to full deployment with structured implementation and training');

  yPos += 15;

  // Contact Section
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, yPos - 5, contentWidth, 40, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Ready to Transform Your Fleet Operations?', margin + 10, yPos + 5);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text('Contact us to schedule a discovery session and learn how the Fleet Management', margin + 10, yPos + 18);
  doc.text('System can deliver measurable results for your organization.', margin + 10, yPos + 26);

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
