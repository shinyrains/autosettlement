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

function readEpyrusSampleCsv(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/epyrus/2026년04월정산내역_라온E＆M.csv",
    ),
  );
}

function readYes24SampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/yes24/B2C_List_260608_153729.xlsx",
    ),
  );
}

function readAladinSampleCsv(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/aladin/sales_19835_202605.csv",
    ),
  );
}

function readGuruCompanySampleCsv(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/guru_company/정산_공급사_202604.csv",
    ),
  );
}

function readKyoboSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/kyobo/정산내역조회.xlsx",
    ),
  );
}

function readMootoonSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/mootoon/라온이엔엠[2026-05]__소설__작품별내역__무툰.xlsx",
    ),
  );
}

function readOnestoreSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/onestore/정산내역_20260608_163327.xlsx",
    ),
  );
}

function readNovelpiaSampleHtmlXls(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/novelpia/일별 정산.xls",
    ),
  );
}

function readJoaraSettlementDetailSampleCsv(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/joara/정산 상세리스트_2026-5.csv",
    ),
  );
}

function readJoaraWorkSettlementSampleCsv(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/joara/작품별 정산리스트_2026-5.csv",
    ),
  );
}

function readRidibooksBaseSampleCsv(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/ridibooks/calculate_1.csv",
    ),
  );
}

function readRidibooksFile1SampleCsv(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/ridibooks/calculate_1 (1).csv",
    ),
  );
}

function readRidibooksEventSampleCsv(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/ridibooks/calculate_date_tran_1.csv",
    ),
  );
}

function createTextUpload(name: string, content: string): { name: string; arrayBuffer: () => Promise<ArrayBuffer> } {
  const bytes = new TextEncoder().encode(content);
  return {
    name,
    arrayBuffer: async () => bytes.slice().buffer as ArrayBuffer,
  };
}

function createSeriesHtmlFile(name: string): { name: string; arrayBuffer: () => Promise<ArrayBuffer> } {
  const bytes = new TextEncoder().encode(`<table><tr><td>${name}</td></tr></table>`);
  return {
    name,
    arrayBuffer: async () => bytes.buffer.slice(0),
  };
}

function createEmptySeriesUploadDraft() {
  const state = createSeedAppState();
  state.uploads = state.uploads.map((upload) => (
    upload.platform === "series"
      ? {
          ...upload,
          status: "empty" as const,
          fileCount: 0,
          sourceFileNames: [],
          parsedRowCount: 0,
          issueCount: 0,
          lastUploadedAt: undefined,
          slots: upload.slots?.map((slot) => ({
            ...slot,
            status: "empty" as const,
            fileCount: 0,
            sourceFileNames: [],
            issueCount: 0,
            lastUploadedAt: undefined,
          })),
        }
      : upload
  ));
  state.batch.uploads = state.uploads;
  state.rows = state.rows.filter((row) => row.platform !== "series");
  state.issues = state.issues.filter((issue) => issue.platform !== "series");
  state.selectedRowId = state.rows[0]?.rowId ?? "";
  return state;
}

function createEmptyRidibooksUploadDraft() {
  const state = createSeedAppState();
  state.uploads = state.uploads.map((upload) => (
    upload.platform === "ridibooks"
      ? {
          ...upload,
          status: "empty" as const,
          fileCount: 0,
          sourceFileNames: [],
          parsedRowCount: 0,
          issueCount: 0,
          lastUploadedAt: undefined,
          slots: upload.slots?.map((slot) => ({
            ...slot,
            status: "empty" as const,
            fileCount: 0,
            sourceFileNames: [],
            issueCount: 0,
            lastUploadedAt: undefined,
          })),
        }
      : upload
  ));
  state.batch.uploads = state.uploads;
  state.rows = state.rows.filter((row) => row.platform !== "ridibooks");
  state.issues = state.issues.filter((issue) => issue.platform !== "ridibooks");
  state.selectedRowId = state.rows[0]?.rowId ?? "";
  return state;
}

function createEmptyJoaraUploadDraft() {
  const state = createSeedAppState();
  state.uploads = state.uploads.map((upload) => (
    upload.platform === "joara"
      ? {
          ...upload,
          status: "empty" as const,
          fileCount: 0,
          sourceFileNames: [],
          parsedRowCount: 0,
          issueCount: 0,
          lastUploadedAt: undefined,
          slots: upload.slots?.map((slot) => ({
            ...slot,
            status: "empty" as const,
            fileCount: 0,
            sourceFileNames: [],
            issueCount: 0,
            lastUploadedAt: undefined,
          })),
        }
      : upload
  ));
  state.batch.uploads = state.uploads;
  state.rows = state.rows.filter((row) => row.platform !== "joara");
  state.issues = state.issues.filter((issue) => issue.platform !== "joara");
  state.selectedRowId = state.rows[0]?.rowId ?? "";
  return state;
}

describe("uploadMutation", () => {
  it("enables live upload only for the current misterblue, panmurim, bookcube, epyrus, yes24, aladin, guru_company, kyobo, kakao_page, mootoon, novelpia, and shared onestore cards", () => {
    const state = createSeedAppState();

    const enabledUploads = state.uploads.filter((upload) => isLiveUploadEnabled(upload));

    expect(enabledUploads).toHaveLength(12);
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
      expect.objectContaining({
        company: "raon",
        platform: "epyrus",
        uploadId: "upload-raon-epyrus",
      }),
      expect.objectContaining({
        company: "sr",
        platform: "yes24",
        uploadId: "upload-sr-yes24",
      }),
      expect.objectContaining({
        company: "sr",
        platform: "aladin",
        uploadId: "upload-sr-aladin",
      }),
      expect.objectContaining({
        company: "raon",
        platform: "guru_company",
        uploadId: "upload-raon-guru-company",
      }),
      expect.objectContaining({
        company: "sr",
        platform: "kyobo",
        uploadId: "upload-sr-kyobo",
      }),
      expect.objectContaining({
        company: "sr",
        platform: "kakao_page",
        uploadId: "upload-sr-kakao-page",
      }),
      expect.objectContaining({
        company: "raon",
        platform: "mootoon",
        uploadId: "upload-raon-mootoon",
      }),
      expect.objectContaining({
        company: "raon",
        platform: "novelpia",
        uploadId: "upload-raon-novelpia",
      }),
      expect.objectContaining({
        company: "raon",
        platform: "onestore",
        uploadId: "upload-shared-onestore",
        sharedCompanies: ["raon", "sr"],
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

  it("enables live upload for the series general/app slots on both series cards", () => {
    const state = createSeedAppState();
    const seriesUploads = state.uploads.filter((upload) => upload.platform === "series");

    expect(seriesUploads).toHaveLength(2);
    for (const upload of seriesUploads) {
      const enabledSlots = upload.slots?.filter((slot) => isLiveUploadSlotEnabled(upload, slot)) ?? [];
      expect(enabledSlots.map((slot) => slot.slotKey)).toEqual(["seriesGeneral", "seriesApp"]);
    }
  });

  it("enables live upload for the ridibooks grouped slots", () => {
    const state = createSeedAppState();
    const ridibooksUpload = state.uploads.find((upload) => upload.uploadId === "upload-raon-ridibooks");
    expect(ridibooksUpload?.slots).toBeDefined();

    const enabledSlots = ridibooksUpload!.slots!.filter((slot) => isLiveUploadSlotEnabled(ridibooksUpload!, slot));

    expect(enabledSlots.map((slot) => slot.slotKey)).toEqual(["base", "file1", "event", "mgCorrection"]);
  });

  it("enables live upload for the joara grouped slots", () => {
    const state = createSeedAppState();
    const joaraUpload = state.uploads.find((upload) => upload.uploadId === "upload-raon-joara");
    expect(joaraUpload?.slots).toBeDefined();

    const enabledSlots = joaraUpload!.slots!.filter((slot) => isLiveUploadSlotEnabled(joaraUpload!, slot));

    expect(enabledSlots.map((slot) => slot.slotKey)).toEqual(["settlementDetail", "workSettlement"]);
  });

  it("stages a ridibooks base upload until file1 is also present", async () => {
    const state = createEmptyRidibooksUploadDraft();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-ridibooks");
    expect(upload).toBeDefined();

    const nextState = await applyLiveUploadMutation(
      state,
      { upload: upload!, slotKey: "base" },
      [createTextUpload("calculate_1.csv", "work,sale\nbase,1\n")],
      { now: () => "2026-06-13T09:00:00+09:00" },
    );

    expect(nextState.rows.filter((row) => row.platform === "ridibooks")).toEqual([]);
    const nextUpload = nextState.uploads.find((item) => item.uploadId === "upload-raon-ridibooks");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "error",
      fileCount: 1,
      parsedRowCount: 0,
      sourceFileNames: ["calculate_1.csv"],
    }));
    expect(nextUpload?.slots).toEqual(expect.arrayContaining([
      expect.objectContaining({
        slotKey: "base",
        status: "uploaded",
        sourceFileNames: ["calculate_1.csv"],
      }),
      expect.objectContaining({
        slotKey: "file1",
        status: "empty",
      }),
    ]));
    expect(nextState.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        company: "raon",
        platform: "ridibooks",
        issueType: "missing_file",
        sourceFileName: "calculate_1.csv",
        message: expect.stringContaining("base)과 file_1 보정(file1)이 모두 준비된 뒤"),
      }),
    ]));
  });

  it("reruns ridibooks grouped parsing when base, file1, and mgCorrection are uploaded", async () => {
    const state = createEmptyRidibooksUploadDraft();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-ridibooks");
    expect(upload).toBeDefined();

    const parseBatch = ({ files }: BatchParseOrchestratorInput): BatchParseOrchestratorResult => ({
      rows: files.some((file) => file.slot === "mgCorrection")
        ? [{
            rowId: "ridibooks-live-row-002",
            company: "raon",
            platform: "ridibooks",
            saleMonth: "2026-06",
            workTitle: "리디 MG 보정 반영",
            mailerContentTitle: "리디 MG 보정 반영",
            author: "서지후",
            publisher: "라온북스",
            grossSales: 22000,
            settlementAmount: 8800,
            sourceFileName: "calculate_1.csv",
            sourceRowIndex: 9,
            issues: [],
          }]
        : [{
            rowId: "ridibooks-live-row-001",
            company: "raon",
            platform: "ridibooks",
            saleMonth: "2026-06",
            workTitle: "리디 기본 정산 초안",
            mailerContentTitle: "리디 기본 정산 초안",
            author: "서지후",
            publisher: "라온북스",
            grossSales: 20000,
            settlementAmount: 8000,
            sourceFileName: "calculate_1.csv",
            sourceRowIndex: 8,
            issues: [],
          }],
      issues: [],
      fileResults: files.map((file) => ({
        fileName: file.fileName,
        company: "raon" as const,
        platform: "ridibooks" as const,
        fileKind: file.fileKind,
        saleMonth: "2026-06",
        status: "success" as const,
        rowCount: 1,
        issueCount: 0,
      })),
    });

    const afterBase = await applyLiveUploadMutation(
      state,
      { upload: upload!, slotKey: "base" },
      [createTextUpload("calculate_1.csv", "work,sale\nbase,1\n")],
      { now: () => "2026-06-13T09:10:00+09:00", parseBatch },
    );

    const afterFile1 = await applyLiveUploadMutation(
      afterBase,
      { upload: afterBase.uploads.find((item) => item.uploadId === "upload-raon-ridibooks")!, slotKey: "file1" },
      [createTextUpload("calculate_1 (1).csv", "work,sale\nfile1,1\n")],
      { now: () => "2026-06-13T09:12:00+09:00", parseBatch },
    );

    expect(afterFile1.rows.filter((row) => row.platform === "ridibooks")).toEqual([
      expect.objectContaining({ rowId: "ridibooks-live-row-001", workTitle: "리디 기본 정산 초안" }),
    ]);

    const afterMg = await applyLiveUploadMutation(
      afterFile1,
      { upload: afterFile1.uploads.find((item) => item.uploadId === "upload-raon-ridibooks")!, slotKey: "mgCorrection" },
      [{
        name: "ridibooks-mg.xlsx",
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      }],
      { now: () => "2026-06-13T09:15:00+09:00", parseBatch },
    );

    expect(afterMg.rows.filter((row) => row.platform === "ridibooks")).toEqual([
      expect.objectContaining({ rowId: "ridibooks-live-row-002", workTitle: "리디 MG 보정 반영" }),
    ]);
    const nextUpload = afterMg.uploads.find((item) => item.uploadId === "upload-raon-ridibooks");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "parsed",
      fileCount: 3,
      parsedRowCount: 1,
      issueCount: 0,
      sourceFileNames: ["calculate_1.csv", "calculate_1 (1).csv", "ridibooks-mg.xlsx"],
    }));
    expect(nextUpload?.slots).toEqual(expect.arrayContaining([
      expect.objectContaining({ slotKey: "base", status: "parsed", sourceFileNames: ["calculate_1.csv"] }),
      expect.objectContaining({ slotKey: "file1", status: "parsed", sourceFileNames: ["calculate_1 (1).csv"] }),
      expect.objectContaining({ slotKey: "mgCorrection", status: "parsed", sourceFileNames: ["ridibooks-mg.xlsx"] }),
    ]));
    expect(afterMg.issues.filter((issue) => issue.company === "raon" && issue.platform === "ridibooks")).toEqual([]);
  });

  it("keeps the committed ridibooks slice and surfaces a missing-field issue when eventPeriod is omitted", async () => {
    const state = createEmptyRidibooksUploadDraft();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-ridibooks");
    expect(upload).toBeDefined();

    const parseBatch = ({ files }: BatchParseOrchestratorInput): BatchParseOrchestratorResult => ({
      rows: [{
        rowId: "ridibooks-live-row-001",
        company: "raon",
        platform: "ridibooks",
        saleMonth: "2026-06",
        workTitle: "리디 기본 정산 초안",
        mailerContentTitle: "리디 기본 정산 초안",
        author: "서지후",
        publisher: "라온북스",
        grossSales: 20000,
        settlementAmount: 8000,
        sourceFileName: files[0]?.fileName ?? "calculate_1.csv",
        sourceRowIndex: 8,
        issues: [],
      }],
      issues: [],
      fileResults: files.map((file) => ({
        fileName: file.fileName,
        company: "raon" as const,
        platform: "ridibooks" as const,
        fileKind: file.fileKind,
        saleMonth: "2026-06",
        status: "success" as const,
        rowCount: 1,
        issueCount: 0,
      })),
    });

    const afterBase = await applyLiveUploadMutation(
      state,
      { upload: upload!, slotKey: "base" },
      [createTextUpload("calculate_1.csv", "work,sale\nbase,1\n")],
      { now: () => "2026-06-13T09:20:00+09:00", parseBatch },
    );
    const afterFile1 = await applyLiveUploadMutation(
      afterBase,
      { upload: afterBase.uploads.find((item) => item.uploadId === "upload-raon-ridibooks")!, slotKey: "file1" },
      [createTextUpload("calculate_1 (1).csv", "work,sale\nfile1,1\n")],
      { now: () => "2026-06-13T09:21:00+09:00", parseBatch },
    );
    const previousRows = afterFile1.rows.filter((row) => row.platform === "ridibooks");

    const afterEvent = await applyLiveUploadMutation(
      afterFile1,
      { upload: afterFile1.uploads.find((item) => item.uploadId === "upload-raon-ridibooks")!, slotKey: "event" },
      [createTextUpload("calculate_date_tran_1.csv", "work,event\nevent,1\n")],
      { now: () => "2026-06-13T09:22:00+09:00", parseBatch },
    );

    expect(afterEvent.rows.filter((row) => row.platform === "ridibooks")).toEqual(previousRows);
    const nextUpload = afterEvent.uploads.find((item) => item.uploadId === "upload-raon-ridibooks");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "error",
      fileCount: 3,
      parsedRowCount: 1,
      sourceFileNames: ["calculate_1.csv", "calculate_1 (1).csv", "calculate_date_tran_1.csv"],
    }));
    expect(nextUpload?.slots).toEqual(expect.arrayContaining([
      expect.objectContaining({ slotKey: "event", status: "error", sourceFileNames: ["calculate_date_tran_1.csv"] }),
    ]));
    expect(afterEvent.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        company: "raon",
        platform: "ridibooks",
        issueType: "missing_field",
        sourceFileName: "calculate_date_tran_1.csv",
        message: expect.stringContaining("eventPeriod"),
      }),
    ]));
  });

  it("reruns ridibooks grouped parsing when event is uploaded with eventPeriod", async () => {
    const state = createEmptyRidibooksUploadDraft();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-ridibooks");
    expect(upload).toBeDefined();

    const parseBatch = ({ files }: BatchParseOrchestratorInput): BatchParseOrchestratorResult => {
      const eventInput = files.find((file) => file.slot === "event");
      return {
        rows: eventInput
          ? [{
              rowId: "ridibooks-live-row-003",
              company: "raon",
              platform: "ridibooks",
              saleMonth: "2026-06",
              workTitle: `리디 이벤트 반영 ${eventInput.eventPeriod?.startDate}-${eventInput.eventPeriod?.endDate}`,
              mailerContentTitle: "리디 이벤트 반영",
              author: "서지후",
              publisher: "라온북스",
              grossSales: 24000,
              settlementAmount: 9600,
              sourceFileName: eventInput.fileName,
              sourceRowIndex: 10,
              issues: [],
            }]
          : [{
              rowId: "ridibooks-live-row-001",
              company: "raon",
              platform: "ridibooks",
              saleMonth: "2026-06",
              workTitle: "리디 기본 정산 초안",
              mailerContentTitle: "리디 기본 정산 초안",
              author: "서지후",
              publisher: "라온북스",
              grossSales: 20000,
              settlementAmount: 8000,
              sourceFileName: files[0]?.fileName ?? "calculate_1.csv",
              sourceRowIndex: 8,
              issues: [],
            }],
        issues: [],
        fileResults: files.map((file) => ({
          fileName: file.fileName,
          company: "raon" as const,
          platform: "ridibooks" as const,
          fileKind: file.fileKind,
          saleMonth: "2026-06",
          status: "success" as const,
          rowCount: 1,
          issueCount: 0,
        })),
      };
    };

    const afterBase = await applyLiveUploadMutation(
      state,
      { upload: upload!, slotKey: "base" },
      [createTextUpload("calculate_1.csv", "work,sale\nbase,1\n")],
      { now: () => "2026-06-13T09:30:00+09:00", parseBatch },
    );
    const afterFile1 = await applyLiveUploadMutation(
      afterBase,
      { upload: afterBase.uploads.find((item) => item.uploadId === "upload-raon-ridibooks")!, slotKey: "file1" },
      [createTextUpload("calculate_1 (1).csv", "work,sale\nfile1,1\n")],
      { now: () => "2026-06-13T09:31:00+09:00", parseBatch },
    );

    const afterEvent = await applyLiveUploadMutation(
      afterFile1,
      {
        upload: afterFile1.uploads.find((item) => item.uploadId === "upload-raon-ridibooks")!,
        slotKey: "event",
        eventPeriod: {
          startDate: "2026-06-01",
          endDate: "2026-06-30",
        },
      },
      [createTextUpload("calculate_date_tran_1.csv", "work,event\nevent,1\n")],
      { now: () => "2026-06-13T09:32:00+09:00", parseBatch },
    );

    expect(afterEvent.rows.filter((row) => row.platform === "ridibooks")).toEqual([
      expect.objectContaining({
        rowId: "ridibooks-live-row-003",
        workTitle: "리디 이벤트 반영 2026-06-01-2026-06-30",
      }),
    ]);
    const nextUpload = afterEvent.uploads.find((item) => item.uploadId === "upload-raon-ridibooks");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "parsed",
      fileCount: 3,
      parsedRowCount: 1,
      issueCount: 0,
      sourceFileNames: ["calculate_1.csv", "calculate_1 (1).csv", "calculate_date_tran_1.csv"],
    }));
    expect(nextUpload?.slots).toEqual(expect.arrayContaining([
      expect.objectContaining({ slotKey: "event", status: "parsed", sourceFileNames: ["calculate_date_tran_1.csv"] }),
    ]));
    expect(afterEvent.issues.filter((issue) => issue.company === "raon" && issue.platform === "ridibooks")).toEqual([]);
  });

  it("resets stale optional ridibooks slot metadata when persisted sidecar snapshots are missing", async () => {
    resetLiveUploadRuntimeState();
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-ridibooks");
    expect(upload).toBeDefined();
    expect(upload?.slots).toEqual(expect.arrayContaining([
      expect.objectContaining({ slotKey: "event", status: "parsed", fileCount: 1 }),
    ]));

    const parseBatch = ({ files }: BatchParseOrchestratorInput): BatchParseOrchestratorResult => ({
      rows: [{
        rowId: "ridibooks-live-row-recovery-001",
        company: "raon",
        platform: "ridibooks",
        saleMonth: "2026-06",
        workTitle: "리디 필수 슬롯 재계산",
        mailerContentTitle: "리디 필수 슬롯 재계산",
        author: "서지후",
        publisher: "라온북스",
        grossSales: 21000,
        settlementAmount: 8400,
        sourceFileName: files[0]?.fileName ?? "calculate_1.csv",
        sourceRowIndex: 12,
        issues: [],
      }],
      issues: [],
      fileResults: files.map((file) => ({
        fileName: file.fileName,
        company: "raon" as const,
        platform: "ridibooks" as const,
        fileKind: file.fileKind,
        saleMonth: "2026-06",
        status: "success" as const,
        rowCount: 1,
        issueCount: 0,
      })),
    });

    const afterBase = await applyLiveUploadMutation(
      state,
      { upload: upload!, slotKey: "base" },
      [createTextUpload("calculate_1.csv", "work,sale\nbase,1\n")],
      { now: () => "2026-06-13T09:40:00+09:00", parseBatch },
    );
    const afterFile1 = await applyLiveUploadMutation(
      afterBase,
      { upload: afterBase.uploads.find((item) => item.uploadId === "upload-raon-ridibooks")!, slotKey: "file1" },
      [createTextUpload("calculate_1 (1).csv", "work,sale\nfile1,1\n")],
      { now: () => "2026-06-13T09:41:00+09:00", parseBatch },
    );

    const nextUpload = afterFile1.uploads.find((item) => item.uploadId === "upload-raon-ridibooks");
    expect(nextUpload?.slots).toEqual(expect.arrayContaining([
      expect.objectContaining({
        slotKey: "event",
        status: "empty",
        fileCount: 0,
        sourceFileNames: [],
        issueCount: 0,
        lastUploadedAt: undefined,
      }),
      expect.objectContaining({
        slotKey: "mgCorrection",
        status: "empty",
        fileCount: 0,
        sourceFileNames: [],
        issueCount: 0,
        lastUploadedAt: undefined,
      }),
    ]));
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

  it("replaces the target upload slice with parsed epyrus rows and persisted metadata", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-epyrus");
    expect(upload).toBeDefined();

    const nextState = await applyLiveUploadMutation(
      state,
      { upload: upload! },
      [{
        name: "2026년04월정산내역_라온E＆M.csv",
        arrayBuffer: async () => {
          const bytes = readEpyrusSampleCsv().slice();
          return bytes.buffer as ArrayBuffer;
        },
      }],
      { now: () => "2026-06-10T00:20:00+09:00" },
    );

    const nextUpload = nextState.uploads.find((item) => item.uploadId === "upload-raon-epyrus");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "parsed",
      fileCount: 1,
      parsedRowCount: 151,
      issueCount: 0,
      sourceFileNames: ["2026년04월정산내역_라온E＆M.csv"],
      lastUploadedAt: "2026-06-10T00:20:00+09:00",
    }));

    const epyrusRows = nextState.rows.filter((row) => row.company === "raon" && row.platform === "epyrus");
    expect(epyrusRows).toHaveLength(151);
    expect(epyrusRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        workTitle: "그의 비밀 2",
        mailerContentTitle: "그의 비밀 2",
        author: "시커먼스",
        publisher: "라온E＆M",
        grossSales: 2720,
        settlementAmount: 1904,
        sourceFileName: "2026년04월정산내역_라온E＆M.csv",
      }),
    ]));

    expect(nextState.issues.filter((issue) => issue.company === "raon" && issue.platform === "epyrus")).toEqual([]);
    expect(nextState.batch.uploads).toEqual(nextState.uploads);
  });

  it("replaces the target upload slice with parsed yes24 rows and persisted metadata", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-sr-yes24");
    expect(upload).toBeDefined();

    const nextState = await applyLiveUploadMutation(
      state,
      { upload: upload! },
      [{
        name: "B2C_List_260608_153729.xlsx",
        arrayBuffer: async () => {
          const bytes = readYes24SampleWorkbook().slice();
          return bytes.buffer as ArrayBuffer;
        },
      }],
      { now: () => "2026-06-10T00:30:00+09:00" },
    );

    const nextUpload = nextState.uploads.find((item) => item.uploadId === "upload-sr-yes24");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "parsed",
      fileCount: 1,
      parsedRowCount: 15,
      issueCount: 0,
      sourceFileNames: ["B2C_List_260608_153729.xlsx"],
      lastUploadedAt: "2026-06-10T00:30:00+09:00",
    }));

    const yes24Rows = nextState.rows.filter((row) => row.company === "sr" && row.platform === "yes24");
    expect(yes24Rows).toHaveLength(15);
    expect(yes24Rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        workTitle: "나 혼자 히든농장 01권",
        mailerContentTitle: "나 혼자 히든농장 01권",
        author: "한얼23",
        publisher: "Arete",
        grossSales: 0,
        settlementAmount: 0,
        sourceFileName: "B2C_List_260608_153729.xlsx",
      }),
    ]));

    expect(nextState.issues.filter((issue) => issue.company === "sr" && issue.platform === "yes24")).toEqual([]);
    expect(nextState.batch.uploads).toEqual(nextState.uploads);
  });

  it("replaces the target upload slice with parsed aladin rows and persisted metadata", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-sr-aladin");
    expect(upload).toBeDefined();

    const nextState = await applyLiveUploadMutation(
      state,
      { upload: upload! },
      [{
        name: "sales_19835_202605.csv",
        arrayBuffer: async () => {
          const bytes = readAladinSampleCsv().slice();
          return bytes.buffer as ArrayBuffer;
        },
      }],
      { now: () => "2026-06-10T00:40:00+09:00" },
    );

    const nextUpload = nextState.uploads.find((item) => item.uploadId === "upload-sr-aladin");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "parsed",
      fileCount: 1,
      parsedRowCount: 80,
      issueCount: 0,
      sourceFileNames: ["sales_19835_202605.csv"],
      lastUploadedAt: "2026-06-10T00:40:00+09:00",
    }));

    const aladinRows = nextState.rows.filter((row) => row.company === "sr" && row.platform === "aladin");
    expect(aladinRows).toHaveLength(80);
    expect(aladinRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        workTitle: "창천마신 10",
        mailerContentTitle: "창천마신 10",
        author: "김태현",
        publisher: "라온E&M",
        grossSales: 3200,
        settlementAmount: 2240,
        sourceFileName: "sales_19835_202605.csv",
      }),
    ]));

    expect(nextState.issues.filter((issue) => issue.company === "sr" && issue.platform === "aladin")).toEqual([]);
    expect(nextState.batch.uploads).toEqual(nextState.uploads);
  });

  it("replaces the target upload slice with parsed guru_company rows and persisted metadata", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-guru-company");
    expect(upload).toBeDefined();

    const nextState = await applyLiveUploadMutation(
      state,
      { upload: upload! },
      [{
        name: "정산_공급사_202604.csv",
        arrayBuffer: async () => {
          const bytes = readGuruCompanySampleCsv().slice();
          return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        },
      }],
      { now: () => "2026-06-10T01:00:00+09:00" },
    );

    const nextUpload = nextState.uploads.find((item) => item.uploadId === "upload-raon-guru-company");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "parsed",
      fileCount: 1,
      parsedRowCount: 25,
      issueCount: 0,
      sourceFileNames: ["정산_공급사_202604.csv"],
      lastUploadedAt: "2026-06-10T01:00:00+09:00",
    }));

    const guruRows = nextState.rows.filter((row) => row.company === "raon" && row.platform === "guru_company");
    expect(guruRows).toHaveLength(25);
    expect(guruRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        workTitle: "절세무혼",
        mailerContentTitle: "절세무혼",
        author: "뤄청동",
        grossSales: 557863.9,
        settlementAmount: 390472,
        sourceFileName: "정산_공급사_202604.csv",
      }),
    ]));

    expect(nextState.issues.filter((issue) => issue.company === "raon" && issue.platform === "guru_company")).toEqual([]);
    expect(nextState.batch.uploads).toEqual(nextState.uploads);
  });

  it("replaces the target upload slice with parsed kyobo rows and persisted metadata", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-sr-kyobo");
    expect(upload).toBeDefined();

    const nextState = await applyLiveUploadMutation(
      state,
      { upload: upload! },
      [{
        name: "정산내역조회.xlsx",
        arrayBuffer: async () => {
          const bytes = readKyoboSampleWorkbook().slice();
          return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        },
      }],
      { now: () => "2026-06-10T01:30:00+09:00" },
    );

    const nextUpload = nextState.uploads.find((item) => item.uploadId === "upload-sr-kyobo");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "parsed",
      fileCount: 1,
      parsedRowCount: 46,
      issueCount: 0,
      sourceFileNames: ["정산내역조회.xlsx"],
      lastUploadedAt: "2026-06-10T01:30:00+09:00",
    }));

    const kyoboRows = nextState.rows.filter((row) => row.company === "sr" && row.platform === "kyobo");
    expect(kyoboRows).toHaveLength(46);
    expect(kyoboRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        workTitle: "1챕터의 고인물. 6",
        mailerContentTitle: "1챕터의 고인물. 6",
        author: "산호초",
        publisher: "Arete",
        grossSales: 900,
        settlementAmount: 450,
        sourceFileName: "정산내역조회.xlsx",
      }),
    ]));

    expect(nextState.issues.filter((issue) => issue.company === "sr" && issue.platform === "kyobo")).toEqual([]);
    expect(nextState.batch.uploads).toEqual(nextState.uploads);
  });

  it("replaces the target upload slice with parsed mootoon rows and persisted metadata", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-mootoon");
    expect(upload).toBeDefined();

    const nextState = await applyLiveUploadMutation(
      state,
      { upload: upload! },
      [{
        name: "라온이엔엠[2026-05]__소설__작품별내역__무툰.xlsx",
        arrayBuffer: async () => {
          const bytes = readMootoonSampleWorkbook().slice();
          return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        },
      }],
      { now: () => "2026-06-10T01:30:00+09:00" },
    );

    const nextUpload = nextState.uploads.find((item) => item.uploadId === "upload-raon-mootoon");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "parsed",
      fileCount: 1,
      sourceFileNames: ["라온이엔엠[2026-05]__소설__작품별내역__무툰.xlsx"],
      parsedRowCount: 194,
      issueCount: 0,
      lastUploadedAt: "2026-06-10T01:30:00+09:00",
    }));

    const mootoonRows = nextState.rows.filter((row) => row.company === "raon" && row.platform === "mootoon");
    expect(mootoonRows).toHaveLength(194);
    expect(mootoonRows[0]).toEqual(expect.objectContaining({
      workTitle: "강호돌파(江湖突破)",
      mailerContentTitle: "강호돌파(江湖突破)",
      author: "손연우",
      grossSales: 4500,
      settlementAmount: 3150,
      sourceFileName: "라온이엔엠[2026-05]__소설__작품별내역__무툰.xlsx",
      sourceRowIndex: 2,
    }));
    expect(nextState.issues.filter((issue) => issue.company === "raon" && issue.platform === "mootoon")).toEqual([]);
  });

  it("replaces the target upload slice with parsed novelpia rows and persisted metadata", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-novelpia");
    expect(upload).toBeDefined();

    const nextState = await applyLiveUploadMutation(
      state,
      { upload: upload! },
      [{
        name: "일별 정산.xls",
        arrayBuffer: async () => {
          const bytes = readNovelpiaSampleHtmlXls().slice();
          return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        },
      }],
      { now: () => "2026-06-10T02:00:00+09:00" },
    );

    const nextUpload = nextState.uploads.find((item) => item.uploadId === "upload-raon-novelpia");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "parsed",
      fileCount: 1,
      parsedRowCount: 116,
      issueCount: 0,
      sourceFileNames: ["일별 정산.xls"],
      lastUploadedAt: "2026-06-10T02:00:00+09:00",
    }));

    const novelpiaRows = nextState.rows.filter((row) => row.company === "raon" && row.platform === "novelpia");
    expect(novelpiaRows).toHaveLength(116);
    expect(novelpiaRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        workTitle: "객잔 주인이 요리를 너무 잘함",
        mailerContentTitle: "객잔 주인이 요리를 너무 잘함",
        author: "해씨",
        grossSales: 3800,
        settlementAmount: 2394,
        sourceFileName: "일별 정산.xls",
        sourceRowIndex: 2,
      }),
    ]));

    expect(nextState.issues.filter((issue) => issue.company === "raon" && issue.platform === "novelpia")).toEqual([]);
    expect(nextState.batch.uploads).toEqual(nextState.uploads);
  });

  it("replaces both Onestore company slices through the shared live upload card", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-shared-onestore");
    expect(upload).toBeDefined();
    const previousKyoboRows = state.rows.filter((row) => row.company === "sr" && row.platform === "kyobo");

    const nextState = await applyLiveUploadMutation(
      state,
      { upload: upload! },
      [{
        name: "정산내역_20260608_163327.xlsx",
        arrayBuffer: async () => {
          const bytes = readOnestoreSampleWorkbook().slice();
          return bytes.buffer as ArrayBuffer;
        },
      }],
      { now: () => "2026-06-12T11:00:00+09:00" },
    );

    const nextUpload = nextState.uploads.find((item) => item.uploadId === "upload-shared-onestore");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "parsed",
      fileCount: 1,
      parsedRowCount: 13209,
      issueCount: 0,
      sourceFileNames: ["정산내역_20260608_163327.xlsx"],
      lastUploadedAt: "2026-06-12T11:00:00+09:00",
    }));

    const onestoreRows = nextState.rows.filter((row) => row.platform === "onestore");
    expect(onestoreRows).toHaveLength(13209);
    expect(onestoreRows.some((row) => row.company === "sr" && row.workTitle === "레이드 커맨더 4권" && row.settlementAmount === 2016)).toBe(true);
    expect(onestoreRows.some((row) => row.company === "raon")).toBe(true);
    expect(nextState.rows.filter((row) => row.company === "sr" && row.platform === "kyobo")).toEqual(previousKyoboRows);
    expect(nextState.issues.filter((issue) => issue.platform === "onestore")).toEqual([]);
    expect(nextState.batch.uploads).toEqual(nextState.uploads);
  });

  it("preserves committed Onestore rows when the shared live upload fails validation", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-shared-onestore");
    expect(upload).toBeDefined();

    const parsedState = await applyLiveUploadMutation(
      state,
      { upload: upload! },
      [{
        name: "정산내역_20260608_163327.xlsx",
        arrayBuffer: async () => {
          const bytes = readOnestoreSampleWorkbook().slice();
          return bytes.buffer as ArrayBuffer;
        },
      }],
      { now: () => "2026-06-12T11:01:00+09:00" },
    );

    const failedState = await applyLiveUploadMutation(
      parsedState,
      { upload: parsedState.uploads.find((item) => item.uploadId === "upload-shared-onestore")! },
      [{
        name: "bad.csv",
        arrayBuffer: async () => new ArrayBuffer(0),
      }],
      { now: () => "2026-06-12T11:02:00+09:00" },
    );

    expect(failedState.rows.filter((row) => row.platform === "onestore")).toEqual(parsedState.rows.filter((row) => row.platform === "onestore"));
    const nextUpload = failedState.uploads.find((item) => item.uploadId === "upload-shared-onestore");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "error",
      fileCount: 1,
      parsedRowCount: 13209,
      sourceFileNames: ["bad.csv"],
      lastUploadedAt: "2026-06-12T11:02:00+09:00",
    }));
    expect(failedState.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        company: "raon",
        platform: "onestore",
        issueType: "parse_error",
        sourceFileName: "bad.csv",
        message: expect.stringContaining(".xlsx만 허용"),
      }),
    ]));
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

  it("stages a series general slot upload until all 3+3 files are ready", async () => {
    const state = createSeedAppState();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-series");
    expect(upload).toBeDefined();
    const previousRows = state.rows.filter((row) => row.company === "raon" && row.platform === "series");

    const nextState = await applyLiveUploadMutation(
      state,
      { upload: upload!, slotKey: "seriesGeneral" },
      [
        createSeriesHtmlFile("series-general-new-1.xls"),
        createSeriesHtmlFile("series-general-new-2.xls"),
        createSeriesHtmlFile("series-general-new-3.xls"),
      ],
      { now: () => "2026-06-12T09:00:00+09:00" },
    );

    const nextRows = nextState.rows.filter((row) => row.company === "raon" && row.platform === "series");
    expect(nextRows).toEqual(previousRows);

    const nextUpload = nextState.uploads.find((item) => item.uploadId === "upload-raon-series");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "error",
      fileCount: 5,
      parsedRowCount: previousRows.length,
      sourceFileNames: [
        "series-general-new-1.xls",
        "series-general-new-2.xls",
        "series-general-new-3.xls",
        "series-app-1.xls",
        "series-app-2.xls",
      ],
    }));
    expect(nextUpload?.slots).toEqual(expect.arrayContaining([
      expect.objectContaining({
        slotKey: "seriesGeneral",
        status: "uploaded",
        sourceFileNames: ["series-general-new-1.xls", "series-general-new-2.xls", "series-general-new-3.xls"],
      }),
    ]));
    expect(nextState.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        company: "raon",
        platform: "series",
        issueType: "parse_error",
        message: expect.stringContaining("시리즈 3+3 입력이 모두 남아 있지 않아 재계산할 수 없습니다"),
      }),
    ]));
  });

  it("reruns series grouped parsing when both 3-file slots are uploaded", async () => {
    const state = createEmptySeriesUploadDraft();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-series");
    expect(upload).toBeDefined();

    const parseBatch = ({ files }: BatchParseOrchestratorInput): BatchParseOrchestratorResult => ({
      rows: files.some((file) => file.slot === "app")
        ? [{
            rowId: "series-live-row-002",
            company: "raon",
            platform: "series",
            saleMonth: "2026-06",
            workTitle: "시리즈 앱 반영",
            mailerContentTitle: "시리즈 앱 반영",
            author: "서지후",
            grossSales: 21000,
            settlementAmount: 8400,
            sourceFileName: "series-general-parse-1.xls",
            sourceRowIndex: 12,
            issues: [],
          }]
        : [{
            rowId: "series-live-row-001",
            company: "raon",
            platform: "series",
            saleMonth: "2026-06",
            workTitle: "시리즈 일반 초안",
            mailerContentTitle: "시리즈 일반 초안",
            author: "서지후",
            grossSales: 20000,
            settlementAmount: 8000,
            sourceFileName: "series-general-parse-1.xls",
            sourceRowIndex: 11,
            issues: [],
          }],
      issues: [],
      fileResults: files.map((file) => ({
        fileName: file.fileName,
        company: "raon" as const,
        platform: "series" as const,
        fileKind: "html_xls" as const,
        saleMonth: "2026-06",
        status: "success" as const,
        rowCount: 1,
        issueCount: 0,
      })),
    });

    const afterGeneral = await applyLiveUploadMutation(
      state,
      { upload: state.uploads.find((item) => item.uploadId === "upload-raon-series")!, slotKey: "seriesGeneral" },
      [
        createSeriesHtmlFile("series-general-parse-1.xls"),
        createSeriesHtmlFile("series-general-parse-2.xls"),
        createSeriesHtmlFile("series-general-parse-3.xls"),
      ],
      { now: () => "2026-06-12T09:10:00+09:00", parseBatch },
    );

    const afterApp = await applyLiveUploadMutation(
      afterGeneral,
      { upload: afterGeneral.uploads.find((item) => item.uploadId === "upload-raon-series")!, slotKey: "seriesApp" },
      [
        createSeriesHtmlFile("series-app-parse-1.xls"),
        createSeriesHtmlFile("series-app-parse-2.xls"),
        createSeriesHtmlFile("series-app-parse-3.xls"),
      ],
      { now: () => "2026-06-12T09:12:00+09:00", parseBatch },
    );

    const seriesRows = afterApp.rows.filter((row) => row.company === "raon" && row.platform === "series");
    expect(seriesRows).toEqual([
      expect.objectContaining({ rowId: "series-live-row-002", workTitle: "시리즈 앱 반영" }),
    ]);

    const nextUpload = afterApp.uploads.find((item) => item.uploadId === "upload-raon-series");
    expect(nextUpload).toEqual(expect.objectContaining({
      status: "parsed",
      fileCount: 6,
      parsedRowCount: 1,
      issueCount: 0,
      sourceFileNames: [
        "series-general-parse-1.xls",
        "series-general-parse-2.xls",
        "series-general-parse-3.xls",
        "series-app-parse-1.xls",
        "series-app-parse-2.xls",
        "series-app-parse-3.xls",
      ],
    }));
    expect(nextUpload?.slots).toEqual(expect.arrayContaining([
      expect.objectContaining({
        slotKey: "seriesGeneral",
        status: "parsed",
        fileCount: 3,
      }),
      expect.objectContaining({
        slotKey: "seriesApp",
        status: "parsed",
        fileCount: 3,
      }),
    ]));
  });

  it("reruns joara grouped parsing when settlementDetail and workSettlement are uploaded", async () => {
    const state = createEmptyJoaraUploadDraft();
    const upload = state.uploads.find((item) => item.uploadId === "upload-raon-joara");
    expect(upload).toBeDefined();

    const afterDetail = await applyLiveUploadMutation(
      state,
      { upload: upload!, slotKey: "settlementDetail" },
      [{
        name: "정산 상세리스트_2026-5.csv",
        arrayBuffer: async () => readJoaraSettlementDetailSampleCsv().slice().buffer as ArrayBuffer,
      }],
      { now: () => "2026-06-14T09:00:00+09:00" },
    );

    const stagedUpload = afterDetail.uploads.find((item) => item.uploadId === "upload-raon-joara");
    expect(stagedUpload).toEqual(expect.objectContaining({
      fileCount: 1,
      sourceFileNames: ["정산 상세리스트_2026-5.csv"],
    }));
    expect(stagedUpload?.slots).toEqual(expect.arrayContaining([
      expect.objectContaining({
        slotKey: "settlementDetail",
        status: "uploaded",
        sourceFileNames: ["정산 상세리스트_2026-5.csv"],
      }),
      expect.objectContaining({
        slotKey: "workSettlement",
        status: "empty",
      }),
    ]));
    expect(afterDetail.rows.filter((row) => row.platform === "joara")).toEqual([]);

    const afterWork = await applyLiveUploadMutation(
      afterDetail,
      { upload: afterDetail.uploads.find((item) => item.uploadId === "upload-raon-joara")!, slotKey: "workSettlement" },
      [{
        name: "작품별 정산리스트_2026-5.csv",
        arrayBuffer: async () => readJoaraWorkSettlementSampleCsv().slice().buffer as ArrayBuffer,
      }],
      { now: () => "2026-06-14T09:05:00+09:00" },
    );

    const joaraRows = afterWork.rows.filter((row) => row.company === "raon" && row.platform === "joara");
    expect(joaraRows).toEqual([]);

    const joaraIssues = afterWork.issues.filter((issue) => issue.company === "raon" && issue.platform === "joara");
    expect(joaraIssues.length).toBeGreaterThan(0);

    const nextUpload = afterWork.uploads.find((item) => item.uploadId === "upload-raon-joara");
    expect(nextUpload).toEqual(expect.objectContaining({
      fileCount: 2,
      parsedRowCount: 0,
      issueCount: joaraIssues.length,
      sourceFileNames: ["정산 상세리스트_2026-5.csv", "작품별 정산리스트_2026-5.csv"],
    }));
    expect(nextUpload?.slots).toEqual(expect.arrayContaining([
      expect.objectContaining({
        slotKey: "settlementDetail",
        fileCount: 1,
        sourceFileNames: ["정산 상세리스트_2026-5.csv"],
      }),
      expect.objectContaining({
        slotKey: "workSettlement",
        fileCount: 1,
        sourceFileNames: ["작품별 정산리스트_2026-5.csv"],
      }),
    ]));
    expect(afterWork.rows.some((row) => row.company === "raon" && row.platform === "joara")).toBe(false);
  });
});
