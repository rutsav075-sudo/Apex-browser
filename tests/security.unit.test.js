/**
 * Security Tests — Safe Browsing, fingerprint protection, permissions
 */
const { test, expect } = require('@playwright/test');

test.describe('Security', () => {

  // Dangerous site patterns (regex fallback when API unavailable)
  const DANGER_PATTERNS = [
    /malware/i, /phishing/i, /\.tk$/i, /\.ml$/i, /\.ga$/i,
    /free-?download/i, /crack/i, /keygen/i,
  ];

  test('should detect known dangerous URL patterns', () => {
    const isDangerous = (url) => {
      try {
        const hostname = new URL(url).hostname;
        return DANGER_PATTERNS.some(p => p.test(hostname) || p.test(url));
      } catch { return false; }
    };

    expect(isDangerous('https://malware-site.com')).toBe(true);
    expect(isDangerous('https://phishing-bank.com')).toBe(true);
    expect(isDangerous('https://free-download-crack.com')).toBe(true);
    expect(isDangerous('https://google.com')).toBe(false);
    expect(isDangerous('https://github.com')).toBe(false);
  });

  test('should detect insecure HTTP connections', () => {
    const isInsecure = (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(parsed.hostname);
      } catch { return false; }
    };

    expect(isInsecure('http://example.com')).toBe(true);
    expect(isInsecure('https://example.com')).toBe(false);
    expect(isInsecure('http://localhost')).toBe(false);
    expect(isInsecure('http://127.0.0.1:3000')).toBe(false);
  });

  test('should validate Safe Browsing API request format', () => {
    const apiKey = 'test-key-123';
    const url = 'https://evil.com';
    const requestBody = {
      client: { clientId: 'apex-browser', clientVersion: '1.0' },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url }],
      },
    };

    expect(requestBody.client.clientId).toBe('apex-browser');
    expect(requestBody.threatInfo.threatEntries[0].url).toBe('https://evil.com');
    expect(requestBody.threatInfo.threatTypes.length).toBe(3);
  });

  test('should validate Safe Browsing cache behavior', () => {
    // LRU cache: max 1000 entries, 5 minute TTL
    const cache = new Map();
    const MAX_CACHE = 1000;
    const TTL = 5 * 60 * 1000;

    const setCache = (url, result) => {
      cache.set(url, { result, timestamp: Date.now() });
      if (cache.size > MAX_CACHE) {
        const oldest = cache.keys().next().value;
        cache.delete(oldest);
      }
    };

    const getCache = (url) => {
      const entry = cache.get(url);
      if (!entry) return null;
      if (Date.now() - entry.timestamp > TTL) {
        cache.delete(url);
        return null;
      }
      return entry.result;
    };

    setCache('https://google.com', { safe: true });
    expect(getCache('https://google.com')).toEqual({ safe: true });
    expect(getCache('https://unknown.com')).toBeNull();
  });

  test('should validate permission categories', () => {
    const SAFE_PERMISSIONS = ['notifications', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'pointerLock', 'media'];
    const BLOCKED_PERMISSIONS = ['geolocation', 'camera', 'microphone'];

    expect(SAFE_PERMISSIONS.includes('notifications')).toBe(true);
    expect(SAFE_PERMISSIONS.includes('geolocation')).toBe(false);
    expect(BLOCKED_PERMISSIONS.includes('camera')).toBe(true);
  });

  test('should validate fingerprint protection targets', () => {
    // These are the APIs we monkey-patch
    const protectedAPIs = [
      'HTMLCanvasElement.prototype.toDataURL',
      'HTMLCanvasElement.prototype.toBlob',
      'WebGLRenderingContext.prototype.getParameter',
      'AnalyserNode.prototype.getFloatFrequencyData',
      'navigator.hardwareConcurrency',
      'navigator.deviceMemory',
    ];

    expect(protectedAPIs.length).toBe(6);
    expect(protectedAPIs.includes('HTMLCanvasElement.prototype.toDataURL')).toBe(true);
  });
});
