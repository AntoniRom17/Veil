import type { ReactNode } from "react";

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function ScreenHeader({ eyebrow, title, description, action }: ScreenHeaderProps) {
  return (
    <header className="screen-header">
      <div>
        {eyebrow ? <p className="screen-header__eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="screen-header__description">{description}</p> : null}
      </div>
      {action ? <div className="screen-header__action">{action}</div> : null}
    </header>
  );
}
