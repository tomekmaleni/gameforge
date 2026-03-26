import React from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@/components/hooks/useProject';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Copy, Shield, Pencil, Eye, UserX, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: Shield, color: 'bg-amber-500/20 text-amber-400 border-amber-600' },
  editor: { label: 'Editor', icon: Pencil, color: 'bg-blue-500/20 text-blue-400 border-blue-600' },
  viewer: { label: 'Viewer', icon: Eye, color: 'bg-slate-500/20 text-slate-400 border-slate-600' },
};

export default function Members() {
  const { projectId } = useParams();
  const { project, isAdmin, user } = useProject();
  const qc = useQueryClient();

  const { data: members = [] } = useQuery({ queryKey: ['members', projectId], queryFn: () => base44.entities.ProjectMember.filter({ project_id: projectId }), enabled: !!projectId });

  const updateRole = useMutation({
    mutationFn: ({ memberId, role }) => base44.entities.ProjectMember.update(memberId, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', projectId] }); toast.success('Role updated'); },
  });

  const removeMember = useMutation({
    mutationFn: (memberId) => base44.entities.ProjectMember.delete(memberId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', projectId] }); toast.success('Member removed'); },
  });

  const copyInviteCode = () => { if (project?.invite_code) { navigator.clipboard.writeText(project.invite_code); toast.success('Invite code copied!'); } };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6"><h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-amber-400" /> Members</h1></div>
      {isAdmin && project?.invite_code && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
          <p className="text-sm text-slate-400 mb-2">Share this invite code with your friends:</p>
          <div className="flex items-center gap-3">
            <code className="text-2xl font-mono font-bold text-amber-400 tracking-widest">{project.invite_code}</code>
            <Button variant="ghost" size="icon" onClick={copyInviteCode} className="text-slate-400"><Copy className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {members.map(member => {
          const config = ROLE_CONFIG[member.role] || ROLE_CONFIG.viewer;
          const RoleIcon = config.icon;
          const isMe = member.user_email === user?.email;
          return (
            <div key={member.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-sm font-semibold">{(member.user_name || member.user_email)?.[0]?.toUpperCase()}</div>
                <div><p className="font-medium text-sm">{member.user_name || member.user_email}{isMe && <span className="text-xs text-slate-500 ml-2">(you)</span>}</p><p className="text-xs text-slate-500">{member.user_email}</p></div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && !isMe ? (
                  <>
                    <Select value={member.role} onValueChange={(role) => updateRole.mutate({ memberId: member.id, role })}>
                      <SelectTrigger className="w-28 bg-slate-800 border-slate-700 text-sm h-8"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="admin">Admin</SelectItem><SelectItem value="editor">Editor</SelectItem><SelectItem value="viewer">Viewer</SelectItem></SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-400" onClick={() => { if (confirm(`Remove ${member.user_name || member.user_email}?`)) removeMember.mutate(member.id); }}><UserX className="w-4 h-4" /></Button>
                  </>
                ) : (<Badge variant="outline" className={`${config.color} gap-1`}><RoleIcon className="w-3 h-3" /> {config.label}</Badge>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
