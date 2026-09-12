import { useMemo, useState } from 'react';
import type * as React from 'react';
import { CalendarClock, CheckCircle2, Droplets, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ActionForm } from '../components/ui/ActionForm';
import { Dialog } from '../components/ui/Dialog';
import { Field, TextInput } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import type { MaintenanceEventType, ReminderRepeat } from '../domain/models';
import {
  dateInputValue,
  formatDate,
  formatNumber,
  localDayToIso,
  parseDecimal
} from '../utils/format';
import { isReminderDue } from '../domain/calculations';
import { useApp } from '../store/AppContext';

const careTypes: MaintenanceEventType[] = [
  'water_change',
  'filter_clean',
  'soil_replace',
  'soil_partial',
  'feed',
  'mineral',
  'additive',
  'other'
];
const repeats: ReminderRepeat[] = ['none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

export default function CarePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? 'de-DE' : 'en-GB';
  const { tanks, maintenanceEvents, reminders, addMaintenance, addReminder, toggleReminder } =
    useApp();
  const { notify } = useToast();
  const [maintenanceDialog, setMaintenanceDialog] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [reminderDialog, setReminderDialog] = useState(false);
  const [maintenanceDraft, setMaintenanceDraft] = useState({
    tankId: tanks[0]?.id ?? '',
    type: 'water_change' as MaintenanceEventType,
    performedAt: dateInputValue(),
    amount: '',
    unit: 'L',
    waterChangePercent: '',
    note: ''
  });
  const [reminderDraft, setReminderDraft] = useState({
    tankId: tanks[0]?.id ?? '',
    title: '',
    description: '',
    dueAt: dateInputValue(),
    repeat: 'none' as ReminderRepeat
  });
  const openReminders = useMemo(
    () =>
      [...reminders].sort(
        (a, b) =>
          Number(a.completed) - Number(b.completed) ||
          Date.parse(a.dueAt) - Date.parse(b.dueAt) ||
          a.id.localeCompare(b.id)
      ),
    [reminders]
  );

  const saveMaintenance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!maintenanceDraft.tankId) {
      notify(t('tanks.emptyBody'), 'error');
      return;
    }
    await addMaintenance({
      tankId: maintenanceDraft.tankId,
      type: maintenanceDraft.type,
      performedAt: localDayToIso(maintenanceDraft.performedAt),
      amount: maintenanceDraft.amount ? parseDecimal(maintenanceDraft.amount) : undefined,
      unit: maintenanceDraft.unit || undefined,
      waterChangePercent: maintenanceDraft.waterChangePercent
        ? parseDecimal(maintenanceDraft.waterChangePercent)
        : undefined,
      note: maintenanceDraft.note.trim() || undefined
    });
    setMaintenanceDialog(false);
    notify(t('care.saved'));
  };
  const saveReminder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reminderDraft.title.trim()) return;
    await addReminder({
      tankId: reminderDraft.tankId || undefined,
      title: reminderDraft.title.trim(),
      description: reminderDraft.description.trim() || undefined,
      dueAt: localDayToIso(reminderDraft.dueAt),
      repeat: reminderDraft.repeat,
      completed: false
    });
    setReminderDialog(false);
    notify(t('care.reminderSaved'));
  };

  return (
    <>
      <PageHeader
        title={t('care.title')}
        subtitle={t('care.subtitle')}
        actions={
          <>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => {
                setReminderDraft({
                  tankId: tanks[0]?.id ?? '',
                  title: '',
                  description: '',
                  dueAt: dateInputValue(),
                  repeat: 'none'
                });
                setReminderDialog(true);
              }}
            >
              <CalendarClock size={16} aria-hidden="true" />
              {t('care.addReminder')}
            </button>
            <button
              className="button"
              type="button"
              disabled={!tanks.length}
              onClick={() => {
                setMaintenanceDraft({
                  tankId: tanks[0]?.id ?? '',
                  type: 'water_change',
                  performedAt: dateInputValue(),
                  amount: '',
                  unit: 'L',
                  waterChangePercent: '',
                  note: ''
                });
                setMaintenanceDialog(true);
              }}
            >
              <Plus size={17} aria-hidden="true" />
              {t('care.addMaintenance')}
            </button>
          </>
        }
      />
      <div className="grid grid--two">
        <section className="card">
          <div className="card__header">
            <div>
              <h2>{t('care.reminders')}</h2>
              <p>{t('care.subtitle')}</p>
            </div>
            <button
              className="button button--small"
              type="button"
              onClick={() => {
                setReminderDraft({
                  tankId: tanks[0]?.id ?? '',
                  title: '',
                  description: '',
                  dueAt: dateInputValue(),
                  repeat: 'none'
                });
                setReminderDialog(true);
              }}
            >
              <Plus size={15} aria-hidden="true" />
              {t('care.addReminder')}
            </button>
          </div>
          <div className="card__body">
            <div className="list">
              {openReminders.map((reminder) => {
                const due = isReminderDue(reminder);
                const dueToday = dateInputValue(new Date(reminder.dueAt)) === dateInputValue();
                return (
                  <div
                    className={`list-row ${reminder.completed ? 'list-row--completed' : ''}`}
                    key={reminder.id}
                  >
                    <button
                      className="checkbox-button"
                      type="button"
                      aria-label={reminder.completed ? t('care.reopen') : t('care.complete')}
                      onClick={() =>
                        void toggleReminder(reminder.id, !reminder.completed).catch(() =>
                          notify(t('common.actionFailed'), 'error')
                        )
                      }
                    >
                      {reminder.completed ? (
                        <CheckCircle2 size={19} aria-hidden="true" />
                      ) : (
                        <span />
                      )}
                    </button>
                    <div className="list-row__main">
                      <strong>{reminder.title}</strong>
                      <span>
                        {tanks.find((tank) => tank.id === reminder.tankId)?.name ?? t('common.all')}{' '}
                        · {reminder.description ?? ''}
                      </span>
                    </div>
                    <span
                      className={`badge ${reminder.completed ? 'badge--success' : due ? 'badge--warning' : 'badge--neutral'}`}
                    >
                      {reminder.completed
                        ? t('common.completed')
                        : due
                          ? dueToday
                            ? t('common.today')
                            : t('common.overdue')
                          : formatDate(reminder.dueAt, locale)}
                    </span>
                  </div>
                );
              })}
            </div>
            {openReminders.length === 0 ? (
              <div className="empty-inline">
                <CheckCircle2 size={18} aria-hidden="true" />
                {t('dashboard.noTasks')}
              </div>
            ) : null}
          </div>
        </section>
        <section className="card">
          <div className="card__header">
            <div>
              <h2>{t('care.maintenance')}</h2>
              <p>{t('dashboard.lastWaterChange')}</p>
            </div>
            <button
              className="button button--small"
              type="button"
              disabled={!tanks.length}
              onClick={() => {
                setMaintenanceDraft({
                  tankId: tanks[0]?.id ?? '',
                  type: 'water_change',
                  performedAt: dateInputValue(),
                  amount: '',
                  unit: 'L',
                  waterChangePercent: '',
                  note: ''
                });
                setMaintenanceDialog(true);
              }}
            >
              <Plus size={15} aria-hidden="true" />
              {t('care.addMaintenance')}
            </button>
          </div>
          <div className="card__body">
            <div className="timeline">
              {[...maintenanceEvents]
                .sort(
                  (a, b) =>
                    Date.parse(b.performedAt) - Date.parse(a.performedAt) ||
                    b.id.localeCompare(a.id)
                )
                .slice(0, visibleCount)
                .map((item) => (
                  <div className="timeline__item" key={item.id}>
                    <div className="timeline__rail">
                      <span className="timeline__dot" />
                    </div>
                    <div className="timeline__content">
                      <strong>{t(`care.types.${item.type}`)}</strong>
                      <span>
                        {tanks.find((tank) => tank.id === item.tankId)?.name ?? t('common.unknown')}{' '}
                        {item.amount !== undefined
                          ? `· ${formatNumber(item.amount, locale)} ${item.unit ?? ''}`
                          : ''}{' '}
                        {item.waterChangePercent !== undefined
                          ? `· ${formatNumber(item.waterChangePercent, locale)} %`
                          : ''}{' '}
                        {item.note ?? ''}
                      </span>
                      <time dateTime={item.performedAt}>
                        {formatDate(item.performedAt, locale)}
                      </time>
                    </div>
                  </div>
                ))}
            </div>
            {visibleCount < maintenanceEvents.length ? (
              <button
                className="button button--secondary"
                type="button"
                onClick={() => setVisibleCount((count) => count + 12)}
              >
                {t('common.showMore')}
              </button>
            ) : null}
            {maintenanceEvents.length === 0 ? (
              <div className="empty-inline">
                <Droplets size={18} aria-hidden="true" />
                {t('common.noData')}
              </div>
            ) : null}
          </div>
        </section>
      </div>
      <Dialog
        open={maintenanceDialog}
        title={t('care.addMaintenance')}
        closeLabel={t('common.close')}
        onClose={() => setMaintenanceDialog(false)}
      >
        <ActionForm onSubmit={saveMaintenance}>
          <Field label={t('common.tank')} required>
            {({ id }) => (
              <select
                id={id}
                value={maintenanceDraft.tankId}
                onChange={(event) =>
                  setMaintenanceDraft((current) => ({ ...current, tankId: event.target.value }))
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
          <Field label={t('care.maintenanceType')} required>
            {({ id }) => (
              <select
                id={id}
                value={maintenanceDraft.type}
                onChange={(event) =>
                  setMaintenanceDraft((current) => ({
                    ...current,
                    type: event.target.value as MaintenanceEventType
                  }))
                }
              >
                {careTypes.map((type) => (
                  <option key={type} value={type}>
                    {t(`care.types.${type}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <TextInput
            label={t('common.date')}
            required
            type="date"
            value={maintenanceDraft.performedAt}
            onChange={(event) =>
              setMaintenanceDraft((current) => ({ ...current, performedAt: event.target.value }))
            }
          />
          <div className="form-grid">
            <TextInput
              label={t('care.amount')}
              type="number"
              min="0"
              step="any"
              value={maintenanceDraft.amount}
              onChange={(event) =>
                setMaintenanceDraft((current) => ({ ...current, amount: event.target.value }))
              }
            />
            <TextInput
              label={t('common.unit')}
              maxLength={32}
              value={maintenanceDraft.unit}
              onChange={(event) =>
                setMaintenanceDraft((current) => ({ ...current, unit: event.target.value }))
              }
            />
            <TextInput
              label={t('care.waterChangePercent')}
              type="number"
              min="0"
              max="100"
              value={maintenanceDraft.waterChangePercent}
              onChange={(event) =>
                setMaintenanceDraft((current) => ({
                  ...current,
                  waterChangePercent: event.target.value
                }))
              }
            />
            <Field label={t('common.note')}>
              {({ id }) => (
                <textarea
                  maxLength={2000}
                  id={id}
                  value={maintenanceDraft.note}
                  onChange={(event) =>
                    setMaintenanceDraft((current) => ({ ...current, note: event.target.value }))
                  }
                />
              )}
            </Field>
          </div>
          <div className="card__footer">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setMaintenanceDialog(false)}
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
        open={reminderDialog}
        title={t('care.addReminder')}
        closeLabel={t('common.close')}
        onClose={() => setReminderDialog(false)}
      >
        <ActionForm onSubmit={saveReminder}>
          <TextInput
            label={t('care.titleLabel')}
            required
            value={reminderDraft.title}
            onChange={(event) =>
              setReminderDraft((current) => ({ ...current, title: event.target.value }))
            }
          />
          <Field label={t('common.tank')}>
            {({ id }) => (
              <select
                id={id}
                value={reminderDraft.tankId}
                onChange={(event) =>
                  setReminderDraft((current) => ({ ...current, tankId: event.target.value }))
                }
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
          <div className="form-grid">
            <TextInput
              label={t('care.dueAt')}
              required
              type="date"
              value={reminderDraft.dueAt}
              onChange={(event) =>
                setReminderDraft((current) => ({ ...current, dueAt: event.target.value }))
              }
            />
            <Field label={t('care.repeat')}>
              {({ id }) => (
                <select
                  id={id}
                  value={reminderDraft.repeat}
                  onChange={(event) =>
                    setReminderDraft((current) => ({
                      ...current,
                      repeat: event.target.value as ReminderRepeat
                    }))
                  }
                >
                  {repeats.map((repeat) => (
                    <option key={repeat} value={repeat}>
                      {t(`care.repeats.${repeat}`)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <Field label={t('common.note')}>
            {({ id }) => (
              <textarea
                maxLength={2000}
                id={id}
                value={reminderDraft.description}
                onChange={(event) =>
                  setReminderDraft((current) => ({ ...current, description: event.target.value }))
                }
              />
            )}
          </Field>
          <div className="card__footer">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setReminderDialog(false)}
            >
              {t('common.cancel')}
            </button>
            <button className="button" type="submit">
              {t('common.save')}
            </button>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}
