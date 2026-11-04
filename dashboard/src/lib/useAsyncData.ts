import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Small data-loading hook with abort support and manual reload. Keeps the
 * previous data visible while refreshing so live updates do not flash.
 */
export function useAsyncData<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
  enabled = true,
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: enabled,
    error: null,
  });
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: null }));

    loaderRef
      .current(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((previous) => ({
          data: previous.data,
          loading: false,
          error: error instanceof Error ? error : new Error('Request failed'),
        }));
      });

    return () => controller.abort();
    // The caller controls freshness through `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tick, ...deps]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  return { ...state, reload };
}

/** Background refresh so a missed realtime event can never freeze a view. */
export function useReloadInterval(reload: () => void, milliseconds: number, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(reload, milliseconds);
    return () => window.clearInterval(timer);
  }, [reload, milliseconds, enabled]);
}
