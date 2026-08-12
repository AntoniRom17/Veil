import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  htmlFor: string;
  children: ReactNode;
}

function FieldShell({ label, hint, error, optional, htmlFor, children }: FieldShellProps) {
  return (
    <div className={`field${error ? " field--error" : ""}`}>
      <div className="field__label-row">
        <label htmlFor={htmlFor}>{label}</label>
        {optional ? <span>Optional</span> : null}
      </div>
      {children}
      {error ? <p className="field__message field__message--error">{error}</p> : hint ? <p className="field__message">{hint}</p> : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  optional,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; optional?: boolean }) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} htmlFor={fieldId}>
      <input id={fieldId} className="field__control" aria-invalid={Boolean(error)} {...props} />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  optional,
  id,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string; optional?: boolean }) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} htmlFor={fieldId}>
      <textarea id={fieldId} className="field__control field__control--area" aria-invalid={Boolean(error)} {...props} />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  optional,
  id,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string; error?: string; optional?: boolean }) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} htmlFor={fieldId}>
      <select id={fieldId} className="field__control field__control--select" aria-invalid={Boolean(error)} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}
