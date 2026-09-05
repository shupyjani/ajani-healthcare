import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Guards on what this project is allowed to depend on.
 *
 * react-router-hash-link was removed in favour of a local implementation, and
 * the point of removing it is that it stays removed: a stray import would
 * reinstate the dependency the next time anyone ran an install.
 */

const ALLOWED_RUNTIME_DEPENDENCIES = [
  '@emailjs/browser',
  'react',
  'react-dom',
  'react-router-dom',
];

const BANNED_PACKAGES = [
  'react-router-hash-link',
  'aos',
  'axios',
  'web-vitals',
  '@fortawesome/fontawesome-svg-core',
  'gsap',
  'framer-motion',
  'animate.css',
];

/* Shipped source only. The test tree is skipped because this very file names
   the banned package in its assertions and would match itself. */
function sourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      return entry === 'test' ? [] : sourceFiles(path);
    }
    if (/\.test\.(js|jsx)$/.test(entry)) return [];
    return /\.(js|jsx|mjs|css)$/.test(entry) ? [path] : [];
  });
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const files = [...sourceFiles('src'), ...sourceFiles('scripts')];

describe('runtime dependencies', () => {
  it('are only the ones the application actually needs', () => {
    expect(Object.keys(pkg.dependencies).sort()).toEqual(ALLOWED_RUNTIME_DEPENDENCIES);
  });

  it('include no animation library: the motion system is local', () => {
    const declared = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const banned of BANNED_PACKAGES) {
      expect(declared).not.toHaveProperty(banned);
    }
  });
});

describe('react-router-hash-link', () => {
  it('is not declared in package.json', () => {
    const declared = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(declared).not.toHaveProperty('react-router-hash-link');
  });

  it('is not in the lockfile', () => {
    expect(readFileSync('package-lock.json', 'utf8')).not.toContain('react-router-hash-link');
  });

  it('is imported nowhere, and no HashLink is rendered', () => {
    const patterns = [
      /from\s+['"]react-router-hash-link['"]/,
      /require\(['"]react-router-hash-link['"]\)/,
      /<HashLink|\bHashLink\b\s*[,}]/,
    ];

    /* Collected rather than asserted file by file, so a failure names every
       offender at once instead of stopping at the first. */
    const offenders = files.filter((file) => {
      const source = readFileSync(file, 'utf8');
      return patterns.some((pattern) => pattern.test(source));
    });

    expect(offenders).toEqual([]);
  });
});

describe('the no-external-assets rule still holds', () => {
  it('loads no remote font, script or stylesheet from source', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).not.toMatch(/fonts\.googleapis|fonts\.gstatic|cdn\.|unpkg|jsdelivr/);

    const patterns = [/@import\s+url\(\s*['"]?https?:/, /fonts\.googleapis|fonts\.gstatic/];
    const offenders = files.filter((file) => {
      const source = readFileSync(file, 'utf8');
      return patterns.some((pattern) => pattern.test(source));
    });

    expect(offenders).toEqual([]);
  });
});
