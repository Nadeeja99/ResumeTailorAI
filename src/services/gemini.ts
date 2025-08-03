import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  private static instance: GoogleGenerativeAI | null = null;

  static async initialize(): Promise<void> {
    // Get API key from environment variable
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your .env file.');
    }
    
    this.instance = new GoogleGenerativeAI(apiKey);
  }

  static isInitialized(): boolean {
    return this.instance !== null;
  }

  static async analyzeResume(resume: string, jobDescription: string) {
    if (!this.instance) {
      throw new Error('Gemini service not initialized');
    }

    const model = this.instance.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean the response text to extract JSON from markdown code blocks
      let cleanedText = text.trim();
      
      // Remove markdown code block markers if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '');
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '');
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.replace(/\s*```$/, '');
      }
      
      // Remove any leading/trailing whitespace
      cleanedText = cleanedText.trim();

      try {
        return JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', text);
        console.error('Cleaned text:', cleanedText);
        console.error('Parse error:', parseError);
        
        // Try to extract JSON from the response if it's embedded in text
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (secondParseError) {
            console.error('Second parse attempt failed:', secondParseError);
          }
        }
        
        throw new Error('Invalid JSON response from Gemini. Please try again.');
      }
    } catch (error: any) {
      console.error('Gemini API error:', error);
      
      // Handle specific Gemini errors
      if (error?.message?.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Gemini API key. Please check your API key in settings.');
      } else if (error?.message?.includes('QUOTA_EXCEEDED')) {
        throw new Error('Gemini API quota exceeded. Please check your usage limits.');
      } else if (error?.message?.includes('PERMISSION_DENIED')) {
        throw new Error('Gemini API access denied. Please check your API key permissions.');
      }
      
      throw new Error('Failed to analyze resume. Please check your internet connection and try again.');
    }
  }

  static async generateImprovedResume(resume: string, jobDescription: string, suggestions: string[]) {
    if (!this.instance) {
      throw new Error('Gemini service not initialized');
    }

    const model = this.instance.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return text.trim();
    } catch (error: any) {
      console.error('Gemini API error:', error);
      
      if (error?.message?.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Gemini API key. Please check your API key in settings.');
      } else if (error?.message?.includes('QUOTA_EXCEEDED')) {
        throw new Error('Gemini API quota exceeded. Please check your usage limits.');
      }
      
      throw new Error('Failed to generate improved resume. Please try again.');
    }
  }
}