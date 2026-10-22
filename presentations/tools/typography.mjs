import assert from 'node:assert/strict';

// Sizes use the presentation's 1280 × 720 design coordinates.
export const diagramTypography = Object.freeze({
  group: Object.freeze({ fontSize: 24, bold: true }),
  title: Object.freeze({ fontSize: 22, bold: true }),
  body: Object.freeze({ fontSize: 20, bold: false }),
  label: Object.freeze({ fontSize: 16, bold: false }),
});

export function diagramTextStyle(style, label) {
  assert.ok(Object.hasOwn(diagramTypography, style.typographyRole), `${label}: unknown diagram typography role`);
  assert.ok(!Object.hasOwn(style, 'fontSize') && !Object.hasOwn(style, 'bold'),
    `${label}: diagram typography comes from its role, not per-element overrides`);
  return { ...style, ...diagramTypography[style.typographyRole] };
}
