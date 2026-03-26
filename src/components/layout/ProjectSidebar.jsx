import React from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useProject } from '../hooks/useProject';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FolderOpen, Database, BookOpen, Lightbulb, CheckSquare, Image, Search, X, Gamepad2, Users, Trash2, Cog, ClipboardList, Layers } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const NAV_ITEMS = [
  { path: '', icon: Gamepad2, label: 'Overview' },
  { path: '/folders', icon: FolderOpen, label: 'Folders' },
  { path: '/database', icon: Database, label: 'Game Database' },
  { path: '/media', icon: Image, label: 'Media Library' },
  { path: '/wiki', icon: BookOpen, label: 'Lore Wiki' },
  { path: '/ideas', icon: Lightbulb, label: 'Idea Backlog' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/mechanics', icon: Cog, label: 'Mechanics' },
  { path: '/playtesting', icon: ClipboardList, label: 'Playtesting' },
  { path: '/design-votes', icon: Layers, label: 'Design Votes' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/members', icon: Users, label: 'Members' },
  { path: '/trash', icon: Trash2, label: 'Trash' },
];

export default function ProjectSidebar({ onClose }) {
  const { projectId } = useParams();
  const location = useLocation();
  const { project, role } = useProject();

  const { data: folders = [] } = useQuery({
    queryKey: ['folders', projectId],
    queryFn: () => base44.entities.Folder.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const basePath = `/project/${projectId}`;
  const isActive = (path) => {
    if (path === '') return location.pathname === basePath || location.pathname === basePath + '/';
    return location.pathname.startsWith(basePath + path);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <Link to="/Projects" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Gamepad2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">{project?.name || 'Loading...'}</p>
            <p className="text-xs text-slate-500 capitalize">{role}</p>
          </div>
        </Link>
        <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
      </div>
      <ScrollArea className="flex-1">
        <nav className="p-3 space-y-0.5">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
            <Link key={path} to={`${basePath}${path}`} onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive(path) ? 'bg-amber-500/10 text-amber-400 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
              <Icon className="w-4 h-4 flex-shrink-0" /><span>{label}</span>
            </Link>
          ))}
        </nav>
        {folders.length > 0 && (
          <div className="px-3 pb-3">
            <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Folders</p>
            <div className="space-y-0.5">
              {folders.slice(0, 10).map(folder => (
                <Link key={folder.id} to={`${basePath}/folders/${folder.id}`} onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-all ${location.pathname.includes(folder.id) ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'}`}>
                  <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{folder.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
