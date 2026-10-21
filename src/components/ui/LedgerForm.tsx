import { useId, type ChangeEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Info } from 'lucide-react';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: string;
  error?: string;
  onValueChange: (value: string) => void;
};

/** Accessible field and standard input styling shared by workflow forms. */
export function LedgerInput({ label, error, onValueChange, className = '', ...props }: InputProps) {
  const errorId = useId();
  return <label className="eledger-form-field"><span>{label}</span>
    <input {...props} aria-label={props['aria-label'] ?? label}
      aria-invalid={error ? true : props['aria-invalid']}
      aria-describedby={error ? [props['aria-describedby'], errorId].filter(Boolean).join(' ') : props['aria-describedby']}
      className={`eledger-control ${className}`}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onValueChange(event.target.value)} />
    {error && <span className="eledger-field-error" id={errorId} role="alert">{error}</span>}
  </label>;
}

export function LedgerSelect({ label, children, error, onValueChange, className = '', ...props }: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  label: string;
  error?: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}) {
  const errorId = useId();
  return <label className="eledger-form-field"><span>{label}</span>
    <select {...props} aria-label={props['aria-label'] ?? label}
      aria-invalid={error ? true : props['aria-invalid']}
      aria-describedby={error ? [props['aria-describedby'], errorId].filter(Boolean).join(' ') : props['aria-describedby']}
      className={`eledger-control ${className}`}
      onChange={(event) => onValueChange(event.target.value)}>{children}</select>
    {error && <span className="eledger-field-error" id={errorId} role="alert">{error}</span>}
  </label>;
}

/** Native details/summary works by keyboard and touch as well as pointer. */
export function LedgerTip({ label, children }: { label: string; children: ReactNode }) {
  return <details className="eledger-tip"><summary><Info size={14} aria-hidden="true"/>{label}</summary>
    <div className="eledger-tip-content">{children}</div>
  </details>;
}
