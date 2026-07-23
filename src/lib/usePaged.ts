import { useCallback, useEffect, useRef, useState } from "react";

export const PAGE_SIZE = 100;

export function usePaged<T>(
  fetcher: (search: string, limit: number, offset: number) => Promise<T[]>,
  version: number,
) {
  const [rows, setRows] = useState<T[]>([]);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstSearch = useRef(true);

  const reload = useCallback(
    async (s: string, o: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetcher(s, PAGE_SIZE, o);
        setRows(data);
        setHasMore(data.length === PAGE_SIZE);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [fetcher],
  );

  useEffect(() => {
    setOffset(0);
    reload(search, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  useEffect(() => {
    if (firstSearch.current) {
      firstSearch.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setOffset(0);
      reload(search, 0);
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return {
    rows,
    search,
    offset,
    loading,
    error,
    hasMore,
    setSearch,
    setOffset,
    reload,
  };
}
