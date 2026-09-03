import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const contractMarker = '/* Vision Tracker frame contract:';

describe('Vision Tracker frame CSS contract', () => {
  it('keeps the final cascade full-bleed with a visible back action and dark border', async () => {
    const css = await readFile(join(process.cwd(), 'src/index.css'), 'utf8');
    const contract = css.slice(css.lastIndexOf(contractMarker));

    expect(contract).toContain('padding: 0 0 6rem !important;');
    expect(contract).toContain('border: 1px solid var(--orbits-black) !important;');
    expect(contract).toContain('color: var(--orbits-paper) !important;');
    expect(contract).toContain('html body #root .eye-orbits-back');
    expect(contract).toContain('background-color: var(--orbits-black) !important;');
    expect(contract).toContain('border-color: var(--orbits-black) !important;');
  });
});
