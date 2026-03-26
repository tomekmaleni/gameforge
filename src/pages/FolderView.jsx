import React from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@/components/hooks/useProject';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MessageSquare, Image } from 'lucide-react';
import FolderChat from '@/components/folder/FolderChat';
import FolderMedia from '@/components/folder/FolderMedia';

export default function FolderView() {
  const { projectId, folderId } = useParams();
  const { isLoading } = useProject();

  const { data: folder } = useQuery({
    queryKey: ['folder', folderId],
    queryFn: async () => { const res = await base44.entities.Folder.filter({ id: folderId }); return res?.[0] || null; },
    enabled: !!folderId,
  });

  if (isLoading || !folder) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 md:px-8 md:pt-6 border-b border-slate-800"><h1 className="text-xl font-bold">{folder.name}</h1></div>
      <Tabs defaultValue="chat" className="flex-1 flex flex-col">
        <div className="px-4 md:px-8 border-b border-slate-800">
          <TabsList className="bg-transparent border-0 h-auto p-0 gap-0">
            {[{ value: 'chat', icon: MessageSquare, label: 'Chat' }, { value: 'media', icon: Image, label: 'Media' }].map(({ value, icon: Icon, label }) => (
              <TabsTrigger key={value} value={value} className="data-[state=active]:bg-transparent data-[state=active]:text-amber-400 data-[state=active]:border-b-2 data-[state=active]:border-amber-400 rounded-none px-4 py-3 text-slate-400 gap-2"><Icon className="w-4 h-4" /> {label}</TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="chat" className="flex-1 m-0"><FolderChat projectId={projectId} folderId={folderId} /></TabsContent>
        <TabsContent value="media" className="flex-1 m-0 overflow-y-auto"><FolderMedia projectId={projectId} folderId={folderId} /></TabsContent>
      </Tabs>
    </div>
  );
}
