import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@/components/hooks/useProject';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Cog } from 'lucide-react';
import { toast } from 'sonner';

export default function Mechanics() {
  const { projectId } = useParams();
  const { canEdit } = useProject();
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editMechanic, setEditMechanic] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [viewMechanic, setViewMechanic] = useState(null);

  const { data: mechanics = [] } = useQuery({ queryKey: ['mechanics', projectId], queryFn: () => base44.entities.Mechanic.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: entries = [] } = useQuery({ queryKey: ['entries', projectId], queryFn: () => base44.entities.GameEntry.filter({ project_id: projectId }), enabled: !!projectId });

  const getEntryCount = (mechanicId) => entries.filter(e => (e.mechanic_ids || []).includes(mechanicId)).length;

  const save = useMutation({
    mutationFn: () => { if (editMechanic) return base44.entities.Mechanic.update(editMechanic.id, { name, description }); return base44.entities.Mechanic.create({ project_id: projectId, name, description }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mechanics', projectId] }); closeDialog(); toast.success(editMechanic ? 'Mechanic updated' : 'Mechanic created'); },
  });

  const remove = useMutation({ mutationFn: (id) => base44.entities.Mechanic.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['mechanics', projectId] }); toast.success('Mechanic deleted'); } });
  const openEdit = (mechanic) => { setEditMechanic(mechanic); setName(mechanic.name); setDescription(mechanic.description || ''); setShowDialog(true); };
  const closeDialog = () => { setShowDialog(false); setEditMechanic(null); setName(''); setDescription(''); };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6"><h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Cog className="w-5 h-5 text-amber-400" /> Mechanics</h1>{canEdit && (<Button onClick={() => { closeDialog(); setShowDialog(true); }} size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 gap-2"><Plus className="w-4 h-4" /> New Mechanic</Button>)}</div>
      {mechanics.length === 0 ? (<div className="text-center py-16"><Cog className="w-16 h-16 mx-auto text-slate-700 mb-4" /><p className="text-slate-500">No mechanics yet.</p></div>) : (
        <div className="space-y-3">{mechanics.map(mechanic => { const count = getEntryCount(mechanic.id); return (<div key={mechanic.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-4 cursor-pointer hover:border-amber-500/30 transition-all" onClick={() => setViewMechanic(mechanic)}><div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center flex-shrink-0"><span className="text-xl font-bold text-amber-400">{count}</span><span className="text-xs text-slate-500 leading-none">items</span></div><div className="flex-1 min-w-0"><h3 className="font-semibold text-slate-100">{mechanic.name}</h3>{mechanic.description && <p className="text-sm text-slate-400 mt-1">{mechanic.description}</p>}</div>{canEdit && (<div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => openEdit(mechanic)}><Pencil className="w-3.5 h-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-400" onClick={() => remove.mutate(mechanic.id)}><Trash2 className="w-3.5 h-3.5" /></Button></div>)}</div>); })}</div>)}
      <Dialog open={!!viewMechanic} onOpenChange={() => setViewMechanic(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center gap-2"><Cog className="w-4 h-4 text-amber-400" />{viewMechanic?.name} — Influenced By</DialogTitle></DialogHeader>{viewMechanic && (() => { const mechanicEntries = entries.filter(e => (e.mechanic_ids || []).includes(viewMechanic.id)); if (mechanicEntries.length === 0) return <p className="text-slate-500 text-sm py-4">No game entries linked yet.</p>; return (<div className="space-y-2">{mechanicEntries.map(entry => (<div key={entry.id} className="bg-slate-800 rounded-lg p-3 flex items-center gap-3"><div className="w-10 h-10 flex-shrink-0 rounded-lg bg-slate-700 flex items-center justify-center overflow-hidden">{entry.image_url ? (<img src={entry.image_url} alt={entry.name} className="w-full h-full object-contain" />) : (<span className="text-slate-500 font-bold text-sm">{entry.name?.[0]?.toUpperCase()}</span>)}</div><div className="flex-1 min-w-0"><p className="font-medium text-sm text-slate-100">{entry.name}</p>{entry.data?.Type && (<p className="text-xs text-amber-400">{entry.data.Type}</p>)}{entry.tags?.length > 0 && (<div className="flex flex-wrap gap-1 mt-0.5">{entry.tags.map(t => (<Badge key={t} variant="outline" className="text-xs border-slate-600 text-slate-400">#{t}</Badge>))}</div>)}</div></div>))}</div>); })()}</DialogContent>
      </Dialog>
      <Dialog open={showDialog} onOpenChange={closeDialog}><DialogContent className="bg-slate-900 border-slate-800 text-slate-100"><DialogHeader><DialogTitle>{editMechanic ? 'Edit Mechanic' : 'New Mechanic'}</DialogTitle></DialogHeader><div className="space-y-3"><Input placeholder="Mechanic name (e.g. Movement, Combat...)" value={name} onChange={e => setName(e.target.value)} className="bg-slate-800 border-slate-700" /><Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="bg-slate-800 border-slate-700" /></div><DialogFooter><Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending} className="bg-amber-500 hover:bg-amber-600 text-slate-950">{editMechanic ? 'Update' : 'Create'}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
