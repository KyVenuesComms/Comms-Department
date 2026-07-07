import { afterEach, describe, expect, it } from "vitest";
import {
  defaultDepartments,
  departmentNames,
  matchDepartment,
  parseDepartment,
  setDepartments,
  validateDepartments,
} from "./departments";

// Any test that swaps the department list restores the default afterward so
// module state doesn't leak between tests.
afterEach(() => setDepartments(defaultDepartments()));

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

describe("setDepartments + aliases", () => {
  it("matches a custom alias to its canonical department", () => {
    setDepartments([
      { name: "Communications", aliases: ["comms team", "pr"] },
      { name: "Finance", aliases: [] },
    ]);
    expect(matchDepartment("PR")).toBe("Communications");
    expect(matchDepartment("comms team")).toBe("Communications");
    expect(departmentNames()).toEqual(["Communications", "Finance"]);
  });

  it("still falls back to prefix matching against names", () => {
    setDepartments([{ name: "Expositions Division", aliases: [] }]);
    expect(matchDepartment("expositions")).toBe("Expositions Division");
  });
});

describe("validateDepartments", () => {
  it("passes the default list", () => {
    expect(validateDepartments(defaultDepartments())).toEqual([]);
  });
  it("flags a blank name and a duplicate", () => {
    const errs = validateDepartments([
      { name: "Finance", aliases: [] },
      { name: "finance", aliases: [] },
      { name: "  ", aliases: [] },
    ]);
    expect(errs.some((e) => /more than once/.test(e))).toBe(true);
    expect(errs.some((e) => /needs a name/.test(e))).toBe(true);
  });
});
