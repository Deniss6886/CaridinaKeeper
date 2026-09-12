import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ErrorInfo,
  type ReactNode
} from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Beaker,
  BookOpen,
  CheckSquare,
  ChevronRight,
  CircleHelp,
  Droplets,
  Moon,
  Settings,
  Shrimp,
  Sun,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';
import packageJson from '../package.json';
import { ToastProvider, useToast } from './components/ui/Toast';
import { AppProvider, useApp } from './store/AppContext';

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

class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error(error, info.componentStack);
  }

  render() {
    return this.state.failed ? <CrashFallback /> : this.props.children;
  }
}

function CrashFallback() {
  const { t } = useTranslation();
  return (
    <main className="fatal-error" role="alert">
      <h1>{t('errors.renderTitle')}</h1>
      <p>{t('errors.renderBody')}</p>
      <button className="button" type="button" onClick={() => window.location.reload()}>
        {t('common.reload')}
      </button>
    </main>
  );
}

function UpdatePrompt() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onOfflineReady() {
      notify(t('app.offlineReady'));
    },
    onRegisteredSW(_url, nextRegistration) {
      if (nextRegistration) setRegistration(nextRegistration);
    },
    onRegisterError() {
      notify(t('app.offlineError'), 'error');
    }
  });

  useEffect(() => {
    if (!registration) return;
    const check = () => {
      if (navigator.onLine) void registration.update();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    const interval = window.setInterval(check, 60 * 60 * 1000);
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', check);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [registration]);

  if (!needRefresh) return null;
  const applyUpdate = () => {
    if (window.confirm(t('app.updateConfirm'))) void updateServiceWorker(true);
  };
  return (
    <div className="update-banner" role="status">
      <span>{t('app.updateReady')}</span>
      <button className="button button--small" type="button" onClick={applyUpdate}>
        {t('app.update')}
      </button>
      <button
        className="button button--ghost button--small"
        type="button"
        onClick={() => setNeedRefresh(false)}
      >
        {t('app.later')}
      </button>
    </div>
  );
}

function ThemeSync() {
  const { settings } = useApp();
  const { i18n } = useTranslation();
  const locale = settings[0]?.locale ?? 'en';
  const theme = settings[0]?.theme ?? 'system';
  const reducedMotion = settings[0]?.reducedMotion ?? false;

  useEffect(() => {
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
  }, [i18n, locale]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === 'system' ? (query.matches ? 'dark' : 'light') : theme;
    };
    apply();
    if (theme !== 'system') return;
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-reduced-motion', reducedMotion);
  }, [reducedMotion]);

  return null;
}

function Shell() {
  const { t } = useTranslation();
  const { settings, updateSettings, loading, error } = useApp();
  const location = useLocation();
  const [online, setOnline] = useState(() => navigator.onLine);
  const { notify } = useToast();
  const locale = settings[0]?.locale ?? 'en';
  const theme = settings[0]?.theme ?? 'system';
  const currentTitle = useMemo(() => {
    const item = navigation.find((entry) => entry.to === location.pathname);
    return item ? t(`nav.${item.key}`) : t('app.name');
  }, [location.pathname, t]);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      notify(t('app.online'));
    };
    const onOffline = () => {
      setOnline(false);
      notify(t('app.offline'));
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [notify, t]);

  const toggleTheme = async () => {
    const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentlyDark = theme === 'dark' || (theme === 'system' && systemIsDark);
    await updateSettings({ theme: currentlyDark ? 'light' : 'dark' });
  };

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        {t('common.skipToContent')}
      </a>
      <aside className="sidebar" aria-label={t('nav.primaryNav')}>
        <div className="brand-lockup">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="36" height="36" />
          <div>
            <strong>{t('app.name')}</strong>
            <span>{t('app.privacy')}</span>
          </div>
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
          <span className="version-label">
            v{packageJson.version} · {locale.toUpperCase()}
          </span>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar__context">
            <BookOpen size={16} aria-hidden="true" />
            <span>{currentTitle}</span>
          </div>
          <div className="topbar__actions">
            <span className={`status-pill ${online ? '' : 'status-pill--offline'}`}>
              {online ? (
                <Wifi size={14} aria-hidden="true" />
              ) : (
                <WifiOff size={14} aria-hidden="true" />
              )}
              {t(online ? 'app.online' : 'app.offline')}
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
          {error ? (
            <div className="notice notice--danger global-error" role="alert">
              {t(error)}
            </div>
          ) : null}
          {loading ? (
            <div className="page-loading" role="status">
              {t('common.loading')}
            </div>
          ) : (
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
          )}
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
    <AppErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <HashRouter>
            <ThemeSync />
            <Shell />
          </HashRouter>
        </AppProvider>
      </ToastProvider>
    </AppErrorBoundary>
  );
}
