import { useState } from 'react';
import type * as React from 'react';
import { GitBranch, Plus, Sprout, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ActionForm } from '../components/ui/ActionForm';
import { Dialog } from '../components/ui/Dialog';
import { Field, TextInput } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { useApp } from '../store/AppContext';
import {
  dateInputValue,
  formatDate,
  formatNumber,
  localDayToIso,
  parseDecimal
} from '../utils/format';
import type { BreedingEventType, BreedingLine, CrossGeneration } from '../domain/models';

export default function BreedingPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? 'de-DE' : 'en-GB';
  const {
    tanks,
    breedingLines,
    breedingEvents,
    crosses,
    addBreedingLine,
    addBreedingEvent,
    addCross,
    deleteBreedingLine
  } = useApp();
  const { notify } = useToast();
  const [activePanel, setActivePanel] = useState<'lines' | 'events' | 'crosses'>('lines');
  const [lineDialog, setLineDialog] = useState(false);
  const [deletingLine, setDeletingLine] = useState<BreedingLine | null>(null);
  const [eventDialog, setEventDialog] = useState(false);
  const [crossDialog, setCrossDialog] = useState(false);
  const [lineDraft, setLineDraft] = useState({
    name: '',
    species: '',
    variant: '',
    color: '',
    orangeEye: false,
    generation: '',
    origin: '',
    purchaseDate: '',
    count: '0',
    sex: '',
    price: '',
    notes: ''
  });
  const [eventDraft, setEventDraft] = useState({
    breedingLineId: '',
    tankId: '',
    type: 'berried' as BreedingEventType,
    occurredAt: dateInputValue(),
    count: '',
    note: ''
  });
  const [crossDraft, setCrossDraft] = useState({
    name: '',
    parentA: '',
    parentB: '',
    generation: 'F1' as CrossGeneration,
    selectionGoal: '',
    notes: '',
    tankId: ''
  });

  const saveLine = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!lineDraft.name.trim() || !lineDraft.species.trim()) return;
    await addBreedingLine({
      name: lineDraft.name.trim(),
      species: lineDraft.species.trim(),
      variant: lineDraft.variant.trim() || undefined,
      color: lineDraft.color.trim() || undefined,
      orangeEye: lineDraft.orangeEye,
      generation: lineDraft.generation.trim() || undefined,
      origin: lineDraft.origin.trim() || undefined,
      purchaseDate: lineDraft.purchaseDate || undefined,
      count: parseDecimal(lineDraft.count) || 0,
      sex: lineDraft.sex.trim() || undefined,
      price: lineDraft.price ? parseDecimal(lineDraft.price) : undefined,
      notes: lineDraft.notes.trim() || undefined
    });
    setLineDialog(false);
    notify(t('breeding.saved'));
  };
  const saveEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventDraft.breedingLineId) return;
    await addBreedingEvent({
      breedingLineId: eventDraft.breedingLineId,
      tankId: eventDraft.tankId || undefined,
      type: eventDraft.type,
      occurredAt: localDayToIso(eventDraft.occurredAt),
      count: eventDraft.count ? parseDecimal(eventDraft.count) : undefined,
      note: eventDraft.note.trim() || undefined
    });
    setEventDialog(false);
    notify(t('breeding.saved'));
  };
  const saveCross = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !crossDraft.name.trim() ||
      !crossDraft.parentA ||
      !crossDraft.parentB ||
      crossDraft.parentA === crossDraft.parentB
    ) {
      notify(t('validation.differentParents'), 'error');
      return;
    }
    await addCross({
      name: crossDraft.name.trim(),
      parentLineIds: [crossDraft.parentA, crossDraft.parentB],
      generation: crossDraft.generation,
      selectionGoal: crossDraft.selectionGoal.trim(),
      notes: crossDraft.notes.trim() || undefined,
      tankId: crossDraft.tankId || undefined
    });
    setCrossDialog(false);
    notify(t('breeding.saved'));
  };

  return (
    <>
      <PageHeader
        title={t('breeding.title')}
        subtitle={t('breeding.subtitle')}
        actions={
          <div className="page-header__actions">
            <button
              className="button button--secondary"
              type="button"
              disabled={!breedingLines.length}
              onClick={() => {
                setEventDraft({
                  breedingLineId: breedingLines[0]?.id ?? '',
                  tankId: '',
                  type: 'berried',
                  occurredAt: dateInputValue(),
                  count: '',
                  note: ''
                });
                setEventDialog(true);
              }}
            >
              <Plus size={16} aria-hidden="true" />
              {t('breeding.addEvent')}
            </button>
            <button
              className="button"
              type="button"
              onClick={() => {
                setLineDraft({
                  name: '',
                  species: '',
                  variant: '',
                  color: '',
                  orangeEye: false,
                  generation: '',
                  origin: '',
                  purchaseDate: '',
                  count: '0',
                  sex: '',
                  price: '',
                  notes: ''
                });
                setLineDialog(true);
              }}
            >
              <Plus size={16} aria-hidden="true" />
              {t('breeding.addLine')}
            </button>
          </div>
        }
      />
      <div className="notice section-gap-bottom">
        <GitBranch size={17} aria-hidden="true" />
        <span>{t('breeding.noPrediction')}</span>
      </div>
      <div className="segmented-control" role="tablist" aria-label={t('breeding.title')}>
        <button
          type="button"
          role="tab"
          aria-selected={activePanel === 'lines'}
          className={
            activePanel === 'lines'
              ? 'segmented-control__item segmented-control__item--active'
              : 'segmented-control__item'
          }
          onClick={() => setActivePanel('lines')}
        >
          {t('breeding.lines')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activePanel === 'events'}
          className={
            activePanel === 'events'
              ? 'segmented-control__item segmented-control__item--active'
              : 'segmented-control__item'
          }
          onClick={() => setActivePanel('events')}
        >
          {t('breeding.events')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activePanel === 'crosses'}
          className={
            activePanel === 'crosses'
              ? 'segmented-control__item segmented-control__item--active'
              : 'segmented-control__item'
          }
          onClick={() => setActivePanel('crosses')}
        >
          {t('breeding.crosses')}
        </button>
      </div>
      {activePanel === 'lines' ? (
        <section className="card section-gap">
          <div className="card__header">
            <div>
              <h2>{t('breeding.lines')}</h2>
              <p>{t('breeding.emptyLines')}</p>
            </div>
            <button
              className="button button--small"
              type="button"
              onClick={() => {
                setLineDraft({
                  name: '',
                  species: '',
                  variant: '',
                  color: '',
                  orangeEye: false,
                  generation: '',
                  origin: '',
                  purchaseDate: '',
                  count: '0',
                  sex: '',
                  price: '',
                  notes: ''
                });
                setLineDialog(true);
              }}
            >
              <Plus size={15} aria-hidden="true" />
              {t('breeding.addLine')}
            </button>
          </div>
          <div className="card__body">
            {breedingLines.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">
                  <Sprout aria-hidden="true" />
                </div>
                <h3>{t('breeding.emptyLines')}</h3>
              </div>
            ) : (
              <div className="grid grid--two">
                {breedingLines.map((line) => (
                  <article className="line-card" key={line.id}>
                    <div className="line-card__top">
                      <div>
                        <h3>{line.name}</h3>
                        <p>
                          {line.species} {line.variant ? `· ${line.variant}` : ''}
                        </p>
                      </div>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`${t('common.delete')} ${line.name}`}
                        onClick={() => setDeletingLine(line)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="line-card__meta">
                      <span>
                        <strong>{line.count}</strong> {t('breeding.count')}
                      </span>
                      <span>{line.generation ?? t('common.unknown')}</span>
                      {line.orangeEye ? <span className="badge badge--warning">OE</span> : null}
                    </div>
                    <p className="line-card__note">{line.notes ?? t('common.noData')}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}
      {activePanel === 'events' ? (
        <section className="card section-gap">
          <div className="card__header">
            <div>
              <h2>{t('breeding.events')}</h2>
              <p>{t('breeding.subtitle')}</p>
            </div>
            <button
              className="button button--small"
              type="button"
              disabled={!breedingLines.length}
              onClick={() => {
                setEventDraft({
                  breedingLineId: breedingLines[0]?.id ?? '',
                  tankId: '',
                  type: 'berried',
                  occurredAt: dateInputValue(),
                  count: '',
                  note: ''
                });
                setEventDialog(true);
              }}
            >
              <Plus size={15} aria-hidden="true" />
              {t('breeding.addEvent')}
            </button>
          </div>
          <div className="card__body">
            <div className="timeline">
              {[...breedingEvents]
                .sort(
                  (a, b) =>
                    Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || b.id.localeCompare(a.id)
                )
                .map((event) => (
                  <div className="timeline__item" key={event.id}>
                    <div className="timeline__rail">
                      <span className="timeline__dot" />
                    </div>
                    <div className="timeline__content">
                      <strong>{t(`breeding.types.${event.type}`)}</strong>
                      <span>
                        {breedingLines.find((line) => line.id === event.breedingLineId)?.name ??
                          t('common.unknown')}{' '}
                        · {event.count !== undefined ? formatNumber(event.count, locale) : ''}{' '}
                        {event.note ?? ''}
                      </span>
                      <time dateTime={event.occurredAt}>
                        {formatDate(event.occurredAt, locale)}
                      </time>
                    </div>
                  </div>
                ))}
            </div>
            {breedingEvents.length === 0 ? (
              <div className="empty-inline">{t('common.noData')}</div>
            ) : null}
          </div>
        </section>
      ) : null}
      {activePanel === 'crosses' ? (
        <section className="card section-gap">
          <div className="card__header">
            <div>
              <h2>{t('breeding.crosses')}</h2>
              <p>{t('breeding.noPrediction')}</p>
            </div>
            <button
              className="button button--small"
              type="button"
              disabled={breedingLines.length < 2}
              onClick={() => {
                setCrossDraft({
                  name: '',
                  parentA: breedingLines[0]?.id ?? '',
                  parentB: breedingLines[1]?.id ?? '',
                  generation: 'F1',
                  selectionGoal: '',
                  notes: '',
                  tankId: ''
                });
                setCrossDialog(true);
              }}
            >
              <Plus size={15} aria-hidden="true" />
              {t('breeding.addCross')}
            </button>
          </div>
          <div className="card__body">
            {crosses.length === 0 ? (
              <div className="empty-inline">{t('common.noData')}</div>
            ) : (
              <div className="grid grid--two">
                {crosses.map((cross) => (
                  <article className="cross-card" key={cross.id}>
                    <span className="badge badge--neutral">
                      {cross.generation === 'backcross'
                        ? t('breeding.backcross')
                        : cross.generation}
                    </span>
                    <h3>{cross.name}</h3>
                    <p>
                      {breedingLines.find((line) => line.id === cross.parentLineIds[0])?.name ??
                        t('common.unknown')}{' '}
                      ×{' '}
                      {breedingLines.find((line) => line.id === cross.parentLineIds[1])?.name ??
                        t('common.unknown')}
                    </p>
                    <strong>{t('breeding.selectionGoal')}</strong>
                    <span>{cross.selectionGoal}</span>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}
      <Dialog
        open={lineDialog}
        title={t('breeding.addLine')}
        closeLabel={t('common.close')}
        onClose={() => setLineDialog(false)}
        size="wide"
      >
        <ActionForm onSubmit={saveLine}>
          <div className="form-grid">
            <TextInput
              label={t('breeding.lineName')}
              required
              value={lineDraft.name}
              onChange={(event) =>
                setLineDraft((current) => ({ ...current, name: event.target.value }))
              }
            />
            <TextInput
              label={t('breeding.species')}
              required
              value={lineDraft.species}
              onChange={(event) =>
                setLineDraft((current) => ({ ...current, species: event.target.value }))
              }
            />
            <TextInput
              label={t('breeding.variant')}
              value={lineDraft.variant}
              onChange={(event) =>
                setLineDraft((current) => ({ ...current, variant: event.target.value }))
              }
            />
            <TextInput
              label={t('breeding.color')}
              value={lineDraft.color}
              onChange={(event) =>
                setLineDraft((current) => ({ ...current, color: event.target.value }))
              }
            />
            <TextInput
              label={t('breeding.generation')}
              value={lineDraft.generation}
              onChange={(event) =>
                setLineDraft((current) => ({ ...current, generation: event.target.value }))
              }
            />
            <TextInput
              label={t('breeding.origin')}
              value={lineDraft.origin}
              onChange={(event) =>
                setLineDraft((current) => ({ ...current, origin: event.target.value }))
              }
            />
            <TextInput
              label={t('breeding.purchaseDate')}
              type="date"
              value={lineDraft.purchaseDate}
              onChange={(event) =>
                setLineDraft((current) => ({ ...current, purchaseDate: event.target.value }))
              }
            />
            <TextInput
              label={t('breeding.count')}
              step="1"
              max="1000000"
              type="number"
              min="0"
              value={lineDraft.count}
              onChange={(event) =>
                setLineDraft((current) => ({ ...current, count: event.target.value }))
              }
            />
            <TextInput
              label={t('breeding.sex')}
              value={lineDraft.sex}
              onChange={(event) =>
                setLineDraft((current) => ({ ...current, sex: event.target.value }))
              }
            />
            <TextInput
              label={t('breeding.price')}
              type="number"
              min="0"
              step="0.01"
              value={lineDraft.price}
              onChange={(event) =>
                setLineDraft((current) => ({ ...current, price: event.target.value }))
              }
            />
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={lineDraft.orangeEye}
                onChange={(event) =>
                  setLineDraft((current) => ({ ...current, orangeEye: event.target.checked }))
                }
              />
              {t('breeding.orangeEye')}
            </label>
            <Field label={t('common.note')}>
              {({ id }) => (
                <textarea
                  maxLength={2000}
                  id={id}
                  value={lineDraft.notes}
                  onChange={(event) =>
                    setLineDraft((current) => ({ ...current, notes: event.target.value }))
                  }
                />
              )}
            </Field>
          </div>
          <div className="card__footer">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setLineDialog(false)}
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
        open={eventDialog}
        title={t('breeding.addEvent')}
        closeLabel={t('common.close')}
        onClose={() => setEventDialog(false)}
      >
        <ActionForm onSubmit={saveEvent}>
          <Field label={t('breeding.lineName')} required>
            {({ id }) => (
              <select
                id={id}
                required
                value={eventDraft.breedingLineId}
                onChange={(event) =>
                  setEventDraft((current) => ({ ...current, breedingLineId: event.target.value }))
                }
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
          <Field label={t('common.tank')}>
            {({ id }) => (
              <select
                id={id}
                value={eventDraft.tankId}
                onChange={(event) =>
                  setEventDraft((current) => ({ ...current, tankId: event.target.value }))
                }
              >
                <option value="">{t('common.none')}</option>
                {tanks.map((tank) => (
                  <option key={tank.id} value={tank.id}>
                    {tank.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t('breeding.eventType')} required>
            {({ id }) => (
              <select
                id={id}
                value={eventDraft.type}
                onChange={(event) =>
                  setEventDraft((current) => ({
                    ...current,
                    type: event.target.value as BreedingEventType
                  }))
                }
              >
                {(
                  [
                    'berried',
                    'released',
                    'juveniles',
                    'molt',
                    'loss',
                    'move',
                    'selection',
                    'sale',
                    'giveaway',
                    'purchase'
                  ] as BreedingEventType[]
                ).map((type) => (
                  <option key={type} value={type}>
                    {t(`breeding.types.${type}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <TextInput
            label={t('breeding.eventDate')}
            required
            type="date"
            value={eventDraft.occurredAt}
            onChange={(event) =>
              setEventDraft((current) => ({ ...current, occurredAt: event.target.value }))
            }
          />
          <TextInput
            label={t('breeding.quantity')}
            step="1"
            max="1000000"
            type="number"
            min="0"
            value={eventDraft.count}
            onChange={(event) =>
              setEventDraft((current) => ({ ...current, count: event.target.value }))
            }
          />
          <Field label={t('common.note')}>
            {({ id }) => (
              <textarea
                maxLength={2000}
                id={id}
                value={eventDraft.note}
                onChange={(event) =>
                  setEventDraft((current) => ({ ...current, note: event.target.value }))
                }
              />
            )}
          </Field>
          <div className="card__footer">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setEventDialog(false)}
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
        open={crossDialog}
        title={t('breeding.addCross')}
        closeLabel={t('common.close')}
        onClose={() => setCrossDialog(false)}
      >
        <ActionForm onSubmit={saveCross}>
          <TextInput
            label={t('breeding.lineName')}
            required
            value={crossDraft.name}
            onChange={(event) =>
              setCrossDraft((current) => ({ ...current, name: event.target.value }))
            }
          />
          <Field label={t('breeding.parentA')} required>
            {({ id }) => (
              <select
                id={id}
                required
                value={crossDraft.parentA}
                onChange={(event) =>
                  setCrossDraft((current) => ({ ...current, parentA: event.target.value }))
                }
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
          <Field label={t('breeding.parentB')} required>
            {({ id }) => (
              <select
                id={id}
                required
                value={crossDraft.parentB}
                onChange={(event) =>
                  setCrossDraft((current) => ({ ...current, parentB: event.target.value }))
                }
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
          <Field label={t('breeding.generation')}>
            {({ id }) => (
              <select
                id={id}
                value={crossDraft.generation}
                onChange={(event) =>
                  setCrossDraft((current) => ({
                    ...current,
                    generation: event.target.value as CrossGeneration
                  }))
                }
              >
                {(['F1', 'F2', 'backcross'] as CrossGeneration[]).map((generation) => (
                  <option key={generation} value={generation}>
                    {generation === 'backcross' ? t('breeding.backcross') : generation}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <TextInput
            label={t('breeding.selectionGoal')}
            maxLength={2000}
            required
            value={crossDraft.selectionGoal}
            onChange={(event) =>
              setCrossDraft((current) => ({ ...current, selectionGoal: event.target.value }))
            }
          />
          <Field label={t('common.tank')}>
            {({ id }) => (
              <select
                id={id}
                value={crossDraft.tankId}
                onChange={(event) =>
                  setCrossDraft((current) => ({ ...current, tankId: event.target.value }))
                }
              >
                <option value="">{t('common.none')}</option>
                {tanks.map((tank) => (
                  <option key={tank.id} value={tank.id}>
                    {tank.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t('common.note')}>
            {({ id }) => (
              <textarea
                maxLength={2000}
                id={id}
                value={crossDraft.notes}
                onChange={(event) =>
                  setCrossDraft((current) => ({ ...current, notes: event.target.value }))
                }
              />
            )}
          </Field>
          <div className="card__footer">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setCrossDialog(false)}
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
        open={Boolean(deletingLine)}
        title={t('breeding.deleteTitle')}
        description={t('breeding.deleteBody', { name: deletingLine?.name })}
        closeLabel={t('common.close')}
        onClose={() => setDeletingLine(null)}
      >
        <ActionForm
          onSubmit={async () => {
            if (!deletingLine) return;
            await deleteBreedingLine(deletingLine.id);
            setDeletingLine(null);
            notify(t('breeding.deleted'));
          }}
        >
          <div className="card__footer">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setDeletingLine(null)}
            >
              {t('common.cancel')}
            </button>
            <button className="button button--danger" type="submit">
              {t('common.delete')}
            </button>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}
