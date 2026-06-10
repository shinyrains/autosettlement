import { readFileSync } from "node:fs";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSeedAppState } from "./appState";
import type { BatchParseOrchestratorInput, BatchParseOrchestratorResult } from "../orchestrators/batchParseOrchestrator";
import {
  applyLiveUploadMutation,
  isLiveUploadEnabled,
  isLiveUploadSlotEnabled,
  resetLiveUploadRuntimeState,
} from "./uploadMutation";

afterEach(() => {
  resetLiveUploadRuntimeState();
});

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

function readBookcubeSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/bookcube/북큐브 상세매출 2026-5~2026-5 (1).xlsx",
    ),
  );
}

describe("uploadMutation", () => {
  it("enables live upload only for the current misterblue, panmurim, and bookcube cards", () => {
    const state = createSeedAppState();

    const enabledUploads = state.uploads.filter((upload) => isLiveUploadEnabled(upload));

    expect(enabledUploads).toHaveLength(3);
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
      expect.objectContaining({
        company: "raon",
        platform: "bookcube",
        uploadId: "upload-raon-bookcube",
      }),
    ]));
  });

  it("enables live upload for the munpia settlement and authorCorrection slots", () => {
    const state = createSeedAppState();
    const munpiaUpload = state.uploads.find((upload) => upload.uploadId === "upload-raon-munpia");
    expect(munpiaUpload?.slots).toBeDefined();

    const enabledSlots = munpiaUpload!.slots!.filter((slot) => isLiveUploadSlotEnabled(munpiaUpload!, slot));

    expect(enabledSlots.map((slot) => slot.slotKey)).toEqual(["settlement", "authorCorrection"]);
  });

  it("replaces the target upload slice with parsed misterblue rows and persisted metadata", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-sr-misterblue");
    expect(upload).toBeDefined();

    const nextState = await applyLiveUploadMutation(
      state,
      { upload: upload! },
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
      { upload: upload! },
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

  it("replaces the target upload slice with parsed bookcube rows and persisted metadata", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-bookcube");
    expect(upload).toBeDefined();

    const nextState = await applyLiveUploadMutation(
      state,
      { upload: upload! },
      [{
        name: "북큐브 상세매출 2026-5~2026-5 (1).xlsx",
        arrayBuffer: async () => {
          const bytes = readBookcubeSampleWorkbook().slice();
          return bytes.buffer as ArrayBuffer;
        },
      }],
      { now: () => "2026-06-10T00:15:00+09:00" },
    );

    const nextUpload = nextState.uploads.find((item) => item.uploadId === "upload-raon-bookcube");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "parsed",
      fileCount: 1,
      parsedRowCount: 5,
      issueCount: 0,
      sourceFileNames: ["북큐브 상세매출 2026-5~2026-5 (1).xlsx"],
      lastUploadedAt: "2026-06-10T00:15:00+09:00",
    }));

    const bookcubeRows = nextState.rows.filter((row) => row.company === "raon" && row.platform === "bookcube");
    expect(bookcubeRows).toHaveLength(5);
    expect(bookcubeRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        workTitle: "짝사랑을 끝냈더니 소꿉친구들이 나에게 집착한다 1",
        mailerContentTitle: "짝사랑을 끝냈더니 소꿉친구들이 나에게 집착한다 1",
        grossSales: 3000,
        settlementAmount: 2100,
        publisher: "B cafe",
        sourceFileName: "북큐브 상세매출 2026-5~2026-5 (1).xlsx",
      }),
    ]));

    expect(nextState.issues.filter((issue) => issue.company === "raon" && issue.platform === "bookcube")).toEqual([]);
    expect(nextState.batch.uploads).toEqual(nextState.uploads);
  });

  it("preserves the committed munpia slice and appends a staged issue when authorCorrection is uploaded before settlement", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-munpia");
    expect(upload).toBeDefined();
    const previousRows = state.rows.filter((row) => row.company === "raon" && row.platform === "munpia");

    const nextState = await applyLiveUploadMutation(
      state,
      { upload: upload!, slotKey: "authorCorrection" },
      [{
        name: "munpia_author_correction.csv",
        arrayBuffer: async () => new TextEncoder().encode("작품,작가\nA,B\n").buffer,
      }],
      { now: () => "2026-06-11T09:00:00+09:00" },
    );

    const nextRows = nextState.rows.filter((row) => row.company === "raon" && row.platform === "munpia");
    expect(nextRows).toEqual(previousRows);

    const nextUpload = nextState.uploads.find((item) => item.uploadId === "upload-raon-munpia");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "error",
      fileCount: 2,
      parsedRowCount: previousRows.length,
      sourceFileNames: ["munpia-raon-june.xlsx", "munpia_author_correction.csv"],
    }));
    expect(nextUpload?.slots).toEqual(expect.arrayContaining([
      expect.objectContaining({
        slotKey: "authorCorrection",
        status: "uploaded",
        sourceFileNames: ["munpia_author_correction.csv"],
      }),
    ]));
    expect(nextState.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        company: "raon",
        platform: "munpia",
        issueType: "parse_error",
        sourceFileName: "munpia_author_correction.csv",
        message: expect.stringContaining("문피아 정산 입력이 없어 재계산"),
      }),
    ]));
  });

  it("reruns munpia grouped parsing with settlement plus the latest authorCorrection snapshot", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-munpia");
    expect(upload).toBeDefined();

    const parseBatch = ({ files }: BatchParseOrchestratorInput): BatchParseOrchestratorResult => ({
      rows: files.some((file) => file.slot === "authorCorrection")
        ? [{
            rowId: "munpia-live-row-002",
            company: "raon",
            platform: "munpia",
            saleMonth: "2026-06",
            workTitle: "문피아 보정 반영",
            mailerContentTitle: "문피아 보정 반영",
            author: "서지후",
            grossSales: 12000,
            settlementAmount: 4800,
            sourceFileName: "munpia-live.xlsx",
            sourceRowIndex: 8,
            issues: [],
          }]
        : [{
            rowId: "munpia-live-row-001",
            company: "raon",
            platform: "munpia",
            saleMonth: "2026-06",
            workTitle: "문피아 정산 초안",
            mailerContentTitle: "문피아 정산 초안",
            author: "서지후",
            grossSales: 10000,
            settlementAmount: 4000,
            sourceFileName: "munpia-live.xlsx",
            sourceRowIndex: 7,
            issues: [],
          }],
      issues: [],
      fileResults: files.map((file) => ({
        fileName: file.fileName,
        company: "raon" as const,
        platform: "munpia" as const,
        fileKind: file.slot === "authorCorrection" ? "csv" as const : "xlsx" as const,
        saleMonth: "2026-06",
        status: "success" as const,
        rowCount: 1,
        issueCount: 0,
      })),
    });

    const afterSettlement = await applyLiveUploadMutation(
      state,
      { upload: upload!, slotKey: "settlement" },
      [{
        name: "munpia-live.xlsx",
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      }],
      {
        now: () => "2026-06-11T09:10:00+09:00",
        parseBatch,
      },
    );

    const settlementRows = afterSettlement.rows.filter((row) => row.company === "raon" && row.platform === "munpia");
    expect(settlementRows).toEqual([
      expect.objectContaining({ rowId: "munpia-live-row-001" }),
    ]);

    const afterCorrection = await applyLiveUploadMutation(
      afterSettlement,
      {
        upload: afterSettlement.uploads.find((item) => item.uploadId === "upload-raon-munpia")!,
        slotKey: "authorCorrection",
      },
      [{
        name: "munpia-author-correction.csv",
        arrayBuffer: async () => new TextEncoder().encode("작품,작가\nA,B\n").buffer,
      }],
      {
        now: () => "2026-06-11T09:12:00+09:00",
        parseBatch,
      },
    );

    const munpiaRows = afterCorrection.rows.filter((row) => row.company === "raon" && row.platform === "munpia");
    expect(munpiaRows).toEqual([
      expect.objectContaining({ rowId: "munpia-live-row-002", workTitle: "문피아 보정 반영" }),
    ]);

    const nextUpload = afterCorrection.uploads.find((item) => item.uploadId === "upload-raon-munpia");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "parsed",
      fileCount: 2,
      parsedRowCount: 1,
      issueCount: 0,
      sourceFileNames: ["munpia-live.xlsx", "munpia-author-correction.csv"],
    }));
    expect(nextUpload?.slots).toEqual(expect.arrayContaining([
      expect.objectContaining({
        slotKey: "settlement",
        status: "parsed",
        sourceFileNames: ["munpia-live.xlsx"],
      }),
      expect.objectContaining({
        slotKey: "authorCorrection",
        status: "parsed",
        sourceFileNames: ["munpia-author-correction.csv"],
      }),
    ]));
    expect(afterCorrection.issues.filter((issue) => issue.company === "raon" && issue.platform === "munpia")).toEqual([]);
  });

  it("returns a parse_error issue for unsupported extensions on xlsx-only live cards", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-bookcube");
    expect(upload).toBeDefined();

    const nextState = await applyLiveUploadMutation(
      state,
      { upload: upload! },
      [{
        name: "bad.csv",
        arrayBuffer: async () => new ArrayBuffer(0),
      }],
      { now: () => "2026-06-10T00:15:01+09:00" },
    );

    const nextUpload = nextState.uploads.find((item) => item.uploadId === "upload-raon-bookcube");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "error",
      issueCount: 1,
      sourceFileNames: ["bad.csv"],
    }));
    expect(nextState.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        company: "raon",
        platform: "bookcube",
        issueType: "parse_error",
        sourceFileName: "bad.csv",
        message: expect.stringContaining(".xlsx만 허용"),
      }),
    ]));
  });
});
