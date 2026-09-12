import { useCallback, useRef, useState } from 'react';

/**
 * Prevents duplicate submits from double-click / Enter spam.
 * Uses a ref for synchronous lock (state alone can race before re-render).
 */
export function useSubmitLock() {
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);

  const wrapSubmit = useCallback(async <T,>(fn: () => Promise<T> | T): Promise<T | undefined> => {
    if (pendingRef.current) return undefined;
    pendingRef.current = true;
    setPending(true);
    try {
      return await fn();
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, []);

  /** Synchronous guard for handlers that manage their own try/finally */
  const tryLock = useCallback(() => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPending(true);
    return true;
  }, []);

  const unlock = useCallback(() => {
    pendingRef.current = false;
    setPending(false);
  }, []);

  return { pending, wrapSubmit, tryLock, unlock, disabled: pending };
}
