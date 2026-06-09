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
import type { ParseIssue, SettlementRow } from "../types/settlement";
import { DetailLine, Filter, MockFilter } from "./ShellPrimitives";
import { moneyFormatter } from "./uiShellConfig";

export function ReviewSection({
  rows,
  selectedRow,
  selectedRowIssues,
  selectedRowId,
  onSelectRow,
}: {
  rows: SettlementRow[];
  selectedRow: SettlementRow;
  selectedRowIssues: ParseIssue[];
  selectedRowId: string;
  onSelectRow: (rowId: string) => void;
}) {
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

  return (
    <section id="step-3" className="grid grid-cols-[minmax(0,1fr)_360px] gap-5">
      <div className="rounded-md border border-line bg-ink-850">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-normal">공통 정산 검수</h2>
            <p className="mt-1 text-sm text-slate-400">SettlementRow mock rows 기반 대형 테이블</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MockFilter icon={Filter} label="회사 전체" />
            <MockFilter icon={Layers3} label="플랫폼 전체" />
            <MockFilter icon={Search} label="오류 포함" />
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
              {table.getRowModel().rows.map((row) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ReviewDetail selectedRow={selectedRow} selectedRowIssues={selectedRowIssues} />
    </section>
  );
}

function ReviewDetail({ selectedRow, selectedRowIssues }: { selectedRow: SettlementRow; selectedRowIssues: ParseIssue[] }) {
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
          <p className="mt-3 text-sm text-slate-500">연결된 mock issue 없음</p>
        )}
      </div>
    </aside>
  );
}
