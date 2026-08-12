import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
}

export function Button({
  variant = "primary",
  fullWidth = false,
  leadingIcon,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`button button--${variant}${fullWidth ? " button--full" : ""} ${className}`.trim()}
      {...props}
    >
      {leadingIcon ? <span className="button__icon">{leadingIcon}</span> : null}
      <span>{children}</span>
    </button>
  );
}
