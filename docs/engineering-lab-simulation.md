# Engineering Lab simulation (v1.7.0)

How the lab decides what each part does, where you can change its inputs, and how to retest the five reference experiments.

## 1. The model

A frame is a pure function: `frameAt(nodes, wires, analysis, t, running, inputs)` in `lib/lab/simulate.ts`. Nothing is kept between frames, so any moment can be sampled again (the Signals panel and the tests do this).

```
inputs (session.inputs, set in the Inspector)
   │
   ▼
sensors ──► SensorSample (readings + numbers)
   │
   ▼
sketch per board (lib/lab/sketch.ts): settings + samples → plan
   │
   ├─► LED / buzzer / relay: follow the board's alert sensor, else blink
   ├─► servo: gate policy with a PIR, else its own command
   ├─► DC motor, stepper: their own commands
   └─► display: lines formatted from the board's sensors
   │
   ▼
frame.nodes[id] (on, level, angle, readings, text, badge) → canvas, Inspector, log, serial
```

There is no firmware execution in the lab; the Firmware page is separate. The "sketch" is the fixed set of rules above, written to be what a beginner's Arduino sketch does. The lab runs without the backend; the backend mirror (`lib/lab/runtime.ts`) only stores the build.

### Inputs

`session.inputs[nodeId]` holds what the person set. Keys, ranges, steps and defaults are declared once in `lib/lab/controls.ts`; the Inspector draws them, `store.setInput` clamps to them, the simulation reads them with `inputOf`.

| Part | Controls |
|---|---|
| Sensors | `source`: **Simulated sweep** (the lab's time-varying signal; the default, so older sessions look the same) or **Set by you**. Changing any value switches to *Set by you*. Values: HC-SR04 `distanceCm` 2–400; PIR `motion`; DHT11 `temperatureC` 0–50, `humidity` 20–90; DHT22/AM2302 −40–80 / 0–100; DS18B20; LDR `light`; soil `moisture`; MQ2 `gasPpm`; MPU6050 `pitch`, `roll`; BMP280 `pressureHpa`, `temperatureC`. |
| Servo (no PIR on its board) | `angle` 0–180°, or the simulated sweep. |
| DC motor | `speed` 0–100 % (duty on EN), `direction` forward/reverse. No EN wire: full speed or stopped. The driver needs IN1 for forward and IN2 for reverse. rpm = duty × 140 (TT gear motor, no load). |
| Stepper (28BYJ-48 + ULN2003) | `stepsPerSecond` 1–1000; **Go** moves `steps` (negative = anticlockwise) from where it is; **Stop** holds where the shaft is and does not finish the move; **Zero position** makes the current position 0 and ends any move (as AccelStepper's `setCurrentPosition()` does). 2048 steps per turn of the output shaft. Position wraps 0–360°; "Position (steps)" is signed and counts from the last zero. Changing the speed mid-move carries on from the current position at the new rate. |
| Boards | `delayMs` 50–5000 (period = 2 × delay, as in Blink); `warnCm` with an HC-SR04; `gateOpen`, `gateRest` with a PIR and a servo; `gasPpm` with an MQ2; `dryPct` with a soil sensor; `darkPct` with an LDR. Only the settings that apply to the wired parts are shown. |

### Sketch rules (per board)

- **Alert sensor** on the board, first of: HC-SR04 (`distance < warnCm`, strict: at the threshold the way is clear), PIR (motion), MQ2 (`ppm > gasPpm`), soil (`moisture < dryPct`), LDR (`light < darkPct`). While the condition holds: LEDs on, buzzers beep (0.3 s cycle), relays energised. Otherwise off.
- **No alert sensor:** LEDs blink with the board's delay (staggered by a quarter period per LED), buzzers chirp once per period, relays toggle every 4 periods. The board's own "L" LED blinks with the same delay.
- **Gate:** a PIR and a servo on the same board. Motion → `gateOpen`; no motion → `gateRest`. The servo holds there, including across Stop and Run.
- **Display:** the readings of the board's sensors, one per line, first readings of each sensor before second ones, cut to the display's width (LCD 16×2, OLED 21×4, TFT 20×5). With no sensor: "Hello, Kiungo!" and the uptime. The glass is blank when the sketch isn't running.
- Parts respond only when the circuit check says they are powered and connected.

### Display glass

Display models carry `screen:N` text solids (`lib/parts/models/displays.ts`). In the library they show sample text; in the lab `withScreenText()` (`lib/parts/index.ts`) writes the frame's lines into them, in the 3D and top views, and blanks the `screen-demo` decoration. The lab never shows the library's sample text.

## 2. The five experiments: what was wrong and what changed

| # | Observation | Cause | Change | Verified |
|---|---|---|---|---|
| 1 | LED blinks, interval not controllable | Period hard-coded to 1 s; no sketch settings existed | Board setting **Blink delay** (period = 2 × delay) | Unit: 10 vs 20 vs 5 blinks per 10 s at 500/250/1000 ms. Browser: ≈10 vs ≈2 ON-edges per 4 s at 200/1000 ms; Stop/Run twice advances the clock 1× each time. **Fixed and verified.** |
| 2 | Distance rose "without limit"; LED/buzzer on their own; no obstacle control | Distance was `30 + 20·\|sin(t/5)\|` (a 30–50 cm sweep); LED/buzzer ignored it | **Obstacle distance** input (2–400 cm); board **Warning distance**; LED on and buzzer beeping while `distance < warnCm` | Unit: 30 → off, 10 → on, 20 → off (strict), 19.9 → on, both directions, threshold change. Browser: same table. **Fixed and verified.** |
| 3 | DHT11 changes, LCD stuck at 24.5 °C | The LCD **model** has "Temp: 24.5 C" painted on its glass as silkscreen; the live text was a small overlay, first reading only | Glass text is written from the frame in all views; **Temp** and **Hum** on separate lines, ≤ 16 chars; blank when not running or no sensor | Unit: 23.8/60, 24.9/45, 25.0/71 at sensor → display path → glass; mid-run change updates next frame. Browser: glass shows "Temp: 23.8 °C"/"Hum: 60 %" and follows each change, 3D and top view; nothing before Run. **Fixed and verified.** |
| 4 | LED flashes, servo sweeps, PIR toggles; no motion control | Three independent formulas of `t` | PIR **Motion** Detected/None input; gate policy servo = open/rest angle; LED = motion; angles configurable 0–180° | Unit: sequences none→motion, motion→none, none→none, motion→motion, stop→restart; no sweep with a PIR. Browser: all six transitions steady over 0.6 s; stop/restart holds 90°. **Fixed and verified.** |
| 5 | DC rpm 50–140 and direction alternating; stepper position oscillating, steps unbounded; no control | DC duty and direction were formulas of `t`; stepper angle `(22.5·t) mod 360` with no command | DC **speed** and **direction** (needs EN for speed, IN1/IN2 for direction; reported when missing); stepper **Go/Stop/Zero** commands at a set speed, position wraps, count accumulates | Unit: 0/50/100 % → 0/70/140 rpm, reverse, hold over time; +512 steps → 45° at 1 s, 90° at 2 s then holds; −512 back to 0; 4096 wraps; coils. Browser: same, plus Stop holding at 154 steps. **Fixed and verified.** |

Simulated-sweep mode (the default when nothing is set) is kept as the lab's demonstration behavior and is labeled "Simulated sweep" / "(set)" so the two are never confused.

## 3. Retest in the browser

Open **Engineering Lab**, click **Arduino Uno** in the empty-canvas quick-add, leave **Auto-wire to board** on, and add parts by typing in the search box and pressing Enter. Select a part by clicking its title to open it in the Inspector (right panel). Press **Run**.

1. **Blink:** add `led`. Select the Arduino: **Sketch settings → Blink delay** 200 → the LED blinks about 2½ times a second; 1000 → once every 2 s. Stop, then Run: the clock continues at 1×.
2. **Ultrasonic warning:** add `hc-sr04`, `led`, `buzzer`. Select the sensor: **Surroundings → Obstacle distance**. 30 → LED OFF, buzzer Quiet. 10 → LED ON, buzzer BEEP. 20 → OFF (the warning is strictly below the threshold). Select the Arduino, set **Warning distance** 40, sensor at 30 → ON.
3. **DHT11 + LCD:** add `dht11`, `lcd` (LCD 16×2). Before Run the LCD glass is blank. Run, select the DHT11: set **Temperature** 23.8 and **Humidity** 60 → the glass reads `Temp: 23.8 °C` / `Hum: 60 %` in both the 3D and top views; change to 24.9 / 45 → it follows at once.
4. **Gate:** add `pir`, `servo`, `led`. Select the PIR: **Motion** Detected → servo 90°, LED ON; None → servo 0°, LED OFF. Repeat in any order; the servo never moves on its own. Select the Arduino to change **Gate open/resting angle**.
5. **Motors:** add `dc motor`, `stepper`. Select the DC motor: **Speed** 50 → 70 rpm Forward; **Direction** Reverse → 70 rpm Reverse; Speed 0 → Stopped. Select the stepper: **Move** 512, **Go** → turns to 90° over 2 s (256 steps/s), then "Holding"; Move −512, Go → back to 0°; **Stop** mid-move holds the position.

**Defaults** (top of the Inputs section) returns a part to the simulated sweep.

## 4. QA cycle 2 (v1.7.0)

### Root causes

| Issue | Where | Cause | Evidence |
|---|---|---|---|
| LCD shows "Hello, Kiungo! / Temp: 24.5 C" while its Live panel says the source is the DHT11 | `components/lab/Inspector.tsx` | The Inspector's preview (3D and 2D) drew the Component library's model, whose glass has that sample text printed on it. The v1.3.0 fix wrote live text into the canvas card's glass only. The data path (DHT11 → sketch → LCD) was already correct. | Reproduced in Chromium: canvas glass `Temp: 50.0 °C / Hum: 70 %`; Inspector preview `Hello, Kiungo! / Temp: 24.5 C`; Live `Temp: 50.0 °C · Hum: 70 % · DHT11`. |
| LED "draws too much current, the simulation assumes 220 Ω" | `lib/lab/circuit.ts` | An advisory (`tip`) raised for every LED that is driven and grounded. The catalog has no resistor part, so a resistor can't be wired and the model assumes one. The diagnostic was right but didn't say so, or what it means for the model. | No `resistor` part in `lib/parts`; the LED pin note says "through 220 Ω". |
| Stepper jumps when its speed changes mid-move | `lib/lab/store.ts`, `simulate.ts` | The position is worked out as (t − start) × speed, so a new speed re-timed the whole move, including the part already done. | Unit test: 200 steps in at 100 steps/s, speed → 400 jumped to 800 before the fix; now 200, then 600 a second later. |
| Stop and Zero lost the record of the move | `lib/lab/store.ts` | Stop was "move 0 steps", which overwrote the commanded move, so commanded and executed steps couldn't be told apart. | Inspector showed only Position, Steps, Command. |
| DC motor's shaft angle turned the same way in reverse | `lib/lab/simulate.ts` | The angle didn't take the direction into account. It isn't drawn on the canvas, so only the frame data was wrong. | Unit test DC-07. |
| A wired sensor that can't be read showed the no-sensor banner on the LCD | `lib/lab/simulate.ts`, `sketch.ts` | Unready sensors were dropped before the sketch ran. | Unit test: DHT11 without GND. |

### Changes

- Inspector preview of a display shows the frame's lines, the same as the canvas, or nothing. It never shows sample text.
- LCD Live "Source" says `DHT11 (set)`, `DHT11 (simulated)` or `DHT11 (no data)`. A wired sensor that can't be read shows `DHT11: no data / Check its wiring` on the glass, not a value.
- LED tip: **Assumed: 220 Ω resistor in series**, with the pin voltage and the current the model uses (13.6 mA at 5 V, 5.9 mA at 3.3 V). The LED's Live panel shows `Current (modeled)`. It stays a tip: the build works in the lab, but a real one needs the resistor.
- Stepper: Live shows **Position**, **Position (steps)**, **Command** (steps to go or Holding), **Last move** (as commanded) and **Done** ("670 of 2000, stopped"). A speed change mid-move doesn't jump.
- DC motor: the shaft angle follows the direction.

### Acceptance matrix

| # | Original observation | Cause / uncertainty | Correction | Verification | Status |
|---|---|---|---|---|---|
| 01 LDR → LED | ON below ~30, OFF above; resistor warning | Rule is `light < Dark below` (board setting, default 30 %, strict). The warning is an advisory: no resistor part exists, so one is assumed. | Diagnostic and Live current describe the model. | Unit: 0/29 on, 30/31/100 off; threshold 50 → 45 on; steady over 5 s; 5 V vs 3.3 V current. Browser: same five levels, tip text, "13.6 mA via 220 Ω" / "0 mA". | Fixed and verified |
| 02 Ultrasonic | Below 20 cm LED on, buzzer beeps | Rule is `distance < Warning distance` (default 20 cm, strict: 20 is clear). Active buzzer, beeped 150 ms on/off by the sketch while the warning holds, by design. | None needed. | Unit: 19 on, 20/21 off; 2 and 400 cm; NaN and "abc" rejected, 0 → 2, 999 → 400; steady 3 s; Stop clears, Run restores. Browser: 19/20/21/2/400/19, Stop and Run. | Verified (no defect) |
| 03 DHT11 → LCD | LCD stuck at 24.5 °C next to "Source: DHT11" | Inspector preview drew the library model (see above). | Preview uses the live glass; source mode shown; no-data case. | Unit: 0/10/24.5/35/50 °C × 30/80 % at input → reading → sketch → display → glass; mid-run changes; other parts' updates; rounding. Component test: Inspector preview reads `Temp: 50.0 °C` (fails without the fix). Browser: five values, canvas + Inspector 3D and 2D. | Fixed and verified |
| 04 PIR → servo, LED | Detected → ON, 90°; None → OFF, 0° | Gate policy in the sketch; one command path. | None needed. | Unit: none → detected → detected → none, twice, each held 5 s; Stop holds 90°; Run restores; gate angles clamped 0–180. Browser: same sequence, sampled over 1 s each, Stop and Run. | Verified (no defect) |
| 05 DC motor | PWM 0–100 %, Forward/Reverse | Linear model, rpm = duty × 140 (no load, no inertia). | Shaft angle follows direction. | Unit DC-01…08 (0/25/50/75 % → 0/35/70/105 rpm; IN1/IN2; zero and Stop hold; same speed at t = 1…500). Browser: DC-01…07 and Stop. | Fixed and verified |
| 05 Stepper | Speed 1–1000, Move, Go, Stop, Zero | Constant speed, no acceleration; 2048 steps/turn. | Speed change mid-move; Stop keeps the move on record; Last move / Done readings. | Unit: 100 then 200 steps at 100/s; reverse; Zero; Stop at 250 of 1000 holds; new move after Stop; speed change; 1000 turns. Browser: the brief's sequence (100, 200, −100, Zero, 2000 with Stop partway, 50 after Stop). | Fixed and verified |

### Retest (v1.7.0)

As in section 3, with these additions:

1. **LDR:** add `ldr`, `led`. Run. Select the LDR: Light 29 → LED ON; 30 → OFF; 31 → OFF; 0 → ON; 100 → OFF. Select the LED: Problems shows the tip "Assumed: 220 Ω resistor in series"; Live shows "Current (modeled) 13.6 mA via 220 Ω" while on. Select the Arduino: **Dark below** changes the threshold.
2. **Ultrasonic:** 19 cm → LED ON, buzzer beeping; 20 cm and 21 cm → OFF, Quiet. 2 and 400 cm accepted; typing 999 gives 400.
3. **DHT11 + LCD:** set 0, 10, 24.5, 35, 50 °C with 30 or 80 %. Select the LCD: the Inspector preview (3D and 2D) and the canvas both read `Temp: <t> °C / Hum: <h> %`, and Live says `Source: DHT11 (set)`. **Defaults** on the DHT11 → `DHT11 (simulated)`.
4. **PIR gate:** None, Detected, Detected, None, twice: LED OFF/ON, servo 0°/90°, steady. Stop: servo holds; Run: follows again.
5. **Motors:** DC 0/25/50/75 % forward → 0/35/70/105 rpm; 75 % reverse → 105 rpm Reverse. Stepper at 100 steps/s: Move 100, Go → Done "100 of 100", Position (steps) 100; Move 200, Go → 300; Move −100 → 200; Zero → 0; Move 2000, Go, Stop after a second → "N of 2000, stopped" and it stays there; Move 50, Go → N + 50.

## 5. Breadboard (v1.15.0)

A real Uno has one 5 V pin and three GND pins, and each header hole takes one jumper. The breadboard (`lib/parts/models/breadboard.ts`) is how a bench build shares them, and the lab now models it the same way.

- **Layout.** A half-size, 400-point board: 30 columns, rows a–e and f–j either side of a 0.3" center channel, and four 25-hole rails (Top +, Top −, Bottom −, Bottom +, + outermost as printed). Every hole is a pin (`a12`, `TP7`, …).
- **Connectivity.** The pinout is `passive` with `strips` (`lib/lab/pinout.ts`): the five holes of a half-column are one strip, and each rail is one strip end to end. `analyze()` joins each strip into one net before the wires, so a part's VCC in `TP9` and the Uno's 5V in `TP1` are on the same 5 V net. The channel separates `e12` from `f12`; the top and bottom rails aren't joined unless you bridge them.
- **Checks.** A breadboard has no supply, signals or status of its own; it is never a load, so a rail with nothing on it carries no current in Trace. A short made on a strip is the usual short-circuit error. GND on a + rail, or a supply on a − rail, is a warning: it works, but the stripes then lie. A part whose VCC or GND is on a strip nothing feeds says so ("on the breadboard's Bottom + rail, which has no supply yet").
- **Auto-wire.** Adding a breadboard to a build with a board wires the board's logic-level supply (Uno: 5V) to the Top + rail and a GND to the Top − rail, one wire each, from the end nearer the board. After that, auto-wired parts take VCC and GND from free rail holes when a rail already carries the voltage they need from the same board; signals still go straight to board pins. A 3.3 V part on a 5 V rail falls back to the board's 3.3V pin. The lab suggests a breadboard once two or more parts need 5 V.
- **Canvas.** Drawn as itself in all three views (no 400-row card): 3D square-on with a 35° tilt so the 0.1" holes stay at least 8 px apart, 2D flat, and Trace as its strips. A strip lights in its net's color once wired (red supply, slate ground, blue signal), with moving dashes while current flows. The caption badge says what the rails carry ("5 V · GND"). The Inspector lists the strips in use instead of 400 pins.

## 6. Saving lab sessions (v1.16.2)

The lab needs a signed-in account. Sessions are saved **per account** (`lib/lab/store.ts`):

- **Where they're kept now:** in this browser under `kiungo.lab:v2:<account id>`. They're written about 200 ms after each change and read back on reload.
- **Switching accounts:** `components/lab/LabAccountSync.tsx` is mounted once in `app/layout.tsx` and calls `setLabOwner()` on sign-in, sign-out and account changes. Pending changes are saved to the account they belong to first. One account never sees another's sessions.
- **Signed out:** sessions live in memory only, and the account's saved copy stays for its next sign-in.
- **The old shared key:** `hhip.lab:v1`, which every visitor of a browser shared, is cleared and never written again.
- **Toolbar status:** "Saved on this device" (signed in), "Not saved" (signed out), or "Not saved" in red when the browser refuses to store (full or blocked).

### Server storage (backend contract, to build)

The intended home for sessions is the account on the server, as projects and experiment records already are. Proposed routes, which answer only for the bearer's own sessions:

| Route | Body / answer |
|---|---|
| `GET /auth/me/lab-sessions` | `[{ id, name, projectId, updatedAt, ... }]`: the full `LabSession` objects (`lib/lab/types.ts`) |
| `PUT /auth/me/lab-sessions/{id}` | A `LabSession`. Creates or replaces it. Answers with the stored session. Last write wins on `updatedAt`. |
| `DELETE /auth/me/lab-sessions/{id}` | `{ deleted: true }` |

Sessions are small JSON documents (parts, wires, inputs, a log capped at 400 entries). One JSON column per session is enough. Once these routes exist, the store loads from the server on sign-in, saves each changed session with a short debounce, and keeps the browser copy only as an offline cache.

## 7. Known limits and remaining work

- Inputs are not mirrored to the backend workspace; they live in the browser session like the rest of the build.
- The sketch rules are fixed. Writing your own firmware for a lab build (the Firmware page's projects) is not connected to the lab's simulation; that needs a backend-run or browser-run interpreter and is out of scope here.
- The DC motor model is linear (rpm = duty × 140, no inertia); the stepper moves at constant speed with no acceleration.
- The Component library still shows sample text on display glass, by design; the lab never does.
- Resistors are followed one hop: a net with no board pin, supply or ground of its own is followed through one resistor (`throughResistor` in `lib/lab/circuit.ts`). Chains of resistors, and dividers (an LDR's 10 kΩ to GND), aren't modeled yet; an LED with no resistor still assumes 220 Ω.
- The DC motor has no load or inertia model, and its shaft angle is computed from the current speed (a speed change shifts the phase; the angle isn't drawn).
- Taking a stepper over from the simulated sweep starts its count at 0, not where the sweep left it.
- The Activity log doesn't record input changes, so it can't show when you changed a value.
- Parts don't plug into the breadboard: they connect to holes with jumpers. Dropping a part's legs straight into a strip (and a DIP chip straddling the channel) would need each part's leg spacing on the canvas.
- Only the half-size breadboard exists. A full 830-point board and a mini 170-point one are the same model with more or fewer columns.
