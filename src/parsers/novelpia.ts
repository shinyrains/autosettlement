import type { ParserContext, ParserResult, TabularRow } from "./parserContract";
import { simpleExtractMappings } from "./simpleExtractMappings";
import { parseSimpleExtractRows } from "./simpleExtractUtils";

export function parseNovelpia(context: ParserContext, rows: TabularRow[]): ParserResult {
  return parseSimpleExtractRows({
    context,
    mapping: simpleExtractMappings.novelpia,
    rows,
  });
}
