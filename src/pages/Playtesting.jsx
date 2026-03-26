import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@/components/hooks/useProject';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, ClipboardList, CheckCircle2, AlertCircle, Users, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Playtesting() {
  const { projectId } = useParams();
  const { canEdit } = useProject();
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);
  const [sessionDate, setSessionDate] = useState('');
  const [players, setPlayers] = useState('');
  const [notes, setNotes] = useState('');
  const [whatWorked, setWhatWorked] = useState('');
  const [whatNeedsWork, setWhatNeedsWork] = useState('');

  const { data: sessions = [] } = useQuery({ queryKey: ['playtesting', projectId], queryFn: () => base44.entities.PlaytestSession.filter({ project_id: projectId }, '-session_date'), enabled: !!projectId });

  const logSession = useMutation({
    mutationFn: async () => {
      const session = await base44.entities.PlaytestSession.create({ project_id: projectId, session_date: sessionDate, players, notes, what_worked: whatWorked, what_needs_work: whatNeedsWork });
      const issues = whatNeedsWork.split('\n').map(l => l.trim()).filter(Boolean);
      for (const issue of issues) { await base44.entities.Task.create({ project_id: projectId, title: issue, description: `From playtesting session on ${sessionDate}${players ? ` (players: ${players})` : ''}`, status: 'todo', priority: 'medium', tags: ['playtesting'] }); }
      return session;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['playtesting', projectId] }); qc.invalidateQueries({ queryKey: ['tasks', projectId] }); closeDialog(); toast.success('Session logged! Tasks created from issues.'); },
  });

  const closeDialog = () => { setShowDialog(false); setSessionDate(''); setPlayers(''); setNotes(''); setWhatWorked(''); setWhatNeedsWork(''); };
  const toggleExpand = (id) => setExpandedSession(prev => prev === id ? null : id);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6"><h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><ClipboardList className="w-5 h-5 text-amber-400" /> Playtesting</h1>{canEdit && (<Button onClick={() => setShowDialog(true)} size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 gap-2"><Plus className="w-4 h-4" /> Log Session</Button>)}</div>
      {sessions.length === 0 ? (<div className="text-center py-16"><ClipboardList className="w-16 h-16 mx-auto text-slate-700 mb-4" /><p className="text-slate-500">No playtesting sessions yet.</p></div>) : (
        <div className="space-y-3">{sessions.map(session => { const isExpanded = expandedSession === session.id; const issueCount = session.what_needs_work?.split('\n').filter(l => l.trim()).length || 0; return (<div key={session.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"><button onClick={() => toggleExpand(session.id)} className="w-full text-left p-4 flex items-start gap-4"><div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-3 mb-1"><span className="flex items-center gap-1.5 text-sm font-semibold text-slate-100"><Calendar className="w-4 h-4 text-amber-400" />{session.session_date ? format(new Date(session.session_date + 'T00:00:00'), 'MMMM d, yyyy') : 'Unknown'}</span>{session.players && (<span className="flex items-center gap-1 text-xs text-slate-400"><Users className="w-3.5 h-3.5" /> {session.players}</span>)}</div><div className="flex gap-3">{session.what_worked && (<span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" />{session.what_worked.split('\n').filter(l => l.trim()).length} worked</span>)}{issueCount > 0 && (<span className="flex items-center gap-1 text-xs text-red-400"><AlertCircle className="w-3.5 h-3.5" />{issueCount} issue{issueCount !== 1 ? 's' : ''}</span>)}</div></div>{isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0 mt-1" />}</button>{isExpanded && (<div className="px-4 pb-4 space-y-4 border-t border-slate-800 pt-4">{session.notes && (<div><p className="text-xs text-slate-500 uppercase tracking-wider mb-2">General Notes</p><p className="text-sm text-slate-300 whitespace-pre-wrap">{session.notes}</p></div>)}{session.what_worked && (<div><p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> What Worked Well</p><div className="bg-emerald-950/30 border border-emerald-800/30 rounded-lg p-3">{session.what_worked.split('\n').filter(l => l.trim()).map((line, i) => (<p key={i} className="text-sm text-emerald-300 py-0.5">• {line}</p>))}</div></div>)}{session.what_needs_work && (<div><p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> What Needs Work</p><div className="bg-red-950/30 border border-red-800/30 rounded-lg p-3">{session.what_needs_work.split('\n').filter(l => l.trim()).map((line, i) => (<p key={i} className="text-sm text-red-300 py-0.5">• {line}</p>))}</div><p className="text-xs text-slate-500 mt-2">↑ These were automatically added as tasks.</p></div>)}</div>)}</div>); })}</div>)}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}><DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Log Playtesting Session</DialogTitle></DialogHeader><div className="space-y-4"><div><label className="text-xs text-slate-500 mb-1 block">Session Date *</label><Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} className="bg-slate-800 border-slate-700" /></div><div><label className="text-xs text-slate-500 mb-1 block">Who Played</label><Input placeholder="e.g. Alice, Bob, Carol" value={players} onChange={e => setPlayers(e.target.value)} className="bg-slate-800 border-slate-700" /></div><div><label className="text-xs text-slate-500 mb-1 block">General Notes</label><Textarea placeholder="Overall observations..." value={notes} onChange={e => setNotes(e.target.value)} className="bg-slate-800 border-slate-700 min-h-[80px]" /></div><div><label className="text-xs text-emerald-400 mb-1 block font-medium flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> What Worked Well</label><Textarea placeholder="One item per line..." value={whatWorked} onChange={e => setWhatWorked(e.target.value)} className="bg-emerald-950/20 border-emerald-800/40 text-emerald-200 placeholder:text-emerald-900 min-h-[100px]" /></div><div><label className="text-xs text-red-400 mb-1 block font-medium flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> What Needs Work</label><Textarea placeholder="One item per line — each will become a task..." value={whatNeedsWork} onChange={e => setWhatNeedsWork(e.target.value)} className="bg-red-950/20 border-red-800/40 text-red-200 placeholder:text-red-900 min-h-[100px]" /><p className="text-xs text-slate-500 mt-1">Each line will automatically create a task.</p></div></div><DialogFooter><Button variant="ghost" onClick={closeDialog}>Cancel</Button><Button onClick={() => logSession.mutate()} disabled={!sessionDate || logSession.isPending} className="bg-amber-500 hover:bg-amber-600 text-slate-950">{logSession.isPending ? 'Saving...' : 'Log Session'}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
