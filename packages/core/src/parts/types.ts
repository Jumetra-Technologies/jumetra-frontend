/**
 * The part model behind the Component library.
 *
 * One model per part describes it in millimeters: the solids that make up
 * its body, the features a person would point at (pins, ports, LEDs,
 * buttons), and the electrical blocks inside it with the paths current takes
 * between them. Three renderers draw every part from this one description:
 * the 3D model, the top view, and the current-flow view.
 *
 * Coordinates: the part is seen from above. The origin is its top-left
 * corner; x runs right, y runs down the page (towards the viewer's front)
 * and z runs up, out of the board. All lengths are in millimeters.
 */

export type PartGroupId = "boards" | "power" | "prototyping" | "controls" | "sensors" | "motors" | "drivers" | "outputs" | "displays" | "radios";

export interface PartGroup {
  id: PartGroupId;
  title: string;
  blurb: string;
}

/** A CSS color (hex) or a CSS background for the top face. */
export type Paint = string;

/**
 * What a solid is made of, for the 3D renderer's lighting. Left out, the
 * renderer infers it from the color and the solid's id.
 *   soldermask: the glossy lacquer on a PCB.   epoxy: a chip's matte black body.
 *   plastic: molded parts (headers, buttons, sockets).   metal: steel shells and cans.
 *   gold, tin, copper: plated pins and pads.   rubber: tyres, grommets.
 *   glass: display glass.   clear: LED lenses and other clear plastic.
 *   ceramic: SMD capacitors and resistors.   paper: labels and stickers.
 *   aluminum: bare satin aluminum (motor cans, capacitor tops).   anodized: colored
 *   aluminum that keeps the solid's own color (black heatsinks).   brass: gears, shafts, standoffs.
 */
export type Finish = "soldermask" | "epoxy" | "plastic" | "metal" | "gold" | "tin" | "copper" | "rubber" | "glass" | "clear" | "ceramic" | "paper" | "aluminum" | "anodized" | "brass";

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
      /** Marks a lit element; the color of its glow when powered. */
      glow?: string;
      /** Text printed on the top face. */
      label?: { text: string; size?: number; color?: string };
      finish?: Finish;
      /** Degrees to turn the box about its own center, seen from above (a chip mounted as a diamond is 45). */
      turn?: number;
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
      finish?: Finish;
      /** The axis it stands along: z (upright, the default), or lying along x or y, centered on (cx, cy) at height z + r. */
      axis?: "x" | "y" | "z";
      /** Radius at the far end (the top, or the +x / +y end when lying), for cones and tapers. Defaults to `r`. */
      r2?: number;
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
      finish?: Finish;
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
      finish?: Finish;
    }
  | {
      /** Silkscreen text on the board surface. */
      kind: "text";
      /** "screen:N" marks line N of a display's glass, which the lab writes live text into; "screen-demo" is decoration the lab blanks. */
      id?: string;
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
      /** A hole drilled through the board: only its ring is drawn, and the board shows through. */
      hole?: boolean;
    }
  | {
      /**
       * A flat outline pushed up into a solid: any shape a box or cylinder
       * can't make (a ring of LEDs, a servo horn, a bracket, a board that
       * isn't a rectangle).
       */
      kind: "extrude";
      id?: string;
      /** The outline as a closed SVG path in mm, seen from above. Further closed subpaths inside it cut holes. */
      path: string;
      /** Thickness. */
      d: number;
      z?: number;
      top: Paint;
      side?: Paint;
      fill?: string;
      glow?: string;
      finish?: Finish;
      /** Rounds the top edge by this much, in mm. */
      bevel?: number;
    }
  | {
      /** A flexible lead or cable through points in space: battery leads, a servo cable, a ribbon. */
      kind: "wire";
      id?: string;
      /** The points it passes through, as [x, y, z] in mm. */
      points: Array<[number, number, number]>;
      /** Radius of the wire. */
      r: number;
      color: string;
      finish?: Finish;
    };

/**
 * How a part sits on the Engineering Lab canvas when it is drawn as itself
 * (no card around it): where each pinout pin's hole is on the board, in mm,
 * so jumper wires land on the real header, and where the USB lead plugs in.
 */
export interface CanvasSpec {
  /** Pinout pin id → hole center on the board (mm, top-left origin). */
  pins: Record<string, { x: number; y: number }>;
  /** The USB socket's mouth: where the lead's plug seats, and the side it comes in from. */
  usb?: { x: number; y: number; z: number; from: "left" | "right" | "top" | "bottom" };
  /** The still 3D view on the canvas, when the default three-quarter view would crowd the holes. */
  view?: { spin: number; tilt: number };
  /** Height (mm) of the hole tops wires land on. Defaults to a female header on a PCB. */
  pinZ?: number;
  /** Also draw the part as itself in the Trace view (a breadboard has too many holes for a card). */
  trace?: boolean;
}

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
  /**
   * Where the block is on the real part, so the Trace view can point at it:
   * the id of a feature or of a pin, or a point in mm. Left out for blocks
   * that aren't on the part (the air, an object, the thing being measured).
   */
  at?: string | { x: number; y: number };
  /** The part of the circuit that gets warm: the Trace view shows its heat. */
  hot?: boolean;
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
  /**
   * Ids of solids that light up, turn, or sweep back and forth when the part
   * is powered in the 3D view. With `axis`, everything that turns or sweeps
   * does so together about that one line (a shaft with its horn or wheel):
   * a point on it in mm, and the way it runs. Without it, each solid turns
   * about its own middle, upright.
   */
  animate?: { lit?: string[]; spin?: string[]; sweep?: string[]; axis?: { at: [number, number, number]; dir: "x" | "y" | "z" } };
  /** A first experiment worth running with it. */
  experiment: { title: string; idea: string };
  /** Reference article in the Documentation Center, when one exists. */
  docs?: string;
  tags: string[];
  /** Set for parts the lab draws as themselves on the canvas, with wires on their real pins. */
  canvas?: CanvasSpec;
  /** The engineering data behind the part: form factor, power, heat, sourcing and where it falls short. */
  spec?: PartSpec;
  /** Where each wireable pin is on the part, for the labeled 2D view and the Trace view. */
  pinSpots?: PinSpot[];
  /** How the lab simulates it, for parts the lab doesn't have a hand-written model for. */
  sim?: PartSim;
}

/* ----- Pins on the part ----------------------------------------------------- */

/** One wireable pin where it really is on the part (mm; in a front view, y runs down from the top). */
export interface PinSpot {
  /** The lab's pin id. */
  id: string;
  label: string;
  role: PinRole;
  x: number;
  y: number;
  note?: string;
}

/* ----- Wiring in the lab ---------------------------------------------------- */

/** What a board pin can do. */
export type PinFn = "power" | "ground" | "digital" | "analog" | "pwm" | "sda" | "scl" | "tx" | "rx" | "mosi" | "miso" | "sck" | "cs" | "led";

/** What a peripheral pin expects from the far end of its wire. */
export type LabPinRole =
  | "vcc" // needs a supply
  | "gnd" // needs ground
  | "drive" // driven by a board output (digital or PWM)
  | "pwm" // driven by a board PWM output
  | "out-digital" // the part drives it, a board reads it
  | "out-analog" // the part outputs a voltage, an analog pin reads it
  | "io" // single-wire data both ways
  | "sda"
  | "scl"
  | "tx" // the part transmits on it
  | "rx" // the part receives on it
  | "mosi"
  | "miso"
  | "sck"
  | "cs"
  | "load" // the switched or driven side: relay contacts, a driver's motor outputs, a motor's terminals
  | "opt"; // optional

export interface LabPin {
  id: string;
  label: string;
  side: "left" | "right";
  /** Board pins: what the pin can do. */
  fns?: PinFn[];
  /** Supply pins: the voltage they give (a board's 5 V pin, a battery's + terminal). */
  supplies?: number;
  /**
   * A supply pin that can also be fed from outside (a board's VIN): the
   * voltage range it takes. With a source on its wire it is an input.
   */
  accepts?: [number, number];
  /** Board pins that can only read (no output driver). */
  inputOnly?: boolean;
  /** On a programming header (ICSP): never where auto-wire takes power from. */
  programmingHeader?: boolean;
  /** Peripheral pins: what the far end should be. */
  role?: LabPinRole;
  /** Must be connected for the part to work. */
  required?: boolean;
  note?: string;
}

export interface Pinout {
  partId: string;
  controller: boolean;
  /** Logic level in volts: what a board outputs, or what a peripheral's signals run at. */
  logic: number;
  /** Peripheral inputs that survive 5 V, or a board whose inputs do. */
  tolerates5V: boolean | "some";
  /** Peripheral supply range in volts. */
  supply?: [number, number];
  pins: LabPin[];
  /**
   * A passive part that only joins pins (a breadboard): it has no supply, no
   * signals and nothing to check, and its `strips` are joined inside it.
   */
  passive?: boolean;
  /** Groups of pin ids joined inside the part, as a breadboard's strips are. */
  strips?: readonly string[][];
}

/* ----- Engineering data ----------------------------------------------------- */

/** How a part joins a build. */
export type Mounting = "breadboard" | "jumpers" | "terminals" | "leads" | "solder" | "socket" | "panel";

export interface PartSpec {
  /** Form factor: what it weighs, how it mounts and what it plugs into. */
  form: {
    /** Grams. */
    mass?: number;
    /** breadboard: plugs straight in. jumpers: a header for jumper wires. terminals: screw terminals. leads: flying leads. solder: pads. socket: plugs onto a board or into a socket. panel: bolts through a panel. */
    mount: Mounting;
    /** Pin pitch in mm. */
    pitch?: number;
    /** Mounting holes: center and diameter in mm. */
    holes?: Array<{ x: number; y: number; d: number }>;
    note?: string;
  };
  /** Power: what it needs, what it draws and what it can deliver. Volts and milliamps. */
  power: {
    /** The supply it takes at its supply pin. */
    supply?: { min: number; max: number; typ?: number };
    /** The level its signals run at. */
    logic?: number;
    /** Its inputs survive 5 V signals. */
    tolerant5V?: boolean;
    /** Current it draws from its supply: doing nothing, working, and at worst (stall, transmit burst, inrush). */
    draw?: { idle: number; active: number; peak?: number };
    /** Batteries: what the pack gives. `ohms` is its internal resistance (volts lost per amp). */
    source?: { volts: number; maxMa: number; capacityMah?: number; ohms?: number; chemistry?: string };
    /** Regulators and converters. linear burns the difference as heat; buck and boost convert it; pass hands its input straight on (a protection or charger board). */
    converter?: { law: "buck" | "boost" | "linear" | "pass"; volts: number; adjustable?: [number, number]; dropout?: number; efficiency?: number; maxMa: number };
    /**
     * Motor drivers and switches: what a channel passes, and the volts it
     * loses on the way: `ohms` × amps (a MOSFET's on-resistance), and never
     * less than `dropV` (a bipolar transistor's saturation).
     */
    bridge?: {
      channels: number;
      maxMa: number;
      peakMa?: number;
      dropV?: number;
      ohms?: number;
      /**
       * A chopper driver (a stepper driver): the current it holds each
       * winding at, as its trimmer is usually set. It steps the supply down
       * to do it, so a supply well above the motor's rated voltage is how it
       * is meant to be used, and it draws less from a higher supply.
       */
      limitMa?: number;
    };
    /** Motors: the numbers that size a driver and a battery. */
    motor?: { ratedV: number; runMa: number; stallMa: number; rpm?: number; torque?: string };
    /** Boards: what each supply pin can give. */
    rails?: Array<{ pin: string; volts: number; maxMa: number; note?: string }>;
    /** Boards: what one pin, and all pins together, can source. */
    gpio?: { maxMa: number; totalMa?: number };
    /** Bus, address and timing in a few words: "I2C 0x68", "PWM 50 Hz". */
    interface?: string;
    note?: string;
  };
  /** Heat: how well it sheds it and how hot it may get. Left out for parts that stay cool. */
  thermal?: {
    /** °C of rise per watt it loses, in still air. */
    thetaCW: number;
    /** The hottest it may run, °C. */
    maxC: number;
    /**
     * Watts it loses in a typical hard-working case, and the case in words
     * ("charging at 1 A"). Left out, it is worked out from `power`.
     */
    typicalW?: number;
    at?: string;
    note?: string;
  };
  /** Sourcing: what to ask for when buying the real one. */
  sourcing: {
    /** Manufacturer part number of the part, or of its main chip. */
    mpn: string;
    maker?: string;
    /** active: in production. nrnd: not recommended for new designs. obsolete: discontinued. generic: made by many, no single maker. */
    lifecycle: "active" | "nrnd" | "obsolete" | "generic";
    /** Typical price range in US dollars. */
    usd?: [number, number];
    note?: string;
  };
  /** Where it falls short, each with a number where there is one. */
  limits?: string[];
  /** A better part for new builds, and why. `part` is its id when it is in the library. */
  upgrade?: Array<{ part?: string; name: string; why: string }>;
  /** Where the numbers come from. */
  refs?: string[];
}

/* ----- Simulation ----------------------------------------------------------- */

/** Something a sensor or control measures: its knob in the lab, and the lab's own demo signal. */
export interface SenseQuantity {
  key: string;
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  /** The value it starts at when a person sets it by hand. */
  start: number;
  /** The lab's demo signal until a person sets a value: from, to, and the period in seconds. */
  sweep?: [number, number, number];
  /** Decimal places shown. */
  digits?: number;
  /** A two-state quantity (a button, a switch): the words for 0 and 1. */
  states?: [string, string];
}

/**
 * How the lab simulates a part, in data. The numbers live in `spec.power`;
 * this says which pins they apply to.
 */
export type PartSim =
  | {
      /** Sensors and controls: what they read, and how it shows on their pins. */
      kind: "sensor";
      reads: SenseQuantity[];
      /** The quantity shown on the part's badge. Defaults to the first. */
      badge?: string;
      /**
       * An analog output pin: the voltage follows a quantity across its range.
       * With `near: [center, width]` it peaks instead while the quantity is at
       * `center` and falls to nothing `width` away: one sensor of a line array.
       */
      analog?: Array<{ pin: string; key: string; invert?: boolean; near?: [number, number] }>;
      /** A digital output pin: on while a quantity is past a level. */
      trips?: Array<{ pin: string; key: string; when: "below" | "above"; at: number; activeLow?: boolean }>;
    }
  | { /** Batteries: a supply between two terminals. */ kind: "source"; plus: string; minus: string }
  | {
      /** Regulators and converters: a supply on the output pins while the input has one. */
      kind: "converter";
      /** The input's + and − pins. */
      input: [string, string];
      /** The output's + and − pins; its voltage is `spec.power.converter.volts`. */
      output: [string, string];
      /** Further fixed outputs on the same ground (a board that gives 5 V and 3.3 V). */
      also?: Array<{ pin: string; volts: number; maxMa?: number }>;
    }
  | {
      /** Motor drivers: each channel's two outputs follow its inputs while the motor supply is on. */
      kind: "driver";
      supply: string;
      ground: string;
      /**
       * One entry per channel. `inputs` are IN1 and IN2 of an H-bridge (the
       * motor turns while they differ), the one gate of a switch, or STEP
       * and DIR of a stepper driver. `enable` is a bridge's PWM enable (on
       * while high), or a stepper driver's EN (on while low).
       */
      channels: Array<{ outputs: [string, string]; inputs: string[]; enable?: string }>;
      /** A pin that must be high for any channel to run (a standby or sleep pin). */
      standby?: string;
    }
  | {
      /** Motors and other two-terminal loads a driver or switch runs. */
      kind: "motor";
      terminals: [string, string];
      /** A stepper's second coil: it goes on another channel of the same driver. */
      second?: [string, string];
    }
  | { /** Chips that give a board more outputs over a bus (a 16-channel PWM driver): these pins act as the board's own output pins. */ kind: "expander"; outputs: string[] }
  | { /** Level shifters: each pair of pins is the same signal at two voltages, so a 5 V board and a 3.3 V part can share it. */ kind: "shifter"; pairs: Array<[string, string]> }
  | { /** Parts that just run when powered and driven: lights, sounders, displays. */ kind: "output" };
