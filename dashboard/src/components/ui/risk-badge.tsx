import { getRiskBadgeClasses } from "@/lib/domain";

interface RiskBadgeProps {
  category?: string;
  probability?: number | null;
}

export default function RiskBadge({ category, probability }: RiskBadgeProps) {
  const label = category || "Pending";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getRiskBadgeClasses(label)}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span>{label}</span>
      {probability !== undefined && probability !== null && (
        <span className="opacity-80">
          ({(probability <= 1 ? probability * 100 : probability).toFixed(1)}%)
        </span>
      )}
    </span>
  );
}
