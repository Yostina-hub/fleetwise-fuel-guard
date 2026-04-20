import { describe, it, expect, vi } from "vitest";
import jsPDF from "jspdf";
import { exportRecordsToPdf, type PrintColumn } from "./printUtils";

vi.mock("jspdf", () => {
  // Capture saved filenames so we can assert on them
  const save = vi.fn();
  const ctor = vi.fn().mockImplementation(() => ({
    internal: { pageSize: { getWidth: () => 297, getHeight: () => 210 } },
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    rect: vi.fn(),
    line: vi.fn(),
    text: vi.fn(),
    splitTextToSize: vi.fn().mockReturnValue(["x"]),
    addPage: vi.fn(),
    setPage: vi.fn(),
    getNumberOfPages: vi.fn().mockReturnValue(1),
    save,
  }));
  // expose the spy on the constructor for tests
  (ctor as any)._save = save;
  return { default: ctor };
});

describe("printUtils.exportRecordsToPdf", () => {
  it("invokes jsPDF.save with a timestamped filename", () => {
    const cols: PrintColumn[] = [
      { key: "plate", label: "Plate" },
      { key: "make", label: "Make" },
    ];
    exportRecordsToPdf(
      [{ plate: "AA-1", make: "Toyota" }],
      cols,
      { title: "Test", filename: "vehicles" },
    );
    const Ctor = jsPDF as unknown as { _save: ReturnType<typeof vi.fn> };
    expect(Ctor._save).toHaveBeenCalledTimes(1);
    const arg = Ctor._save.mock.calls[0][0] as string;
    expect(arg).toMatch(/^vehicles_\d{4}-\d{2}-\d{2}_\d{4}\.pdf$/);
  });

  it("renders an empty-state without throwing when rows are empty", () => {
    const cols: PrintColumn[] = [{ key: "plate", label: "Plate" }];
    expect(() =>
      exportRecordsToPdf([], cols, { title: "Empty", filename: "empty" }),
    ).not.toThrow();
  });
});
