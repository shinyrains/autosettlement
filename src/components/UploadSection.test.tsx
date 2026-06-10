import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockUploads } from "../data/mockSettlement";
import { isLiveUploadEnabled } from "../state/uploadMutation";
import { UploadSection } from "./UploadSection";

describe("UploadSection", () => {
  it("renders munpia slot-based upload state and the current live upload cards", () => {
    render(
      <UploadSection
        uploads={mockUploads}
        isUploadEnabled={isLiveUploadEnabled}
        onUploadFiles={async () => {}}
      />,
    );

    expect(screen.getByText("문피아")).toBeInTheDocument();
    expect(screen.getByText("슬롯 상태")).toBeInTheDocument();
    expect(screen.getByText("정산 파일")).toBeInTheDocument();
    expect(screen.getByText("작가 보정")).toBeInTheDocument();
    expect(screen.getByText("required · xlsx")).toBeInTheDocument();
    expect(screen.getByText("optional · csv/xlsx")).toBeInTheDocument();
    expect(screen.getByText("munpia-author-correction.csv")).toBeInTheDocument();
    expect(screen.getAllByText("실파일 업로드")).toHaveLength(5);
    expect(screen.getByText("현재 live path: 문피아 정산 슬롯 XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 문피아 작가 보정 슬롯 CSV/XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 미스터블루 단일 XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 판무림 단일 XLSX 1-file")).toBeInTheDocument();
    expect(screen.getByText("현재 live path: 북큐브 단일 XLSX 1-file")).toBeInTheDocument();
  });
});
