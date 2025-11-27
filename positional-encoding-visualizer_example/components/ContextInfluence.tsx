import React, { useState, useMemo } from 'react';
import { AnalysisResult } from '../types';
import { cosineSimilarity } from '../utils/math';

interface Props {
  result: AnalysisResult;
}

const ContextInfluence: React.FC<Props> = ({ result }) => {
  // Find common words (case insensitive) to act as the "Focus Token" (e.g., "muerde")
  const commonTokens = useMemo(() => {
    const setB = new Set(result.tokensB.map(t => t.toLowerCase()));
    return Array.from(new Set(result.tokensA.map(t => t.toLowerCase()).filter(t => setB.has(t))));
  }, [result]);

  const [selectedToken, setSelectedToken] = useState<string>(commonTokens[0] || "");

  // Update selection if commonTokens change
  React.useEffect(() => {
    if (commonTokens.length > 0 && !commonTokens.includes(selectedToken)) {
      setSelectedToken(commonTokens[0]);
    }
  }, [commonTokens]);

  const analysis = useMemo(() => {
    if (!selectedToken) return null;

    // Helper to find the index and vector of the selected token in both phrases
    const idxA = result.tokensA.findIndex(t => t.toLowerCase() === selectedToken);
    const idxB = result.tokensB.findIndex(t => t.toLowerCase() === selectedToken);

    if (idxA === -1 || idxB === -1) return null;

    const vecA_Final = result.finalVectorsA[idxA];
    const vecB_Final = result.finalVectorsB[idxB];

    // Find distinct neighbors to compare against (e.g. "perro", "persona")
    // We combine all tokens from both phrases, exclude the selected token itself
    const allNeighbors = Array.from(new Set([
        ...result.tokensA, 
        ...result.tokensB
    ])).filter(t => t.toLowerCase() !== selectedToken);

    // Calculate similarity of SelectedToken to Neighbors in Phrase A
    const neighborsA = result.tokensA.map((t, i) => {
        if (i === idxA) return null;
        return {
            token: t,
            sim: cosineSimilarity(vecA_Final, result.finalVectorsA[i])
        };
    }).filter(x => x !== null);

    // Calculate similarity of SelectedToken to Neighbors in Phrase B
    const neighborsB = result.tokensB.map((t, i) => {
        if (i === idxB) return null;
        return {
            token: t,
            sim: cosineSimilarity(vecB_Final, result.finalVectorsB[i])
        };
    }).filter(x => x !== null);

    return {
        idxA, idxB, neighborsA, neighborsB
    };

  }, [selectedToken, result]);

  if (!selectedToken || !analysis) return null;

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-indigo-500/50 shadow-lg">
      <div className="flex justify-between items-start mb-6">
        <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-amber-400">⚡</span> Context Influence Analyzer
            </h3>
            <p className="text-slate-400 text-sm mt-1">
                Select a word to see who it "listens to" (pays attention to) in each phrase.
            </p>
        </div>
        <select 
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="bg-slate-900 border border-slate-600 text-white rounded px-3 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
        >
            {commonTokens.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Phrase A Column */}
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <h4 className="text-indigo-400 font-bold mb-3 text-sm uppercase tracking-wide">
                Phrase A: "{result.tokensA.join(" ")}"
            </h4>
            <div className="text-center mb-4">
                <span className="text-2xl font-bold text-white block">{selectedToken}</span>
                <span className="text-xs text-slate-500">Position {analysis.idxA + 1}</span>
            </div>
            
            <div className="space-y-3">
                <p className="text-xs text-slate-400">Proximity to neighbors (Attended):</p>
                {analysis.neighborsA!.map((n, i) => (
                    <div key={i} className="relative group">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-slate-300">{n!.token}</span>
                            <span className="font-mono text-indigo-300">{n!.sim.toFixed(3)}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div 
                                className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${Math.max(0, n!.sim * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Phrase B Column */}
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <h4 className="text-emerald-400 font-bold mb-3 text-sm uppercase tracking-wide">
                Phrase B: "{result.tokensB.join(" ")}"
            </h4>
            <div className="text-center mb-4">
                <span className="text-2xl font-bold text-white block">{selectedToken}</span>
                <span className="text-xs text-slate-500">Position {analysis.idxB + 1}</span>
            </div>

            <div className="space-y-3">
                <p className="text-xs text-slate-400">Proximity to neighbors (Attended):</p>
                {analysis.neighborsB!.map((n, i) => (
                    <div key={i} className="relative group">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-slate-300">{n!.token}</span>
                            <span className="font-mono text-emerald-300">{n!.sim.toFixed(3)}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div 
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${Math.max(0, n!.sim * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded text-amber-200 text-xs flex items-center gap-2">
        <span className="text-xl">💡</span>
        <span>
            <strong>Interpretation:</strong> If "{selectedToken}" has higher similarity to "perro" in Phrase A than in Phrase B, 
            it means the <em>positional context</em> of Phrase A made the model associate "{selectedToken}" more closely with "perro".
        </span>
      </div>
    </div>
  );
};

export default ContextInfluence;