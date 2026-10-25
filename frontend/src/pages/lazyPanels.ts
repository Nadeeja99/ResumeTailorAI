import { lazyWithPreload } from '@/lib/lazy';

// Secondary tools are split into their own chunks and fetched on first visit (or tab hover).
export const SemanticAnalysis = lazyWithPreload(() => import('@/components/SemanticAnalysis'));
export const InterviewPrepPanel = lazyWithPreload(() => import('@/components/InterviewPrepPanel'));
export const CoverLetterPanel = lazyWithPreload(() =>
  import('@/components/CoverLetterPanel').then(m => ({ default: m.CoverLetterPanel }))
);
export const JobComparisonPanel = lazyWithPreload(() =>
  import('@/components/JobComparisonPanel').then(m => ({ default: m.JobComparisonPanel }))
);
