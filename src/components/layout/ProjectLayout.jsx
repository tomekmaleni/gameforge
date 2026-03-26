import React, { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { ProjectProvider } from '../hooks/useProject';
import ProjectSidebar from './ProjectSidebar';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProjectLayout() {
  const { projectId } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProjectProvider projectId={projectId}>
      <div className="h-screen flex bg-slate-950 text-slate-100 overflow-hidden">
        {sidebarOpen && (<div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />)}
        <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <ProjectSidebar onClose={() => setSidebarOpen(false)} />
        </aside>
        <main className="flex-1 flex flex-col min-w-0">
          <div className="lg:hidden flex items-center gap-3 p-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="text-slate-300"><Menu className="w-5 h-5" /></Button>
            <span className="text-sm font-medium text-slate-300">Board Game Studio</span>
          </div>
          <div className="flex-1 overflow-y-auto"><Outlet /></div>
        </main>
      </div>
    </ProjectProvider>
  );
}
