import type { ParserContext, ParserResult, TabularRow } from "./parserContract";
import { simpleExtractMappings } from "./simpleExtractMappings";
import { parseSimpleExtractRows } from "./simpleExtractUtils";

export function parseGuruCompany(context: ParserContext, rows: TabularRow[]): ParserResult {
  return parseSimpleExtractRows({
    context,
    mapping: simpleExtractMappings.guru_company,
    rows,
  });
}
