import React, { useState } from 'react';
import { Brain, Plus, Trash2, ShieldCheck, Database, Key, Sparkles } from 'lucide-react';
import { MemoryEntry } from '../types';
import { soundFx } from '../audio/soundFx';

interface MemoryHUDProps {
  memories: MemoryEntry[];
  onAddMemory: (entry: { key: string; value: string; category: 'preference' | 'fact' | 'system' | 'session' }) => Promise<any>;
  onDeleteMemory: (id: string) => Promise<any>;
}

export const MemoryHUD: React.FC<MemoryHUDProps> = ({
  memories,
  onAddMemory,
  onDeleteMemory,
}) => {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState<'preference' | 'fact' | 'system' | 'session'>('preference');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !value.trim()) return;

    setIsSubmitting(true);
    soundFx.playScanChirp();

    try {
      await onAddMemory({
        key: key.trim(),
        value: value.trim(),
        category,
      });
      soundFx.playConfirmSound();
      setKey('');
      setValue('');
      setIsSubmitting(false);
    } catch (e) {
      soundFx.playErrorAlert();
      setIsSubmitting(false);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'preference':
        return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case 'system':
        return 'bg-blue-950/80 text-blue-300 border-blue-800';
      case 'session':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      case 'fact':
      default:
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800';
    }
  };

  return (
    <div className="w-full flex flex-col gap-5 text-slate-200">
      
      {/* Grid: Add Memory Form + Memory Database Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Form to inject new memory */}
        <div className="hud-panel rounded p-4 border border-cyan-500/30">
          <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              <h3 className="font-orbitron text-xs font-bold tracking-wider text-cyan-300">
                STORE NEW MEMORY CONTEXT
              </h3>
            </div>
            <Database className="w-3.5 h-3.5 text-cyan-500" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 font-mono-cyber text-xs">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">MEMORY KEY / IDENTIFIER</label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="e.g. user_project_deadline, favorite_editor"
                className="w-full bg-black/60 border border-cyan-800 rounded px-2.5 py-1.5 text-cyan-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1">CATEGORY</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-black/80 border border-cyan-800 rounded px-2 py-1.5 text-cyan-100 focus:outline-none focus:border-cyan-400"
              >
                <option value="preference">User Preference</option>
                <option value="fact">Fact / Knowledge</option>
                <option value="session">Active Session State</option>
                <option value="system">System Directive</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1">RETAINED VALUE</label>
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={3}
                placeholder="e.g. Always generate code in TypeScript with strict null checks."
                className="w-full bg-black/60 border border-cyan-800 rounded p-2 text-cyan-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold rounded font-orbitron text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.4)]"
            >
              <Brain className="w-3.5 h-3.5" />
              {isSubmitting ? 'COMMITTING...' : 'COMMIT TO LONG-TERM MEMORY'}
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-cyan-900/60 text-[10px] font-mono-cyber text-slate-400">
            Memories are auto-injected into Jarvis's neural prompts across all sessions.
          </div>
        </div>

        {/* Memory Database Table (2 Columns) */}
        <div className="lg:col-span-2 hud-panel rounded p-4 border border-cyan-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <h3 className="font-orbitron text-xs font-bold tracking-wider text-cyan-300">
                  ACTIVE LONG-TERM MEMORY STORE ({memories.length} ENTRIES)
                </h3>
              </div>
              <span className="text-[10px] font-mono-cyber text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                PERSISTED JSON / SQLITE
              </span>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 font-mono-cyber text-xs">
              {memories.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic">
                  Memory database empty. Add entries on the left or tell Jarvis: "Remember that my favourite stack is React + Express".
                </div>
              ) : (
                memories.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-3 rounded bg-black/40 hover:bg-cyan-950/40 border border-cyan-900/40 flex items-start justify-between gap-3 transition-all"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="font-bold text-cyan-200 truncate">
                          {mem.key}
                        </span>
                        <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded border ${getCategoryBadge(mem.category)}`}>
                          {mem.category}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] pl-5">
                        {mem.value}
                      </p>
                      <div className="text-[9px] text-slate-500 pl-5">
                        Updated: {new Date(mem.updatedAt).toLocaleDateString()} at {new Date(mem.updatedAt).toLocaleTimeString()}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        soundFx.playHudClick();
                        onDeleteMemory(mem.id);
                      }}
                      title="Purge Memory"
                      className="p-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-400 text-xs shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-cyan-900/60 text-[10px] font-mono-cyber text-slate-400 flex items-center justify-between">
            <span>Context Retention Protocol: Active</span>
            <span>Storage file: /jarvis_storage/memory.json</span>
          </div>
        </div>

      </div>

    </div>
  );
};
