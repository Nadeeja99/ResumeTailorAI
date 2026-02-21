import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  private static instance: GoogleGenerativeAI | null = null;

  static async initialize(): Promise<void> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your .env file.');
    }
    this.instance = new GoogleGenerativeAI(apiKey);
  }

  static isInitialized(): boolean {
    return this.instance !== null;
  }

  private static getModel(modelName: string) {
    if (!this.instance) throw new Error('Gemini service not initialized');
    return this.instance.getGenerativeModel({ model: modelName });
  }

  static async analyzeResume(resume: string, jobDescription: string) {
    if (!this.instance) {
      throw new Error('Gemini service not initialized');
    }

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

    // Try flash-latest first, then fall back to pro-latest if model not found
    const modelCandidates = ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'];

    let lastError: any = null;
    for (const name of modelCandidates) {
      try {
        const model = this.getModel(name);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        let cleanedText = text.trim();
        if (cleanedText.startsWith('```json')) cleanedText = cleanedText.replace(/^```json\s*/, '');
        if (cleanedText.startsWith('```')) cleanedText = cleanedText.replace(/^```\s*/, '');
        if (cleanedText.endsWith('```')) cleanedText = cleanedText.replace(/\s*```$/, '');
        cleanedText = cleanedText.trim();

        try {
          return JSON.parse(cleanedText);
        } catch {
          const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          throw new Error('Invalid JSON response from Gemini. Please try again.');
        }
      } catch (error: any) {
        lastError = error;
        const msg = String(error?.message || '');
        // If NOT_FOUND or model unsupported, try next candidate
        if (msg.includes('NOT_FOUND') || msg.includes('is not supported for generateContent')) {
          continue;
        }
        // Other errors should bubble up
        throw this.mapGeminiError(error);
      }
    }

    // If we exhausted candidates
    throw this.mapGeminiError(lastError);
  }

  static async generateImprovedResume(resume: string, jobDescription: string, suggestions: string[]) {
    if (!this.instance) {
      throw new Error('Gemini service not initialized');
    }

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

    const modelCandidates = ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'];

    let lastError: any = null;
    for (const name of modelCandidates) {
      try {
        const model = this.getModel(name);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return text.trim();
      } catch (error: any) {
        lastError = error;
        const msg = String(error?.message || '');
        if (msg.includes('NOT_FOUND') || msg.includes('is not supported for generateContent')) {
          continue;
        }
        throw this.mapGeminiError(error);
      }
    }

    throw this.mapGeminiError(lastError);
  }

  private static mapGeminiError(error: any): Error {
    const message = String(error?.message || '');
    if (message.includes('API_KEY_INVALID')) {
      return new Error('Invalid Gemini API key. Please check your API key in settings.');
    }
    if (message.includes('QUOTA_EXCEEDED')) {
      return new Error('Gemini API quota exceeded. Please check your usage limits.');
    }
    if (message.includes('PERMISSION_DENIED')) {
      return new Error('Gemini API access denied. Please check your API key permissions.');
    }
    if (message.includes('NOT_FOUND')) {
      return new Error('Selected Gemini model is unavailable. Please try again in a moment.');
    }
    return new Error('Gemini request failed. Please try again.');
  }
}