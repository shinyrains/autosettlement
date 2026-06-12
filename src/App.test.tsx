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

function renderActiveBatchApp() {
  return render(<App initialView="shell" />);
}

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

function readKakaoPageSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/kakao_page/카카오페이지 일반계약_2026-05_주식회사 에스알이앤엠_CP월정산내역.xlsx",
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

function createEmptyJoaraDraft() {
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

function createExportBlockedDraft() {
  const state = createSeedAppState();
  state.uploads = state.uploads.map((upload) => ({
    ...upload,
    status: "parsed" as const,
    fileCount: upload.requiredFileCount,
    issueCount: 0,
    sourceFileNames: Array.from({ length: upload.requiredFileCount }, (_, index) => `${upload.uploadId}-${index + 1}.xlsx`),
    slots: upload.slots?.map((slot) => ({
      ...slot,
      status: slot.required ? "parsed" as const : slot.status,
      fileCount: slot.required ? 1 : slot.fileCount,
      issueCount: 0,
      sourceFileNames: slot.required ? [`${slot.slotId}.xlsx`] : slot.sourceFileNames,
    })),
  }));
  state.batch.uploads = state.uploads;
  state.issues = [];
  state.reviewDecisions = state.rows.map((row, index) => ({
    rowId: row.rowId,
    status: "confirmed" as const,
    updatedAt: `2026-06-11T08:${String(index).padStart(2, "0")}:00.000Z`,
  }));
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

function createReadyForExportDraft() {
  const state = createSeedAppState();
  state.uploads = state.uploads.map((upload) => ({
    ...upload,
    status: "parsed" as const,
    fileCount: upload.requiredFileCount,
    issueCount: 0,
    sourceFileNames: Array.from({ length: upload.requiredFileCount }, (_, index) => `${upload.uploadId}-${index + 1}.xlsx`),
    slots: upload.slots?.map((slot) => ({
      ...slot,
      status: slot.required ? "parsed" as const : slot.status,
      fileCount: slot.required ? 1 : slot.fileCount,
      issueCount: 0,
      sourceFileNames: slot.required ? [`${slot.slotId}.xlsx`] : slot.sourceFileNames,
    })),
  }));
  state.batch.uploads = state.uploads;
  state.issues = [];
  state.reviewDecisions = state.rows.map((row, index) => ({
    rowId: row.rowId,
    status: "confirmed" as const,
    updatedAt: `2026-06-11T09:${String(index).padStart(2, "0")}:00.000Z`,
  }));
  state.selectedRowId = state.rows[0]?.rowId ?? "";
  return state;
}

describe("AutoSettlement UI shell", () => {
  it("shows an empty batch-list state before any draft is persisted", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "배치 목록 / 배치 진입" })).toBeInTheDocument();
    expect(screen.getByText("저장된 배치 없음")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "이 배치 열기" })).not.toBeInTheDocument();
  });

  it("opens the persisted batch shell from the batch list page", () => {
    const state = createSeedAppState();
    state.reviewDecisions = [{
      rowId: "row-002",
      status: "held",
      note: "계약 확인 필요",
      updatedAt: "2026-06-08T19:10:00.000Z",
    }];
    saveAppDraftState(state, window.localStorage);
    render(<App />);

    expect(screen.getByText("현재 브라우저 저장 배치")).toBeInTheDocument();
    expect(screen.getByText("배치 진행 내역")).toBeInTheDocument();
    expect(screen.getByText("생성: 2026-06-08 09:20")).toBeInTheDocument();
    expect(screen.getByText("최근 수정: 2026-06-08 18:40")).toBeInTheDocument();
    expect(screen.getByText("최근 업로드: 2026-06-08 17:55")).toBeInTheDocument();
    expect(screen.getByText("최근 업로드 변경: 에스알이앤엠 · 시리즈 · 앱 매출 3개 · sr-series-app-3.xls")).toBeInTheDocument();
    expect(screen.getByText("최근 검수: 보류 · 2026-06-08 19:10")).toBeInTheDocument();
    expect(screen.getByText("최근 검수 상세: 검은 별의 서점 · 보류 · 계약 확인 필요")).toBeInTheDocument();
    expect(screen.getByText("선택 파일 19/29")).toBeInTheDocument();
    expect(screen.getByText("필수 파일 누락 12개")).toBeInTheDocument();
    expect(screen.getByText("다음 필요 액션")).toBeInTheDocument();
    expect(screen.getByText("필수 파일 12개 추가 업로드 필요")).toBeInTheDocument();
    expect(screen.getByText("주요 blocker: 이슈 3건 / 검수 미확정 5건")).toBeInTheDocument();
    expect(screen.getByText("운영 blocker 상세")).toBeInTheDocument();
    expect(screen.getByText("업로드 누락: 필수 파일 12개")).toBeInTheDocument();
    expect(screen.getByText("필수 슬롯 누락: 라온이앤엠 · 시리즈 · 앱 매출 3개 중 1개")).toBeInTheDocument();
    expect(screen.getByText("필수 슬롯 누락: 라온이앤엠 · 조아라 · 작품별 정산리스트 중 1개")).toBeInTheDocument();
    expect(screen.getByText("최우선 이슈: 원본 행의 회사 구분 값을 라온/에스알 중 하나로 확정하지 못했습니다. · 문피아 · 원본 104행")).toBeInTheDocument();
    expect(screen.getByText("검수 대기: 5/5행")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이 배치 열기" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "이 배치 열기" }));

    expect(screen.getByRole("button", { name: "배치 목록으로" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /2026-06 정산 배치/i })).toBeInTheDocument();
  });

  it("returns from the shell to the batch list page", () => {
    saveAppDraftState(createSeedAppState(), window.localStorage);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "이 배치 열기" }));
    fireEvent.click(screen.getByRole("button", { name: "배치 목록으로" }));

    expect(screen.getByRole("heading", { name: "배치 목록 / 배치 진입" })).toBeInTheDocument();
    expect(screen.getByText("현재 브라우저 저장 배치")).toBeInTheDocument();
  });

  it("renders the batch-centered MVP workflow with grouped upload cards and export gating status", () => {
    renderActiveBatchApp();

    expect(screen.getByText("2026-06 정산 배치")).toBeInTheDocument();
    expect(screen.getByText("배치 중심 4단계 흐름")).toBeInTheDocument();
    expect(screen.getAllByText("시리즈").length).toBeGreaterThan(0);
    expect(screen.getAllByText("필수 6개: 일반 3개 + 앱 3개").length).toBeGreaterThan(0);
    expect(screen.getByText("정산 파일")).toBeInTheDocument();
    expect(screen.getByText("작가 보정")).toBeInTheDocument();
    expect(screen.getByText("기본 정산")).toBeInTheDocument();
    expect(screen.getByText("정산 상세리스트")).toBeInTheDocument();
    expect(screen.getAllByText(/배치 전체 4개 파일/).length).toBeGreaterThan(0);
    expect(screen.getByText("출력 대기 상태입니다.")).toBeInTheDocument();
    expect(screen.getByText("오류/누락/매칭 실패 3건을 먼저 확인해야 합니다.")).toBeInTheDocument();
  });

  it("hydrates the selected review row from persisted localStorage state", () => {
    const state = createSeedAppState();
    state.selectedRowId = "row-005";
    window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state));

    renderActiveBatchApp();

    expect(screen.getByRole("heading", { name: "달빛 회계법" })).toBeInTheDocument();
  });

  it("resets the persisted draft back to the seed state", () => {
    const state = createSeedAppState();
    state.selectedRowId = "row-005";
    window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state));

    renderActiveBatchApp();
    fireEvent.click(screen.getByRole("button", { name: "초기 상태로 리셋" }));

    expect(screen.getByRole("heading", { name: "검은 별의 서점(앱)" })).toBeInTheDocument();
  });

  it("shows blocked export state when review/export gates are not satisfied", () => {
    saveAppDraftState(createSeedAppState(), window.localStorage);

    renderActiveBatchApp();

    expect(screen.getByText("출력 대기 상태입니다.")).toBeInTheDocument();
    expect(screen.getByText("오류/누락/매칭 실패 3건을 먼저 확인해야 합니다.")).toBeInTheDocument();
    expect(screen.getByText("검수 확정이 5행 남아 있어 출력 준비 상태로 전환되지 않았습니다.")).toBeInTheDocument();
    expect(screen.getAllByText("0/4 준비").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "다운로드" })).not.toBeInTheDocument();
  });

  it("shows exporter validation blocker after review is complete but export fields are invalid", () => {
    saveAppDraftState(createExportBlockedDraft(), window.localStorage);

    render(<App />);

    expect(screen.getByText("출력 검증 필요")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "이 배치 열기" }));

    expect(screen.getByText("상태: 출력 검증 필요")).toBeInTheDocument();
    expect(screen.getByText("출력 대기 상태입니다.")).toBeInTheDocument();
    expect(screen.getByText("출력용 필수 값 검증이 끝나지 않아 엑셀 다운로드를 생성할 수 없습니다.")).toBeInTheDocument();
    expect(screen.getAllByText("0/4 준비").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "다운로드" })).not.toBeInTheDocument();
  });

  it("shows ready-for-export state after all review rows are confirmed and blockers are cleared", () => {
    saveAppDraftState(createReadyForExportDraft(), window.localStorage);

    render(<App />);

    expect(screen.getByText("출력 가능", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("4/4")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "이 배치 열기" }));

    expect(screen.getByText("상태: 출력 가능")).toBeInTheDocument();
    expect(screen.getAllByText("4/4 준비").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "다운로드" })).toHaveLength(4);
  });

  it("filters and sorts review rows through the actual app-shell controls", () => {
    renderActiveBatchApp();

    fireEvent.change(screen.getByLabelText("회사 필터"), { target: { value: "sr" } });
    expect(screen.queryByText("밤의 계산서")).not.toBeInTheDocument();
    expect(screen.getAllByText("달빛 회계법").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("검수 검색"), { target: { value: "항구" } });
    expect(screen.queryByText("달빛 회계법")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "파란 항구의 기록(앱)" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("검수 검색"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("이슈 필터"), { target: { value: "with_issues" } });
    expect(screen.queryByText("파란 항구의 기록(앱)")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "달빛 회계법" })).toBeInTheDocument();
    expect(screen.getByText("현재 필터 결과 1행 / 전체 5행 · 이슈 연결 행 1건 · 검수 확정 0건")).toBeInTheDocument();
    expect(screen.getByText("이슈 행")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("이슈 필터"), { target: { value: "all" } });
    fireEvent.change(screen.getByLabelText("정렬"), { target: { value: "settlement_desc" } });
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("파란 항구의 기록");
  });

  it("opens a linked parse issue in review and resets the active review filters", () => {
    renderActiveBatchApp();

    fireEvent.change(screen.getByLabelText("회사 필터"), { target: { value: "sr" } });
    fireEvent.change(screen.getByLabelText("검수 검색"), { target: { value: "달빛" } });
    expect(screen.getByRole("heading", { name: "달빛 회계법" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "검수에서 열기" })[1]);

    expect(screen.getByRole("heading", { name: "밤의 계산서" })).toBeInTheDocument();
    expect(screen.getByLabelText("회사 필터")).toHaveValue("all");
    expect(screen.getByLabelText("검수 검색")).toHaveValue("");
    expect(screen.getByText("현재 필터 결과 5행 / 전체 5행 · 이슈 연결 행 3건 · 검수 확정 0건")).toBeInTheDocument();
  });

  it("confirms the selected review row and persists the review decision", async () => {
    renderActiveBatchApp();

    expect(screen.getByText("선택 행 큐 위치")).toBeInTheDocument();
    expect(screen.getByText("보류 제외 미확정 큐 2번째 대상")).toBeInTheDocument();
    expect(screen.getByText("이슈 미확정 큐 1번째 대상")).toBeInTheDocument();
    expect(screen.getByText("고액 미확정 큐 4번째 대상")).toBeInTheDocument();
    expect(screen.getByText("전체 미확정 큐 2번째 대상")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "이 행 검수 확정" }));

    await waitFor(() => {
      expect(screen.getAllByText("검수 확정").length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: "검수 확정 해제" })).toBeInTheDocument();
      expect(screen.getByText("확정 큐 1번째 대상")).toBeInTheDocument();
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

  it("opens and resets confirmed rows through the current-filter review queue", async () => {
    renderActiveBatchApp();

    fireEvent.click(screen.getByRole("button", { name: "이 행 검수 확정" }));

    await waitFor(() => {
      expect(screen.getByText("확정 1행")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "확정 첫 행 열기" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "검은 별의 서점(앱)" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "확정 모두 대기로 전환" }));

    await waitFor(() => {
      expect(screen.getByText("확정 0행")).toBeInTheDocument();
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      expect(parsedDraft.reviewDecisions).toEqual(expect.arrayContaining([
        expect.objectContaining({ rowId: "row-002", status: "pending" }),
      ]));
    });
  });

  it("filters review rows by persisted review decision status", async () => {
    renderActiveBatchApp();

    fireEvent.click(screen.getByRole("button", { name: "이 행 검수 확정" }));

    await waitFor(() => {
      expect(screen.getByText(/검수 확정 1건/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("검수 상태 필터"), { target: { value: "confirmed" } });

    expect(screen.getByText("현재 필터 결과 1행 / 전체 5행 · 이슈 연결 행 1건 · 검수 확정 1건")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "검은 별의 서점(앱)" })).toBeInTheDocument();
    expect(screen.queryByText("밤의 계산서")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("검수 상태 필터"), { target: { value: "pending" } });

    expect(screen.getByText("현재 필터 결과 4행 / 전체 5행 · 이슈 연결 행 2건 · 검수 확정 1건")).toBeInTheDocument();
    expect(screen.queryByText("검은 별의 서점(앱)")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "검은 별의 서점" })).toBeInTheDocument();
  });

  it("bulk-confirms and resets the current filtered review rows", async () => {
    renderActiveBatchApp();

    fireEvent.change(screen.getByLabelText("회사 필터"), { target: { value: "sr" } });
    fireEvent.click(screen.getByRole("button", { name: "현재 필터 결과 모두 확정" }));

    await waitFor(() => {
      expect(screen.getByText(/검수 확정 2건/)).toBeInTheDocument();
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      expect(parsedDraft.reviewDecisions).toEqual(expect.arrayContaining([
        expect.objectContaining({ rowId: "row-004", status: "confirmed" }),
        expect.objectContaining({ rowId: "row-005", status: "confirmed" }),
      ]));
    });

    fireEvent.click(screen.getByRole("button", { name: "현재 필터 결과 확정 해제" }));

    await waitFor(() => {
      expect(screen.getByText(/검수 확정 0건/)).toBeInTheDocument();
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      expect(parsedDraft.reviewDecisions).toEqual(expect.arrayContaining([
        expect.objectContaining({ rowId: "row-004", status: "pending" }),
        expect.objectContaining({ rowId: "row-005", status: "pending" }),
      ]));
    });
  });

  it("moves from the selected row to the next pending or issue-linked review row", async () => {
    renderActiveBatchApp();

    fireEvent.click(screen.getByRole("button", { name: "이 행 검수 확정" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 미확정 행으로 이동" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "밤의 계산서" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "다음 이슈 행으로 이동" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "달빛 회계법" })).toBeInTheDocument();
    });
  });

  it("moves from the visible fallback row when the stored selection is outside the active filter", async () => {
    renderActiveBatchApp();

    fireEvent.change(screen.getByLabelText("회사 필터"), { target: { value: "sr" } });
    expect(screen.getByRole("heading", { name: "파란 항구의 기록(앱)" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "다음 미확정 행으로 이동" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "달빛 회계법" })).toBeInTheDocument();
    });
  });

  it("shows a filtered review queue and opens priority pending rows", async () => {
    renderActiveBatchApp();

    expect(screen.getByText("검수 큐")).toBeInTheDocument();
    expect(screen.getByText("이슈 미확정 3행")).toBeInTheDocument();
    expect(screen.getByText("고액 미확정 5행")).toBeInTheDocument();
    expect(screen.getByText("전체 미확정 5행")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "고액 미확정 첫 행 열기" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "검은 별의 서점" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "이 행 검수 확정" }));

    await waitFor(() => {
      expect(screen.getByText("고액 미확정 4행")).toBeInTheDocument();
      expect(screen.getByText("전체 미확정 4행")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("회사 필터"), { target: { value: "sr" } });

    expect(screen.getByText("이슈 미확정 1행")).toBeInTheDocument();
    expect(screen.getByText("고액 미확정 2행")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "고액 미확정 다음 행으로 이동" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "달빛 회계법" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "이슈 미확정 첫 행 열기" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "달빛 회계법" })).toBeInTheDocument();
    });
  });

  it("bulk-confirms pending rows from the current filtered review queue", async () => {
    renderActiveBatchApp();

    fireEvent.change(screen.getByLabelText("회사 필터"), { target: { value: "sr" } });
    expect(screen.getByText("이슈 미확정 1행")).toBeInTheDocument();
    expect(screen.getByText("고액 미확정 2행")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "이슈 미확정 모두 확정" }));

    await waitFor(() => {
      expect(screen.getByText("이슈 미확정 0행")).toBeInTheDocument();
      expect(screen.getByText("전체 미확정 1행")).toBeInTheDocument();
      expect(screen.getByText(/검수 확정 1건/)).toBeInTheDocument();
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      expect(parsedDraft.reviewDecisions).toEqual(expect.arrayContaining([
        expect.objectContaining({ rowId: "row-005", status: "confirmed" }),
      ]));
      expect(parsedDraft.reviewDecisions).not.toEqual(expect.arrayContaining([
        expect.objectContaining({ rowId: "row-004", status: "confirmed" }),
      ]));
    });

    fireEvent.click(screen.getByRole("button", { name: "고액 미확정 모두 확정" }));

    await waitFor(() => {
      expect(screen.getByText("고액 미확정 0행")).toBeInTheDocument();
      expect(screen.getByText("전체 미확정 0행")).toBeInTheDocument();
      expect(screen.getByText(/검수 확정 2건/)).toBeInTheDocument();
    });
  });

  it("edits the selected review row and persists the changed fields", async () => {
    renderActiveBatchApp();

    fireEvent.click(screen.getByRole("button", { name: "검수 행 편집" }));
    fireEvent.change(screen.getByLabelText("메일러 컨텐츠 편집"), { target: { value: "검은 별의 서점(앱) [수정]" } });
    fireEvent.change(screen.getByLabelText("작가 편집"), { target: { value: "한도윤 외 1명" } });
    fireEvent.change(screen.getByLabelText("출판사 편집"), { target: { value: "라온 노벨" } });
    fireEvent.click(screen.getByRole("button", { name: "검수 편집 저장" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "검은 별의 서점(앱) [수정]" })).toBeInTheDocument();
      expect(screen.getByDisplayValue("검은 별의 서점(앱) [수정]")).toBeInTheDocument();
      expect(screen.getByDisplayValue("한도윤 외 1명")).toBeInTheDocument();
      expect(screen.getByDisplayValue("라온 노벨")).toBeInTheDocument();

      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      const editedRow = parsedDraft.rows.find((row: { rowId: string }) => row.rowId === "row-002");
      expect(editedRow).toEqual(expect.objectContaining({
        mailerContentTitle: "검은 별의 서점(앱) [수정]",
        author: "한도윤 외 1명",
        publisher: "라온 노벨",
      }));
    });
  });

  it("saves a review hold reason and filters held rows", async () => {
    renderActiveBatchApp();

    fireEvent.click(screen.getByRole("button", { name: "보류 사유 편집" }));
    fireEvent.change(screen.getByLabelText("검수 보류 사유"), { target: { value: "원천 파일 출판사 값 확인 필요" } });
    fireEvent.click(screen.getByRole("button", { name: "보류 사유 저장" }));

    await waitFor(() => {
      expect(screen.getByText("검수 보류")).toBeInTheDocument();
      expect(screen.getByText("원천 파일 출판사 값 확인 필요")).toBeInTheDocument();
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      expect(parsedDraft.reviewDecisions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          rowId: "row-002",
          status: "held",
          note: "원천 파일 출판사 값 확인 필요",
        }),
      ]));
    });

    fireEvent.change(screen.getByLabelText("검수 상태 필터"), { target: { value: "held" } });

    expect(screen.getByText("현재 필터 결과 1행 / 전체 5행 · 이슈 연결 행 1건 · 검수 확정 0건")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "검은 별의 서점(앱)" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "이 행 검수 확정" }));

    await waitFor(() => {
      expect(screen.queryByText("검수 보류")).not.toBeInTheDocument();
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      expect(parsedDraft.reviewDecisions).toEqual(expect.arrayContaining([
        expect.objectContaining({ rowId: "row-002", status: "confirmed", note: "원천 파일 출판사 값 확인 필요" }),
      ]));
    });
  });

  it("opens held rows from the review queue and releases the current filtered holds", async () => {
    renderActiveBatchApp();

    fireEvent.click(screen.getByRole("button", { name: "보류 사유 편집" }));
    fireEvent.change(screen.getByLabelText("검수 보류 사유"), { target: { value: "앱/웹 중복 정산 확인" } });
    fireEvent.click(screen.getByRole("button", { name: "보류 사유 저장" }));

    await waitFor(() => {
      expect(screen.getByText("보류 1행")).toBeInTheDocument();
      expect(screen.getByText("보류 사유: 앱/웹 중복 정산 확인")).toBeInTheDocument();
      expect(screen.getByText("검수 보류")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "고액 미확정 첫 행 열기" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "검은 별의 서점" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "보류 첫 행 열기" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "검은 별의 서점(앱)" })).toBeInTheDocument();
      expect(screen.getByText("앱/웹 중복 정산 확인")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "보류 모두 대기로 전환" }));

    await waitFor(() => {
      expect(screen.getByText("보류 0행")).toBeInTheDocument();
      expect(screen.getAllByText("검수 대기").length).toBeGreaterThan(0);
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      expect(parsedDraft.reviewDecisions).toEqual(expect.arrayContaining([
        expect.objectContaining({ rowId: "row-002", status: "pending", note: "앱/웹 중복 정산 확인" }),
      ]));
    });
  });

  it("keeps empty hold reasons from creating held review decisions", async () => {
    renderActiveBatchApp();

    fireEvent.click(screen.getByRole("button", { name: "보류 사유 편집" }));

    expect(screen.getByRole("button", { name: "보류 사유 저장" })).toBeDisabled();
    expect(screen.getByText("보류 사유를 입력해야 보류로 전환할 수 있습니다.")).toBeInTheDocument();
    expect(screen.getByText("보류 0행")).toBeInTheDocument();
  });

  it("applies quick hold reasons and resolves held rows by reason group", async () => {
    renderActiveBatchApp();

    fireEvent.click(screen.getByRole("button", { name: "보류 사유 편집" }));
    fireEvent.click(screen.getByRole("button", { name: "중복 정산" }));
    expect(screen.getByLabelText("검수 보류 사유")).toHaveValue("앱/웹 중복 정산 확인");
    fireEvent.click(screen.getByRole("button", { name: "보류 사유 저장" }));

    await waitFor(() => {
      expect(screen.getByText("보류 사유 그룹")).toBeInTheDocument();
      expect(screen.getByText("앱/웹 중복 정산 확인 1행")).toBeInTheDocument();
      expect(screen.getByText("현재 보류 그룹: 앱/웹 중복 정산 확인 · 1행 · 그룹 액션 대상")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "다음 미확정 행으로 이동" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "밤의 계산서" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "보류 사유 편집" }));
    fireEvent.click(screen.getByRole("button", { name: "원천 파일 확인" }));
    expect(screen.getByLabelText("검수 보류 사유")).toHaveValue("원천 파일 행/금액 확인 필요");
    fireEvent.click(screen.getByRole("button", { name: "보류 사유 저장" }));

    await waitFor(() => {
      expect(screen.getByText("원천 파일 행/금액 확인 필요 1행")).toBeInTheDocument();
      expect(screen.getByText("보류 제외 미확정 3행")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "보류 제외 미확정 모두 확정" }));

    await waitFor(() => {
      expect(screen.getByText("보류 제외 미확정 0행")).toBeInTheDocument();
      expect(screen.getByText("원천 파일 행/금액 확인 필요 1행")).toBeInTheDocument();
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      expect(parsedDraft.reviewDecisions).toEqual(expect.arrayContaining([
        expect.objectContaining({ rowId: "row-001", status: "confirmed" }),
        expect.objectContaining({ rowId: "row-003", status: "held", note: "원천 파일 행/금액 확인 필요" }),
      ]));
    });

    fireEvent.click(screen.getByRole("button", { name: "앱/웹 중복 정산 확인 사유 그룹 첫 행 열기" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "검은 별의 서점(앱)" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "앱/웹 중복 정산 확인 사유 그룹 모두 확정" }));

    await waitFor(() => {
      expect(screen.queryByText("앱/웹 중복 정산 확인 1행")).not.toBeInTheDocument();
      expect(screen.getByText("원천 파일 행/금액 확인 필요 1행")).toBeInTheDocument();
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      expect(parsedDraft.reviewDecisions).toEqual(expect.arrayContaining([
        expect.objectContaining({ rowId: "row-002", status: "confirmed", note: "앱/웹 중복 정산 확인" }),
        expect.objectContaining({ rowId: "row-003", status: "held", note: "원천 파일 행/금액 확인 필요" }),
      ]));
    });
  });

  it("keeps long hold reasons readable while preserving full reason actions", async () => {
    const longReason = "정산 담당자 확인이 필요한 아주 긴 보류 사유입니다. 앱/웹 중복과 계약 조건을 함께 확인해야 합니다.";
    const shortenedReason = "정산 담당자 확인이 필요한 아주 긴 보류 사유...";
    renderActiveBatchApp();

    fireEvent.click(screen.getByRole("button", { name: "보류 사유 편집" }));
    fireEvent.change(screen.getByLabelText("검수 보류 사유"), { target: { value: longReason } });
    fireEvent.click(screen.getByRole("button", { name: "보류 사유 저장" }));

    await waitFor(() => {
      expect(screen.getByText("보류 사유가 긴 경우 축약 표시되며 전체 사유는 도움말과 상세 영역에서 확인할 수 있습니다.")).toBeInTheDocument();
      expect(screen.getByText(`${shortenedReason} 1행`)).toHaveAttribute("title", longReason);
      expect(screen.getByText(`보류 사유: ${shortenedReason}`)).toHaveAttribute("title", longReason);
      expect(screen.queryByRole("button", { name: `${longReason} 사유 모두 확정` })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: `${longReason} 사유 그룹 모두 확정` })).toHaveTextContent("사유 그룹 모두 확정");
      expect(screen.getByRole("button", { name: `${longReason} 사유 그룹 첫 행 열기` })).toHaveTextContent("사유 그룹 첫 행 열기");
      expect(screen.getByRole("button", { name: `${longReason} 사유 그룹 대기로 전환` })).toHaveTextContent("사유 그룹 대기로 전환");
      expect(screen.getByText("아래 이슈/고액/전체 미확정 큐는 검수 보류 행을 포함합니다.")).toBeInTheDocument();
    });
  });

  it("surfaces legacy held rows without saved hold reasons as a recoverable group", async () => {
    const draft = createSeedAppState();
    draft.reviewDecisions = [{ rowId: "row-002", status: "held", updatedAt: "2026-06-11T10:00:00.000Z" }];
    draft.selectedRowId = "row-002";
    saveAppDraftState(draft, window.localStorage);
    renderActiveBatchApp();

    await waitFor(() => {
      expect(screen.getByText("사유 없음 1행")).toBeInTheDocument();
      expect(screen.getByText("저장된 보류 사유 없음")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "사유 없음 사유 그룹 대기로 전환" }));

    await waitFor(() => {
      expect(screen.queryByText("사유 없음 1행")).not.toBeInTheDocument();
      expect(screen.getByText("보류 0행")).toBeInTheDocument();
      const persistedDraft = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      expect(persistedDraft).not.toBeNull();
      const parsedDraft = JSON.parse(persistedDraft!);
      expect(parsedDraft.reviewDecisions).toEqual(expect.arrayContaining([
        expect.objectContaining({ rowId: "row-002", status: "pending" }),
      ]));
    });
  });

  it("shows selected review decision audit metadata from persisted decisions", async () => {
    const draft = createSeedAppState();
    draft.reviewDecisions = [{
      rowId: "row-002",
      status: "held",
      note: "계약 조건 재확인",
      updatedAt: "2026-06-11T10:00:00.000Z",
    }];
    draft.selectedRowId = "row-002";
    saveAppDraftState(draft, window.localStorage);
    renderActiveBatchApp();

    await waitFor(() => {
      expect(screen.getByText("검수 결정 이력")).toBeInTheDocument();
      expect(screen.getByText("현재 결정: 검수 보류")).toBeInTheDocument();
      expect(screen.getByText("마지막 변경: 2026-06-11 10:00")).toBeInTheDocument();
      expect(screen.getByText("감사 사유: 계약 조건 재확인")).toBeInTheDocument();
    });
  });

  it("parses a real misterblue workbook through the live upload card and persists the new draft", async () => {
    renderActiveBatchApp();

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
    renderActiveBatchApp();

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
    renderActiveBatchApp();

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
    renderActiveBatchApp();

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
    renderActiveBatchApp();

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
    renderActiveBatchApp();

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
    renderActiveBatchApp();

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
    renderActiveBatchApp();

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

  it("parses a real kakao page workbook through the live upload card and persists the new draft", async () => {
    renderActiveBatchApp();

    const input = screen.getByTestId("upload-input-upload-sr-kakao-page") as HTMLInputElement;
    const bytes = readKakaoPageSampleWorkbook().slice();
    const fileBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const file = new File(
      [fileBytes],
      "카카오페이지 일반계약_2026-05_주식회사 에스알이앤엠_CP월정산내역.xlsx",
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
      const liveUpload = parsedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-sr-kakao-page");
      expect(liveUpload).toEqual(expect.objectContaining({
        status: "parsed",
        fileCount: 1,
        parsedRowCount: 207,
        sourceFileNames: ["카카오페이지 일반계약_2026-05_주식회사 에스알이앤엠_CP월정산내역.xlsx"],
      }));
    });

    expect(screen.getByText("카카오페이지 일반계약_2026-05_주식회사 에스알이앤엠_CP월정산내역.xlsx")).toBeInTheDocument();
  });

  it("parses a real mootoon workbook through the live upload card and persists the new draft", async () => {
    renderActiveBatchApp();

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
    renderActiveBatchApp();

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
    renderActiveBatchApp();

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
  }, 15000);

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

  it("persists joara grouped slot uploads through the browser shell", async () => {
    saveAppDraftState(createEmptyJoaraDraft(), window.localStorage);

    render(<AppShell />);

    const settlementInput = screen.getByTestId("upload-input-upload-raon-joara-settlement-detail") as HTMLInputElement;
    const settlementBytes = readJoaraSettlementDetailSampleCsv().slice();
    const settlementFile = new File([settlementBytes], "정산 상세리스트_2026-5.csv", { type: "text/csv" });
    Object.defineProperty(settlementFile, "arrayBuffer", {
      value: async () => settlementBytes.slice().buffer as ArrayBuffer,
    });

    fireEvent.change(settlementInput, { target: { files: [settlementFile] } });

    await waitFor(() => {
      const persistedDraft = JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY)!);
      const liveUpload = persistedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-raon-joara");
      expect(liveUpload).toEqual(expect.objectContaining({
        fileCount: 1,
        sourceFileNames: ["정산 상세리스트_2026-5.csv"],
      }));
      expect(liveUpload.slots).toEqual(expect.arrayContaining([
        expect.objectContaining({
          slotKey: "settlementDetail",
          sourceFileNames: ["정산 상세리스트_2026-5.csv"],
        }),
      ]));
    });

    const workInput = screen.getByTestId("upload-input-upload-raon-joara-work-settlement") as HTMLInputElement;
    const workBytes = readJoaraWorkSettlementSampleCsv().slice();
    const workFile = new File([workBytes], "작품별 정산리스트_2026-5.csv", { type: "text/csv" });
    Object.defineProperty(workFile, "arrayBuffer", {
      value: async () => workBytes.slice().buffer as ArrayBuffer,
    });

    fireEvent.change(workInput, { target: { files: [workFile] } });

    await waitFor(() => {
      const persistedDraft = JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY)!);
      const liveUpload = persistedDraft.uploads.find((upload: { uploadId: string }) => upload.uploadId === "upload-raon-joara");
      expect(liveUpload).toEqual(expect.objectContaining({
        fileCount: 2,
        parsedRowCount: 0,
        issueCount: expect.any(Number),
        sourceFileNames: ["정산 상세리스트_2026-5.csv", "작품별 정산리스트_2026-5.csv"],
      }));
      expect(liveUpload.issueCount).toBeGreaterThan(0);
      expect(liveUpload.slots).toEqual(expect.arrayContaining([
        expect.objectContaining({
          slotKey: "settlementDetail",
          sourceFileNames: ["정산 상세리스트_2026-5.csv"],
        }),
        expect.objectContaining({
          slotKey: "workSettlement",
          sourceFileNames: ["작품별 정산리스트_2026-5.csv"],
        }),
      ]));
      expect(persistedDraft.rows.some((row: { platform: string }) => row.platform === "joara")).toBe(false);
      expect(persistedDraft.issues.some((issue: { platform: string }) => issue.platform === "joara")).toBe(true);
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
