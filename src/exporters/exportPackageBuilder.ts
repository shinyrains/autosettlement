import type { Company, ExportArtifactType, SettlementRow } from "../types/settlement";
import { getExportFileName, type ExportFileName } from "./exportFileNames";
import { mapToMailerExportRows, mapToReviewExportRows } from "./exportRowMappers";
import { createMailerWorkbookBuffer, createReviewWorkbookBuffer } from "./xlsxWorkbookWriter";

export type ExportPackage = {
  company: Company;
  artifactType: ExportArtifactType;
  fileName: ExportFileName;
  workbookBuffer: ArrayBuffer;
  rowCount: number;
};

const exportCompanyOrder = ["raon", "sr"] as const satisfies readonly Company[];

export function buildExportPackages(rows: SettlementRow[]): ExportPackage[] {
  return exportCompanyOrder.flatMap((company) => {
    const companyRows = rows.filter((row) => row.company === company);

    if (companyRows.length === 0) {
      return [];
    }

    return [
      buildReviewPackage(company, companyRows),
      buildMailerPackage(company, companyRows),
    ];
  });
}

function buildReviewPackage(company: Company, rows: SettlementRow[]): ExportPackage {
  const artifactType = "review_excel";
  const reviewRows = mapToReviewExportRows(rows);

  return {
    company,
    artifactType,
    fileName: getExportFileName(company, artifactType),
    workbookBuffer: createReviewWorkbookBuffer(reviewRows),
    rowCount: reviewRows.length,
  };
}

function buildMailerPackage(company: Company, rows: SettlementRow[]): ExportPackage {
  const artifactType = "mailer_excel";
  const mailerRows = mapToMailerExportRows(rows);

  return {
    company,
    artifactType,
    fileName: getExportFileName(company, artifactType),
    workbookBuffer: createMailerWorkbookBuffer(mailerRows),
    rowCount: mailerRows.length,
  };
}
