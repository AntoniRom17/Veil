import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <section className={`empty-state${compact ? " empty-state--compact" : ""}`}>
      <div className="empty-state__icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </section>
  );
}
