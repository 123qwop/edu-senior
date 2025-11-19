import { Navigate, Route, Routes } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PwdReset from './pages/PwdReset'
import DashboardLayout from './ui/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Statistics from './pages/Statistics';
import StudySets from './pages/StudySets';
import Subjects from './pages/Subjects';
import Downloads from './pages/Downloads';
import Analytics from './pages/Analytics';
import AIRecommendations from './pages/AIRecommendations';
import Gamification from './pages/Gamification';
import Settings from './pages/Settings';
import theme from './theme';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/pwdreset" element={<PwdReset />} />
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/study-sets" element={<StudySets />} />
          <Route path="/dashboard/subjects" element={<Subjects />} />
          <Route path="/dashboard/downloads" element={<Downloads />} />
          <Route path="/dashboard/analytics" element={<Analytics />} />
          <Route path="/dashboard/ai-recommendations" element={<AIRecommendations />} />
          <Route path="/dashboard/gamification" element={<Gamification />} />
          <Route path="/dashboard/settings" element={<Settings />} />
          <Route path="/statistics" element={<Statistics />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
