import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProject } from '../hooks/useProject';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { format } from 'date-fns';

export default function FolderChat({ projectId, folderId }) {
  const { user } = useProject();
  const [message, setMessage] = useState('');
  const bottomRef = useRef(null);
  const qc = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['chat', folderId],
    queryFn: () => base44.entities.ChatMessage.filter({ folder_id: folderId }, 'created_date', 100),
    enabled: !!folderId,
    refetchInterval: 3000,
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const sendMessage = useMutation({
    mutationFn: () => base44.entities.ChatMessage.create({
      project_id: projectId, folder_id: folderId,
      sender_email: user?.email, sender_name: user?.full_name || user?.email, content: message,
    }),
    onSuccess: () => { setMessage(''); qc.invalidateQueries({ queryKey: ['chat', folderId] }); },
  });

  const handleSend = () => { if (!message.trim()) return; sendMessage.mutate(); };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (<p className="text-center text-slate-500 text-sm py-8">No messages yet. Start the conversation!</p>)}
        {messages.map(msg => {
          const isMe = msg.sender_email === user?.email;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${isMe ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-800 border-slate-700'} border rounded-2xl px-4 py-2.5`}>
                {!isMe && (<p className="text-xs font-medium text-amber-400 mb-1">{msg.sender_name || msg.sender_email}</p>)}
                <p className="text-sm text-slate-200 break-words">{msg.content}</p>
                <p className="text-xs text-slate-500 mt-1">{msg.created_date ? format(new Date(msg.created_date), 'MMM d, HH:mm') : ''}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-slate-800">
        <div className="flex gap-2">
          <Input placeholder="Type a message..." value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} className="bg-slate-800 border-slate-700 text-slate-100 flex-1" />
          <Button onClick={handleSend} disabled={!message.trim() || sendMessage.isPending} className="bg-amber-500 hover:bg-amber-600 text-slate-950" size="icon"><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}
