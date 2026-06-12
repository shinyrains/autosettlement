export type Company = "raon" | "sr";

export type Platform =
  | "novelpia"
  | "mootoon"
  | "panmurim"
  | "epyrus"
  | "kyobo"
  | "yes24"
  | "aladin"
  | "guru_company"
  | "series"
  | "joara"
  | "bookcube"
  | "onestore"
  | "kakao_page"
  | "munpia"
  | "misterblue"
  | "ridibooks";

export type BatchStatus =
  | "draft"
  | "uploaded"
  | "reviewing"
  | "ready_for_export"
  | "exported";

export type Batch = {
  batchId: string;
  batchName: string;
  settlementMonth: string;
  status: BatchStatus;
  uploads: BatchPlatformUpload[];
  createdAt: string;
  updatedAt: string;
};

export type BatchPlatformUploadStatus =
  | "empty"
  | "uploaded"
  | "parsed"
  | "warning"
  | "error"
  | "passed";

export type BatchPlatformUploadSlotKey =
  | "settlement"
  | "authorCorrection"
  | "seriesGeneral"
  | "seriesApp"
  | "base"
  | "file1"
  | "event"
  | "mgCorrection"
  | "settlementDetail"
  | "workSettlement";

export type BatchPlatformUploadSlot = {
  slotId: string;
  slotKey: BatchPlatformUploadSlotKey;
  label: string;
  required: boolean;
  acceptedFileKinds: Array<"csv" | "xlsx" | "html_xls">;
  status: BatchPlatformUploadStatus;
  fileCount: number;
  sourceFileNames: string[];
  issueCount: number;
  lastUploadedAt?: string;
};

export type BatchPlatformUpload = {
  uploadId: string;
  batchId: string;
  company: Company;
  platform: Platform;
  status: BatchPlatformUploadStatus;
  fileCount: number;
  sourceFileNames: string[];
  parsedRowCount: number;
  issueCount: number;
  lastUploadedAt?: string;
  slots?: BatchPlatformUploadSlot[];
  sharedCompanies?: Company[];
};

export type SettlementRow = {
  rowId: string;
  company: Company;
  platform: Platform;
  saleMonth: string;
  workTitle: string;
  mailerContentTitle: string;
  author: string;
  publisher?: string;
  grossSales: number;
  settlementAmount: number;
  sourceFileName: string;
  sourceRowIndex: number;
  issues: string[];
};

export type ReviewDecisionStatus = "pending" | "held" | "confirmed";

export type ReviewDecision = {
  rowId: string;
  status: ReviewDecisionStatus;
  note?: string;
  updatedAt: string;
};

export type ParseIssueSeverity = "info" | "warning" | "error";

export type ParseIssueType =
  | "parse_error"
  | "missing_file"
  | "missing_column"
  | "missing_field"
  | "mapping_failed"
  | "company_split_failed"
  | "invalid_value"
  | "duplicate_row";

export type ParseIssue = {
  issueId: string;
  batchId: string;
  company: Company;
  platform: Platform;
  severity: ParseIssueSeverity;
  issueType: ParseIssueType;
  message: string;
  uploadId?: string;
  slotKey?: BatchPlatformUploadSlotKey;
  sourceFileName?: string;
  sourceRowIndex?: number;
  rowId?: string;
};

export type ExportArtifactType = "review_excel" | "mailer_excel";

export type ExportArtifactStatus = "pending" | "ready" | "failed";

export type ExportArtifact = {
  artifactId: string;
  batchId: string;
  company: Company;
  artifactType: ExportArtifactType;
  fileName: string;
  status: ExportArtifactStatus;
  rowCount: number;
  generatedAt?: string;
};
