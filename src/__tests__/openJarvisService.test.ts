/**
 * TEST SUITE 3 — Service Layer: openJarvisService.ts
 *
 * Coverage:
 *  ✔ queryOpenJarvis — empty/whitespace prompt rejection
 *  ✔ queryOpenJarvis — electronAPI availability guard
 *  ✔ queryOpenJarvis — successful response trimming
 *  ✔ queryOpenJarvis — empty stdout fallback message
 *  ✔ queryOpenJarvis — error extraction from thrown IPC exceptions
 *  ✔ queryOpenJarvis — browser mode (window.electronAPI undefined)
 *  ✔ queryOpenJarvis — window.electronAPI.askJarvis undefined guard
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { queryOpenJarvis } from '../services/openJarvisService';

// The global setup.ts already attaches window.electronAPI.
// We manipulate it per-test to simulate different scenarios.

describe('queryOpenJarvis — input validation', () => {
  it('throws when prompt is empty string', async () => {
    await expect(queryOpenJarvis('')).rejects.toThrow(
      'Please enter a valid prompt before submitting.'
    );
  });

  it('throws when prompt is whitespace only', async () => {
    await expect(queryOpenJarvis('   \t\n')).rejects.toThrow(
      'Please enter a valid prompt before submitting.'
    );
  });

  it('does NOT throw for a prompt containing only special chars (non-empty)', async () => {
    window.electronAPI!.askJarvis = vi.fn().mockResolvedValue('ok');
    // Should not throw on input validation, reaches IPC call
    await expect(queryOpenJarvis('!@#$%')).resolves.toBeDefined();
  });
});

describe('queryOpenJarvis — Electron environment guard', () => {
  it('throws when window.electronAPI is undefined (browser mode)', async () => {
    Object.defineProperty(window, 'electronAPI', { value: undefined, configurable: true });
    await expect(queryOpenJarvis('hello')).rejects.toThrow(
      'OpenJarvis requires the Electron desktop environment'
    );
  });

  it('throws when window.electronAPI.askJarvis is undefined', async () => {
    Object.defineProperty(window, 'electronAPI', {
      value: { askJarvis: undefined },
      configurable: true,
    });
    await expect(queryOpenJarvis('hello')).rejects.toThrow(
      'OpenJarvis requires the Electron desktop environment'
    );
  });

  it('throws when window is undefined (SSR / Node context)', async () => {
    // We simulate this by saving and deleting window.electronAPI
    // Note: we cannot delete `window` in jsdom; we test the undefined check path instead
    Object.defineProperty(window, 'electronAPI', { value: null, configurable: true });
    await expect(queryOpenJarvis('hello')).rejects.toThrow(
      'OpenJarvis requires the Electron desktop environment'
    );
  });
});

describe('queryOpenJarvis — IPC response handling', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      value: { askJarvis: vi.fn() },
      configurable: true,
    });
  });

  it('returns trimmed response from IPC', async () => {
    window.electronAPI!.askJarvis = vi.fn().mockResolvedValue('  Hello Sir.  ');
    const result = await queryOpenJarvis('greet me');
    expect(result).toBe('Hello Sir.');
  });

  it('returns fallback message when IPC returns empty string', async () => {
    window.electronAPI!.askJarvis = vi.fn().mockResolvedValue('');
    const result = await queryOpenJarvis('run something');
    expect(result).toBe(
      'Command executed successfully, but no text output was returned by OpenJarvis.'
    );
  });

  it('returns fallback message when IPC returns whitespace only', async () => {
    window.electronAPI!.askJarvis = vi.fn().mockResolvedValue('   ');
    const result = await queryOpenJarvis('run something');
    expect(result).toBe(
      'Command executed successfully, but no text output was returned by OpenJarvis.'
    );
  });

  it('calls window.electronAPI.askJarvis with trimmed prompt', async () => {
    const mockFn = vi.fn().mockResolvedValue('pong');
    window.electronAPI!.askJarvis = mockFn;
    await queryOpenJarvis('  ping  ');
    expect(mockFn).toHaveBeenCalledWith('ping');
  });

  it('propagates IPC rejection as descriptive Error', async () => {
    window.electronAPI!.askJarvis = vi.fn().mockRejectedValue(
      new Error('uv: command not found')
    );
    await expect(queryOpenJarvis('hello')).rejects.toThrow('uv: command not found');
  });

  it('wraps non-Error IPC rejection with generic message', async () => {
    window.electronAPI!.askJarvis = vi.fn().mockRejectedValue('string rejection');
    await expect(queryOpenJarvis('hello')).rejects.toThrow(
      'An unexpected error occurred while executing OpenJarvis.'
    );
  });

  it('calls askJarvis exactly once per invocation', async () => {
    const mockFn = vi.fn().mockResolvedValue('response');
    window.electronAPI!.askJarvis = mockFn;
    await queryOpenJarvis('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
