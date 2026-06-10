import { readFileSync } from "node:fs";
import * as path from "node:path";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";
import { AppShell } from "./components/AppShell";
import type { BatchParseOrchestratorInput, BatchParseOrchestratorResult } from "./orchestrators/batchParseOrchestrator";
import {
  APP_STATE_STORAGE_KEY,
  createSeedAppState,
  saveAppDraftState,
} from "./state/appState";
import { resetLiveUploadRuntimeState } from "./state/uploadMutation";

afterEach(() => {
  cleanup();
  resetLiveUploadRuntimeState();
  window.localStorage.removeItem(APP_STATE_STORAGE_KEY);
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

function createSeriesHtmlFile(name: string): File {
  const html = `<table><tr><td>${name}</td></tr></table>`;
  const bytes = new TextEncoder().encode(html).buffer;
  const file = new File([bytes], name, { type: "application/vnd.ms-excel" });
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => bytes.slice(0),
  });
  return file;
}

function createTextFile(name: string, content: string, type = "text/csv"): File {
  const bytes = new TextEncoder().encode(content).buffer;
  const file = new File([bytes], name, { type });
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => bytes.slice(0),
  });
  return file;
}

function createEmptySeriesDraft() {
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

function createEmptyRidibooksDraft() {
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

function createExportBlockedDraft() {
  const state = createSeedAppState();
  state.rows = state.rows.map((row, index) => (
    index === 0
      ? {
          ...row,
          mailerContentTitle: "",
        }
      : row
  ));
  state.selectedRowId = state.rows[0]?.rowId ?? "";
  return state;
}

describe("AutoSettlement UI shell", () => {
  it("renders the batch-centered MVP workflow with grouped upload cards and export status", () => {
    render(<App />);

    expect(screen.getByText("2026-06 정산 Batch")).toBeInTheDocument();
    expect(screen.getByText("배치 중심 4단계 흐름")).toBeInTheDocument();
    expect(screen.getAllByText("시리즈").length).toBeGreaterThan(0);
    expect(screen.getAllByText("필수 6개: 일반 3개 + 앱 3개").length).toBeGreaterThan(0);
    expect(screen.getByText("정산 파일")).toBeInTheDocument();
    expect(screen.getByText("작가 보정")).toBeInTheDocument();
    expect(screen.getByText("기본 정산")).toBeInTheDocument();
    expect(screen.getByText("정산 상세리스트")).toBeInTheDocument();
    expect(screen.getAllByText(/batch 전체 4개 파일/).length).toBeGreaterThan(0);
    expect(screen.getByText("라온_메일러_발송용.xlsx")).toBeInTheDocument();
    expect(screen.getByText("에스알_정산_통합검수용.xlsx")).toBeInTheDocument();
  });

  it("hydrates the selected review row from persisted localStorage state", () => {
    const state = createSeedAppState();
    state.selectedRowId = "row-005";
    window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state));

    render(<App />);

    expect(screen.getByRole("heading", { name: "달빛 회계법" })).toBeInTheDocument();
  });

  it("resets the persisted draft back to the seed state", () => {
    const state = createSeedAppState();
    state.selectedRowId = "row-005";
    window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state));

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "초기 상태로 리셋" }));

    expect(screen.getByRole("heading", { name: "검은 별의 서점(app)" })).toBeInTheDocument();
  });

  it("shows blocked export state when persisted rows fail pre-export validation", () => {
    saveAppDraftState(createExportBlockedDraft(), window.localStorage);

    render(<App />);

    expect(screen.getByText(/export blocked/i)).toBeInTheDocument();
    expect(screen.getByText("0/4 ready")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /download/i })).not.toBeInTheDocument();
  });

  it("filters review rows through the actual app-shell controls", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("회사 필터"), { target: { value: "sr" } });
    expect(screen.queryByText("밤의 계산서")).not.toBeInTheDocument();
    expect(screen.getAllByText("달빛 회계법").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("이슈 필터"), { target: { value: "with_issues" } });
    expect(screen.queryByText("파란 항구의 기록(app)")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "달빛 회계법" })).toBeInTheDocument();
    expect(screen.getByText("현재 필터 결과 1행 / 전체 5행 · 이슈 연결 행 1건 · 검수 확정 0건")).toBeInTheDocument();
    expect(screen.getByText("이슈 행")).toBeInTheDocument();
  });

  it("confirms the selected review row and persists the review decision", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "이 행 검수 확정" }));

    await waitFor(() => {
      expect(screen.getAllByText("검수 확정").length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: "검수 확정 해제" })).toBeInTheDocument();
      expect(screen.getByText(/검수 확정 1건/)).toBeInTheDocument();

      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      expect(parsedDraft.reviewDecisions).toEqual([
        expect.objectContaining({
          rowId: "row-002",
          status: "confirmed",
        }),
      ]);
    });
  });

  it("parses a real misterblue workbook through the live upload card and persists the new draft", async () => {
    render(<App />);

    const input = screen.getByTestId("upload-input-upload-sr-misterblue") as HTMLInputElement;
    const bytes = readMisterblueSampleWorkbook().slice();
    const fileBytes = bytes.buffer as ArrayBuffer;
    const file = new File(
      [fileBytes],
      "작품별정산_2026-04-01_2026-04-30.xlsx",
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    );
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => fileBytes.slice(0),
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      const liveUpload = parsedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-sr-misterblue");
      expect(liveUpload).toEqual(expect.objectContaining({
        status: "parsed",
        fileCount: 1,
        parsedRowCount: 198,
        sourceFileNames: ["작품별정산_2026-04-01_2026-04-30.xlsx"],
      }));
    });

    expect(screen.getByText("작품별정산_2026-04-01_2026-04-30.xlsx")).toBeInTheDocument();
  });

  it("parses a real panmurim workbook through the live upload card and persists the new draft", async () => {
    render(<App />);

    const input = screen.getByTestId("upload-input-upload-raon-panmurim") as HTMLInputElement;
    const bytes = readPanmurimSampleWorkbook().slice();
    const fileBytes = bytes.buffer as ArrayBuffer;
    const file = new File(
      [fileBytes],
      "（주）라온이앤엠_2026년 5월.xlsx",
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    );
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => fileBytes.slice(0),
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      const liveUpload = parsedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-raon-panmurim");
      expect(liveUpload).toEqual(expect.objectContaining({
        status: "parsed",
        fileCount: 1,
        parsedRowCount: 354,
        sourceFileNames: ["（주）라온이앤엠_2026년 5월.xlsx"],
      }));
    });

    expect(screen.getByText("（주）라온이앤엠_2026년 5월.xlsx")).toBeInTheDocument();
  });

  it("parses a real bookcube workbook through the live upload card and persists the new draft", async () => {
    render(<App />);

    const input = screen.getByTestId("upload-input-upload-raon-bookcube") as HTMLInputElement;
    const bytes = readBookcubeSampleWorkbook().slice();
    const fileBytes = bytes.buffer as ArrayBuffer;
    const file = new File(
      [fileBytes],
      "북큐브 상세매출 2026-5~2026-5 (1).xlsx",
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    );
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => fileBytes.slice(0),
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      const liveUpload = parsedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-raon-bookcube");
      expect(liveUpload).toEqual(expect.objectContaining({
        status: "parsed",
        fileCount: 1,
        parsedRowCount: 5,
        sourceFileNames: ["북큐브 상세매출 2026-5~2026-5 (1).xlsx"],
      }));
    });

    expect(screen.getByText("북큐브 상세매출 2026-5~2026-5 (1).xlsx")).toBeInTheDocument();
  });

  it("parses a real epyrus csv through the live upload card and persists the new draft", async () => {
    render(<App />);

    const input = screen.getByTestId("upload-input-upload-raon-epyrus") as HTMLInputElement;
    const bytes = readEpyrusSampleCsv().slice();
    const fileBytes = bytes.buffer as ArrayBuffer;
    const file = new File(
      [fileBytes],
      "2026년04월정산내역_라온E＆M.csv",
      { type: "text/csv" },
    );
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => fileBytes.slice(0),
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      const liveUpload = parsedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-raon-epyrus");
      expect(liveUpload).toEqual(expect.objectContaining({
        status: "parsed",
        fileCount: 1,
        parsedRowCount: 151,
        sourceFileNames: ["2026년04월정산내역_라온E＆M.csv"],
      }));
    });

    expect(screen.getByText("2026년04월정산내역_라온E＆M.csv")).toBeInTheDocument();
  });

  it("parses a real yes24 workbook through the live upload card and persists the new draft", async () => {
    render(<App />);

    const input = screen.getByTestId("upload-input-upload-sr-yes24") as HTMLInputElement;
    const bytes = readYes24SampleWorkbook().slice();
    const fileBytes = bytes.buffer as ArrayBuffer;
    const file = new File(
      [fileBytes],
      "B2C_List_260608_153729.xlsx",
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    );
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => fileBytes.slice(0),
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      const liveUpload = parsedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-sr-yes24");
      expect(liveUpload).toEqual(expect.objectContaining({
        status: "parsed",
        fileCount: 1,
        parsedRowCount: 15,
        sourceFileNames: ["B2C_List_260608_153729.xlsx"],
      }));
    });

    expect(screen.getByText("B2C_List_260608_153729.xlsx")).toBeInTheDocument();
  });

  it("parses a real aladin csv through the live upload card and persists the new draft", async () => {
    render(<App />);

    const input = screen.getByTestId("upload-input-upload-sr-aladin") as HTMLInputElement;
    const bytes = readAladinSampleCsv().slice();
    const fileBytes = bytes.buffer as ArrayBuffer;
    const file = new File(
      [fileBytes],
      "sales_19835_202605.csv",
      { type: "text/csv" },
    );
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => fileBytes.slice(0),
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      const liveUpload = parsedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-sr-aladin");
      expect(liveUpload).toEqual(expect.objectContaining({
        status: "parsed",
        fileCount: 1,
        parsedRowCount: 80,
        sourceFileNames: ["sales_19835_202605.csv"],
      }));
    });

    expect(screen.getByText("sales_19835_202605.csv")).toBeInTheDocument();
  });

  it("parses a real guru_company csv through the live upload card and persists the new draft", async () => {
    render(<App />);

    const input = screen.getByTestId("upload-input-upload-raon-guru-company") as HTMLInputElement;
    const bytes = readGuruCompanySampleCsv().slice();
    const fileBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const file = new File(
      [fileBytes],
      "정산_공급사_202604.csv",
      { type: "text/csv" },
    );
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => fileBytes.slice(0),
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      const liveUpload = parsedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-raon-guru-company");
      expect(liveUpload).toEqual(expect.objectContaining({
        status: "parsed",
        fileCount: 1,
        parsedRowCount: 25,
        sourceFileNames: ["정산_공급사_202604.csv"],
      }));
    });

    expect(screen.getByText("정산_공급사_202604.csv")).toBeInTheDocument();
  });

  it("parses a real kyobo workbook through the live upload card and persists the new draft", async () => {
    render(<App />);

    const input = screen.getByTestId("upload-input-upload-sr-kyobo") as HTMLInputElement;
    const bytes = readKyoboSampleWorkbook().slice();
    const fileBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const file = new File(
      [fileBytes],
      "정산내역조회.xlsx",
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    );
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => fileBytes.slice(0),
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      const liveUpload = parsedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-sr-kyobo");
      expect(liveUpload).toEqual(expect.objectContaining({
        status: "parsed",
        fileCount: 1,
        parsedRowCount: 46,
        sourceFileNames: ["정산내역조회.xlsx"],
      }));
    });

    expect(screen.getByText("정산내역조회.xlsx")).toBeInTheDocument();
  });

  it("parses a real mootoon workbook through the live upload card and persists the new draft", async () => {
    render(<App />);

    const input = screen.getByTestId("upload-input-upload-raon-mootoon") as HTMLInputElement;
    const bytes = readMootoonSampleWorkbook().slice();
    const fileBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const file = new File(
      [fileBytes],
      "라온이엔엠[2026-05]__소설__작품별내역__무툰.xlsx",
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    );
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => fileBytes,
    });

    fireEvent.change(input, {
      target: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByText("라온이엔엠[2026-05]__소설__작품별내역__무툰.xlsx")).toBeInTheDocument();
    });

    const persisted = JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY) ?? "null");
    const upload = persisted.uploads.find((item: { uploadId: string }) => item.uploadId === "upload-raon-mootoon");
    expect(upload).toEqual(expect.objectContaining({
      status: "parsed",
      fileCount: 1,
      sourceFileNames: ["라온이엔엠[2026-05]__소설__작품별내역__무툰.xlsx"],
      parsedRowCount: 194,
      issueCount: 0,
    }));
    expect(
      persisted.rows.some((row: { platform: string; company: string; workTitle: string; settlementAmount: number }) => (
        row.platform === "mootoon"
        && row.company === "raon"
        && row.workTitle === "강호돌파(江湖突破)"
        && row.settlementAmount === 3150
      )),
    ).toBe(true);
  });

  it("parses a real novelpia html-xls through the live upload card and persists the new draft", async () => {
    render(<App />);

    const input = screen.getByTestId("upload-input-upload-raon-novelpia") as HTMLInputElement;
    const bytes = readNovelpiaSampleHtmlXls().slice();
    const fileBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const file = new File(
      [fileBytes],
      "일별 정산.xls",
      { type: "application/vnd.ms-excel" },
    );
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => fileBytes.slice(0),
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      const liveUpload = parsedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-raon-novelpia");
      expect(liveUpload).toEqual(expect.objectContaining({
        status: "parsed",
        fileCount: 1,
        parsedRowCount: 116,
        sourceFileNames: ["일별 정산.xls"],
      }));
    });

    expect(screen.getByText("일별 정산.xls")).toBeInTheDocument();
  });

  it("parses a real Onestore workbook through the shared live upload card and persists both company slices", async () => {
    render(<App />);

    const input = screen.getByTestId("upload-input-upload-shared-onestore") as HTMLInputElement;
    const bytes = readOnestoreSampleWorkbook().slice();
    const fileBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const file = new File(
      [fileBytes],
      "정산내역_20260608_163327.xlsx",
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    );
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => fileBytes.slice(0),
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      const liveUpload = parsedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-shared-onestore");
      expect(liveUpload).toEqual(expect.objectContaining({
        status: "parsed",
        fileCount: 1,
        parsedRowCount: 13209,
        sourceFileNames: ["정산내역_20260608_163327.xlsx"],
      }));
      expect(parsedDraft.rows.some((row: { platform: string; company: string; workTitle: string; settlementAmount: number }) => (
        row.platform === "onestore"
        && row.company === "sr"
        && row.workTitle === "레이드 커맨더 4권"
        && row.settlementAmount === 2016
      ))).toBe(true);
      expect(parsedDraft.rows.some((row: { platform: string; company: string }) => row.platform === "onestore" && row.company === "raon")).toBe(true);
    });

    expect(screen.getByText("정산내역_20260608_163327.xlsx")).toBeInTheDocument();
  });

  it("persists munpia grouped slot uploads through the browser shell", async () => {
    render(
      <AppShell
        uploadMutationDependencies={{
          now: () => "2026-06-11T09:30:00+09:00",
          parseBatch: ({ files }: BatchParseOrchestratorInput): BatchParseOrchestratorResult => ({
            rows: files.some((file) => file.slot === "authorCorrection")
              ? [{
                  rowId: "munpia-app-shell-row-002",
                  company: "raon",
                  platform: "munpia",
                  saleMonth: "2026-06",
                  workTitle: "문피아 쉘 보정 반영",
                  mailerContentTitle: "문피아 쉘 보정 반영",
                  author: "서지후",
                  grossSales: 15000,
                  settlementAmount: 6000,
                  sourceFileName: "munpia-shell.xlsx",
                  sourceRowIndex: 9,
                  issues: [],
                }]
              : [{
                  rowId: "munpia-app-shell-row-001",
                  company: "raon",
                  platform: "munpia",
                  saleMonth: "2026-06",
                  workTitle: "문피아 쉘 정산 초안",
                  mailerContentTitle: "문피아 쉘 정산 초안",
                  author: "서지후",
                  grossSales: 11000,
                  settlementAmount: 4400,
                  sourceFileName: "munpia-shell.xlsx",
                  sourceRowIndex: 8,
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
          }),
        }}
      />,
    );

    const settlementInput = screen.getByTestId("upload-input-upload-raon-munpia-settlement") as HTMLInputElement;
    const settlementBytes = new Uint8Array([1, 2, 3]).buffer;
    const settlementFile = new File(
      [settlementBytes],
      "munpia-shell.xlsx",
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    );
    Object.defineProperty(settlementFile, "arrayBuffer", {
      value: async () => settlementBytes.slice(0),
    });

    fireEvent.change(settlementInput, { target: { files: [settlementFile] } });

    await waitFor(() => {
      const persistedDraft = JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY)!);
      const liveUpload = persistedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-raon-munpia");
      expect(liveUpload).toEqual(expect.objectContaining({
        status: "parsed",
        fileCount: 1,
        parsedRowCount: 1,
        sourceFileNames: ["munpia-shell.xlsx"],
      }));
    });

    const correctionInput = screen.getByTestId("upload-input-upload-raon-munpia-author-correction") as HTMLInputElement;
    const correctionBytes = new TextEncoder().encode("작품,작가\nA,B\n").buffer;
    const correctionFile = new File([correctionBytes], "munpia-shell-correction.csv", { type: "text/csv" });
    Object.defineProperty(correctionFile, "arrayBuffer", {
      value: async () => correctionBytes.slice(0),
    });

    fireEvent.change(correctionInput, { target: { files: [correctionFile] } });

    await waitFor(() => {
      const persistedDraft = JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY)!);
      const liveUpload = persistedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-raon-munpia");
      expect(liveUpload).toEqual(expect.objectContaining({
        status: "parsed",
        fileCount: 2,
        parsedRowCount: 1,
        sourceFileNames: ["munpia-shell.xlsx", "munpia-shell-correction.csv"],
      }));
      expect(liveUpload.slots).toEqual(expect.arrayContaining([
        expect.objectContaining({
          slotKey: "settlement",
          status: "parsed",
          sourceFileNames: ["munpia-shell.xlsx"],
        }),
        expect.objectContaining({
          slotKey: "authorCorrection",
          status: "parsed",
          sourceFileNames: ["munpia-shell-correction.csv"],
        }),
      ]));
      expect(persistedDraft.rows).toEqual(expect.arrayContaining([
        expect.objectContaining({ rowId: "munpia-app-shell-row-002", workTitle: "문피아 쉘 보정 반영" }),
      ]));
    });
  });

  it("persists series grouped 3+3 uploads through the browser shell", async () => {
    saveAppDraftState(createEmptySeriesDraft(), window.localStorage);

    render(
      <AppShell
        uploadMutationDependencies={{
          now: () => "2026-06-12T10:00:00+09:00",
          parseBatch: ({ files }: BatchParseOrchestratorInput): BatchParseOrchestratorResult => ({
            rows: files.some((file) => file.slot === "app")
              ? [{
                  rowId: "series-app-shell-row-002",
                  company: "raon",
                  platform: "series",
                  saleMonth: "2026-06",
                  workTitle: "시리즈 3+3 반영",
                  mailerContentTitle: "시리즈 3+3 반영",
                  author: "서지후",
                  grossSales: 32000,
                  settlementAmount: 12800,
                  sourceFileName: "series-general-shell-1.xls",
                  sourceRowIndex: 14,
                  issues: [],
                }]
              : [{
                  rowId: "series-app-shell-row-001",
                  company: "raon",
                  platform: "series",
                  saleMonth: "2026-06",
                  workTitle: "시리즈 일반 초안",
                  mailerContentTitle: "시리즈 일반 초안",
                  author: "서지후",
                  grossSales: 30000,
                  settlementAmount: 12000,
                  sourceFileName: "series-general-shell-1.xls",
                  sourceRowIndex: 13,
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
          }),
        }}
      />,
    );

    const generalInput = screen.getByTestId("upload-input-upload-raon-series-general") as HTMLInputElement;
    const appInput = screen.getByTestId("upload-input-upload-raon-series-app") as HTMLInputElement;

    fireEvent.change(generalInput, {
      target: {
        files: [
          createSeriesHtmlFile("series-general-shell-1.xls"),
          createSeriesHtmlFile("series-general-shell-2.xls"),
          createSeriesHtmlFile("series-general-shell-3.xls"),
        ],
      },
    });

    await waitFor(() => {
      const persistedDraft = JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY)!);
      const liveUpload = persistedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-raon-series");
      expect(liveUpload).toEqual(expect.objectContaining({
        status: "error",
        fileCount: 3,
        parsedRowCount: 0,
        issueCount: 1,
        sourceFileNames: [
          "series-general-shell-1.xls",
          "series-general-shell-2.xls",
          "series-general-shell-3.xls",
        ],
      }));
    });

    fireEvent.change(appInput, {
      target: {
        files: [
          createSeriesHtmlFile("series-app-shell-1.xls"),
          createSeriesHtmlFile("series-app-shell-2.xls"),
          createSeriesHtmlFile("series-app-shell-3.xls"),
        ],
      },
    });

    await waitFor(() => {
      const persistedDraft = JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY)!);
      const liveUpload = persistedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-raon-series");
      expect(liveUpload).toEqual(expect.objectContaining({
        status: "parsed",
        fileCount: 6,
        parsedRowCount: 1,
        issueCount: 0,
        sourceFileNames: [
          "series-general-shell-1.xls",
          "series-general-shell-2.xls",
          "series-general-shell-3.xls",
          "series-app-shell-1.xls",
          "series-app-shell-2.xls",
          "series-app-shell-3.xls",
        ],
      }));
      expect(liveUpload.slots).toEqual(expect.arrayContaining([
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
      expect(persistedDraft.rows).toEqual(expect.arrayContaining([
        expect.objectContaining({ rowId: "series-app-shell-row-002", workTitle: "시리즈 3+3 반영" }),
      ]));
    });
  });

  it("persists ridibooks event uploads with eventPeriod through the browser shell", async () => {
    saveAppDraftState(createEmptyRidibooksDraft(), window.localStorage);

    render(
      <AppShell
        uploadMutationDependencies={{
          now: () => "2026-06-13T10:00:00+09:00",
          parseBatch: ({ files }: BatchParseOrchestratorInput): BatchParseOrchestratorResult => {
            const eventInput = files.find((file) => file.slot === "event");
            return {
              rows: eventInput
                ? [{
                    rowId: "ridibooks-app-shell-row-003",
                    company: "raon",
                    platform: "ridibooks",
                    saleMonth: "2026-06",
                    workTitle: `리디 이벤트 반영 ${eventInput.eventPeriod?.startDate}-${eventInput.eventPeriod?.endDate}`,
                    mailerContentTitle: "리디 이벤트 반영",
                    author: "서지후",
                    publisher: "라온북스",
                    grossSales: 26000,
                    settlementAmount: 10400,
                    sourceFileName: eventInput.fileName,
                    sourceRowIndex: 11,
                    issues: [],
                  }]
                : [{
                    rowId: "ridibooks-app-shell-row-001",
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
          },
        }}
      />,
    );

    const baseInput = screen.getByTestId("upload-input-upload-raon-ridibooks-base") as HTMLInputElement;
    const file1Input = screen.getByTestId("upload-input-upload-raon-ridibooks-file1") as HTMLInputElement;
    const eventInput = screen.getByTestId("upload-input-upload-raon-ridibooks-event") as HTMLInputElement;
    const eventStart = screen.getByTestId("upload-input-upload-raon-ridibooks-event-event-start") as HTMLInputElement;
    const eventEnd = screen.getByTestId("upload-input-upload-raon-ridibooks-event-event-end") as HTMLInputElement;

    fireEvent.change(baseInput, {
      target: {
        files: [createTextFile("calculate_1.csv", "work,sale\nbase,1\n")],
      },
    });

    await waitFor(() => {
      const persistedDraft = JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY)!);
      const liveUpload = persistedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-raon-ridibooks");
      expect(liveUpload).toEqual(expect.objectContaining({ fileCount: 1 }));
    });

    fireEvent.change(file1Input, {
      target: {
        files: [createTextFile("calculate_1 (1).csv", "work,sale\nfile1,1\n")],
      },
    });

    await waitFor(() => {
      const persistedDraft = JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY)!);
      const liveUpload = persistedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-raon-ridibooks");
      expect(liveUpload).toEqual(expect.objectContaining({ status: "parsed", fileCount: 2, parsedRowCount: 1 }));
    });

    fireEvent.change(eventStart, { target: { value: "2026-06-01" } });
    fireEvent.change(eventEnd, { target: { value: "2026-06-30" } });
    expect(eventInput.disabled).toBe(false);

    fireEvent.change(eventInput, {
      target: {
        files: [createTextFile("calculate_date_tran_1.csv", "work,event\nevent,1\n")],
      },
    });

    await waitFor(() => {
      const persistedDraft = JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY)!);
      const liveUpload = persistedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-raon-ridibooks");
      expect(liveUpload).toEqual(expect.objectContaining({
        status: "parsed",
        fileCount: 3,
        parsedRowCount: 1,
        issueCount: 0,
        sourceFileNames: ["calculate_1.csv", "calculate_1 (1).csv", "calculate_date_tran_1.csv"],
      }));
      expect(liveUpload.slots).toEqual(expect.arrayContaining([
        expect.objectContaining({ slotKey: "event", status: "parsed", sourceFileNames: ["calculate_date_tran_1.csv"] }),
      ]));
      expect(persistedDraft.rows).toEqual(expect.arrayContaining([
        expect.objectContaining({ rowId: "ridibooks-app-shell-row-003", workTitle: "리디 이벤트 반영 2026-06-01-2026-06-30" }),
      ]));
    });
  });
});
