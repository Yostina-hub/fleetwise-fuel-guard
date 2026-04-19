// Standard Safety & Comfort material lists per Vehicle Group.
// Source: paper SOP "Group of safety & comfort standard lists" (FMG-SAF 15).
// Each group has 4 sections; each section has its own item list. The checklist
// renderer uses these to build the form dynamically once the user picks a group.

export type SafetyComfortGroup = "group_1" | "group_2" | "group_3";

export interface ChecklistSection {
  id: string;
  label: string;
  items: string[];
}

export const SAFETY_COMFORT_GROUPS: { value: SafetyComfortGroup; label: string }[] = [
  { value: "group_1", label: "Group 1 (Standard)" },
  { value: "group_2", label: "Group 2 (Extended)" },
  { value: "group_3", label: "Group 3 (Premium)" },
];

export const SAFETY_COMFORT_STANDARDS: Record<SafetyComfortGroup, ChecklistSection[]> = {
  group_1: [
    {
      id: "fleet_safety",
      label: "List of Fleet Safety Material",
      items: [
        "Fire Extinguisher",
        "First Aid-Kit",
        "Triangular Reflector",
        "Safety Belt for Passenger and Driver",
        "Tire Safety Lock Cable",
        "Reflector Sticker",
      ],
    },
    {
      id: "helping_tools",
      label: "List of Vehicles Helping Tools",
      items: [
        "Car Jack 3 Ton",
        "Tire Wrench",
        "10, 12, 14 mm Combination Wrench",
        "All in one Philips and Flat Screw Driver",
        "Conventional Pliers",
      ],
    },
    {
      id: "accessories",
      label: "Vehicle Accessories",
      items: [
        "Spare Tire",
        "CD Player",
        "Jumper Battery With Cable",
        "Tow Strap",
      ],
    },
    {
      id: "comfort",
      label: "Vehicle Comfort Materials",
      items: [
        "Floor Mat Ready Made",
        "Floor Mat Prepared",
        "Heat Protector",
        "Seat Cover Ready Made",
        "Seat Cover Prepared",
        "Steering Wheel Cover",
        "Sun Visor",
        "Wind Protector",
        "Door Buffer",
        "Curtain",
        "Dash Board Cover",
      ],
    },
  ],
  group_2: [
    {
      id: "fleet_safety",
      label: "List of Fleet Safety Material",
      items: [
        "Fire Extinguisher",
        "First Aid-Kit",
        "Triangular Reflector",
        "Canvas for Tent",
        "Tire Safety Lock Cable",
        "Light Visible Vest",
        "Nylon Rope and Ramp belt",
        "Steel Cable with Clamp",
        "Winch for Steel Cable",
        "Pole Carrier Front and Rear",
        "Reflector Sticker",
      ],
    },
    {
      id: "helping_tools",
      label: "List of Vehicles Helping Tools",
      items: [
        "Car Jack",
        "Tire Wrench",
        "Lever long",
        "10, 12, 14 mm Combination Wrench",
        "All in one Philips and Flat Screw Driver",
        "Conventional Pliers",
      ],
    },
    {
      id: "accessories",
      label: "Vehicle Accessories",
      items: [
        "Spare Tire",
        "CD Player",
        "Water Tanker",
      ],
    },
    {
      id: "comfort",
      label: "Vehicle Comfort Materials",
      items: [
        "Seat Cover Ready Made",
        "Seat Cover Prepared",
        "Heat Protector",
        "Floor Mat Prepared",
        "Floor Mat Ready Made",
        "Sun Visor",
        "Steering Wheel Cover",
        "Curtain",
        "Dash Board Cover",
      ],
    },
  ],
  group_3: [
    {
      id: "fleet_safety",
      label: "List of Fleet Safety Material",
      items: [
        "Fire Extinguisher (1 Kg)",
        "First Aid-Kit",
        "Triangular Reflector",
        "Safety Belt for Passenger and Driver",
        "Tire Safety Lock Cable",
        "Reflector Sticker",
      ],
    },
    {
      id: "helping_tools",
      label: "List of Vehicles Helping Tools",
      items: [
        "Car Jack with 3 Ton",
        "Tire Wrench",
        "10, 12, 14 mm Combination Wrench",
        "All in one Philips and Flat Screw Driver",
        "Conventional Pliers",
      ],
    },
    {
      id: "accessories",
      label: "Vehicle Accessories",
      items: [
        "Spare Tire",
        "Central Lock and Alarm",
        "CD Player",
        "Jumper Battery With Cable",
        "Dash Board Cream",
        "Leather Sheet for Cleaning",
        "Perfume",
      ],
    },
    {
      id: "comfort",
      label: "Vehicle Comfort Materials",
      items: [
        "Floor Mat Ready Made",
        "Heat Protector",
        "Seat Cover Ready Made",
        "Steering Wheel Cover",
        "Floor Mat Prepared",
        "Seat Cover Prepared",
        "Sun Visor",
        "Wind Protector",
        "Door Buffer",
        "Dash Board Cover",
      ],
    },
  ],
};

export const CONDITION_OPTIONS = [
  { value: "good",     label: "Good" },
  { value: "fair",     label: "Fair" },
  { value: "poor",     label: "Poor" },
  { value: "missing",  label: "Missing" },
] as const;

/** Shape stored under the form field key. */
export interface ChecklistEntry {
  present: boolean;
  condition?: string;
  notes?: string;
}

export type ChecklistValue = {
  group?: SafetyComfortGroup;
  /** keyed by `${sectionId}::${itemName}` */
  items?: Record<string, ChecklistEntry>;
};
