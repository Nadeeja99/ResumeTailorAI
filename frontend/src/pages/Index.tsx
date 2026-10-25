import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BarChart2, BrainCircuit, FileText, MessageSquare, Sparkles, Target, type LucideIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { OptimizerTab } from '@/components/optimizer/OptimizerTab';
import { CoverLetterPanel } from '@/components/CoverLetterPanel';
import { JobComparisonPanel } from '@/components/JobComparisonPanel';
import SemanticAnalysis from '@/components/SemanticAnalysis';
import PricingModal from '@/components/PricingModal';
import UsageBanner from '@/components/UsageBanner';
import InterviewPrepPanel from '@/components/InterviewPrepPanel';
import { fetchUsageStatus, type UsageStatus } from '@/lib/userStore';
import { isValidLength, LIMITS } from '@/lib/limits';

// Underline-style primary navigation; scrolls horizontally on narrow screens.
const NAV_LIST =
  'mb-8 h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0 scrollbar-none';
const NAV_TRIGGER =
  '-mb-px flex-none gap-2 rounded-none border-b-2 border-transparent px-3 pb-3 pt-2 text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none';
// forceMount keeps each tool's state (and in-flight streams) alive while another tab is open
const PANEL = 'mt-0 data-[state=inactive]:hidden';

const MAIN_TABS = [
  { value: 'optimizer', label: 'Optimizer', icon: Target },
  { value: 'semantic', label: 'Semantic match', icon: BrainCircuit },
  { value: 'interview', label: 'Interview prep', icon: MessageSquare },
  { value: 'cover-letter', label: 'Cover letter', icon: FileText },
  { value: 'compare', label: 'Compare jobs', icon: BarChart2 },
] as const;

interface ToolProps {
  label: string;
  ready: boolean;
  needs: string;
  icon: LucideIcon;
  children: ReactNode;
}

// Each tool has its own error boundary and only unlocks once its inputs are valid
function Tool({ label, ready, needs, icon, children }: ToolProps) {
  return (
    <ErrorBoundary label={label}>
      {ready ? (
        children
      ) : (
        <EmptyState
          icon={icon}
          title={`${needs} needed`}
          description={`Add your ${needs.toLowerCase()} on the Optimizer tab to unlock this tool.`}
        />
      )}
    </ErrorBoundary>
  );
}

const Index = () => {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);

  // Usage is informational only — ignore failures (e.g. backend offline)
  const refreshUsage = useCallback(() => {
    fetchUsageStatus().then(setUsageStatus).catch(() => {});
  }, []);
  useEffect(refreshUsage, [refreshUsage]);

  const openPricing = useCallback(() => setPricingOpen(true), []);
  const resumeReady = isValidLength(resume, LIMITS.resume);
  const bothReady = resumeReady && isValidLength(jobDescription, LIMITS.jobDescription);
  const both = 'Resume and job description';

  return (
    <AppShell>
      <PricingModal
        open={pricingOpen}
        onClose={() => setPricingOpen(false)}
        usageCount={usageStatus?.usageCount ?? 0}
        usageLimit={usageStatus?.usageLimit ?? 3}
      />

      <section className="mb-10 max-w-2xl">
        <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> AI resume tailoring
        </p>
        <h1 className="text-3xl font-semibold sm:text-4xl">Tailor your resume to every role</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Score your fit against a job description, close keyword gaps, and generate a tailored resume, cover letter
          and interview prep — streamed in real time.
        </p>
      </section>

      {usageStatus && (
        <div className="mb-8">
          <UsageBanner status={usageStatus} onUpgradeClick={openPricing} />
        </div>
      )}

      <Tabs defaultValue="optimizer" className="w-full">
        <TabsList className={NAV_LIST}>
          {MAIN_TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className={NAV_TRIGGER}>
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="optimizer" className={PANEL} forceMount>
          <ErrorBoundary label="Optimizer">
            <OptimizerTab
              resume={resume}
              jobDescription={jobDescription}
              onResumeChange={setResume}
              onJobDescriptionChange={setJobDescription}
              onAnalyzed={refreshUsage}
              onUsageLimit={openPricing}
            />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="semantic" className={PANEL} forceMount>
          <Tool label="Semantic match" ready={bothReady} needs={both} icon={BrainCircuit}>
            <SemanticAnalysis resume={resume} jobDescription={jobDescription} onUpgradeClick={openPricing} />
          </Tool>
        </TabsContent>

        <TabsContent value="interview" className={PANEL} forceMount>
          <Tool label="Interview prep" ready={bothReady} needs={both} icon={MessageSquare}>
            <InterviewPrepPanel resume={resume} jobDescription={jobDescription} />
          </Tool>
        </TabsContent>

        <TabsContent value="cover-letter" className={PANEL} forceMount>
          <Tool label="Cover letter" ready={bothReady} needs={both} icon={FileText}>
            <CoverLetterPanel resume={resume} jobDescription={jobDescription} />
          </Tool>
        </TabsContent>

        <TabsContent value="compare" className={PANEL} forceMount>
          <Tool label="Compare jobs" ready={resumeReady} needs="Resume" icon={BarChart2}>
            <JobComparisonPanel resume={resume} />
          </Tool>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default Index;
