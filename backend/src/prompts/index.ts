export const VERSION = 'v1';

export function analyzeResumePrompt(resume: string, jobDescription: string): string {
  return `You are an expert resume analyst and career coach.

Analyze the resume below against the job description and return a JSON object with this exact structure:

{
  "matchScore": <integer 0-100 representing overall fit>,
  "missingKeywords": [<strings: important keywords from JD absent in resume>],
  "suggestedImprovements": [<strings: specific, actionable improvements>],
  "strengths": [<strings: areas where the resume aligns well>],
  "toneAnalysis": {
    "score": <integer 0-100>,
    "feedback": "<concise feedback on professionalism and clarity>"
  },
  "atsOptimization": {
    "score": <integer 0-100>,
    "suggestions": [<strings: ATS-specific formatting and keyword suggestions>]
  }
}

Rules:
- matchScore should reflect real keyword coverage AND experience relevance.
- missingKeywords: only terms that matter for this role (skip stopwords, filler words).
- suggestedImprovements: max 8 items, each under 120 characters.
- strengths: max 6 items.
- atsOptimization.suggestions: max 5 items.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resume}`;
}

export function generateImprovedResumePrompt(
  resume: string,
  jobDescription: string,
  suggestions: string[]
): string {
  return `You are an expert resume writer.

Rewrite the resume below incorporating the improvement suggestions while:
1. Maintaining the original section structure
2. Enhancing keyword alignment with the job description
3. Strengthening bullet points with measurable impact where possible
4. Optimizing for ATS (avoid tables, columns, special characters)
5. Keeping a professional, active tone

Return ONLY the improved resume text. No explanations, no commentary.

IMPROVEMENT SUGGESTIONS:
${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

JOB DESCRIPTION:
${jobDescription}

ORIGINAL RESUME:
${resume}`;
}

export function generateCoverLetterPrompt(
  resume: string,
  jobDescription: string,
  applicantName: string
): string {
  return `You are an expert cover letter writer.

Write a compelling, tailored cover letter for the job below based on the applicant's resume.

Guidelines:
- 3–4 short paragraphs (opening, relevant experience, why this company/role, closing)
- Use specific details from both the resume and job description
- Professional yet personable tone — avoid clichés like "I am writing to express my interest"
- Do not fabricate experience not present in the resume
- End with a clear call to action
${applicantName ? `- Address it from ${applicantName}` : ''}

Return ONLY the cover letter text. No subject line, no explanations.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resume}`;
}

export function compareJobsPrompt(resume: string, jobDescription: string, jobTitle: string): string {
  return `You are an expert resume analyst.

Analyze the resume against the job description for the role: "${jobTitle}".
Return a JSON object with this exact structure:

{
  "matchScore": <integer 0-100>,
  "missingKeywords": [<up to 10 key missing terms>],
  "strengths": [<up to 5 matching strengths>],
  "topSuggestion": "<single most impactful improvement, under 150 characters>"
}

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resume}`;
}

export function parseLinkedInPrompt(rawText: string): string {
  return `You are a resume formatting expert.

The text below was extracted from a LinkedIn profile PDF export. LinkedIn PDFs use a multi-column layout, so the raw extraction may be jumbled — names, dates, and descriptions may appear out of order.

Your task: reconstruct a clean, well-structured resume from this raw text.

Output format (plain text, no markdown headers with #):
- CONTACT section: Name, location, email/phone if present
- SUMMARY section (if there is a summary/about)
- EXPERIENCE section: For each role — Company | Title | Dates, then bullet points of responsibilities/achievements
- EDUCATION section: Institution | Degree | Dates
- SKILLS section: comma-separated skills list
- CERTIFICATIONS section (if present)
- PROJECTS section (if present)

Rules:
- Infer structure from context — roles usually have company names, titles, and date ranges
- Write clean bullet points for each experience entry (use • character)
- Remove LinkedIn boilerplate (e.g. "Contact info", "Show all X experiences", page numbers)
- Do NOT invent experience, skills, or dates not present in the raw text
- Keep language from the original profile where possible
- Output ONLY the formatted resume. No commentary, no explanations.

RAW LINKEDIN TEXT:
${rawText}`;
}

export function interviewPrepPrompt(resume: string, jobDescription: string): string {
  return `You are an expert interview coach and hiring manager with 15+ years of experience.

Generate 8 targeted interview questions for the candidate applying for this role.
Mix behavioral, technical, and situational questions based on what the JD requires and what the resume shows.

Return a JSON object with this exact structure:
{
  "roleTitle": "<inferred job title from JD, max 60 chars>",
  "questions": [
    {
      "id": 1,
      "question": "<the interview question>",
      "category": "<one of: Behavioral | Technical | Situational | Culture Fit | Leadership>",
      "difficulty": "<one of: Easy | Medium | Hard>",
      "whyAsked": "<1 sentence: what the interviewer is trying to assess>",
      "idealAnswer": "<3-5 sentences: key points a strong answer should cover, tailored to the candidate's actual background from the resume>",
      "tips": ["<tip 1>", "<tip 2>", "<tip 3>"]
    }
  ]
}

Rules:
- Questions must be specific to this role and this candidate's background — not generic
- idealAnswer must reference actual experience from the resume where possible
- Include at least 2 technical questions if the role has technical requirements
- Include at least 2 behavioral (STAR-format) questions
- tips: practical, actionable pointers (e.g. "Mention the X project from your resume")
- Difficulty distribution: 2 Easy, 4 Medium, 2 Hard

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resume}`;
}
