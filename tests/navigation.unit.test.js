/**
 * Navigation Tests — URL parsing, search query handling, back/forward logic
 */
const { test, expect } = require('@playwright/test');

test.describe('Navigation Logic', () => {

  test('should detect valid URLs', () => {
    const isUrl = (str) => {
      try {
        if (/^https?:\/\//i.test(str)) { new URL(str); return true; }
        if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(str)) return true;
        return false;
      } catch { return false; }
    };

    expect(isUrl('https://google.com')).toBe(true);
    expect(isUrl('google.com')).toBe(true);
    expect(isUrl('localhost:3000')).toBe(false); // No TLD
    expect(isUrl('how to cook pasta')).toBe(false);
    expect(isUrl('https://sub.domain.co.uk/path?q=1')).toBe(true);
  });

  test('should generate correct search URL for non-URLs', () => {
    const searchEngines = {
      google: 'https://www.google.com/search?q=',
      bing: 'https://www.bing.com/search?q=',
      duckduckgo: 'https://duckduckgo.com/?q=',
    };

    const query = 'best restaurants near me';
    const engine = 'google';
    const searchUrl = searchEngines[engine] + encodeURIComponent(query);
    expect(searchUrl).toBe('https://www.google.com/search?q=best%20restaurants%20near%20me');
  });

  test('should prepend https:// to bare domains', () => {
    const normalizeUrl = (input) => {
      if (/^https?:\/\//i.test(input)) return input;
      if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(input)) return 'https://' + input;
      return input;
    };

    expect(normalizeUrl('github.com')).toBe('https://github.com');
    expect(normalizeUrl('https://github.com')).toBe('https://github.com');
    expect(normalizeUrl('http://localhost')).toBe('http://localhost');
  });

  test('should extract hostname from URL', () => {
    const getHostname = (url) => {
      try { return new URL(url).hostname; } catch { return ''; }
    };

    expect(getHostname('https://www.google.com/search?q=test')).toBe('www.google.com');
    expect(getHostname('https://github.com/user/repo')).toBe('github.com');
    expect(getHostname('invalid')).toBe('');
  });

  test('should detect insecure HTTP connections', () => {
    const isInsecure = (url) => /^http:\/\//i.test(url) && !/localhost/i.test(url);

    expect(isInsecure('http://example.com')).toBe(true);
    expect(isInsecure('https://example.com')).toBe(false);
    expect(isInsecure('http://localhost:3000')).toBe(false);
  });

  test('should sanitize URLs with XSS payloads', () => {
    const dangerous = [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
    ];

    for (const url of dangerous) {
      const isSafe = /^https?:\/\//i.test(url);
      expect(isSafe).toBe(false);
    }
  });

  test('should handle back/forward navigation state', () => {
    const history = ['https://a.com', 'https://b.com', 'https://c.com'];
    let currentIndex = 2; // At c.com

    // Go back
    if (currentIndex > 0) currentIndex--;
    expect(history[currentIndex]).toBe('https://b.com');

    // Go back again
    if (currentIndex > 0) currentIndex--;
    expect(history[currentIndex]).toBe('https://a.com');

    // Go forward
    if (currentIndex < history.length - 1) currentIndex++;
    expect(history[currentIndex]).toBe('https://b.com');

    // Can't go back from beginning
    currentIndex = 0;
    const canGoBack = currentIndex > 0;
    expect(canGoBack).toBe(false);
  });
});
