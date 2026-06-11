import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Layers3, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  companyLabels,
  platformLabels,
} from "../data/mockSettlement";
import type { Company, ParseIssue, Platform, ReviewDecisionStatus, SettlementRow } from "../types/settlement";
import type { ReviewActionQueue, ReviewFilterState } from "../selectors/reviewSelectors";
import { DetailLine, Filter } from "./ShellPrimitives";
import { moneyFormatter } from "./uiShellConfig";

const HOLD_REASON_PREVIEW_MAX_LENGTH = 25;

function formatHoldReasonPreview(note: string): string {
  const normalizedNote = note.trim();
  return normalizedNote.length > HOLD_REASON_PREVIEW_MAX_LENGTH
    ? `${normalizedNote.slice(0, HOLD_REASON_PREVIEW_MAX_LENGTH)}...`
    : normalizedNote;
}

function getReviewStatusLabel(status: ReviewDecisionStatus): string {
  return status === "confirmed" ? "검수 확정" : status === "held" ? "검수 보류" : "검수 대기";
}

function formatReviewDecisionUpdatedAt(updatedAt?: string): string {
  if (!updatedAt) {
    return "저장된 변경 시각 없음";
  }

  const [datePart, timePart = ""] = updatedAt.split("T");
  const timeWithoutSeconds = timePart.slice(0, 5);
  return timeWithoutSeconds ? `${datePart} ${timeWithoutSeconds}` : datePart;
}

type ReviewSectionProps = {
  rows: SettlementRow[];
  totalRowCount: number;
  availableCompanies: Company[];
  availablePlatforms: Platform[];
  filters: ReviewFilterState;
  onChangeFilters: (filters: ReviewFilterState) => void;
  selectedRow?: SettlementRow;
  selectedRowReviewStatus: ReviewDecisionStatus;
  selectedRowReviewNote: string;
  selectedRowReviewUpdatedAt?: string;
  selectedRowIssues: ParseIssue[];
  selectedRowId: string;
  onSelectRow: (rowId: string) => void;
  confirmedRowCount: number;
  reviewActionQueue: ReviewActionQueue;
  onOpenQueuedRow: (rowId: string) => void;
  onConfirmQueuedRows: (rowIds: string[]) => void;
  onResetQueuedRows: (rowIds: string[]) => void;
  onConfirmRow: (rowId: string) => void;
  onHoldRow: (rowId: string, note: string) => void;
  onResetRowConfirmation: (rowId: string) => void;
  onConfirmRows: (rowIds: string[]) => void;
  onResetRowsConfirmation: (rowIds: string[]) => void;
  hasNextPendingRow: boolean;
  hasNextIssueRow: boolean;
  onSelectNextPendingRow: () => void;
  onSelectNextIssueRow: () => void;
  onSaveRowEdits: (
    rowId: string,
    fields: Partial<Pick<SettlementRow, "mailerContentTitle" | "author" | "publisher">>,
  ) => void;
};

export function ReviewSection({
  rows,
  totalRowCount,
  availableCompanies,
  availablePlatforms,
  filters,
  onChangeFilters,
  selectedRow,
  selectedRowReviewStatus,
  selectedRowReviewNote,
  selectedRowReviewUpdatedAt,
  selectedRowIssues,
  selectedRowId,
  onSelectRow,
  confirmedRowCount,
  reviewActionQueue,
  onOpenQueuedRow,
  onConfirmQueuedRows,
  onResetQueuedRows,
  onConfirmRow,
  onHoldRow,
  onResetRowConfirmation,
  onConfirmRows,
  onResetRowsConfirmation,
  hasNextPendingRow,
  hasNextIssueRow,
  onSelectNextPendingRow,
  onSelectNextIssueRow,
  onSaveRowEdits,
}: ReviewSectionProps) {
  const columnHelper = createColumnHelper<SettlementRow>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("company", {
        header: "회사",
        cell: (info) => companyLabels[info.getValue()],
      }),
      columnHelper.accessor("platform", {
        header: "플랫폼",
        cell: (info) => platformLabels[info.getValue()],
      }),
      columnHelper.accessor("saleMonth", { header: "판매월" }),
      columnHelper.accessor("workTitle", { header: "작품" }),
      columnHelper.accessor("mailerContentTitle", { header: "메일러 컨텐츠" }),
      columnHelper.accessor("author", { header: "작가" }),
      columnHelper.accessor("publisher", {
        header: "출판사",
        cell: (info) => info.getValue() ?? "-",
      }),
      columnHelper.accessor("grossSales", {
        header: "총매출",
        cell: (info) => <span className="font-mono">{moneyFormatter.format(info.getValue())}</span>,
      }),
      columnHelper.accessor("settlementAmount", {
        header: "정산금",
        cell: (info) => <span className="font-mono text-signal">{moneyFormatter.format(info.getValue())}</span>,
      }),
    ],
    [columnHelper],
  );
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const filteredIssueRowCount = rows.filter((row) => row.issues.length > 0).length;
  const filteredRowIds = rows.map((row) => row.rowId);
  const isBulkActionDisabled = filteredRowIds.length === 0;

  return (
    <section id="step-3" className="grid grid-cols-[minmax(0,1fr)_360px] gap-5">
      <div className="rounded-md border border-line bg-ink-850">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-normal">공통 정산 검수</h2>
            <p className="mt-1 text-sm text-slate-400">
              현재 필터 결과 {rows.length}행 / 전체 {totalRowCount}행 · 이슈 연결 행 {filteredIssueRowCount}건 · 검수 확정 {confirmedRowCount}건
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
            <FilterSelect
              icon={Filter}
              label="회사 필터"
              value={filters.company}
              options={[
                { value: "all", label: "회사 전체" },
                ...availableCompanies.map((company) => ({ value: company, label: companyLabels[company] })),
              ]}
              onChange={(value) => onChangeFilters({ ...filters, company: value as ReviewFilterState["company"] })}
            />
            <FilterSelect
              icon={Layers3}
              label="플랫폼 필터"
              value={filters.platform}
              options={[
                { value: "all", label: "플랫폼 전체" },
                ...availablePlatforms.map((platform) => ({ value: platform, label: platformLabels[platform] })),
              ]}
              onChange={(value) => onChangeFilters({ ...filters, platform: value as ReviewFilterState["platform"] })}
            />
            <FilterSelect
              icon={Search}
              label="이슈 필터"
              value={filters.issueMode}
              options={[
                { value: "all", label: "전체 행" },
                { value: "with_issues", label: "이슈 포함 행만" },
              ]}
              onChange={(value) => onChangeFilters({ ...filters, issueMode: value as ReviewFilterState["issueMode"] })}
            />
            <FilterSelect
              icon={Filter}
              label="검수 상태 필터"
              value={filters.reviewStatus}
              options={[
                { value: "all", label: "검수 상태 전체" },
                { value: "pending", label: "미확정 행만" },
                { value: "held", label: "보류 행만" },
                { value: "confirmed", label: "확정 행만" },
              ]}
              onChange={(value) => onChangeFilters({ ...filters, reviewStatus: value as ReviewFilterState["reviewStatus"] })}
            />
            <SearchField
              label="검수 검색"
              value={filters.searchQuery}
              onChange={(value) => onChangeFilters({ ...filters, searchQuery: value })}
            />
            <FilterSelect
              icon={ArrowUpDown}
              label="정렬"
              value={filters.sortMode}
              options={[
                { value: "source", label: "원본 순서" },
                { value: "settlement_desc", label: "정산금 높은 순" },
                { value: "title", label: "메일러 제목순" },
              ]}
              onChange={(value) => onChangeFilters({ ...filters, sortMode: value as ReviewFilterState["sortMode"] })}
            />
            <button
              type="button"
              className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isBulkActionDisabled}
              onClick={() => onConfirmRows(filteredRowIds)}
            >
              현재 필터 결과 모두 확정
            </button>
            <button
              type="button"
              className="rounded-md border border-line px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-400 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isBulkActionDisabled}
              onClick={() => onResetRowsConfirmation(filteredRowIds)}
            >
              현재 필터 결과 확정 해제
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-ink-800 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="border-b border-line px-4 py-3">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length > 0 ? table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={row.original.rowId === selectedRowId ? "cursor-pointer bg-signal/10" : "cursor-pointer hover:bg-ink-800"}
                  onClick={() => onSelectRow(row.original.rowId)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="border-b border-line px-4 py-4 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )) : (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                    현재 필터 조건과 일치하는 검수 행이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ReviewDetail
        selectedRow={selectedRow}
        selectedRowReviewStatus={selectedRowReviewStatus}
        selectedRowReviewNote={selectedRowReviewNote}
        selectedRowReviewUpdatedAt={selectedRowReviewUpdatedAt}
        selectedRowIssues={selectedRowIssues}
        reviewActionQueue={reviewActionQueue}
        onOpenQueuedRow={onOpenQueuedRow}
        onConfirmQueuedRows={onConfirmQueuedRows}
        onResetQueuedRows={onResetQueuedRows}
        onConfirmRow={onConfirmRow}
        onHoldRow={onHoldRow}
        onResetRowConfirmation={onResetRowConfirmation}
        hasNextPendingRow={hasNextPendingRow}
        hasNextIssueRow={hasNextIssueRow}
        onSelectNextPendingRow={onSelectNextPendingRow}
        onSelectNextIssueRow={onSelectNextIssueRow}
        onSaveRowEdits={onSaveRowEdits}
      />
    </section>
  );
}

function ReviewDetail({
  selectedRow,
  selectedRowReviewStatus,
  selectedRowReviewNote,
  selectedRowReviewUpdatedAt,
  selectedRowIssues,
  reviewActionQueue,
  onOpenQueuedRow,
  onConfirmQueuedRows,
  onResetQueuedRows,
  onConfirmRow,
  onHoldRow,
  onResetRowConfirmation,
  hasNextPendingRow,
  hasNextIssueRow,
  onSelectNextPendingRow,
  onSelectNextIssueRow,
  onSaveRowEdits,
}: {
  selectedRow?: SettlementRow;
  selectedRowReviewStatus: ReviewDecisionStatus;
  selectedRowReviewNote: string;
  selectedRowReviewUpdatedAt?: string;
  selectedRowIssues: ParseIssue[];
  reviewActionQueue: ReviewActionQueue;
  onOpenQueuedRow: (rowId: string) => void;
  onConfirmQueuedRows: (rowIds: string[]) => void;
  onResetQueuedRows: (rowIds: string[]) => void;
  onConfirmRow: (rowId: string) => void;
  onHoldRow: (rowId: string, note: string) => void;
  onResetRowConfirmation: (rowId: string) => void;
  hasNextPendingRow: boolean;
  hasNextIssueRow: boolean;
  onSelectNextPendingRow: () => void;
  onSelectNextIssueRow: () => void;
  onSaveRowEdits: (
    rowId: string,
    fields: Partial<Pick<SettlementRow, "mailerContentTitle" | "author" | "publisher">>,
  ) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingHoldReason, setIsEditingHoldReason] = useState(false);
  const [draftFields, setDraftFields] = useState({
    mailerContentTitle: "",
    author: "",
    publisher: "",
  });
  const [draftHoldReason, setDraftHoldReason] = useState("");
  const canSaveHoldReason = draftHoldReason.trim().length > 0;
  const holdReasonPresets = [
    { label: "중복 정산", value: "앱/웹 중복 정산 확인" },
    { label: "원천 파일 확인", value: "원천 파일 행/금액 확인 필요" },
    { label: "출판사 확인", value: "출판사/작가 매핑 확인 필요" },
    { label: "계약 확인", value: "계약 조건 확인 필요" },
  ];

  useEffect(() => {
    if (!selectedRow) {
      return;
    }

    setDraftFields({
      mailerContentTitle: selectedRow.mailerContentTitle,
      author: selectedRow.author,
      publisher: selectedRow.publisher ?? "",
    });
    setDraftHoldReason(selectedRowReviewNote);
  }, [selectedRow, selectedRowReviewNote]);

  if (!selectedRow) {
    return (
      <aside className="rounded-md border border-line bg-ink-850 p-5">
        <p className="text-sm font-semibold text-signal">선택 행 상세</p>
        <h3 className="mt-3 text-xl font-semibold tracking-normal">선택된 행 없음</h3>
        <p className="mt-3 text-sm text-slate-400">현재 필터 조건과 일치하는 행을 선택하면 상세와 연결 이슈를 확인할 수 있습니다.</p>
      </aside>
    );
  }

  return (
    <aside className="rounded-md border border-line bg-ink-850 p-5">
      <p className="text-sm font-semibold text-signal">선택 행 상세</p>
      <div className="mt-3 flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold tracking-normal">{selectedRow.mailerContentTitle}</h3>
        <span className={selectedRowReviewStatus === "confirmed"
          ? "rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300"
          : selectedRowReviewStatus === "held"
            ? "rounded-full border border-orange-400/40 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-300"
            : "rounded-full border border-amber/40 bg-amber/10 px-2.5 py-1 text-xs font-semibold text-amber"}
        >
          {getReviewStatusLabel(selectedRowReviewStatus)}
        </span>
      </div>
      <div className="mt-5 space-y-3 text-sm">
        <DetailLine label="회사" value={companyLabels[selectedRow.company]} />
        <DetailLine label="플랫폼" value={platformLabels[selectedRow.platform]} />
        <DetailLine label="원본" value={`${selectedRow.sourceFileName} · row ${selectedRow.sourceRowIndex}`} />
        <DetailLine label="정산금" value={moneyFormatter.format(selectedRow.settlementAmount)} />
      </div>
      <div className="mt-4 rounded-md border border-line bg-ink-800 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">검수 결정 이력</p>
        <div className="mt-2 space-y-1 text-sm text-slate-300">
          <p>현재 결정: {getReviewStatusLabel(selectedRowReviewStatus)}</p>
          <p>마지막 변경: {formatReviewDecisionUpdatedAt(selectedRowReviewUpdatedAt)}</p>
          <p>감사 사유: {selectedRowReviewNote || "저장된 사유 없음"}</p>
        </div>
      </div>
      <ReviewQueueSummary
        queue={reviewActionQueue}
        onOpenQueuedRow={onOpenQueuedRow}
        onConfirmQueuedRows={onConfirmQueuedRows}
        onResetQueuedRows={onResetQueuedRows}
      />
      <div className="mt-6 rounded-md border border-line bg-ink-800 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">검수 액션</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-line px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-400 hover:bg-ink-700"
            onClick={() => setIsEditing(true)}
          >
            검수 행 편집
          </button>
          <button
            type="button"
            className="rounded-md border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-sm font-medium text-orange-200 transition hover:bg-orange-500/20"
            onClick={() => setIsEditingHoldReason(true)}
          >
            보류 사유 편집
          </button>
          {selectedRowReviewStatus === "confirmed" ? (
            <button
              type="button"
              className="rounded-md border border-line px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-400 hover:bg-ink-700"
              onClick={() => onResetRowConfirmation(selectedRow.rowId)}
            >
              검수 확정 해제
            </button>
          ) : (
            <button
              type="button"
              className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
              onClick={() => onConfirmRow(selectedRow.rowId)}
            >
              이 행 검수 확정
            </button>
          )}
          <button
            type="button"
            className="rounded-md border border-line px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-400 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasNextPendingRow}
            onClick={onSelectNextPendingRow}
          >
            다음 미확정 행으로 이동
          </button>
          <button
            type="button"
            className="rounded-md border border-line px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-400 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasNextIssueRow}
            onClick={onSelectNextIssueRow}
          >
            다음 이슈 행으로 이동
          </button>
        </div>
        {isEditing ? (
          <div className="mt-4 space-y-3 rounded-md border border-line bg-ink-850 p-3">
            <label className="block text-sm text-slate-300">
              <span className="mb-1 block text-xs font-semibold text-slate-400">메일러 컨텐츠</span>
              <input
                aria-label="메일러 컨텐츠 편집"
                className="w-full rounded-md border border-line bg-ink-900 px-3 py-2 text-sm text-slate-100 outline-none"
                value={draftFields.mailerContentTitle}
                onChange={(event) => setDraftFields((current) => ({ ...current, mailerContentTitle: event.target.value }))}
              />
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-1 block text-xs font-semibold text-slate-400">작가</span>
              <input
                aria-label="작가 편집"
                className="w-full rounded-md border border-line bg-ink-900 px-3 py-2 text-sm text-slate-100 outline-none"
                value={draftFields.author}
                onChange={(event) => setDraftFields((current) => ({ ...current, author: event.target.value }))}
              />
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-1 block text-xs font-semibold text-slate-400">출판사</span>
              <input
                aria-label="출판사 편집"
                className="w-full rounded-md border border-line bg-ink-900 px-3 py-2 text-sm text-slate-100 outline-none"
                value={draftFields.publisher}
                onChange={(event) => setDraftFields((current) => ({ ...current, publisher: event.target.value }))}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
                onClick={() => onSaveRowEdits(selectedRow.rowId, draftFields)}
              >
                검수 편집 저장
              </button>
              <button
                type="button"
                className="rounded-md border border-line px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-400 hover:bg-ink-700"
                onClick={() => {
                  setDraftFields({
                    mailerContentTitle: selectedRow.mailerContentTitle,
                    author: selectedRow.author,
                    publisher: selectedRow.publisher ?? "",
                  });
                  setIsEditing(false);
                }}
              >
                편집 취소
              </button>
            </div>
          </div>
        ) : null}
        <div className="mt-4 rounded-md border border-line bg-ink-850 p-3">
          <p className="text-xs font-semibold text-slate-400">검수 보류 사유</p>
          {selectedRowReviewNote ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{selectedRowReviewNote}</p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">저장된 보류 사유 없음</p>
          )}
          {isEditingHoldReason ? (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {holdReasonPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className="rounded-md border border-orange-400/30 bg-orange-500/5 px-2.5 py-1.5 text-xs font-medium text-orange-100 transition hover:bg-orange-500/15"
                    onClick={() => setDraftHoldReason(preset.value)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <label className="block text-sm text-slate-300">
                <span className="mb-1 block text-xs font-semibold text-slate-400">검수 보류 사유</span>
                <textarea
                  aria-label="검수 보류 사유"
                  className="min-h-24 w-full rounded-md border border-line bg-ink-900 px-3 py-2 text-sm text-slate-100 outline-none"
                  value={draftHoldReason}
                  onChange={(event) => setDraftHoldReason(event.target.value)}
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-sm font-medium text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canSaveHoldReason}
                  onClick={() => {
                    if (!canSaveHoldReason) {
                      return;
                    }
                    onHoldRow(selectedRow.rowId, draftHoldReason.trim());
                    setIsEditingHoldReason(false);
                  }}
                >
                  보류 사유 저장
                </button>
                <button
                  type="button"
                  className="rounded-md border border-line px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-400 hover:bg-ink-700"
                  onClick={() => {
                    setDraftHoldReason(selectedRowReviewNote);
                    setIsEditingHoldReason(false);
                  }}
                >
                  보류 사유 취소
                </button>
              </div>
              {!canSaveHoldReason ? (
                <p className="text-xs text-orange-200">보류 사유를 입력해야 보류로 전환할 수 있습니다.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-6 border-t border-line pt-5">
        <p className="text-sm font-semibold text-slate-300">연결된 이슈</p>
        {selectedRowIssues.length > 0 ? (
          <div className="mt-3 space-y-3">
            {selectedRowIssues.map((issue) => (
              <div key={issue.issueId} className="rounded-md border border-line bg-ink-800 p-3 text-sm text-slate-300">
                <p className="font-mono text-xs text-amber">{issue.issueType}</p>
                <p className="mt-2">{issue.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">연결된 이슈 없음</p>
        )}
      </div>
    </aside>
  );
}

function ReviewQueueSummary({
  queue,
  onOpenQueuedRow,
  onConfirmQueuedRows,
  onResetQueuedRows,
}: {
  queue: ReviewActionQueue;
  onOpenQueuedRow: (rowId: string) => void;
  onConfirmQueuedRows: (rowIds: string[]) => void;
  onResetQueuedRows: (rowIds: string[]) => void;
}) {
  return (
    <div className="mt-6 rounded-md border border-line bg-ink-800 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">검수 큐</p>
        <p className="text-xs text-slate-500">현재 필터 기준</p>
      </div>
      <p className="mt-1 text-xs text-slate-500">아래 이슈/고액/전체 미확정 큐는 검수 보류 행을 포함합니다.</p>
      <div className="mt-3 space-y-2">
        <ReviewQueueCard
          label="보류 제외 미확정"
          count={queue.activePending.count}
          nextRow={queue.activePending.nextRow}
          rowIds={queue.activePending.rowIds}
          actionLabel="보류 제외 미확정 첫 행 열기"
          bulkActionLabel="보류 제외 미확정 모두 확정"
          bulkActionTone="confirm"
          onOpenQueuedRow={onOpenQueuedRow}
          onApplyQueuedRows={onConfirmQueuedRows}
        />
        <ReviewQueueCard
          label="보류"
          count={queue.held.count}
          nextRow={queue.held.nextRow}
          rowIds={queue.held.rowIds}
          notePreview={queue.held.notePreview}
          actionLabel="보류 첫 행 열기"
          bulkActionLabel="보류 모두 대기로 전환"
          bulkActionTone="neutral"
          onOpenQueuedRow={onOpenQueuedRow}
          onApplyQueuedRows={onResetQueuedRows}
        />
        {queue.holdReasonGroups.length > 0 ? (
          <div className="rounded-md border border-orange-400/20 bg-orange-500/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-orange-200">보류 사유 그룹</p>
            <p className="mt-1 text-xs text-slate-500">보류 사유가 긴 경우 축약 표시되며 전체 사유는 도움말과 상세 영역에서 확인할 수 있습니다.</p>
            <div className="mt-2 space-y-2">
              {queue.holdReasonGroups.map((group) => {
                const notePreview = formatHoldReasonPreview(group.note);
                return (
                  <div key={group.note} className="flex items-start justify-between gap-3 rounded border border-line bg-ink-850 p-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-200" title={group.note}>{notePreview} {group.count}행</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {group.nextRow ? `${companyLabels[group.nextRow.company]} · ${platformLabels[group.nextRow.platform]} · ${group.nextRow.mailerContentTitle}` : "대상 행 없음"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <button
                        type="button"
                        aria-label={`${group.note} 사유 그룹 첫 행 열기`}
                        className="rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-400 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!group.nextRow}
                        onClick={() => {
                          if (group.nextRow) {
                            onOpenQueuedRow(group.nextRow.rowId);
                          }
                        }}
                      >
                        사유 그룹 첫 행 열기
                      </button>
                      <button
                        type="button"
                        aria-label={`${group.note} 사유 그룹 모두 확정`}
                        className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={group.rowIds.length === 0}
                        onClick={() => onConfirmQueuedRows(group.rowIds)}
                      >
                        사유 그룹 모두 확정
                      </button>
                      <button
                        type="button"
                        aria-label={`${group.note} 사유 그룹 대기로 전환`}
                        className="rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-400 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={group.rowIds.length === 0}
                        onClick={() => onResetQueuedRows(group.rowIds)}
                      >
                        사유 그룹 대기로 전환
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        <ReviewQueueCard
          label="이슈 미확정"
          count={queue.pendingIssue.count}
          nextRow={queue.pendingIssue.nextRow}
          rowIds={queue.pendingIssue.rowIds}
          actionLabel="이슈 미확정 첫 행 열기"
          bulkActionLabel="이슈 미확정 모두 확정"
          bulkActionTone="confirm"
          onOpenQueuedRow={onOpenQueuedRow}
          onApplyQueuedRows={onConfirmQueuedRows}
        />
        <ReviewQueueCard
          label="고액 미확정"
          count={queue.highValuePending.count}
          nextRow={queue.highValuePending.nextRow}
          rowIds={queue.highValuePending.rowIds}
          actionLabel="고액 미확정 첫 행 열기"
          bulkActionLabel="고액 미확정 모두 확정"
          bulkActionTone="confirm"
          onOpenQueuedRow={onOpenQueuedRow}
          onApplyQueuedRows={onConfirmQueuedRows}
        />
        <ReviewQueueCard
          label="전체 미확정"
          count={queue.pending.count}
          nextRow={queue.pending.nextRow}
          rowIds={queue.pending.rowIds}
          actionLabel="전체 미확정 첫 행 열기"
          bulkActionLabel="전체 미확정 모두 확정"
          bulkActionTone="confirm"
          onOpenQueuedRow={onOpenQueuedRow}
          onApplyQueuedRows={onConfirmQueuedRows}
        />
      </div>
    </div>
  );
}

function ReviewQueueCard({
  label,
  count,
  nextRow,
  rowIds,
  notePreview,
  actionLabel,
  bulkActionLabel,
  bulkActionTone,
  onOpenQueuedRow,
  onApplyQueuedRows,
}: {
  label: string;
  count: number;
  nextRow?: SettlementRow;
  rowIds: string[];
  notePreview?: string;
  actionLabel: string;
  bulkActionLabel: string;
  bulkActionTone: "confirm" | "neutral";
  onOpenQueuedRow: (rowId: string) => void;
  onApplyQueuedRows: (rowIds: string[]) => void;
}) {
  const bulkActionClassName = bulkActionTone === "confirm"
    ? "rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
    : "rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-400 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="rounded-md border border-line bg-ink-850 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-200">{label} {count}행</p>
          <p className="mt-1 text-xs text-slate-500">
            {nextRow ? `${companyLabels[nextRow.company]} · ${platformLabels[nextRow.platform]} · ${nextRow.mailerContentTitle}` : "대상 행 없음"}
          </p>
          {notePreview ? (
            <p className="mt-1 text-xs text-orange-200" title={notePreview}>보류 사유: {formatHoldReasonPreview(notePreview)}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            className="rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-400 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!nextRow}
            onClick={() => {
              if (nextRow) {
                onOpenQueuedRow(nextRow.rowId);
              }
            }}
          >
            {actionLabel}
          </button>
          <button
            type="button"
            className={bulkActionClassName}
            disabled={rowIds.length === 0}
            onClick={() => onApplyQueuedRows(rowIds)}
          >
            {bulkActionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: typeof Filter;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-md border border-line bg-ink-800 px-3 py-2 text-slate-300">
      <Icon className="h-4 w-4 text-signal" />
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        className="bg-transparent text-sm text-slate-200 outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-ink-900 text-slate-100">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-md border border-line bg-ink-800 px-3 py-2 text-slate-300">
      <Search className="h-4 w-4 text-signal" />
      <span className="sr-only">{label}</span>
      <input
        aria-label={label}
        className="w-44 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
        placeholder="작품/메일러/작가/출판사"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
