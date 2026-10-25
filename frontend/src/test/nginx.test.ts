import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const read = (file: string) => readFileSync(resolve(root, file), 'utf8');

describe('nginx security config', () => {
  const headers = read('nginx/security-headers.conf');
  const csp = headers.match(/Content-Security-Policy "([^"]+)"/)?.[1] ?? '';

  it('allows the inline pre-paint theme script by its exact hash', () => {
    const script = read('index.html').match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';
    const hash = createHash('sha256').update(script).digest('base64');
    expect(csp).toContain(`'sha256-${hash}'`);
  });

  it('keeps a strict policy: no unsafe-inline/eval scripts, no framing, no plugins', () => {
    const scriptSrc = csp.match(/script-src ([^;]+)/)?.[1] ?? '';
    expect(scriptSrc).not.toMatch(/unsafe-(inline|eval)/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it('includes the security headers in every static location', () => {
    const conf = read('nginx.conf');
    const staticLocations = [...conf.matchAll(/location (\/(?!api)[^\s]*) \{([\s\S]*?)\n {4}\}/g)];
    expect(staticLocations.map(m => m[1])).toEqual(['/assets/', '/']);
    for (const [, , body] of staticLocations) expect(body).toContain('include /etc/nginx/snippets/security-headers.conf');
  });

  it('never gzips the SSE stream', () => {
    expect(read('nginx.conf').match(/gzip_types ([^;]+);/)?.[1]).not.toContain('text/event-stream');
  });
});
