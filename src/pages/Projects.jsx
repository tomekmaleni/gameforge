import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Gamepad2, Plus, Users, ArrowRight, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function Projects() {
  const [user, setUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['my-memberships', user?.email],
    queryFn: () => base44.entities.ProjectMember.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  const projectIds = memberships.map(m => m.project_id);

  const { data: projects = [] } = useQuery({
    queryKey: ['my-projects', projectIds],
    queryFn: async () => {
      if (!projectIds.length) return [];
      const all = await base44.entities.Project.list();
      return all.filter(p => projectIds.includes(p.id));
    },
    enabled: projectIds.length > 0,
  });

  const createProject = useMutation({
    mutationFn: async () => {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const project = await base44.entities.Project.create({
        name: newName, description: newDesc, invite_code: code, owner_email: user.email,
      });
      await base44.entities.ProjectMember.create({
        project_id: project.id, user_email: user.email, user_name: user.full_name || user.email, role: 'admin',
      });
      const defaultFolders = ['Characters', 'Items', 'Map', 'Mechanics', 'Lore', 'Art', 'Enemies', 'Playtesting'];
      await base44.entities.Folder.bulkCreate(
        defaultFolders.map((name, i) => ({ project_id: project.id, name, order: i }))
      );
      return project;
    },
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ['my-memberships'] });
      setShowCreate(false); setNewName(''); setNewDesc('');
      navigate(`/project/${project.id}`);
    },
  });

  const joinProject = useMutation({
    mutationFn: async () => {
      const allProjects = await base44.entities.Project.filter({ invite_code: joinCode.toUpperCase() });
      if (!allProjects.length) throw new Error('Invalid invite code');
      const project = allProjects[0];
      const existing = await base44.entities.ProjectMember.filter({ project_id: project.id, user_email: user.email });
      if (existing.length) throw new Error('Already a member');
      await base44.entities.ProjectMember.create({
        project_id: project.id, user_email: user.email, user_name: user.full_name || user.email, role: 'viewer',
      });
      return project;
    },
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ['my-memberships'] });
      setShowJoin(false); setJoinCode('');
      toast.success('Joined project!');
      navigate(`/project/${project.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const getMemberRole = (projectId) => memberships.find(m => m.project_id === projectId)?.role;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-slate-950 to-orange-600/5" />
        <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Board Game Studio</h1>
          </div>
          <p className="text-slate-400 text-lg max-w-xl mb-8">Design, collaborate, and build your board game with your team.</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setShowCreate(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold gap-2"><Plus className="w-4 h-4" /> New Project</Button>
            <Button variant="outline" onClick={() => setShowJoin(true)} className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2"><LogIn className="w-4 h-4" /> Join Project</Button>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 pb-16">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => (<div key={i} className="h-40 rounded-xl bg-slate-900 animate-pulse" />))}</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16"><Gamepad2 className="w-16 h-16 mx-auto text-slate-700 mb-4" /><p className="text-slate-500 text-lg">No projects yet. Create one or join with an invite code!</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <Link key={project.id} to={`/project/${project.id}`} className="group relative bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-amber-500/30 hover:bg-slate-900/80 transition-all">
                <div className="absolute top-4 right-4"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 capitalize">{getMemberRole(project.id)}</span></div>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center mb-4"><Gamepad2 className="w-5 h-5 text-amber-400" /></div>
                <h3 className="font-semibold text-lg mb-1 group-hover:text-amber-400 transition-colors">{project.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2">{project.description || 'No description'}</p>
                <div className="mt-4 flex items-center text-xs text-slate-600 gap-1"><ArrowRight className="w-3 h-3" /> Open workspace</div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle>Create New Project</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Input placeholder="Project name" value={newName} onChange={e => setNewName(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-100" />
            <Input placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-100" />
          </div>
          <DialogFooter><Button onClick={() => createProject.mutate()} disabled={!newName.trim() || createProject.isPending} className="bg-amber-500 hover:bg-amber-600 text-slate-950">{createProject.isPending ? 'Creating...' : 'Create Project'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle>Join Project</DialogTitle></DialogHeader>
          <div className="py-2"><Input placeholder="Enter invite code" value={joinCode} onChange={e => setJoinCode(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-100 uppercase tracking-widest text-center text-lg" /></div>
          <DialogFooter><Button onClick={() => joinProject.mutate()} disabled={!joinCode.trim() || joinProject.isPending} className="bg-amber-500 hover:bg-amber-600 text-slate-950">{joinProject.isPending ? 'Joining...' : 'Join'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
