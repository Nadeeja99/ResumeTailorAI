export const RESUME =
  'John Doe\nSoftware Engineer with 5 years of experience in TypeScript and React. Built scalable web applications. Led team of 4 engineers.';
export const JD =
  'We are looking for a Senior Frontend Engineer with experience in React, TypeScript, Docker, and Kubernetes. Must have strong communication skills.';

// Parses an SSE v2 body into its JSON events (heartbeat comments are skipped).
export function parseSSE(body: string): Array<Record<string, unknown> & { type: string }> {
  return body
    .split('\n\n')
    .filter(frame => frame.startsWith('data: '))
    .map(frame => JSON.parse(frame.slice(6)));
}
