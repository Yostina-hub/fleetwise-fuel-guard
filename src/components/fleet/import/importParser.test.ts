import { describe, it, expect } from "vitest";
import { parseImportFile, downloadImportTemplate } from "./importParser";
import {
  DRIVER_IMPORT_FIELDS,
  DRIVER_SAMPLE_VALUES,
  resolveDriverField,
} from "./driverImportSchema";
import * as XLSX from "xlsx";

/**
 * Helpers — build File objects in jsdom for the parser to consume.
 */
function csvFile(content: string, name = "vehicles.csv"): File {
  return new File([content], name, { type: "text/csv" });
}

function xlsxFile(matrix: any[][], name = "vehicles.xlsx"): File {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  XLSX.utils.book_append_sheet(wb, ws, "Vehicles");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([out as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return new File([blob], name, { type: blob.type });
}

describe("importParser - CSV", () => {
  it("parses a minimal valid CSV with required fields only", async () => {
    const csv = [
      "Plate Number,Make,Model,Year",
      `AA-12345,Toyota,Hilux,${new Date().getFullYear() - 1}`,
    ].join("\n");

    const result = await parseImportFile(csvFile(csv));
    expect(result.totalRows).toBe(1);
    expect(result.validRows).toBe(1);
    expect(result.invalidRows).toBe(0);
    expect(result.rows[0].data.plate_number).toBe("AA-12345");
    expect(result.rows[0].data.make).toBe("Toyota");
    expect(result.rows[0].data.year).toBeTypeOf("number");
  });

  it("flags missing required fields", async () => {
    const csv = ["Plate Number,Make,Model,Year", "AA-99999,,Hilux,2020"].join("\n");
    const result = await parseImportFile(csvFile(csv));
    expect(result.invalidRows).toBe(1);
    expect(result.rows[0].errors.some((e) => e.includes("Make is required"))).toBe(true);
  });

  it("rejects invalid year (out of bounds)", async () => {
    const csv = ["Plate Number,Make,Model,Year", "AA-1,Toyota,Hilux,1800"].join("\n");
    const result = await parseImportFile(csvFile(csv));
    expect(result.rows[0].errors.some((e) => e.toLowerCase().includes("below minimum"))).toBe(true);
  });

  it("validates enum fields (fuel_type)", async () => {
    const csv = [
      "Plate Number,Make,Model,Year,Fuel Type",
      "AA-1,Toyota,Hilux,2022,plutonium",
    ].join("\n");
    const result = await parseImportFile(csvFile(csv));
    expect(result.rows[0].errors.some((e) => e.includes("Fuel Type"))).toBe(true);
  });

  it("coerces date in YYYY-MM-DD form", async () => {
    const csv = [
      "Plate Number,Make,Model,Year,MFG Date",
      "AA-1,Toyota,Hilux,2022,2023-05-15",
    ].join("\n");
    const result = await parseImportFile(csvFile(csv));
    expect(result.validRows).toBe(1);
    expect(result.rows[0].data.mfg_date).toBe("2023-05-15");
  });

  it("identifies unmapped headers without failing the row", async () => {
    const csv = [
      "Plate Number,Make,Model,Year,Mystery Column",
      "AA-1,Toyota,Hilux,2022,whatever",
    ].join("\n");
    const result = await parseImportFile(csvFile(csv));
    expect(result.unmappedHeaders).toContain("Mystery Column");
    expect(result.validRows).toBe(1);
  });

  it("handles quoted CSV fields with commas", async () => {
    const csv = [
      "Plate Number,Make,Model,Year,Specific Location",
      `AA-1,Toyota,Hilux,2022,"Bole, Addis Ababa"`,
    ].join("\n");
    const result = await parseImportFile(csvFile(csv));
    expect(result.rows[0].data.specific_location).toBe("Bole, Addis Ababa");
  });

  it("strips BOM from UTF-8 CSV", async () => {
    const csv = "\uFEFFPlate Number,Make,Model,Year\nAA-1,Toyota,Hilux,2022";
    const result = await parseImportFile(csvFile(csv));
    expect(result.validRows).toBe(1);
    expect(result.rows[0].data.plate_number).toBe("AA-1");
  });
});

describe("importParser - XLSX", () => {
  it("parses a valid XLSX workbook", async () => {
    const result = await parseImportFile(
      xlsxFile([
        ["Plate Number", "Make", "Model", "Year", "Fuel Type"],
        ["AA-1", "Toyota", "Hilux", 2022, "diesel"],
        ["AA-2", "Isuzu", "NPR", 2021, "diesel"],
      ]),
    );
    expect(result.totalRows).toBe(2);
    expect(result.validRows).toBe(2);
    expect(result.rows[1].data.plate_number).toBe("AA-2");
  });

  it("rejects an unsupported file type", async () => {
    const f = new File(["nope"], "vehicles.txt", { type: "text/plain" });
    await expect(parseImportFile(f)).rejects.toThrow(/unsupported/i);
  });
});

/* ---------- Driver schema tests ---------- */

function driverCsvFile(content: string, name = "drivers.csv"): File {
  return new File([content], name, { type: "text/csv" });
}

function driverXlsxFile(matrix: any[][], name = "drivers.xlsx"): File {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  XLSX.utils.book_append_sheet(wb, ws, "Drivers");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([out as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return new File([blob], name, { type: blob.type });
}

const driverOpts = {
  fields: DRIVER_IMPORT_FIELDS,
  resolveField: resolveDriverField,
};

describe("importParser - Drivers", () => {
  it("parses a minimal valid driver CSV with required fields only", async () => {
    const csv = [
      "First Name,Last Name,License Number",
      "Abebe,Bekele,DL-AA-123456",
    ].join("\n");
    const result = await parseImportFile(driverCsvFile(csv), driverOpts);
    expect(result.totalRows).toBe(1);
    expect(result.validRows).toBe(1);
    expect(result.rows[0].data.first_name).toBe("Abebe");
    expect(result.rows[0].data.license_number).toBe("DL-AA-123456");
  });

  it("flags missing required driver fields", async () => {
    const csv = [
      "First Name,Last Name,License Number",
      "Abebe,,DL-AA-1",
    ].join("\n");
    const result = await parseImportFile(driverCsvFile(csv), driverOpts);
    expect(result.invalidRows).toBe(1);
    expect(
      result.rows[0].errors.some((e) => e.includes("Last Name is required")),
    ).toBe(true);
  });

  it("validates driver enums (driver_type, gender, status)", async () => {
    const csv = [
      "First Name,Last Name,License Number,Driver Type,Gender,Status",
      "Abebe,Bekele,DL-1,alien,unknown,vacationing",
    ].join("\n");
    const result = await parseImportFile(driverCsvFile(csv), driverOpts);
    const errs = result.rows[0].errors.join(" | ");
    expect(errs).toMatch(/Driver Type/);
    expect(errs).toMatch(/Gender/);
    expect(errs).toMatch(/Status/);
  });

  it("coerces driver date fields", async () => {
    const csv = [
      "First Name,Last Name,License Number,Hire Date,License Expiry",
      "Abebe,Bekele,DL-1,2022-03-01,2027-06-30",
    ].join("\n");
    const result = await parseImportFile(driverCsvFile(csv), driverOpts);
    expect(result.validRows).toBe(1);
    expect(result.rows[0].data.hire_date).toBe("2022-03-01");
    expect(result.rows[0].data.license_expiry).toBe("2027-06-30");
  });

  it("parses a valid driver XLSX workbook", async () => {
    const result = await parseImportFile(
      driverXlsxFile([
        ["First Name", "Last Name", "License Number", "Driver Type"],
        ["Abebe", "Bekele", "DL-1", "company"],
        ["Hana", "Tadesse", "DL-2", "outsource"],
      ]),
      driverOpts,
    );
    expect(result.totalRows).toBe(2);
    expect(result.validRows).toBe(2);
    expect(result.rows[1].data.driver_type).toBe("outsource");
  });

  it("skips the hint row in driver template", async () => {
    const csv = [
      "First Name,Last Name,License Number",
      "REQUIRED — max 100 chars,REQUIRED — max 100 chars,REQUIRED — Unique key for upsert",
      "Abebe,Bekele,DL-1",
    ].join("\n");
    const result = await parseImportFile(driverCsvFile(csv), driverOpts);
    expect(result.totalRows).toBe(1);
    expect(result.validRows).toBe(1);
  });
});

/* ---------- Template round-trip ---------- */

/** Capture the Blob that downloadImportTemplate would download. */
function captureDownloadedBlob(fn: () => void): Blob {
  let captured: Blob | null = null;
  const origCreate = URL.createObjectURL;
  const origRevoke = URL.revokeObjectURL;
  // jsdom: stub anchor.click so it doesn't navigate
  const origClick = HTMLAnchorElement.prototype.click;
  URL.createObjectURL = (b: Blob) => {
    captured = b;
    return "blob:mock";
  };
  URL.revokeObjectURL = () => {};
  HTMLAnchorElement.prototype.click = function () {};
  try {
    fn();
  } finally {
    URL.createObjectURL = origCreate;
    URL.revokeObjectURL = origRevoke;
    HTMLAnchorElement.prototype.click = origClick;
  }
  if (!captured) throw new Error("no blob captured");
  return captured;
}

describe("Template round-trip", () => {
  it("vehicle template downloads → parses cleanly", async () => {
    const blob = captureDownloadedBlob(() =>
      downloadImportTemplate("xlsx"),
    );
    const file = new File([blob], "vehicle-import-template.xlsx", {
      type: blob.type,
    });
    const result = await parseImportFile(file);
    expect(result.totalRows).toBe(1); // only the sample row, hint row skipped
    expect(result.validRows).toBe(1);
    expect(result.invalidRows).toBe(0);
    expect(result.rows[0].data.plate_number).toBe("AA-12345");
  });

  it("driver template downloads → parses cleanly", async () => {
    const blob = captureDownloadedBlob(() =>
      downloadImportTemplate("xlsx", {
        fields: DRIVER_IMPORT_FIELDS,
        sampleValues: DRIVER_SAMPLE_VALUES,
        filenameBase: "driver-import-template",
        sheetName: "Drivers",
      }),
    );
    const file = new File([blob], "driver-import-template.xlsx", {
      type: blob.type,
    });
    const result = await parseImportFile(file, driverOpts);
    expect(result.totalRows).toBe(1);
    expect(result.validRows).toBe(1);
    expect(result.invalidRows).toBe(0);
    expect(result.rows[0].data.first_name).toBe("Abebe");
    expect(result.rows[0].data.license_number).toBe("DL-AA-123456");
  });

  it("vehicle CSV template downloads → parses cleanly", async () => {
    const blob = captureDownloadedBlob(() =>
      downloadImportTemplate("csv"),
    );
    const file = new File([blob], "vehicle-import-template.csv", {
      type: "text/csv",
    });
    const result = await parseImportFile(file);
    expect(result.validRows).toBe(1);
    expect(result.invalidRows).toBe(0);
  });

  it("driver CSV template downloads → parses cleanly", async () => {
    const blob = captureDownloadedBlob(() =>
      downloadImportTemplate("csv", {
        fields: DRIVER_IMPORT_FIELDS,
        sampleValues: DRIVER_SAMPLE_VALUES,
        filenameBase: "driver-import-template",
      }),
    );
    const file = new File([blob], "driver-import-template.csv", {
      type: "text/csv",
    });
    const result = await parseImportFile(file, driverOpts);
    expect(result.validRows).toBe(1);
    expect(result.invalidRows).toBe(0);
  });
});
