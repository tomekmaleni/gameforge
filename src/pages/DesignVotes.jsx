import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@/components/hooks/useProject';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Layers, Upload, X, Trophy, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function DesignVotes() {
  const { projectId } = useParams();
  const { canEdit, user } = useProject();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCompId, setSelectedCompId] = useState(null);
  const [createTitle, setCreateTitle] = useState('');
  const [createOptions, setCreateOptions] = useState([{ label: '', image_url: '', uploading: false }, { label: '', image_url: '', uploading: false }]);

  const { data: comparisons = [] } = useQuery({ queryKey: ['design-comparisons', projectId], queryFn: () => base44.entities.DesignComparison.filter({ project_id: projectId }, '-created_date'), enabled: !!projectId });
  const viewComp = selectedCompId ? comparisons.find(c => c.id === selectedCompId) || null : null;

  const createComparison = useMutation({
    mutationFn: () => { const options = createOptions.filter(o => o.image_url).map(o => ({ label: o.label || 'Option', image_url: o.image_url, votes: [] })); return base44.entities.DesignComparison.create({ project_id: projectId, title: createTitle, options }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['design-comparisons', projectId] }); setShowCreate(false); setCreateTitle(''); setCreateOptions([{ label: '', image_url: '', uploading: false }, { label: '', image_url: '', uploading: false }]); toast.success('Design comparison created!'); },
  });

  const deleteComparison = useMutation({ mutationFn: (id) => base44.entities.DesignComparison.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['design-comparisons', projectId] }); setSelectedCompId(null); toast.success('Deleted'); } });

  const castVote = useMutation({
    mutationFn: ({ comp, optionIndex }) => {
      const options = comp.options.map((opt, i) => { const votesWithoutMe = (opt.votes || []).filter(e => e !== user?.email); if (i === optionIndex) { const alreadyVoted = (opt.votes || []).includes(user?.email); return { ...opt, votes: alreadyVoted ? votesWithoutMe : [...votesWithoutMe, user?.email] }; } return { ...opt, votes: votesWithoutMe }; });
      return base44.entities.DesignComparison.update(comp.id, { options });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['design-comparisons', projectId] }),
  });

  const handleUpload = async (optIndex, file) => {
    setCreateOptions(prev => prev.map((o, i) => i === optIndex ? { ...o, uploading: true } : o));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setCreateOptions(prev => prev.map((o, i) => i === optIndex ? { ...o, image_url: file_url, uploading: false } : o));
  };

  const addOption = () => setCreateOptions(prev => [...prev, { label: '', image_url: '', uploading: false }]);
  const removeOption = (i) => setCreateOptions(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6"><h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Layers className="w-5 h-5 text-amber-400" /> Design Votes</h1>{canEdit && (<Button onClick={() => setShowCreate(true)} size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 gap-2"><Plus className="w-4 h-4" /> New Comparison</Button>)}</div>
      {comparisons.length === 0 ? (<div className="text-center py-16"><Layers className="w-16 h-16 mx-auto text-slate-700 mb-4" /><p className="text-slate-500 mb-2">No design comparisons yet.</p><p className="text-slate-600 text-sm">Upload options and let the team vote!</p></div>) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{comparisons.map(comp => { const totalVotes = (comp.options || []).reduce((sum, o) => sum + (o.votes || []).length, 0); const userVotedIndex = (comp.options || []).findIndex(o => (o.votes || []).includes(user?.email)); return (<div key={comp.id} onClick={() => setSelectedCompId(comp.id)} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/30 transition-all"><div className="flex bg-slate-800" style={{ height: '140px' }}>{(comp.options || []).slice(0, 2).map((opt, i) => (<div key={i} className="flex-1 overflow-hidden flex items-center justify-center border-r border-slate-700 last:border-0">{opt.image_url ? (<img src={opt.image_url} alt={opt.label} className="w-full h-full object-contain" />) : (<Layers className="w-8 h-8 text-slate-600" />)}</div>))}{(comp.options || []).length > 2 && (<div className="w-10 flex items-center justify-center bg-slate-700 text-xs text-slate-400 font-bold">+{(comp.options || []).length - 2}</div>)}</div><div className="p-3"><h3 className="font-semibold text-slate-100 mb-1">{comp.title}</h3><div className="flex items-center gap-2 text-xs text-slate-500"><span>{(comp.options || []).length} options</span><span>•</span><span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>{userVotedIndex >= 0 && (<span className="text-amber-400 flex items-center gap-1"><Check className="w-3 h-3" /> Voted</span>)}</div></div></div>); })}</div>)}
      <Dialog open={!!selectedCompId} onOpenChange={() => setSelectedCompId(null)}><DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center justify-between pr-8">{viewComp?.title}{canEdit && viewComp && (<Button size="icon" variant="ghost" onClick={() => deleteComparison.mutate(viewComp.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></Button>)}</DialogTitle></DialogHeader>{viewComp && (<div className="space-y-4"><p className="text-xs text-slate-400">Click an option to cast your vote.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{(viewComp.options || []).map((opt, i) => { const totalVotes = (viewComp.options || []).reduce((sum, o) => sum + (o.votes || []).length, 0); const voteCount = (opt.votes || []).length; const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0; const isUserVote = (opt.votes || []).includes(user?.email); const maxVotes = Math.max(...(viewComp.options || []).map(o => (o.votes || []).length)); const isWinner = voteCount === maxVotes && voteCount > 0; return (<div key={i} onClick={() => castVote.mutate({ comp: viewComp, optionIndex: i })} className={`relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${isUserVote ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-slate-700 hover:border-slate-500'}`}>{isWinner && (<div className="absolute top-2 left-2 z-10 bg-amber-500 text-slate-950 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Trophy className="w-3 h-3" /> Leading</div>)}{isUserVote && (<div className="absolute top-2 right-2 z-10 bg-amber-500 rounded-full p-1"><Check className="w-3 h-3 text-slate-950" /></div>)}<div className="bg-slate-800 flex items-center justify-center" style={{ height: '200px' }}>{opt.image_url ? (<img src={opt.image_url} alt={opt.label} className="w-full h-full object-contain" />) : (<Layers className="w-12 h-12 text-slate-600" />)}</div><div className="p-3"><div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">{opt.label || `Option ${i + 1}`}</span><span className="text-sm font-bold text-amber-400">{voteCount} vote{voteCount !== 1 ? 's' : ''}</span></div><div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} /></div><p className="text-xs text-slate-500 mt-1">{pct}%</p></div></div>); })}</div></div>)}</DialogContent></Dialog>
      <Dialog open={showCreate} onOpenChange={setShowCreate}><DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>New Design Comparison</DialogTitle></DialogHeader><div className="space-y-4"><Input placeholder="Comparison title" value={createTitle} onChange={e => setCreateTitle(e.target.value)} className="bg-slate-800 border-slate-700" /><div className="space-y-3">{createOptions.map((opt, i) => (<div key={i} className="flex gap-2 items-start bg-slate-800/50 rounded-lg p-3"><div className="flex-1 space-y-2"><Input placeholder={`Option ${i + 1} label`} value={opt.label} onChange={e => setCreateOptions(prev => prev.map((o, idx) => idx === i ? { ...o, label: e.target.value } : o))} className="bg-slate-800 border-slate-700 text-sm" />{opt.image_url ? (<div className="relative"><img src={opt.image_url} alt="" className="w-full h-32 object-contain bg-slate-800 rounded-lg" /><button onClick={() => setCreateOptions(prev => prev.map((o, idx) => idx === i ? { ...o, image_url: '' } : o))} className="absolute top-1 right-1 bg-slate-900/80 rounded-full p-1 text-slate-400 hover:text-red-400"><X className="w-3 h-3" /></button></div>) : (<label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-amber-500/50 text-sm text-slate-500 transition-colors"><Upload className="w-4 h-4" />{opt.uploading ? 'Uploading...' : 'Upload image'}<input type="file" accept="image/*" className="hidden" disabled={opt.uploading} onChange={e => e.target.files?.[0] && handleUpload(i, e.target.files[0])} /></label>)}</div>{createOptions.length > 2 && (<button onClick={() => removeOption(i)} className="text-slate-500 hover:text-red-400 mt-1 flex-shrink-0"><X className="w-4 h-4" /></button>)}</div>))}</div><Button variant="outline" size="sm" onClick={addOption} className="border-slate-700 text-slate-400 gap-2"><Plus className="w-4 h-4" /> Add Another Option</Button></div><DialogFooter><Button onClick={() => createComparison.mutate()} disabled={!createTitle.trim() || createOptions.filter(o => o.image_url).length < 2 || createComparison.isPending} className="bg-amber-500 hover:bg-amber-600 text-slate-950">{createComparison.isPending ? 'Creating...' : 'Create Comparison'}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
