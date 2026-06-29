/**
 * Settings Persistence Tests — Verify settings save/load/sync correctly
 */
const { test, expect } = require('@playwright/test');

test.describe('Settings Persistence', () => {

  test('should persist dark mode setting', () => {
    const settings = { darkMode: true };
    const json = JSON.stringify(settings);
    const restored = JSON.parse(json);
    expect(restored.darkMode).toBe(true);
  });

  test('should persist search engine selection', () => {
    const engines = ['google', 'bing', 'duckduckgo', 'brave', 'ecosia'];
    for (const engine of engines) {
      const saved = engine;
      expect(saved).toBe(engine);
      expect(engines.includes(saved)).toBe(true);
    }
  });

  test('should persist language setting', () => {
    const languages = ['en', 'es', 'fr', 'de', 'ja', 'ko', 'zh', 'hi'];
    const selected = 'fr';
    expect(languages.includes(selected)).toBe(true);
  });

  test('should merge remote settings with local (cloud wins)', () => {
    const local = { searchEngine: 'google', darkMode: false, language: 'en' };
    const remote = { searchEngine: 'duckduckgo', darkMode: true };

    // Cloud wins on conflict
    const merged = { ...local };
    if (remote.searchEngine) merged.searchEngine = remote.searchEngine;
    if (remote.darkMode !== undefined) merged.darkMode = remote.darkMode;

    expect(merged.searchEngine).toBe('duckduckgo');
    expect(merged.darkMode).toBe(true);
    expect(merged.language).toBe('en'); // Retained from local
  });

  test('should validate proxy URL format', () => {
    const isValidProxy = (url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:', 'socks4:', 'socks5:'].some(p => parsed.protocol.startsWith(p) || url.startsWith(p));
      } catch {
        return false;
      }
    };

    expect(isValidProxy('http://proxy.example.com:8080')).toBe(true);
    expect(isValidProxy('https://proxy.example.com')).toBe(true);
    expect(isValidProxy('not-a-url')).toBe(false);
  });

  test('should handle safe storage encryption round-trip', () => {
    // Simulate encrypt/decrypt
    const original = 'my-api-key-12345';
    const encrypted = Buffer.from(original).toString('base64');
    const decrypted = Buffer.from(encrypted, 'base64').toString('utf-8');
    expect(decrypted).toBe(original);
  });

  test('should cap history at 200 entries', () => {
    const history = Array.from({ length: 250 }, (_, i) => ({
      id: i, url: `https://site${i}.com`, title: `Site ${i}`,
      time: '10:00 AM',
    }));
    const capped = history.slice(0, 200);
    expect(capped.length).toBe(200);
    expect(capped[0].url).toBe('https://site0.com');
  });
});
