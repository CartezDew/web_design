import { useCallback, useEffect, useState } from "react";
import { apiRequest, API_BASE } from "../api";
export function useRecords(path) {
  const [data, setData] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [next, setNext] = useState(null);
  const load = useCallback(
    async (more = false) => {
      setError("");
      setLoading(true);
      try {
        let requestPath = path;
        if (more && next) {
          const url = new URL(next, window.location.origin);
          const prefix = new URL(API_BASE, window.location.origin).pathname;
          requestPath = url.pathname.slice(prefix.length) + url.search;
        }
        const result = await apiRequest(requestPath);
        setData((old) =>
          more
            ? [...old, ...(result.results || result)]
            : result.results || result,
        );
        setNext(result.next || null);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [path, next],
  );
  // Only path changes restart the list; next-page updates must not trigger a reload.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiRequest(path)
      .then((result) => {
        if (alive) {
          setData(result.results || result);
          setNext(result.next || null);
          setError("");
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [path]);
  return {
    data,
    error,
    loading,
    next,
    reload: () => load(false),
    more: () => load(true),
  };
}
