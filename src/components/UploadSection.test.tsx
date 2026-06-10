import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockUploads } from "../data/mockSettlement";
import { isLiveUploadEnabled } from "../state/uploadMutation";
import { UploadSection } from "./UploadSection";

describe("UploadSection", () => {
  it("renders munpia and series slot-based upload state plus the current live upload cards", () => {
    render(
      <UploadSection
        uploads={mockUploads}
        isUploadEnabled={isLiveUploadEnabled}
        onUploadFiles={async () => {}}
      />,
    );

    expect(screen.getByText("문피아")).toBeInTheDocument();
    expect(screen.getAllByText("슬롯 상태").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("정산 파일")).toBeInTheDocument();
    expect(screen.getByText("작가 보정")).toBeInTheDocument();
    expect(screen.getAllByText("일반 매출 3개").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("앱 매출 3개").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("required · xlsx")).toBeInTheDocument();
    expect(screen.getAllByText("required · html_xls").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("munpia-author-correction.csv")).toBeInTheDocument();
    expect(screen.getAllByText("실파일 업로드")).toHaveLength(15);
    expect(screen.getByText("현재 live path: 문피아 정산 슬롯 XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 문피아 작가 보정 슬롯 CSV/XLSX 1-file")).toBeInTheDocument();
    expect(screen.getAllByText("현재 live path: 시리즈 일반 슬롯 HTML-XLS 3-file").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("현재 live path: 시리즈 앱 슬롯 HTML-XLS 3-file").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("현재 live path: 미스터블루 단일 XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 판무림 단일 XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 북큐브 단일 XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 에피루스 단일 CSV 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 예스24 단일 XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 알라딘 단일 CSV 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 구루컴퍼니 단일 CSV 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 교보문고 단일 XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 노벨피아 단일 HTML-XLS 1-file")).toBeInTheDocument();
  });
});
