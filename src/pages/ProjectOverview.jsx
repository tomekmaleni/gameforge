import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '@/components/hooks/useProject';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FolderOpen, Database, BookOpen, Lightbulb, CheckSquare, Image, Users, Clock } from 'lucide-react';

export default function ProjectOverview() {
  const { projectId } = useParams();
  const { project, role, isLoading } = useProject();

  const { data: folders = [] } = useQuery({ queryKey: ['folders', projectId], queryFn: () => base44.entities.Folder.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: entries = [] } = useQuery({ queryKey: ['entries-count', projectId], queryFn: () => base44.entities.GameEntry.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: media = [] } = useQuery({ queryKey: ['media-count', projectId], queryFn: () => base44.entities.MediaItem.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: pages = [] } = useQuery({ queryKey: ['wiki-count', projectId], queryFn: () => base44.entities.LorePage.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: ideas = [] } = useQuery({ queryKey: ['ideas-count', projectId], queryFn: () => base44.entities.Idea.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks-count', projectId], queryFn: () => base44.entities.Task.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: members = [] } = useQuery({ queryKey: ['members-count', projectId], queryFn: () => base44.entities.ProjectMember.filter({ project_id: projectId }), enabled: !!projectId });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;

  const stats = [
    { icon: FolderOpen, label: 'Folders', count: folders.length, path: 'folders', color: 'from-blue-500 to-cyan-500' },
    { icon: Database, label: 'Database Entries', count: entries.length, path: 'database', color: 'from-violet-500 to-purple-500' },
    { icon: Image, label: 'Media Files', count: media.length, path: 'media', color: 'from-pink-500 to-rose-500' },
    { icon: BookOpen, label: 'Wiki Pages', count: pages.length, path: 'wiki', color: 'from-emerald-500 to-green-500' },
    { icon: Lightbulb, label: 'Ideas', count: ideas.length, path: 'ideas', color: 'from-amber-500 to-yellow-500' },
    { icon: CheckSquare, label: 'Tasks', count: tasks.length, path: 'tasks', color: 'from-sky-500 to-blue-500' },
    { icon: Users, label: 'Members', count: members.length, path: 'members', color: 'from-orange-500 to-red-500' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">{project?.name}</h1>
        <p className="text-slate-400">{project?.description || 'Your collaborative board game workspace'}</p>
        {project?.invite_code && (
          <div className="mt-3 inline-flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5">
            <span className="text-xs text-slate-500">Invite Code:</span>
            <span className="text-sm font-mono font-semibold text-amber-400 tracking-widest">{project.invite_code}</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map(({ icon: Icon, label, count, path, color }) => (
          <Link key={path} to={`/project/${projectId}/${path}`} className="group bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} bg-opacity-20 flex items-center justify-center mb-3`}><Icon className="w-4 h-4 text-white" /></div>
            <p className="text-2xl font-bold mb-0.5">{count}</p>
            <p className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">{label}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4"><Clock className="w-4 h-4 text-slate-500" /><h2 className="font-semibold">Recent Activity</h2></div>
        <p className="text-sm text-slate-500">Start adding content to see activity here.</p>
      </div>
    </div>
  );
}
