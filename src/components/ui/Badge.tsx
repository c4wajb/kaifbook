import { statusLabel } from "@/lib/format";
export function Badge({ status, children }: { status: string; children?: React.ReactNode }) {
  return <span className={`badge badge-${status.replaceAll("_", "-")}`}>{children ?? statusLabel(status)}</span>;
}
