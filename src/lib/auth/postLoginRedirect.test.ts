import { describe, it, expect } from "vitest";
import { getPostLoginPath, isDriverOnly } from "./postLoginRedirect";

describe("postLoginRedirect", () => {
  it("sends pure driver accounts to /driver-portal", () => {
    expect(getPostLoginPath([{ role: "driver" }])).toBe("/driver-portal");
    expect(isDriverOnly([{ role: "driver" }])).toBe(true);
  });

  it("keeps super_admin who also has driver on the dashboard", () => {
    expect(
      getPostLoginPath([{ role: "driver" }, { role: "super_admin" }]),
    ).toBe("/");
    expect(isDriverOnly([{ role: "driver" }, { role: "super_admin" }])).toBe(false);
  });

  it("keeps fleet_manager / org_admin / dispatcher on the dashboard", () => {
    for (const role of ["fleet_manager", "org_admin", "dispatcher"]) {
      expect(getPostLoginPath([{ role }])).toBe("/");
    }
  });

  it("keeps users with no roles on the dashboard (default-deny driver path)", () => {
    expect(getPostLoginPath([])).toBe("/");
    expect(getPostLoginPath(null)).toBe("/");
    expect(getPostLoginPath(undefined)).toBe("/");
  });

  it("treats viewer + driver as driver-only (viewer is not elevated)", () => {
    // viewer is read-only, not staff — driver experience still applies
    expect(getPostLoginPath([{ role: "driver" }, { role: "viewer" }])).toBe(
      "/driver-portal",
    );
  });
});
