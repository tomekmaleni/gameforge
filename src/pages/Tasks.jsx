import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@/components/hooks/useProject';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, CheckSquare, Pencil, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import useTrashDelete from '@/components/hooks/useTrashDelete';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';

const STATUS_CONFIG = { todo: { label: 'To Do', color: 'bg-slate-500/20 text-slate-400' }, in_progress: { label: 'In Progress', color: 'bg-amber-500/20 text-amber-400' }, done: { label: 'Done', color: 'bg-emerald-500/20 text-emerald-400' } };
const PRIORITY_CONFIG = { low: { label: 'Low', color: 'text-blue-400' }, medium: { label: 'Medium', color: 'text-amber-400' }, high: { label: 'High', color: 'text-red-400' } };

export default function Tasks() {
  const { projectId } = useParams();
  const { canEdit, user } = useProject();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [assignee, setAssignee] = useState('');

  const { data: tasks = [] } = useQuery({ queryKey: ['tasks', projectId], queryFn: () => base44.entities.Task.filter({ project_id: projectId }, '-created_date'), enabled: !!projectId });
  const { data: members = [] } = useQuery({ queryKey: ['members', projectId], queryFn: () => base44.entities.ProjectMember.filter({ project_id: projectId }), enabled: !!projectId });

  const saveTask = useMutation({
    mutationFn: () => { const member = members.find(m => m.user_email === assignee); const data = { title, description: desc, status, priority, assignee_email: assignee || undefined, assignee_name: member?.user_name || assignee || undefined }; if (editTask) return base44.entities.Task.update(editTask.id, data); return base44.entities.Task.create({ project_id: projectId, ...data }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks', projectId] }); closeForm(); toast.success(editTask ? 'Task updated' : 'Task created'); },
  });

  const { confirmDelete: confirmDeleteTask, isDeleting: isDeletingTask, pendingItem: pendingTask, handleConfirm: handleConfirmTask, handleClose: handleCloseTask } = useTrashDelete({ itemType: 'task', entityName: 'Task', invalidateKeys: [['tasks', projectId]] });
  const closeForm = () => { setShowForm(false); setEditTask(null); setTitle(''); setDesc(''); setStatus('todo'); setPriority('medium'); setAssignee(''); };
  const openEdit = (task) => { setEditTask(task); setTitle(task.title); setDesc(task.description || ''); setStatus(task.status || 'todo'); setPriority(task.priority || 'medium'); setAssignee(task.assignee_email || ''); setShowForm(true); };

  const grouped = { todo: [], in_progress: [], done: [] };
  tasks.forEach(t => { const s = t.status || 'todo'; if (grouped[s]) grouped[s].push(t); });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6"><h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><CheckSquare className="w-5 h-5 text-amber-400" /> Tasks</h1>{canEdit && (<Button onClick={() => { closeForm(); setShowForm(true); }} size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 gap-2"><Plus className="w-4 h-4" /> New Task</Button>)}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{Object.entries(STATUS_CONFIG).map(([key, { label, color }]) => (<div key={key}><div className="flex items-center gap-2 mb-3"><Badge className={color}>{label}</Badge><span className="text-xs text-slate-500">{grouped[key]?.length || 0}</span></div><div className="space-y-2">{(grouped[key] || []).map(task => (<div key={task.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 group"><div className="flex items-start justify-between"><div className="min-w-0 flex-1"><h3 className="font-medium text-sm">{task.title}</h3>{task.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>}<div className="flex items-center gap-2 mt-2"><span className={`text-xs font-medium ${PRIORITY_CONFIG[task.priority]?.color}`}>{PRIORITY_CONFIG[task.priority]?.label}</span>{task.assignee_name && (<span className="text-xs text-slate-500 flex items-center gap-1"><User className="w-3 h-3" /> {task.assignee_name}</span>)}</div></div>{canEdit && (<div className="flex gap-1 opacity-0 group-hover:opacity-100"><Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" onClick={() => openEdit(task)}><Pencil className="w-3 h-3" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-red-400" onClick={() => confirmDeleteTask(task, task.title)}><Trash2 className="w-3 h-3" /></Button></div>)}</div></div>))}</div></div>))}</div>
      <DeleteConfirmDialog open={!!pendingTask} onOpenChange={handleCloseTask} itemName={pendingTask?.name} itemType="task" onConfirm={handleConfirmTask} isLoading={isDeletingTask} />
      <Dialog open={showForm} onOpenChange={closeForm}><DialogContent className="bg-slate-900 border-slate-800 text-slate-100"><DialogHeader><DialogTitle>{editTask ? 'Edit Task' : 'New Task'}</DialogTitle></DialogHeader><div className="space-y-3"><Input placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)} className="bg-slate-800 border-slate-700" /><Textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} className="bg-slate-800 border-slate-700" /><div className="grid grid-cols-2 gap-3"><Select value={status} onValueChange={setStatus}><SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="todo">To Do</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="done">Done</SelectItem></SelectContent></Select><Select value={priority} onValueChange={setPriority}><SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div><Select value={assignee} onValueChange={setAssignee}><SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue placeholder="Assign to..." /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="">Unassigned</SelectItem>{members.map(m => (<SelectItem key={m.id} value={m.user_email}>{m.user_name || m.user_email}</SelectItem>))}</SelectContent></Select></div><DialogFooter><Button onClick={() => saveTask.mutate()} disabled={!title.trim()} className="bg-amber-500 hover:bg-amber-600 text-slate-950">{editTask ? 'Update' : 'Create'}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
