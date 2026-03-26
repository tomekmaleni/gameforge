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
import { Plus, BookOpen, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import useTrashDelete from '@/components/hooks/useTrashDelete';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import CommentsSection from '@/components/shared/CommentsSection';

export default function LoreWiki() {
  const { projectId } = useParams();
  const { canEdit } = useProject();
  const qc = useQueryClient();
  const [showEditor, setShowEditor] = useState(false);
  const [editPage, setEditPage] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [selectedPage, setSelectedPage] = useState(null);

  const { data: pages = [] } = useQuery({ queryKey: ['wiki', projectId], queryFn: () => base44.entities.LorePage.filter({ project_id: projectId }, '-created_date'), enabled: !!projectId });

  const savePage = useMutation({
    mutationFn: () => { const tagList = tags.split(',').map(t => t.trim()).filter(Boolean); if (editPage) return base44.entities.LorePage.update(editPage.id, { title, content, tags: tagList }); return base44.entities.LorePage.create({ project_id: projectId, title, content, tags: tagList }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wiki', projectId] }); closeEditor(); toast.success(editPage ? 'Page updated' : 'Page created'); },
  });

  const { confirmDelete: confirmDeletePage, isDeleting: isDeletingPage, pendingItem: pendingPage, handleConfirm: handleConfirmPage, handleClose: handleClosePage } = useTrashDelete({ itemType: 'lore_page', entityName: 'LorePage', invalidateKeys: [['wiki', projectId]], onSuccess: () => setSelectedPage(null) });

  const closeEditor = () => { setShowEditor(false); setEditPage(null); setTitle(''); setContent(''); setTags(''); };
  const openEdit = (page) => { setEditPage(page); setTitle(page.title); setContent(page.content || ''); setTags((page.tags || []).join(', ')); setShowEditor(true); setSelectedPage(null); };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6"><h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><BookOpen className="w-5 h-5 text-amber-400" /> Lore Wiki</h1>{canEdit && (<Button onClick={() => { closeEditor(); setShowEditor(true); }} size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 gap-2"><Plus className="w-4 h-4" /> New Page</Button>)}</div>
      {pages.length === 0 ? (<p className="text-slate-500 text-center py-12">No lore pages yet.</p>) : (<div className="space-y-2">{pages.map(page => (<div key={page.id} onClick={() => setSelectedPage(page)} className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-amber-500/30 transition-all"><h3 className="font-semibold mb-1">{page.title}</h3>{page.tags?.length > 0 && (<div className="flex flex-wrap gap-1">{page.tags.map(t => <Badge key={t} variant="outline" className="text-xs border-slate-700 text-slate-400">#{t}</Badge>)}</div>)}</div>))}</div>)}
      <Dialog open={!!selectedPage} onOpenChange={() => setSelectedPage(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center justify-between">{selectedPage?.title}{canEdit && selectedPage && (<div className="flex gap-2"><Button size="icon" variant="ghost" onClick={() => openEdit(selectedPage)}><Pencil className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={() => confirmDeletePage(selectedPage, selectedPage.title)} className="text-red-400"><Trash2 className="w-4 h-4" /></Button></div>)}</DialogTitle></DialogHeader>
          {selectedPage && (<div className="space-y-4"><div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">{selectedPage.content || 'No content.'}</div>{selectedPage.tags?.length > 0 && (<div className="flex flex-wrap gap-1">{selectedPage.tags.map(t => <Badge key={t} variant="outline" className="border-amber-500/30 text-amber-400">#{t}</Badge>)}</div>)}<CommentsSection projectId={projectId} targetType="lore_page" targetId={selectedPage.id} /></div>)}
        </DialogContent>
      </Dialog>
      <DeleteConfirmDialog open={!!pendingPage} onOpenChange={handleClosePage} itemName={pendingPage?.name} itemType="lore page" onConfirm={handleConfirmPage} isLoading={isDeletingPage} />
      <Dialog open={showEditor} onOpenChange={closeEditor}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editPage ? 'Edit Page' : 'New Wiki Page'}</DialogTitle></DialogHeader><div className="space-y-4"><Input placeholder="Page title" value={title} onChange={e => setTitle(e.target.value)} className="bg-slate-800 border-slate-700" /><Textarea placeholder="Write your lore content here..." value={content} onChange={e => setContent(e.target.value)} className="bg-slate-800 border-slate-700 min-h-[200px]" /><Input placeholder="Tags (comma-separated)" value={tags} onChange={e => setTags(e.target.value)} className="bg-slate-800 border-slate-700" /></div><DialogFooter><Button onClick={() => savePage.mutate()} disabled={!title.trim()} className="bg-amber-500 hover:bg-amber-600 text-slate-950">{editPage ? 'Update' : 'Create'}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
