import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './renderApp';
import { AJANI_MOBILE_DEMO_ROUTE } from '../lib/site';
import { BRAND_ARTWORK } from '../lib/brandLockupArtwork';
import {
  MARK_A_PATH,
  MARK_COLORS,
  MARK_PLATE,
  MARK_SCALE,
  MARK_SIZE,
  MASTER_A_COUNTER,
  MASTER_A_OUTER,
  MASTER_DOT,
} from '../lib/brandMarkGeometry';

/*
 * The surfaces the Ajani mark appears on.
 *
 * One set of coordinates in lib/brandMarkGeometry.js feeds the favicon, the
 * PWA icons, the sharing image, the native app icon and the component the
 * interface renders. These cases check that each surface still points at that
 * artwork, and that none of them has quietly acquired a second copy of it.
 */

const demoCss = () => readFileSync('src/components/demo/DemoPhone.css', 'utf8');

/* Comments in this stylesheet quote the declarations they explain, so they
   have to come out before anything counts declarations. */
const demoRules = () => demoCss().replace(/\/\*[\s\S]*?\*\//g, '');

/** Width and height out of a PNG's IHDR, which is always the first chunk. */
function pngSize(path) {
  const buffer = readFileSync(path);
  expect(buffer.subarray(1, 4).toString()).toBe('PNG');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    /* Colour type 2 is truecolour; 6 carries an alpha channel. */
    colourType: buffer[25],
  };
}

describe('the phone’s scrollbar is styled without being taken away', () => {
  it('scopes every scrollbar rule inside the demo', () => {
    const css = demoRules();
    const scrollbarRules = css
      .split('}')
      .filter((block) => block.includes('scrollbar'))
      .map((block) => block.split('{')[0].trim())
      .filter((selector) => selector !== '' && !selector.startsWith('/*') && !selector.startsWith('@'));

    expect(scrollbarRules.length).toBeGreaterThan(0);
    for (const selector of scrollbarRules) {
      /* Every selector in the list must name a demo element. A bare
         ::-webkit-scrollbar, or one on html/body, would restyle the page. */
      for (const part of selector.split(',')) {
        expect(part.trim()).toMatch(/^\.demo-/);
      }
    }
  });

  it('keeps the control present and operable', () => {
    const css = demoCss();

    expect(css).not.toMatch(/scrollbar-width:\s*none/);
    expect(css).not.toMatch(/::-webkit-scrollbar[^{]*\{[^}]*display:\s*none/);

    /* And the scrolling itself is untouched. */
    expect(css).toMatch(/\.demo-screen-scroll\s*\{[^}]*overflow-y:\s*auto/);
  });

  it('does not let the standard property suppress the sizing', () => {
    /*
     * Where `::-webkit-scrollbar` is honoured, `scrollbar-width` is not — the
     * engine switches to the standard scrollbar and drops the pseudo-elements,
     * taking the declared width with them. So the standard property may only
     * appear inside the feature query that excludes those engines.
     */
    const rules = demoRules();
    const guarded = rules.slice(rules.indexOf('@supports not selector(::-webkit-scrollbar)'));
    const occurrences = [...rules.matchAll(/scrollbar-width:/g)].length;

    expect(occurrences).toBeGreaterThan(0);
    expect([...guarded.matchAll(/scrollbar-width:/g)]).toHaveLength(occurrences);
    expect(guarded).toMatch(/scrollbar-width:\s*thin/);
  });

  it('paints a 3px thumb inside a grabbable track', () => {
    const css = demoCss();

    expect(css).toMatch(/--d-scrollbar-track:\s*9px/);
    expect(css).toMatch(/--d-scrollbar-inset:\s*3px/);

    /* 9px of track less 3px of transparent border on each side leaves a 3px
       visible thumb, which is the number the reference is judged against. */
    const track = Number(css.match(/--d-scrollbar-track:\s*(\d+)px/)[1]);
    const inset = Number(css.match(/--d-scrollbar-inset:\s*(\d+)px/)[1]);
    expect(track - inset * 2).toBe(3);

    expect(css).toMatch(/::-webkit-scrollbar-thumb[^}]*background-clip:\s*padding-box/);
    expect(css).toMatch(/::-webkit-scrollbar-thumb[^{]*\{[^}]*border-radius:\s*999px/);
    expect(css).toMatch(/::-webkit-scrollbar-track[^{]*\{[^}]*background:\s*transparent/);
  });

  it('is restrained in both colour schemes', () => {
    const css = demoCss();

    /* Teal from the approved palette, and a light thumb after dark. */
    expect(css).toMatch(/--d-scroll-thumb:\s*rgba\(11,\s*83,\s*81,\s*0?\.\d+\)/);
    const dark = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
    expect(dark).toMatch(/--d-scroll-thumb:\s*rgba\(233,\s*239,\s*238,\s*0?\.\d+\)/);

    for (const [, alpha] of css.matchAll(/--d-scroll-thumb:\s*rgba\([^)]*?,\s*(0?\.\d+)\)/g)) {
      expect(Number(alpha)).toBeLessThanOrEqual(0.35);
    }
  });

  it('leaves the stable gutter the filter row depends on', () => {
    expect(demoCss()).toMatch(/\.demo-screen-scroll\s*\{[^}]*scrollbar-gutter:\s*stable/);
  });
});

describe('the More screen names the product with its own symbol', () => {
  it('renders the brand mark and keeps the wording', async () => {
    const user = userEvent.setup();
    renderApp(AJANI_MOBILE_DEMO_ROUTE);
    await screen.findByRole('heading', { level: 1, name: 'Ajani Mobile interactive demo' });

    const phone = document.querySelector('.demo-app');
    /* Driven the way the rest of the suite drives the phone, so the state
       update is wrapped and cannot leak a warning into another file. */
    await user.click(within(phone).getByRole('tab', { name: 'More' }));

    const card = await within(phone).findByRole('heading', { name: 'Application' });
    const section = card.closest('.demo-card');

    /* The redundant "Name" label is gone: the heading says Application, and
       the row is the symbol beside the product's own name. */
    expect(within(section).queryByText('Name')).toBeNull();
    expect(within(section).getByText('Ajani Mobile')).toBeInTheDocument();

    /* One row, vertically centred, allowed to wrap at large text sizes. */
    const row = section.querySelector('.demo-application');
    expect(row).not.toBeNull();
    expect(row.querySelector('.demo-application-name').textContent).toBe('Ajani Mobile');

    /* The mark itself: decorative, and the same geometry as everywhere else. */
    const mark = section.querySelector('.demo-app-mark');
    expect(mark).not.toBeNull();
    expect(mark.tagName.toLowerCase()).toBe('svg');
    expect(mark.getAttribute('aria-hidden')).toBe('true');
    expect(mark.querySelector('.brand-mark-plate')).not.toBeNull();
    expect(mark.querySelector('.brand-mark-letter')).not.toBeNull();
    expect(mark.querySelector('.brand-mark-dot')).not.toBeNull();

    /*
     * The size a reader sees, not the size of the canvas.
     *
     * The viewBox is cropped to the plate, so the box and the artwork are the
     * same thing — which is the point: on the old uncropped canvas a 16px
     * symbol drew an 11.7px badge inside transparent padding.
     */
    const [, , boxWidth, boxHeight] = mark.getAttribute('viewBox').split(' ').map(Number);
    expect({ boxWidth, boxHeight }).toEqual({ boxWidth: MARK_PLATE.width, boxHeight: MARK_PLATE.height });

    const css = readFileSync('src/components/demo/DemoPhone.css', 'utf8');
    const drawn = Number(/\.demo-app-mark\s*\{[^}]*width:\s*(\d+)px/.exec(css)[1]);
    expect(drawn).toBeGreaterThanOrEqual(32);
    expect(drawn).toBeLessThanOrEqual(40);
  });

  it('keeps the row centred and able to wrap', () => {
    const css = readFileSync('src/components/demo/DemoPhone.css', 'utf8');
    const rule = /\.demo-application\s*\{([^}]*)\}/.exec(css)[1];

    expect(rule).toMatch(/align-items:\s*center/);
    expect(rule).toMatch(/flex-wrap:\s*wrap/);
    /* Space below the heading, rather than the name sitting against it. */
    expect(rule).toMatch(/margin:\s*0?\.\d+rem/);
  });
});

describe('the sharing image', () => {
  it('is the open-graph size and carries no alpha channel', () => {
    const { width, height, colourType } = pngSize('public/og-image.png');

    expect({ width, height }).toEqual({ width: 1200, height: 630 });
    /* Truecolour without alpha: nothing to composite against a dark card. */
    expect(colourType).toBe(2);
  });

  it('is referenced with its dimensions and a text alternative', () => {
    const html = readFileSync('index.html', 'utf8');

    expect(html).toMatch(/property="og:image"\s+content="\/og-image\.png(\?v=\d+)?"/);
    expect(html).toMatch(/property="og:image:width"\s+content="1200"/);
    expect(html).toMatch(/property="og:image:height"\s+content="630"/);
    expect(html).toMatch(/property="og:image:alt"/);
    expect(html).toMatch(/name="twitter:card"\s+content="summary_large_image"/);
  });
});

describe('the icon surfaces still agree', () => {
  it('serves every icon the document and manifest ask for', () => {
    const html = readFileSync('index.html', 'utf8');
    const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'));

    /* Icon URLs carry a `?v=` cache buster, which names the same file. */
    const onDisk = (src) => src.split('?')[0];

    const referenced = [
      ...[...html.matchAll(/href="(\/[^"]+\.(?:svg|png|ico))(?:\?[^"]*)?"/g)].map((m) => m[1]),
      ...manifest.icons.map((icon) => onDisk(icon.src)),
    ];

    for (const src of new Set(referenced)) {
      /* Throws if the file is missing, which is the assertion. */
      expect(readFileSync(`public${onDisk(src)}`).length).toBeGreaterThan(0);
    }
  });

  it('keeps the PWA icons at the sizes the manifest claims', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'));

    for (const icon of manifest.icons.filter((entry) => entry.src.endsWith('.png'))) {
      const [declared] = icon.sizes.split('x').map(Number);
      const { width, height } = pngSize(`public${icon.src.split('?')[0]}`);

      expect({ src: icon.src, width, height })
        .toEqual({ src: icon.src, width: declared, height: declared });
    }
  });
});

describe('the symbol matches the approved artwork', () => {
  const approved = () =>
    readFileSync('public/brand/ajani-symbol-colour-transparent.svg', 'utf8');

  it('takes its plate, letter, dot and colours from the file', () => {
    const svg = approved();

    expect(svg).toContain(
      `x="${MARK_PLATE.x}" y="${MARK_PLATE.y}" width="${MARK_PLATE.width}" `
      + `height="${MARK_PLATE.height}" rx="${MARK_PLATE.rx}" fill="${MARK_COLORS.plate}"`,
    );
    expect(svg).toContain(`d="${MARK_A_PATH}" fill="${MARK_COLORS.letter}"`);
    expect(svg).toContain(
      `cx="${MASTER_DOT.cx}" cy="${MASTER_DOT.cy}" r="${MASTER_DOT.r}" fill="${MARK_COLORS.dot}"`,
    );
    /* The pack places the 64-unit master on the 360-unit canvas with this. */
    expect(svg).toContain(`translate(${MARK_PLATE.x} ${MARK_PLATE.y}) scale(${MARK_SCALE})`);
  });

  it('is the current identity, not the superseded one', () => {
    /*
     * The retired mark was a gold open "A" with an ivory crossbar. The current
     * one is an ivory solid "A" with a gold dot, so the two colours have
     * swapped roles and the crossbar is gone entirely. Asserting the roles
     * catches a revert that a colour-count check would not.
     */
    expect(MARK_COLORS.letter).toBe('#FAF8F1');
    expect(MARK_COLORS.dot).toBe('#D2AA56');
    expect(MARK_COLORS.plate).toBe('#0B5351');
    expect(MARK_COLORS).not.toHaveProperty('frame');
    expect(MARK_COLORS).not.toHaveProperty('bar');
    expect(approved()).toContain('<circle');
  });

  it('keeps the dot clear of the letter', () => {
    /*
     * The dot is a separate element, not a serif on the A. Its distance from
     * the nearest point of the letter's outline is what keeps it reading that
     * way, and it is the first thing to close up if the artwork is redrawn.
     */
    const segments = [];
    for (let i = 0; i < MASTER_A_OUTER.length; i += 1) {
      segments.push([MASTER_A_OUTER[i], MASTER_A_OUTER[(i + 1) % MASTER_A_OUTER.length]]);
    }

    let nearest = Infinity;
    for (const [[ax, ay], [bx, by]] of segments) {
      const dx = bx - ax;
      const dy = by - ay;
      const len = dx * dx + dy * dy;
      let t = len === 0 ? 0 : ((MASTER_DOT.cx - ax) * dx + (MASTER_DOT.cy - ay) * dy) / len;
      t = Math.max(0, Math.min(1, t));
      nearest = Math.min(nearest, Math.hypot(MASTER_DOT.cx - (ax + t * dx), MASTER_DOT.cy - (ay + t * dy)));
    }

    /* Of the 64-unit master: the dot's edge stands clear of the letter. */
    expect(nearest - MASTER_DOT.r).toBeGreaterThan(0.5);
  });

  it('keeps the counter inside the letter', () => {
    /* The triangular hole is a hole: every one of its points sits within the
       letter's bounds rather than breaking its edge. */
    const xs = MASTER_A_OUTER.map(([x]) => x);
    const ys = MASTER_A_OUTER.map(([, y]) => y);

    for (const [x, y] of MASTER_A_COUNTER) {
      expect(x).toBeGreaterThan(Math.min(...xs));
      expect(x).toBeLessThan(Math.max(...xs));
      expect(y).toBeGreaterThan(Math.min(...ys));
      expect(y).toBeLessThan(Math.max(...ys));
    }
  });

  it('keeps the padding the pack asks to preserve', () => {
    expect(MARK_PLATE.x).toBeGreaterThan(0);
    expect(MARK_PLATE.x + MARK_PLATE.width).toBeLessThan(MARK_SIZE);
  });

  it('serves the approved vector as the favicon itself', () => {
    expect(readFileSync('public/favicon.svg', 'utf8')).toBe(approved());
  });
});

describe('the lockup is the approved artwork, not a reconstruction', () => {
  it('draws outlined lettering rather than site type', () => {
    const lockup = BRAND_ARTWORK.lockup;

    /* Plate, A, dot, then the outlined glyphs of both words. */
    expect(lockup.shapes.length).toBeGreaterThan(3);
    expect(lockup.viewBox).toBe('0 0 840 360');

    for (const shape of lockup.shapes) {
      expect(['rect', 'path', 'circle']).toContain(shape.tag);
    }

    /* No font is named anywhere in the component's data. */
    expect(JSON.stringify(lockup)).not.toMatch(/font|serif|sans-serif/i);
  });

  it('shares the badge with the standalone symbol', () => {
    const [plate, letter, dot] = BRAND_ARTWORK.lockup.shapes;

    expect(plate).toMatchObject({ ...MARK_PLATE, fill: MARK_COLORS.plate });
    expect(letter.d).toBe(MARK_A_PATH);
    expect(letter.fill).toBe(MARK_COLORS.letter);
    expect(dot).toMatchObject({ tag: 'circle', ...MASTER_DOT, fill: MARK_COLORS.dot });

    /* Both carry the group transform that places the master on the canvas. */
    for (const shape of [letter, dot]) {
      expect(shape.transform).toContain(`scale(${MARK_SCALE})`);
    }
  });
});

describe('the dark-ground lockup stays recognisable', () => {
  it('keeps a visible plate in the footer', () => {
    renderApp('/');

    const footer = document.querySelector('.site-footer');
    const lockup = footer.querySelector('.brand--lockup');
    expect(lockup).not.toBeNull();

    /*
     * The reported fault: the footer symbol had no plate at all. Two causes,
     * both fixed — the extractor dropped `stroke`, so the single-ink artwork's
     * outlined plate rendered as nothing, and the guide asks for the
     * dark-ground artwork here rather than the single-ink one.
     */
    const plate = lockup.querySelector('rect');
    expect(plate).not.toBeNull();
    expect(plate.getAttribute('fill')).toBe(MARK_COLORS.plate);

    /* The letter and the dot keep their approved roles on the dark ground. */
    const fills = [...lockup.querySelectorAll('[fill]')].map((n) => n.getAttribute('fill'));
    expect(fills).toContain(MARK_COLORS.letter);
    expect(fills).toContain(MARK_COLORS.dot);
  });

  it('carries a stroke through when the artwork uses one', () => {
    /* The single-ink variant draws its plate as an outline; losing the stroke
       is what made it disappear, so the data has to keep it. */
    const [plate] = BRAND_ARTWORK.lockupInverse.shapes;
    expect(plate.fill).toBe('none');
    expect(plate.stroke).toBe('#FFFFFF');
    expect(plate.strokeWidth).toBeGreaterThan(0);
  });

  it('carries no baked-in background of its own', () => {
    /* A full-canvas rect would show as a coloured block on any other surface. */
    for (const key of ['lockup', 'lockupDark', 'lockupInverse']) {
      const art = BRAND_ARTWORK[key];
      const ground = art.shapes.find((shape) =>
        shape.tag === 'rect' && shape.width === art.width && shape.height === art.height);
      expect({ key, ground }).toEqual({ key, ground: undefined });
    }
  });

  it('is sized as a lockup rather than as a badge', () => {
    const css = readFileSync('src/components/Brand.css', 'utf8');
    const rule = /\.brand--lockup\s*\{([^}]*)\}/.exec(css)[1];

    /* A 2.5rem lockup put the descriptor at 2.5px. The floor is well above it,
       and the value scales rather than crowding a narrow header. */
    const floor = Number(/clamp\(\s*([\d.]+)rem/.exec(rule)[1]);
    expect(floor).toBeGreaterThanOrEqual(3);
    expect(rule).toMatch(/max-width:\s*100%/);
  });
});
