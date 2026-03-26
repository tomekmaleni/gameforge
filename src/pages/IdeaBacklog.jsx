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
import { Plus, Lightbulb, Pencil, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import useTrashDelete from '@/components/hooks/useTrashDelete';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import CommentsSection from '@/components/shared/CommentsSection';

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', color: 'bg-slate-500/20 text-slate-400 border-slate-600' },
  in_progress: { label: 'In Progress', color: 'bg-amber-500/20 text-amber-400 border-amber-600' },
  finished: { label: 'Finished', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-600' },
};

export default function IdeaBacklog() {
  const { projectId } = useParams();
  const { canEdit, user } = useProject();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editIdea, setEditIdea] = useState(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState('not_started');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [dislikeDialogIdea, setDislikeDialogIdea] = useState(null);
  const [dislikeComment, setDislikeComment] = useState('');

  const { data: ideas = [] } = useQuery({ queryKey: ['ideas', projectId], queryFn: () => base44.entities.Idea.filter({ project_id: projectId }, '-created_date'), enabled: !!projectId });

  const saveIdea = useMutation({
    mutationFn: () => { if (editIdea) return base44.entities.Idea.update(editIdea.id, { title, description: desc, status }); return base44.entities.Idea.create({ project_id: projectId, title, description: desc, status }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ideas', projectId] }); closeForm(); toast.success(editIdea ? 'Idea updated' : 'Idea added'); },
    onError: (err) => { toast.error('Failed to save idea', { description: err.message }); },
  });

  const toggleLike = useMutation({
    mutationFn: (idea) => { const likes = idea.likes || []; const dislikes = idea.dislikes || []; const isLiked = likes.includes(user?.email); return base44.entities.Idea.update(idea.id, { likes: isLiked ? likes.filter(e => e !== user?.email) : [...likes, user?.email], dislikes: dislikes.filter(e => e !== user?.email) }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ideas', projectId] }),
    onError: (err) => { toast.error('Failed to update vote', { description: err.message }); },
  });

  const submitDislike = useMutation({
    mutationFn: async ({ idea, comment }) => {
      await base44.entities.Idea.update(idea.id, { dislikes: [...(idea.dislikes || []), user?.email], likes: (idea.likes || []).filter(e => e !== user?.email) });
      await base44.entities.Comment.create({ project_id: projectId, target_type: 'idea', target_id: idea.id, author_email: user?.email, author_name: user?.full_name || user?.email, content: `👎 Dislike reason: ${comment}` });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ideas', projectId] }); setDislikeDialogIdea(null); setDislikeComment(''); toast.success('Dislike recorded with feedback'); },
  });

  const removeDislike = useMutation({
    mutationFn: (idea) => base44.entities.Idea.update(idea.id, { dislikes: (idea.dislikes || []).filter(e => e !== user?.email) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ideas', projectId] }),
  });

  const { confirmDelete: confirmDeleteIdea, isDeleting: isDeletingIdea, pendingItem: pendingIdea, handleConfirm: handleConfirmIdea, handleClose: handleCloseIdea } = useTrashDelete({ itemType: 'idea', entityName: 'Idea', invalidateKeys: [['ideas', projectId]], onSuccess: () => setSelectedIdea(null) });

  const closeForm = () => { setShowForm(false); setEditIdea(null); setTitle(''); setDesc(''); setStatus('not_started'); };
  const openEdit = (idea) => { setEditIdea(idea); setTitle(idea.title); setDesc(idea.description || ''); setStatus(idea.status || 'not_started'); setShowForm(true); setSelectedIdea(null); };
  const handleDislikeClick = (e, idea) => { e.stopPropagation(); const isDisliked = (idea.dislikes || []).includes(user?.email); if (isDisliked) removeDislike.mutate(idea); else setDislikeDialogIdea(idea); };
  const handleLikeClick = (e, idea) => { e.stopPropagation(); toggleLike.mutate(idea); };

  const filtered = filterStatus === 'all' ? ideas : ideas.filter(i => (i.status || 'not_started') === filterStatus);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6"><h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber-400" /> Idea Backlog</h1>{canEdit && (<Button onClick={() => { closeForm(); setShowForm(true); }} size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 gap-2"><Plus className="w-4 h-4" /> New Idea</Button>)}</div>
      <div className="grid grid-cols-3 gap-3 mb-6">{Object.entries(STATUS_CONFIG).map(([key, { label, color }]) => { const count = ideas.filter(i => (i.status || 'not_started') === key).length; return (<button key={key} onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)} className={`p-3 rounded-xl border text-left transition-all ${filterStatus === key ? color : 'bg-slate-900 border-slate-800'}`}><p className="text-2xl font-bold">{count}</p><p className="text-xs text-slate-500">{label}</p></button>); })}</div>
      <div className="space-y-2">
        {filtered.map(idea => { const isLiked = (idea.likes || []).includes(user?.email); const isDisliked = (idea.dislikes || []).includes(user?.email); return (
          <div key={idea.id} onClick={() => setSelectedIdea(idea)} className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-amber-500/30 transition-all">
            <div className="flex items-start gap-3"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><h3 className="font-medium">{idea.title}</h3><Badge variant="outline" className={`text-xs ${STATUS_CONFIG[idea.status || 'not_started']?.color}`}>{STATUS_CONFIG[idea.status || 'not_started']?.label}</Badge></div>{idea.description && <p className="text-sm text-slate-400 line-clamp-2">{idea.description}</p>}</div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={(e) => handleLikeClick(e, idea)} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${isLiked ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:bg-slate-800'}`}><ThumbsUp className="w-3.5 h-3.5" /><span>{(idea.likes || []).length}</span></button>
              <button onClick={(e) => handleDislikeClick(e, idea)} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${isDisliked ? 'bg-red-500/20 text-red-400' : 'text-slate-500 hover:bg-slate-800'}`}><ThumbsDown className="w-3.5 h-3.5" /><span>{(idea.dislikes || []).length}</span></button>
              {canEdit && (<><Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" onClick={(e) => { e.stopPropagation(); openEdit(idea); }}><Pencil className="w-3.5 h-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-red-400" onClick={(e) => { e.stopPropagation(); confirmDeleteIdea(idea, idea.title); }}><Trash2 className="w-3.5 h-3.5" /></Button></>)}
            </div></div>
          </div>); })}
        {filtered.length === 0 && <p className="text-slate-500 text-center py-12">No ideas yet.</p>}
      </div>
      <DeleteConfirmDialog open={!!pendingIdea} onOpenChange={handleCloseIdea} itemName={pendingIdea?.name} itemType="idea" onConfirm={handleConfirmIdea} isLoading={isDeletingIdea} />
      <Dialog open={!!selectedIdea} onOpenChange={() => setSelectedIdea(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center justify-between pr-8">{selectedIdea?.title}{canEdit && selectedIdea && (<div className="flex gap-2"><Button size="icon" variant="ghost" onClick={() => openEdit(selectedIdea)}><Pencil className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={() => confirmDeleteIdea(selectedIdea, selectedIdea.title)} className="text-red-400"><Trash2 className="w-4 h-4" /></Button></div>)}</DialogTitle></DialogHeader>
          {selectedIdea && (() => { const idea = ideas.find(i => i.id === selectedIdea.id) || selectedIdea; const isLiked = (idea.likes || []).includes(user?.email); const isDisliked = (idea.dislikes || []).includes(user?.email); return (<div className="space-y-4"><Badge variant="outline" className={`text-xs ${STATUS_CONFIG[idea.status || 'not_started']?.color}`}>{STATUS_CONFIG[idea.status || 'not_started']?.label}</Badge>{idea.description && (<p className="text-sm text-slate-300 whitespace-pre-wrap">{idea.description}</p>)}<div className="flex gap-3"><button onClick={() => toggleLike.mutate(idea)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${isLiked ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}><ThumbsUp className="w-4 h-4" /><span>{(idea.likes || []).length} Likes</span></button><button onClick={() => { if (isDisliked) removeDislike.mutate(idea); else setDislikeDialogIdea(idea); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${isDisliked ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}><ThumbsDown className="w-4 h-4" /><span>{(idea.dislikes || []).length} Dislikes</span></button></div><CommentsSection projectId={projectId} targetType="idea" targetId={idea.id} /></div>); })()}
        </DialogContent>
      </Dialog>
      <Dialog open={!!dislikeDialogIdea} onOpenChange={() => { setDislikeDialogIdea(null); setDislikeComment(''); }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100"><DialogHeader><DialogTitle>Why do you dislike this idea?</DialogTitle></DialogHeader><p className="text-sm text-slate-400">Please explain your concern.</p><Textarea placeholder="Share your feedback..." value={dislikeComment} onChange={e => setDislikeComment(e.target.value)} className="bg-slate-800 border-slate-700 min-h-[100px]" /><DialogFooter><Button variant="ghost" onClick={() => { setDislikeDialogIdea(null); setDislikeComment(''); }}>Cancel</Button><Button onClick={() => submitDislike.mutate({ idea: dislikeDialogIdea, comment: dislikeComment })} disabled={!dislikeComment.trim() || submitDislike.isPending} className="bg-red-600 hover:bg-red-700 text-white">Submit Dislike</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100"><DialogHeader><DialogTitle>{editIdea ? 'Edit Idea' : 'New Idea'}</DialogTitle></DialogHeader><div className="space-y-3"><Input placeholder="Idea title" value={title} onChange={e => setTitle(e.target.value)} className="bg-slate-800 border-slate-700" /><Textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} className="bg-slate-800 border-slate-700" /><Select value={status} onValueChange={setStatus}><SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="not_started">Not Started</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="finished">Finished</SelectItem></SelectContent></Select></div><DialogFooter><Button onClick={() => saveIdea.mutate()} disabled={!title.trim()} className="bg-amber-500 hover:bg-amber-600 text-slate-950">{editIdea ? 'Update' : 'Create'}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
