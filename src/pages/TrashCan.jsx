import React from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@/components/hooks/useProject';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RotateCcw, Clock, FolderOpen, Database, Image, BookOpen, Lightbulb, CheckSquare } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { toast } from 'sonner';

const TYPE_CONFIG = {
  folder: { label: 'Folder', icon: FolderOpen, entity: 'Folder', color: 'text-blue-400' },
  game_entry: { label: 'Database Entry', icon: Database, entity: 'GameEntry', color: 'text-violet-400' },
  media_item: { label: 'Media', icon: Image, entity: 'MediaItem', color: 'text-pink-400' },
  lore_page: { label: 'Lore Page', icon: BookOpen, entity: 'LorePage', color: 'text-emerald-400' },
  idea: { label: 'Idea', icon: Lightbulb, entity: 'Idea', color: 'text-amber-400' },
  task: { label: 'Task', icon: CheckSquare, entity: 'Task', color: 'text-sky-400' },
};

export default function TrashCan() {
  const { projectId } = useParams();
  const { canEdit } = useProject();
  const qc = useQueryClient();

  const { data: trashItems = [], isLoading } = useQuery({ queryKey: ['trash', projectId], queryFn: () => base44.entities.TrashItem.filter({ project_id: projectId }, '-created_date'), enabled: !!projectId });
  const activeItems = trashItems.filter(item => { if (!item.expires_at) return true; return new Date(item.expires_at) > new Date(); });

  const restore = useMutation({
    mutationFn: async (trashItem) => {
      const config = TYPE_CONFIG[trashItem.item_type];
      if (!config) throw new Error('Unknown item type');
      const { id, created_date, updated_date, ...restData } = trashItem.item_data;
      await base44.entities[config.entity].create(restData);
      await base44.entities.TrashItem.delete(trashItem.id);
    },
    onSuccess: (_, trashItem) => {
      qc.invalidateQueries({ queryKey: ['trash', projectId] });
      const entityKeyMap = { folder: 'folders', game_entry: 'entries', media_item: 'all-media', lore_page: 'wiki', idea: 'ideas', task: 'tasks' };
      const key = entityKeyMap[trashItem.item_type];
      if (key) qc.invalidateQueries({ queryKey: [key, projectId] });
      toast.success('Item restored successfully');
    },
    onError: () => toast.error('Failed to restore item'),
  });

  if (!canEdit) return (<div className="p-8 text-center text-slate-500"><Trash2 className="w-12 h-12 mx-auto mb-3 text-slate-700" /><p>You don't have permission to view the trash.</p></div>);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2"><h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Trash2 className="w-5 h-5 text-slate-400" /> Trash</h1><Badge variant="outline" className="border-slate-700 text-slate-400">{activeItems.length} items</Badge></div>
      <p className="text-sm text-slate-500 mb-6">Items here are automatically deleted after 30 days.</p>
      {isLoading ? (<div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-900 rounded-xl animate-pulse" />)}</div>
      ) : activeItems.length === 0 ? (<div className="text-center py-16"><Trash2 className="w-16 h-16 mx-auto text-slate-800 mb-4" /><p className="text-slate-500">Trash is empty</p></div>
      ) : (
        <div className="space-y-2">
          {activeItems.map(item => {
            const config = TYPE_CONFIG[item.item_type] || { label: item.item_type, icon: Trash2, color: 'text-slate-400' };
            const Icon = config.icon;
            const expiresIn = item.expires_at ? formatDistanceToNow(parseISO(item.expires_at), { addSuffix: false }) : '30 days';
            return (
              <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0"><Icon className={`w-4 h-4 ${config.color}`} /></div>
                  <div className="min-w-0"><p className="font-medium text-sm truncate">{item.item_name}</p><div className="flex items-center gap-2 mt-0.5"><Badge variant="outline" className="text-xs border-slate-700 text-slate-500 py-0">{config.label}</Badge><span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> expires in {expiresIn}</span></div></div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => restore.mutate(item)} disabled={restore.isPending} className="flex-shrink-0 text-slate-400 hover:text-amber-400 gap-1"><RotateCcw className="w-3.5 h-3.5" /> Restore</Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
