import type { Platform } from "../types/settlement";
import { parseAladin } from "./aladin";
import { parseBookcube } from "./bookcube";
import { parseEpyrus } from "./epyrus";
import { parseGuruCompany } from "./guruCompany";
import { parseKakaoPage } from "./kakaoPage";
import { parseKyobo } from "./kyobo";
import { parseMootoon } from "./mootoon";
import { parseMisterblueSingleFileRows } from "./misterblueSingleFileParser";
import { parseNovelpia } from "./novelpia";
import { parseOnestore } from "./onestore";
import { parsePanmurim } from "./panmurim";
import type { ParserContext, ParserResult, PlatformParser, TabularRow } from "./parserContract";
import { parseYes24 } from "./yes24";

export const parserRegistry = {
  novelpia: parseNovelpia,
  mootoon: parseMootoon,
  epyrus: parseEpyrus,
  kyobo: parseKyobo,
  yes24: parseYes24,
  aladin: parseAladin,
  guru_company: parseGuruCompany,
  misterblue: parseMisterblueSingleFileRows,
  panmurim: parsePanmurim,
  bookcube: parseBookcube,
  onestore: parseOnestore,
  kakao_page: parseKakaoPage,
} satisfies Partial<Record<Platform, PlatformParser>>;

export type SupportedParserPlatform = keyof typeof parserRegistry;

export const supportedParserPlatforms = Object.keys(parserRegistry) as SupportedParserPlatform[];

export function getParser(platform: Platform): PlatformParser | undefined {
  return parserRegistry[platform as SupportedParserPlatform];
}

export function parsePlatformRows(
  platform: Platform,
  context: ParserContext,
  rows: TabularRow[],
): ParserResult {
  const parser = getParser(platform);
  const parserContext = {
    ...context,
    platform,
  };

  if (!parser) {
    return {
      rows: [],
      issues: [
        {
          issueId: `${context.batchId}-${platform}-mapping_failed-file`,
          batchId: context.batchId,
          company: context.company,
          platform,
          severity: "error",
          issueType: "mapping_failed",
          message: `Parser for platform "${platform}" is not implemented.`,
          sourceFileName: context.sourceFileName,
        },
      ],
    };
  }

  return parser(parserContext, rows);
}
