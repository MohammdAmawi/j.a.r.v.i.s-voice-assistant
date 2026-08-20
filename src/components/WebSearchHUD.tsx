import React, { useState } from 'react';
import { Globe, Search, ExternalLink, Sparkles, Compass, CheckCircle2 } from 'lucide-react';
import { soundFx } from '../audio/soundFx';

interface WebSearchHUDProps {
  onSearch: (query: string) => Promise<any>;
}

export const WebSearchHUD: React.FC<WebSearchHUDProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('Latest advancements in quantum computing and local AI assistants');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);

  const handleSearch = async (eOrQuery?: React.FormEvent | string) => {
    if (eOrQuery && typeof eOrQuery !== 'string') eOrQuery.preventDefault();
    const searchTerm = typeof eOrQuery === 'string' ? eOrQuery : query;
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    soundFx.playScanChirp();

    try {
      const res = await onSearch(searchTerm.trim());
      soundFx.playConfirmSound();
      setSearchResult(res);
    } catch (e: any) {
      soundFx.playErrorAlert();
    } finally {
      setIsSearching(false);
    }
  };

  const sampleQueries = [
    'What is the latest Node.js LTS release?',
    'How to securely execute child_process in Electron/Node?',
    'Best practices for Web Speech API continuous listening',
    'OpenAI vs Claude vs Gemini 3.7 Flash latency benchmark',
  ];

  return (
    <div className="w-full flex flex-col gap-5 text-slate-200">
      
      {/* Search Input Bar */}
      <div className="hud-panel rounded p-4 border border-cyan-500/30">
        <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <h3 className="font-orbitron text-xs font-bold tracking-wider text-cyan-300">
              REAL-TIME WEB INTELLIGENCE SEARCH
            </h3>
          </div>
          <span className="text-[10px] font-mono-cyber text-slate-400">
            Grounding & Global Crawl
          </span>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter search query or ask Jarvis: 'Jarvis, search the web for...' "
              className="w-full bg-black/60 border border-cyan-800 rounded pl-9 pr-3 py-2 text-xs font-mono-cyber text-cyan-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold rounded font-orbitron text-xs tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.4)]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isSearching ? 'SCANNING...' : 'SEARCH INTEL'}
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="mt-3 flex items-center flex-wrap gap-1.5 font-mono-cyber text-[10px]">
          <span className="text-slate-500 mr-1">SUGGESTIONS:</span>
          {sampleQueries.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSearch(q)}
              className="px-2 py-0.5 rounded bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/40 text-cyan-300 transition-all text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Results View */}
      {searchResult && (
        <div className="hud-panel rounded p-5 border border-cyan-500/40 font-mono-cyber text-xs">
          <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-cyan-200">
                INTELLIGENCE SYNTHESIS FOR: "{query}"
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              Source: Gemini Neural Grounding
            </span>
          </div>

          <div className="bg-black/40 rounded p-4 border border-cyan-900/40 text-cyan-100 leading-relaxed text-sm whitespace-pre-wrap">
            {searchResult.speechResponse || searchResult.answer || 'Query completed.'}
          </div>
        </div>
      )}

    </div>
  );
};
