import { useRef, useState } from 'react';
import type * as React from 'react';
import {
  Download,
  FileJson,
  Languages,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sun,
  Trash2,
  Upload
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../components/ui/Dialog';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { useApp } from '../store/AppContext';
import { downloadText } from '../utils/format';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { settings, exportBackup, exportCsv, importBackup, loadDemo, deleteAll, updateSettings } =
    useApp();
  const { notify } = useToast();
  const settingsRecord = settings[0];
  const importRef = useRef<HTMLInputElement>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [persistenceState, setPersistenceState] = useState<'idle' | 'granted' | 'denied'>('idle');

  const setTheme = async (theme: 'light' | 'dark' | 'system') => {
    await updateSettings({ theme });
  };

  const handleExportJson = async () => {
    const content = await exportBackup();
    downloadText(
      `caridinakeeper-backup-${new Date().toISOString().slice(0, 10)}.json`,
      content,
      'application/json'
    );
    notify(t('settings.exported'));
  };
  const handleExportCsv = () => {
    downloadText(
      `caridinakeeper-water-${new Date().toISOString().slice(0, 10)}.csv`,
      exportCsv(),
      'text/csv;charset=utf-8'
    );
    notify(t('settings.exported'));
  };
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      notify(t('settings.fileTooLarge'), 'error');
      return;
    }
    try {
      await importBackup(await file.text());
      notify(t('settings.imported'));
    } catch {
      notify(t('settings.invalidBackup'), 'error');
    }
  };
  const handleDemo = async () => {
    await loadDemo();
    notify(t('settings.demoData'));
  };
  const handleDelete = async () => {
    await deleteAll();
    setDeleteDialog(false);
    notify(t('settings.dataDeleted'));
  };
  const requestPersistence = async () => {
    if (!navigator.storage?.persist) {
      setPersistenceState('denied');
      return;
    }
    setPersistenceState((await navigator.storage.persist()) ? 'granted' : 'denied');
  };
  const changeLanguage = async (language: 'en' | 'de') => {
    await i18n.changeLanguage(language);
    localStorage.setItem('caridina-language', language);
    await updateSettings({ locale: language });
  };

  return (
    <>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <div className="settings-grid">
        <section className="card">
          <div className="card__header">
            <div>
              <h2>{t('settings.appearance')}</h2>
              <p>{t('settings.theme')}</p>
            </div>
            <Sun size={19} aria-hidden="true" />
          </div>
          <div className="card__body">
            <div className="theme-picker" role="group" aria-label={t('settings.theme')}>
              <button
                type="button"
                className={
                  settingsRecord?.theme === 'light'
                    ? 'theme-picker__item theme-picker__item--active'
                    : 'theme-picker__item'
                }
                onClick={() => void setTheme('light')}
              >
                <Sun size={17} aria-hidden="true" />
                {t('settings.light')}
              </button>
              <button
                type="button"
                className={
                  settingsRecord?.theme === 'dark'
                    ? 'theme-picker__item theme-picker__item--active'
                    : 'theme-picker__item'
                }
                onClick={() => void setTheme('dark')}
              >
                <Moon size={17} aria-hidden="true" />
                {t('settings.dark')}
              </button>
              <button
                type="button"
                className={
                  settingsRecord?.theme === 'system'
                    ? 'theme-picker__item theme-picker__item--active'
                    : 'theme-picker__item'
                }
                onClick={() => void setTheme('system')}
              >
                {t('settings.system')}
              </button>
            </div>
            <div className="language-picker">
              <Languages size={17} aria-hidden="true" />
              <label htmlFor="language">{t('settings.language')}</label>
              <select
                id="language"
                value={i18n.language.startsWith('de') ? 'de' : 'en'}
                onChange={(event) => void changeLanguage(event.target.value as 'en' | 'de')}
              >
                <option value="en">{t('settings.english')}</option>
                <option value="de">{t('settings.german')}</option>
              </select>
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card__header">
            <div>
              <h2>{t('settings.storage')}</h2>
              <p>{t('settings.storageBody')}</p>
            </div>
            <ShieldCheck size={19} aria-hidden="true" />
          </div>
          <div className="card__body">
            <div className="notice">
              <ShieldCheck size={17} aria-hidden="true" />
              <span>{t('settings.version', { version: 1 })}</span>
            </div>
            <div className="card__footer">
              <button
                className="button button--secondary"
                type="button"
                onClick={() => void requestPersistence()}
              >
                {persistenceState === 'granted'
                  ? t('settings.persistentGranted')
                  : t('settings.requestPersistence')}
              </button>
            </div>
            {persistenceState === 'denied' ? (
              <p className="field__error">{t('settings.persistentDenied')}</p>
            ) : null}
          </div>
        </section>
        <section className="card">
          <div className="card__header">
            <div>
              <h2>{t('settings.backup')}</h2>
              <p>{t('settings.importHelp')}</p>
            </div>
            <FileJson size={19} aria-hidden="true" />
          </div>
          <div className="card__body">
            <div className="settings-actions">
              <button className="button" type="button" onClick={() => void handleExportJson()}>
                <Download size={16} aria-hidden="true" />
                {t('settings.exportJson')}
              </button>
              <button className="button button--secondary" type="button" onClick={handleExportCsv}>
                <Download size={16} aria-hidden="true" />
                {t('settings.exportCsv')}
              </button>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => importRef.current?.click()}
              >
                <Upload size={16} aria-hidden="true" />
                {t('settings.importJson')}
              </button>
              <input
                ref={importRef}
                className="visually-hidden"
                type="file"
                accept="application/json,.json"
                onChange={(event) => void handleImport(event)}
              />
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card__header">
            <div>
              <h2>{t('settings.demoData')}</h2>
              <p>{t('settings.demoHelp')}</p>
            </div>
            <RotateCcw size={19} aria-hidden="true" />
          </div>
          <div className="card__body">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => void handleDemo()}
            >
              {t('settings.loadDemo')}
            </button>
          </div>
        </section>
        <section className="card card--danger">
          <div className="card__header">
            <div>
              <h2>{t('settings.danger')}</h2>
              <p>{t('settings.deleteBody')}</p>
            </div>
            <Trash2 size={19} aria-hidden="true" />
          </div>
          <div className="card__body">
            <button
              className="button button--danger"
              type="button"
              onClick={() => setDeleteDialog(true)}
            >
              <Trash2 size={16} aria-hidden="true" />
              {t('settings.deleteAll')}
            </button>
          </div>
        </section>
      </div>
      <Dialog
        open={deleteDialog}
        title={t('settings.deleteTitle')}
        description={t('settings.deleteBody')}
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
            onClick={() => void handleDelete()}
          >
            {t('common.delete')}
          </button>
        </div>
      </Dialog>
    </>
  );
}
