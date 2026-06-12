import { describe, expect, it } from "vitest";

import { parseNovelpiaHtmlXlsAdapter } from "./novelpiaHtmlXlsAdapter";
import type { FileAdapterContext } from "./types";

const baseContext: FileAdapterContext = {
  batchId: "batch-novelpia-encoding",
  company: "raon",
  platform: "novelpia",
  saleMonth: "2026-06",
  sourceFileName: "novelpia-euckr.xls",
  fileKind: "html_xls",
};

describe("novelpia HTML-XLS adapter", () => {
  it("decodes EUC-KR byte HTML-XLS files before parsing rows", () => {
    const eucKrBytes = new Uint8Array([60,116,97,98,108,101,62,60,116,114,62,60,116,104,62,192,219,199,176,184,237,60,47,116,104,62,60,116,104,62,193,164,187,234,177,221,190,215,60,47,116,104,62,60,47,116,114,62,60,116,114,62,60,116,100,62,176,203,192,186,32,186,176,60,47,116,100,62,60,116,100,62,49,50,48,48,60,47,116,100,62,60,47,116,114,62,60,47,116,97,98,108,101,62]);

    const result = parseNovelpiaHtmlXlsAdapter(baseContext, eucKrBytes);

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        작품명: "검은 별",
        정산금액: "1200",
        sourceFileName: "novelpia-euckr.xls",
        sourceRowIndex: 2,
      }),
    ]);
  });
});
