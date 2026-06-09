import type { ParseIssue } from "../types/settlement";
import type { RidibooksEventRowCalculation } from "./ridibooksEventCalcUtils";
import type { RidibooksRowCalculation } from "./ridibooksRowCalcUtils";

export type RidibooksBookCalculation = {
  bookId: string;
  workTitle: string;
  calculation: RidibooksRowCalculation;
};

export type RidibooksEventBookCalculation = {
  bookId: string;
  workTitle: string;
  calculation: RidibooksEventRowCalculation;
};

export type RidibooksOverrideCalculation =
  | RidibooksBookCalculation
  | RidibooksEventBookCalculation;

export type RidibooksEventOverrideInput = {
  baseCalculations: RidibooksBookCalculation[];
  eventCalculations: RidibooksEventBookCalculation[];
};

export type RidibooksEventOverrideResult = {
  calculations: RidibooksOverrideCalculation[];
  issues: ParseIssue[];
};

export function applyRidibooksEventOverride({
  baseCalculations,
  eventCalculations,
}: RidibooksEventOverrideInput): RidibooksEventOverrideResult {
  const eventByBookId = new Map(
    eventCalculations.map((eventCalculation) => [eventCalculation.bookId, eventCalculation]),
  );
  const replacedBookIds = new Set<string>();

  const calculations = baseCalculations.map<RidibooksOverrideCalculation>((baseCalculation) => {
    const eventCalculation = eventByBookId.get(baseCalculation.bookId);
    if (!eventCalculation) {
      return baseCalculation;
    }

    replacedBookIds.add(baseCalculation.bookId);
    return eventCalculation;
  });

  const unmatchedEventCalculations = eventCalculations.filter(
    (eventCalculation) => !replacedBookIds.has(eventCalculation.bookId),
  );

  return {
    calculations: [...calculations, ...unmatchedEventCalculations],
    issues: [],
  };
}
