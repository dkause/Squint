import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadCleanupConfig,
  startCleanupScheduler,
  type CleanupConfig,
} from './cleanup.js';

describe('cleanup', () => {
  describe('loadCleanupConfig', () => {
    it('should return config with valid retention and interval values', () => {
      const env = {
        SQUINT_RETENTION_MS: '86400000',
        SQUINT_CLEANUP_INTERVAL_MS: '3600000',
      };

      const config = loadCleanupConfig(env);

      expect(config).toEqual({
        retentionMs: 86400000,
        intervalMs: 3600000,
      });
    });

    it('should return config with default interval (1 hour) when interval not set', () => {
      const env = {
        SQUINT_RETENTION_MS: '86400000',
      };

      const config = loadCleanupConfig(env);

      expect(config).toEqual({
        retentionMs: 86400000,
        intervalMs: 60 * 60 * 1000,
      });
    });

    it('should return null when SQUINT_RETENTION_MS is missing', () => {
      const env = {
        SQUINT_CLEANUP_INTERVAL_MS: '3600000',
      };

      const config = loadCleanupConfig(env);

      expect(config).toBeNull();
    });

    it('should return null when env is empty', () => {
      const config = loadCleanupConfig({});

      expect(config).toBeNull();
    });

    it('should use process.env when no env parameter provided', () => {
      const originalEnv = process.env;
      process.env = { ...process.env, SQUINT_RETENTION_MS: '7200000' };

      const config = loadCleanupConfig();

      expect(config).toEqual({
        retentionMs: 7200000,
        intervalMs: 60 * 60 * 1000,
      });

      process.env = originalEnv;
    });
  });

  describe('startCleanupScheduler', () => {
    let intervalId: object;
    let shouldFail: boolean;
    let returnTokens: string[] | null;
    let intervalCallback: (() => void) | null = null;

    beforeEach(() => {
      intervalId = {};
      shouldFail = false;
      returnTokens = null;
      intervalCallback = null;

      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    const createDeps = () => ({
      deleteExpired: vi.fn((): Promise<string[]> => {
        if (shouldFail) {
          return Promise.reject(new Error('Filesystem error'));
        }
        return Promise.resolve(returnTokens ?? []);
      }),
      now: vi.fn((): number => 1000000),
      setInterval: vi.fn((fn: () => void): object => {
        intervalCallback = fn;
        return intervalId;
      }),
      clearInterval: vi.fn((): void => {}),
    });

    it('should call deleteExpired with retentionMs and current now on runOnce', async () => {
      const config: CleanupConfig = {
        retentionMs: 86400000,
        intervalMs: 3600000,
      };

      const deps = createDeps();
      const scheduler = startCleanupScheduler(config, deps);

      // Wait for immediate run to complete
      await vi.waitFor(() => {
        expect(deps.deleteExpired).toHaveBeenCalledTimes(1);
      });

      // Reset call count
      deps.deleteExpired.mockClear();

      await scheduler.runOnce();

      expect(deps.deleteExpired).toHaveBeenCalledTimes(1);
      expect(deps.deleteExpired).toHaveBeenCalledWith(config.retentionMs, deps.now());
    });

    it('should run immediately on start (first run without waiting for interval)', async () => {
      const config: CleanupConfig = {
        retentionMs: 86400000,
        intervalMs: 3600000,
      };

      const deps = createDeps();
      startCleanupScheduler(config, deps);

      // Wait for immediate run
      await vi.waitFor(() => {
        expect(deps.deleteExpired).toHaveBeenCalledTimes(1);
      });

      expect(deps.deleteExpired).toHaveBeenCalledWith(config.retentionMs, deps.now());
    });

    it('should start interval and call deleteExpired repeatedly', async () => {
      const config: CleanupConfig = {
        retentionMs: 86400000,
        intervalMs: 1000,
      };

      const deps = createDeps();
      startCleanupScheduler(config, deps);

      // Wait for immediate run
      await vi.waitFor(() => {
        expect(deps.deleteExpired).toHaveBeenCalledTimes(1);
      });

      // Manually trigger the interval callback
      if (intervalCallback) {
        intervalCallback();
      }

      // Wait for scheduled run
      await vi.waitFor(() => {
        expect(deps.deleteExpired).toHaveBeenCalledTimes(2);
      });
    });

    it('should stop interval with stop() and clearInterval', () => {
      const config: CleanupConfig = {
        retentionMs: 86400000,
        intervalMs: 1000,
      };

      const deps = createDeps();
      const scheduler = startCleanupScheduler(config, deps);

      scheduler.stop();

      expect(deps.clearInterval).toHaveBeenCalledTimes(1);
      expect(deps.clearInterval).toHaveBeenCalledWith(intervalId);
    });

    it('should not leave hanging timers after stop (testable)', () => {
      const config: CleanupConfig = {
        retentionMs: 86400000,
        intervalMs: 1000,
      };

      const deps = createDeps();
      const scheduler = startCleanupScheduler(config, deps);

      // Stop should clear the interval
      scheduler.stop();

      // Verify clearInterval was called
      expect(deps.clearInterval).toHaveBeenCalledWith(intervalId);

      // Call stop again - should not throw and should not call clearInterval again
      scheduler.stop();
      expect(deps.clearInterval).toHaveBeenCalledTimes(1);
    });

    it('should survive errors in deleteExpired and continue scheduling', async () => {
      const config: CleanupConfig = {
        retentionMs: 86400000,
        intervalMs: 1000,
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const deps = createDeps();
      shouldFail = true;

      const scheduler = startCleanupScheduler(config, deps);

      // Wait for immediate run to fail
      await vi.waitFor(() => {
        expect(deps.deleteExpired).toHaveBeenCalledTimes(1);
      });

      expect(consoleErrorSpy).toHaveBeenCalled();

      // Reset for second call
      shouldFail = false;
      deps.deleteExpired.mockClear();

      // Manually trigger the interval callback
      if (intervalCallback) {
        intervalCallback();
      }

      // Wait for second run to succeed
      await vi.waitFor(() => {
        expect(deps.deleteExpired).toHaveBeenCalledTimes(1);
      });

      // stop() should still work cleanly
      scheduler.stop();
      expect(deps.clearInterval).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should return deleted tokens from runOnce', async () => {
      const config: CleanupConfig = {
        retentionMs: 86400000,
        intervalMs: 3600000,
      };

      const deletedTokens = ['token1', 'token2', 'token3'];
      const deps = createDeps();
      returnTokens = deletedTokens;

      const scheduler = startCleanupScheduler(config, deps);

      // Wait for immediate run
      await vi.waitFor(() => {
        expect(deps.deleteExpired).toHaveBeenCalledTimes(1);
      });

      // Reset for runOnce call
      deps.deleteExpired.mockClear();

      const result = await scheduler.runOnce();

      expect(result).toEqual(deletedTokens);
    });

    it('should return empty array when deleteExpired throws', async () => {
      const config: CleanupConfig = {
        retentionMs: 86400000,
        intervalMs: 3600000,
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const deps = createDeps();
      shouldFail = true;

      const scheduler = startCleanupScheduler(config, deps);

      // Wait for immediate run
      await vi.waitFor(() => {
        expect(deps.deleteExpired).toHaveBeenCalledTimes(1);
      });

      // Reset for runOnce call
      deps.deleteExpired.mockClear();

      const result = await scheduler.runOnce();

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
