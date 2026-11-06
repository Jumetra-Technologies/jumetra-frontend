import { useState } from "react";
import { PageTitle } from "../shell/widgets";

type Category = "All components" | "Boards" | "Sensors" | "Actuators" | "Power & passives" | "Communication" | "Prototyping";

const CATEGORIES: Category[] = ["All components", "Boards", "Sensors", "Actuators", "Power & passives", "Communication", "Prototyping"];

const PARTS: Array<{ name: string; category: Category; detail: string }> = [
  { name: "Arduino Uno R3", category: "Boards", detail: "ATmega328P · 5 V logic · the default starter board" },
  { name: "Arduino Nano", category: "Boards", detail: "ATmega328P · 5 V logic · breadboard-friendly" },
  { name: "Arduino Mega 2560", category: "Boards", detail: "ATmega2560 · 5 V logic · 54 digital pins" },
  { name: "ESP32 DevKit", category: "Boards", detail: "Dual-core · 3.3 V logic · Wi-Fi and Bluetooth" },
  { name: "DHT11 humidity & temperature", category: "Sensors", detail: "Single-wire bus, 10 kΩ pull-up" },
  { name: "DHT22 humidity & temperature", category: "Sensors", detail: "Single-wire bus, wider range than the DHT11" },
  { name: "HC-SR04 ultrasonic distance", category: "Sensors", detail: "5 V trig/echo, up to about 4 m" },
  { name: "PIR motion sensor (HC-SR501)", category: "Sensors", detail: "3.3 V digital output while motion is seen" },
  { name: "LED, 5 mm", category: "Actuators", detail: "Through a 220 Ω resistor, any digital or PWM pin" },
  { name: "RGB LED, 5 mm", category: "Actuators", detail: "Common cathode, three PWM-capable pins" },
  { name: "SG90 micro servo", category: "Actuators", detail: "180° travel, one PWM pin, 5 V supply" },
  { name: "Buzzer, 12 mm active", category: "Actuators", detail: "3.5–5.5 V, under 30 mA from a pin" },
  { name: "L298N motor driver", category: "Power & passives", detail: "Dual H-bridge for brushed DC motors" },
  { name: "Resistor, 220 Ω", category: "Power & passives", detail: "The usual LED current-limiting value" },
  { name: "Breadboard, 830 point", category: "Prototyping", detail: "Full-size, two power rails each side" },
  { name: "HC-05 Bluetooth module", category: "Communication", detail: "Serial over Bluetooth, 3.3 V logic" },
];

/** Verified simulation models and board profiles: what a project can be built from. */
export function ComponentsLibrary({ onAddToProject }: { onAddToProject: (name: string) => void }) {
  const [category, setCategory] = useState<Category>("All components");
  const [query, setQuery] = useState("");
  const shown = PARTS.filter((p) => (category === "All components" || p.category === category) && p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="mx-auto max-w-[1280px] p-6" data-testid="components-library">
      <PageTitle title="Component library" detail="Verified simulation models and board profiles, with the electrical notes behind every pin." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-[14px] border border-border bg-surface p-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search components" className="mb-3 w-full rounded-[10px] border border-border bg-background px-3 py-2 text-xs outline-none focus-visible:border-primary" />
          {CATEGORIES.map((x) => (
            <button key={x} type="button" onClick={() => setCategory(x)} className={`w-full rounded-[10px] px-3 py-2 text-left text-xs ${category === x ? "bg-[color-mix(in_srgb,var(--primary)_14%,var(--surface))] font-semibold text-primary" : "text-muted hover:bg-muted-bg"}`}>
              {x}
            </button>
          ))}
        </aside>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((part) => (
            <article key={part.name} className="rounded-[14px] border border-border bg-surface p-4">
              <div className="mb-3 grid h-20 place-items-center rounded-[10px] bg-muted-bg">
                <div className="h-10 w-16 rounded-[8px] bg-[color-mix(in_srgb,var(--kiungo-teal)_30%,var(--muted-bg))]" />
              </div>
              <h3 className="text-xs font-semibold text-foreground">{part.name}</h3>
              <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{part.detail}</p>
              <button type="button" onClick={() => onAddToProject(part.name)} className="mt-3 rounded-[8px] bg-primary px-2.5 py-1.5 text-[10px] font-semibold text-primary-foreground hover:opacity-90">
                Add to lab
              </button>
            </article>
          ))}
          {shown.length === 0 ? <p className="col-span-full py-8 text-center text-sm text-muted">No components match that search.</p> : null}
        </div>
      </div>
    </div>
  );
}
