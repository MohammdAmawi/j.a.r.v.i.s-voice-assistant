import React, { useState } from 'react';
import { Folder, FileText, Download, Trash2, Plus, Sparkles, Check, FileDown, Copy } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { GeneratedDocument } from '../types';
import { soundFx } from '../audio/soundFx';

interface FileManagerHUDProps {
  documents: GeneratedDocument[];
  onSaveDocument: (doc: { title: string; content: string; format: 'md' | 'txt' | 'json' | 'pdf' }) => Promise<any>;
  onDeleteDocument: (id: string) => Promise<any>;
}

export const FileManagerHUD: React.FC<FileManagerHUDProps> = ({
  documents,
  onSaveDocument,
  onDeleteDocument,
}) => {
  const [title, setTitle] = useState('Jarvis_Executive_Report');
  const [format, setFormat] = useState<'md' | 'txt' | 'json' | 'pdf'>('md');
  const [content, setContent] = useState(
    `# J.A.R.V.I.S Intelligence Briefing\n\nDate: ${new Date().toLocaleDateString()}\nStatus: All core microservices active.\n\n## Summary\n- Pro-Tier OS Control initiated.\n- Continuous voice recognition calibrated.\n- Direct local filesystem storage active.`
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsGenerating(true);
    soundFx.playScanChirp();

    try {
      await onSaveDocument({
        title: title.trim(),
        content: content.trim(),
        format,
      });
      soundFx.playConfirmSound();
    } catch (err) {
      soundFx.playErrorAlert();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadLocal = (doc: GeneratedDocument) => {
    soundFx.playConfirmSound();

    if (doc.format === 'pdf') {
      // Generate actual PDF via jsPDF
      const pdf = new jsPDF();
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text(doc.title.replace(/\.[^/.]+$/, ''), 20, 20);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);

      const splitLines = pdf.splitTextToSize(doc.content, 170);
      pdf.text(splitLines, 20, 35);

      pdf.save(doc.filename.endsWith('.pdf') ? doc.filename : `${doc.filename}.pdf`);
    } else {
      // Direct text/md/json download
      const mime = doc.format === 'json' ? 'application/json' : 'text/plain';
      const blob = new Blob([doc.content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleCopyContent = (doc: GeneratedDocument) => {
    navigator.clipboard.writeText(doc.content);
    setCopiedId(doc.id);
    soundFx.playHudClick();
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full flex flex-col gap-5 text-slate-200">
      
      {/* Dynamic Document Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Editor Form */}
        <div className="hud-panel rounded p-4 border border-cyan-500/30">
          <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              <h3 className="font-orbitron text-xs font-bold tracking-wider text-cyan-300">
                DYNAMIC DOCUMENT WRITER (FS ENGINE)
              </h3>
            </div>
            <span className="text-[10px] font-mono-cyber text-slate-400">
              Direct Desktop Persistence
            </span>
          </div>

          <form onSubmit={handleCreateDocument} className="space-y-3 font-mono-cyber text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-400 mb-1">DOCUMENT TITLE</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/60 border border-cyan-800 rounded px-2.5 py-1.5 text-cyan-200 focus:outline-none focus:border-cyan-400"
                  placeholder="e.g. Project_Report"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">FORMAT</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full bg-black/80 border border-cyan-800 rounded px-2 py-1.5 text-cyan-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="md">Markdown (.md)</option>
                  <option value="txt">Plain Text (.txt)</option>
                  <option value="pdf">PDF Document (.pdf)</option>
                  <option value="json">JSON Data (.json)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1">CONTENT / BODY</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={7}
                className="w-full bg-black/60 border border-cyan-800 rounded p-2.5 text-cyan-100 text-xs font-mono focus:outline-none focus:border-cyan-400"
                placeholder="Enter document text or ask Jarvis verbally to write..."
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400">
                Target: /jarvis_storage/{title}.{format}
              </span>
              <button
                type="submit"
                disabled={isGenerating}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold rounded font-orbitron text-xs tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.4)]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGenerating ? 'WRITING...' : 'SAVE & GENERATE'}
              </button>
            </div>
          </form>
        </div>

        {/* Saved Files Directory Table */}
        <div className="hud-panel rounded p-4 border border-cyan-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-cyan-400" />
                <h3 className="font-orbitron text-xs font-bold tracking-wider text-cyan-300">
                  PERSISTED DOCUMENTS ({documents.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono-cyber text-cyan-400">
                LOCAL DISK
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1 font-mono-cyber text-xs">
              {documents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic">
                  No documents created yet. Generate one above or ask Jarvis: "Draft an executive briefing".
                </div>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2.5 rounded bg-black/40 hover:bg-cyan-950/40 border border-cyan-900/40 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-cyan-200 truncate">
                          {doc.filename}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span>{new Date(doc.createdAt).toLocaleTimeString()}</span>
                          <span>•</span>
                          <span>{doc.sizeBytes} B</span>
                          <span className="uppercase text-cyan-400">[{doc.format}]</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleCopyContent(doc)}
                        title="Copy Content"
                        className="p-1.5 rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-xs"
                      >
                        {copiedId === doc.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => handleDownloadLocal(doc)}
                        title="Download to Desktop"
                        className="p-1.5 rounded bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/60 text-cyan-200 text-xs flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="text-[10px] hidden sm:inline">DOWNLOAD</span>
                      </button>

                      <button
                        onClick={() => onDeleteDocument(doc.id)}
                        title="Delete Document"
                        className="p-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-400 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-cyan-900/60 text-[10px] font-mono-cyber text-slate-400">
            Files stored locally in root directory and downloadable anytime in TXT, MD, PDF, JSON formats.
          </div>
        </div>

      </div>

    </div>
  );
};
