import { useEffect, useMemo, useState } from 'react';
import type * as React from 'react';
import { AlertTriangle, Beaker, CheckCircle2, Edit3, Plus, Ruler, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../components/ui/Dialog';
import { Field, TextInput } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { useApp } from '../store/AppContext';
import type { Tank } from '../domain/models';
import { collectParameterWarnings } from '../domain/calculations';
import { dateInputValue, daysSince, formatDate, formatNumber } from '../utils/format';

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
    name: tank.name.replace(/^DEMO · /, ''),
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(params.get('selected') ?? tanks[0]?.id ?? '');
  const [editing, setEditing] = useState<Tank | null>(null);
  const [draft, setDraft] = useState<TankDraft>(emptyDraft);
  const [targetDraft, setTargetDraft] = useState<
    Record<string, { minimum: string; maximum: string }>
  >({});

  const selected = tanks.find((tank) => tank.id === selectedId) ?? tanks[0];
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
    const querySelected = params.get('selected');
    if (querySelected && tanks.some((tank) => tank.id === querySelected))
      setSelectedId(querySelected);
    if (params.get('new') === '1') {
      setEditing(null);
      setDraft(emptyDraft());
      setDialogOpen(true);
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams, tanks]);

  useEffect(() => {
    if (!selected) return;
    const ranges = targetRanges.filter((range) => range.tankId === selected.id);
    const next: Record<string, { minimum: string; maximum: string }> = {};
    for (const parameter of parameterDefinitions) {
      const range = ranges.find((item) => item.parameterId === parameter.id);
      next[parameter.id] = {
        minimum: range ? String(range.minimum) : '',
        maximum: range ? String(range.maximum) : ''
      };
    }
    setTargetDraft(next);
  }, [parameterDefinitions, selected, targetRanges]);

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
            lengthCm: Number(draft.lengthCm),
            widthCm: Number(draft.widthCm),
            heightCm: Number(draft.heightCm)
          }
        : undefined;
    const inhabitants = draft.species
      ? [
          {
            id: editing?.inhabitants[0]?.id ?? `inhabitant_${Date.now()}`,
            species: draft.species,
            variant: draft.variant || undefined,
            count: Number(draft.inhabitantsCount) || 0
          }
        ]
      : [];
    const input = {
      name: draft.name.trim(),
      volumeLiters: Number(draft.volumeLiters),
      dimensions,
      startDate: draft.startDate,
      description: draft.description.trim() || undefined,
      soil: draft.soil.trim() || undefined,
      soilInstalledAt: draft.soilInstalledAt || undefined,
      filterType: draft.filterType.trim() || undefined,
      targetTemperature: draft.targetTemperature ? Number(draft.targetTemperature) : undefined,
      notes: draft.notes.trim() || undefined,
      inhabitants,
      breedingLineId: draft.breedingLineId || undefined
    };
    if (!input.name || !Number.isFinite(input.volumeLiters) || input.volumeLiters <= 0) return;
    if (editing) await saveTank({ ...editing, ...input, updatedAt: new Date().toISOString() });
    else {
      const created = await addTank(input);
      setSelectedId(created.id);
    }
    setDialogOpen(false);
    notify(t('tanks.saved'));
  };

  const saveTargets = async () => {
    if (!selected) return;
    const ranges = parameterDefinitions.flatMap((parameter) => {
      const values = targetDraft[parameter.id];
      if (!values?.minimum || !values.maximum) return [];
      return [
        {
          parameterId: parameter.id,
          minimum: Number(values.minimum),
          maximum: Number(values.maximum)
        }
      ];
    });
    await saveTargetRanges(selected.id, ranges);
    notify(t('tanks.saveTargets'));
  };

  const confirmDelete = async () => {
    if (!selected) return;
    await deleteTank(selected.id);
    setSelectedId(tanks.find((tank) => tank.id !== selected.id)?.id ?? '');
    setDeleteDialog(false);
    notify(t('tanks.deleted'));
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
          <div className="grid grid--three" style={{ marginBottom: '1rem' }}>
            {tanks.map((tank) => {
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
                  <span className={`badge ${count ? 'badge--warning' : 'badge--success'}`}>
                    {count ? (
                      <AlertTriangle size={12} aria-hidden="true" />
                    ) : (
                      <CheckCircle2 size={12} aria-hidden="true" />
                    )}
                    {count ? t('tanks.attention', { count }) : t('tanks.stable')}
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
                    <h2 style={{ marginTop: '0.35rem', fontSize: '1.45rem' }}>
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
                      onClick={() => setDeleteDialog(true)}
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
                    ) : (
                      <span className="badge badge--success">
                        <CheckCircle2 size={12} aria-hidden="true" />
                        {t('tanks.stable')}
                      </span>
                    )}
                  </div>
                  <div className="card__body">
                    <div className="target-grid">
                      <span className="target-grid__head">{t('water.parameter')}</span>
                      <span className="target-grid__head">Min</span>
                      <span className="target-grid__head">Max</span>
                    </div>
                    {parameterDefinitions.map((parameter) => (
                      <div className="target-grid" key={parameter.id}>
                        <span className="target-grid__label">
                          {parameter.name} <small>{parameter.unit}</small>
                        </span>
                        <input
                          aria-label={`${parameter.name} minimum`}
                          inputMode="decimal"
                          type="number"
                          value={targetDraft[parameter.id]?.minimum ?? ''}
                          onChange={(event) =>
                            setTargetDraft((current) => ({
                              ...current,
                              [parameter.id]: {
                                minimum: event.target.value,
                                maximum: current[parameter.id]?.maximum ?? ''
                              }
                            }))
                          }
                        />
                        <input
                          aria-label={`${parameter.name} maximum`}
                          inputMode="decimal"
                          type="number"
                          value={targetDraft[parameter.id]?.maximum ?? ''}
                          onChange={(event) =>
                            setTargetDraft((current) => ({
                              ...current,
                              [parameter.id]: {
                                minimum: current[parameter.id]?.minimum ?? '',
                                maximum: event.target.value
                              }
                            }))
                          }
                        />
                      </div>
                    ))}
                    <div className="card__footer">
                      <button
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
                    {selectedWarnings.length ? (
                      <div className="list">
                        {selectedWarnings.map((warning) => (
                          <div className="list-row" key={warning.reading.id}>
                            <div className="list-row__main">
                              <strong>
                                {warning.parameter?.name ?? warning.reading.parameterId}
                              </strong>
                              <span>{t('water.outOfRange')}</span>
                            </div>
                            <span className="badge badge--warning">
                              {formatNumber(warning.reading.value, locale)} {warning.reading.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-inline">
                        <CheckCircle2 size={18} aria-hidden="true" />
                        {t('dashboard.noAlerts')}
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
        <form onSubmit={(event) => void submitTank(event)}>
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
              type="number"
              inputMode="decimal"
              value={draft.lengthCm}
              onChange={(event) => updateDraft('lengthCm', event.target.value)}
            />
            <TextInput
              label={t('tanks.width')}
              type="number"
              inputMode="decimal"
              value={draft.widthCm}
              onChange={(event) => updateDraft('widthCm', event.target.value)}
            />
            <TextInput
              label={t('tanks.height')}
              type="number"
              inputMode="decimal"
              value={draft.heightCm}
              onChange={(event) => updateDraft('heightCm', event.target.value)}
            />
            <TextInput
              label={t('tanks.targetTemperature')}
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
              type="number"
              min="0"
              value={draft.inhabitantsCount}
              onChange={(event) => updateDraft('inhabitantsCount', event.target.value)}
            />
            <Field label={t('tanks.description')}>
              {({ id, describedBy }) => (
                <textarea
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
        </form>
      </Dialog>
      <Dialog
        open={deleteDialog}
        title={t('tanks.deleteTitle')}
        description={t('tanks.deleteBody')}
        closeLabel={t('common.close')}
        onClose={() => setDeleteDialog(false)}
      >
        <div className="card__footer">
          <button
            className="button button--secondary"
            type="button"
            onClick={() => setDeleteDialog(false)}
          >
            {t('common.cancel')}
          </button>
          <button
            className="button button--danger"
            type="button"
            onClick={() => void confirmDelete()}
          >
            {t('common.delete')}
          </button>
        </div>
      </Dialog>
    </>
  );
}
