import { CheckCircle2, FileSpreadsheet } from "lucide-react";
import {
  companyLabels,
  mockExports,
} from "../data/mockSettlement";
import type { Company, ExportArtifact } from "../types/settlement";
import { artifactLabels } from "./uiShellConfig";

export function ExportSection({ readyExports }: { readyExports: number }) {
  return (
    <section id="step-4" className="rounded-md border border-line bg-ink-850">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-5 w-5 text-mint" />
          <div>
            <h2 className="text-lg font-semibold tracking-normal">회사별 출력</h2>
            <p className="mt-1 text-sm text-slate-400">회사별 2종 출력, batch 전체 4개 파일</p>
          </div>
        </div>
        <span className="rounded-md border border-line px-3 py-1 font-mono text-sm text-mint">{readyExports}/4 ready</span>
      </div>
      <div className="grid grid-cols-2 gap-5 p-5">
        <CompanyExportGroup company="raon" />
        <CompanyExportGroup company="sr" />
      </div>
      <p className="border-t border-line px-5 py-3 text-sm text-slate-500">batch 전체 4개 파일 구조 표시만 제공하며 실제 엑셀 생성/다운로드는 연결하지 않습니다.</p>
    </section>
  );
}

function CompanyExportGroup({ company }: { company: Company }) {
  const artifacts = mockExports.filter((artifact) => artifact.company === company);
  return (
    <article className="rounded-md border border-line bg-ink-800 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold">{companyLabels[company]} 출력 카드</h3>
        <span className="text-xs text-slate-400">2종</span>
      </div>
      <div className="space-y-3">
        {artifacts.map((artifact) => (
          <ExportRow key={artifact.artifactId} artifact={artifact} />
        ))}
      </div>
    </article>
  );
}

function ExportRow({ artifact }: { artifact: ExportArtifact }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-line bg-ink-950 px-4 py-3">
      <div>
        <p className="font-medium text-white">{artifact.fileName}</p>
        <p className="mt-1 text-xs text-slate-500">{artifactLabels[artifact.artifactType]} · {artifact.rowCount} rows</p>
      </div>
      <span className={artifact.status === "ready" ? "flex items-center gap-2 text-sm font-semibold text-mint" : "text-sm font-semibold text-amber"}>
        {artifact.status === "ready" ? <CheckCircle2 className="h-4 w-4" /> : null}
        {artifact.status}
      </span>
    </div>
  );
}
