import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface WatchItem {
  id: string;
  name: string;
  subtitle: string;
  imageUrl: string;
  price: number;
  /** "auction" | "product" — ใช้กำหนดปลายทางเมื่อกดในเมนู */
  kind: "auction" | "product";
}

interface WatchlistValue {
  items: WatchItem[];
  count: number;
  has: (id: string) => boolean;
  toggle: (item: WatchItem) => boolean;
  remove: (id: string) => void;
  clear: () => void;
}

const WatchlistContext = createContext<WatchlistValue | null>(null);
const STORAGE_KEY = "taletails.watchlist";

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WatchItem[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as WatchItem[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const has = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const toggle = useCallback(
    (item: WatchItem) => {
      const exists = items.some((i) => i.id === item.id);
      setItems((prev) =>
        exists ? prev.filter((i) => i.id !== item.id) : [item, ...prev.filter((i) => i.id !== item.id)],
      );
      return !exists;
    },
    [items],
  );

  const remove = useCallback((id: string) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<WatchlistValue>(
    () => ({ items, count: items.length, has, toggle, remove, clear }),
    [items, has, toggle, remove, clear],
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist(): WatchlistValue {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be used inside WatchlistProvider");
  return ctx;
}
