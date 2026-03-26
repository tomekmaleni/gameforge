import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@/components/hooks/useProject';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Image, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import useTrashDelete from '@/components/hooks/useTrashDelete';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import CommentsSection from '@/components/shared/CommentsSection';
import ImageCropEditor from '@/components/shared/ImageCropEditor';
import TagInput from '@/components/shared/TagInput';

export default function MediaLibrary() {
  const { projectId } = useParams();
  const { canEdit, user } = useProject();
  const qc = useQueryClient();
  const [preview, setPreview] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: media = [] } = useQuery({ queryKey: ['all-media', projectId], queryFn: () => base44.entities.MediaItem.filter({ project_id: projectId }, '-created_date'), enabled: !!projectId });
  const allTags = useMemo(() => { const s = new Set(); media.forEach(m => (m.tags || []).forEach(t => s.add(t))); return Array.from(s); }, [media]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    setUploading(true);
    for (const file of files) { const { file_url } = await base44.integrations.Core.UploadFile({ file }); await base44.entities.MediaItem.create({ project_id: projectId, title: file.name, file_url, uploaded_by: user?.email }); }
    qc.invalidateQueries({ queryKey: ['all-media', projectId] }); setUploading(false); toast.success(`${files.length} file(s) uploaded`);
  };

  const updateMedia = useMutation({
    mutationFn: () => base44.entities.MediaItem.update(preview.id, { title: editTitle, description: editDesc, tags: editTags.split(',').map(t => t.trim()).filter(Boolean) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-media', projectId] }); setEditMode(false); toast.success('Updated'); },
  });

  const { confirmDelete: confirmDeleteMedia, isDeleting: isDeletingMedia, pendingItem: pendingMedia, handleConfirm: handleConfirmMedia, handleClose: handleCloseMedia } = useTrashDelete({ itemType: 'media_item', entityName: 'MediaItem', invalidateKeys: [['all-media', projectId]], onSuccess: () => setPreview(null) });

  const saveCrop = useMutation({
    mutationFn: (cropData) => base44.entities.MediaItem.update(preview.id, { crop_data: cropData }),
    onSuccess: (_, cropData) => { qc.invalidateQueries({ queryKey: ['all-media', projectId] }); setPreview(prev => ({ ...prev, crop_data: cropData })); toast.success('Crop saved'); },
  });

  const openPreview = (item) => { setPreview(item); setEditMode(false); setEditTitle(item.title || ''); setEditDesc(item.description || ''); setEditTags((item.tags || []).join(', ')); };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6"><h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Image className="w-5 h-5 text-amber-400" /> Media Library</h1>{canEdit && (<label className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-950 font-semibold rounded-lg cursor-pointer hover:bg-amber-600 text-sm"><Upload className="w-4 h-4" />{uploading ? 'Uploading...' : 'Upload'}<input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} /></label>)}</div>
      {media.length === 0 ? (<div className="text-center py-16"><Image className="w-16 h-16 mx-auto text-slate-700 mb-4" /><p className="text-slate-500">No media files yet.</p></div>) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{media.map(item => (<div key={item.id} onClick={() => openPreview(item)} className="rounded-xl overflow-hidden bg-slate-900 border border-slate-800 cursor-pointer hover:border-amber-500/30 transition-all group flex flex-col"><div className="flex-1 bg-slate-800 flex items-center justify-center overflow-hidden" style={{ minHeight: '140px' }}><img src={item.file_url} alt={item.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" style={{ maxHeight: '180px' }} /></div><div className="p-2">{item.title && <p className="text-xs font-semibold text-slate-100 truncate mb-1">{item.title}</p>}{item.tags?.length > 0 && (<div className="flex flex-wrap gap-1">{item.tags.map(t => (<Badge key={t} variant="outline" className="text-xs border-slate-700 text-slate-400 px-1 py-0">#{t}</Badge>))}</div>)}</div></div>))}</div>)}
      <DeleteConfirmDialog open={!!pendingMedia} onOpenChange={handleCloseMedia} itemName={pendingMedia?.name} itemType="media file" onConfirm={handleConfirmMedia} isLoading={isDeletingMedia} />
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-2"><h2 className="text-lg font-semibold">{editMode ? 'Edit Media' : (preview?.title || 'Media')}</h2>{canEdit && preview && !editMode && (<div className="flex gap-2"><Button size="icon" variant="ghost" onClick={() => setEditMode(true)}><Pencil className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={() => confirmDeleteMedia(preview, preview.title)} className="text-red-400"><Trash2 className="w-4 h-4" /></Button></div>)}</div>
          {preview && (<div className="space-y-4">{editMode ? (<><Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title" className="bg-slate-800 border-slate-700" /><Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" className="bg-slate-800 border-slate-700" /><TagInput value={editTags} onChange={setEditTags} allTags={allTags} placeholder="Tags" /><div className="flex gap-2 justify-end"><Button variant="ghost" onClick={() => setEditMode(false)}>Cancel</Button><Button onClick={() => updateMedia.mutate()} className="bg-amber-500 hover:bg-amber-600 text-slate-950">Save</Button></div></>) : (<><ImageCropEditor imageUrl={preview.file_url} cropData={preview.crop_data} onSaveCrop={canEdit ? (crop) => saveCrop.mutate(crop) : null} />{preview.description && <p className="text-sm text-slate-400">{preview.description}</p>}{preview.tags?.length > 0 && (<div className="flex flex-wrap gap-1">{preview.tags.map(t => <Badge key={t} variant="outline" className="border-amber-500/30 text-amber-400">#{t}</Badge>)}</div>)}<CommentsSection projectId={projectId} targetType="media_item" targetId={preview.id} /></>)}</div>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
