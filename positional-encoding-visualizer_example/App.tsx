
import React, { useState, useEffect } from 'react';
import { D_MODEL, getPositionalEncoding, addVectors, scaleVector, computePCA, getMeanVector, cosineSimilarity, runSelfAttentionBlock, getRealEmbeddings } from './utils/math';
import { VectorData, AnalysisResult } from './types';
import PositionalEncodingChart from './components/PositionalEncodingChart';
import SimilarityAnalysis from './components/SimilarityAnalysis';
import DistanceEvolution from './components/DistanceEvolution';
import ContextInfluence from './components/ContextInfluence';
import AttentionMatrixView from './components/AttentionMatrixView';
import TheoryView from './components/TheoryView';

const App: React.FC = () => {
  const [phraseA, setPhraseA] = useState<string>("dog bites human");
  const [phraseB, setPhraseB] = useState<string>("human bites dog");
  
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelStatus, setModelStatus] = useState<string>("");

  // Tab State
  const [activeTab, setActiveTab] = useState<'viz' | 'matrix' | 'theory'>('viz');

  const processInput = async () => {
    setIsProcessing(true);
    setModelStatus("Loading HF Model (Quantized)...");

    try {
        // Fetch Real Embeddings (Async)
        const rawVectorsA = await getRealEmbeddings(phraseA);
        const tokensA = phraseA.trim().split(/\s+/).filter(t => t.length > 0);
        const vecsA = rawVectorsA.slice(0, tokensA.length); 

        const rawVectorsB = await getRealEmbeddings(phraseB);
        const tokensB = phraseB.trim().split(/\s+/).filter(t => t.length > 0);
        const vecsB = rawVectorsB.slice(0, tokensB.length);

        setModelStatus("Computing Attention...");

        const pcaInputData: number[][] = [];
        
        // 1. Embedding + Positional Encoding Phase
        const tempA_Pos: { base: number[], posVec: number[], token: string, pos: number }[] = [];
        const tempB_Pos: { base: number[], posVec: number[], token: string, pos: number }[] = [];

        // Scaling Factor: In the "Attention Is All You Need" paper, embeddings are multiplied by sqrt(d_model).
        // This makes the embedding vectors significantly larger (approx ~20x) than the Positional Encoding (range -1 to 1).
        // If we don't do this, PE drowns out the semantic meaning.
        const scaleFactor = Math.sqrt(D_MODEL);

        // Phrase A Processing
        vecsA.forEach((base, pos) => {
          const scaledBase = scaleVector(base, scaleFactor);
          const pe = getPositionalEncoding(pos, D_MODEL);
          const posVec = addVectors(scaledBase, pe);
          tempA_Pos.push({ base: scaledBase, posVec, token: tokensA[pos] || "?", pos });
        });

        // Phrase B Processing
        vecsB.forEach((base, pos) => {
          const scaledBase = scaleVector(base, scaleFactor);
          const pe = getPositionalEncoding(pos, D_MODEL);
          const posVec = addVectors(scaledBase, pe);
          tempB_Pos.push({ base: scaledBase, posVec, token: tokensB[pos] || "?", pos });
        });

        // 2. Self-Attention Encoder Phase
        const inputsA = tempA_Pos.map(t => t.posVec);
        const inputsB = tempB_Pos.map(t => t.posVec);

        const resultA = runSelfAttentionBlock(inputsA);
        const resultB = runSelfAttentionBlock(inputsB);

        const attendedA = resultA.vectors;
        const attendedB = resultB.vectors;

        // Collect all vectors for global PCA
        tempA_Pos.forEach(t => pcaInputData.push(t.base));
        inputsA.forEach(v => pcaInputData.push(v));
        attendedA.forEach(v => pcaInputData.push(v));

        tempB_Pos.forEach(t => pcaInputData.push(t.base));
        inputsB.forEach(v => pcaInputData.push(v));
        attendedB.forEach(v => pcaInputData.push(v));

        // Calculate Sentence Vectors (Using the Output of the Encoder)
        const meanA = getMeanVector(attendedA);
        const meanB = getMeanVector(attendedB);
        const sentenceSimilarity = cosineSimilarity(meanA, meanB);

        // Dimensionality Reduction (PCA)
        setModelStatus("Running PCA...");
        await new Promise(r => setTimeout(r, 10));

        const coords2D = computePCA(pcaInputData);

        // Map back to VectorData structures
        const vectorData: VectorData[] = [];
        let coordIdx = 0;

        // Reconstruct Data Structure for A
        tempA_Pos.forEach((item, i) => {
          vectorData.push({
            token: item.token, position: item.pos, vector: item.base, type: 'base', coords2D: coords2D[coordIdx++], sourceId: 'A'
          });
          vectorData.push({
            token: item.token, position: item.pos, vector: inputsA[i], type: 'positional', coords2D: coords2D[coordIdx++], sourceId: 'A'
          });
          vectorData.push({
            token: item.token, position: item.pos, vector: attendedA[i], type: 'attention', coords2D: coords2D[coordIdx++], sourceId: 'A'
          });
        });

        // Reconstruct Data Structure for B
        tempB_Pos.forEach((item, i) => {
           vectorData.push({
            token: item.token, position: item.pos, vector: item.base, type: 'base', coords2D: coords2D[coordIdx++], sourceId: 'B'
          });
          vectorData.push({
            token: item.token, position: item.pos, vector: inputsB[i], type: 'positional', coords2D: coords2D[coordIdx++], sourceId: 'B'
          });
          vectorData.push({
            token: item.token, position: item.pos, vector: attendedB[i], type: 'attention', coords2D: coords2D[coordIdx++], sourceId: 'B'
          });
        });

        setAnalysisData({
          tokensA,
          tokensB,
          finalVectorsA: attendedA,
          finalVectorsB: attendedB,
          attentionMatrixA: resultA.attentionWeights,
          attentionMatrixB: resultB.attentionWeights,
          sentenceSimilarity,
          pcaData: vectorData
        });

    } catch (err) {
        console.error(err);
        setModelStatus("Error loading model.");
    } finally {
        setIsProcessing(false);
        setModelStatus("");
    }
  };

  useEffect(() => {
    processInput();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processInput();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8 font-sans">
      
      {/* HEADER */}
      <header className="max-w-7xl mx-auto mb-8 border-b border-slate-700 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 mb-2">
                Transformer Insight Lab
            </h1>
            <p className="text-slate-400">
                Visualize how <span className="text-white font-mono">Positional Encoding</span> & <span className="text-white font-mono">Self-Attention</span> reshape meaning.
            </p>
        </div>
        <div className="flex items-center gap-3">
             <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 border border-slate-700">Model: all-MiniLM-L6-v2</span>
             <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 border border-slate-700">Dim: 384</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* LEFT COLUMN: Input Control */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden">
            {isProcessing && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <span className="text-indigo-400 font-bold animate-pulse text-sm text-center px-4">{modelStatus}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="phraseA" className="block text-xs font-bold uppercase text-indigo-400 mb-1 tracking-wider">
                  Phrase A
                </label>
                <textarea
                  id="phraseA"
                  rows={2}
                  value={phraseA}
                  onChange={(e) => setPhraseA(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div>
                <label htmlFor="phraseB" className="block text-xs font-bold uppercase text-emerald-400 mb-1 tracking-wider">
                  Phrase B
                </label>
                <textarea
                  id="phraseB"
                  rows={2}
                  value={phraseB}
                  onChange={(e) => setPhraseB(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-all flex justify-center items-center gap-2 border border-slate-600 shadow-md"
              >
                <span>Run Model</span>
                <span className="text-xl">🚀</span>
              </button>
            </form>
          </div>
          
          {/* Similarity Score Card */}
          {analysisData && (
             <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                <span className="text-xs text-slate-500 uppercase tracking-widest block mb-1">Global Similarity</span>
                <div className={`text-3xl font-mono font-bold ${analysisData.sentenceSimilarity > 0.85 ? 'text-amber-400' : 'text-slate-200'}`}>
                    {analysisData.sentenceSimilarity.toFixed(4)}
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full mt-2 overflow-hidden">
                    <div 
                        className={`h-full ${analysisData.sentenceSimilarity > 0.85 ? 'bg-amber-400' : 'bg-slate-500'}`} 
                        style={{ width: `${Math.max(0, analysisData.sentenceSimilarity * 100)}%` }}
                    ></div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Cosine Distance of Mean Vectors</p>
             </div>
          )}
        </div>

        {/* RIGHT COLUMN: Tabbed Content */}
        <div className="lg:col-span-3">
            
            {/* TABS NAVIGATION */}
            <div className="flex border-b border-slate-700 mb-6 space-x-4">
                <button
                    onClick={() => setActiveTab('viz')}
                    className={`pb-3 px-2 text-sm font-bold uppercase tracking-wide transition-all border-b-2 ${
                        activeTab === 'viz' 
                        ? 'border-indigo-500 text-white' 
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                >
                    1. 🗺️ Spatial Map
                </button>
                <button
                    onClick={() => setActiveTab('matrix')}
                    className={`pb-3 px-2 text-sm font-bold uppercase tracking-wide transition-all border-b-2 ${
                        activeTab === 'matrix' 
                        ? 'border-indigo-500 text-white' 
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                >
                    2. 🔢 Attention Matrix
                </button>
                <button
                    onClick={() => setActiveTab('theory')}
                    className={`pb-3 px-2 text-sm font-bold uppercase tracking-wide transition-all border-b-2 ${
                        activeTab === 'theory' 
                        ? 'border-indigo-500 text-white' 
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                >
                    3. 🎓 Theory & Encoder
                </button>
            </div>

            {/* TAB CONTENT */}
            <div className="min-h-[500px]">
                {activeTab === 'viz' && analysisData && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex justify-between items-end">
                            <h2 className="text-2xl font-bold text-white">Projection Space (PCA)</h2>
                        </div>
                        
                        <div className="h-[550px] w-full">
                            <PositionalEncodingChart 
                                data={analysisData.pcaData} 
                                width={850} 
                                height={550}
                            />
                        </div>
                        <DistanceEvolution result={analysisData} />
                        <SimilarityAnalysis result={analysisData} />
                    </div>
                )}

                {activeTab === 'matrix' && analysisData && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <ContextInfluence result={analysisData} />
                        
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                            <h3 className="text-xl font-bold text-white mb-4">Attention Weights (Heatmap)</h3>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                <AttentionMatrixView 
                                    tokens={analysisData.tokensA} 
                                    matrix={analysisData.attentionMatrixA} 
                                    sourceId="A" 
                                />
                                <AttentionMatrixView 
                                    tokens={analysisData.tokensB} 
                                    matrix={analysisData.attentionMatrixB} 
                                    sourceId="B" 
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'theory' && (
                    <TheoryView />
                )}

                {/* Empty State Hint */}
                {(!analysisData && (activeTab === 'viz' || activeTab === 'matrix')) && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl p-12">
                        <span className="text-4xl mb-4">🧪</span>
                        <p>Click "Run Model" to generate data for this view.</p>
                    </div>
                )}
            </div>

        </div>
      </main>
    </div>
  );
};

export default App;
