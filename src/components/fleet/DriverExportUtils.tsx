import type { Driver } from "@/hooks/useDrivers";

export const exportDriversToCSV = (drivers: Driver[], filename = "drivers_export.csv") => {
  const headers = [
    "First Name",
    "Last Name",
    "Employee ID",
    "License Number",
    "License Class",
    "License Expiry",
    "Email",
    "Phone",
    "Hire Date",
    "Status",
    "Safety Score",
    "Total Trips",
    "Total Distance (km)",
    "RFID Tag",
    "iButton ID",
    "Bluetooth ID",
    "Notes",
    "Created At"
  ];

  const rows = drivers.map(driver => [
    driver.first_name,
    driver.last_name,
    driver.employee_id || "",
    driver.license_number,
    driver.license_class || "",
    driver.license_expiry || "",
    driver.email || "",
    driver.phone || "",
    driver.hire_date || "",
    driver.status || "active",
    driver.safety_score?.toString() || "",
    driver.total_trips?.toString() || "0",
    driver.total_distance_km?.toString() || "0",
    driver.rfid_tag || "",
    driver.ibutton_id || "",
    driver.bluetooth_id || "",
    driver.notes?.replace(/"/g, '""') || "",
    driver.created_at
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
