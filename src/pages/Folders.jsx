import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '@/components/hooks/useProject';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { FolderOpen, Plus, MoreVertical, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import useTrashDelete from '@/components/hooks/useTrashDelete';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';

export default function Folders() {
  const { projectId } = useParams();
  const { canEdit } = useProject();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editFolder, setEditFolder] = useState(null);
  const [folderName, setFolderName] = useState('');

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['folders', projectId],
    queryFn: () => base44.entities.Folder.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const createFolder = useMutation({
    mutationFn: () => base44.entities.Folder.create({ project_id: projectId, name: folderName, order: folders.length }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['folders', projectId] }); setShowCreate(false); setFolderName(''); toast.success('Folder created'); },
  });

  const updateFolder = useMutation({
    mutationFn: () => base44.entities.Folder.update(editFolder.id, { name: folderName }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['folders', projectId] }); setEditFolder(null); setFolderName(''); toast.success('Folder renamed'); },
  });

  const { confirmDelete, isDeleting, pendingItem, handleConfirm, handleClose } = useTrashDelete({
    itemType: 'folder', entityName: 'Folder', invalidateKeys: [['folders', projectId]],
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Folders</h1>
        {canEdit && (<Button onClick={() => { setShowCreate(true); setFolderName(''); }} className="bg-amber-500 hover:bg-amber-600 text-slate-950 gap-2" size="sm"><Plus className="w-4 h-4" /> New Folder</Button>)}
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-900 rounded-xl animate-pulse" />)}</div>
      ) : folders.length === 0 ? (
        <div className="text-center py-16 text-slate-500">No folders yet. Create one to get started!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {folders.sort((a,b) => (a.order || 0) - (b.order || 0)).map(folder => (
            <div key={folder.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all group">
              <div className="flex items-start justify-between">
                <Link to={`/project/${projectId}/folders/${folder.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0"><FolderOpen className="w-5 h-5 text-amber-400" /></div>
                  <div className="min-w-0"><p className="font-medium truncate group-hover:text-amber-400 transition-colors">{folder.name}</p><div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5"><MessageSquare className="w-3 h-3" /> Chat</div></div>
                </Link>
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 opacity-0 group-hover:opacity-100"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-900 border-slate-700">
                      <DropdownMenuItem onClick={() => { setEditFolder(folder); setFolderName(folder.name); }} className="text-slate-300"><Pencil className="w-4 h-4 mr-2" /> Rename</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => confirmDelete(folder, folder.name)} className="text-red-400"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <DeleteConfirmDialog open={!!pendingItem} onOpenChange={handleClose} itemName={pendingItem?.name} itemType="folder" onConfirm={handleConfirm} isLoading={isDeleting} />
      <Dialog open={showCreate || !!editFolder} onOpenChange={(v) => { if (!v) { setShowCreate(false); setEditFolder(null); } }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle>{editFolder ? 'Rename Folder' : 'New Folder'}</DialogTitle></DialogHeader>
          <Input placeholder="Folder name" value={folderName} onChange={e => setFolderName(e.target.value)} className="bg-slate-800 border-slate-700" onKeyDown={e => e.key === 'Enter' && (editFolder ? updateFolder.mutate() : createFolder.mutate())} />
          <DialogFooter><Button onClick={() => editFolder ? updateFolder.mutate() : createFolder.mutate()} disabled={!folderName.trim()} className="bg-amber-500 hover:bg-amber-600 text-slate-950">{editFolder ? 'Rename' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
