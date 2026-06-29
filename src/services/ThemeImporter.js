/**
 * ThemeImporter — Import Chrome themes from CRX files
 * 
 * Chrome themes are CRX files containing:
 * - manifest.json with theme.colors, theme.tints, theme.images
 * - Image files for backgrounds
 * 
 * This service parses the manifest and maps Chrome's theme properties
 * to Apex's CSS custom properties.
 */

// Chrome theme color key → Apex CSS custom property mapping
const CHROME_TO_APEX_MAP = {
  // Toolbar & frame
  'frame':              '--apex-frame-bg',
  'frame_inactive':     '--apex-frame-inactive',
  'toolbar':            '--apex-toolbar-bg',
  'tab_background_text':'--apex-tab-text',
  'bookmark_text':      '--apex-bookmark-text',
  'tab_text':           '--apex-tab-active-text',
  
  // NTP (New Tab Page)
  'ntp_background':     '--apex-dashboard-bg',
  'ntp_text':           '--apex-dashboard-text',
  'ntp_link':           '--apex-link-color',
  
  // Buttons
  'button_background':  '--apex-button-bg',
};

// Chrome stores colors as [R, G, B] arrays
function rgbToHex(arr) {
  if (!arr || arr.length < 3) return null;
  return '#' + arr.slice(0, 3).map(v => {
    const hex = Math.max(0, Math.min(255, Math.round(v))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// Chrome stores tints as [H, S, L] in 0-1 range
function tintToHsl(arr) {
  if (!arr || arr.length < 3) return null;
  const h = arr[0] === -1 ? 0 : Math.round(arr[0] * 360);
  const s = Math.round(arr[1] * 100);
  const l = Math.round(arr[2] * 100);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Parse a Chrome theme manifest and extract CSS custom properties
 * @param {Object} manifest - Parsed manifest.json from Chrome theme
 * @returns {Object} { name, css: { [cssVar]: value }, images: { [key]: filename } }
 */
export function parseThemeManifest(manifest) {
  const result = {
    name: manifest.name || 'Imported Theme',
    version: manifest.version || '1.0',
    description: manifest.description || '',
    css: {},
    images: {},
  };

  const theme = manifest.theme;
  if (!theme) return result;

  // Map colors
  if (theme.colors) {
    for (const [chromeKey, rgb] of Object.entries(theme.colors)) {
      const cssVar = CHROME_TO_APEX_MAP[chromeKey];
      if (cssVar) {
        const hex = rgbToHex(rgb);
        if (hex) result.css[cssVar] = hex;
      }
    }

    // Generate derived colors from frame/toolbar
    if (theme.colors.frame) {
      const hex = rgbToHex(theme.colors.frame);
      if (hex) {
        result.css['--apex-frame-bg'] = hex;
        result.css['--apex-sidebar-bg'] = hex;
      }
    }
    if (theme.colors.toolbar) {
      const hex = rgbToHex(theme.colors.toolbar);
      if (hex) {
        result.css['--apex-topbar-bg'] = hex;
        result.css['--apex-dropdown-bg'] = hex;
      }
    }
  }

  // Map tints
  if (theme.tints) {
    if (theme.tints.buttons) {
      result.css['--apex-icon-tint'] = tintToHsl(theme.tints.buttons);
    }
    if (theme.tints.frame) {
      result.css['--apex-frame-tint'] = tintToHsl(theme.tints.frame);
    }
  }

  // Map images (background for NTP)
  if (theme.images) {
    for (const [key, path] of Object.entries(theme.images)) {
      result.images[key] = path;
    }
  }

  // Map properties (ntp alignment, repeat)
  if (theme.properties) {
    if (theme.properties.ntp_background_alignment) {
      const align = theme.properties.ntp_background_alignment;
      result.css['--apex-ntp-bg-position'] = align === 'center' ? 'center' : align === 'top' ? 'top center' : 'center';
    }
    if (theme.properties.ntp_background_repeat) {
      result.css['--apex-ntp-bg-repeat'] = theme.properties.ntp_background_repeat === 'repeat' ? 'repeat' : 'no-repeat';
    }
  }

  return result;
}

/**
 * Apply a parsed theme to the document
 * @param {Object} themeData - Result from parseThemeManifest
 */
export function applyTheme(themeData) {
  const root = document.documentElement;
  
  // Remove previous imported theme
  root.removeAttribute('data-imported-theme');
  const existingStyle = document.getElementById('apex-imported-theme');
  if (existingStyle) existingStyle.remove();

  if (!themeData?.css || Object.keys(themeData.css).length === 0) return;

  // Create a style element with all CSS custom properties
  const style = document.createElement('style');
  style.id = 'apex-imported-theme';
  const vars = Object.entries(themeData.css)
    .map(([prop, val]) => `  ${prop}: ${val} !important;`)
    .join('\n');
  
  style.textContent = `:root {\n${vars}\n}`;
  document.head.appendChild(style);
  root.setAttribute('data-imported-theme', themeData.name);

  // Save to localStorage for persistence
  localStorage.setItem('apex_imported_theme', JSON.stringify(themeData));
  console.log(`[Theme] Applied imported theme: "${themeData.name}" (${Object.keys(themeData.css).length} vars)`);
}

/**
 * Remove imported theme and restore defaults
 */
export function removeImportedTheme() {
  const style = document.getElementById('apex-imported-theme');
  if (style) style.remove();
  document.documentElement.removeAttribute('data-imported-theme');
  localStorage.removeItem('apex_imported_theme');
  console.log('[Theme] Removed imported theme');
}

/**
 * Restore previously imported theme on startup
 */
export function restoreImportedTheme() {
  try {
    const saved = localStorage.getItem('apex_imported_theme');
    if (saved) {
      const themeData = JSON.parse(saved);
      applyTheme(themeData);
      return themeData;
    }
  } catch (e) {
    console.error('[Theme] Failed to restore:', e.message);
  }
  return null;
}

/**
 * Import theme from a raw manifest.json text
 * @param {string} manifestText - Raw JSON text of manifest.json
 * @returns {Object} Parsed theme data
 */
export function importFromManifestText(manifestText) {
  const manifest = JSON.parse(manifestText);
  const themeData = parseThemeManifest(manifest);
  applyTheme(themeData);
  return themeData;
}

/**
 * Built-in Chrome-style theme presets
 */
export const THEME_PRESETS = [
  {
    name: 'Midnight Blue',
    css: {
      '--apex-frame-bg': '#1a1a2e',
      '--apex-toolbar-bg': '#16213e',
      '--apex-topbar-bg': '#16213e',
      '--apex-sidebar-bg': '#0f3460',
      '--apex-tab-text': '#a8b2d1',
      '--apex-tab-active-text': '#ffffff',
      '--apex-link-color': '#64ffda',
      '--apex-dashboard-bg': '#0a192f',
      '--apex-dashboard-text': '#ccd6f6',
    }
  },
  {
    name: 'Rose Gold',
    css: {
      '--apex-frame-bg': '#2d1b2e',
      '--apex-toolbar-bg': '#3d2040',
      '--apex-topbar-bg': '#3d2040',
      '--apex-sidebar-bg': '#4a1942',
      '--apex-tab-text': '#d4a5a5',
      '--apex-tab-active-text': '#ffffff',
      '--apex-link-color': '#e91e63',
      '--apex-dashboard-bg': '#1a0a1a',
      '--apex-dashboard-text': '#f8bbd0',
    }
  },
  {
    name: 'Forest Green',
    css: {
      '--apex-frame-bg': '#0d1b0e',
      '--apex-toolbar-bg': '#1b3a1e',
      '--apex-topbar-bg': '#1b3a1e',
      '--apex-sidebar-bg': '#2e7d32',
      '--apex-tab-text': '#a5d6a7',
      '--apex-tab-active-text': '#ffffff',
      '--apex-link-color': '#69f0ae',
      '--apex-dashboard-bg': '#0a140b',
      '--apex-dashboard-text': '#c8e6c9',
    }
  },
  {
    name: 'Ocean Sunset',
    css: {
      '--apex-frame-bg': '#1a0a2e',
      '--apex-toolbar-bg': '#2d1b69',
      '--apex-topbar-bg': '#2d1b69',
      '--apex-sidebar-bg': '#4a148c',
      '--apex-tab-text': '#b39ddb',
      '--apex-tab-active-text': '#ffffff',
      '--apex-link-color': '#ff6d00',
      '--apex-dashboard-bg': '#12005e',
      '--apex-dashboard-text': '#d1c4e9',
    }
  },
  {
    name: 'Arctic Ice',
    css: {
      '--apex-frame-bg': '#0d1b2a',
      '--apex-toolbar-bg': '#1b2838',
      '--apex-topbar-bg': '#1b2838',
      '--apex-sidebar-bg': '#0d47a1',
      '--apex-tab-text': '#90caf9',
      '--apex-tab-active-text': '#ffffff',
      '--apex-link-color': '#40c4ff',
      '--apex-dashboard-bg': '#0a1929',
      '--apex-dashboard-text': '#bbdefb',
    }
  },
];
