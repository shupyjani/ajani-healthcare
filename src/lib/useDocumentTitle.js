import { useEffect } from 'react';

/**
 * Set the document title for the lifetime of a route, then put back whatever
 * was there before.
 *
 * index.html carries one static title for the whole application, which is
 * right for the home page and wrong for every other route. This is the
 * smallest thing that fixes it: no dependency, no context, no head manager.
 *
 * Restoring the previous title on unmount rather than assuming a default
 * means a route that mounts inside another route's title cannot strand the
 * wrong one in the tab.
 *
 * This affects the live document only. The crawled and shared title still
 * comes from index.html, because a client-side render happens after the
 * response is served; per-route metadata for sharing would need prerendering.
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    if (typeof document === 'undefined' || !title) return undefined;

    const previous = document.title;
    document.title = title;

    return () => {
      document.title = previous;
    };
  }, [title]);
}

export default useDocumentTitle;
