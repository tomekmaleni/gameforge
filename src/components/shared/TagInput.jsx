import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';

export default function TagInput({ value, onChange, allTags = [], placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);

  const getCurrentWord = (val) => { const parts = val.split(','); return parts[parts.length - 1].trim(); };

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    const current = getCurrentWord(val);
    if (current.length >= 1) {
      const filtered = allTags.filter(t => t.toLowerCase().startsWith(current.toLowerCase()) && t.toLowerCase() !== current.toLowerCase());
      setSuggestions(filtered.slice(0, 6));
    } else { setSuggestions([]); }
  };

  const selectSuggestion = (tag) => {
    const parts = value.split(',');
    parts[parts.length - 1] = ' ' + tag;
    onChange(parts.join(',').replace(/^,\s*/, ''));
    setSuggestions([]);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <Input ref={inputRef} value={value} onChange={handleChange} onBlur={() => setTimeout(() => setSuggestions([]), 150)} placeholder={placeholder || 'tag1, tag2...'} className="bg-slate-800 border-slate-700" />
      {suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          {suggestions.map(tag => (
            <button key={tag} onMouseDown={() => selectSuggestion(tag)} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-amber-400 transition-colors">#{tag}</button>
          ))}
        </div>
      )}
    </div>
  );
}
