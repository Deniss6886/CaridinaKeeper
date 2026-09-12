import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Droplets,
  Plus,
  Sprout
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/ui/PageHeader';
import { DemoDialog } from '../components/ui/DemoDialog';
import { TrendChart } from '../components/ui/TrendChart';
import { useApp } from '../store/AppContext';
import {
  collectParameterWarnings,
  isReminderDue,
  latestReadingsByTankAndParameter
} from '../domain/calculations';
import { formatDate, formatDateTime, formatNumber, daysSince } from '../utils/format';

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? 'de-DE' : 'en-GB';
  const {
    tanks,
    waterReadings,
    parameterDefinitions,
    targetRanges,
    reminders,
    breedingEvents,
    loading
  } = useApp();
  const [demoDialog, setDemoDialog] = useState(false);
  const [trendTankId, setTrendTankId] = useState('');
  const [trendParameterId, setTrendParameterId] = useState('');

  const warnings = useMemo(
    () => collectParameterWarnings(waterReadings, targetRanges, parameterDefinitions),
    [waterReadings, targetRanges, parameterDefinitions]
  );
  const dueReminders = useMemo(
    () =>
      reminders
        .filter((reminder) => isReminderDue(reminder))
        .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt) || a.id.localeCompare(b.id)),
    [reminders]
  );
  const latest = useMemo(() => latestReadingsByTankAndParameter(waterReadings), [waterReadings]);
  const activeParameterId = trendParameterId || parameterDefinitions[0]?.id || '';
  const activeTankId = trendTankId || tanks[0]?.id || '';
  const trendParameter = parameterDefinitions.find(
    (parameter) => parameter.id === activeParameterId
  );
  const trendTank = tanks.find((tank) => tank.id === activeTankId);
  const trendPoints = useMemo(
    () =>
      waterReadings
        .filter(
          (reading) =>
            reading.tankId === activeTankId &&
            reading.parameterId === activeParameterId &&
            reading.unit === trendParameter?.unit
        )
        .sort(
          (a, b) => Date.parse(a.measuredAt) - Date.parse(b.measuredAt) || a.id.localeCompare(b.id)
        )
        .slice(-12)
        .map((reading) => ({
          label: formatDate(reading.measuredAt, locale),
          value: reading.value
        })),
    [activeParameterId, activeTankId, locale, trendParameter?.unit, waterReadings]
  );
  const [now] = useState(() => Date.now());
  const activityCutoff = now - 30 * 86_400_000;
  const recentBreeding = breedingEvents.filter(
    (event) => Date.parse(event.occurredAt) >= activityCutoff
  ).length;
  const recentReadings = [...waterReadings]
    .sort((a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt) || b.id.localeCompare(a.id))
    .slice(0, 6);
  const tankWarningCount = (tankId: string) =>
    warnings.filter((warning) => warning.reading.tankId === tankId).length;

  if (loading)
    return (
      <div className="page-loading" role="status">
        {t('common.loading')}
      </div>
    );

  if (tanks.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow={t('dashboard.eyebrow')}
          title={t('dashboard.title')}
          subtitle={t('dashboard.emptyBody')}
        />
        <section className="card empty-state" aria-labelledby="empty-title">
          <div className="empty-state__icon">
            <Droplets aria-hidden="true" />
          </div>
          <h2 id="empty-title">{t('dashboard.emptyTitle')}</h2>
          <p>{t('dashboard.emptyBody')}</p>
          <div className="empty-state__actions">
            <Link className="button" to="/tanks?new=1">
              <Plus size={17} aria-hidden="true" />
              {t('dashboard.addTank')}
            </Link>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setDemoDialog(true)}
            >
              {t('dashboard.loadDemo')}
            </button>
          </div>
        </section>
        <DemoDialog open={demoDialog} onClose={() => setDemoDialog(false)} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={t('dashboard.eyebrow')}
        title={t('dashboard.title')}
        subtitle={t('dashboard.warningExplanation')}
        actions={
          <Link className="button" to="/tanks?new=1">
            <Plus size={17} aria-hidden="true" />
            {t('tanks.add')}
          </Link>
        }
      />
      <section className="grid grid--stats" aria-label={t('dashboard.title')}>
        <article className="card stat-card">
          <span className="stat-card__label">{t('dashboard.tanks')}</span>
          <strong className="stat-card__value">{tanks.length}</strong>
          <span className="stat-card__detail">
            <CheckCircle2 size={14} aria-hidden="true" />
            {t('dashboard.stable')}
          </span>
        </article>
        <article
          className={`card stat-card ${warnings.length ? 'stat-card--warning' : 'stat-card--success'}`}
        >
          <span className="stat-card__label">{t('dashboard.alerts')}</span>
          <strong className="stat-card__value">{warnings.length}</strong>
          <span className="stat-card__detail">
            <AlertTriangle size={14} aria-hidden="true" />
            {warnings.length
              ? t('tanks.attention', { count: warnings.length })
              : t('dashboard.stable')}
          </span>
        </article>
        <article className="card stat-card stat-card--accent">
          <span className="stat-card__label">{t('dashboard.dueTasks')}</span>
          <strong className="stat-card__value">{dueReminders.length}</strong>
          <span className="stat-card__detail">
            <CalendarClock size={14} aria-hidden="true" />
            {t('dashboard.upcoming')}
          </span>
        </article>
        <article className="card stat-card">
          <span className="stat-card__label">{t('dashboard.breeding')}</span>
          <strong className="stat-card__value">{recentBreeding}</strong>
          <span className="stat-card__detail">
            <Sprout size={14} aria-hidden="true" />
            {t('common.entries', { count: 30 })}
          </span>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="card" aria-labelledby="attention-title">
          <div className="card__header">
            <div>
              <h2 id="attention-title">{t('dashboard.attention')}</h2>
              <p>{t('dashboard.warningExplanation')}</p>
            </div>
            <Link className="text-link" to="/tanks">
              {t('common.all')} <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="card__body">
            <div className="grid grid--three">
              {tanks.map((tank) => {
                const count = tankWarningCount(tank.id);
                const hasTargets = targetRanges.some((range) => range.tankId === tank.id);
                const soilAge = daysSince(tank.soilInstalledAt);
                const first = [...latest.values()].find((reading) => reading.tankId === tank.id);
                const firstParameter = parameterDefinitions.find(
                  (parameter) => parameter.id === first?.parameterId
                );
                return (
                  <Link
                    className="tank-card"
                    key={tank.id}
                    to={`/tanks?selected=${encodeURIComponent(tank.id)}`}
                  >
                    <div className="tank-card__top">
                      <div>
                        <h2>{tank.name}</h2>
                        <p>
                          {formatNumber(tank.volumeLiters, locale)} L ·{' '}
                          {tank.inhabitants.reduce((sum, inhabitant) => sum + inhabitant.count, 0)}{' '}
                          {t('tanks.residents').toLowerCase()}
                        </p>
                      </div>
                      {tank.isDemo ? <span className="demo-badge">{t('common.demo')}</span> : null}
                    </div>
                    <span
                      className={`badge ${count ? 'badge--warning' : hasTargets ? 'badge--success' : 'badge--neutral'}`}
                    >
                      {count ? (
                        <AlertTriangle size={12} aria-hidden="true" />
                      ) : hasTargets ? (
                        <CheckCircle2 size={12} aria-hidden="true" />
                      ) : null}
                      {count
                        ? t('tanks.attention', { count })
                        : hasTargets
                          ? t('tanks.stable')
                          : t('tanks.noTargets')}
                    </span>
                    <div className="tank-card__metrics">
                      {first && firstParameter ? (
                        <span className="metric-chip">
                          <strong>{first.value}</strong> {firstParameter.unit}
                        </span>
                      ) : null}
                      {soilAge !== null ? (
                        <span className="metric-chip">
                          {t('dashboard.soilAge')}: <strong>{soilAge}</strong> d
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="card" aria-labelledby="tasks-title">
          <div className="card__header">
            <div>
              <h2 id="tasks-title">{t('dashboard.upcoming')}</h2>
              <p>{t('care.subtitle')}</p>
            </div>
            <Link className="text-link" to="/care">
              {t('common.all')} <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="card__body">
            {dueReminders.length === 0 ? (
              <div className="empty-inline">
                <CheckCircle2 size={18} aria-hidden="true" />
                {t('dashboard.noTasks')}
              </div>
            ) : (
              <div className="list">
                {dueReminders.slice(0, 5).map((reminder) => (
                  <div className="list-row" key={reminder.id}>
                    <div className="list-row__main">
                      <strong>{reminder.title}</strong>
                      <span>
                        {tanks.find((tank) => tank.id === reminder.tankId)?.name ?? t('common.all')}
                      </span>
                    </div>
                    <span className="list-row__meta">{formatDate(reminder.dueAt, locale)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid--wide section-gap">
        <section className="card" aria-labelledby="trend-title">
          <div className="card__header">
            <div>
              <h2 id="trend-title">{t('dashboard.trend')}</h2>
              <p>{t('dashboard.trendHint')}</p>
            </div>
            <div className="filter-bar filter-bar--flush">
              <label className="visually-hidden" htmlFor="trend-tank">
                {t('common.tank')}
              </label>
              <select
                id="trend-tank"
                value={activeTankId}
                onChange={(event) => setTrendTankId(event.target.value)}
              >
                <option value="">{t('common.none')}</option>
                {tanks.map((tank) => (
                  <option key={tank.id} value={tank.id}>
                    {tank.name}
                  </option>
                ))}
              </select>
              <label className="visually-hidden" htmlFor="trend-parameter">
                {t('water.parameter')}
              </label>
              <select
                id="trend-parameter"
                value={activeParameterId}
                onChange={(event) => setTrendParameterId(event.target.value)}
              >
                <option value="">{t('common.none')}</option>
                {parameterDefinitions.map((parameter) => (
                  <option key={parameter.id} value={parameter.id}>
                    {parameter.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="card__body">
            <TrendChart
              points={trendPoints}
              label={`${trendTank?.name ?? ''} ${trendParameter?.name ?? ''}`}
              unit={trendParameter?.unit ?? ''}
              emptyText={t('dashboard.noReadings')}
            />
          </div>
        </section>
        <section className="card" aria-labelledby="readings-title">
          <div className="card__header">
            <div>
              <h2 id="readings-title">{t('dashboard.recentReadings')}</h2>
              <p>{t('water.subtitle')}</p>
            </div>
            <Link className="text-link" to="/water">
              {t('water.title')} <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="card__body">
            {recentReadings.length === 0 ? (
              <div className="empty-inline">{t('dashboard.noReadings')}</div>
            ) : (
              <div className="list">
                {recentReadings.map((reading) => (
                  <div className="list-row" key={reading.id}>
                    <div className="list-row__main">
                      <strong>
                        {parameterDefinitions.find(
                          (parameter) => parameter.id === reading.parameterId
                        )?.name ?? reading.parameterId}
                      </strong>
                      <span>
                        {tanks.find((tank) => tank.id === reading.tankId)?.name ??
                          t('common.unknown')}
                      </span>
                    </div>
                    <span className="list-row__meta">
                      <strong>{formatNumber(reading.value, locale)}</strong> {reading.unit}
                      <br />
                      {formatDateTime(reading.measuredAt, locale)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      <div className="notice section-gap">
        <Droplets size={17} aria-hidden="true" />
        <span>{t('water.scientificNote')}</span>
      </div>
    </>
  );
}
