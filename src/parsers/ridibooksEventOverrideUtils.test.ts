import { describe, expect, it } from "vitest";
import type { RidibooksEventRowCalculation } from "./ridibooksEventCalcUtils";
import type { RidibooksRowCalculation } from "./ridibooksRowCalcUtils";
import {
  applyRidibooksEventOverride,
  type RidibooksBookCalculation,
  type RidibooksEventBookCalculation,
} from "./ridibooksEventOverrideUtils";

function baseCalculation(bookId: string, workTitle = "Sample Work"): RidibooksBookCalculation {
  return {
    bookId,
    workTitle,
    calculation: {
      outputRows: [
        {
          kind: "normal",
          grossSales: 720,
          settlementAmount: 534,
          sourceRefs: [
            { sourceFileName: "calculate_1.csv", sourceRowIndex: 2 },
            { sourceFileName: "calculate_1 (1).csv", sourceRowIndex: 2 },
          ],
        },
        {
          kind: "app",
          grossSales: 550,
          settlementAmount: 280,
          sourceRefs: [{ sourceFileName: "calculate_1.csv", sourceRowIndex: 2 }],
        },
      ],
      sourceRefs: [
        { sourceFileName: "calculate_1.csv", sourceRowIndex: 2 },
        { sourceFileName: "calculate_1 (1).csv", sourceRowIndex: 2 },
      ],
    } satisfies RidibooksRowCalculation,
  };
}

function eventCalculation(bookId: string, workTitle = "Sample Work"): RidibooksEventBookCalculation {
  return {
    bookId,
    workTitle,
    calculation: {
      outputRows: [
        {
          kind: "event",
          grossSales: 1000,
          settlementAmount: 700,
          sourceRefs: [{ sourceFileName: "calculate_date_tran_1.csv", sourceRowIndex: 2 }],
        },
        {
          kind: "eventApp",
          grossSales: 600,
          settlementAmount: 367.5,
          sourceRefs: [{ sourceFileName: "calculate_date_tran_1.csv", sourceRowIndex: 2 }],
        },
      ],
      sourceRefs: [{ sourceFileName: "calculate_date_tran_1.csv", sourceRowIndex: 2 }],
    } satisfies RidibooksEventRowCalculation,
  };
}

describe("ridibooks event override utils", () => {
  it("replaces matching base/file1 normal and app outputs by book ID", () => {
    const result = applyRidibooksEventOverride({
      baseCalculations: [baseCalculation("RIDI-001")],
      eventCalculations: [eventCalculation("RIDI-001")],
    });

    expect(result.issues).toEqual([]);
    expect(result.calculations).toEqual([eventCalculation("RIDI-001")]);
  });

  it("keeps non-matching base/file1 calculations unchanged", () => {
    const result = applyRidibooksEventOverride({
      baseCalculations: [
        baseCalculation("RIDI-001"),
        baseCalculation("RIDI-002", "Another Work"),
      ],
      eventCalculations: [eventCalculation("RIDI-001")],
    });

    expect(result.issues).toEqual([]);
    expect(result.calculations).toEqual([
      eventCalculation("RIDI-001"),
      baseCalculation("RIDI-002", "Another Work"),
    ]);
  });

  it("does not replace by work title or series title", () => {
    const result = applyRidibooksEventOverride({
      baseCalculations: [baseCalculation("RIDI-001", "Same Work")],
      eventCalculations: [eventCalculation("RIDI-999", "Same Work")],
    });

    expect(result.calculations).toEqual([
      baseCalculation("RIDI-001", "Same Work"),
      eventCalculation("RIDI-999", "Same Work"),
    ]);
  });

  it("preserves calculation order by inserting event result where the matched base item was located", () => {
    const result = applyRidibooksEventOverride({
      baseCalculations: [
        baseCalculation("RIDI-001", "First"),
        baseCalculation("RIDI-002", "Second"),
      ],
      eventCalculations: [eventCalculation("RIDI-002", "Second")],
    });

    expect(result.calculations.map((item) => item.bookId)).toEqual(["RIDI-001", "RIDI-002"]);
    expect(result.calculations[1]).toEqual(eventCalculation("RIDI-002", "Second"));
  });
});
