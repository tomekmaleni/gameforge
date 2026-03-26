import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProject } from '../hooks/useProject';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function CommentsSection({ projectId, targetType, targetId }) {
  const { canEdit, user } = useProject();
  const qc = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', targetType, targetId],
    queryFn: () => base44.entities.Comment.filter({
      project_id: projectId, target_type: targetType, target_id: targetId,
    }, 'created_date'),
    enabled: !!targetId,
  });

  const addComment = useMutation({
    mutationFn: () => base44.entities.Comment.create({
      project_id: projectId, target_type: targetType, target_id: targetId,
      author_email: user?.email, author_name: user?.full_name || user?.email, content: newComment,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comments', targetType, targetId] }); setNewComment(''); },
  });

  const deleteComment = useMutation({
    mutationFn: (id) => base44.entities.Comment.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', targetType, targetId] }),
  });

  return (
    <div className="border-t border-slate-800 pt-4 mt-4">
      <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-slate-400" /> Comments ({comments.length})
      </h4>
      <div className="space-y-3 mb-4">
        {comments.map(c => (
          <div key={c.id} className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-amber-400">{c.author_name || c.author_email}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{c.created_date ? format(new Date(c.created_date), 'MMM d, HH:mm') : ''}</span>
                {canEdit && (<button onClick={() => deleteComment.mutate(c.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>)}
              </div>
            </div>
            <p className="text-sm text-slate-300">{c.content}</p>
          </div>
        ))}
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <Textarea placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} className="bg-slate-800 border-slate-700 text-sm min-h-[60px]" />
          <Button onClick={() => addComment.mutate()} disabled={!newComment.trim()} className="bg-amber-500 hover:bg-amber-600 text-slate-950 self-end" size="sm">Post</Button>
        </div>
      )}
    </div>
  );
}
