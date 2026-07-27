import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface VercelConfig {
  cleanUrls?: boolean;
  rewrites?: Array<{
    source: string;
    destination: string;
  }>;
}

describe('Vercel SPA routing', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as VercelConfig;

  it('uses an extensionless SPA destination when clean URLs are enabled', () => {
    expect(config.cleanUrls).toBe(true);
    const spaRewrite = config.rewrites?.find(({ source }) => source.includes('?!robots.txt'));
    expect(spaRewrite).toBeDefined();
    expect(spaRewrite?.destination).toBe('/index');
    expect(spaRewrite?.destination).not.toMatch(/\.[a-z0-9]+$/i);
  });

  it('routes product deep links through the SPA entry point', () => {
    const spaRewrite = config.rewrites?.find(({ source }) => source.includes('?!robots.txt'));
    expect(spaRewrite?.source).toContain('.*');
    expect(spaRewrite?.source).not.toContain('products/');
  });
});
