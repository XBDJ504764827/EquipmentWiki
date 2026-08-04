import type { Fault } from "@/lib/api";

interface FaultListProps {
  faults: Fault[];
}

/**
 * 故障知识列表：每条展示现象、原因、解决方案三个部分。
 */
export function FaultList({ faults }: FaultListProps) {
  if (faults.length === 0) {
    return (
      <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
        暂无故障记录
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {faults.map((fault) => (
        <li key={fault.id} className="rounded-md border p-4">
          <h3 className="mb-3 font-semibold">{fault.title}</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="mb-0.5 text-xs font-medium text-muted-foreground">
                故障现象
              </dt>
              <dd className="whitespace-pre-line leading-relaxed">
                {fault.symptom || "—"}
              </dd>
            </div>
            <div>
              <dt className="mb-0.5 text-xs font-medium text-muted-foreground">
                可能原因
              </dt>
              <dd className="whitespace-pre-line leading-relaxed">
                {fault.reason || "—"}
              </dd>
            </div>
            <div>
              <dt className="mb-0.5 text-xs font-medium text-muted-foreground">
                解决方案
              </dt>
              <dd className="whitespace-pre-line leading-relaxed">
                {fault.solution || "—"}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
