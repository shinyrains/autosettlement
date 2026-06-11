import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockIssues } from "../data/mockSettlement";
import { IssuePanel } from "./IssuePanel";

afterEach(() => {
  cleanup();
});

describe("IssuePanel", () => {
  it("renders rich issue details and opens linked review rows", () => {
    const onOpenIssueRow = vi.fn();

    render(<IssuePanel issues={mockIssues} onOpenIssueRow={onOpenIssueRow} />);

    expect(screen.getByText("오류/누락/매칭 실패 패널")).toBeInTheDocument();
    expect(screen.getByText("문제 유형, 원본 참조, 영향 범위를 한 화면에서 우선 확인합니다.")).toBeInTheDocument();
    expect(screen.getAllByText("원본 행 참조").length).toBeGreaterThan(0);
    expect(screen.getAllByText("영향 범위").length).toBeGreaterThan(0);
    expect(screen.getByText("회사 분리 실패")).toBeInTheDocument();
    expect(screen.getByText("출판사")).toBeInTheDocument();
    expect(screen.getByText("yes24-sr-june.xlsx · 행 33")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "검수에서 열기" })[1]);

    expect(onOpenIssueRow).toHaveBeenCalledWith("row-003");
  });

  it("shows a stable empty state without broken text", () => {
    render(<IssuePanel issues={[]} onOpenIssueRow={() => {}} />);

    expect(screen.getByText("현재 확인된 파싱 이슈가 없습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "검수에서 열기" })).not.toBeInTheDocument();
  });
});
