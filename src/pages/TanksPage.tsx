import { useEffect, useMemo, useState } from 'react';
import type * as React from 'react';
import { AlertTriangle, Beaker, CheckCircle2, Edit3, Plus, Ruler, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ActionForm } from '../components/ui/ActionForm';
import { parameterLabel } from '../utils/parameterLabel';
import { Dialog } from '../components/ui/Dialog';
import { Field, TextInput } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { useApp } from '../store/AppContext';
import type { Tank } from '../domain/models';
import { RecordConflictError } from '../data/database';
import { collectParameterWarnings, latestReadingsByTankAndParameter } from '../domain/calculations';
import {
  dateInputValue,
  daysSince,
  formatDate,
  formatDateTime,
  formatNumber,
  parseDecimal
} from '../utils/format';

interface TankDraft {
  name: string;
  volumeLiters: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  startDate: string;
  description: string;
  soil: string;
  soilInstalledAt: string;
  filterType: string;
  targetTemperature: string;
  notes: string;
  species: string;
  variant: string;
  inhabitantsCount: string;
  breedingLineId: string;
}

function emptyDraft(): TankDraft {
  return {
    name: '',
    volumeLiters: '',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    startDate: dateInputValue(),
    description: '',
    soil: '',
    soilInstalledAt: '',
    filterType: '',
    targetTemperature: '',
    notes: '',
    species: '',
    variant: '',
    inhabitantsCount: '0',
    breedingLineId: ''
  };
}

function tankToDraft(tank: Tank): TankDraft {
  const resident = tank.inhabitants[0];
  return {
    name: tank.name,
    volumeLiters: String(tank.volumeLiters),
    lengthCm: tank.dimensions ? String(tank.dimensions.lengthCm) : '',
    widthCm: tank.dimensions ? String(tank.dimensions.widthCm) : '',
    heightCm: tank.dimensions ? String(tank.dimensions.heightCm) : '',
    startDate: tank.startDate,
    description: tank.description ?? '',
    soil: tank.soil ?? '',
    soilInstalledAt: tank.soilInstalledAt ?? '',
    filterType: tank.filterType ?? '',
    targetTemperature: tank.targetTemperature === undefined ? '' : String(tank.targetTemperature),
    notes: tank.notes ?? '',
    species: resident?.species ?? '',
    variant: resident?.variant ?? '',
    inhabitantsCount: resident ? String(resident.count) : '0',
    breedingLineId: tank.breedingLineId ?? ''
  };
}

export default function TanksPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? 'de-DE' : 'en-GB';
  const {
    tanks,
    breedingLines,
    parameterDefinitions,
    targetRanges,
    waterReadings,
    addTank,
    saveTank,
    deleteTank,
    saveTargetRanges
  } = useApp();
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(() => params.get('new') === '1');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedId, setSelectedId] = useState(params.get('selected') ?? tanks[0]?.id ?? '');
  const [editing, setEditing] = useState<Tank | null>(null);
  const [draft, setDraft] = useState<TankDraft>(emptyDraft);
  const [targetError, setTargetError] = useState('');
  const [savingTargets, setSavingTargets] = useState(false);
  const [targetDraftTankId, setTargetDraftTankId] = useState('');
  const [targetDraftDirty, setTargetDraftDirty] = useState(false);
  const [targetDraft, setTargetDraft] = useState<
    Record<string, { minimum: string; maximum: string }>
  >({});

  const selected = tanks.find((tank) => tank.id === selectedId) ?? tanks[0];
  const latestByTankAndParameter = latestReadingsByTankAndParameter(waterReadings);
  const latestSelected = [...latestReadingsByTankAndParameter(waterReadings).values()]
    .filter((reading) => reading.tankId === selected?.id)
    .sort((a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt));
  const selectedWarnings = useMemo(
    () =>
      selected
        ? collectParameterWarnings(
            waterReadings.filter((reading) => reading.tankId === selected.id),
            targetRanges.filter((range) => range.tankId === selected.id),
            parameterDefinitions
          )
        : [],
    [parameterDefinitions, selected, targetRanges, waterReadings]
  );

  useEffect(() => {
    if (params.get('new') === '1') {
      const nextParams = new URLSearchParams(params);
      nextParams.delete('new');
      setParams(nextParams, { replace: true });
    }
  }, [params, setParams]);

  const selectedRanges = selected
    ? targetRanges.filter((range) => range.tankId === selected.id)
    : [];
  const selectedRangeSignature = selectedRanges
    .map(
      ({ id, updatedAt, parameterId, minimum, maximum }) =>
        `${id}:${updatedAt}:${parameterId}:${minimum}:${maximum}`
    )
    .sort()
    .join('|');
  useEffect(() => {
    if (!selected) return;
    if (targetDraftDirty && targetDraftTankId === selected.id) return;
    const ranges = selectedRanges;
    const next: Record<string, { minimum: string; maximum: string }> = {};
    for (const parameter of parameterDefinitions) {
      const range = ranges.find((item) => item.parameterId === parameter.id);
      next[parameter.id] = {
        minimum: range ? String(range.minimum) : '',
        maximum: range ? String(range.maximum) : ''
      };
    }
    // Persisted ranges are an external source used to seed this deliberately editable draft.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTargetDraft(next);
    setTargetError('');
    setTargetDraftTankId(selected.id);
    setTargetDraftDirty(false);
    // selectedRangeSignature deliberately represents persisted values, not array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    parameterDefinitions,
    selected?.id,
    selectedRangeSignature,
    targetDraftDirty,
    targetDraftTankId
  ]);

  const openNew = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setDialogOpen(true);
  };
  const openEdit = () => {
    if (selected) {
      setEditing(selected);
      setDraft(tankToDraft(selected));
      setDialogOpen(true);
    }
  };
  const updateDraft = (key: keyof TankDraft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const submitTank = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const dimensions =
      draft.lengthCm && draft.widthCm && draft.heightCm
        ? {
            lengthCm: parseDecimal(draft.lengthCm),
            widthCm: parseDecimal(draft.widthCm),
            heightCm: parseDecimal(draft.heightCm)
          }
        : undefined;
    const inhabitants = draft.species
      ? [
          {
            id: editing?.inhabitants[0]?.id ?? `inhabitant_${Date.now()}`,
            ...editing?.inhabitants[0],
            species: draft.species.trim(),
            variant: draft.variant || undefined,
            count: parseDecimal(draft.inhabitantsCount) || 0
          }
        ]
      : [];
    const input = {
      name: draft.name.trim(),
      volumeLiters: parseDecimal(draft.volumeLiters),
      dimensions,
      startDate: draft.startDate,
      description: draft.description.trim() || undefined,
      soil: draft.soil.trim() || undefined,
      soilInstalledAt: draft.soilInstalledAt || undefined,
      filterType: draft.filterType.trim() || undefined,
      targetTemperature: draft.targetTemperature
        ? parseDecimal(draft.targetTemperature)
        : undefined,
      notes: draft.notes.trim() || undefined,
      inhabitants: [...inhabitants, ...(editing?.inhabitants.slice(1) ?? [])],
      breedingLineId: draft.breedingLineId || undefined
    };
    if (!input.name || !Number.isFinite(input.volumeLiters) || input.volumeLiters <= 0) {
      notify(t('validation.generic'), 'error');
      return;
    }
    const dimensionFields = [draft.lengthCm, draft.widthCm, draft.heightCm];
    if (dimensionFields.some(Boolean) && !dimensionFields.every(Boolean)) {
      notify(t('validation.completeDimensions'), 'error');
      return;
    }
    if (
      !draft.species.trim() &&
      (parseDecimal(draft.inhabitantsCount) > 0 || draft.variant.trim())
    ) {
      notify(t('validation.residentSpecies'), 'error');
      return;
    }
    try {
      if (editing)
        await saveTank(
          { ...editing, ...input, updatedAt: new Date().toISOString() },
          editing.updatedAt
        );
      else {
        const created = await addTank(input);
        setSelectedId(created.id);
      }
    } catch (cause) {
      if (cause instanceof RecordConflictError) {
        notify(t('errors.editConflict'), 'error');
        return;
      }
      throw cause;
    }
    setDialogOpen(false);
    notify(t('tanks.saved'));
  };

  const saveTargets = async () => {
    if (!selected || savingTargets) return;
    setTargetError('');
    for (const values of Object.values(targetDraft)) {
      if (!values.minimum && !values.maximum) continue;
      if (!values.minimum || !values.maximum) {
        setTargetError(t('validation.completeRange'));
        return;
      }
      const minimum = parseDecimal(values.minimum);
      const maximum = parseDecimal(values.maximum);
      if (
        !Number.isFinite(minimum) ||
        !Number.isFinite(maximum) ||
        Math.abs(minimum) > 1_000_000_000 ||
        Math.abs(maximum) > 1_000_000_000
      ) {
        setTargetError(t('validation.numberRange', { min: -1_000_000_000, max: 1_000_000_000 }));
        return;
      }
      if (minimum > maximum) {
        setTargetError(t('validation.minMax'));
        return;
      }
    }
    const ranges = parameterDefinitions.flatMap((parameter) => {
      const values = targetDraft[parameter.id];
      if (!values?.minimum || !values.maximum) return [];
      const minimum = parseDecimal(values.minimum);
      const maximum = parseDecimal(values.maximum);
      const existing = targetRanges.find(
        (range) => range.tankId === selected.id && range.parameterId === parameter.id
      );
      return [
        {
          parameterId: parameter.id,
          minimum,
          maximum,
          warningMinimum:
            existing?.warningMinimum === undefined
              ? undefined
              : Math.min(existing.warningMinimum, minimum),
          warningMaximum:
            existing?.warningMaximum === undefined
              ? undefined
              : Math.max(existing.warningMaximum, maximum)
        }
      ];
    });
    setSavingTargets(true);
    try {
      await saveTargetRanges(
        selected.id,
        ranges,
        selectedRanges.map(({ id, updatedAt }) => ({ id, updatedAt }))
      );
      setTargetDraftDirty(false);
      notify(t('tanks.rangesSaved'));
    } catch (cause) {
      if (cause instanceof RecordConflictError) setTargetError(t('errors.editConflict'));
      else setTargetError(t('common.actionFailed'));
    } finally {
      setSavingTargets(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const targetId = deleteTarget.id;
    try {
      await deleteTank(targetId);
      setSelectedId((current) =>
        current === targetId ? (tanks.find((tank) => tank.id !== targetId)?.id ?? '') : current
      );
      setDeleteDialog(false);
      setDeleteTarget(null);
      notify(t('tanks.deleted'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t('tanks.title')}
        subtitle={t('tanks.subtitle')}
        actions={
          <button className="button" type="button" onClick={openNew}>
            <Plus size={17} aria-hidden="true" />
            {t('tanks.add')}
          </button>
        }
      />
      {tanks.length === 0 ? (
        <section className="card empty-state">
          <div className="empty-state__icon">
            <Beaker aria-hidden="true" />
          </div>
          <h2>{t('tanks.emptyTitle')}</h2>
          <p>{t('tanks.emptyBody')}</p>
          <button className="button" type="button" onClick={openNew}>
            <Plus size={17} aria-hidden="true" />
            {t('tanks.add')}
          </button>
        </section>
      ) : (
        <>
          <div className="grid grid--three section-gap-bottom">
            {tanks.map((tank) => {
              const hasTargets = targetRanges.some((range) => range.tankId === tank.id);
              const comparableTargetCount = targetRanges.filter((range) => {
                const reading = latestByTankAndParameter.get(
                  `${tank.id}\u0000${range.parameterId}`
                );
                const parameter = parameterDefinitions.find(
                  (item) => item.id === range.parameterId
                );
                return Boolean(reading && (!parameter || parameter.unit === reading.unit));
              }).length;
              const count = collectParameterWarnings(
                waterReadings.filter((reading) => reading.tankId === tank.id),
                targetRanges.filter((range) => range.tankId === tank.id),
                parameterDefinitions
              ).length;
              return (
                <button
                  type="button"
                  className={`card tank-card ${selected?.id === tank.id ? 'tank-card--selected' : ''}`}
                  key={tank.id}
                  aria-pressed={selected?.id === tank.id}
                  onClick={() => {
                    setSelectedId(tank.id);
                    setParams({ selected: tank.id }, { replace: true });
                  }}
                >
                  <div className="tank-card__top">
                    <div>
                      <h2>{tank.name}</h2>
                      <p>
                        {formatNumber(tank.volumeLiters, locale)} L ·{' '}
                        {formatDate(tank.startDate, locale)}
                      </p>
                    </div>
                    {tank.isDemo ? <span className="demo-badge">{t('common.demo')}</span> : null}
                  </div>
                  <span
                    className={`badge ${count ? 'badge--warning' : hasTargets && comparableTargetCount ? 'badge--success' : 'badge--neutral'}`}
                  >
                    {count ? (
                      <AlertTriangle size={12} aria-hidden="true" />
                    ) : hasTargets && comparableTargetCount ? (
                      <CheckCircle2 size={12} aria-hidden="true" />
                    ) : null}
                    {count
                      ? t('tanks.attention', { count })
                      : hasTargets
                        ? t('tanks.stable')
                        : t('tanks.noTargets')}
                  </span>
                  <div className="tank-card__metrics">
                    <span className="metric-chip">{tank.filterType ?? t('common.unknown')}</span>
                    {tank.soilInstalledAt ? (
                      <span className="metric-chip">
                        {t('dashboard.soilAge')}: <strong>{daysSince(tank.soilInstalledAt)}</strong>{' '}
                        d
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
          {selected ? (
            <section className="stack">
              <article className="card">
                <div className="card__header">
                  <div>
                    <span className="eyebrow">{t('tanks.details')}</span>
                    <h2 className="tank-detail-title">
                      {selected.name}{' '}
                      {selected.isDemo ? (
                        <span className="demo-badge">{t('common.demo')}</span>
                      ) : null}
                    </h2>
                    <p>{selected.description ?? t('common.noData')}</p>
                  </div>
                  <div className="page-header__actions">
                    <button
                      className="button button--secondary button--small"
                      type="button"
                      onClick={openEdit}
                    >
                      <Edit3 size={15} aria-hidden="true" />
                      {t('common.edit')}
                    </button>
                    <button
                      className="button button--danger button--small"
                      type="button"
                      onClick={() => {
                        setDeleteTarget({ id: selected.id, name: selected.name });
                        setDeleteDialog(true);
                      }}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
                <div className="card__body">
                  <div className="grid grid--three">
                    <div className="metric-chip">
                      <Ruler size={14} aria-hidden="true" />
                      {selected.dimensions
                        ? `${selected.dimensions.lengthCm} × ${selected.dimensions.widthCm} × ${selected.dimensions.heightCm} cm`
                        : t('common.unknown')}
                    </div>
                    <div className="metric-chip">
                      {t('tanks.soil')}: <strong>{selected.soil ?? t('common.unknown')}</strong>
                    </div>
                    <div className="metric-chip">
                      {t('tanks.residents')}:{' '}
                      <strong>
                        {selected.inhabitants.reduce(
                          (sum, inhabitant) => sum + inhabitant.count,
                          0
                        )}
                      </strong>
                    </div>
                  </div>
                </div>
              </article>
              <div className="grid grid--two">
                <article className="card">
                  <div className="card__header">
                    <div>
                      <h2>{t('tanks.targets')}</h2>
                      <p>{t('tanks.targetsHelp')}</p>
                    </div>
                    {selectedWarnings.length ? (
                      <span className="badge badge--warning">
                        <AlertTriangle size={12} aria-hidden="true" />
                        {selectedWarnings.length}
                      </span>
                    ) : targetRanges.some((range) => range.tankId === selected.id) &&
                      targetRanges.some((range) => {
                        const reading = latestByTankAndParameter.get(
                          `${selected.id}\u0000${range.parameterId}`
                        );
                        const parameter = parameterDefinitions.find(
                          (item) => item.id === range.parameterId
                        );
                        return Boolean(reading && (!parameter || parameter.unit === reading.unit));
                      }) ? (
                      <span className="badge badge--success">
                        <CheckCircle2 size={12} aria-hidden="true" />
                        {t('tanks.stable')}
                      </span>
                    ) : (
                      <span className="badge badge--neutral">
                        {targetRanges.some((range) => range.tankId === selected.id)
                          ? t('tanks.noComparableData')
                          : t('tanks.noTargets')}
                      </span>
                    )}
                  </div>
                  <div className="card__body">
                    <div className="target-grid">
                      <span className="target-grid__head">{t('water.parameter')}</span>
                      <span className="target-grid__head">{t('common.minimum')}</span>
                      <span className="target-grid__head">{t('common.maximum')}</span>
                    </div>
                    {parameterDefinitions.map((parameter) => (
                      <div className="target-grid" key={parameter.id}>
                        <span className="target-grid__label">
                          {parameterLabel(parameter, t)} <small>{parameter.unit}</small>
                        </span>
                        <input
                          aria-label={`${parameterLabel(parameter, t)} ${t('common.minimum')}`}
                          inputMode="decimal"
                          type="text"
                          maxLength={32}
                          aria-invalid={Boolean(targetError)}
                          aria-describedby={targetError ? 'target-error' : undefined}
                          value={targetDraft[parameter.id]?.minimum ?? ''}
                          onChange={(event) => (
                            setTargetDraftDirty(true),
                            setTargetDraft((current) => ({
                              ...current,
                              [parameter.id]: {
                                minimum: event.target.value,
                                maximum: current[parameter.id]?.maximum ?? ''
                              }
                            }))
                          )}
                        />
                        <input
                          aria-label={`${parameterLabel(parameter, t)} ${t('common.maximum')}`}
                          inputMode="decimal"
                          type="text"
                          maxLength={32}
                          aria-invalid={Boolean(targetError)}
                          aria-describedby={targetError ? 'target-error' : undefined}
                          value={targetDraft[parameter.id]?.maximum ?? ''}
                          onChange={(event) => (
                            setTargetDraftDirty(true),
                            setTargetDraft((current) => ({
                              ...current,
                              [parameter.id]: {
                                minimum: current[parameter.id]?.minimum ?? '',
                                maximum: event.target.value
                              }
                            }))
                          )}
                        />
                      </div>
                    ))}
                    {targetError ? (
                      <p id="target-error" className="field__error" role="alert">
                        {targetError}
                      </p>
                    ) : null}
                    <p className="field__hint">{t('tanks.rangeHelp')}</p>
                    <div className="card__footer">
                      <button
                        disabled={savingTargets}
                        className="button button--small"
                        type="button"
                        onClick={() => void saveTargets()}
                      >
                        {t('tanks.saveTargets')}
                      </button>
                    </div>
                  </div>
                </article>
                <article className="card">
                  <div className="card__header">
                    <div>
                      <h2>{t('tanks.latest')}</h2>
                      <p>{t('water.subtitle')}</p>
                    </div>
                  </div>
                  <div className="card__body">
                    {latestSelected.length ? (
                      <div className="list">
                        {latestSelected.map((reading) => (
                          <div className="list-row" key={reading.id}>
                            <div className="list-row__main">
                              <strong>
                                {parameterLabel(
                                  parameterDefinitions.find(
                                    (parameter) => parameter.id === reading.parameterId
                                  ),
                                  t
                                )}
                              </strong>
                              <span>{formatDateTime(reading.measuredAt, locale)}</span>
                            </div>
                            <span
                              className={`badge ${selectedWarnings.some((warning) => warning.reading.id === reading.id) ? 'badge--warning' : 'badge--neutral'}`}
                            >
                              {formatNumber(reading.value, locale)} {reading.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-inline">
                        <CheckCircle2 size={18} aria-hidden="true" />
                        {t('dashboard.noReadings')}
                      </div>
                    )}
                  </div>
                </article>
              </div>
            </section>
          ) : null}
        </>
      )}
      <Dialog
        open={dialogOpen}
        title={editing ? t('tanks.edit') : t('tanks.add')}
        closeLabel={t('common.close')}
        onClose={() => setDialogOpen(false)}
        size="wide"
      >
        <ActionForm onSubmit={submitTank}>
          <div className="form-grid">
            <TextInput
              label={t('tanks.name')}
              required
              placeholder={t('tanks.namePlaceholder')}
              value={draft.name}
              onChange={(event) => updateDraft('name', event.target.value)}
            />
            <TextInput
              label={t('tanks.volume')}
              max="100000"
              required
              inputMode="decimal"
              type="number"
              min="0.1"
              step="0.1"
              value={draft.volumeLiters}
              onChange={(event) => updateDraft('volumeLiters', event.target.value)}
            />
            <TextInput
              label={t('tanks.started')}
              required
              type="date"
              value={draft.startDate}
              onChange={(event) => updateDraft('startDate', event.target.value)}
            />
            <Field label={t('tanks.linkedLine')}>
              {({ id }) => (
                <select
                  id={id}
                  value={draft.breedingLineId}
                  onChange={(event) => updateDraft('breedingLineId', event.target.value)}
                >
                  <option value="">{t('common.none')}</option>
                  {breedingLines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <TextInput
              label={t('tanks.length')}
              min="0.01"
              max="10000"
              type="number"
              inputMode="decimal"
              value={draft.lengthCm}
              onChange={(event) => updateDraft('lengthCm', event.target.value)}
            />
            <TextInput
              label={t('tanks.width')}
              min="0.01"
              max="10000"
              type="number"
              inputMode="decimal"
              value={draft.widthCm}
              onChange={(event) => updateDraft('widthCm', event.target.value)}
            />
            <TextInput
              label={t('tanks.height')}
              min="0.01"
              max="10000"
              type="number"
              inputMode="decimal"
              value={draft.heightCm}
              onChange={(event) => updateDraft('heightCm', event.target.value)}
            />
            <TextInput
              label={t('tanks.targetTemperature')}
              min="-20"
              max="100"
              type="number"
              inputMode="decimal"
              value={draft.targetTemperature}
              onChange={(event) => updateDraft('targetTemperature', event.target.value)}
            />
            <TextInput
              label={t('tanks.soil')}
              value={draft.soil}
              onChange={(event) => updateDraft('soil', event.target.value)}
            />
            <TextInput
              label={t('tanks.soilInstalled')}
              type="date"
              value={draft.soilInstalledAt}
              onChange={(event) => updateDraft('soilInstalledAt', event.target.value)}
            />
            <TextInput
              label={t('tanks.filter')}
              value={draft.filterType}
              onChange={(event) => updateDraft('filterType', event.target.value)}
            />
            <TextInput
              label={t('tanks.species')}
              value={draft.species}
              onChange={(event) => updateDraft('species', event.target.value)}
            />
            <TextInput
              label={t('tanks.variant')}
              value={draft.variant}
              onChange={(event) => updateDraft('variant', event.target.value)}
            />
            <TextInput
              label={t('tanks.inhabitants')}
              step="1"
              max="1000000"
              type="number"
              min="0"
              value={draft.inhabitantsCount}
              onChange={(event) => updateDraft('inhabitantsCount', event.target.value)}
            />
            <Field label={t('tanks.description')}>
              {({ id, describedBy }) => (
                <textarea
                  maxLength={2000}
                  id={id}
                  aria-describedby={describedBy}
                  value={draft.description}
                  onChange={(event) => updateDraft('description', event.target.value)}
                />
              )}
            </Field>
            <Field label={t('tanks.notes')}>
              {({ id, describedBy }) => (
                <textarea
                  maxLength={10000}
                  id={id}
                  aria-describedby={describedBy}
                  value={draft.notes}
                  onChange={(event) => updateDraft('notes', event.target.value)}
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
        </ActionForm>
      </Dialog>
      <Dialog
        open={deleteDialog}
        title={t('tanks.deleteTitle')}
        description={t('tanks.deleteBody')}
        closeLabel={t('common.close')}
        onClose={() => {
          if (!deleting) {
            setDeleteDialog(false);
            setDeleteTarget(null);
          }
        }}
      >
        <div className="card__footer">
          <button
            className="button button--secondary"
            type="button"
            disabled={deleting}
            onClick={() => {
              setDeleteDialog(false);
              setDeleteTarget(null);
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            className="button button--danger"
            type="button"
            disabled={deleting}
            onClick={() =>
              void confirmDelete().catch(() => notify(t('common.actionFailed'), 'error'))
            }
          >
            {t('common.delete')}
          </button>
        </div>
      </Dialog>
    </>
  );
}
