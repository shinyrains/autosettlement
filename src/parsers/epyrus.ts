import type { ParserContext, ParserResult, TabularRow } from "./parserContract";
import { simpleExtractMappings } from "./simpleExtractMappings";
import { parseSimpleExtractRows } from "./simpleExtractUtils";

export function parseEpyrus(context: ParserContext, rows: TabularRow[]): ParserResult {
  return parseSimpleExtractRows({
    context,
    mapping: simpleExtractMappings.epyrus,
    rows,
  });
}
