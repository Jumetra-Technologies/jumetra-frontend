import { BREADBOARD_SPECS, breadboardDef } from "../../models/breadboard";
import { definePart } from "../../sdk";

/** The full-size breadboard (MB-102). Its layout lives in `models/breadboard.ts`. */
export default definePart(
  breadboardDef(BREADBOARD_SPECS["breadboard-full"], {
    id: "breadboard-full",
    name: "Breadboard (830 points)",
    aka: ["full-size breadboard", "830-point breadboard", "large breadboard", "MB-102"],
    rank: 3,
    summary:
      "A full-size solderless breadboard: 63 columns of five-hole strips and four 50-hole power rails. Room for a board, a display and a handful of sensors in one build, all fed from the same pair of rails.",
    facts: [
      { label: "Points", value: "830 (630 terminal, 200 rail)" },
      { label: "Strips", value: "126 × 5 holes, 4 rails × 50" },
      { label: "Pitch", value: '2.54 mm (0.1")' },
      { label: "Wire", value: "Solid core, 20–29 AWG" },
      { label: "Contacts", value: "About 1 A per strip" },
      { label: "Size", value: "165.1 × 54.6 × 8.5 mm" },
    ],
    experiment: {
      title: "A weather station on one board",
      idea: "Put a DHT22, a BMP280 and an LCD on the full board, all powered from the top rails, and show the readings on the display.",
    },
    mass: 84,
    sourcing: { mpn: "MB-102 (830 tie-point)", maker: "Many makers; BusBoard and Twin Industries grip best", lifecycle: "generic", usd: [2, 8] },
  }),
);
