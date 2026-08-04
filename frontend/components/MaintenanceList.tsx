import { Badge } from "@/components/ui/badge";
import type { Maintenance } from "@/lib/api";

interface MaintenanceListProps {
  items: Maintenance[];
}

/**
 * 维护说明列表：每条展示标题、维护周期、维护内容。
 */
export function MaintenanceList({ items }: MaintenanceListProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
        暂无维护说明
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="font-medium">{item.title}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
              {item.content || "—"}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            周期：{item.cycle || "—"}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
