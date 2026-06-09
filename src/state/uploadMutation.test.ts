import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { createSeedAppState } from "./appState";
import { applyLiveUploadMutation, isLiveUploadEnabled } from "./uploadMutation";

function readMisterblueSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/misterblue/작품별정산_2026-04-01_2026-04-30.xlsx",
    ),
  );
}

describe("uploadMutation", () => {
  it("enables live upload only for the current misterblue card", () => {
    const state = createSeedAppState();

    const enabledUploads = state.uploads.filter((upload) => isLiveUploadEnabled(upload));

    expect(enabledUploads).toHaveLength(1);
    expect(enabledUploads[0]).toEqual(expect.objectContaining({
      company: "sr",
      platform: "misterblue",
      uploadId: "upload-sr-misterblue",
    }));
  });

  it("replaces the target upload slice with parsed misterblue rows and persisted metadata", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-sr-misterblue");
    expect(upload).toBeDefined();

    const nextState = await applyLiveUploadMutation(
      state,
      upload!,
      [{
        name: "작품별정산_2026-04-01_2026-04-30.xlsx",
        arrayBuffer: async () => {
          const bytes = readMisterblueSampleWorkbook().slice();
          return bytes.buffer as ArrayBuffer;
        },
      }],
      { now: () => "2026-06-09T23:59:00+09:00" },
    );

    const nextUpload = nextState.uploads.find((item) => item.uploadId === "upload-sr-misterblue");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "parsed",
      fileCount: 1,
      parsedRowCount: 198,
      issueCount: 0,
      sourceFileNames: ["작품별정산_2026-04-01_2026-04-30.xlsx"],
      lastUploadedAt: "2026-06-09T23:59:00+09:00",
    }));

    const misterblueRows = nextState.rows.filter((row) => row.company === "sr" && row.platform === "misterblue");
    expect(misterblueRows).toHaveLength(198);
    expect(misterblueRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        workTitle: "대물로 태어나게 해주세요!",
        mailerContentTitle: "대물로 태어나게 해주세요!",
        grossSales: 480000,
        settlementAmount: 296949.5,
        sourceFileName: "작품별정산_2026-04-01_2026-04-30.xlsx",
      }),
      expect.objectContaining({
        workTitle: "대물로 태어나게 해주세요!",
        mailerContentTitle: "대물로 태어나게 해주세요!(app)",
        grossSales: 99960,
        settlementAmount: 61839.7,
        sourceFileName: "작품별정산_2026-04-01_2026-04-30.xlsx",
      }),
    ]));

    expect(nextState.issues.filter((issue) => issue.company === "sr" && issue.platform === "misterblue")).toEqual([]);
    expect(nextState.batch.uploads).toEqual(nextState.uploads);
  });

  it("returns a parse_error issue for unsupported extensions", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-sr-misterblue");
    expect(upload).toBeDefined();

    const nextState = await applyLiveUploadMutation(
      state,
      upload!,
      [{
        name: "bad.txt",
        arrayBuffer: async () => new ArrayBuffer(0),
      }],
      { now: () => "2026-06-09T23:59:01+09:00" },
    );

    const nextUpload = nextState.uploads.find((item) => item.uploadId === "upload-sr-misterblue");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "error",
      issueCount: 1,
      sourceFileNames: ["bad.txt"],
    }));
    expect(nextState.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        company: "sr",
        platform: "misterblue",
        issueType: "parse_error",
        sourceFileName: "bad.txt",
      }),
    ]));
  });
});
