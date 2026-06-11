import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createExportPackages, type ExportPackage } from "../exporters";
import { mockSettlementRows } from "../data/mockSettlement";
import { ExportSection } from "./ExportSection";

afterEach(() => {
  cleanup();
});

describe("ExportSection", () => {
  it("renders export package download buttons and delegates download handling", () => {
    const packages = createExportPackages(mockSettlementRows).packages;
    const onDownloadPackage = vi.fn();

    render(
      <ExportSection
        exportPackages={packages}
        onDownloadPackage={onDownloadPackage}
        readiness={{
          batchStatus: "ready_for_export",
          exportStatus: "ready",
          confirmedRowCount: 5,
          pendingReviewCount: 0,
          unresolvedIssueCount: 0,
          readyExportCount: packages.length,
          blockers: [],
        }}
        readyExports={packages.length}
      />,
    );

    const downloadButtons = screen.getAllByRole("button", { name: "다운로드" });
    expect(downloadButtons).toHaveLength(4);
    expect(screen.getByText("4/4 준비")).toBeInTheDocument();
    expect(screen.getByText("출력 준비 상태")).toBeInTheDocument();
    expect(screen.getByText("준비 완료 · 확정 5행 · 대기 0행 · 이슈 0건 · 출력 4종")).toBeInTheDocument();

    fireEvent.click(downloadButtons[0]);

    expect(onDownloadPackage).toHaveBeenCalledWith(packages[0]);
  });

  it("shows review gating blockers before creating download buttons", () => {
    render(
      <ExportSection
        exportResult={{
          packages: [] as ExportPackage[],
          issues: [],
          status: "ready",
        }}
        readiness={{
          batchStatus: "reviewing",
          exportStatus: "blocked",
          confirmedRowCount: 3,
          pendingReviewCount: 2,
          unresolvedIssueCount: 1,
          readyExportCount: 0,
          blockers: ["unresolved_issues", "review_incomplete"],
        }}
        readyExports={0}
      />,
    );

    expect(screen.getByText("출력 대기 상태입니다.")).toBeInTheDocument();
    expect(screen.getByText("출력 준비 상태")).toBeInTheDocument();
    expect(screen.getByText("대기 중 · 확정 3행 · 대기 2행 · 이슈 1건 · 출력 0종")).toBeInTheDocument();
    expect(screen.getByText("오류/누락/매칭 실패 1건을 먼저 확인해야 합니다.")).toBeInTheDocument();
    expect(screen.getByText("검수 확정이 2행 남아 있어 출력 준비 상태로 전환되지 않았습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "다운로드" })).not.toBeInTheDocument();
  });

  it("shows exporter validation blocker without download buttons", () => {
    const blockedResult = {
      packages: [] as ExportPackage[],
      issues: [],
      status: "blocked" as const,
    };

    render(
      <ExportSection
        exportResult={blockedResult}
        readiness={{
          batchStatus: "reviewing",
          exportStatus: "blocked",
          confirmedRowCount: 5,
          pendingReviewCount: 0,
          unresolvedIssueCount: 0,
          readyExportCount: 0,
          blockers: ["export_validation"],
        }}
        readyExports={0}
      />,
    );

    expect(screen.getByText("출력용 필수 값 검증이 끝나지 않아 엑셀 다운로드를 생성할 수 없습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "다운로드" })).not.toBeInTheDocument();
  });
});
