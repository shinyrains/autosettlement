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

function readPanmurimSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/panmurim/（주）라온이앤엠_2026년 5월.xlsx",
    ),
  );
}

describe("uploadMutation", () => {
  it("enables live upload only for the current misterblue and panmurim cards", () => {
    const state = createSeedAppState();

    const enabledUploads = state.uploads.filter((upload) => isLiveUploadEnabled(upload));

    expect(enabledUploads).toHaveLength(2);
    expect(enabledUploads).toEqual(expect.arrayContaining([
      expect.objectContaining({
        company: "sr",
        platform: "misterblue",
        uploadId: "upload-sr-misterblue",
      }),
      expect.objectContaining({
        company: "raon",
        platform: "panmurim",
        uploadId: "upload-raon-panmurim",
      }),
    ]));
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

  it("replaces the target upload slice with parsed panmurim rows and persisted metadata", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-panmurim");
    expect(upload).toBeDefined();

    const nextState = await applyLiveUploadMutation(
      state,
      upload!,
      [{
        name: "（주）라온이앤엠_2026년 5월.xlsx",
        arrayBuffer: async () => {
          const bytes = readPanmurimSampleWorkbook().slice();
          return bytes.buffer as ArrayBuffer;
        },
      }],
      { now: () => "2026-06-10T00:01:00+09:00" },
    );

    const nextUpload = nextState.uploads.find((item) => item.uploadId === "upload-raon-panmurim");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "parsed",
      fileCount: 1,
      parsedRowCount: 354,
      issueCount: 0,
      sourceFileNames: ["（주）라온이앤엠_2026년 5월.xlsx"],
      lastUploadedAt: "2026-06-10T00:01:00+09:00",
    }));

    const panmurimRows = nextState.rows.filter((row) => row.company === "raon" && row.platform === "panmurim");
    expect(panmurimRows).toHaveLength(354);
    expect(panmurimRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        workTitle: "그의 비밀 2권",
        mailerContentTitle: "그의 비밀 2권",
        grossSales: 3200,
        settlementAmount: 2240,
        sourceFileName: "（주）라온이앤엠_2026년 5월.xlsx",
      }),
    ]));

    expect(nextState.issues.filter((issue) => issue.company === "raon" && issue.platform === "panmurim")).toEqual([]);
    expect(nextState.batch.uploads).toEqual(nextState.uploads);
  });

  it("returns a parse_error issue for unsupported extensions on xlsx-only live cards", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-panmurim");
    expect(upload).toBeDefined();

    const nextState = await applyLiveUploadMutation(
      state,
      upload!,
      [{
        name: "bad.csv",
        arrayBuffer: async () => new ArrayBuffer(0),
      }],
      { now: () => "2026-06-10T00:01:01+09:00" },
    );

    const nextUpload = nextState.uploads.find((item) => item.uploadId === "upload-raon-panmurim");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "error",
      issueCount: 1,
      sourceFileNames: ["bad.csv"],
    }));
    expect(nextState.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        company: "raon",
        platform: "panmurim",
        issueType: "parse_error",
        sourceFileName: "bad.csv",
        message: expect.stringContaining(".xlsx만 허용"),
      }),
    ]));
  });
});
