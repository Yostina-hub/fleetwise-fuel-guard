// Shared constants for driver & vehicle registration forms

export const DRIVER_TYPES = [
  { group: "Ethio telecom", value: "ethio_contract", label: "Contract" },
  { group: "Ethio telecom", value: "ethio_permanent", label: "Permanent" },
  { group: "Ethio telecom", value: "ethio_outsource", label: "Outsource" },
  { group: "Ethio telecom", value: "ethio_rental", label: "Rental" },
  { group: "Other", value: "3pl", label: "3PL" },
  { group: "Other", value: "individual", label: "Individual" },
];

export const ADMIN_REGIONS = [
  "Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz", "Central Ethiopia",
  "Dire Dawa", "Gambela", "Harari", "Oromia", "Sidama", "Somali",
  "South Ethiopia", "South West Ethiopia Peoples", "Tigray",
];

export const ID_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "kebele_id", label: "Kebele ID" },
];

export const LICENSE_TYPES = [
  { value: "automobile", label: "Automobile" },
  { value: "dry_1", label: "Cargo -1" },
  { value: "dry_2", label: "Cargo -2" },
  { value: "dry_3", label: "Cargo -3" },
  { value: "motor_cycle", label: "Motor Cycle" },
  { value: "n_a", label: "N/A" },
  { value: "public_1", label: "Public - 1" },
  { value: "public_2", label: "Public - 2" },
  { value: "public_3", label: "Public - 3" },
  { value: "taxi_1", label: "Taxi -1" },
  { value: "taxi_2", label: "Taxi -2" },
];

export const EMPLOYMENT_STATUSES = [
  { value: "regular", label: "Regular" },
  { value: "shift", label: "Shift" },
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
];

export const DRIVER_STATUSES = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "on_leave", label: "On Leave" },
  { value: "terminated", label: "Terminated" },
];

export const ROUTE_TYPES = [
  { value: "intracity", label: "Intracity" },
  { value: "intercity", label: "Intercity" },
  { value: "both", label: "Both" },
];

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

// Vehicle constants
export const PLATE_CODES = [
  { value: "3", label: "3 - Commercial / Business" },
  { value: "4", label: "4 - Government" },
];

export const PLATE_REGIONS = [
  { value: "ET", label: "ET (Federal)" },
  { value: "AA", label: "AA (Addis Ababa)" },
  { value: "AF", label: "AF (Afar)" },
  { value: "AM", label: "AM (Amhara)" },
  { value: "BG", label: "BG (Benishangul-Gumuz)" },
  { value: "DR", label: "DR (Dire Dawa)" },
  { value: "GM", label: "GM (Gambela)" },
  { value: "HR", label: "HR (Harari)" },
  { value: "OR", label: "OR (Oromia)" },
  { value: "SM", label: "SM (Somali)" },
];

export const VEHICLE_TYPES_OPTIONS = [
  { value: "bicycle", label: "Bicycle" },
  { value: "double_cab", label: "DoubleCab" },
  { value: "dump_truck", label: "DumpTruck" },
  { value: "heavy_cargo_crane", label: "HeavyCargoCrane" },
  { value: "heavy_cargo_truck", label: "HeavyCargoTruck" },
  { value: "light_cargo_truck", label: "LightCargoTruck" },
  { value: "medium_cargo_truck", label: "MediumCargoTruck" },
  { value: "midi_bus", label: "Midi-Bus" },
  { value: "midi_van_truck", label: "MidiVan-Truck" },
  { value: "mini_bus", label: "Mini-Bus" },
  { value: "mini_van", label: "Mini-Van" },
  { value: "motorbike", label: "Motorbike" },
  { value: "pannel_van", label: "PannelVan" },
  { value: "scooter", label: "Scooter" },
  { value: "sedan", label: "Sedan" },
  { value: "single_cab", label: "SingleCab" },
  { value: "suv", label: "SportUtilityVehicles" },
];

export const VEHICLE_GROUPS = [
  "Automobile", "Bicycle", "Bus", "CargoCrane", "Mini pickup",
  "Motorbike", "Pickup", "Scooter", "SUV", "Truck", "Van", "Wagon", "6X4",
];

export const DRIVE_TYPES = [
  { value: "2x1", label: "2x1" },
  { value: "4x2", label: "4x2" },
  { value: "4x4", label: "4x4" },
  { value: "6X4", label: "6X4" },
];

export const ENERGY_TYPES = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "electric", label: "Electric" },
  { value: "hybrid", label: "Hybrid" },
  { value: "cng", label: "Compressed Natural Gas" },
];

export const VEHICLE_CATEGORIES = [
  { value: "last_mile", label: "Last-Mile" },
  { value: "line_haul", label: "Line-Haul" },
];

export const TEMPERATURE_CONTROLS = [
  { value: "none", label: "None" },
  { value: "chiller", label: "Chiller" },
  { value: "freezer", label: "Freezer" },
];

export const VEHICLE_STATUSES = [
  { value: "active", label: "Active" },
  { value: "assigned", label: "Assigned" },
  { value: "maintenance", label: "Under Maintenance" },
];

export const OWNER_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "owned", label: "Owned" },
  { value: "rent", label: "Rent" },
  { value: "3pl", label: "3PL" },
];

export const OWNER_STATUSES = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "blacklisted", label: "Blacklisted" },
];

// Assigned location groups
export const ASSIGNED_LOCATIONS = [
  { group: "Corporate", value: "corp_fom1", label: "FOM I" },
  { group: "Corporate", value: "corp_fom2", label: "FOM II" },
  { group: "Corporate", value: "corp_zemengebeya", label: "ZemenGEBEYA Logistics" },
  { group: "Zone", value: "region_bole", label: "Bole" },
  { group: "Zone", value: "region_yeka", label: "Yeka" },
  { group: "Zone", value: "region_kirkos", label: "Kirkos" },
  { group: "Zone", value: "region_arada", label: "Arada" },
  { group: "Zone", value: "region_addis_ketema", label: "Addis Ketema" },
  { group: "Zone", value: "region_lideta", label: "Lideta" },
  { group: "Zone", value: "region_gulele", label: "Gulele" },
  { group: "Zone", value: "region_kolfe", label: "Kolfe Keranio" },
  { group: "Zone", value: "region_akaky", label: "Akaky Kaliti" },
  { group: "Zone", value: "region_nefas_silk", label: "Nefas Silk Lafto" },
  { group: "Zone", value: "region_lemi_kura", label: "Lemi Kura" },
  { group: "Region", value: "region_adama", label: "Adama" },
  { group: "Region", value: "region_hawassa", label: "Hawassa" },
  { group: "Region", value: "region_bahir_dar", label: "Bahir Dar" },
  { group: "Region", value: "region_mekelle", label: "Mekelle" },
  { group: "Region", value: "region_jimma", label: "Jimma" },
  { group: "Region", value: "region_dire_dawa", label: "Dire Dawa" },
];
