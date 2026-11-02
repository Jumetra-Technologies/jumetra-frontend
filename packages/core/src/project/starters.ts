/**
 * Starters for a new project (DSK-11): a circuit and the code that drives it.
 *
 * The parts are placed and wired by the lab's own auto-wire, then the code is
 * written from that wiring, so the pin numbers in the sketch are the pins the
 * wires really go to, on whichever board the project uses. A template names a
 * pin as {{part.PIN}}: the board pin wired to that part's pin, as Arduino code
 * writes it ("13", "A0").
 */

import { planAutoWire, placeNode } from "../lab/autowire";
import { getPinout } from "../lab/pinout";
import { logEntry, makeId, newSession, nextLabel } from "../lab/session";
import type { LabNode, LabSession, LabWire } from "../lab/types";
import type { PinnedLibrary } from "./format";

export interface Starter {
  id: string;
  title: string;
  /** One line on what it does, for the New project dialog. */
  does: string;
  /** Lab parts beside the board, in the order they're added. */
  parts: string[];
  libraries: PinnedLibrary[];
  /** The sketch, with {{part.PIN}} placeholders. `part` is the lab part id. */
  code: string;
}

const SERVO: PinnedLibrary = { name: "Servo", version: "1.3.0" };
const DHT: PinnedLibrary = { name: "DHT sensor library", version: "1.4.7" };

export const BLANK_SKETCH = `void setup() {
  // Runs once when the board starts.
}

void loop() {
  // Runs over and over.
}
`;

export const STARTERS: readonly Starter[] = [
  {
    id: "blink",
    title: "Blink an LED",
    does: "Flashes an LED once a second.",
    parts: ["led"],
    libraries: [],
    code: `// Blink: flashes the LED once a second.
const int LED_PIN = {{led.A}};

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  delay(500);
}
`,
  },
  {
    id: "servo",
    title: "Servo sweep",
    does: "Sweeps a servo from 0° to 180° and back.",
    parts: ["servo"],
    libraries: [SERVO],
    code: `// Servo sweep: turns the servo from 0° to 180° and back.
#include <Servo.h>

const int SERVO_PIN = {{servo.SIG}};
Servo servo;

void setup() {
  servo.attach(SERVO_PIN);
}

void loop() {
  for (int angle = 0; angle <= 180; angle++) {
    servo.write(angle);
    delay(15);
  }
  for (int angle = 180; angle >= 0; angle--) {
    servo.write(angle);
    delay(15);
  }
}
`,
  },
  {
    id: "dht11",
    title: "Temperature and humidity",
    does: "Reads a DHT11 every two seconds and prints the readings.",
    parts: ["dht11"],
    libraries: [DHT],
    code: `// Temperature and humidity: reads the DHT11 and prints what it measures.
#include <DHT.h>

const int DHT_PIN = {{dht11.DATA}};
DHT dht(DHT_PIN, DHT11);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  delay(2000);
  float humidity = dht.readHumidity();
  float celsius = dht.readTemperature();
  if (isnan(humidity) || isnan(celsius)) {
    Serial.println("No reading from the DHT11. Check its wiring.");
    return;
  }
  Serial.print("Temperature: ");
  Serial.print(celsius);
  Serial.print(" C, humidity: ");
  Serial.print(humidity);
  Serial.println(" %");
}
`,
  },
  {
    id: "distance",
    title: "Distance sensor",
    does: "Measures distance with an HC-SR04 and prints it in centimeters.",
    parts: ["hc-sr04"],
    libraries: [],
    code: `// Distance sensor: the HC-SR04 sends a ping and times the echo.
const int TRIG_PIN = {{hc-sr04.TRIG}};
const int ECHO_PIN = {{hc-sr04.ECHO}};

void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}

void loop() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Sound travels about 0.0343 cm per microsecond, there and back.
  long echo = pulseIn(ECHO_PIN, HIGH, 30000);
  if (echo == 0) {
    Serial.println("Nothing in range");
  } else {
    Serial.print(echo * 0.0343 / 2);
    Serial.println(" cm");
  }
  delay(200);
}
`,
  },
  {
    id: "motion-alarm",
    title: "Motion alarm",
    does: "Sounds a buzzer while a PIR sensor sees movement.",
    parts: ["pir", "buzzer"],
    libraries: [],
    code: `// Motion alarm: the buzzer sounds while the PIR sensor sees movement.
const int PIR_PIN = {{pir.OUT}};
const int BUZZER_PIN = {{buzzer.P}};

void setup() {
  Serial.begin(9600);
  pinMode(PIR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
}

void loop() {
  if (digitalRead(PIR_PIN) == HIGH) {
    digitalWrite(BUZZER_PIN, HIGH);
    Serial.println("Motion!");
    delay(150);
    digitalWrite(BUZZER_PIN, LOW);
    delay(150);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
  }
}
`,
  },
  {
    id: "relay",
    title: "Relay switch",
    does: "Switches a relay on and off every second.",
    parts: ["relay"],
    libraries: [],
    code: `// Relay switch: turns the relay on and off every second.
const int RELAY_PIN = {{relay.IN}};

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
}

void loop() {
  digitalWrite(RELAY_PIN, HIGH);
  delay(1000);
  digitalWrite(RELAY_PIN, LOW);
  delay(1000);
}
`,
  },
  {
    id: "night-light",
    title: "Night light",
    does: "Turns an LED on when a light sensor reads dark.",
    parts: ["ldr", "led"],
    libraries: [],
    code: `// Night light: the LED comes on when the light sensor reads dark.
const int LIGHT_PIN = {{ldr.L2}};
const int LED_PIN = {{led.A}};
// Below this reading (0 to 1023) it counts as dark.
const int DARK = 300;

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  int light = analogRead(LIGHT_PIN);
  digitalWrite(LED_PIN, light < DARK ? HIGH : LOW);
  Serial.println(light);
  delay(250);
}
`,
  },
];

export function getStarter(id: string): Starter | undefined {
  return STARTERS.find((s) => s.id === id);
}

/** A board pin id as Arduino code names it: "D13" → "13", "A0" → "A0". */
export function arduinoPinName(pinId: string): string | null {
  const digital = /^D(\d+)$/.exec(pinId);
  if (digital) return digital[1];
  if (/^A\d+$/.test(pinId)) return pinId;
  return null;
}

export class StarterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StarterError";
  }
}

export interface StarterBuild {
  session: LabSession;
  code: string;
  libraries: PinnedLibrary[];
}

/**
 * The circuit and the code for a new project. With no starter, the board
 * alone and an empty sketch.
 */
export function buildStarter(opts: { name: string; board: string; starter: string | null }): StarterBuild {
  const starter = opts.starter ? getStarter(opts.starter) : undefined;
  if (opts.starter && !starter) throw new StarterError(`There's no starter called “${opts.starter}”.`);
  if (!getPinout(opts.board).controller) throw new StarterError(`“${opts.board}” isn't a board.`);

  const board: LabNode = { id: makeId("n"), partId: opts.board, label: nextLabel([], opts.board), x: 80, y: 80, mode: "virtual" };
  let nodes: LabNode[] = [board];
  let wires: LabWire[] = [];
  /** part id → the node made for it (the first, if a starter used a part twice). */
  const byPart = new Map<string, LabNode>();

  for (const partId of starter?.parts ?? []) {
    const at = placeNode(partId, nodes, board);
    const node: LabNode = { id: makeId("n"), partId, label: nextLabel(nodes, partId), x: Math.round(at.x), y: Math.round(at.y), mode: "virtual" };
    nodes = [...nodes, node];
    if (!byPart.has(partId)) byPart.set(partId, node);
    const plan = planAutoWire(node, nodes, wires, board.id);
    const remove = new Set(plan.remove ?? []);
    wires = [...wires.filter((w) => !remove.has(w.id)), ...plan.wires.map((w) => ({ id: makeId("w"), from: w.from, to: w.to }))];
  }

  const code = starter
    ? starter.code.replace(/\{\{([a-z0-9-]+)\.([A-Za-z0-9_]+)\}\}/g, (_match, partId: string, pin: string) => {
        const node = byPart.get(partId);
        const wire = node && wires.find((w) => (w.to.node === node.id && w.to.pin === pin) || (w.from.node === node.id && w.from.pin === pin));
        const boardEnd = wire && (wire.from.node === board.id ? wire.from.pin : wire.to.node === board.id ? wire.to.pin : null);
        const name = boardEnd ? arduinoPinName(boardEnd) : null;
        if (!name) throw new StarterError(`The “${starter.title}” starter couldn't wire ${partId} ${pin} to a pin on this board.`);
        return name;
      })
    : BLANK_SKETCH;

  const session = newSession({ name: opts.name, nodes, wires });
  session.log = [...session.log, logEntry("note", starter ? `Started from the “${starter.title}” starter` : `Started with a ${board.label}`)];
  return { session, code, libraries: starter?.libraries ?? [] };
}
