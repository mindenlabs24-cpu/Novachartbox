import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import ChatWindow from './components/ChatWindow';
import './index.css';

function AppContent() {
  const { user } = useAuth();
  return user ? <ChatWindow /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
