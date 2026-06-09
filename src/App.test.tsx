import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";
import {
  APP_STATE_STORAGE_KEY,
  createSeedAppState,
} from "./state/appState";

afterEach(() => {
  cleanup();
  window.localStorage.removeItem(APP_STATE_STORAGE_KEY);
});

describe("AutoSettlement UI shell", () => {
  it("renders the batch-centered MVP workflow with series, munpia slots, and export status", () => {
    render(<App />);

    expect(screen.getByText("2026-06 정산 Batch")).toBeInTheDocument();
    expect(screen.getByText("배치 중심 4단계 흐름")).toBeInTheDocument();
    expect(screen.getAllByText("시리즈").length).toBeGreaterThan(0);
    expect(screen.getAllByText("필수 6개: 일반 3개 + 앱 3개").length).toBeGreaterThan(0);
    expect(screen.getByText("정산 파일")).toBeInTheDocument();
    expect(screen.getByText("작가 보정")).toBeInTheDocument();
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
});
