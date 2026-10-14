export interface CleanupConfig {
  retentionMs: number;
  intervalMs: number;
}

export function loadCleanupConfig(env = process.env): CleanupConfig | null {
  const retentionMs = env.SQUINT_RETENTION_MS;
  const intervalMs = env.SQUINT_CLEANUP_INTERVAL_MS;

  if (retentionMs === undefined) {
    return null;
  }

  const retention = Number(retentionMs);
  const interval = intervalMs === undefined ? 60 * 60 * 1000 : Number(intervalMs);

  return {
    retentionMs: retention,
    intervalMs: interval,
  };
}

export interface CleanupDependencies {
  deleteExpired(olderThanMs: number, now: number): Promise<string[]>;
  now(): number;
  setInterval(fn: () => void, ms: number): object;
  clearInterval(id: object): void;
}

export function startCleanupScheduler(
  config: CleanupConfig,
  deps: CleanupDependencies
): { stop(): void; runOnce(): Promise<string[]> } {
  let intervalId: object | null = null;

  async function runOnce(): Promise<string[]> {
    try {
      return await deps.deleteExpired(config.retentionMs, deps.now());
    } catch (error) {
      console.error('Cleanup error:', error);
      return [];
    }
  }

  function stop(): void {
    if (intervalId !== null) {
      deps.clearInterval(intervalId);
      intervalId = null;
    }
  }

  // Sofortiger erster Lauf
  runOnce().catch((error) => {
    console.error('Initial cleanup error:', error);
  });

  // Intervall starten
  intervalId = deps.setInterval(() => {
    runOnce().catch((error) => {
      console.error('Scheduled cleanup error:', error);
    });
  }, config.intervalMs);

  return {
    stop,
    runOnce,
  };
}
