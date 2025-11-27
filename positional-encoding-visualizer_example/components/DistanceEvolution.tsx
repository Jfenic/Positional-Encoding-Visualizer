import React, { useMemo } from 'react';
import { AnalysisResult } from '../types';
import { cosineSimilarity } from '../utils/math';

interface Props {
  result: AnalysisResult;
}

interface DistancePair {
  tokenA: string;
  posA: number;
  sourceA: 'A' | 'B';
  tokenB: string;
  posB: number;
  sourceB: 'A' | 'B';
  baseSim: number;
  finalSim: number;
  delta: number;
}

const DistanceEvolution: React.FC<Props> = ({ result }) => {
  const { pcaData } = result;

  const pairs = useMemo(() => {
    // Extract distinct nodes (we need base vector and attention vector for each "token instance")
    const instances: { 
        id: string; // unique key
        token: string; 
        pos: number; 
        source: 'A' | 'B'; 
        baseVec: number[]; 
        attnVec: number[] 
    }[] = [];

    // Helper to find vectors in the flat list
    const findVec = (type: 'base' | 'attention', pos: number, source: 'A'|'B') => 
        pcaData.find(d => d.type === type && d.position === pos && d.sourceId === source)?.vector;

    // Build concise list of word instances
    // We iterate specific PCA data or reconstructed from tokens inputs
    // Let's iterate unique positions based on pcaData
    pcaData.filter(d => d.type === 'attention').forEach(d => {
        const baseVec = findVec('base', d.position, d.sourceId);
        if (baseVec) {
            instances.push({
                id: `${d.sourceId}-${d.position}`,
                token: d.token,
                pos: d.position,
                source: d.sourceId,
                baseVec: baseVec,
                attnVec: d.vector
            });
        }
    });

    const calculatedPairs: DistancePair[] = [];

    // Compare every instance with every other instance (Triangle matrix to avoid duplicates)
    for (let i = 0; i < instances.length; i++) {
        for (let j = i + 1; j < instances.length; j++) {
            const A = instances[i];
            const B = instances[j];

            const baseSim = cosineSimilarity(A.baseVec, B.baseVec);
            const finalSim = cosineSimilarity(A.attnVec, B.attnVec);

            calculatedPairs.push({
                tokenA: A.token, posA: A.pos, sourceA: A.source,
                tokenB: B.token, posB: B.pos, sourceB: B.source,
                baseSim,
                finalSim,
                delta: finalSim - baseSim
            });
        }
    }

    // Sort by most significant change (absolute delta)
    return calculatedPairs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 10); // Top 10 interesting changes
  }, [pcaData]);

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
      <h3 className="text-xl font-semibold text-white mb-2">Distance Evolution Analysis</h3>
      <p className="text-slate-400 text-sm mb-4">
        See how the Model + Position "moves" words closer or further apart compared to their original raw meaning.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-700">
            <tr>
              <th className="p-3">Pair of Words</th>
              <th className="p-3">Original Similarity</th>
              <th className="p-3">Final Similarity</th>
              <th className="p-3">Effect</th>
            </tr>
          </thead>
          <tbody className="text-slate-200 divide-y divide-slate-700/50">
            {pairs.map((p, idx) => (
              <tr key={idx} className="hover:bg-slate-700/20">
                <td className="p-3">
                  <div className="flex flex-col">
                    <span className="font-bold flex items-center gap-2">
                        <span className={`text-xs px-1.5 rounded ${p.sourceA === 'A' ? 'bg-indigo-900 text-indigo-300' : 'bg-emerald-900 text-emerald-300'}`}>
                            {p.sourceA}
                        </span> 
                        {p.tokenA}
                        <span className="text-slate-500 text-xs mx-1">vs</span>
                        <span className={`text-xs px-1.5 rounded ${p.sourceB === 'A' ? 'bg-indigo-900 text-indigo-300' : 'bg-emerald-900 text-emerald-300'}`}>
                            {p.sourceB}
                        </span> 
                        {p.tokenB}
                    </span>
                  </div>
                </td>
                <td className="p-3 font-mono text-slate-400">
                    {p.baseSim.toFixed(3)}
                </td>
                <td className="p-3 font-mono text-white font-bold">
                    {p.finalSim.toFixed(3)}
                </td>
                <td className="p-3">
                    {p.delta > 0.05 ? (
                        <span className="text-emerald-400 text-xs uppercase font-bold tracking-wide">Converged (+{p.delta.toFixed(2)})</span>
                    ) : p.delta < -0.05 ? (
                         <span className="text-rose-400 text-xs uppercase font-bold tracking-wide">Diverged ({p.delta.toFixed(2)})</span>
                    ) : (
                        <span className="text-slate-500 text-xs">Stable</span>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DistanceEvolution;