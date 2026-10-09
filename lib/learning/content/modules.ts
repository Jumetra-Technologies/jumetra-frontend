import type { LearningModule } from "../types";

/**
 * Guided learning path. `order` is the position along the path (1-based, unique).
 * Keep modules short, hands-on, and honest about safety and simulation limits.
 */
export const LEARNING_MODULES: LearningModule[] = [
  {
    slug: "getting-started-with-kiungo",
    order: 1,
    topic: "foundations",
    level: "beginner",
    minutes: 10,
    title: "Getting started with Kiungo",
    summary: "A short tour of the platform and how to set up your first project.",
    objectives: [
      "Explain what Kiungo is for",
      "Find the main areas of the app",
      "Create your first project",
    ],
    tags: ["introduction", "tour", "projects", "first project", "start"],
    relatedDocs: ["system-overview/what-is-kiungo", "system-overview/how-kiungo-works"],
    blocks: [
      {
        type: "p",
        text: "Kiungo helps you plan, simulate, and document hardware projects, even when you do not own every part. This module walks through the areas you will use most.",
      },
      { type: "h2", text: "The main areas" },
      {
        type: "ul",
        items: [
          "[Projects](/workspace) to describe what you are building and who is working on it.",
          "[Component library](/components) to look up boards and sensors, their pins, and compatibility.",
          "[Engineering Lab](/laboratory/workspace) to place components, wire them together, and run the system.",
          "[Experiment Records](/experiments) to write down what you tried and what happened.",
          "[Documentation](/docs) for reference when you need detail.",
        ],
      },
      { type: "h2", text: "Create your first project" },
      {
        type: "ol",
        items: [
          "Open [Projects](/workspace) and start a new project.",
          "Give it a clear **name**, such as \"Greenhouse monitor\", and choose a **category**.",
          "Write a short **description** of what you are building and the **objectives** it should meet, for example \"Log temperature every minute and warn above 30 °C\".",
          "Add the **contributors** who are working with you.",
          "Save it. The project becomes the home for related notes and experiment records.",
        ],
      },
      {
        type: "callout",
        tone: "note",
        title: "Your work is saved in this browser",
        text: "Projects and experiment records are stored in your browser's local storage. They are not backed up or shared yet, so export a Markdown report from [Reports](/reports) for anything important.",
      },
      {
        type: "p",
        text: "Next, [Electronics basics](/learn/electronics-basics) covers the handful of ideas every circuit relies on.",
      },
    ],
  },
  {
    slug: "electronics-basics",
    order: 2,
    topic: "foundations",
    level: "beginner",
    minutes: 15,
    title: "Electronics basics",
    summary: "Voltage, current, resistance, and Ohm's law, with the one calculation you will use constantly.",
    objectives: [
      "Describe voltage, current, and resistance",
      "Use Ohm's law to size a resistor",
      "Recognise a short circuit and avoid it",
    ],
    tags: ["voltage", "current", "resistance", "ohm", "resistor", "ground", "breadboard", "basics", "foundations"],
    relatedDocs: ["hardware-knowledge/arduino-uno"],
    blocks: [
      {
        type: "p",
        text: "Every circuit moves electric charge around a loop. Three quantities describe what is happening.",
      },
      {
        type: "table",
        head: ["Quantity", "Unit", "Think of it as"],
        rows: [
          ["Voltage (V)", "volt (V)", "The push that drives charge, like water pressure."],
          ["Current (I)", "ampere (A), often mA", "How much charge flows, like the flow rate of water."],
          ["Resistance (R)", "ohm (Ω)", "How much a part resists the flow, like a narrow pipe."],
        ],
      },
      { type: "h2", text: "Ohm's law" },
      {
        type: "p",
        text: "These three are linked by one equation: `V = I × R`. Rearranged, `R = V / I` tells you what resistor you need for a target current.",
      },
      { type: "h3", text: "Worked example: an LED on 5 V" },
      {
        type: "p",
        text: "A typical red LED drops about 2 V and is happy with about 20 mA. A resistor in series must absorb the remaining 3 V: `R = (5 − 2) / 0.02 = 150 Ω`. Resistors come in standard values, so choose the next one up, 220 Ω. The current ends up a little lower and the LED stays safe.",
      },
      { type: "h2", text: "Ground and the common reference" },
      {
        type: "p",
        text: "Voltages are always measured relative to something. In a circuit that reference is **ground (GND)**. Every part that talks to another must share the same ground, which is why a separately powered servo or sensor needs its ground tied to the board's ground.",
      },
      { type: "h2", text: "Breadboards" },
      {
        type: "ul",
        items: [
          "Holes in a short row of five are connected together. Parts in the same row are electrically joined.",
          "The long rails along the edges are for power (usually marked + and −).",
          "The centre gap isolates the two halves so a chip can straddle it.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        title: "Avoid short circuits",
        text: "Connecting power directly to ground with no resistance lets a very large current flow. It can overheat wires, damage a board, or burn out a USB port. Check wiring before you power a circuit.",
      },
    ],
  },
  {
    slug: "digital-and-analog-signals",
    order: 3,
    topic: "foundations",
    level: "beginner",
    minutes: 15,
    title: "Digital and analog signals",
    summary: "How a microcontroller reads and writes on/off and varying signals, and why logic levels matter.",
    objectives: [
      "Tell digital and analog signals apart",
      "Read an analog value on Arduino and ESP32",
      "Explain PWM and why 5 V and 3.3 V boards must not be mixed carelessly",
    ],
    tags: ["digital", "analog", "adc", "pwm", "logic level", "pull-up", "input", "foundations"],
    relatedDocs: ["hardware-knowledge/arduino-uno", "hardware-knowledge/esp32-devkit"],
    blocks: [
      {
        type: "p",
        text: "Microcontroller pins deal with two kinds of signal.",
      },
      {
        type: "ul",
        items: [
          "**Digital** signals have two states: HIGH (the board's logic voltage) and LOW (0 V). Buttons, relays, and LEDs are digital.",
          "**Analog** signals vary smoothly. A potentiometer or a light sensor produces a voltage anywhere in a range.",
        ],
      },
      { type: "h2", text: "Logic levels differ between boards" },
      {
        type: "table",
        head: ["Board", "HIGH is about", "Analog read range"],
        rows: [
          ["Arduino Uno", "5 V", "0 to 1023 (10-bit)"],
          ["ESP32", "3.3 V", "0 to 4095 (12-bit)"],
        ],
      },
      {
        type: "callout",
        tone: "warning",
        title: "Never feed 5 V into an ESP32 pin",
        text: "ESP32 pins are not 5 V tolerant. Use a voltage divider or a level shifter when a 5 V part sends a signal to a 3.3 V board.",
      },
      { type: "h2", text: "Floating inputs" },
      {
        type: "p",
        text: "An input pin connected to nothing picks up noise and reads random values. Give it a defined resting state with a pull-up or pull-down resistor. Most boards have internal ones you can switch on with `INPUT_PULLUP`.",
      },
      { type: "h2", text: "Reading an analog value" },
      {
        type: "code",
        language: "cpp",
        filename: "analog_read.ino",
        code: `// Works on Arduino Uno (use A0) and ESP32 (use an ADC1 pin such as 34)
const int SENSOR_PIN = A0;

void setup() {
  Serial.begin(9600);
}

void loop() {
  int raw = analogRead(SENSOR_PIN);
  Serial.println(raw);
  delay(200);
}`,
      },
      { type: "h2", text: "PWM: faking an analog output" },
      {
        type: "p",
        text: "Most pins cannot output a true in-between voltage. Instead, **pulse-width modulation (PWM)** switches a pin on and off very quickly. The fraction of time it is on, the **duty cycle**, sets the average power: 50 % duty makes an LED about half as bright. On an Uno, `analogWrite(pin, 0..255)` works on the PWM-capable pins (3, 5, 6, 9, 10, 11).",
      },
    ],
  },
  {
    slug: "blink-an-led-with-arduino",
    order: 4,
    topic: "arduino",
    level: "beginner",
    minutes: 20,
    title: "Blink an LED with Arduino",
    summary: "Your first circuit and sketch: wire an LED and resistor to an Arduino Uno and make it blink.",
    objectives: [
      "Wire an LED safely with a resistor",
      "Write and upload a sketch",
      "Change the blink rate and fade the LED with PWM",
    ],
    tags: ["arduino", "led", "blink", "first project", "digitalwrite", "resistor", "pwm", "sketch"],
    relatedDocs: ["hardware-knowledge/arduino-uno"],
    blocks: [
      { type: "h2", text: "What you need" },
      {
        type: "ul",
        items: [
          "Arduino Uno, plus a USB cable",
          "One LED (any colour)",
          "One 220 Ω resistor",
          "Breadboard and jumper wires",
        ],
      },
      { type: "h2", text: "Wire it" },
      {
        type: "ol",
        items: [
          "Connect digital pin **9** to one end of the resistor.",
          "Connect the other end of the resistor to the LED's **anode**, the longer leg.",
          "Connect the LED's **cathode**, the shorter leg, to a **GND** pin.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        title: "LEDs have a direction",
        text: "An LED only lights one way round. If it stays dark, flip it. The resistor can sit on either side of the LED, but it must be in the loop.",
      },
      { type: "h2", text: "The sketch" },
      {
        type: "code",
        language: "cpp",
        filename: "blink.ino",
        code: `const int LED_PIN = 9;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);  // LED on
  delay(500);                   // wait half a second
  digitalWrite(LED_PIN, LOW);   // LED off
  delay(500);
}`,
      },
      {
        type: "p",
        text: "`setup()` runs once at power-on and configures the pin as an output. `loop()` then repeats forever. Pin 9 is also PWM-capable, which the next step uses. For the built-in LED instead, use pin 13 and skip the external parts.",
      },
      { type: "h2", text: "Try it: fade instead of blink" },
      {
        type: "code",
        language: "cpp",
        filename: "fade.ino",
        code: `const int LED_PIN = 9;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  for (int level = 0; level <= 255; level++) {
    analogWrite(LED_PIN, level);
    delay(5);
  }
  for (int level = 255; level >= 0; level--) {
    analogWrite(LED_PIN, level);
    delay(5);
  }
}`,
      },
      { type: "h2", text: "Try it in Kiungo" },
      {
        type: "p",
        text: "Open the [Engineering Lab](/laboratory/workspace), add an Arduino Uno, then search for “led” and add it: it wires itself to pin 13 and GND. Press Run and watch it blink, then switch to the Current flow view to see the current go round. The lab assumes the 220 Ω resistor a real build needs. Compare the wiring with your real breadboard, then record what you observed in [Experiment Records](/experiments).",
      },
    ],
  },
  {
    slug: "esp32-first-steps",
    order: 5,
    topic: "esp32",
    level: "beginner",
    minutes: 25,
    title: "ESP32 first steps",
    summary: "Set up the board, blink an LED, read an analog input, and join WiFi, while avoiding the usual pin traps.",
    objectives: [
      "Set up the Arduino IDE for ESP32 boards",
      "Blink an LED and read an analog sensor",
      "Connect to WiFi and print the IP address",
      "Avoid the pins that cause trouble",
    ],
    tags: ["esp32", "wifi", "arduino ide", "gpio", "adc", "serial", "setup", "blink"],
    relatedDocs: ["hardware-knowledge/esp32-devkit", "technical-guides/device-modes"],
    blocks: [
      { type: "h2", text: "Set up the Arduino IDE" },
      {
        type: "ol",
        items: [
          "Open **File > Preferences** and add the Espressif board index URL `https://espressif.github.io/arduino-esp32/package_esp32_index.json` to \"Additional boards manager URLs\".",
          "Open **Tools > Board > Boards Manager**, search for **esp32**, and install the package from Espressif Systems.",
          "Select your board under **Tools > Board** (many DevKit boards work with \"ESP32 Dev Module\") and the correct port.",
        ],
      },
      {
        type: "callout",
        tone: "note",
        text: "Menu names and the board URL can change between IDE and package versions. If a step does not match, check Espressif's current installation guide.",
      },
      { type: "h2", text: "Blink an LED" },
      {
        type: "p",
        text: "Wire an LED and a 220 Ω resistor from GPIO 4 to GND, in the same way as the Arduino module.",
      },
      {
        type: "code",
        language: "cpp",
        filename: "esp32_blink.ino",
        code: `const int LED_PIN = 4;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println("LED on");
  delay(500);
  digitalWrite(LED_PIN, LOW);
  Serial.println("LED off");
  delay(500);
}`,
      },
      {
        type: "p",
        text: "Open the Serial Monitor at **115200** baud to see the messages. The ESP32 default is 115200, not the 9600 you may know from the Uno.",
      },
      { type: "h2", text: "Read an analog input" },
      {
        type: "p",
        text: "Connect the middle pin of a potentiometer to GPIO 34, one outer pin to 3.3 V and the other to GND. GPIO 34 is input-only, which suits a sensor.",
      },
      {
        type: "code",
        language: "cpp",
        filename: "esp32_analog.ino",
        code: `const int POT_PIN = 34;

void setup() {
  Serial.begin(115200);
}

void loop() {
  int raw = analogRead(POT_PIN);          // 0 to 4095
  float volts = raw * 3.3f / 4095.0f;     // approximate
  Serial.printf("raw=%d  approx %.2f V\\n", raw, volts);
  delay(250);
}`,
      },
      { type: "h2", text: "Connect to WiFi" },
      {
        type: "code",
        language: "cpp",
        filename: "esp32_wifi.ino",
        code: `#include <WiFi.h>

const char* WIFI_SSID = "your-network";
const char* WIFI_PASSWORD = "your-password";

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected, IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {}`,
      },
      {
        type: "p",
        text: "The ESP32 connects to 2.4 GHz networks only. Do not commit real network passwords to a shared repository.",
      },
      { type: "h2", text: "Pins to avoid" },
      {
        type: "ul",
        items: [
          "**GPIO 6 to 11** are wired to the flash memory. Never use them.",
          "**GPIO 0, 2, 5, 12, 15** are strapping pins checked at boot. Avoid circuits that hold them at the wrong level.",
          "**GPIO 34 to 39** are input-only.",
          "**ADC2 pins** do not work while WiFi is on. Use ADC1 pins (32 to 39) for analog readings with WiFi.",
        ],
      },
    ],
  },
  {
    slug: "read-temperature-and-humidity-dht11",
    order: 6,
    topic: "sensors",
    level: "beginner",
    minutes: 20,
    title: "Read temperature and humidity with a DHT11",
    summary: "Wire a DHT11, install the library, and print readings, handling failed reads properly.",
    objectives: [
      "Wire a DHT11 to Arduino or ESP32",
      "Install and use the DHT library",
      "Handle failed readings and respect the sensor's read rate",
    ],
    tags: ["dht11", "temperature", "humidity", "sensor", "library", "serial", "arduino", "esp32"],
    relatedDocs: ["hardware-knowledge/dht11"],
    blocks: [
      { type: "h2", text: "What you need" },
      {
        type: "ul",
        items: [
          "An Arduino Uno or ESP32",
          "A DHT11 sensor (a 3-pin module is easiest)",
          "Jumper wires",
          "For a bare 4-pin sensor, a 10 kΩ resistor as a pull-up",
        ],
      },
      { type: "h2", text: "Wire it" },
      {
        type: "table",
        head: ["DHT11 pin", "Arduino Uno", "ESP32"],
        rows: [
          ["VCC (+)", "5 V", "3.3 V"],
          ["DATA (OUT)", "Digital pin 2", "GPIO 4"],
          ["GND (−)", "GND", "GND"],
        ],
      },
      {
        type: "p",
        text: "For a bare 4-pin sensor, put the 10 kΩ resistor between DATA and VCC. Powering the sensor from the board's own logic voltage keeps the data line safe for the board.",
      },
      { type: "h2", text: "Install the library" },
      {
        type: "p",
        text: "In the Arduino IDE, open **Sketch > Include Library > Manage Libraries**, then install **DHT sensor library** by Adafruit. Accept the prompt to install its dependency, **Adafruit Unified Sensor**.",
      },
      { type: "h2", text: "The sketch" },
      {
        type: "code",
        language: "cpp",
        filename: "dht11_read.ino",
        code: `#include <DHT.h>

#define DHT_PIN 2        // use 4 on ESP32
#define DHT_TYPE DHT11

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(9600);    // use 115200 on ESP32
  dht.begin();
}

void loop() {
  delay(2000);           // the DHT11 can be read about once a second

  float humidity = dht.readHumidity();
  float celsius = dht.readTemperature();

  if (isnan(humidity) || isnan(celsius)) {
    Serial.println("Read failed - check wiring");
    return;
  }

  Serial.print("Humidity: ");
  Serial.print(humidity);
  Serial.print(" %  Temperature: ");
  Serial.print(celsius);
  Serial.println(" C");
}`,
      },
      {
        type: "callout",
        tone: "tip",
        title: "Troubleshooting",
        text: "If every read fails, recheck the pin order on your module, confirm the pull-up on bare sensors, and make sure the pin number in the sketch matches your wiring. Reading faster than about once per second also causes failures.",
      },
      { type: "h2", text: "Try it: a temperature alarm" },
      {
        type: "p",
        text: "Add an LED as in [Blink an LED](/learn/blink-an-led-with-arduino) and switch it on when the temperature rises above a limit you choose. Remember the DHT11 is only accurate to about ±2 °C, so avoid thresholds that rely on a fraction of a degree.",
      },
    ],
  },
  {
    slug: "measure-distance-with-hc-sr04",
    order: 7,
    topic: "sensors",
    level: "intermediate",
    minutes: 25,
    title: "Measure distance with an HC-SR04",
    summary: "Time an ultrasonic echo and convert it to centimetres, including the voltage fix needed on ESP32.",
    objectives: [
      "Trigger the sensor and time its echo",
      "Convert echo time to distance",
      "Protect a 3.3 V board from the 5 V echo signal",
    ],
    tags: ["hc-sr04", "ultrasonic", "distance", "pulsein", "echo", "trigger", "level shifting", "sensor"],
    relatedDocs: ["hardware-knowledge/hc-sr04", "hardware-knowledge/esp32-devkit"],
    blocks: [
      { type: "h2", text: "How it works" },
      {
        type: "ol",
        items: [
          "You pulse **TRIG** HIGH for 10 microseconds.",
          "The sensor sends a burst of ultrasound.",
          "**ECHO** goes HIGH until the reflection returns.",
          "The ECHO pulse length is the round-trip time. Halve it and multiply by the speed of sound to get distance.",
        ],
      },
      { type: "h2", text: "Wire it to an Arduino Uno" },
      {
        type: "table",
        head: ["HC-SR04 pin", "Arduino Uno"],
        rows: [
          ["VCC", "5 V"],
          ["TRIG", "Digital pin 9"],
          ["ECHO", "Digital pin 10"],
          ["GND", "GND"],
        ],
      },
      {
        type: "callout",
        tone: "warning",
        title: "Using an ESP32 instead?",
        text: "Power the sensor from the 5 V (VIN) pin, but never connect ECHO directly to an ESP32 GPIO. Put a voltage divider on ECHO, for example 1 kΩ from ECHO to the GPIO and 2 kΩ from the GPIO to GND, which brings 5 V down to about 3.3 V.",
      },
      { type: "h2", text: "The sketch" },
      {
        type: "code",
        language: "cpp",
        filename: "hcsr04_distance.ino",
        code: `const int TRIG_PIN = 9;
const int ECHO_PIN = 10;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}

// Returns distance in centimetres, or -1 if no echo was received.
float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Give up after 30 ms (about 5 m of round trip).
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000UL);
  if (duration == 0) {
    return -1;
  }
  // Speed of sound is about 0.0343 cm per microsecond; halve for the round trip.
  return duration * 0.0343f / 2.0f;
}

void loop() {
  float cm = readDistanceCm();
  if (cm < 0) {
    Serial.println("No echo");
  } else {
    Serial.print(cm);
    Serial.println(" cm");
  }
  delay(100);
}`,
      },
      {
        type: "p",
        text: "On an ESP32, change the two pin numbers to GPIOs you have wired (for example 5 for TRIG and 18 for ECHO, behind the divider) and use 115200 baud.",
      },
      { type: "h2", text: "Checking your result" },
      {
        type: "ul",
        items: [
          "Hold a flat, hard object such as a book 20 cm away and compare the reading with a ruler.",
          "Expect errors near the 2 cm minimum and with soft or angled surfaces.",
          "Record your measurements in [Experiment Records](/experiments) so you can compare runs.",
        ],
      },
    ],
  },
  {
    slug: "detect-motion-with-pir",
    order: 8,
    topic: "sensors",
    level: "beginner",
    minutes: 15,
    title: "Detect motion with a PIR sensor",
    summary: "Read a PIR sensor, allow for its warm-up, and react to motion with an LED.",
    objectives: [
      "Wire a PIR sensor",
      "Read its digital output and detect state changes",
      "Allow for warm-up and tune the sensor",
    ],
    tags: ["pir", "motion", "sensor", "hc-sr501", "digital", "led", "arduino", "presence"],
    relatedDocs: ["hardware-knowledge/pir-sensor"],
    blocks: [
      { type: "h2", text: "Wire it" },
      {
        type: "table",
        head: ["PIR pin", "Arduino Uno"],
        rows: [
          ["VCC", "5 V"],
          ["OUT", "Digital pin 2"],
          ["GND", "GND"],
        ],
      },
      {
        type: "p",
        text: "Add an LED and 220 Ω resistor on pin 13 as in the blink module, or simply use the board's built-in LED on pin 13.",
      },
      { type: "h2", text: "The sketch" },
      {
        type: "code",
        language: "cpp",
        filename: "pir_motion.ino",
        code: `const int PIR_PIN = 2;
const int LED_PIN = 13;

int lastState = LOW;

void setup() {
  pinMode(PIR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(9600);

  Serial.println("Warming up the PIR sensor (60 s)...");
  delay(60000);
  Serial.println("Ready");
}

void loop() {
  int state = digitalRead(PIR_PIN);
  digitalWrite(LED_PIN, state);

  // Only report changes, not every reading.
  if (state != lastState) {
    Serial.println(state == HIGH ? "Motion detected" : "Motion ended");
    lastState = state;
  }
  delay(50);
}`,
      },
      {
        type: "callout",
        tone: "tip",
        title: "Tuning the module",
        text: "Most modules have two small trimmers. One sets sensitivity and the other sets how long OUT stays HIGH after motion. Turn the hold time down while testing so you can see the state change quickly.",
      },
      { type: "h2", text: "Things to remember" },
      {
        type: "ul",
        items: [
          "Expect false triggers during the first minute after power-on.",
          "Direct sunlight, heaters, and moving air can trigger a PIR.",
          "A PIR sees movement, not presence. Someone sitting still may stop being detected.",
        ],
      },
    ],
  },
  {
    slug: "prototype-virtually-then-build",
    order: 9,
    topic: "hybrid",
    level: "intermediate",
    minutes: 20,
    title: "Prototype virtually, then build",
    summary: "The Kiungo workflow: design with virtual parts, swap in real ones as they arrive, and know what simulation cannot tell you.",
    objectives: [
      "Plan a project that mixes virtual and physical parts",
      "Use virtual mode to check wiring and logic early",
      "Name the limits of simulation and verify on hardware",
    ],
    tags: ["hybrid", "simulation", "virtual", "physical", "workflow", "prototype", "verification", "laboratory"],
    relatedDocs: ["technical-guides/device-modes", "system-overview/how-kiungo-works"],
    blocks: [
      {
        type: "p",
        text: "Kiungo's central idea is that a missing part should not stop you. You can start with every component virtual and replace them with real hardware one at a time.",
      },
      { type: "h2", text: "A typical hybrid project" },
      {
        type: "p",
        text: "Imagine a small greenhouse monitor. You own an ESP32 and a DHT11, but not yet the soil moisture sensor, relay, or display. In Kiungo you can run the real ESP32 and DHT11 together with virtual versions of the others, then swap each virtual part for the real one when it arrives.",
      },
      { type: "h2", text: "The workflow" },
      {
        type: "ol",
        items: [
          "**Plan.** Define the objective in [Projects](/workspace) and choose parts from the [component library](/components), checking voltages and interfaces.",
          "**Prototype virtually.** In the [Engineering Lab](/laboratory/workspace), place components and wire them. The laboratory checks wiring against rules such as voltage, protocol, and duplicate pin use.",
          "**Run and observe.** Start the simulation and watch how the system behaves. Fix wiring and logic problems here, where mistakes are free.",
          "**Bring in hardware.** Connect real devices as you get them, then select each component and change its device mode from Virtual to Physical in the Inspector.",
          "**Record.** Write the procedure, observations, and results in [Experiment Records](/experiments), and export a report from [Reports](/reports).",
        ],
      },
      { type: "h2", text: "What simulation cannot tell you" },
      {
        type: "ul",
        items: [
          "Whether a circuit is electrically safe, since virtual models are not SPICE-level.",
          "Real timing, noise, and sensor accuracy.",
          "How a motor or servo behaves under load or at stall.",
          "Whether firmware runs correctly on the actual chip, because firmware is not executed on virtual microcontrollers.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        title: "Verify before you power up",
        text: "A passing simulation means the logic and wiring rules look right. Before connecting real parts, check each voltage, current limit, and power supply against the datasheet. See [Device modes and simulation limits](/docs/technical-guides/device-modes).",
      },
      {
        type: "p",
        text: "You now have the full path: foundations, a board, a sensor, and the hybrid workflow. Revisit the [Learning Center](/learn) to pick up any module you skipped.",
      },
    ],
  },
];
