import React from 'react';

/**
 * Wraps React.lazy with automatic recovery for stale dynamic import chunks.
 * When a new deployment occurs on Vercel/production, older client sessions
 * attempting to lazy load newly hashed chunks will fail with:
 * "TypeError: Failed to fetch dynamically imported module"
 *
 * This wrapper catches that error, forces a single window reload to load the latest
 * assets, and prevents the user from encountering the crash screen.
 */
export function lazyWithRetry(componentImport) {
  return React.lazy(async () => {
    const sessionKey = 'lazy_chunk_retry_timestamp';
    try {
      const component = await componentImport();
      if (!component) {
        return { default: () => null };
      }
      if (typeof component === 'function') {
        return { default: component };
      }
      if (component.default) {
        return component;
      }
      // Look for first exported function component
      const keys = Object.keys(component);
      for (const k of keys) {
        if (typeof component[k] === 'function') {
          return { default: component[k] };
        }
      }
      return { default: () => null };
    } catch (error) {
      const isChunkLoadFailed =
        error?.name === 'ChunkLoadError' ||
        /failed to fetch dynamically imported module/i.test(error?.message || '') ||
        /loading chunk .* failed/i.test(error?.message || '') ||
        /error loading dynamically imported module/i.test(error?.message || '');

      if (isChunkLoadFailed) {
        const retryCount = Number(window.sessionStorage.getItem('lazy_chunk_retry_count') || 0);

        // Allow at most 1 reload attempt per user session
        if (retryCount < 1) {
          window.sessionStorage.setItem('lazy_chunk_retry_count', '1');
          window.location.reload();
          // Return a hanging promise so React Suspense waits for the page reload to execute
          return new Promise(() => {});
        } else {
          console.warn('lazyWithRetry: Max reload attempt reached. Halting auto-reload to prevent loop.');
        }
      }

      // Bubble to ErrorBoundary if retry already exhausted or other error
      throw error;
    }
  });
}

export default lazyWithRetry;
