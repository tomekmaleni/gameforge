import React, { useState } from 'react';
import { Toaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from '@/lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

import Projects from '@/pages/Projects';
import ProjectLayout from '@/components/layout/ProjectLayout';
import ProjectOverview from '@/pages/ProjectOverview';
import Folders from '@/pages/Folders';
import FolderView from '@/pages/FolderView';
import GameDatabase from '@/pages/GameDatabase';
import MediaLibrary from '@/pages/MediaLibrary';
import LoreWiki from '@/pages/LoreWiki';
import IdeaBacklog from '@/pages/IdeaBacklog';
import Tasks from '@/pages/Tasks';
import ProjectSearch from '@/pages/ProjectSearch';
import Members from '@/pages/Members';
import TrashCan from '@/pages/TrashCan';
import Mechanics from '@/pages/Mechanics';
import Playtesting from '@/pages/Playtesting';
import DesignVotes from '@/pages/DesignVotes';

import { Gamepad2 } from 'lucide-react';

function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;
    setLoading(true);
    try {
      await login(email.trim(), name.trim());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
            <Gamepad2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Board Game Studio</h1>
          <p className="text-slate-400 mt-2">Sign in to start collaborating</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
          />
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
          />
          <button
            type="submit"
            disabled={!email.trim() || !name.trim() || loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Continue'}
          </button>
        </form>
        <p className="text-xs text-slate-600 text-center mt-4">No password needed — just your name and email</p>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (authError) {
    return <LoginScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Projects" replace />} />
      <Route path="/Projects" element={<Projects />} />
      <Route path="/project/:projectId" element={<ProjectLayout />}>
        <Route index element={<ProjectOverview />} />
        <Route path="folders" element={<Folders />} />
        <Route path="folders/:folderId" element={<FolderView />} />
        <Route path="database" element={<GameDatabase />} />
        <Route path="media" element={<MediaLibrary />} />
        <Route path="wiki" element={<LoreWiki />} />
        <Route path="ideas" element={<IdeaBacklog />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="search" element={<ProjectSearch />} />
        <Route path="members" element={<Members />} />
        <Route path="trash" element={<TrashCan />} />
        <Route path="mechanics" element={<Mechanics />} />
        <Route path="playtesting" element={<Playtesting />} />
        <Route path="design-votes" element={<DesignVotes />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background: 'rgb(15 23 42)', border: '1px solid rgb(30 41 59)', color: 'rgb(226 232 240)' },
          }}
        />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
