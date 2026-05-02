import { GoogleGenerativeAI } from '@google/generative-ai';

function getInstance(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not set in backend/.env');
  }
  return new GoogleGenerativeAI(apiKey);
}

async function embed(text: string): Promise<number[]> {
  const client = getInstance();
  const model = client.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// Splits resume text into named sections heuristically
function extractResumeSections(resume: string): Record<string, string> {
  const SECTION_HEADERS = [
    'summary', 'objective', 'profile',
    'experience', 'work experience', 'employment',
    'education', 'skills', 'technical skills',
    'projects', 'certifications', 'achievements', 'awards',
  ];

  const lines = resume.split('\n');
  const sections: Record<string, string[]> = { intro: [] };
  let current = 'intro';

  for (const line of lines) {
    const lower = line.trim().toLowerCase();
    const matched = SECTION_HEADERS.find(h => lower === h || lower.startsWith(h + ':') || lower.startsWith(h + ' '));
    if (matched) {
      current = matched.split(' ')[0]; // normalise to first word
      sections[current] = sections[current] ?? [];
    } else {
      sections[current] = sections[current] ?? [];
      sections[current].push(line);
    }
  }

  // Drop empty sections
  return Object.fromEntries(
    Object.entries(sections)
      .map(([k, v]) => [k, v.join('\n').trim()])
      .filter(([, v]) => (v as string).length > 20)
  ) as Record<string, string>;
}

export interface SemanticSection {
  name: string;
  score: number; // 0-100
  excerpt: string;
}

export interface SemanticAnalysisResult {
  overallScore: number;         // 0-100 weighted average
  sections: SemanticSection[];  // per-section scores
  requirementCoverage: {        // how well each JD requirement is covered
    requirement: string;
    covered: boolean;
    score: number;
  }[];
  topGaps: string[];            // requirements with lowest coverage
}

// Extract key requirements from the job description using Gemini JSON mode
async function extractJDRequirements(jobDescription: string): Promise<string[]> {
  const client = getInstance();
  const model = client.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const prompt = `Extract 8-12 specific skills, technologies, and qualifications from this job description.
Return a JSON array of short strings (2-6 words each).
Job Description:
${jobDescription}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : parsed.requirements ?? [];
  } catch {
    return [];
  }
}

export async function semanticAnalysis(
  resume: string,
  jobDescription: string
): Promise<SemanticAnalysisResult> {
  const sections = extractResumeSections(resume);

  // Fan out all embeddings in parallel
  const [jdEmbedding, requirementsRaw, ...sectionEmbeddings] = await Promise.all([
    embed(jobDescription),
    extractJDRequirements(jobDescription),
    ...Object.values(sections).map(text => embed(text as string)),
  ]);

  // Per-section scores against full JD embedding
  const sectionNames = Object.keys(sections);
  const sectionResults: SemanticSection[] = sectionNames.map((name, i) => {
    const raw = cosineSimilarity(sectionEmbeddings[i], jdEmbedding);
    // Cosine similarity typically 0.6-0.95 for relevant text; normalise to 0-100
    const score = Math.round(Math.min(100, Math.max(0, (raw - 0.5) / 0.45 * 100)));
    const text = sections[name] as string;
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      score,
      excerpt: text.slice(0, 120) + (text.length > 120 ? '…' : ''),
    };
  });

  // Requirement coverage
  const requirementEmbeddings = await Promise.all(requirementsRaw.map(r => embed(r)));
  const requirementCoverage = requirementsRaw.map((req, i) => {
    // Score against best-matching resume section
    const best = Math.max(...sectionEmbeddings.map(se => cosineSimilarity(se, requirementEmbeddings[i])));
    const score = Math.round(Math.min(100, Math.max(0, (best - 0.5) / 0.45 * 100)));
    return { requirement: req, covered: score >= 50, score };
  });

  const overallScore = Math.round(
    sectionResults.reduce((sum, s) => sum + s.score, 0) / (sectionResults.length || 1)
  );

  const topGaps = requirementCoverage
    .filter(r => !r.covered)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map(r => r.requirement);

  return { overallScore, sections: sectionResults, requirementCoverage, topGaps };
}
