const API_BASE = '/api';

export class GeminiService {
  static isInitialized(): boolean {
    return true;
  }

  static async analyzeResume(resume: string, jobDescription: string) {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume, jobDescription }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || 'Failed to analyze resume.');
    }
    return res.json();
  }

  static async generateImprovedResume(
    resume: string,
    jobDescription: string,
    suggestions: string[]
  ): Promise<string> {
    const res = await fetch(`${API_BASE}/generate-improved`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume, jobDescription, suggestions }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || 'Failed to generate improved resume.');
    }
    const data = await res.json();
    return data.improvedResume;
  }
}
