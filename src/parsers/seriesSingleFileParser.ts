import type { ParserContext, ParserResult, TabularRow } from "./parserContract";
import type { SeriesCalcGroup } from "./seriesCalcConstants";
import { calculateSeriesRow, isSeriesTotalRow } from "./seriesCalcUtils";
import { mapSeriesRowToSettlement } from "./seriesRowToSettlement";

export function parseSeriesSingleFileRows(
  context: ParserContext,
  rows: TabularRow[],
  slot: SeriesCalcGroup,
): ParserResult {
  return {
    rows: rows
      .filter((row) => !isSeriesTotalRow(row))
      .map((row) =>
        mapSeriesRowToSettlement({
          calculation: calculateSeriesRow(row),
          identityRow: row,
          context,
          slot,
        }),
      ),
    issues: [],
  };
}
