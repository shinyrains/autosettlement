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
        readyExports={packages.length}
      />,
    );

    const downloadButtons = screen.getAllByRole("button", { name: /download/i });
    expect(downloadButtons).toHaveLength(4);

    fireEvent.click(downloadButtons[0]);

    expect(onDownloadPackage).toHaveBeenCalledWith(packages[0]);
  });

  it("shows blocked export state without creating download buttons", () => {
    const blockedResult = {
      packages: [] as ExportPackage[],
      issues: [],
      status: "blocked" as const,
    };

    render(<ExportSection exportResult={blockedResult} readyExports={0} />);

    expect(screen.getByText(/export blocked/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /download/i })).not.toBeInTheDocument();
  });
});
