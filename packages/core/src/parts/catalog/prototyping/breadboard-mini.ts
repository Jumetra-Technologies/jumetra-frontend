import { BREADBOARD_SPECS, breadboardDef } from "../../models/breadboard";
import { definePart } from "../../sdk";

/** The mini breadboard: no rails, small enough for a robot's deck. Its layout lives in `models/breadboard.ts`. */
export default definePart(
  breadboardDef(BREADBOARD_SPECS["breadboard-mini"], {
    id: "breadboard-mini",
    name: "Breadboard (170 points)",
    aka: ["mini breadboard", "170-point breadboard", "tiny breadboard", "SYB-170"],
    rank: 4,
    summary:
      "A mini solderless breadboard: 17 columns of five-hole strips and no power rails. Small enough to stick on a robot chassis; take power from a strip you feed with jumpers.",
    facts: [
      { label: "Points", value: "170 (all terminal)" },
      { label: "Strips", value: "34 × 5 holes, no rails" },
      { label: "Pitch", value: '2.54 mm (0.1")' },
      { label: "Wire", value: "Solid core, 20–29 AWG" },
      { label: "Back", value: "Self-adhesive" },
      { label: "Size", value: "47 × 35 × 8.5 mm" },
    ],
    experiment: {
      title: "A sensor on the chassis",
      idea: "Mount an ultrasonic sensor on a mini board, feed one strip with 5 V and another with GND, and run the signal to the Uno.",
    },
    mass: 14,
    sourcing: { mpn: "SYB-170 (170 tie-point)", maker: "Many makers", lifecycle: "generic" },
  }),
);
