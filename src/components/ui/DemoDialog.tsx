import { useTranslation } from 'react-i18next';
import { useApp } from '../../store/AppContext';
import { ActionForm } from './ActionForm';
import { Dialog } from './Dialog';
import { useToast } from './Toast';

export function DemoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { loadDemo } = useApp();
  const { notify } = useToast();
  return (
    <Dialog
      open={open}
      title={t('settings.demoTitle')}
      description={t('settings.replaceBody')}
      closeLabel={t('common.close')}
      onClose={onClose}
    >
      <p>{t('settings.demoHelp')}</p>
      <ActionForm
        onSubmit={async () => {
          await loadDemo();
          onClose();
          notify(t('settings.demoData'));
        }}
      >
        <div className="card__footer">
          <button className="button button--secondary" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="button button--danger" type="submit">
            {t('settings.confirmDemo')}
          </button>
        </div>
      </ActionForm>
    </Dialog>
  );
}
