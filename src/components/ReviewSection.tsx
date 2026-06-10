import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Layers3, Search } from "lucide-react";
import { useMemo } from "react";
import {
  companyLabels,
  platformLabels,
} from "../data/mockSettlement";
import type { Company, ParseIssue, Platform, SettlementRow } from "../types/settlement";
import type { ReviewFilterState } from "../selectors/reviewSelectors";
import { DetailLine, Filter } from "./ShellPrimitives";
import { moneyFormatter } from "./uiShellConfig";

type ReviewSectionProps = {
  rows: SettlementRow[];
  totalRowCount: number;
  availableCompanies: Company[];
  availablePlatforms: Platform[];
  filters: ReviewFilterState;
  onChangeFilters: (filters: ReviewFilterState) => void;
  selectedRow?: SettlementRow;
  selectedRowIssues: ParseIssue[];
  selectedRowId: string;
  onSelectRow: (rowId: string) => void;
};

export function ReviewSection({
  rows,
  totalRowCount,
  availableCompanies,
  availablePlatforms,
  filters,
  onChangeFilters,
  selectedRow,
  selectedRowIssues,
  selectedRowId,
  onSelectRow,
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

  return (
    <section id="step-3" className="grid grid-cols-[minmax(0,1fr)_360px] gap-5">
      <div className="rounded-md border border-line bg-ink-850">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-normal">공통 정산 검수</h2>
            <p className="mt-1 text-sm text-slate-400">
              현재 필터 결과 {rows.length}행 / 전체 {totalRowCount}행 · 이슈 연결 행 {filteredIssueRowCount}건
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
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
      <ReviewDetail selectedRow={selectedRow} selectedRowIssues={selectedRowIssues} />
    </section>
  );
}

function ReviewDetail({ selectedRow, selectedRowIssues }: { selectedRow?: SettlementRow; selectedRowIssues: ParseIssue[] }) {
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
      <h3 className="mt-3 text-xl font-semibold tracking-normal">{selectedRow.mailerContentTitle}</h3>
      <div className="mt-5 space-y-3 text-sm">
        <DetailLine label="회사" value={companyLabels[selectedRow.company]} />
        <DetailLine label="플랫폼" value={platformLabels[selectedRow.platform]} />
        <DetailLine label="원본" value={`${selectedRow.sourceFileName} · row ${selectedRow.sourceRowIndex}`} />
        <DetailLine label="정산금" value={moneyFormatter.format(selectedRow.settlementAmount)} />
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
          <p className="mt-3 text-sm text-slate-500">연결된 issue 없음</p>
        )}
      </div>
    </aside>
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
