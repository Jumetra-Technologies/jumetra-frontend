# Engineering Lab simulation (v1.3.0)

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
| Stepper (28BYJ-48 + ULN2003) | `stepsPerSecond` 1–1000; **Go** moves `steps` (negative = anticlockwise) from where it is; **Stop** holds; **Zero position** makes the current position 0. 2048 steps per turn of the output shaft. Position wraps 0–360°; the step count accumulates (signed). |
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

Simulated-sweep mode (the default when nothing is set) is kept as the lab's demonstration behaviour and is labelled "Simulated sweep" / "(set)" so the two are never confused.

## 3. Retest in the browser

Open **Engineering Lab**, click **Arduino Uno** in the empty-canvas quick-add, leave **Auto-wire to board** on, and add parts by typing in the search box and pressing Enter. Select a part by clicking its title to open it in the Inspector (right panel). Press **Run**.

1. **Blink:** add `led`. Select the Arduino: **Sketch settings → Blink delay** 200 → the LED blinks about 2½ times a second; 1000 → once every 2 s. Stop, then Run: the clock continues at 1×.
2. **Ultrasonic warning:** add `hc-sr04`, `led`, `buzzer`. Select the sensor: **Surroundings → Obstacle distance**. 30 → LED OFF, buzzer Quiet. 10 → LED ON, buzzer BEEP. 20 → OFF (the warning is strictly below the threshold). Select the Arduino, set **Warning distance** 40, sensor at 30 → ON.
3. **DHT11 + LCD:** add `dht11`, `lcd` (LCD 16×2). Before Run the LCD glass is blank. Run, select the DHT11: set **Temperature** 23.8 and **Humidity** 60 → the glass reads `Temp: 23.8 °C` / `Hum: 60 %` in both the 3D and top views; change to 24.9 / 45 → it follows at once.
4. **Gate:** add `pir`, `servo`, `led`. Select the PIR: **Motion** Detected → servo 90°, LED ON; None → servo 0°, LED OFF. Repeat in any order; the servo never moves on its own. Select the Arduino to change **Gate open/resting angle**.
5. **Motors:** add `dc motor`, `stepper`. Select the DC motor: **Speed** 50 → 70 rpm Forward; **Direction** Reverse → 70 rpm Reverse; Speed 0 → Stopped. Select the stepper: **Move** 512, **Go** → turns to 90° over 2 s (256 steps/s), then "Holding"; Move −512, Go → back to 0°; **Stop** mid-move holds the position.

**Defaults** (top of the Inputs section) returns a part to the simulated sweep.

## 4. Known limits and remaining work

- Inputs are not mirrored to the backend workspace; they live in the browser session like the rest of the build.
- The sketch rules are fixed. Writing your own firmware for a lab build (the Firmware page's projects) is not connected to the lab's simulation; that needs a backend-run or browser-run interpreter and is out of scope here.
- The DC motor model is linear (rpm = duty × 140, no inertia); the stepper moves at constant speed with no acceleration.
- The Component library still shows sample text on display glass, by design.
