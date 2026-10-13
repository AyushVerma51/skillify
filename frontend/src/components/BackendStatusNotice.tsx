import { useEffect, useState } from 'react';
import {
  BACKEND_STATUS_EVENT,
  BackendConnectionStatus,
  retryBackendConnection,
} from '../lib/api';

type NoticeState = 'hidden' | 'checking' | 'unavailable';

export default function BackendStatusNotice() {
  const [status, setStatus] = useState<NoticeState>('hidden');
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    let showTimer: number | undefined;

    const handleStatus = (event: Event) => {
      const nextStatus = (event as CustomEvent<BackendConnectionStatus>).detail;
      window.clearTimeout(showTimer);

      if (nextStatus === 'checking') {
        showTimer = window.setTimeout(() => setStatus('checking'), 700);
        return;
      }

      setStatus(nextStatus === 'unavailable' ? 'unavailable' : 'hidden');
      if (nextStatus === 'ready') setIsRetrying(false);
    };

    window.addEventListener(BACKEND_STATUS_EVENT, handleStatus);
    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener(BACKEND_STATUS_EVENT, handleStatus);
    };
  }, []);

  if (status === 'hidden') return null;

  const retry = async () => {
    setIsRetrying(true);
    setStatus('checking');
    try {
      await retryBackendConnection();
    } catch {
      setIsRetrying(false);
    }
  };

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-4 bottom-5 z-[70] mx-auto max-w-xl rounded-2xl border border-sk-ink/10 bg-sk-ink px-4 py-3 text-sk-paper shadow-2xl shadow-sk-ink/25 sm:px-5"
      role="status"
    >
      <div className="flex items-center gap-3">
        {status === 'checking' && (
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-sk-paper/30 border-t-sk-lime"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold">
            {status === 'checking' ? 'Waking up your workspace' : 'The workspace is still offline'}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-sk-paper/70">
            {status === 'checking'
              ? 'The free API may need up to a minute after being idle. Your action will continue automatically.'
              : 'The service took longer than expected to respond. Retry the connection when you are ready.'}
          </p>
        </div>
        {status === 'unavailable' && (
          <button
            className="shrink-0 rounded-full bg-sk-lime px-3 py-1.5 text-xs font-bold text-sk-ink transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
            disabled={isRetrying}
            onClick={retry}
            type="button"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </div>
    </div>
  );
}
