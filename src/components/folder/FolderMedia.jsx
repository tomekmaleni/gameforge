import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProject } from '../hooks/useProject';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function FolderMedia({ projectId, folderId }) {
  const { canEdit, user } = useProject();
  const qc = useQueryClient();
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: media = [] } = useQuery({
    queryKey: ['folder-media', folderId],
    queryFn: () => base44.entities.MediaItem.filter({ folder_id: folderId }),
    enabled: !!folderId,
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.MediaItem.create({ project_id: projectId, folder_id: folderId, title: file.name, file_url, uploaded_by: user?.email });
    qc.invalidateQueries({ queryKey: ['folder-media', folderId] });
    setUploading(false);
    toast.success('File uploaded');
  };

  return (
    <div className="p-4 md:p-8">
      {canEdit && (
        <div className="mb-6">
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors text-sm">
            <Upload className="w-4 h-4 text-amber-400" />
            {uploading ? 'Uploading...' : 'Upload Image'}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      )}
      {media.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">No media yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {media.map(item => (
            <div key={item.id} onClick={() => setPreview(item)} className="aspect-square rounded-lg overflow-hidden bg-slate-800 cursor-pointer border border-slate-700 hover:border-amber-500/30 transition-all group">
              <img src={item.file_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" style={item.crop_data ? { objectPosition: `${item.crop_data.x || 50}% ${item.crop_data.y || 50}%` } : {}} />
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-3xl">
          <DialogHeader><DialogTitle>{preview?.title}</DialogTitle></DialogHeader>
          {preview && (
            <div className="space-y-4">
              <img src={preview.file_url} alt={preview.title} className="w-full rounded-lg max-h-[70vh] object-contain" />
              {preview.description && <p className="text-sm text-slate-400">{preview.description}</p>}
              {preview.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">{preview.tags.map(tag => (<span key={tag} className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">#{tag}</span>))}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
