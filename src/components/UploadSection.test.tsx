import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockUploads } from "../data/mockSettlement";
import { isLiveUploadEnabled } from "../state/uploadMutation";
import { UploadSection } from "./UploadSection";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("UploadSection", () => {
  it("renders company-mode upload cards in the shared platform order with the Onestore exception", () => {
    render(
      <UploadSection
        activeCompany="raon"
        uploads={mockUploads}
        isUploadEnabled={isLiveUploadEnabled}
        onUploadFiles={async () => {}}
      />,
    );

    expect(screen.getByText("회사 모드: 라온이앤엠")).toBeInTheDocument();
    expect(screen.getByText("전체 플랫폼 16개 · 원스토어는 양사 공유 업로드")).toBeInTheDocument();
    expect(screen.getByText("문피아")).toBeInTheDocument();
    expect(screen.getAllByText("슬롯 상태").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("정산 파일")).toBeInTheDocument();
    expect(screen.getByText("작가 보정")).toBeInTheDocument();
    expect(screen.getByText("기본 정산")).toBeInTheDocument();
    expect(screen.getByText("1번 파일 보정")).toBeInTheDocument();
    expect(screen.getByText("이벤트 거래")).toBeInTheDocument();
    expect(screen.getByText("MG 보정")).toBeInTheDocument();
    expect(screen.getByText("정산 상세리스트")).toBeInTheDocument();
    expect(screen.getByText("작품별 정산리스트")).toBeInTheDocument();
    expect(screen.getAllByText("일반 매출 3개").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("앱 매출 3개").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("required · xlsx")).toBeInTheDocument();
    expect(screen.getAllByText("required · csv").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("optional · csv").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("optional · csv/xlsx").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("required · html_xls").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("munpia-author-correction.csv")).toBeInTheDocument();
    expect(screen.getAllByText("calculate_1.csv").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("정산 상세리스트_2026-5.csv").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("공유 대상: 라온이앤엠 + 에스알이앤엠")).toBeInTheDocument();
    expect(screen.getAllByText("실파일 업로드").length).toBeGreaterThanOrEqual(12);
    expect(screen.queryByText("grouped 계약 정렬만 반영됨 · 실업로드 연결 예정")).not.toBeInTheDocument();
    expect(screen.getByText("현재 live path: 문피아 정산 슬롯 XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 문피아 작가 보정 슬롯 CSV/XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 조아라 정산 상세리스트 슬롯 CSV 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 조아라 작품별 정산리스트 슬롯 CSV 1-file")).toBeInTheDocument();
    expect(screen.getAllByText("현재 live path: 시리즈 일반 슬롯 HTML-XLS 3-file").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("현재 live path: 시리즈 앱 슬롯 HTML-XLS 3-file").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("현재 live path: 판무림 단일 XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 북큐브 단일 XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 에피루스 단일 CSV 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 구루컴퍼니 단일 CSV 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 무툰 단일 XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 노벨피아 단일 HTML-XLS 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 원스토어 공유 XLSX 1-file (raon+sr 동시 반영)")).toBeInTheDocument();

    cleanup();
    render(
      <UploadSection
        activeCompany="sr"
        uploads={mockUploads}
        isUploadEnabled={isLiveUploadEnabled}
        onUploadFiles={async () => {}}
      />,
    );

    expect(screen.getByText("회사 모드: 에스알이앤엠")).toBeInTheDocument();
    expect(screen.getByText("전체 플랫폼 16개 · 원스토어는 양사 공유 업로드")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 미스터블루 단일 XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 예스24 단일 XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 알라딘 단일 CSV 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 교보문고 단일 XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 카카오페이지 단일 XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 원스토어 공유 XLSX 1-file (raon+sr 동시 반영)")).toBeInTheDocument();
  });

  it("hydrates the ridibooks eventPeriod inputs from persisted grouped snapshots", () => {
    window.localStorage.setItem(
      "autosettlement.ridibooks-grouped-slot-snapshots.v1",
      JSON.stringify({
        ["batch-2026-06upload-raon-ridibooksevent"]: {
          files: [],
          uploadedAt: "2026-06-13T09:32:00+09:00",
          eventPeriod: {
            startDate: "2026-06-01",
            endDate: "2026-06-30",
          },
        },
      }),
    );

    render(
      <UploadSection
        uploads={mockUploads}
        isUploadEnabled={isLiveUploadEnabled}
        onUploadFiles={vi.fn()}
      />,
    );

    const eventInput = screen.getAllByTestId("upload-input-upload-raon-ridibooks-event")[0] as HTMLInputElement;
    const eventStart = screen.getAllByTestId("upload-input-upload-raon-ridibooks-event-event-start")[0] as HTMLInputElement;
    const eventEnd = screen.getAllByTestId("upload-input-upload-raon-ridibooks-event-event-end")[0] as HTMLInputElement;

    expect(eventStart.value).toBe("2026-06-01");
    expect(eventEnd.value).toBe("2026-06-30");
    expect(eventInput.disabled).toBe(false);
  });

  it("requires eventPeriod before enabling the ridibooks event upload input", () => {
    const onUploadFiles = vi.fn();

    render(
      <UploadSection
        uploads={mockUploads}
        isUploadEnabled={isLiveUploadEnabled}
        onUploadFiles={onUploadFiles}
      />,
    );

    const eventInput = screen.getAllByTestId("upload-input-upload-raon-ridibooks-event")[0] as HTMLInputElement;
    const eventStart = screen.getAllByTestId("upload-input-upload-raon-ridibooks-event-event-start")[0] as HTMLInputElement;
    const eventEnd = screen.getAllByTestId("upload-input-upload-raon-ridibooks-event-event-end")[0] as HTMLInputElement;

    expect(eventInput.disabled).toBe(true);
    expect(screen.getAllByText("이벤트 시작일").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("이벤트 종료일").length).toBeGreaterThanOrEqual(1);

    fireEvent.change(eventStart, { target: { value: "2026-06-01" } });
    expect(eventInput.disabled).toBe(true);

    fireEvent.change(eventEnd, { target: { value: "2026-06-30" } });
    expect(eventInput.disabled).toBe(false);
  });

  it("calls onPassUpload for an intentionally absent required slot", () => {
    const onPassUpload = vi.fn();
    const uploads = mockUploads.map((upload) => (
      upload.uploadId === "upload-raon-series"
        ? {
            ...upload,
            status: "warning" as const,
            fileCount: 5,
            slots: upload.slots?.map((slot) => (
              slot.slotKey === "seriesApp"
                ? {
                    ...slot,
                    status: "warning" as const,
                    fileCount: 2,
                    sourceFileNames: ["series-app-1.xls", "series-app-2.xls"],
                  }
                : slot
            )),
          }
        : upload
    ));

    render(
      <UploadSection
        activeCompany="raon"
        uploads={uploads}
        isUploadEnabled={isLiveUploadEnabled}
        onUploadFiles={async () => {}}
        onPassUpload={onPassUpload}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "앱 매출 3개 파일 없음으로 PASS 처리" }));

    expect(onPassUpload).toHaveBeenCalledWith(expect.objectContaining({
      slotKey: "seriesApp",
      upload: expect.objectContaining({ uploadId: "upload-raon-series" }),
    }));
  });
});
