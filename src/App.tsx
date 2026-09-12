import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType } from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Beaker,
  BookOpen,
  CheckSquare,
  ChevronRight,
  CircleHelp,
  Droplets,
  Menu,
  Moon,
  Settings,
  Shrimp,
  Sun,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AppProvider, useApp } from './store/AppContext';
import { ToastProvider, useToast } from './components/ui/Toast';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TanksPage = lazy(() => import('./pages/TanksPage'));
const WaterPage = lazy(() => import('./pages/WaterPage'));
const BreedingPage = lazy(() => import('./pages/BreedingPage'));
const CarePage = lazy(() => import('./pages/CarePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

type IconComponent = ComponentType<{
  size?: number;
  strokeWidth?: number;
  'aria-hidden'?: boolean;
}>;

const navigation: Array<{ to: string; key: string; icon: IconComponent }> = [
  { to: '/', key: 'dashboard', icon: BarChart3 },
  { to: '/tanks', key: 'tanks', icon: Beaker },
  { to: '/water', key: 'water', icon: Droplets },
  { to: '/breeding', key: 'breeding', icon: Shrimp },
  { to: '/care', key: 'care', icon: CheckSquare },
  { to: '/settings', key: 'settings', icon: Settings }
];

function UpdatePrompt() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      setShow(true);
    }
  });
  if (!show) return null;
  return (
    <div className="update-banner" role="status">
      <span>{t('app.updateReady')}</span>
      <button
        className="button button--small"
        type="button"
        onClick={() => void updateServiceWorker(true)}
      >
        {t('app.update')}
      </button>
      <button
        className="button button--ghost button--small"
        type="button"
        onClick={() => setShow(false)}
      >
        {t('app.later')}
      </button>
    </div>
  );
}

function ThemeSync() {
  const { settings } = useApp();
  useEffect(() => {
    const theme = settings[0]?.theme ?? 'system';
    const root = document.documentElement;
    const resolved =
      theme === 'system'
        ? matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;
    root.dataset.theme = resolved;
  }, [settings]);
  return null;
}

function Shell() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useApp();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { notify } = useToast();
  const locale = settings[0]?.locale ?? 'en';
  const currentTitle = useMemo(() => {
    const item = navigation.find((entry) => entry.to === location.pathname);
    return item ? t(`nav.${item.key}`) : t('app.name');
  }, [location.pathname, t]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onOnline = () => notify(t('app.offlineReady'));
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [notify, t]);

  const theme = settings[0]?.theme ?? 'system';
  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    await updateSettings({ theme: next });
  };

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}
        aria-label={t('nav.openMenu')}
      >
        <div className="brand-lockup">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="36" height="36" />
          <div>
            <strong>{t('app.name')}</strong>
            <span>{t('app.privacy')}</span>
          </div>
          <button
            className="icon-button sidebar__close"
            type="button"
            aria-label={t('nav.closeMenu')}
            onClick={() => setMenuOpen(false)}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <nav className="sidebar__nav" aria-label={t('nav.primaryNav')}>
          {navigation.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
              end={to === '/'}
            >
              <Icon size={19} strokeWidth={1.8} aria-hidden={true} />
              <span>{t(`nav.${key}`)}</span>
              {to === location.pathname ? (
                <ChevronRight className="nav-link__chevron" size={16} aria-hidden="true" />
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <div className="privacy-card">
            <CircleHelp size={16} aria-hidden="true" />
            <span>{t('settings.storageBody')}</span>
          </div>
          <span className="version-label">v0.1.0 · {locale.toUpperCase()}</span>
        </div>
      </aside>
      {menuOpen ? (
        <button
          className="sidebar-scrim"
          type="button"
          aria-label={t('common.close')}
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <div className="app-main">
        <header className="topbar">
          <button
            className="icon-button topbar__menu"
            type="button"
            aria-label={t('nav.openMenu')}
            onClick={() => setMenuOpen(true)}
          >
            <Menu aria-hidden="true" />
          </button>
          <div className="topbar__context">
            <BookOpen size={16} aria-hidden="true" />
            <span>{currentTitle}</span>
          </div>
          <div className="topbar__actions">
            <span className="status-pill">
              <span className="status-dot status-dot--online" />
              {t('app.privacy')}
            </span>
            <button
              className="icon-button"
              type="button"
              aria-label={t(theme === 'dark' ? 'settings.light' : 'settings.dark')}
              onClick={() => void toggleTheme()}
            >
              {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </button>
          </div>
        </header>
        <main id="main-content" className="content" tabIndex={-1}>
          <Suspense
            fallback={
              <div className="page-loading" role="status">
                {t('common.loading')}
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/tanks" element={<TanksPage />} />
              <Route path="/water" element={<WaterPage />} />
              <Route path="/breeding" element={<BreedingPage />} />
              <Route path="/care" element={<CarePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<DashboardPage />} />
            </Routes>
          </Suspense>
        </main>
        <nav className="mobile-nav" aria-label={t('nav.mobileNav')}>
          {navigation.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? 'mobile-nav__link mobile-nav__link--active' : 'mobile-nav__link'
              }
              end={to === '/'}
            >
              <Icon size={18} aria-hidden={true} />
              <span>{t(`nav.${key}`)}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <UpdatePrompt />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <HashRouter>
          <ThemeSync />
          <Shell />
        </HashRouter>
      </AppProvider>
    </ToastProvider>
  );
}
