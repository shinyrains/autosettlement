import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UploadSection } from "./UploadSection";

describe("UploadSection", () => {
  it("renders munpia slot-based upload state for settlement and author correction", () => {
    render(<UploadSection />);

    expect(screen.getByText("문피아")).toBeInTheDocument();
    expect(screen.getByText("슬롯 상태")).toBeInTheDocument();
    expect(screen.getByText("정산 파일")).toBeInTheDocument();
    expect(screen.getByText("작가 보정")).toBeInTheDocument();
    expect(screen.getByText("required · xlsx")).toBeInTheDocument();
    expect(screen.getByText("optional · csv/xlsx")).toBeInTheDocument();
    expect(screen.getByText("munpia-author-correction.csv")).toBeInTheDocument();
  });
});
