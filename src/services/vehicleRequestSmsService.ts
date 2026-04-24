import { supabase } from "@/integrations/supabase/client";

/**
 * Normalize Ethiopian phone number
 */
const normalizePhone = (phone: string): string => {
  let p = phone.replace(/\s+/g, "").replace(/-/g, "");
  if (p.startsWith("0")) p = "+251" + p.slice(1);
  else if (p.startsWith("9") && p.length === 9) p = "+251" + p;
  else if (!p.startsWith("+")) p = "+" + p;
  return p;
};

/**
 * Send SMS via edge function
 */
const sendSms = async (to: string, message: string, type: string) => {
  const phone = normalizePhone(to);
  const { error } = await supabase.functions.invoke("send-sms", {
    body: { to: phone, message, type },
  });
  if (error) console.error(`SMS (${type}) to ${phone} failed:`, error);
  return !error;
};

/**
 * Notify approver(s) via SMS when a request is submitted
 */
export const notifyApproverSms = async (params: {
  approverPhone: string;
  approverName: string;
  requestNumber: string;
  requesterName: string;
  purpose: string;
  durationDays: number;
  appUrl: string;
}) => {
  const msg = [
    `FleetTrack: Pending Approval`,
    `Request: ${params.requestNumber}`,
    `From: ${params.requesterName}`,
    `Purpose: ${params.purpose.slice(0, 60)}`,
    `Duration: ${params.durationDays} day(s)`,
    `Review: ${params.appUrl}/vehicle-requests`,
  ].join("\n");
  return sendSms(params.approverPhone, msg, "approval_pending");
};

/**
 * Notify requester via SMS when approved or rejected
 */
export const notifyRequesterDecisionSms = async (params: {
  requesterPhone: string;
  requestNumber: string;
  decision: "approved" | "rejected";
  rejectionReason?: string;
  appUrl: string;
}) => {
  const lines = [
    `FleetTrack: Request ${params.requestNumber}`,
    `Status: ${params.decision.toUpperCase()}`,
  ];
  if (params.decision === "rejected" && params.rejectionReason) {
    lines.push(`Reason: ${params.rejectionReason.slice(0, 80)}`);
  }
  if (params.decision === "approved") {
    lines.push(`Your vehicle will be assigned shortly.`);
  }
  lines.push(`Details: ${params.appUrl}/vehicle-requests`);
  return sendSms(params.requesterPhone, lines.join("\n"), `request_${params.decision}`);
};

/**
 * Notify driver AND requester via SMS when vehicle+driver assigned
 */
export const notifyAssignmentSms = async (params: {
  driverPhone: string;
  driverName: string;
  requesterPhone?: string;
  requesterName: string;
  requestNumber: string;
  vehiclePlate: string;
  departure: string;
  destination: string;
  scheduledTime: string;
  appUrl: string;
}) => {
  // SMS to driver
  const driverMsg = [
    `FleetTrack: Assignment ${params.requestNumber}`,
    `Driver: ${params.driverName}`,
    `Vehicle: ${params.vehiclePlate}`,
    `From: ${params.departure || "TBD"}`,
    `To: ${params.destination || "TBD"}`,
    `Time: ${params.scheduledTime}`,
    `Details: ${params.appUrl}/vehicle-requests`,
  ].join("\n");
  const driverOk = await sendSms(params.driverPhone, driverMsg, "assignment_driver");

  // SMS to requester
  let requesterOk = true;
  if (params.requesterPhone) {
    const reqMsg = [
      `FleetTrack: Vehicle Assigned`,
      `Request: ${params.requestNumber}`,
      `Vehicle: ${params.vehiclePlate}`,
      `Driver: ${params.driverName}`,
      `Time: ${params.scheduledTime}`,
      `Details: ${params.appUrl}/vehicle-requests`,
    ].join("\n");
    requesterOk = await sendSms(params.requesterPhone, reqMsg, "assignment_requester");
  }

  return { driverOk, requesterOk };
};

/**
 * Send a turn-by-turn navigation link to the assigned driver.
 * `mapsUrl` should be a Google Maps directions URL with waypoints.
 */
export const notifyNavigationSms = async (params: {
  driverPhone: string;
  requestNumber: string;
  mapsUrl: string;
}) => {
  const msg = [
    `FleetTrack: Navigation ${params.requestNumber}`,
    `Open route:`,
    params.mapsUrl,
  ].join("\n");
  return sendSms(params.driverPhone, msg, "navigation_link");
};

/**
 * Get the app URL (production or preview)
 */
export const getAppUrl = (): string => {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://fleet.goffice.et";
};
