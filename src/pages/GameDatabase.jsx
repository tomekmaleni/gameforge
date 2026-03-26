import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@/components/hooks/useProject';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Database, Upload, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import useTrashDelete from '@/components/hooks/useTrashDelete';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import CommentsSection from '@/components/shared/CommentsSection';
import ImageCropEditor from '@/components/shared/ImageCropEditor';
import TagInput from '@/components/shared/TagInput';

export default function GameDatabase() {
  const { projectId } = useParams();
  const { canEdit } = useProject();
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [filterMechanic, setFilterMechanic] = useState('all');
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [entryName, setEntryName] = useState('');
  const [entryData, setEntryData] = useState({});
  const [entryTags, setEntryTags] = useState('');
  const [entryMechanicIds, setEntryMechanicIds] = useState([]);
  const [entryImageUrl, setEntryImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draggedEntryId, setDraggedEntryId] = useState(null);
  const [dragOverEntryId, setDragOverEntryId] = useState(null);

  const { data: categories = [] } = useQuery({ queryKey: ['categories', projectId], queryFn: () => base44.entities.GameCategory.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: allEntries = [] } = useQuery({ queryKey: ['entries', projectId], queryFn: () => base44.entities.GameEntry.filter({ project_id: projectId }, '-created_date', 500), enabled: !!projectId });
  const { data: mechanics = [] } = useQuery({ queryKey: ['mechanics', projectId], queryFn: () => base44.entities.Mechanic.filter({ project_id: projectId }), enabled: !!projectId });

  const allTags = useMemo(() => { const s = new Set(); allEntries.forEach(e => (e.tags || []).forEach(t => s.add(t))); return Array.from(s); }, [allEntries]);

  const displayedEntries = useMemo(() => {
    let filtered = activeCategory ? allEntries.filter(e => e.category_id === activeCategory) : [...allEntries];
    if (filterMechanic !== 'all') filtered = filtered.filter(e => (e.mechanic_ids || []).includes(filterMechanic));
    switch (sortBy) {
      case 'oldest': filtered.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)); break;
      case 'newest': filtered.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)); break;
      case 'category': filtered.sort((a, b) => { const ca = categories.find(c => c.id === a.category_id)?.name || ''; const cb = categories.find(c => c.id === b.category_id)?.name || ''; return ca.localeCompare(cb); }); break;
      case 'mechanic': filtered = filtered.filter(e => e.mechanic_ids?.length > 0); filtered.sort((a, b) => { const ma = mechanics.find(m => (a.mechanic_ids || []).includes(m.id))?.name || ''; const mb = mechanics.find(m => (b.mechanic_ids || []).includes(m.id))?.name || ''; return ma.localeCompare(mb); }); break;
      case 'custom': filtered.sort((a, b) => (a.sort_order ?? 99999) - (b.sort_order ?? 99999)); break;
    }
    return filtered;
  }, [allEntries, activeCategory, filterMechanic, sortBy, categories, mechanics]);

  const createCategory = useMutation({
    mutationFn: () => {
      if (editCategoryId) return base44.entities.GameCategory.update(editCategoryId, { name: categoryName });
      return base44.entities.GameCategory.create({ project_id: projectId, name: categoryName, fields: [{ name: 'Type', type: 'text' }, { name: 'Ability', type: 'textarea' }, { name: 'Lore', type: 'textarea' }] });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories', projectId] }); setShowCategoryDialog(false); setCategoryName(''); setEditCategoryId(null); },
  });

  const deleteCategory = useMutation({
    mutationFn: (id) => base44.entities.GameCategory.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories', projectId] }); if (activeCategory) setActiveCategory(null); },
  });

  const saveEntry = useMutation({
    mutationFn: () => {
      const tags = entryTags.split(',').map(t => t.trim()).filter(Boolean);
      const payload = { name: entryName, data: entryData, tags, mechanic_ids: entryMechanicIds, image_url: entryImageUrl || null };
      if (editEntry) return base44.entities.GameEntry.update(editEntry.id, payload);
      return base44.entities.GameEntry.create({ project_id: projectId, category_id: activeCategory || editEntry?.category_id, ...payload });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['entries', projectId] }); setShowEntryDialog(false); resetEntryForm(); toast.success(editEntry ? 'Entry updated' : 'Entry created'); },
  });

  const saveCrop = useMutation({
    mutationFn: (cropData) => base44.entities.GameEntry.update(selectedEntry.id, { image_crop: cropData }),
    onSuccess: (_, cropData) => { qc.invalidateQueries({ queryKey: ['entries', projectId] }); setSelectedEntry(prev => ({ ...prev, image_crop: cropData })); toast.success('Crop saved'); },
  });

  const reorderEntry = useMutation({
    mutationFn: async ({ entries }) => {
      await Promise.all(entries.map(({ id, sort_order }) => base44.entities.GameEntry.update(id, { sort_order })));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['entries', projectId] }); },
  });

  const handleDragStart = (e, entryId) => { setDraggedEntryId(entryId); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, entryId) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverEntryId(entryId); };
  const handleDragEnd = () => { setDraggedEntryId(null); setDragOverEntryId(null); };
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedEntryId || draggedEntryId === targetId) { handleDragEnd(); return; }
    const items = [...displayedEntries];
    const fromIdx = items.findIndex(i => i.id === draggedEntryId);
    const toIdx = items.findIndex(i => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) { handleDragEnd(); return; }
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    const updates = items.map((item, idx) => ({ id: item.id, sort_order: idx }));
    reorderEntry.mutate({ entries: updates });
    handleDragEnd();
  };

  const { confirmDelete: confirmDeleteEntry, isDeleting: isDeletingEntry, pendingItem: pendingEntry, handleConfirm: handleConfirmEntry, handleClose: handleCloseEntry } = useTrashDelete({
    itemType: 'game_entry', entityName: 'GameEntry', invalidateKeys: [['entries', projectId]], onSuccess: () => setSelectedEntry(null),
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    setUploadingImage(true);
    try { const { file_url } = await base44.integrations.Core.UploadFile({ file }); setEntryImageUrl(file_url); } finally { setUploadingImage(false); }
  };

  const resetEntryForm = () => { setEntryName(''); setEntryData({}); setEntryTags(''); setEntryMechanicIds([]); setEntryImageUrl(''); setEditEntry(null); };

  const openEditEntry = (entry) => {
    setEditEntry(entry); setEntryName(entry.name); setEntryData(entry.data || {}); setEntryTags((entry.tags || []).join(', '));
    setEntryMechanicIds(entry.mechanic_ids || []); setEntryImageUrl(entry.image_url || ''); setShowEntryDialog(true);
  };

  const entryFormFields = useMemo(() => { const catId = editEntry?.category_id || activeCategory; return categories.find(c => c.id === catId)?.fields || []; }, [editEntry, activeCategory, categories]);

  const SORT_OPTIONS = [{ value: 'newest', label: 'Newest First' }, { value: 'oldest', label: 'Oldest First' }, { value: 'category', label: 'By Category' }, { value: 'mechanic', label: 'By Mechanic' }, { value: 'custom', label: 'Custom Order' }];

  return (
    <div className="p-4 md:p-6">
      <div className="flex gap-6 max-w-7xl mx-auto">
        <div className="hidden md:flex flex-col w-44 flex-shrink-0 space-y-5 pt-1">
          <div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sort By</p><div className="space-y-0.5">{SORT_OPTIONS.map(opt => (<button key={opt.value} onClick={() => setSortBy(opt.value)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${sortBy === opt.value ? 'bg-amber-500/10 text-amber-400 font-medium' : 'text-slate-400 hover:bg-slate-800'}`}>{opt.label}</button>))}</div></div>
          {mechanics.length > 0 && (<div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Mechanic</p><div className="space-y-0.5"><button onClick={() => setFilterMechanic('all')} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${filterMechanic === 'all' ? 'bg-amber-500/10 text-amber-400 font-medium' : 'text-slate-400 hover:bg-slate-800'}`}>All</button>{mechanics.map(m => (<button key={m.id} onClick={() => setFilterMechanic(filterMechanic === m.id ? 'all' : m.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${filterMechanic === m.id ? 'bg-amber-500/10 text-amber-400 font-medium' : 'text-slate-400 hover:bg-slate-800'}`}>{m.name}</button>))}</div></div>)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-5"><h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Database className="w-5 h-5 text-amber-400" /> Game Database</h1>{canEdit && (<Button onClick={() => { setShowCategoryDialog(true); setCategoryName(''); setEditCategoryId(null); }} size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 gap-2"><Plus className="w-4 h-4" /> Category</Button>)}</div>
          <div className="flex md:hidden gap-2 mb-4 overflow-x-auto pb-1">{SORT_OPTIONS.map(opt => (<button key={opt.value} onClick={() => setSortBy(opt.value)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${sortBy === opt.value ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>{opt.label}</button>))}</div>
          {categories.length > 0 && (<div className="flex flex-wrap gap-2 mb-4"><Button variant={!activeCategory ? 'default' : 'ghost'} size="sm" onClick={() => setActiveCategory(null)} className={!activeCategory ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}>All</Button>{categories.map(cat => (<div key={cat.id} className="flex items-center gap-1"><Button variant={activeCategory === cat.id ? 'default' : 'ghost'} size="sm" onClick={() => setActiveCategory(cat.id)} className={activeCategory === cat.id ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}>{cat.name}</Button>{canEdit && (<Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" onClick={() => { setEditCategoryId(cat.id); setCategoryName(cat.name); setShowCategoryDialog(true); }}><Pencil className="w-3 h-3" /></Button>)}</div>))}</div>)}
          {canEdit && activeCategory && (<Button onClick={() => { resetEntryForm(); setShowEntryDialog(true); }} size="sm" variant="outline" className="mb-4 border-slate-700 text-slate-300 gap-2"><Plus className="w-4 h-4" /> New Entry</Button>)}
          {displayedEntries.length === 0 ? (<p className="text-slate-500 text-center py-12">{categories.length === 0 ? 'Create a category to start adding entries.' : 'No entries found.'}</p>) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedEntries.map(entry => {
                const typeColor = entry.data?.type_color || 'amber';
                const colorMap = { amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' }, red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' }, green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' }, blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' }, purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' }, pink: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' }, cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' }, yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' }, emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' }, rose: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' }, indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' }, slate: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' } };
                const tc = colorMap[typeColor] || colorMap.amber;
                return (
                <div key={entry.id} onClick={() => setSelectedEntry(entry)} className={`bg-slate-900 border rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/30 transition-all flex items-center gap-3 p-3 ${dragOverEntryId === entry.id && draggedEntryId !== entry.id ? 'border-amber-400 bg-amber-500/5' : 'border-slate-800'} ${draggedEntryId === entry.id ? 'opacity-50' : ''}`} draggable={sortBy === 'custom' && canEdit} onDragStart={(e) => handleDragStart(e, entry.id)} onDragOver={(e) => handleDragOver(e, entry.id)} onDrop={(e) => handleDrop(e, entry.id)} onDragEnd={handleDragEnd}>
                  {sortBy === 'custom' && canEdit && (<div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400" onMouseDown={e => e.stopPropagation()}><GripVertical className="w-4 h-4" /></div>)}
                  <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden">{entry.image_url ? (<img src={entry.image_url} alt={entry.name} className="w-full h-full object-contain" />) : (<span className="text-slate-600 text-xl font-bold">{entry.name?.[0]?.toUpperCase()}</span>)}</div>
                  <div className="flex-1 min-w-0"><h3 className="font-semibold text-slate-100 truncate">{entry.name}</h3>{entry.data?.Type && (<span className={`inline-block text-xs ${tc.bg} ${tc.text} ${tc.border} border rounded px-1.5 py-0.5 mt-0.5 mb-1`}>{entry.data.Type}</span>)}{entry.mechanic_ids?.length > 0 && (<p className="text-xs text-slate-500">⚙ {entry.mechanic_ids.map(id => mechanics.find(m => m.id === id)?.name).filter(Boolean).join(', ')}</p>)}{entry.tags?.length > 0 && (<div className="flex flex-wrap gap-1 mt-1">{entry.tags.map(t => <Badge key={t} variant="outline" className="text-xs border-slate-700 text-slate-400">#{t}</Badge>)}</div>)}</div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center justify-between pr-8">{selectedEntry?.name}{canEdit && selectedEntry && (<div className="flex gap-2"><Button size="icon" variant="ghost" onClick={() => { openEditEntry(selectedEntry); setSelectedEntry(null); }}><Pencil className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={() => confirmDeleteEntry(selectedEntry, selectedEntry.name)} className="text-red-400"><Trash2 className="w-4 h-4" /></Button></div>)}</DialogTitle></DialogHeader>
          {selectedEntry && (<div className="space-y-4">{selectedEntry.image_url && (<ImageCropEditor imageUrl={selectedEntry.image_url} cropData={selectedEntry.image_crop} onSaveCrop={canEdit ? (crop) => saveCrop.mutate(crop) : null} />)}{selectedEntry.mechanic_ids?.length > 0 && (<div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Influences Mechanics</p><div className="flex flex-wrap gap-1">{selectedEntry.mechanic_ids.map(id => { const m = mechanics.find(m => m.id === id); return m ? <Badge key={id} variant="outline" className="border-amber-500/30 text-amber-400">{m.name}</Badge> : null; })}</div></div>)}{Object.entries(selectedEntry.data || {}).filter(([key]) => key !== 'type_color').map(([key, val]) => { const isType = key === 'Type' && selectedEntry.data?.type_color; const selColor = selectedEntry.data?.type_color || 'amber'; const cMap = { amber: 'text-amber-400', red: 'text-red-400', green: 'text-green-400', blue: 'text-blue-400', purple: 'text-purple-400', pink: 'text-pink-400', cyan: 'text-cyan-400', yellow: 'text-yellow-400', emerald: 'text-emerald-400', rose: 'text-rose-400', indigo: 'text-indigo-400', slate: 'text-slate-400' }; return (<div key={key}><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{key}</p><p className={`text-sm whitespace-pre-wrap ${isType ? (cMap[selColor] || 'text-slate-200') : 'text-slate-200'}`}>{val || '—'}</p></div>); })}{selectedEntry.tags?.length > 0 && (<div className="flex flex-wrap gap-1">{selectedEntry.tags.map(t => <Badge key={t} variant="outline" className="border-amber-500/30 text-amber-400">#{t}</Badge>)}</div>)}<CommentsSection projectId={projectId} targetType="game_entry" targetId={selectedEntry.id} /></div>)}
        </DialogContent>
      </Dialog>
      <DeleteConfirmDialog open={!!pendingEntry} onOpenChange={handleCloseEntry} itemName={pendingEntry?.name} itemType="database entry" onConfirm={handleConfirmEntry} isLoading={isDeletingEntry} />
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100"><DialogHeader><DialogTitle>{editCategoryId ? 'Edit Category' : 'New Category'}</DialogTitle></DialogHeader><Input placeholder="Category name (e.g. Characters, Items...)" value={categoryName} onChange={e => setCategoryName(e.target.value)} className="bg-slate-800 border-slate-700" />{editCategoryId && (<Button variant="destructive" size="sm" onClick={() => { deleteCategory.mutate(editCategoryId); setShowCategoryDialog(false); }}>Delete Category</Button>)}<DialogFooter><Button onClick={() => createCategory.mutate()} disabled={!categoryName.trim()} className="bg-amber-500 hover:bg-amber-600 text-slate-950">{editCategoryId ? 'Save' : 'Create'}</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={showEntryDialog} onOpenChange={(open) => { if (!open) { setShowEntryDialog(false); resetEntryForm(); } }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editEntry ? 'Edit Entry' : 'New Entry'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name" value={entryName} onChange={e => setEntryName(e.target.value)} className="bg-slate-800 border-slate-700" />
            <div><label className="text-xs text-slate-500 mb-1 block">Image</label>{entryImageUrl ? (<div className="relative"><div className="aspect-video bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center"><img src={entryImageUrl} alt="entry" className="w-full h-full object-contain" /></div><button onClick={() => setEntryImageUrl('')} className="absolute top-2 right-2 bg-slate-900/80 rounded-full p-1 text-slate-400 hover:text-red-400"><X className="w-4 h-4" /></button></div>) : (<label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-amber-500/50 text-sm text-slate-500 transition-colors"><Upload className="w-4 h-4" />{uploadingImage ? 'Uploading...' : 'Upload image'}<input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} /></label>)}</div>
            {entryFormFields.map(f => (<div key={f.name}><label className="text-xs text-slate-500 mb-1 block">{f.name}</label>{f.type === 'textarea' ? (<Textarea value={entryData[f.name] || ''} onChange={e => setEntryData({ ...entryData, [f.name]: e.target.value })} className="bg-slate-800 border-slate-700" />) : (<Input value={entryData[f.name] || ''} onChange={e => setEntryData({ ...entryData, [f.name]: e.target.value })} className="bg-slate-800 border-slate-700" />)}{f.name === 'Type' && (<div className="mt-1.5"><label className="text-xs text-slate-500 mb-1 block">Type Color</label><div className="flex flex-wrap gap-1.5">{[{ name: 'amber', cls: 'bg-amber-500' }, { name: 'red', cls: 'bg-red-500' }, { name: 'green', cls: 'bg-green-500' }, { name: 'blue', cls: 'bg-blue-500' }, { name: 'purple', cls: 'bg-purple-500' }, { name: 'pink', cls: 'bg-pink-500' }, { name: 'cyan', cls: 'bg-cyan-500' }, { name: 'yellow', cls: 'bg-yellow-500' }, { name: 'emerald', cls: 'bg-emerald-500' }, { name: 'rose', cls: 'bg-rose-500' }, { name: 'indigo', cls: 'bg-indigo-500' }, { name: 'slate', cls: 'bg-slate-500' }].map(c => (<button key={c.name} type="button" onClick={() => setEntryData({ ...entryData, type_color: c.name })} className={`w-6 h-6 rounded-full ${c.cls} transition-all ${(entryData.type_color || 'amber') === c.name ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-60 hover:opacity-100'}`} />))}</div></div>)}</div>))}
            {mechanics.length > 0 && (<div><label className="text-xs text-slate-500 mb-1 block">Influences Mechanics</label><div className="flex flex-wrap gap-2">{mechanics.map(m => { const selected = entryMechanicIds.includes(m.id); return (<button key={m.id} type="button" onClick={() => setEntryMechanicIds(prev => selected ? prev.filter(id => id !== m.id) : [...prev, m.id])} className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${selected ? 'bg-amber-500/20 border-amber-500/60 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>{m.name}</button>); })}</div></div>)}
            <div><label className="text-xs text-slate-500 mb-1 block">Tags (comma-separated)</label><TagInput value={entryTags} onChange={setEntryTags} allTags={allTags} placeholder="#magic, #boss" /></div>
          </div>
          <DialogFooter><Button onClick={() => saveEntry.mutate()} disabled={!entryName.trim() || saveEntry.isPending} className="bg-amber-500 hover:bg-amber-600 text-slate-950">{saveEntry.isPending ? 'Saving...' : editEntry ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
