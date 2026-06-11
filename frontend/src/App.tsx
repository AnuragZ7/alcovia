import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { FocusSessions } from './pages/FocusSessions';
import { Subjects } from './pages/Subjects';
import { Tasks } from './pages/Tasks';
import { DevPanel } from './pages/DevPanel';

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/focus" element={<FocusSessions />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/dev" element={<DevPanel />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
