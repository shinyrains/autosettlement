import { steps } from "./uiShellConfig";

export function SidebarNav() {
  return (
    <aside className="border-r border-line bg-ink-900 px-5 py-6">
      <div className="mb-9">
        <p className="text-2xl font-semibold tracking-normal text-white">AutoSettlement</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Publishing Ops</p>
      </div>
      <nav className="flex flex-col gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <a
              key={step.label}
              href={`#step-${index + 1}`}
              className="flex items-center gap-3 rounded-md border border-transparent px-3 py-3 text-sm font-medium text-slate-300 hover:border-line hover:bg-ink-800"
            >
              <Icon className="h-4 w-4 text-signal" />
              <span>{step.label}</span>
            </a>
          );
        })}
      </nav>
      <div className="mt-10 border-t border-line pt-5 text-sm text-slate-400">
        <p className="font-semibold text-slate-200">MVP 범위</p>
        <p className="mt-2 leading-6">문서, 실제 업로드, 엑셀 생성, 이메일러 연동 없이 mock 상태만 표시합니다.</p>
      </div>
    </aside>
  );
}
