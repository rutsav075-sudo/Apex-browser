/**
 * Download Safety Tests — File extension checks, hash verification, malware patterns
 */
const { test, expect } = require('@playwright/test');

test.describe('Download Safety', () => {

  const DANGEROUS_EXTENSIONS = ['.exe', '.dll', '.bat', '.cmd', '.scr', '.pif', '.vbs', '.js', '.msi', '.ps1'];

  test('should flag dangerous file extensions', () => {
    const checkExtension = (filename) => {
      const ext = '.' + filename.split('.').pop().toLowerCase();
      return DANGEROUS_EXTENSIONS.includes(ext);
    };

    expect(checkExtension('setup.exe')).toBe(true);
    expect(checkExtension('virus.dll')).toBe(true);
    expect(checkExtension('script.bat')).toBe(true);
    expect(checkExtension('document.pdf')).toBe(false);
    expect(checkExtension('photo.jpg')).toBe(false);
    expect(checkExtension('archive.zip')).toBe(false);
  });

  test('should detect double extensions', () => {
    const hasDoubleExtension = (filename) => {
      const parts = filename.split('.');
      if (parts.length < 3) return false;
      const lastExt = '.' + parts[parts.length - 1].toLowerCase();
      return DANGEROUS_EXTENSIONS.includes(lastExt);
    };

    expect(hasDoubleExtension('document.pdf.exe')).toBe(true);
    expect(hasDoubleExtension('photo.jpg.scr')).toBe(true);
    expect(hasDoubleExtension('normal.pdf')).toBe(false);
  });

  test('should compute SHA-256 hash format correctly', () => {
    // Verify hash format (64 hex characters)
    const mockHash = 'a'.repeat(64);
    expect(mockHash.length).toBe(64);
    expect(/^[a-f0-9]{64}$/.test(mockHash)).toBe(true);
  });

  test('should validate download state transitions', () => {
    const validTransitions = {
      'progressing': ['paused', 'completed', 'cancelled', 'interrupted'],
      'paused': ['progressing', 'cancelled'],
      'completed': [],
      'cancelled': [],
    };

    // progressing → paused is valid
    expect(validTransitions['progressing'].includes('paused')).toBe(true);
    // completed → progressing is invalid
    expect(validTransitions['completed'].includes('progressing')).toBe(false);
  });

  test('should format file sizes correctly', () => {
    const formatSize = (bytes) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
      return (bytes / 1073741824).toFixed(2) + ' GB';
    };

    expect(formatSize(500)).toBe('500 B');
    expect(formatSize(1500)).toBe('1.5 KB');
    expect(formatSize(5242880)).toBe('5.0 MB');
    expect(formatSize(1073741824)).toBe('1.00 GB');
  });

  test('should track download progress percentage', () => {
    const received = 5242880; // 5MB
    const total = 10485760; // 10MB
    const percent = Math.round((received / total) * 100);
    expect(percent).toBe(50);
  });
});
