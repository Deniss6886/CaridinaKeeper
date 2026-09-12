import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { parseDecimal } from '../../utils/format';

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
  const { t } = useTranslation();
  const numeric = inputProps.type === 'number';
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy }) => (
        <input
          {...inputProps}
          type={numeric ? 'text' : inputProps.type}
          inputMode={numeric ? (inputProps.inputMode ?? 'decimal') : inputProps.inputMode}
          maxLength={
            inputProps.maxLength ??
            (numeric ? 32 : !inputProps.type || inputProps.type === 'text' ? 160 : undefined)
          }
          pattern={
            numeric
              ? '[+\\-]?(?:[0-9]+(?:[.,][0-9]*)?|[.,][0-9]+)'
              : (inputProps.pattern ?? (required && !inputProps.type ? '.*\\S.*' : undefined))
          }
          onChange={(event) => {
            const input = event.currentTarget;
            if (numeric && input.value) {
              const value = parseDecimal(input.value);
              const minimum =
                inputProps.min === undefined ? -1_000_000_000 : Number(inputProps.min);
              const maximum = inputProps.max === undefined ? 1_000_000_000 : Number(inputProps.max);
              input.setCustomValidity(
                !Number.isFinite(value) || value < minimum || value > maximum
                  ? t('validation.numberRange', { min: minimum, max: maximum })
                  : inputProps.step === '1' && !Number.isInteger(value)
                    ? t('validation.wholeNumber')
                    : ''
              );
            } else input.setCustomValidity('');
            inputProps.onChange?.(event);
          }}
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
