import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: ReactNode;
};

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
