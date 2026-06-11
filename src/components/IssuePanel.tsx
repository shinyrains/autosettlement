import { AlertTriangle } from "lucide-react";
import {
  companyLabels,
  platformLabels,
} from "../data/mockSettlement";
import type { ParseIssue, ParseIssueType } from "../types/settlement";

const issueTypeLabels: Record<ParseIssueType, string> = {
  parse_error: "파싱 오류",
  missing_file: "누락 파일",
  missing_column: "누락 컬럼",
  missing_field: "누락 필드",
  mapping_failed: "매핑 실패",
  company_split_failed: "회사 분리 실패",
  invalid_value: "비정상 값",
  duplicate_row: "중복 행",
};

const severityLabels = {
  info: "안내",
  warning: "주의",
  error: "오류",
} as const;

const severityClasses = {
  info: "border-sky-400/30 bg-sky-500/10 text-sky-200",
  warning: "border-amber/40 bg-amber/10 text-amber",
  error: "border-coral/40 bg-coral/10 text-coral",
} as const;

export function IssuePanel({
  issues,
  onOpenIssueRow,
}: {
  issues: ParseIssue[];
  onOpenIssueRow: (rowId: string) => void;
}) {
  return (
    <section className="rounded-md border border-line bg-ink-850">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber" />
          <div>
            <h2 className="text-lg font-semibold tracking-normal">오류/누락/매칭 실패 패널</h2>
            <p className="mt-1 text-sm text-slate-400">문제 유형, 원본 참조, 영향 범위를 한 화면에서 우선 확인합니다.</p>
          </div>
        </div>
        <span className="rounded-md bg-coral/15 px-3 py-1 text-sm font-semibold text-coral">{issues.length}건</span>
      </div>
      {issues.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500">현재 확인된 파싱 이슈가 없습니다.</div>
      ) : (
        <div className="divide-y divide-line">
          {issues.map((issue) => {
            const detail = getIssueDetail(issue);
            const sourceReference = getSourceReference(issue);
            const impactScope = getImpactScope(issue);
            const linkedInReview = Boolean(issue.rowId);

            return (
              <article key={issue.issueId} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-line bg-ink-800 px-2 py-1 text-xs font-semibold text-slate-200">
                        {issueTypeLabels[issue.issueType]}
                      </span>
                      <span className="text-sm text-slate-300">{companyLabels[issue.company]} · {platformLabels[issue.platform]}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClasses[issue.severity]}`}>
                        {severityLabels[issue.severity]}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-200">{issue.message}</p>
                  </div>
                  {issue.rowId ? (
                    <button
                      type="button"
                      className="rounded-md border border-signal/40 bg-signal/10 px-3 py-2 text-sm font-medium text-signal transition hover:bg-signal/20"
                      onClick={() => onOpenIssueRow(issue.rowId!)}
                    >
                      검수에서 열기
                    </button>
                  ) : null}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
                  <DetailItem label="원본 행 참조" value={sourceReference} />
                  <DetailItem label="영향 범위" value={impactScope} />
                  <DetailItem label="누락 필드" value={detail.missingField} />
                  <DetailItem label="매칭 실패 사유" value={detail.mappingReason} />
                </dl>
                <p className="mt-3 text-xs text-slate-500">
                  {linkedInReview ? `연결 검수 행: ${issue.rowId}` : "연결 검수 행 없음"}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-ink-800 px-3 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</dt>
      <dd className="mt-2 text-sm text-slate-200">{value}</dd>
    </div>
  );
}

function getSourceReference(issue: ParseIssue): string {
  if (issue.sourceFileName && typeof issue.sourceRowIndex === "number") {
    return `${issue.sourceFileName} · 행 ${issue.sourceRowIndex}`;
  }
  if (issue.sourceFileName) {
    return issue.sourceFileName;
  }
  return "원본 참조 없음";
}

function getImpactScope(issue: ParseIssue): string {
  if (issue.rowId) {
    return `검수 행 ${issue.rowId} 확인 필요`;
  }
  return `${companyLabels[issue.company]} ${platformLabels[issue.platform]} 업로드/파싱 흐름 확인 필요`;
}

function getIssueDetail(issue: ParseIssue): { missingField: string; mappingReason: string } {
  switch (issue.issueType) {
    case "missing_column":
      return {
        missingField: inferFieldName(issue.message) ?? "컬럼 정보 확인 필요",
        mappingReason: "해당 컬럼 없이 기본값 또는 빈 값으로 유지됩니다.",
      };
    case "missing_field":
      return {
        missingField: inferFieldName(issue.message) ?? "필드 정보 확인 필요",
        mappingReason: "필수 입력값이 없어 정규화 결과를 확정할 수 없습니다.",
      };
    case "mapping_failed":
      return {
        missingField: "-",
        mappingReason: issue.message,
      };
    case "company_split_failed":
      return {
        missingField: "회사 구분 값 확인 필요",
        mappingReason: issue.message,
      };
    case "missing_file":
      return {
        missingField: "업로드 파일 확인 필요",
        mappingReason: issue.message,
      };
    default:
      return {
        missingField: "-",
        mappingReason: issue.message,
      };
  }
}

function inferFieldName(message: string): string | null {
  const match = message.match(/([가-힣A-Za-z_]+)\s*(컬럼|필드)/);
  return match?.[1] ?? null;
}
