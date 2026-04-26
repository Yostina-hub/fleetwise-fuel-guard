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
