import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  tone?: "default" | "accent" | "danger";
}

export function IconButton({
  label,
  children,
  tone = "default",
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`icon-button icon-button--${tone} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
