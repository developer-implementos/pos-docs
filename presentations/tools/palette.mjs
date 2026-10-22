/** Shared palette for generated slides, standalone SVG diagrams and the player UI. */
export const presentationPalette = Object.freeze({
  primary: '#0545BA',
  primaryHover: '#043895',
  primarySoft: '#EFF4FF',
  primaryBorder: '#B8CBF2',
  accent: '#007B6D',
  accentSoft: '#E8F5F1',
  text: '#24324A',
  muted: '#526179',
  surface: '#FFFFFF',
  page: '#F5F7FC',
  line: '#D8E1EF',
});

// Map deck.json source colors to the presentation theme.
// Other semantic colors and transparency are retained.
const sourceColors = new Map([
  ['#006DB6', presentationPalette.primary],
  ['#EDF4F8', presentationPalette.primarySoft],
  ['#00937F', presentationPalette.accent],
  ['#34383E', presentationPalette.text],
  ['#636569', presentationPalette.muted],
]);

export function presentationColor(value) {
  return sourceColors.get(value.toUpperCase()) ?? value;
}

export function renderPaletteCss() {
  const properties = Object.entries(presentationPalette).map(([name, value]) => {
    const property = name.replace(/[A-Z]/gu, letter => `-${letter.toLowerCase()}`);
    return `  --${property}: ${value};`;
  });
  return `/* Generated from presentations/tools/palette.mjs. */\n:root {\n${properties.join('\n')}\n  --blue: var(--primary);\n  --green: var(--accent);\n}\n`;
}
