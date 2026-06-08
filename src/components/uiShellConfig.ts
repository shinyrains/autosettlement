import {
  ArrowDownToLine,
  Boxes,
  DatabaseZap,
  LayoutDashboard,
} from "lucide-react";
import type { ExportArtifactType } from "../types/settlement";
import type { PlatformUploadCard } from "../data/mockSettlement";

export const moneyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export const steps = [
  { label: "업로드", icon: Boxes },
  { label: "파싱/상태 확인", icon: DatabaseZap },
  { label: "공통 정산 검수", icon: LayoutDashboard },
  { label: "회사별 출력", icon: ArrowDownToLine },
];

export const statusLabels: Record<PlatformUploadCard["status"], string> = {
  empty: "대기",
  uploaded: "업로드",
  parsed: "정상",
  warning: "주의",
  error: "오류",
};

export const artifactLabels: Record<ExportArtifactType, string> = {
  review_excel: "정산_통합검수용.xlsx",
  mailer_excel: "메일러_발송용.xlsx",
};
