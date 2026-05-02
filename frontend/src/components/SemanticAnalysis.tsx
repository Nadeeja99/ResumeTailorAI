import { useState } from 'react';
import { semanticAnalyze, SemanticAnalysisResult } from '../services/resumeApi';
import { getUserId } from '../lib/userStore';

interface Props {
  resume: string;
  jobDescription: string;
  onUpgradeClick: () => void;
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={8} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text
        x={size / 2}
        y={size / 2 + 6}
        textAnchor="middle"
        fill={color}
        fontSize={size * 0.22}
        fontWeight="700"
        style={{ rotate: '90deg', transformOrigin: `${size / 2}px ${size / 2}px`, transform: 'rotate(90deg)' }}
      >
        {score}
      </text>
    </svg>
  );
}

function SectionHeatmap({ sections }: { sections: SemanticAnalysisResult['sections'] }) {
  return (
    <div className="space-y-3">
      {sections.map(s => (
        <div key={s.name}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{s.name}</span>
            <span
              className="text-sm font-semibold"
              style={{ color: s.score >= 70 ? '#22c55e' : s.score >= 45 ? '#f59e0b' : '#ef4444' }}
            >
              {s.score}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${s.score}%`,
                background: s.score >= 70 ? '#22c55e' : s.score >= 45 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 truncate">{s.excerpt}</p>
        </div>
      ))}
    </div>
  );
}

export default function SemanticAnalysis({ resume, jobDescription, onUpgradeClick }: Props) {
  const [result, setResult] = useState<SemanticAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!resume.trim() || !jobDescription.trim()) {
      setError('Paste your resume and job description first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await semanticAnalyze(resume, jobDescription);
      setResult(data);
    } catch (e: unknown) {
      const msg = (e as Error).message ?? 'Analysis failed.';
      if (msg.includes('USAGE_LIMIT_REACHED') || msg.includes('Monthly limit reached')) {
        onUpgradeClick();
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Semantic Match Analysis</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Uses AI embeddings to score how semantically similar each resume section is to the job description — beyond keyword matching.
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="shrink-0 px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 transition"
        >
          {loading ? 'Analysing…' : 'Run Analysis'}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overall score */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <ScoreRing score={result.overallScore} size={100} />
            <p className="mt-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Overall Semantic Score</p>
            <p className="text-xs text-gray-400 mt-1 text-center">
              {result.overallScore >= 70 ? 'Strong match' : result.overallScore >= 45 ? 'Moderate match' : 'Needs improvement'}
            </p>
          </div>

          {/* Section heatmap */}
          <div className="lg:col-span-2 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Section Scores</h4>
            <SectionHeatmap sections={result.sections} />
          </div>

          {/* Requirement coverage */}
          <div className="lg:col-span-2 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">JD Requirement Coverage</h4>
            <div className="flex flex-wrap gap-2">
              {result.requirementCoverage.map(r => (
                <span
                  key={r.requirement}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                    r.covered
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-600 dark:text-red-300'
                  }`}
                >
                  <span>{r.covered ? '✓' : '✗'}</span>
                  {r.requirement}
                </span>
              ))}
            </div>
          </div>

          {/* Top gaps */}
          {result.topGaps.length > 0 && (
            <div className="p-6 rounded-2xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 shadow-sm">
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-3">Top Gaps to Address</h4>
              <ul className="space-y-2">
                {result.topGaps.map(gap => (
                  <li key={gap} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <span className="text-amber-500">▸</span> {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
