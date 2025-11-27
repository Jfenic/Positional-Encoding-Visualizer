
import React, { useState } from 'react';
import { AnalysisResult, CosineComparison } from '../types';
import { cosineSimilarity } from '../utils/math';

interface Props {
  result: AnalysisResult;
}

const SimilarityAnalysis: React.FC<Props> = ({ result }) => {
  const { tokensA, tokensB, finalVectorsA, finalVectorsB, sentenceSimilarity } = result;
  const [showMath, setShowMath] = useState(true);

  const comparisons: CosineComparison[] = [];

  // Compare repeated words WITHIN phrase A
  tokensA.forEach((token, i) => {
    for (let j = i + 1; j < tokensA.length; j++) {
      if (tokensA[j] === token) {
         comparisons.push({
            tokenA: token, posA: i, sourceA: 'A',
            tokenB: tokensA[j], posB: j, sourceB: 'A',
            similarity: cosineSimilarity(finalVectorsA[i], finalVectorsA[j])
         });
      }
    }
  });

  // Compare repeated words WITHIN phrase B
  tokensB.forEach((token, i) => {
    for (let j = i + 1; j < tokensB.length; j++) {
      if (tokensB[j] === token) {
         comparisons.push({
            tokenA: token, posA: i, sourceA: 'B',
            tokenB: tokensB[j], posB: j, sourceB: 'B',
            similarity: cosineSimilarity(finalVectorsB[i], finalVectorsB[j])
         });
      }
    }
  });

  // Compare same words ACROSS phrases (A vs B)
  tokensA.forEach((tA, i) => {
    tokensB.forEach((tB, j) => {
      if (tA === tB) {
        comparisons.push({
            tokenA: tA, posA: i, sourceA: 'A',
            tokenB: tB, posB: j, sourceB: 'B',
            similarity: cosineSimilarity(finalVectorsA[i], finalVectorsB[j])
        });
      }
    });
  });

  return (
    <div className="space-y-6">
      
      {/* EDUCATIONAL: COSINE SIMILARITY EXPLAINER */}
      <div className="bg-slate-900/80 p-6 rounded-xl border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="2">
                <path d="M10,90 L90,90" />
                <path d="M10,90 L70,30" />
                <path d="M30,80 A 20 20 0 0 1 45 75" />
            </svg>
        </div>
        
        <div className="flex justify-between items-start">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-xl">📐</span> 
                How is "Similarity" Calculated?
            </h3>
            <button onClick={() => setShowMath(!showMath)} className="text-xs text-indigo-400 hover:text-indigo-300 underline">
                {showMath ? 'Hide Math' : 'Show Math'}
            </button>
        </div>

        {showMath && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                    <p className="text-slate-300 mb-2">
                        We use <strong className="text-white">Cosine Similarity</strong>. It measures the cosine of the angle between two vectors in multi-dimensional space.
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-400">
                        <li><strong className="text-emerald-400">1.0</strong>: Identical direction (0° angle).</li>
                        <li><strong className="text-slate-200">0.0</strong>: Orthogonal (90° angle, completely unrelated).</li>
                        <li><strong className="text-rose-400">-1.0</strong>: Opposite direction (180° angle).</li>
                    </ul>
                </div>
                <div className="bg-black/40 p-3 rounded border border-slate-700 font-mono text-center flex flex-col justify-center">
                    <div className="text-lg text-white mb-2">
                        Similarity(A, B) = <span className="fraction inline-block align-middle mx-1">
                            <span className="block border-b border-white/30 pb-1">A · B</span>
                            <span className="block pt-1 text-xs text-slate-400">||A|| ||B||</span>
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                        (Dot Product divided by magnitude)
                    </p>
                </div>
            </div>
        )}
      </div>

      {/* Global Sentence Similarity */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="bg-gradient-to-b from-indigo-500 to-emerald-500 w-1 h-6 rounded"></span>
          Sentence Similarity
        </h3>
        <div className="flex items-center gap-6">
          <div className="flex-1">
             <div className="text-sm text-slate-400 mb-1">Mean Vector Comparison</div>
             <div className="text-4xl font-mono font-bold text-white">
               {sentenceSimilarity.toFixed(4)}
             </div>
             
             {/* Similarity Spectrum Bar */}
             <div className="mt-3 w-full h-2 bg-slate-700 rounded-full relative">
                 <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 rounded-full" style={{ width: '100%' }}></div>
                 <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-slate-800 shadow-md transition-all duration-500" style={{ left: `${Math.max(0, Math.min(100, sentenceSimilarity * 100))}%` }}></div>
             </div>
             <div className="flex justify-between text-[10px] text-slate-500 mt-1 uppercase font-bold">
                 <span>Unrelated</span>
                 <span>Identical</span>
             </div>
          </div>
          
          <div className="flex-1 text-sm text-slate-400 border-l border-slate-700 pl-6">
            {sentenceSimilarity > 0.98 ? (
              <p className="text-amber-400">Almost Identical. <br/>These phrases map to nearly the same point in space.</p>
            ) : sentenceSimilarity > 0.85 ? (
              <p className="text-emerald-400">High Similarity. <br/>The content is semantically very close.</p>
            ) : sentenceSimilarity > 0.70 ? (
              <p className="text-blue-300">Moderate Similarity. <br/>Likely share a topic but different details.</p>
            ) : (
              <p className="text-slate-400">Distinct Vectors. <br/>The model sees these as different meanings.</p>
            )}
          </div>
        </div>
      </div>

      {/* Token Comparison Table */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Token-Level Analysis</h3>
        
        {comparisons.length > 0 ? (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Comparing instances of the same word. Note how position alters the vector.
            </p>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-800">
                  <tr className="text-slate-400 border-b border-slate-700 uppercase tracking-wider">
                    <th className="p-3">Word</th>
                    <th className="p-3">Source 1</th>
                    <th className="p-3">Source 2</th>
                    <th className="p-3">Similarity</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {comparisons.map((comp, i) => (
                    <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="p-3 font-bold">{comp.tokenA}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${comp.sourceA === 'A' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          Phrase {comp.sourceA} (pos {comp.posA})
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${comp.sourceB === 'A' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          Phrase {comp.sourceB} (pos {comp.posB})
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold">
                        <span className={`${comp.similarity < 0.999 ? 'text-blue-400' : 'text-slate-500'}`}>
                          {comp.similarity.toFixed(4)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 italic">No common words found to compare.</p>
        )}
      </div>
    </div>
  );
};

export default SimilarityAnalysis;
