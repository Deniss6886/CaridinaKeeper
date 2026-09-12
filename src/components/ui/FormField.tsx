import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (ids: { id: string; describedBy?: string }) => ReactNode;
}

export function Field({ label, hint, error, required, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children({ id, describedBy })}
      {hint ? (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="field__error" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function TextInput(
  props: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }
) {
  const { label, hint, error, required, ...inputProps } = props;
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy }) => (
        <input
          {...inputProps}
          id={id}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
        />
      )}
    </Field>
  );
}

export function SelectInput(
  props: SelectHTMLAttributes<HTMLSelectElement> & {
    label: string;
    hint?: string;
    error?: string;
    children: ReactNode;
  }
) {
  const { label, hint, error, required, children, ...selectProps } = props;
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy }) => (
        <select
          {...selectProps}
          id={id}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
        >
          {children}
        </select>
      )}
    </Field>
  );
}
