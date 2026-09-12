import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Keep a failed form open and prevent duplicate writes while saving. */
export function ActionForm({
  onSubmit,
  children
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      await onSubmit(event);
    } catch (cause) {
      setError(
        t(
          cause instanceof Error && cause.name === 'ZodError'
            ? 'validation.generic'
            : 'common.actionFailed'
        )
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} aria-busy={pending}>
      <fieldset className="form-fields" disabled={pending}>
        {children}
      </fieldset>
      {pending ? <p role="status">{t('common.saving')}</p> : null}
      {error ? (
        <p className="notice notice--danger" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
