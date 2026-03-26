import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Database, BookOpen, Image, FolderOpen, MessageSquare, Lightbulb } from 'lucide-react';

export default function ProjectSearch() {
  const { projectId } = useParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const q = query.toLowerCase();
    const [entries, media, wikiPages, folders, ideas, messages] = await Promise.all([
      base44.entities.GameEntry.filter({ project_id: projectId }),
      base44.entities.MediaItem.filter({ project_id: projectId }),
      base44.entities.LorePage.filter({ project_id: projectId }),
      base44.entities.Folder.filter({ project_id: projectId }),
      base44.entities.Idea.filter({ project_id: projectId }),
      base44.entities.ChatMessage.filter({ project_id: projectId }),
    ]);
    setResults({
      entries: entries.filter(e => e.name?.toLowerCase().includes(q) || JSON.stringify(e.data || {}).toLowerCase().includes(q) || (e.tags || []).some(t => t.toLowerCase().includes(q))),
      media: media.filter(m => m.title?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q) || (m.tags || []).some(t => t.toLowerCase().includes(q))),
      wiki: wikiPages.filter(p => p.title?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q))),
      folders: folders.filter(f => f.name?.toLowerCase().includes(q)),
      ideas: ideas.filter(i => i.title?.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)),
      messages: messages.filter(m => m.content?.toLowerCase().includes(q)),
    });
    setSearching(false);
  };

  const total = results ? Object.values(results).reduce((a, b) => a + b.length, 0) : 0;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 mb-6"><Search className="w-5 h-5 text-amber-400" /> Search</h1>
      <div className="flex gap-2 mb-8">
        <Input placeholder="Search across everything..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="bg-slate-800 border-slate-700 text-lg" />
        <button onClick={handleSearch} disabled={searching} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-medium text-sm">{searching ? '...' : 'Search'}</button>
      </div>
      {results && (
        <div className="space-y-6">
          <p className="text-sm text-slate-400">{total} results found</p>
          {[
            { key: 'entries', title: 'Database Entries', icon: Database, render: (e) => <ResultItem key={e.id} label={e.name} sub={e.data?.Type} link={`/project/${projectId}/database`} tags={e.tags} /> },
            { key: 'wiki', title: 'Wiki Pages', icon: BookOpen, render: (p) => <ResultItem key={p.id} label={p.title} link={`/project/${projectId}/wiki`} tags={p.tags} /> },
            { key: 'media', title: 'Media', icon: Image, render: (m) => <ResultItem key={m.id} label={m.title} sub={m.description} link={`/project/${projectId}/media`} tags={m.tags} /> },
            { key: 'folders', title: 'Folders', icon: FolderOpen, render: (f) => <ResultItem key={f.id} label={f.name} link={`/project/${projectId}/folders/${f.id}`} /> },
            { key: 'ideas', title: 'Ideas', icon: Lightbulb, render: (i) => <ResultItem key={i.id} label={i.title} sub={i.description} link={`/project/${projectId}/ideas`} /> },
            { key: 'messages', title: 'Chat Messages', icon: MessageSquare, render: (m) => <ResultItem key={m.id} label={`"${m.content?.substring(0, 80)}..."`} sub={m.sender_name} link={`/project/${projectId}/folders/${m.folder_id}`} /> },
          ].map(({ key, title, icon: Icon, render }) => results[key]?.length > 0 && (
            <div key={key}>
              <div className="flex items-center gap-2 mb-2"><Icon className="w-4 h-4 text-slate-400" /><span className="font-semibold text-sm">{title}</span><Badge variant="outline" className="text-xs border-slate-700 text-slate-500">{results[key].length}</Badge></div>
              <div className="space-y-1">{results[key].map(render)}</div>
            </div>
          ))}
          {total === 0 && <p className="text-slate-500 text-center py-8">No results found for "{query}"</p>}
        </div>
      )}
    </div>
  );
}

function ResultItem({ label, sub, link, tags }) {
  return (
    <Link to={link} className="block bg-slate-900 border border-slate-800 rounded-lg p-3 hover:border-amber-500/30 transition-all">
      <p className="text-sm font-medium">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      {tags?.length > 0 && (<div className="flex flex-wrap gap-1 mt-1">{tags.map(t => <span key={t} className="text-xs text-amber-400/60">#{t}</span>)}</div>)}
    </Link>
  );
}
