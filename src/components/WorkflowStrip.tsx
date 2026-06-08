import { steps } from "./uiShellConfig";

export function WorkflowStrip() {
  return (
    <section className="rounded-md border border-line bg-ink-850 px-6 py-5" aria-label="배치 중심 4단계 흐름">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-signal">배치 중심 4단계 흐름</p>
          <p className="mt-1 text-sm text-slate-400">라온이앤엠과 에스알이앤엠을 하나의 batch 안에서 함께 검수합니다.</p>
        </div>
        <div className="flex min-w-[760px] items-center justify-between gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const active = index <= 2;
            return (
              <div key={step.label} className="flex flex-1 items-center gap-3">
                <div className={active ? "grid h-10 w-10 place-items-center rounded-full bg-signal text-ink-950" : "grid h-10 w-10 place-items-center rounded-full border border-line text-slate-500"}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={active ? "text-sm font-semibold text-white" : "text-sm font-semibold text-slate-500"}>{step.label}</span>
                {index < steps.length - 1 ? <span className="h-px flex-1 bg-line" /> : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
