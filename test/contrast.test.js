import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');

function themeTokens(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`))?.[1] || '';
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)]
    .map((match) => [match[1], match[2]]));
}

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(foreground, background) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

for (const [name, selector] of [['light', ':root'], ['dark', "[data-theme='dark']"]]) {
  test(`${name} theme core colors meet WCAG contrast requirements`, () => {
    const tokens = themeTokens(selector);
    const textPairs = [
      ['text', 'bg'],
      ['text', 'surface'],
      ['muted', 'bg'],
      ['muted', 'surface'],
      ['primary-text', 'primary'],
      ['secondary-text', 'secondary'],
      ['on-accent', 'accent'],
    ];
    textPairs.forEach(([foreground, background]) => {
      assert.ok(
        contrastRatio(tokens[foreground], tokens[background]) >= 4.5,
        `${foreground} on ${background} must be at least 4.5:1`,
      );
    });
    assert.ok(contrastRatio(tokens.blue, tokens.bg) >= 3, 'focus blue on bg must be at least 3:1');
    assert.ok(contrastRatio(tokens.blue, tokens.surface) >= 3, 'focus blue on surface must be at least 3:1');
  });
}

test('physical dice retain maximum practical contrast in every theme', () => {
  assert.ok(contrastRatio('#111827', '#ffffff') >= 15);
});