import { describe, expect, it } from "vitest";
import type { Company, ExportArtifactType } from "../types/settlement";
import { getBatchExportFileNames, getExportFileName } from "./exportFileNames";

describe("export file names", () => {
  it.each<[Company, ExportArtifactType, string]>([
    ["raon", "review_excel", "라온_정산_통합검수용.xlsx"],
    ["raon", "mailer_excel", "라온_메일러_발송용.xlsx"],
    ["sr", "review_excel", "에스알_정산_통합검수용.xlsx"],
    ["sr", "mailer_excel", "에스알_메일러_발송용.xlsx"],
  ])("maps %s %s to %s", (company, artifactType, expected) => {
    expect(getExportFileName(company, artifactType)).toBe(expected);
  });

  it("returns the batch-level four-file contract in stable order", () => {
    expect(getBatchExportFileNames()).toEqual([
      "라온_정산_통합검수용.xlsx",
      "라온_메일러_발송용.xlsx",
      "에스알_정산_통합검수용.xlsx",
      "에스알_메일러_발송용.xlsx",
    ]);
  });
});
