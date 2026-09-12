import { useMemo, useState } from 'react';
import type * as React from 'react';
import { Activity, Plus, SlidersHorizontal, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../components/ui/Dialog';
import { Field, TextInput } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { TrendChart } from '../components/ui/TrendChart';
import { useToast } from '../components/ui/Toast';
import { evaluateTargetRange } from '../domain/calculations';
import type { ParameterDefinition } from '../domain/models';
import { dateTimeInputValue, formatDateTime, formatNumber } from '../utils/format';
import { useApp } from '../store/AppContext';

export default function WaterPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? 'de-DE' : 'en-GB';
  const { tanks, waterReadings, parameterDefinitions, targetRanges, addReading, addParameter } =
    useApp();
  const { notify } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [tankFilter, setTankFilter] = useState('');
  const [parameterFilter, setParameterFilter] = useState('');
  const [draft, setDraft] = useState({
    tankId: tanks[0]?.id ?? '',
    parameterId: parameterDefinitions[0]?.id ?? '',
    value: '',
    measuredAt: dateTimeInputValue(),
    method: '',
    uncertainty: '',
    note: ''
  });
  const [customDraft, setCustomDraft] = useState({ name: '', unit: '', precision: '1' });

  const filteredReadings = useMemo(
    () =>
      [...waterReadings]
        .filter(
          (reading) =>
            (!tankFilter || reading.tankId === tankFilter) &&
            (!parameterFilter || reading.parameterId === parameterFilter)
        )
        .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt)),
    [parameterFilter, tankFilter, waterReadings]
  );
  const trendParameterId = parameterFilter || parameterDefinitions[0]?.id || '';
  const trendTankId = tankFilter || tanks[0]?.id || '';
  const trendParameter = parameterDefinitions.find(
    (parameter) => parameter.id === trendParameterId
  );
  const trendPoints = filteredReadings
    .filter((reading) => reading.tankId === trendTankId && reading.parameterId === trendParameterId)
    .slice(0, 12)
    .reverse()
    .map((reading) => ({
      label: formatDateTime(reading.measuredAt, locale),
      value: reading.value
    }));

  const openNew = () => {
    setDraft((current) => ({
      ...current,
      tankId: tanks[0]?.id ?? current.tankId,
      parameterId: parameterDefinitions[0]?.id ?? current.parameterId,
      measuredAt: dateTimeInputValue(),
      value: ''
    }));
    setDialogOpen(true);
  };
  const submitReading = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parameter = parameterDefinitions.find((item) => item.id === draft.parameterId);
    if (!draft.tankId || !parameter || !draft.value) return;
    await addReading({
      tankId: draft.tankId,
      parameterId: draft.parameterId,
      value: Number(draft.value),
      unit: parameter.unit,
      measuredAt: new Date(draft.measuredAt).toISOString(),
      method: draft.method.trim() || undefined,
      uncertainty: draft.uncertainty ? Number(draft.uncertainty) : undefined,
      note: draft.note.trim() || undefined
    });
    setDialogOpen(false);
    notify(t('water.saved'));
  };
  const submitCustom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customDraft.name.trim() || !customDraft.unit.trim()) return;
    const parameter: Omit<ParameterDefinition, 'id' | 'createdAt' | 'updatedAt'> = {
      key: `custom_${customDraft.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`,
      name: customDraft.name.trim(),
      unit: customDraft.unit.trim(),
      precision: Number(customDraft.precision) || 1,
      sortOrder: 500,
      isBuiltIn: false
    };
    await addParameter(parameter);
    setCustomDialogOpen(false);
    notify(t('water.customParameter'));
  };

  return (
    <>
      <PageHeader
        title={t('water.title')}
        subtitle={t('water.subtitle')}
        actions={
          <>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setCustomDialogOpen(true)}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              {t('water.customParameter')}
            </button>
            <button className="button" type="button" onClick={openNew}>
              <Plus size={17} aria-hidden="true" />
              {t('water.add')}
            </button>
          </>
        }
      />
      {tanks.length === 0 ? (
        <section className="card empty-state">
          <div className="empty-state__icon">
            <Activity aria-hidden="true" />
          </div>
          <h2>{t('common.noData')}</h2>
          <p>{t('dashboard.emptyBody')}</p>
        </section>
      ) : (
        <>
          <section className="card" style={{ marginBottom: '1rem' }}>
            <div className="card__body">
              <div className="filter-bar">
                <Field label={t('common.tank')}>
                  {({ id }) => (
                    <select
                      id={id}
                      value={tankFilter}
                      onChange={(event) => setTankFilter(event.target.value)}
                    >
                      <option value="">{t('common.all')}</option>
                      {tanks.map((tank) => (
                        <option key={tank.id} value={tank.id}>
                          {tank.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label={t('water.parameter')}>
                  {({ id }) => (
                    <select
                      id={id}
                      value={parameterFilter}
                      onChange={(event) => setParameterFilter(event.target.value)}
                    >
                      <option value="">{t('common.all')}</option>
                      {parameterDefinitions.map((parameter) => (
                        <option key={parameter.id} value={parameter.id}>
                          {parameter.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>
            </div>
          </section>
          <div className="grid grid--two" style={{ marginBottom: '1rem' }}>
            <section className="card">
              <div className="card__header">
                <div>
                  <h2>{t('water.trends')}</h2>
                  <p>{trendParameter?.name ?? t('water.parameter')}</p>
                </div>
              </div>
              <div className="card__body">
                <TrendChart
                  points={trendPoints}
                  label={trendParameter?.name ?? ''}
                  unit={trendParameter?.unit ?? ''}
                  emptyText={t('dashboard.noReadings')}
                />
              </div>
            </section>
            <section className="card">
              <div className="card__header">
                <div>
                  <h2>{t('water.history')}</h2>
                  <p>{t('common.entries', { count: filteredReadings.length })}</p>
                </div>
              </div>
              <div className="card__body">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('common.date')}</th>
                        <th>{t('common.tank')}</th>
                        <th>{t('water.parameter')}</th>
                        <th>{t('common.value')}</th>
                        <th>{t('common.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReadings.slice(0, 20).map((reading) => {
                        const parameter = parameterDefinitions.find(
                          (item) => item.id === reading.parameterId
                        );
                        const range = targetRanges.find(
                          (item) =>
                            item.tankId === reading.tankId &&
                            item.parameterId === reading.parameterId
                        );
                        const status = range ? evaluateTargetRange(reading.value, range) : null;
                        return (
                          <tr key={reading.id}>
                            <td>{formatDateTime(reading.measuredAt, locale)}</td>
                            <td>
                              {tanks.find((tank) => tank.id === reading.tankId)?.name ??
                                t('common.unknown')}
                            </td>
                            <td>{parameter?.name ?? reading.parameterId}</td>
                            <td>
                              <strong>
                                {formatNumber(reading.value, locale, parameter?.precision ?? 2)}
                              </strong>{' '}
                              <span className="muted">{reading.unit}</span>
                            </td>
                            <td>
                              {status ? (
                                <span
                                  className={`badge ${status.severity === 'ok' ? 'badge--success' : status.severity === 'critical' ? 'badge--danger' : 'badge--warning'}`}
                                >
                                  {status.severity === 'ok' ? (
                                    t('water.inRange')
                                  ) : (
                                    <>
                                      <TriangleAlert size={12} aria-hidden="true" />
                                      {t('water.outOfRange')}
                                    </>
                                  )}
                                </span>
                              ) : (
                                <span className="badge badge--neutral">{t('water.noTarget')}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
      <Dialog
        open={dialogOpen}
        title={t('water.add')}
        description={t('water.scientificNote')}
        closeLabel={t('common.close')}
        onClose={() => setDialogOpen(false)}
      >
        <form onSubmit={(event) => void submitReading(event)}>
          <Field label={t('common.tank')} required>
            {({ id }) => (
              <select
                id={id}
                value={draft.tankId}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, tankId: event.target.value }))
                }
              >
                {tanks.map((tank) => (
                  <option key={tank.id} value={tank.id}>
                    {tank.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t('water.parameter')} required>
            {({ id }) => (
              <select
                id={id}
                value={draft.parameterId}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, parameterId: event.target.value }))
                }
              >
                {parameterDefinitions.map((parameter) => (
                  <option key={parameter.id} value={parameter.id}>
                    {parameter.name} · {parameter.unit}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="form-grid">
            <TextInput
              label={t('common.value')}
              required
              type="number"
              step="any"
              value={draft.value}
              onChange={(event) =>
                setDraft((current) => ({ ...current, value: event.target.value }))
              }
            />
            <TextInput
              label={t('water.measuredAt')}
              required
              type="datetime-local"
              value={draft.measuredAt}
              onChange={(event) =>
                setDraft((current) => ({ ...current, measuredAt: event.target.value }))
              }
            />
            <TextInput
              label={t('water.method')}
              hint={t('common.optional')}
              placeholder={t('water.methodPlaceholder')}
              value={draft.method}
              onChange={(event) =>
                setDraft((current) => ({ ...current, method: event.target.value }))
              }
            />
            <TextInput
              label={t('water.uncertainty')}
              hint={t('common.optional')}
              type="number"
              min="0"
              step="any"
              value={draft.uncertainty}
              onChange={(event) =>
                setDraft((current) => ({ ...current, uncertainty: event.target.value }))
              }
            />
            <Field label={t('common.note')}>
              {({ id }) => (
                <textarea
                  id={id}
                  placeholder={t('water.notePlaceholder')}
                  value={draft.note}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, note: event.target.value }))
                  }
                />
              )}
            </Field>
          </div>
          <div className="card__footer">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setDialogOpen(false)}
            >
              {t('common.cancel')}
            </button>
            <button className="button" type="submit">
              {t('common.save')}
            </button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={customDialogOpen}
        title={t('water.customParameter')}
        closeLabel={t('common.close')}
        onClose={() => setCustomDialogOpen(false)}
      >
        <form onSubmit={(event) => void submitCustom(event)}>
          <TextInput
            label={t('water.parameterName')}
            required
            value={customDraft.name}
            onChange={(event) =>
              setCustomDraft((current) => ({ ...current, name: event.target.value }))
            }
          />
          <TextInput
            label={t('water.defaultUnit')}
            required
            value={customDraft.unit}
            onChange={(event) =>
              setCustomDraft((current) => ({ ...current, unit: event.target.value }))
            }
          />
          <TextInput
            label="Precision"
            type="number"
            min="0"
            max="6"
            value={customDraft.precision}
            onChange={(event) =>
              setCustomDraft((current) => ({ ...current, precision: event.target.value }))
            }
          />
          <div className="card__footer">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setCustomDialogOpen(false)}
            >
              {t('common.cancel')}
            </button>
            <button className="button" type="submit">
              {t('common.save')}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
