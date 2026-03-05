import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useParams, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastProvider, useToast } from "./components/ui/Toast";
import { SettingsService } from "./services/settingsService";
import { Loader2, LogOut, ExternalLink } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { UserService } from './services/userService';
import { NotificationProvider } from './contexts/NotificationContext';
import { DEFAULT_SETTINGS } from './lib/defaultSettings';

// Lazy Load Components
const LoginPage = lazy(() => import('./components/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./components/auth/SignupPage').then(m => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import('./components/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const LandingPage = lazy(() => import('./components/public/LandingPage').then(m => ({ default: m.LandingPage })));

const SmartPricing = lazy(() => import("./components/calculators/SmartPricing").then(m => ({ default: m.SmartPricing })));
const MassPricing = lazy(() => import("./components/calculators/MassPricing").then(m => ({ default: m.MassPricing })));
const ReversePricing = lazy(() => import("./components/calculators/ReversePricing").then(m => ({ default: m.ReversePricing })));
const ImportPricing = lazy(() => import("./components/calculators/ImportPricing").then(m => ({ default: m.ImportPricing })));
const SettingsPanel = lazy(() => import("./components/admin/settings/SettingsPanel").then(m => ({ default: m.SettingsPanel })));
const ProfilePage = lazy(() => import("./components/admin/profile/ProfilePage").then(m => ({ default: m.ProfilePage })));
const ProposalPage = lazy(() => import("./components/tools/ProposalPage").then(m => ({ default: m.ProposalPage })));
const HistoryPage = lazy(() => import("./components/tools/HistoryPage").then(m => ({ default: m.HistoryPage })));
const SalesReports = lazy(() => import("./components/tools/SalesReports").then(m => ({ default: m.SalesReports })));
const StockPage = lazy(() => import("./components/tools/StockPage").then(m => ({ default: m.StockPage || m.default })));
const ClientsPage = lazy(() => import("./components/tools/ClientsPage").then(m => ({ default: m.ClientsPage })));
const MarketingPage = lazy(() => import("./components/tools/MarketingPage").then(m => ({ default: m.MarketingPage })));
const InboxPage = lazy(() => import("./components/tools/InboxPage").then(m => ({ default: m.InboxPage })));
const PublicProposal = lazy(() => import("./components/public/PublicProposal").then(m => ({ default: m.PublicProposal })));
const PublicCatalog = lazy(() => import("./components/public/PublicCatalog").then(m => ({ default: m.PublicCatalog })));
const PublicTracking = lazy(() => import("./components/public/PublicTracking").then(m => ({ default: m.PublicTracking })));
const TVMode = lazy(() => import("./components/public/TVMode").then(m => ({ default: m.TVMode })));
const TaxReconciliation = lazy(() => import("./components/calculators/TaxReconciliation").then(m => ({ default: m.TaxReconciliation })));
const ReceivablesPage = lazy(() => import("./components/tools/ReceivablesPage").then(m => ({ default: m.ReceivablesPage })));
const PayablesPage = lazy(() => import("./components/tools/PayablesPage").then(m => ({ default: m.PayablesPage })));
const AutomationsPage = lazy(() => import("./components/tools/AutomationsPage").then(m => ({ default: m.AutomationsPage })));
const QuickPOS = lazy(() => import("./components/tools/QuickPOS").then(m => ({ default: m.QuickPOS })));
const SmartSale = lazy(() => import("./components/tools/SmartSale").then(m => ({ default: m.SmartSale })));
const TeamPage = lazy(() => import("./components/tools/TeamPage").then(m => ({ default: m.TeamPage })));
const OrdersPage = lazy(() => import("./components/tools/OrdersPage").then(m => ({ default: m.OrdersPage })));
const CashFlowPage = lazy(() => import("./components/tools/CashFlowPage").then(m => ({ default: m.CashFlowPage })));
const InternalRequests = lazy(() => import("./components/tools/InternalRequests").then(m => ({ default: m.InternalRequests })));
const PurchasesPage = lazy(() => import("./components/tools/PurchasesPage").then(m => ({ default: m.PurchasesPage })));
const DREPage = lazy(() => import("./components/tools/DREPage").then(m => ({ default: m.DREPage })));
const TermsManager = lazy(() => import("./components/tools/TermsManager").then(m => ({ default: m.TermsManager })));
const TechLab = lazy(() => import("./components/tools/TechLabModern").then(m => ({ default: m.TechLabModern })));
const WikiPage = lazy(() => import("./components/tools/WikiPage").then(m => ({ default: m.WikiPage })));
const DashboardPage = lazy(() => import('./components/tools/DashboardModern').then(m => ({ default: m.DashboardModern })));

// --- Guards & Wrappers ---

function InAppBrowserGuard({ children }) {
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isInstagram = ua.indexOf('Instagram') > -1;
    const isFacebook = ua.indexOf('FBAN') > -1 || ua.indexOf('FBAV') > -1;
    const isLinkedIn = ua.indexOf('LinkedIn') > -1;

    if (isInstagram || isFacebook || isLinkedIn) {
      setIsInAppBrowser(true);
    }
  }, []);

  if (isInAppBrowser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-indigo-500/10 text-indigo-500 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
          <ExternalLink className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2 max-w-xs mx-auto">Navegador Não Suportado</h2>
        <p className="text-slate-400 font-medium mb-8 max-w-xs mx-auto text-sm leading-relaxed">
          Para garantir a segurança e o funcionamento correto do sistema, por favor abra no navegador nativo.
        </p>
        <button onClick={() => window.location.reload()} className="mt-8 text-xs font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-400 transition-colors">
          Tentar carregar assim mesmo
        </button>
      </div>
    );
  }
  return children;
}

function SubscriptionGuard({ userProfile, onLogout, children }) {
  const trialStartDate = userProfile?.trialStartDate || userProfile?.createdAt;
  const status = userProfile?.subscriptionStatus || 'trial';
  const role = userProfile?.role || 'user';

  const isOwner = role === 'owner';
  const isStaff = role === 'admin' || role === 'seller';
  const isTrialExpired = !isOwner && !isStaff && status === 'trial' && trialStartDate && (
    (Date.now() - new Date(trialStartDate).getTime()) > (7 * 24 * 60 * 60 * 1000)
  );
  const shouldBlock = (status === 'expired' && !isOwner) || isTrialExpired;

  if (shouldBlock) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />
          <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <LogOut className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">Período de Teste Encerrado</h2>
          <p className="text-slate-400 font-medium mb-10 leading-relaxed">
            Seus 7 dias gratuitos chegaram ao fim. Para continuar escalando sua loja com o Phone Smart, escolha seu plano.
          </p>
          <button
            onClick={() => window.open('https://checkout.phonesmart.com.br', '_blank')}
            className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-50 transition-all mb-4"
          >
            Assinar Plano Pro
          </button>
          <button onClick={onLogout} className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Sair da Conta</button>
        </div>
      </div>
    );
  }
  return children;
}

function LegacyQueryHandler({ children }) {
  const [searchParams] = useSearchParams();
  const p = searchParams.get('p');
  const c = searchParams.get('c');
  const tv = searchParams.get('tv') || searchParams.get('v');
  const s = searchParams.get('s');

  if (p && !c) return <Navigate to={`/public/proposal/${p}`} replace />;
  if (c) return <Navigate to={`/public/catalog/${c}?product=${p || ''}&s=${s || ''}`} replace />;
  if (tv) return <Navigate to={`/public/tv/${tv}`} replace />;

  return children || null;
}

function PublicProposalRoute() {
  const { id } = useParams();
  return <PublicProposal proposalId={id} />;
}

function PublicCatalogRoute() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  return <PublicCatalog organizationId={id} sellerId={searchParams.get('s')} />;
}



function TVModeRoute() {
  const { id } = useParams();
  return <TVMode organizationId={id} />;
}


// --- Main App Component ---

function AppContent() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [appSettings, setAppSettings] = useState(DEFAULT_SETTINGS);
  const [authChecking, setAuthChecking] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_dark_mode');
      return saved !== null ? saved === 'true' : true;
    } catch { return true; }
  });
  const [isSalesMode, setIsSalesMode] = useState(false);

  // Listen to Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const profile = await UserService.getProfile(u.uid);
          setUserProfile(profile);
          const targetId = profile?.organizationId || u.uid;
          const savedSettings = await SettingsService.loadSettings(targetId);
          if (savedSettings) setAppSettings({ ...DEFAULT_SETTINGS, ...savedSettings });

          if (savedSettings?.company?.name) document.title = savedSettings.company.name;

          // Log login once per session
          if (!sessionStorage.getItem('erp_logged_in_session')) {
            UserService.logLogin(u.uid, profile);
            sessionStorage.setItem('erp_logged_in_session', 'true');
          }
        } catch (e) { console.error(e); }
      } else {
        setUserProfile(null);
        document.title = 'Phone Smart | Gestão Inteligente';
      }
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try { localStorage.setItem('erp_dark_mode', darkMode); } catch (e) { }
  }, [darkMode]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (authChecking) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>}>
      <LegacyQueryHandler>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
          <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/dashboard" />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Public Tool Routes */}
          <Route path="/public/proposal/:id" element={<PublicProposalRoute />} />
          <Route path="/public/catalog/:id" element={<PublicCatalogRoute />} />
          <Route path="/public/tv/:id" element={<TVModeRoute />} />
          <Route path="/track/:id" element={<PublicTracking />} />

          {/* Dashboard / Protected Routes */}
          <Route
            path="/dashboard"
            element={
              user ? (
                <InAppBrowserGuard>
                  <SubscriptionGuard userProfile={userProfile} onLogout={handleLogout}>
                    <DashboardLayout
                      user={user}
                      userProfile={userProfile}
                      settings={appSettings}
                      isSalesMode={isSalesMode}
                      onToggleSalesMode={() => setIsSalesMode(!isSalesMode)}
                      onLogout={handleLogout}
                      darkMode={darkMode}
                      onToggleDarkMode={() => setDarkMode(!darkMode)}
                    // Additional props can be passed here or via Contexts
                    />
                  </SubscriptionGuard>
                </InAppBrowserGuard>
              ) : (
                <Navigate to="/login" />
              )
            }
          >
            <Route index element={<DashboardPage user={user} userProfile={userProfile} settings={appSettings} darkMode={darkMode} />} />

            {/* Tools */}
            <Route path="stock" element={<StockPage user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="smart" element={<SmartPricing settings={appSettings} />} />
            <Route path="proposals" element={<ProposalPage user={user} settings={appSettings} />} />
            <Route path="pos" element={<QuickPOS user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="checkout" element={<SmartSale user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="orders" element={<OrdersPage user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="inbox" element={<InboxPage user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="ocr" element={<MassPricing settings={appSettings} />} />
            <Route path="import" element={<ImportPricing user={user} userProfile={userProfile} settings={appSettings} isSalesMode={isSalesMode} />} />
            <Route path="marketing" element={<MarketingPage user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="audit" element={<TaxReconciliation settings={appSettings} />} />
            <Route path="reverse" element={<ReversePricing user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="lab" element={<TechLab user={user} userProfile={userProfile} settings={appSettings} darkMode={darkMode} />} />
            <Route path="purchases" element={<PurchasesPage user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="clients" element={<ClientsPage user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="reports" element={<SalesReports user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="dre" element={<DREPage user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="cashflow" element={<CashFlowPage user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="receivables" element={<ReceivablesPage user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="payables" element={<PayablesPage user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="automations" element={<AutomationsPage user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="requests" element={<InternalRequests user={user} userProfile={userProfile} />} />
            <Route path="team" element={<TeamPage user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="wiki" element={<WikiPage user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="terms" element={<TermsManager user={user} userProfile={userProfile} settings={appSettings} />} />
            <Route path="history" element={<HistoryPage user={user} userProfile={userProfile} settings={appSettings} />} />

            <Route path="settings" element={<SettingsPanel user={user} userProfile={userProfile} settings={appSettings} onSave={async (newSettings) => {
              const targetId = userProfile?.organizationId || user?.uid;
              await SettingsService.saveSettings(newSettings, targetId);
              setAppSettings(newSettings);
            }} />} />
            <Route path="profile" element={<ProfilePage
              user={user}
              userProfile={userProfile}
              settings={appSettings}
              onSave={async (newSettings) => {
                const targetId = userProfile?.organizationId || user?.uid;
                await SettingsService.saveSettings(newSettings, targetId);
                setAppSettings(newSettings);
              }}
              onProfileUpdate={async () => {
                const profile = await UserService.getProfile(user.uid);
                setUserProfile(profile);
              }}
            />} />
          </Route>

          {/* Root Route */}
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage onGetStarted={(view) => navigate('/' + view)} />} />

          {/* Catch All */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </LegacyQueryHandler>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </ToastProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}
