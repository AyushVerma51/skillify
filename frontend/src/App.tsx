import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import BackendStatusNotice from './components/BackendStatusNotice';
import ChatBotPopup from './components/ChatBotPopUp';
import Footer from './components/Footer';
import Header from './components/Header';
import { WorkspaceProvider } from './context/WorkspaceContext';
import AboutUs from './pages/AboutUs';
import CareerStudio from './pages/CareerStudio';
import Home from './pages/Home';

function App() {
  return (
    <WorkspaceProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="flex min-h-screen flex-col bg-sk-paper">
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/studio" element={<CareerStudio />} />
              <Route path="/about" element={<AboutUs />} />

              <Route path="/services" element={<LegacyToolRedirect tool="discover" />} />
              <Route path="/assessment" element={<LegacyToolRedirect tool="discover" />} />
              <Route path="/job-market" element={<LegacyToolRedirect tool="market" />} />
              <Route path="/roadmap" element={<LegacyToolRedirect tool="roadmap" />} />
              <Route path="/courses" element={<LegacyToolRedirect tool="learn" />} />
              <Route path="/mock-interview" element={<LegacyToolRedirect tool="practice" />} />
              <Route path="/chatbot" element={<LegacyToolRedirect tool="discover" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
          <ChatBotPopup />
          <BackendStatusNotice />
        </div>
      </Router>
    </WorkspaceProvider>
  );
}

function LegacyToolRedirect({ tool }: { tool: string }) {
  const location = useLocation();
  const existing = new URLSearchParams(location.search);
  existing.set('tool', tool);
  return <Navigate to={`/studio?${existing.toString()}`} replace />;
}

export default App;
