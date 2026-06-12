import { describe, expect, it } from "vitest";
import { createExportPackages } from "../exporters";
import { getReviewExportReadiness } from "../selectors";
import { createSeedAppState } from "../state/appState";
import {
  formatBatchHistoryTimestamp,
  formatCompanyOutputReadinessSummary,
  formatCompanyProgressSummary,
  formatLatestUploadChange,
  formatUploadStatusCounts,
  getBatchBlockerDetails,
  getBatchCtaHint,
  getBatchSummaryStatus,
  getCompanyOutputReadinessSummaries,
  getCompanyProgressSummaries,
  getLatestReviewDecisionDetail,
  getLatestReviewDecisionSummary,
  getLatestUploadChange,
  getMissingRequiredUploadCount,
  getUploadStatusCounts,
} from "./BatchListPage.helpers";

describe("BatchListPage helpers", () => {
  it("formats batch history and latest change summaries without rendering the page", () => {
    const state = createSeedAppState();
    state.reviewDecisions = [{
      rowId: "row-002",
      status: "held",
      note: "계약 확인 필요",
      updatedAt: "2026-06-08T19:10:00.000Z",
    }];

    expect(formatBatchHistoryTimestamp(state.batch.createdAt)).toBe("2026-06-08 09:20");
    expect(getLatestReviewDecisionSummary(state)).toBe("보류 · 2026-06-08 19:10");
    expect(getLatestReviewDecisionDetail(state)).toBe("라온 시리즈 앱 정산 샘플 · 보류 · 계약 확인 필요");
    expect(formatLatestUploadChange(getLatestUploadChange(state))).toBe(
      "에스알이앤엠 · 시리즈 · 앱 매출 3개 · sr-series-app-3.xls",
    );
  });

  it("keeps required-file and upload-status calculations separate", () => {
    const state = createSeedAppState();

    expect(getMissingRequiredUploadCount(state)).toBe(12);
    expect(formatUploadStatusCounts(getUploadStatusCounts(state))).toBe(
      "업로드 상태: 완료 11개 · 경고 5개 · 오류 2개 · 대기 11개",
    );
  });

  it("builds company progress and blocked output readiness labels", () => {
    const state = createSeedAppState();
    const exportResult = createExportPackages(state.rows);
    const readiness = getReviewExportReadiness(state.rows, state.issues, state.reviewDecisions, exportResult);

    expect(getCompanyProgressSummaries(state).map(formatCompanyProgressSummary)).toEqual([
      "라온이앤엠: 정산 3행 · 이슈 2건 · 검수 확정 0행",
      "에스알이앤엠: 정산 2행 · 이슈 1건 · 검수 확정 0행",
    ]);
    expect(getCompanyOutputReadinessSummaries(exportResult, readiness).map(formatCompanyOutputReadinessSummary)).toEqual([
      "라온이앤엠: 정산_통합검수용 대기 · 메일러_발송용 대기",
      "에스알이앤엠: 정산_통합검수용 대기 · 메일러_발송용 대기",
    ]);
  });

  it("summarizes the next action and blocker details from draft state", () => {
    const state = createSeedAppState();
    const exportResult = createExportPackages(state.rows);
    const readiness = getReviewExportReadiness(state.rows, state.issues, state.reviewDecisions, exportResult);
    const missingRequiredFiles = getMissingRequiredUploadCount(state);

    expect(getBatchSummaryStatus({ uploadedFiles: 19, requiredFiles: 29, exportStage: "reviewing" })).toBe("uploading");
    expect(getBatchCtaHint({ missingRequiredFiles, readiness })).toBe("CTA 안내: 업로드 단계로 이동해 필수 파일 12개 처리");
    expect(getBatchBlockerDetails({ missingRequiredFiles, draftState: state, readiness })).toEqual(expect.arrayContaining([
      "업로드 누락: 필수 파일 12개",
      "필수 슬롯 누락: 라온이앤엠 · 시리즈 · 앱 매출 3개 중 1개",
      "최우선 이슈: 원본 행의 회사 구분 값을 라온/에스알 중 하나로 확정하지 못했습니다. · 문피아 · 원본 104행",
      "검수 대기: 5/5행",
    ]));
  });
});
