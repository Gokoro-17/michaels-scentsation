import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { defaultSettings, readLocal, supabase } from "./lib";
import type { CartLine, Category, Product, Review, Settings } from "./types";
type Store = {
  products: Product[];
  categories: Category[];
  reviews: Review[];
  settings: Settings;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  cart: CartLine[];
  setQuantity: (id: string, n: number) => void;
  add: (p: Product, n?: number) => void;
  clearCart: () => void;
  wishlist: string[];
  toggleWish: (id: string) => void;
  recent: string[];
  viewed: (id: string) => void;
  toast: (message: string) => void;
};
const Context = createContext<Store>(null!);
export const useStore = () => useContext(Context);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [reviews, setReviews] = useState<Review[]>([]),
    [settings, setSettings] = useState(defaultSettings),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [cart, setCart] = useState<CartLine[]>(() => readLocal("msc-cart", [])),
    [wishlist, setWishlist] = useState<string[]>(() =>
      readLocal("msc-wishlist", []),
    ),
    [recent, setRecent] = useState<string[]>(() => readLocal("msc-recent", [])),
    [message, setMessage] = useState("");
  async function refresh() {
    if (!supabase) {
      setError("The collection will be available when the store opens.");
      setLoading(false);
      return;
    }
    setError("");
    try {
      const [p, c, r, s] = await Promise.all([
        supabase
          .from("products")
          .select("*,category:categories(*)")
          .eq("published", true)
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("position"),
        supabase
          .from("product_reviews")
          .select("id,product_id,customer_name,rating,body,approved,created_at")
          .eq("approved", true),
        supabase.from("website_settings").select("*").eq("id", 1).single(),
      ]);
      for (const result of [p, c, r, s]) if (result.error) throw result.error;
      setProducts(p.data || []);
      setCategories(c.data || []);
      setReviews((r.data || []) as Review[]);
      setSettings(s.data || defaultSettings);
    } catch {
      setError("We couldn’t load the collection. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    localStorage.setItem("msc-cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    localStorage.setItem("msc-wishlist", JSON.stringify(wishlist));
  }, [wishlist]);
  useEffect(() => {
    localStorage.setItem("msc-recent", JSON.stringify(recent));
  }, [recent]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(t);
  }, [message]);
  function setQuantity(id: string, n: number) {
    const p = products.find((p) => p.id === id);
    const quantity = Math.max(0, Math.min(n, p?.stock || 0));
    setCart((old) =>
      quantity
        ? old.some((l) => l.product_id === id)
          ? old.map((l) => (l.product_id === id ? { ...l, quantity } : l))
          : [...old, { product_id: id, quantity }]
        : old.filter((l) => l.product_id !== id),
    );
  }
  function add(p: Product, n = 1) {
    if (!p.available || p.stock < 1) {
      setMessage("This fragrance is currently sold out.");
      return;
    }
    setQuantity(
      p.id,
      (cart.find((l) => l.product_id === p.id)?.quantity || 0) + n,
    );
    setMessage(`${p.name} added to your bag.`);
  }
  const toggleWish = (id: string) =>
    setWishlist((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
    );
  return (
    <Context.Provider
      value={{
        products,
        categories,
        reviews,
        settings,
        loading,
        error,
        refresh,
        cart,
        setQuantity,
        add,
        clearCart: () => setCart([]),
        wishlist,
        toggleWish,
        recent,
        viewed: (id) =>
          setRecent((old) => [id, ...old.filter((x) => x !== id)].slice(0, 8)),
        toast: setMessage,
      }}
    >
      {children}
      <div className={`toast ${message ? "visible" : ""}`} role="status">
        {message}
      </div>
    </Context.Provider>
  );
}
