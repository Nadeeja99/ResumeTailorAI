import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL_CANDIDATES = ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'];

function getInstance(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not set in backend .env');
  }
  return new GoogleGenerativeAI(apiKey);
}

function mapError(error: unknown): Error {
  const message = String((error as any)?.message || '');
  if (message.includes('API_KEY_INVALID')) return new Error('Invalid Gemini API key.');
  if (message.includes('QUOTA_EXCEEDED')) return new Error('Gemini API quota exceeded.');
  if (message.includes('PERMISSION_DENIED')) return new Error('Gemini API access denied.');
  if (message.includes('NOT_FOUND')) return new Error('Selected Gemini model is unavailable.');
  return new Error('Gemini request failed. Please try again.');
}

export async function analyzeResume(resume: string, jobDescription: string) {
  const client = getInstance();

  const prompt = `
Analyze the following resume against the job description and provide a comprehensive analysis.

Job Description:
${jobDescription}

Resume:
${resume}

IMPORTANT: Return ONLY a valid JSON object with the following structure. Do not include any markdown formatting, code blocks, or additional text:

{
  "matchScore": <number between 0-100>,
  "missingKeywords": ["keyword1", "keyword2", ...],
  "suggestedImprovements": ["improvement1", "improvement2", ...],
  "strengths": ["strength1", "strength2", ...],
  "toneAnalysis": {
    "score": <number between 0-100>,
    "feedback": "<brief feedback on tone and professionalism>"
  },
  "atsOptimization": {
    "score": <number between 0-100>,
    "suggestions": ["suggestion1", "suggestion2", ...]
  }
}

Focus on:
1. Keyword matching between job description and resume
2. Skills alignment
3. Experience relevance
4. ATS (Applicant Tracking System) optimization
5. Professional tone and clarity
6. Specific, actionable improvements

Return ONLY the JSON object, no markdown, no code blocks, no additional text.
`;

  let lastError: unknown = null;
  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      let cleaned = text.trim()
        .replace(/^```json\s*/, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')
        .trim();

      try {
        return JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error('Invalid JSON response from Gemini.');
      }
    } catch (error: unknown) {
      lastError = error;
      const msg = String((error as any)?.message || '');
      if (msg.includes('NOT_FOUND') || msg.includes('is not supported for generateContent')) continue;
      throw mapError(error);
    }
  }
  throw mapError(lastError);
}

export async function generateImprovedResume(
  resume: string,
  jobDescription: string,
  suggestions: string[]
): Promise<string> {
  const client = getInstance();

  const prompt = `
Based on the following resume, job description, and improvement suggestions, generate an improved version of the resume.

Original Resume:
${resume}

Job Description:
${jobDescription}

Improvement Suggestions:
${suggestions.join('\n')}

Please rewrite the resume incorporating the suggestions while:
1. Maintaining the original structure and format
2. Enhancing keyword alignment with the job description
3. Improving bullet points for impact and clarity
4. Optimizing for ATS systems
5. Keeping the tone professional yet engaging

Return only the improved resume text without any additional formatting or explanations.
`;

  let lastError: unknown = null;
  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error: unknown) {
      lastError = error;
      const msg = String((error as any)?.message || '');
      if (msg.includes('NOT_FOUND') || msg.includes('is not supported for generateContent')) continue;
      throw mapError(error);
    }
  }
  throw mapError(lastError);
}
