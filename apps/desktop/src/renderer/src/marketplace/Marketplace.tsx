import { useState } from "react";
import { ShoppingCart, Store, X } from "lucide-react";
import { Button } from "@kiungo/ui/button";
import { PageTitle } from "../shell/widgets";

interface Product {
  id: string;
  name: string;
  description: string;
  type: "Hardware" | "Digital product" | "Service";
  category: string;
  price: number;
  inventory: number | null;
}

const PRODUCTS: Product[] = [
  { id: "uno-r3", name: "Arduino Uno R3", description: "The board most Kiungo starters target first.", type: "Hardware", category: "Boards", price: 24.9, inventory: 42 },
  { id: "esp32", name: "ESP32 DevKit", description: "Wi-Fi and Bluetooth, for connected projects.", type: "Hardware", category: "Boards", price: 11.5, inventory: 30 },
  { id: "sensor-kit", name: "Starter sensor kit", description: "DHT11, HC-SR04, PIR, and a breadboard.", type: "Hardware", category: "Sensors", price: 18.0, inventory: 20 },
  { id: "course-robotics", name: "Practical Robotics course", description: "The full Learning Center track, downloadable.", type: "Digital product", category: "Courses", price: 29.0, inventory: null },
  { id: "firmware-review", name: "Firmware review (1 hour)", description: "A Kiungo engineer reviews your build before you flash it.", type: "Service", category: "Professional services", price: 75.0, inventory: null },
];

const FILTERS = ["All", "Hardware", "Digital products", "Professional services"] as const;

/** From validated simulation to verified hardware, digital tools, and professional engineering services. */
export function Marketplace() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [cart, setCart] = useState<Product[]>([]);
  const [checkout, setCheckout] = useState(false);
  const total = cart.reduce((sum, p) => sum + p.price, 0);
  const shown = PRODUCTS.filter((p) => filter === "All" || (filter === "Hardware" && p.type === "Hardware") || (filter === "Digital products" && p.type === "Digital product") || (filter === "Professional services" && p.type === "Service"));

  return (
    <div className="mx-auto max-w-[1280px] p-6" data-testid="marketplace">
      <PageTitle title="Kiungo Marketplace" detail="Move from validated simulation to verified hardware, digital tools, and professional engineering services." />
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <button key={x} type="button" onClick={() => setFilter(x)} className={`whitespace-nowrap rounded-[10px] px-3 py-2 text-xs ${filter === x ? "bg-primary text-primary-foreground" : "border border-border bg-surface text-foreground hover:bg-muted-bg"}`}>
            {x}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((p) => (
          <article key={p.id} className="overflow-hidden rounded-[14px] border border-border bg-surface">
            <div className="grid h-24 place-items-center bg-[color-mix(in_srgb,var(--primary)_10%,var(--surface))]">
              <Store className="size-8 text-primary" aria-hidden />
            </div>
            <div className="p-4">
              <div className="text-[9.5px] font-semibold uppercase tracking-wider text-primary">
                {p.type} · {p.category}
              </div>
              <h3 className="mt-1 text-[13px] font-semibold text-foreground">{p.name}</h3>
              <p className="mt-2 line-clamp-2 text-[10.5px] leading-relaxed text-muted">{p.description}</p>
              <div className="mt-4 flex items-center">
                <div>
                  <div className="text-[13px] font-bold text-foreground">USD {p.price.toFixed(2)}</div>
                  <div className="text-[9px] text-muted">{p.inventory !== null ? `${p.inventory} in stock` : "Digital delivery"}</div>
                </div>
                <button type="button" onClick={() => setCart((c) => [...c, p])} className="ml-auto grid size-8 place-items-center rounded-[10px] bg-primary text-primary-foreground hover:opacity-90">
                  <ShoppingCart className="size-3.5" aria-hidden />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {cart.length > 0 ? (
        <div className="mt-5 flex items-center gap-3 rounded-[14px] border border-primary/30 bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface))] p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Cart</h3>
            <p className="text-[10.5px] text-muted">{cart.length} item{cart.length === 1 ? "" : "s"}</p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[15px] font-bold text-foreground">USD {total.toFixed(2)}</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setCart([])}>
            Clear
          </Button>
          <Button size="sm" onClick={() => setCheckout(true)}>
            Review checkout
          </Button>
        </div>
      ) : null}

      {checkout ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-5" onMouseDown={() => setCheckout(false)}>
          <div className="w-full max-w-lg rounded-[16px] bg-surface p-6 shadow-[var(--shadow-md)]" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-start">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Checkout</h2>
                <p className="mt-1 text-[11px] text-muted">
                  {cart.length} item{cart.length === 1 ? "" : "s"} · USD {total.toFixed(2)}
                </p>
              </div>
              <button type="button" onClick={() => setCheckout(false)} aria-label="Close" className="ml-auto text-muted">
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <p className="mt-5 rounded-[10px] bg-muted-bg p-3 text-[11px] text-muted">Ordering isn&apos;t connected yet — there&apos;s no live marketplace behind this preview, so nothing is charged or shipped from here.</p>
            <Button variant="secondary" className="mt-4 w-full" onClick={() => setCheckout(false)}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
