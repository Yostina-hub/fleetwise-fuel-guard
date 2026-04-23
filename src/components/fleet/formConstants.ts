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

// Ethiopian official driver license categories.
// Default validity (years) is used for dynamic expiry-date computation
// when an admin hasn't overridden it via license_category_validity table.
export const LICENSE_TYPES = [
  { value: "1",        label: "Category 1 — Automobile / private",  defaultYears: 5 },
  { value: "2",        label: "Category 2 — Light commercial",       defaultYears: 5 },
  { value: "3",        label: "Category 3 — Heavy commercial",       defaultYears: 5 },
  { value: "4",        label: "Category 4 — Heavy haulage",          defaultYears: 3 },
  { value: "5",        label: "Category 5 — Specialised",            defaultYears: 3 },
  { value: "Public-1", label: "Public-1 — Taxi / Mini-bus",          defaultYears: 3 },
  { value: "Public-2", label: "Public-2 — Midi-bus",                 defaultYears: 3 },
  { value: "Public-3", label: "Public-3 — Bus / Coach",              defaultYears: 3 },
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

// Pool assignments — replaces the legacy "Route Type" semantics.
// Sourced from real Ethio telecom operational pool hierarchy.
export const ASSIGNED_POOLS = [
  { group: "Corporate Pools", value: "pool_naaz",     label: "NAAZ — Northern AA Zone" },
  { group: "Corporate Pools", value: "pool_caaz",     label: "CAAZ — Central AA Zone" },
  { group: "Corporate Pools", value: "pool_eaaz",     label: "EAAZ — Eastern AA Zone" },
  { group: "Corporate Pools", value: "pool_waaz",     label: "WAAZ — Western AA Zone" },
  { group: "Corporate Pools", value: "pool_neaz",     label: "NEAZ — North-East AA Zone" },
  { group: "Corporate Pools", value: "pool_seaz",     label: "SEAZ — South-East AA Zone" },
  { group: "Corporate Pools", value: "pool_swaaz",    label: "SWAAZ — South-West AA Zone" },
  { group: "Regional Pools",  value: "pool_sr",       label: "SR — Southern Region" },
  { group: "Regional Pools",  value: "pool_north",    label: "Northern Region Pool" },
  { group: "Regional Pools",  value: "pool_east",     label: "Eastern Region Pool" },
  { group: "Regional Pools",  value: "pool_west",     label: "Western Region Pool" },
  { group: "Other",           value: "pool_other",    label: "Other / Unassigned" },
];

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

// Vehicle constants
export const PLATE_CODES = [
  { value: "1", label: "1 - Private" },
  { value: "2", label: "2 - Taxi" },
  { value: "3", label: "3 - Commercial / Business" },
  { value: "4", label: "4 - Government" },
  { value: "5", label: "5 - Trailer" },
  { value: "6", label: "6 - Diplomat / NGO" },
  { value: "7", label: "7 - UN / International" },
  { value: "8", label: "8 - Motorcycle" },
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

export const ENERGY_SOURCES = [
  { value: "fuel", label: "Fuel (ICE)" },
  { value: "electric", label: "Electric (EV)" },
  { value: "hybrid", label: "Hybrid" },
  { value: "alternative", label: "Alternative" },
];

export const ENERGY_TYPES = [
  // Fuel (ICE)
  { value: "diesel", label: "Diesel", source: "fuel" },
  { value: "petrol", label: "Petrol / Gasoline", source: "fuel" },
  { value: "premium_petrol", label: "Premium Petrol", source: "fuel" },
  // Electric
  { value: "electric", label: "Battery Electric (BEV)", source: "electric" },
  // Hybrid
  { value: "hybrid_diesel", label: "Hybrid Diesel (HEV)", source: "hybrid" },
  { value: "hybrid_petrol", label: "Hybrid Petrol (HEV)", source: "hybrid" },
  { value: "phev_diesel", label: "Plug-in Hybrid Diesel (PHEV)", source: "hybrid" },
  { value: "phev_petrol", label: "Plug-in Hybrid Petrol (PHEV)", source: "hybrid" },
  // Alternative
  { value: "cng", label: "Compressed Natural Gas (CNG)", source: "alternative" },
  { value: "lng", label: "Liquefied Natural Gas (LNG)", source: "alternative" },
  { value: "lpg", label: "Liquefied Petroleum Gas (LPG)", source: "alternative" },
  { value: "hydrogen", label: "Hydrogen Fuel Cell", source: "alternative" },
  { value: "biodiesel", label: "Biodiesel", source: "alternative" },
  { value: "ethanol", label: "Ethanol (E85)", source: "alternative" },
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

// New Basic Info options (Excel spec)
export const PURPOSE_FOR_OPTIONS = [
  { value: "operational", label: "Operational" },
  { value: "management", label: "Management Vehicle" },
  { value: "op", label: "OP" },
  { value: "support", label: "Support" },
  { value: "executive", label: "Executive" },
  { value: "pool", label: "Pool" },
];

export const SPECIFIC_POOL_OPTIONS = [
  "NAAZ", "SR", "SWAAZ", "NEAZ", "SEAZ", "WAAZ", "EAAZ", "CAAZ", "Other",
];

export const TRANSMISSION_TYPES = [
  { value: "manual", label: "Manual" },
  { value: "automatic", label: "Automatic" },
  { value: "semi_automatic", label: "Semi-Automatic" },
  { value: "cvt", label: "CVT" },
  { value: "dct", label: "DCT" },
];

export const CURRENT_CONDITION_OPTIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "very_good", label: "Very Good" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

export const SAFETY_COMFORT_CATEGORIES = [
  { value: "luxury", label: "Luxury" },
  { value: "premium", label: "Premium" },
  { value: "standard", label: "Standard" },
  { value: "economy", label: "Economy" },
  { value: "utility", label: "Utility" },
];

// Assigned location groups — Corporate / Zone / Region (Ethio telecom hierarchy)
// Corporate items can be either a top-level office (FOM I, FOM II, ZemenGEBEYA)
// or a specific operational sub-pool nested under one of the FOM groups via `parent`.
export const ASSIGNED_LOCATIONS = [
  // Corporate parents (3)
  { group: "Corporate", value: "corp_fom1",         label: "FOM I" },
  { group: "Corporate", value: "corp_fom2",         label: "FOM II" },
  { group: "Corporate", value: "corp_zemengebeya",  label: "ZemenGEBEYA Logistics" },

  // Corporate sub-pools — FOM I
  { group: "Corporate", value: "corp_fom1_ho_night",  label: "Head Office Night Shift Fleet Pool", parent: "corp_fom1", shift: "night" },
  { group: "Corporate", value: "corp_fom1_ho_day",    label: "Head Office Day Shift Fleet Pool",   parent: "corp_fom1", shift: "day"   },
  { group: "Corporate", value: "corp_fom1_tpo_eyor",  label: "TPO/Eyor Fleet Pool",                parent: "corp_fom1" },
  { group: "Corporate", value: "corp_fom1_personal",  label: "Personal Fleet Pool",                parent: "corp_fom1" },

  // Corporate sub-pools — FOM II
  { group: "Corporate", value: "corp_fom2_central_tx",  label: "Central Transport Fleet Pool",            parent: "corp_fom2" },
  { group: "Corporate", value: "corp_fom2_legehar_fan", label: "Legehar FAN & Support NWD Fleet Pool",    parent: "corp_fom2" },
  { group: "Corporate", value: "corp_fom2_wtn",         label: "Wireless and Transport Network Fleet Pool", parent: "corp_fom2" },
  { group: "Corporate", value: "corp_fom2_legehar_om",  label: "Legehar O&M & NWD Fleet Pool",            parent: "corp_fom2" },

  // Zone (5) — Addis Ababa operational zones
  { group: "Zone", value: "zone_eaaz_aa",  label: "EAAZ - Addis Ababa" },
  { group: "Zone", value: "zone_naaz_aa",  label: "NAAZ - Addis Ababa" },
  { group: "Zone", value: "zone_saaz_aa",  label: "SAAZ - Addis Ababa" },
  { group: "Zone", value: "zone_swaaz_aa", label: "SWAAZ - Addis Ababa" },
  { group: "Zone", value: "zone_waaz_aa",  label: "WAAZ - Addis Ababa" },

  // Region (18) — Regional offices with HQ city
  { group: "Region", value: "region_eer_jijiga",         label: "EER - Jijiga" },
  { group: "Region", value: "region_er_dire_dawa",       label: "ER - Dire Dawa" },
  { group: "Region", value: "region_cer_harar",          label: "CER - Harar" },
  { group: "Region", value: "region_ser_adama",          label: "SER - Adama" },
  { group: "Region", value: "region_sser_bale_robe",     label: "SSER - Bale Robe" },
  { group: "Region", value: "region_cnr_debre_birhan",   label: "CNR - Debre Birhan" },
  { group: "Region", value: "region_ner_dessie",         label: "NER - Dessie" },
  { group: "Region", value: "region_neer_semera",        label: "NEER - Semera" },
  { group: "Region", value: "region_nwr_bahir_dar",      label: "NWR - Bahir Dar" },
  { group: "Region", value: "region_nnwr_gondar",        label: "NNWR - Gondar" },
  { group: "Region", value: "region_sr_hawassa",         label: "SR - Hawassa" },
  { group: "Region", value: "region_sswr_woliyta_soddo", label: "SSWR - Woliyta Soddo" },
  { group: "Region", value: "region_cwr_ambo",           label: "CWR - Ambo" },
  { group: "Region", value: "region_wr_nekemte",         label: "WR - Nekemte" },
  { group: "Region", value: "region_wwr_assosa",         label: "WWR - Assosa" },
  { group: "Region", value: "region_swr_jimma",          label: "SWR - Jimma" },
  { group: "Region", value: "region_swwr_gambella",      label: "SWWR - Gambella" },
  { group: "Region", value: "region_nr_mekelle",         label: "NR - Mekelle" },
];

/**
 * Corporate pool parents — used to render the Corporate sub-pools as a
 * grouped (FOM I / FOM II / ZemenGEBEYA) cascade in selectors and to
 * reconstruct the visual hierarchy on detail/list views.
 */
export const CORPORATE_POOL_PARENTS = [
  { value: "corp_fom1",        label: "FOM I" },
  { value: "corp_fom2",        label: "FOM II" },
  { value: "corp_zemengebeya", label: "ZemenGEBEYA Logistics" },
] as const;

/** Sub-pools nested under a corporate parent (FOM I / FOM II / ...). */
export const getCorporateSubPools = (parentValue: string) =>
  ASSIGNED_LOCATIONS.filter(
    (l) => l.group === "Corporate" && (l as any).parent === parentValue,
  );

// Backward-compatibility alias — kept so legacy edit forms still compile.
// New code should use ASSIGNED_POOLS instead.
export const ROUTE_TYPES = [
  { value: "intracity", label: "Intracity" },
  { value: "intercity", label: "Intercity" },
  { value: "both", label: "Both" },
];
