/**
 * The part model behind the Component library.
 *
 * One model per part describes it in millimetres: the solids that make up
 * its body, the features a person would point at (pins, ports, LEDs,
 * buttons), and the electrical blocks inside it with the paths current takes
 * between them. Three renderers draw every part from this one description:
 * the 3D model, the top view, and the current-flow view.
 *
 * Coordinates: the part is seen from above. The origin is its top-left
 * corner; x runs right, y runs down the page (towards the viewer's front)
 * and z runs up, out of the board. All lengths are in millimetres.
 */

export type PartGroupId = "boards" | "sensors" | "outputs" | "displays" | "radios";

export interface PartGroup {
  id: PartGroupId;
  title: string;
  blurb: string;
}

/** A CSS colour (hex) or a CSS background for the top face. */
export type Paint = string;

export type Solid =
  | {
      kind: "box";
      id?: string;
      x: number;
      y: number;
      w: number;
      h: number;
      /** Height above the board surface. */
      d: number;
      /** Base height; parts stacked on others start above zero. */
      z?: number;
      top: Paint;
      side?: Paint;
      /** Flat fill for the 2D views when `top` is a gradient. */
      fill?: string;
      radius?: number;
      /** Rows of header holes punched into the top, across the long axis. */
      holes?: { count: number; rows?: number };
      /** Marks a lit element; the colour of its glow when powered. */
      glow?: string;
      /** Text printed on the top face. */
      label?: { text: string; size?: number; color?: string };
    }
  | {
      kind: "cyl";
      id?: string;
      cx: number;
      cy: number;
      r: number;
      d: number;
      z?: number;
      top: Paint;
      side?: Paint;
      fill?: string;
      segments?: number;
      glow?: string;
    }
  | {
      /** A rounded top, built from stacked discs. LEDs, PIR lenses, caps. */
      kind: "dome";
      id?: string;
      cx: number;
      cy: number;
      r: number;
      d: number;
      z?: number;
      color: string;
      glow?: string;
      /** Draw the dome translucent, as clear LED plastic is. */
      clear?: boolean;
    }
  | {
      /** Vertical pins: header pins, component legs. */
      kind: "pins";
      id?: string;
      x: number;
      y: number;
      count: number;
      pitch: number;
      dir: "x" | "y";
      /** Pin length; negative z lets pins hang below the board. */
      len: number;
      z?: number;
      rows?: number;
      color?: string;
      /** Square pin side. */
      size?: number;
    }
  | {
      /** Silkscreen text on the board surface. */
      kind: "text";
      x: number;
      y: number;
      text: string;
      size: number;
      color?: string;
      weight?: number;
      rotate?: number;
      z?: number;
      anchor?: "start" | "middle" | "end";
    }
  | {
      /** A flat printed path (trace, outline, marking) on the board surface. */
      kind: "path";
      d: string;
      color?: string;
      width?: number;
      fill?: string;
      z?: number;
    }
  | {
      /** A flat disc on the surface: a pad, a hole, a marking. */
      kind: "disc";
      cx: number;
      cy: number;
      r: number;
      color: string;
      z?: number;
      ring?: { color: string; width: number };
    };

export type FeatureKind = "pin" | "pins" | "port" | "led" | "button" | "chip" | "antenna" | "sensor" | "connector" | "power" | "mechanical" | "other";

/** Something a person would point at in the top view. */
export interface Feature {
  id: string;
  label: string;
  kind: FeatureKind;
  x: number;
  y: number;
  w: number;
  h: number;
  note: string;
}

export type PinRole = "power" | "ground" | "digital" | "analog" | "pwm" | "data" | "clock" | "uart" | "spi" | "i2c" | "mechanical" | "other";

export interface PinInfo {
  name: string;
  role: PinRole;
  note: string;
}

export type BlockKind = "pin" | "power" | "ground" | "mcu" | "ic" | "passive" | "sensor" | "actuator" | "connector" | "antenna" | "regulator" | "driver" | "display" | "world";

export interface CircuitBlock {
  id: string;
  label: string;
  sub?: string;
  kind: BlockKind;
  col: number;
  row: number;
  note: string;
}

export type LinkKind = "power" | "ground" | "signal" | "data" | "analog" | "mechanical" | "rf" | "light" | "sound" | "physical";

export interface CircuitLink {
  from: string;
  to: string;
  kind: LinkKind;
  label?: string;
  /** Current or data runs both ways. */
  both?: boolean;
}

export interface Circuit {
  blocks: CircuitBlock[];
  links: CircuitLink[];
  /** How it works, one step at a time. */
  steps: string[];
}

export interface Fact {
  label: string;
  value: string;
}

export interface PartModel {
  id: string;
  name: string;
  /** Other names people use for it. */
  aka?: string[];
  group: PartGroupId;
  /** Lower comes first inside its group; 1 is the part most people reach for. */
  rank: number;
  summary: string;
  /** Overall size in mm: footprint and height. */
  size: { w: number; h: number; d: number };
  /**
   * Which face the top view draws. "top" looks down on the part; "front" looks
   * at it standing up, for parts whose face is vertical (LEDs, TO-92 sensors).
   * In a front view, feature y runs down from the top of the part.
   */
  plan?: "top" | "front";
  solids: Solid[];
  features: Feature[];
  pins: PinInfo[];
  circuit: Circuit;
  facts: Fact[];
  /** Ids of solids that light up, turn, or sweep back and forth when the part is powered in the 3D view. */
  animate?: { lit?: string[]; spin?: string[]; sweep?: string[] };
  /** A first experiment worth running with it. */
  experiment: { title: string; idea: string };
  /** Reference article in the Documentation Center, when one exists. */
  docs?: string;
  tags: string[];
}
