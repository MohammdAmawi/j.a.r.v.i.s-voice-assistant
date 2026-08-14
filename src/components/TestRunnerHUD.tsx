import React, { useState } from 'react';
import { FlaskConical, Play, CheckCircle2, XCircle, Clock, ShieldCheck, RefreshCw, Sparkles } from 'lucide-react';
import { TestResultItem } from '../types';
import { soundFx } from '../audio/soundFx';

interface TestRunnerHUDProps {
  onRunTests: () => Promise<any>;
}

export const TestRunnerHUD: React.FC<TestRunnerHUDProps> = ({ onRunTests }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<{
    suite: string;
    totalTests: number;
    passed: number;
    failed: number;
    durationMs: number;
    timestamp: string;
    tests: TestResultItem[];
  } | null>(null);

  const handleRunAllTests = async () => {
    setIsRunning(true);
    soundFx.playScanChirp();

    try {
      const data = await onRunTests();
      soundFx.playConfirmSound();
      setTestResults(data);
      setIsRunning(false);
    } catch (e) {
      soundFx.playErrorAlert();
      setIsRunning(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 text-slate-200">
      
      {/* Top Test Controller Header */}
      <div className="hud-panel rounded p-4 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-cyan-400" />
            <h3 className="font-orbitron text-xs font-bold tracking-wider text-cyan-300">
              J.A.R.V.I.S AUTOMATED UNIT & INTEGRATION TEST SUITE
            </h3>
          </div>
          <p className="text-[11px] font-mono-cyber text-slate-400 mt-0.5">
            Validating OS Shell execution, File I/O persistence, Long-term memory store, and AI routing.
          </p>
        </div>

        <button
          onClick={handleRunAllTests}
          disabled={isRunning}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold rounded font-orbitron text-xs tracking-wider flex items-center gap-2 transition-all shadow-[0_0_12px_rgba(6,182,212,0.4)] shrink-0"
        >
          {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isRunning ? 'RUNNING SUITE...' : 'EXECUTE ALL TESTS'}</span>
        </button>
      </div>

      {/* Summary Scoreboard */}
      {testResults && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono-cyber text-xs">
          <div className="p-3 rounded bg-black/50 border border-cyan-900/60">
            <div className="text-slate-400 text-[10px]">TOTAL TESTS</div>
            <div className="font-orbitron text-lg font-bold text-cyan-300 mt-0.5">
              {testResults.totalTests}
            </div>
          </div>

          <div className="p-3 rounded bg-black/50 border border-emerald-900/60">
            <div className="text-slate-400 text-[10px]">PASSED</div>
            <div className="font-orbitron text-lg font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {testResults.passed}
            </div>
          </div>

          <div className="p-3 rounded bg-black/50 border border-rose-900/60">
            <div className="text-slate-400 text-[10px]">FAILED</div>
            <div className="font-orbitron text-lg font-bold text-slate-400 mt-0.5">
              {testResults.failed}
            </div>
          </div>

          <div className="p-3 rounded bg-black/50 border border-cyan-900/60">
            <div className="text-slate-400 text-[10px]">DURATION</div>
            <div className="font-orbitron text-lg font-bold text-cyan-300 mt-0.5 flex items-center gap-1">
              <Clock className="w-4 h-4 text-cyan-400" />
              {testResults.durationMs} ms
            </div>
          </div>
        </div>
      )}

      {/* Test List Table */}
      <div className="hud-panel rounded p-4 border border-cyan-500/30">
        <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-3">
          <span className="font-orbitron text-xs font-semibold text-cyan-300">
            TEST SPECIFICATIONS & ASSERTIONS
          </span>
          <span className="text-[10px] font-mono-cyber text-slate-400">
            Node.js / Express API Bridge
          </span>
        </div>

        <div className="space-y-2 font-mono-cyber text-xs max-h-80 overflow-y-auto pr-1">
          {(!testResults || !testResults.tests) ? (
            <div className="p-8 text-center text-slate-500 italic">
              Click "Execute All Tests" to run end-to-end unit & integration verification.
            </div>
          ) : (
            testResults.tests.map((test) => (
              <div
                key={test.id}
                className="p-3 rounded bg-black/40 hover:bg-cyan-950/40 border border-cyan-900/40 flex items-start justify-between gap-3 transition-all"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-bold text-cyan-200">{test.name}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-cyan-400">
                      {test.category}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] pl-5">
                    {test.details}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-500">{test.durationMs}ms</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/60">
                    PASS
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
