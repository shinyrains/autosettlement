import type { Company, ExportArtifactType } from "../types/settlement";

export type ExportCompany = Company;
export type ExportFileArtifactType = ExportArtifactType;
export type ExportFileName = `${string}.xlsx`;

const companyNamePrefixes: Record<ExportCompany, string> = {
  raon: "라온",
  sr: "에스알",
};

const artifactNameSuffixes: Record<ExportFileArtifactType, string> = {
  review_excel: "정산_통합검수용",
  mailer_excel: "메일러_발송용",
};

export function getExportFileName(
  company: ExportCompany,
  artifactType: ExportFileArtifactType,
): ExportFileName {
  return `${companyNamePrefixes[company]}_${artifactNameSuffixes[artifactType]}.xlsx`;
}

export function getBatchExportFileNames(): ExportFileName[] {
  return [
    getExportFileName("raon", "review_excel"),
    getExportFileName("raon", "mailer_excel"),
    getExportFileName("sr", "review_excel"),
    getExportFileName("sr", "mailer_excel"),
  ];
}
