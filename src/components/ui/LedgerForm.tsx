import type { ChangeEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Info } from 'lucide-react';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: string;
  onValueChange: (value: string) => void;
};

/** Accessible field and standard input styling shared by workflow forms. */
export function LedgerInput({ label, onValueChange, className = '', ...props }: InputProps) {
  return <label className="eledger-form-field"><span>{label}</span>
    <input {...props} aria-label={props['aria-label'] ?? label} className={`eledger-control ${className}`}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onValueChange(event.target.value)} />
  </label>;
}

export function LedgerSelect({ label, children, onValueChange, className = '', ...props }: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  label: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}) {
  return <label className="eledger-form-field"><span>{label}</span>
    <select {...props} aria-label={props['aria-label'] ?? label} className={`eledger-control ${className}`}
      onChange={(event) => onValueChange(event.target.value)}>{children}</select>
  </label>;
}

/** Native details/summary works by keyboard and touch as well as pointer. */
export function LedgerTip({ label, children }: { label: string; children: ReactNode }) {
  return <details className="eledger-tip"><summary><Info size={14} aria-hidden="true"/>{label}</summary>
    <div className="eledger-tip-content">{children}</div>
  </details>;
}
