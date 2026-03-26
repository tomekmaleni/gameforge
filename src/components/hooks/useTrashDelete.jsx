import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useProject } from './useProject';
import { toast } from 'sonner';
import { addDays } from 'date-fns';

export default function useTrashDelete({ itemType, entityName, invalidateKeys = [], onSuccess }) {
  const { projectId, user } = useProject();
  const qc = useQueryClient();
  const [pending, setPending] = useState(null);

  const trashMutation = useMutation({
    mutationFn: async ({ item, name }) => {
      // Delete entity first, then create trash record
      // This way if delete fails, nothing goes to trash
      await base44.entities[entityName].delete(item.id);
      try {
        await base44.entities.TrashItem.create({
          project_id: projectId, item_type: itemType, item_id: item.id, item_name: name,
          item_data: item, deleted_by_email: user?.email, deleted_by_name: user?.full_name || user?.email,
          expires_at: addDays(new Date(), 30).toISOString(),
        });
      } catch (trashErr) {
        // Item is already deleted — still counts as success
        console.error('Failed to create trash record:', trashErr);
      }
    },
    onSuccess: () => {
      invalidateKeys.forEach(key => qc.invalidateQueries({ queryKey: key }));
      qc.invalidateQueries({ queryKey: ['trash', projectId] });
      setPending(null);
      toast.success('Moved to trash', { description: 'Item will be permanently deleted in 30 days.' });
      onSuccess?.();
    },
    onError: (err) => {
      setPending(null);
      toast.error('Failed to delete', { description: err.message });
    },
  });

  const confirmDelete = (item, name) => { setPending({ item, name }); };
  const handleConfirm = () => { if (pending) trashMutation.mutate(pending); };
  const handleClose = () => { if (!trashMutation.isPending) setPending(null); };

  return { confirmDelete, isDeleting: trashMutation.isPending, pendingItem: pending, handleConfirm, handleClose };
}
