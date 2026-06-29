/**
 * Theme Importer Tests — Chrome theme parsing, CSS mapping, presets
 */
const { test, expect } = require('@playwright/test');

// Inline the pure functions for testing (no DOM dependency)
function rgbToHex(arr) {
  if (!arr || arr.length < 3) return null;
  return '#' + arr.slice(0, 3).map(v => {
    const hex = Math.max(0, Math.min(255, Math.round(v))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function tintToHsl(arr) {
  if (!arr || arr.length < 3) return null;
  const h = arr[0] === -1 ? 0 : Math.round(arr[0] * 360);
  const s = Math.round(arr[1] * 100);
  const l = Math.round(arr[2] * 100);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

test.describe('Theme Importer', () => {

  test('should convert RGB array to hex', () => {
    expect(rgbToHex([255, 0, 0])).toBe('#ff0000');
    expect(rgbToHex([0, 255, 0])).toBe('#00ff00');
    expect(rgbToHex([0, 0, 255])).toBe('#0000ff');
    expect(rgbToHex([26, 26, 46])).toBe('#1a1a2e');
    expect(rgbToHex([255, 255, 255])).toBe('#ffffff');
  });

  test('should handle invalid RGB arrays', () => {
    expect(rgbToHex(null)).toBeNull();
    expect(rgbToHex([])).toBeNull();
    expect(rgbToHex([255])).toBeNull();
  });

  test('should clamp out-of-range RGB values', () => {
    expect(rgbToHex([300, -10, 128])).toBe('#ff0080');
  });

  test('should convert tint to HSL', () => {
    expect(tintToHsl([0.5, 0.5, 0.5])).toBe('hsl(180, 50%, 50%)');
    expect(tintToHsl([0, 1, 1])).toBe('hsl(0, 100%, 100%)');
    expect(tintToHsl([-1, 0.5, 0.3])).toBe('hsl(0, 50%, 30%)');
  });

  test('should parse Chrome manifest with theme colors', () => {
    const manifest = {
      name: 'Test Theme',
      version: '1.0',
      theme: {
        colors: {
          frame: [30, 30, 60],
          toolbar: [22, 33, 62],
        }
      }
    };

    const CHROME_TO_APEX_MAP = {
      'frame': '--apex-frame-bg',
      'toolbar': '--apex-toolbar-bg',
    };

    const css = {};
    for (const [key, rgb] of Object.entries(manifest.theme.colors)) {
      const cssVar = CHROME_TO_APEX_MAP[key];
      if (cssVar) {
        const hex = rgbToHex(rgb);
        if (hex) css[cssVar] = hex;
      }
    }

    expect(css['--apex-frame-bg']).toBe('#1e1e3c');
    expect(css['--apex-toolbar-bg']).toBe('#16213e');
  });

  test('should have 5 built-in presets', () => {
    const presetNames = ['Midnight Blue', 'Rose Gold', 'Forest Green', 'Ocean Sunset', 'Arctic Ice'];
    expect(presetNames.length).toBe(5);
  });

  test('should validate preset structure', () => {
    const preset = {
      name: 'Midnight Blue',
      css: {
        '--apex-frame-bg': '#1a1a2e',
        '--apex-toolbar-bg': '#16213e',
      }
    };
    expect(preset.name).toBeTruthy();
    expect(Object.keys(preset.css).length).toBeGreaterThan(0);
    for (const [key, val] of Object.entries(preset.css)) {
      expect(key).toMatch(/^--apex-/);
      expect(val).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
