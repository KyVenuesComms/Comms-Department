import { describe, expect, it } from "vitest";
import { matchDepartment, parseDepartment } from "./departments";

describe("matchDepartment", () => {
  it("matches exact canonical names", () => {
    expect(matchDepartment("Communications")).toBe("Communications");
    expect(matchDepartment("Sales - KEC")).toBe("Sales - KEC");
  });

  it("matches messy abbreviations by prefix", () => {
    expect(matchDepartment("Comm")).toBe("Communications");
    expect(matchDepartment("expositions")).toBe("Expositions Division");
  });

  it("is case- and space-insensitive", () => {
    expect(matchDepartment("  human   resources ")).toBe("Human Resources");
  });

  it("returns null for blanks and ambiguous values", () => {
    expect(matchDepartment("")).toBeNull();
    expect(matchDepartment(null)).toBeNull();
    expect(matchDepartment("KEC")).toBeNull(); // could be several departments
  });
});

describe("parseDepartment", () => {
  it("pulls the value after 'Department:' in a card description", () => {
    const desc = "Client Information\n\nDepartment:\n\nComm\n\nShow/Event:\n\nOTHER";
    expect(parseDepartment(desc)).toBe("Communications");
  });

  it("handles the value on the same line", () => {
    expect(parseDepartment("Department: Finance")).toBe("Finance");
  });

  it("returns null when there's no department", () => {
    expect(parseDepartment("no fields here")).toBeNull();
    expect(parseDepartment(null)).toBeNull();
  });
});
