# Writing a part

Every part in the Component library is one file: `packages/core/src/parts/catalog/<group>/<id>.ts`. That file says what the part looks like, where its pins are, how it is wired and simulated in the lab, and the engineering data behind it. The 3D, 2D and Trace views, the lab's pinout, its wiring checks and its power budget all come from that one definition.

Two finished parts to copy from:

- `catalog/sensors/hc-sr04.ts`: a sensor module with a right-angle header.
- `catalog/drivers/l298n.ts`: a power part with screw terminals, a heatsink, heat data and a better alternative.

## The loop

```bash
node scripts/parts-check.mjs my-part     # rules: pins placed, blocks placed, spec complete
node scripts/parts-sheet.mjs my-part     # draws out/parts/my-part.png
```

Open the picture and compare it with a photo of the real part. It shows two 3D views, the 2D view with every pin and feature marked, and a low view with the part powered. Repeat until the check passes and the picture is right. Each part loads from its own file, so a mistake in one part never stops another from drawing.

When the part is done, add it to `catalog/index.ts`.

## Coordinates

- Millimeters everywhere.
- The part is seen from above. The origin is the top-left corner of its footprint (the board, for a module). **x runs right, y runs down the page, z runs up** out of the board.
- A 1.6 mm board's top is at `z = 1.6` (`PCB_TOP`). Parts on the board start there.
- Kit pieces that sit at one spot take their **center**. Rows of pins take the center of their **first pin**.
- Choose the orientation product photos use, with the pin header on the bottom or left edge.

## The definition

```ts
import { board, definePart, gnd, name, pin, pinHeader, silk, vcc } from "../../sdk";

const header = pinHeader(18.69, 18.4, 4, { style: "angled", out: "bottom" });

export default definePart({
  id: "my-part",            // lower-case, hyphens; the file has the same name. Never changes once shipped.
  name: "…",                // what the part is called on a shop page
  aka: ["…"],               // other names people search for
  group: "sensors",         // boards | power | prototyping | controls | sensors | motors | drivers | outputs | displays | radios
  rank: 3,                  // order inside the group; 1 is the part most people reach for. Unique in the group.
  summary: "…",             // one or two sentences: what it is, what a builder uses it for
  size: { w, h, d },        // footprint and height above the base, in mm
  solids: [ … ],            // the body
  features: [ … ],          // what a person would point at
  pins: [ … ],              // every wireable pin, once
  pinAt: { … },             // where each pin is
  circuit: { blocks, links, steps },   // the Trace view
  facts: [ … ],             // 4 to 6 "at a glance" numbers
  spec: { form, power, thermal, sourcing, limits, upgrade, refs },
  sim: { … },               // how the lab simulates it (optional)
  animate: { lit, spin, sweep },       // what changes when powered (optional)
  experiment: { title, idea },
  tags: [ … ],
});
```

### Words

Write for a 14-year-old who is good with their hands. Short sentences, plain words, US English. Say what a thing does and what to do about it ("Echo swings to 5 V; on a 3.3 V board put a divider on it"). No marketing words. Numbers carry their unit with a space ("15 mA", "5 V").

### `size`

The footprint (`w` × `h`) is the board or body, not counting pins or connectors that overhang. `d` is the height of the tallest thing above the base (`z = 0`). The check compares `d` with what you built.

### `solids`: the body

List solids and kit pieces in any order; nothing needs spreading. Each solid is one of:

| kind | what it is | key fields |
|---|---|---|
| `box` | a block | `x y w h` (top-left, size), `d` (height), `z` (base), `top` (color), `radius`, `turn` (degrees about its center), `label` (text on its top), `holes` (header holes), `glow` |
| `cyl` | a cylinder | `cx cy r d z top`; `axis: "x"\|"y"` lays it down (centered on cx, cy; `d` is then its length; it rests on `z`, so its axis is at `z` plus its larger radius); `r2` tapers the far end |
| `dome` | a rounded cap | `cx cy r d z color`, `clear` |
| `pins` | a row of square pins | `x y` (top-left of the row), `count pitch dir len z rows size` |
| `extrude` | any outline pushed up | `path` (closed SVG path in mm; inner subpaths cut holes), `d z top bevel` |
| `wire` | a lead or cable | `points: [x, y, z][]`, `r`, `color` |
| `text` | silkscreen | `x y text size color rotate anchor z` |
| `path` | a printed line or filled shape | `d` (SVG path), `color width fill z` |
| `disc` | a pad, a printed dot, a drilled hole | `cx cy r color ring z hole` |

Rules that keep parts looking real:

- **Colors are plain hex.** No CSS gradients: the renderer lights the part itself.
- **Say what it is made of** with `finish` when the color doesn't: `soldermask`, `epoxy` (chip bodies), `plastic`, `metal` (steel), `aluminum`, `anodized` (colored aluminum, keeps its color), `brass`, `gold`, `tin`, `copper`, `rubber`, `glass`, `clear`, `ceramic`, `paper`.
- **Real dimensions.** Take them from the datasheet or a dimension drawing. A 16 mm transducer is `r: 8`.
- **Model what you see from above and from the sides.** Leave out parts on the underside unless they hang past the edge.
- **Flat printing** (`text`, `path`, `disc`) lies on the board's top unless you give `z`. To print on top of a component, set `z` to that component's top plus 0.01.
- Give a solid an `id` only when something refers to it: `animate`, a `glow`, or the lab.
- A lit LED: give its solid `glow: "#ff4d4d"` and an `id`, and list the id in `animate.lit`.
- Silkscreen text smaller than 0.8 mm is unreadable; skip it.

### The kit

`packages/core/src/parts/kit.ts` and `build.ts` hold the pieces that recur. Use them before drawing your own, so the same header looks the same everywhere.

| piece | call |
|---|---|
| Board with real holes | `board(w, h, color, { holes: [{ x, y, d }], radius, outline })` |
| Male header | `pinHeader(x, y, count, { style: "up" \| "down" \| "angled", out, under, dir, rows })` |
| Female header | `socketHeader(x, y, count, { dir, rows, height })` |
| Screw terminals | `terminalBlock(x, y, poles, { mouth, color, pitch })` (x, y is its top-left corner) |
| JST socket | `jst(cx, cy, pins, mouth, { pitch })` |
| Jumper cap, lead housing | `jumperCap(cx, cy, dir, color)`, `dupont(cx, cy, pins, dir)` |
| Flying lead | `lead([[x, y, z], …], color, { r, strip })` |
| Chips | `soic(cx, cy, perSide, label, { dir, wide })`, `sot23(cx, cy)`, `dip(x, y, pinsPerSide, label)`, `qfp(x, y, side, perSide, label)`, `chip(x, y, w, h, label)`, `sot223(x, y, label)`, `dpak(cx, cy, legs, label)` |
| Standing power parts | `to92(cx, cy, { flat })`, `to220(cx, cy, { face })` |
| Heatsinks | `heatsink(x, y, w, h, d, { fins, dir })`, `heatsinkUpright(x, y, w, h, d, { spine, fins })` |
| Passives | `smd(x, y, "r" \| "c", dir)`, `smdRow(…)`, `smdDiode(cx, cy, dir, band)`, `capacitor(cx, cy, r, d, z, "smd" \| "radial")`, `inductor(cx, cy, size, label)`, `crystal(x, y, label)` |
| Trimmers | `trimmer(cx, cy, dir, screw)` (blue multi-turn), `trimPot(x, y, size, color)` (square single-turn) |
| LEDs | `smdLed(x, y, color, id)`, `led5mm(cx, cy, color, id)`, `ledLying(cx, cy, out, color, { id, clear })`, `ws2812(cx, cy, id)` |
| Sensor-module trio | `comparatorSet({ chip, trimmer, power, signal })`: LM393, trimmer and two LEDs |
| USB and power sockets | `microUsb`, `usbC`, `usbB`, `usbA`, `barrelJack` (x, y, z, mouth) |
| Buttons | `tactileButton(x, y, size, id)` |
| Mesh | `grille(cx, cy, r, z)` over a dark disc |
| Printing | `silk(x, y, text, size, color, { anchor, rotate, weight })`, `pads(…)` |
| Outlines for `extrude` | `roundedRect`, `circlePath`, `ringPath`, `polygonPath` |

Pieces with pins return a `Piece`. List it in `solids` as it is, and name its pins for `pinAt`:

```ts
pinAt: { ...name(header, "VCC", "TRIG", "ECHO", "GND") },
```

If a shape recurs across parts in one group, put it in `catalog/<group>/_shared.ts`. If it would help other groups, add it to `kit.ts`.

### `features`: what a person would point at

Each feature is a rectangle on the 2D view (`x y w h`, in mm) with a `label`, a `kind` (`pin`, `pins`, `port`, `led`, `button`, `chip`, `antenna`, `sensor`, `connector`, `power`, `mechanical`, `other`) and a `note` that says what it does. Five to ten per part. Every part of the Trace view that sits on the board should have one to point at.

### `pins` and `pinAt`

One entry per pin a wire can land on:

```ts
pins: [
  vcc("VCC", "5 V supply, about 15 mA while measuring."),
  pin("TRIG", "digital", "drive", "Hold high for 10 µs to start a measurement.", { label: "Trig" }),
  pin("ECHO", "digital", "out-digital", "High for as long as the sound took to come back."),
  gnd("GND"),
],
```

`pin(id, role, expects, note, extra)`:

- `id`: the lab's name for the pin. Saved projects use it, so it never changes.
- `role`: its color in tables and drawings: `power`, `ground`, `digital`, `analog`, `pwm`, `data`, `clock`, `uart`, `spi`, `i2c`, `mechanical`, `other`.
- `expects`: what the far end of the wire should be. The lab's wiring checks run on this.

| expects | the far end is | examples |
|---|---|---|
| `vcc` | a supply inside `spec.power.supply` | VCC, VIN, VM |
| `gnd` | ground | GND |
| `drive` | a board output | Trig, IN1, a relay's IN |
| `pwm` | a board PWM output | a servo's signal, ENA |
| `out-digital` | a board input; the part drives it | Echo, DO, a button's output |
| `out-analog` | a board analog input | AO, a potentiometer's wiper |
| `io` | one data wire both ways | DHT data, 1-Wire |
| `sda` `scl` `tx` `rx` `mosi` `miso` `sck` `cs` | that bus pin (`tx` is the pin the part transmits on) | |
| `load` | the switched or driven side; not checked | relay contacts, a driver's OUT pins, a motor's terminals |
| `opt` | optional; not checked | INT, a spare output |

Pass `{ required: false }` for a pin that may be left unwired. Pass `{ label: "Trig" }` when the printed name differs from the id.

A part with two supplies (a motor driver's logic and its motors, a level shifter's two sides): `spec.power.supply` is the range of its logic supply, and the other supply pin carries its own range: `vcc("VM", "Motor supply, 4.5 V to 13.5 V.", { accepts: [4.5, 13.5] })`. The lab checks each pin against its own range and wants every required one fed.

`pinAt` gives each pin's position: the hole, pad, leg or screw a wire lands on. Use `name(piece, …)` for kit pieces, `along(ids, x, y, dir)` for a row and `grid(rows, x, y)` for a block. The check fails if no pin is placed and warns for each pin left out.

### `circuit`: the Trace view

`blocks` are what is inside, `links` are what flows between them, `steps` explain it in order.

- A block has a place on a grid (`col`, `row`), a `kind` (`pin`, `power`, `ground`, `mcu`, `ic`, `passive`, `sensor`, `actuator`, `connector`, `antenna`, `regulator`, `driver`, `display`, `world`) and a `note`.
- **`at` says where the block is on the real part**: a feature id, a pin id, or a point `{ x, y }`. The Trace view draws the flow over the part between these. Give it to every block that is on the part; leave it off for the outside world (the air, an object, the thing measured).
- `hot: true` marks the block that turns power into heat. The Trace view shows its temperature from `spec`.
- A link has a `kind` (`power`, `ground`, `signal`, `data`, `analog`, `mechanical`, `rf`, `light`, `sound`, `physical`) and may carry a short `label`: a voltage, a current, what the signal means.
- Three to five `steps`, each one thing that happens.

### `spec`: the engineering data

This is what makes a part more than a picture. The lab budgets current from it, estimates heat from it and suggests better parts from it. **Every number comes from a datasheet or a measurement; list where in `refs`.** If you can't find a number, leave the field out rather than guess.

```ts
spec: {
  form: {
    mass: 8.5,                      // grams
    mount: "jumpers",               // breadboard | jumpers | terminals | leads | solder | socket | panel
    pitch: 2.54,
    holes: [{ x, y, d }],           // mounting holes
    note: "…",
  },
  power: {
    supply: { min: 4.5, max: 5.5, typ: 5 },   // volts at its supply pin
    logic: 5,                                 // volts its signals run at
    tolerant5V: true,                         // its inputs survive 5 V
    draw: { idle: 2, active: 15, peak: 20 },  // mA from its supply: doing nothing, working, worst case
    interface: "Trig pulse in, Echo pulse out",
    // and one of these, when it applies:
    source:    { volts: 6, maxMa: 2000, capacityMah: 2500, ohms: 0.8, chemistry: "alkaline" },   // batteries
    converter: { law: "buck", volts: 5, adjustable: [1.25, 35], dropout: 1.5, efficiency: 0.8, maxMa: 2000 },
    bridge:    { channels: 2, maxMa: 2000, peakMa: 3000, dropV: 1.2, ohms: 1.85 },               // motor drivers and switches
    motor:     { ratedV: 6, runMa: 150, stallMa: 1500, rpm: 200, torque: "0.8 kg·cm" },
    rails:     [{ pin: "5V", volts: 5, maxMa: 450 }],                                            // boards
    gpio:      { maxMa: 20, totalMa: 200 },                                                      // boards
  },
  thermal: { thetaCW: 20, maxC: 130, note: "…" },   // only for parts that get warm
  sourcing: { mpn: "L298N", maker: "STMicroelectronics", lifecycle: "active", usd: [2, 4] },
  limits: ["Loses about 1.8 V at 1 A …"],           // where it falls short, with numbers
  upgrade: [{ part: "tb6612fng", name: "TB6612FNG", why: "…" }],   // the better part for new builds
  refs: ["https://…datasheet.pdf"],
},
```

What the numbers mean:

- `draw` is what the part itself takes from its supply. A motor driver's `draw` is its logic current; the motor's current is the motor's.
- `bridge`: the volts a driver or switch loses are `ohms` × amps, and never less than `dropV`. A MOSFET driver has only `ohms` (its on-resistance, both switches added). A bipolar driver has a `dropV` floor as well.
- `converter.law`: `linear` burns (volts in − volts out) × current as heat. `buck` and `boost` lose power out × (1 ÷ efficiency − 1). `pass` hands its input straight on (a protection board).
- `thermal.thetaCW` is °C of rise per watt lost, in still air, as mounted on the module. `maxC` is the hottest it may run. The library works out a typical loss from `power` (a driver at 1 A, a regulator dropping 4 V at 300 mA, a motor stalled); when the datasheet gives a better case, state it: `typicalW: 1.4, at: "charging at 1 A"`.
- `sourcing.lifecycle`: `active`, `nrnd` (not recommended for new designs), `obsolete`, or `generic` (many makers).
- `upgrade.part` is the other part's id when it is in the library; the library then links to it.

### `sim`: how the lab runs it

For parts the lab has no hand-written model for. The numbers stay in `spec.power`; `sim` says which pins they apply to.

```ts
// A sensor or control: what it reads, and how that shows on its pins.
sim: {
  kind: "sensor",
  reads: [{ key: "distanceCm", label: "Distance", unit: "cm", min: 3, max: 200, step: 1, start: 40, sweep: [20, 120, 12], digits: 0 }],
  analog: [{ pin: "AO", key: "distanceCm", invert: true }],                 // a voltage that follows the value; `near: [center, width]` makes it peak at one value instead (one sensor of a line array)
  trips: [{ pin: "DO", key: "distanceCm", when: "below", at: 30, activeLow: true }],   // a digital output
},
// A two-state control uses `states`:  { key: "pressed", label: "Button", min: 0, max: 1, step: 1, start: 0, states: ["Released", "Pressed"] }

sim: { kind: "source", plus: "POS", minus: "NEG" },                          // a battery
sim: { kind: "converter", input: ["VIN", "GNDIN"], output: ["VOUT", "GNDOUT"] },   // a regulator; `also: [{ pin: "3V3", volts: 3.3 }]` adds fixed outputs
sim: { kind: "driver", supply: "VM", ground: "GND", channels: [{ outputs: ["AO1", "AO2"], inputs: ["AIN1", "AIN2"], enable: "PWMA" }] },
sim: { kind: "motor", terminals: ["M1", "M2"] },                             // a stepper adds its other coil: `second: ["B1", "B2"]`
sim: { kind: "expander", outputs: ["PWM0", "PWM1"] },                        // a chip that gives a board more output pins
sim: { kind: "shifter", pairs: [["HV1", "LV1"], ["HV2", "LV2"]] },           // a level shifter
sim: { kind: "output" },                                                     // runs when powered and driven
```

`sweep` is the lab's demo signal until a person sets a value: from, to, and the period in seconds.

Which kind a part is follows from how it is wired, not from its shelf in the library. A hobby servo has its driver inside: it takes a supply, a ground and one PWM wire, so it is `kind: "output"` with `vcc`, `gnd` and `pwm` pins. A bare DC motor or a pump is `kind: "motor"`: two `load` terminals that go on a driver's outputs.

Pins that give a supply are written like a board's: a battery's terminals are `rail("POS", "+", 6)` and `ground("NEG", "left", "−")`, and a converter's output is `rail("VOUT", "OUT+", 5)` beside `ground("GNDOUT", "left", "OUT−")`. Pin ids are letters, digits and underscores; put symbols in the label. Join pins that are one piece of copper inside the part with `lab: { strips: [["GNDIN", "GNDOUT"]] }`.

The id of a power LED's solid contains `pwr` (`led-pwr`): the lab lights those whenever the part is powered and the others only while they are driven.

### `animate`

`lit`: ids of solids that glow when the part is powered. `spin`: ids that turn (a motor shaft, a wheel). `sweep`: ids that swing back and forth (a servo horn).

`axis: { at: [x, y, z], dir: "x" | "y" | "z" }` makes everything listed turn together about one line: a servo's horn about its shaft, a wheel about a lying motor's shaft. Without it each solid turns about its own middle, upright.

### Parts drawn as themselves in the lab

Boards and breadboards are drawn on the lab canvas as themselves, with wires landing on their real pins. They carry `canvas: { usb, view, pinZ }`; the pin positions come from `pinAt`.

## Before you open a pull request

- `node scripts/parts-check.mjs` passes with no errors, and you have read the warnings.
- You compared `out/parts/<id>.png` with a photo of the real part.
- `npm run check` passes.
