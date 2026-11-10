import { BREADBOARD_SPECS, breadboardDef } from "../../models/breadboard";
import { definePart } from "../../sdk";

/** The half-size breadboard: the one in every starter kit. Its layout lives in `models/breadboard.ts`. */
export default definePart(
  breadboardDef(BREADBOARD_SPECS.breadboard, {
    id: "breadboard",
    name: "Breadboard (400 points)",
    aka: ["solderless breadboard", "half-size breadboard", "half breadboard", "protoboard", "400-point breadboard", "power rail"],
    rank: 1,
    summary:
      "A half-size solderless breadboard: 30 columns of five-hole strips either side of a center channel, and a + and − power rail along each edge. Wire the board's 5 V and GND to one pair of rails once, and every part takes its power from the rail.",
    facts: [
      { label: "Points", value: "400 (300 terminal, 100 rail)" },
      { label: "Strips", value: "60 × 5 holes, 4 rails × 25" },
      { label: "Pitch", value: '2.54 mm (0.1")' },
      { label: "Wire", value: "Solid core, 20–29 AWG" },
      { label: "Contacts", value: "About 1 A per strip" },
      { label: "Size", value: "82.5 × 54.6 × 8.5 mm" },
    ],
    experiment: {
      title: "One 5 V pin, three sensors",
      idea: "Wire the Uno's 5 V and GND to the top rails, then power a DHT11, an ultrasonic sensor and a PIR from the rails while each signal goes to its own pin.",
    },
    mass: 38,
    sourcing: { mpn: "BB400 (400 tie-point)", maker: "BusBoard, Twin Industries and many others", lifecycle: "generic" },
  }),
);
