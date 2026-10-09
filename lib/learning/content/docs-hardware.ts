import type { DocArticle } from "../types";

/**
 * Hardware reference pages for parts in the component library.
 * Figures are typical datasheet values for the common modules; boards and clones
 * vary, so each page tells readers to confirm against their own datasheet.
 */
export const HARDWARE_ARTICLES: DocArticle[] = [
  {
    slug: "arduino-uno",
    category: "hardware-knowledge",
    title: "Arduino Uno R3",
    summary:
      "The classic 5 V ATmega328P board: pins, limits, and what to watch when wiring it.",
    tags: ["arduino", "uno", "atmega328p", "microcontroller", "5v", "pinout", "pwm", "adc"],
    related: ["hardware-knowledge/esp32-devkit", "hardware-knowledge/hc-sr04"],
    blocks: [
      {
        type: "p",
        text: "The Arduino Uno R3 is the usual first board for learners. It is simple, forgiving, and supported by an enormous amount of example code. In the Kiungo component library it appears as `arduino-uno`.",
      },
      {
        type: "table",
        caption: "At a glance",
        head: ["Property", "Value"],
        rows: [
          ["Microcontroller", "ATmega328P, 16 MHz"],
          ["Logic level", "5 V"],
          ["Digital I/O", "14 pins (6 can output PWM: 3, 5, 6, 9, 10, 11)"],
          ["Analog inputs", "6 pins (A0 to A5), 10-bit ADC (values 0 to 1023)"],
          ["Memory", "32 KB flash, 2 KB SRAM, 1 KB EEPROM"],
          ["Recommended input voltage", "7 to 12 V on the barrel jack or VIN"],
          ["Current per I/O pin", "20 mA recommended, 40 mA absolute maximum"],
        ],
      },
      { type: "h2", text: "Pins worth knowing" },
      {
        type: "ul",
        items: [
          "**D0 and D1** are the hardware serial pins used by USB. Avoid them in simple projects so uploads and Serial Monitor keep working.",
          "**A4 and A5** double as I2C: A4 is SDA and A5 is SCL.",
          "**D10 to D13** carry SPI. Pin 13 also drives the on-board LED.",
          "**5V and 3.3V** pins supply power to parts. The 3.3 V pin is limited to about 50 mA.",
        ],
      },
      { type: "h2", text: "Common mistakes" },
      {
        type: "ul",
        items: [
          "Driving motors, relays, or servos straight from a pin. Pins source only a few tens of mA; use a driver or transistor and a separate supply.",
          "Forgetting a shared ground when a part has its own power supply.",
          "Connecting a 3.3 V-only module directly to a 5 V signal without level shifting.",
        ],
      },
      {
        type: "link-card",
        href: "/learn/blink-an-led-with-arduino",
        title: "Tutorial: Blink an LED with Arduino",
        text: "Your first circuit and sketch on the Uno.",
      },
    ],
  },
  {
    slug: "esp32-devkit",
    category: "hardware-knowledge",
    title: "ESP32 DevKit",
    summary:
      "A 3.3 V dual-core board with WiFi and Bluetooth, and the pin rules that catch beginners out.",
    tags: ["esp32", "devkit", "wifi", "bluetooth", "3.3v", "adc", "gpio", "strapping", "pinout"],
    related: ["hardware-knowledge/arduino-uno", "technical-guides/device-modes"],
    blocks: [
      {
        type: "p",
        text: "The ESP32 DevKit is a low-cost board with a dual-core processor, WiFi, and Bluetooth. It is the natural choice when a project needs wireless connectivity. In the Kiungo library it appears as `esp32`.",
      },
      {
        type: "table",
        caption: "At a glance",
        head: ["Property", "Value"],
        rows: [
          ["Processor", "Dual-core Xtensa LX6, up to 240 MHz"],
          ["Memory", "About 520 KB SRAM (flash size depends on the module)"],
          ["Wireless", "WiFi 802.11 b/g/n (2.4 GHz) and Bluetooth, including BLE"],
          ["Logic level", "3.3 V. GPIO pins are **not** 5 V tolerant"],
          ["ADC", "12-bit (values 0 to 4095), non-linear near the ends of the range"],
          ["Default I2C", "SDA on GPIO21, SCL on GPIO22"],
          ["Other features", "PWM on most output pins, two 8-bit DACs on GPIO25 and GPIO26"],
        ],
      },
      {
        type: "callout",
        tone: "warning",
        title: "3.3 V logic only",
        text: "Connecting a 5 V signal, such as the echo pin of an HC-SR04, straight to an ESP32 pin can damage the board. Use a voltage divider or level shifter.",
      },
      { type: "h2", text: "GPIO rules that matter" },
      {
        type: "ul",
        items: [
          "**GPIO34 to GPIO39 are input-only** and have no internal pull-up or pull-down. They are good choices for analog sensors.",
          "**GPIO6 to GPIO11 connect to the on-board flash.** Do not use them.",
          "**Strapping pins** (GPIO0, 2, 5, 12, and 15) are read at boot. A circuit that pulls them to the wrong level can stop the board from starting.",
          "**ADC2 pins cannot be read while WiFi is active.** Use ADC1 pins (GPIO32 to GPIO39) when you need WiFi and analog input together.",
        ],
      },
      {
        type: "p",
        text: "Many DevKit boards wire the on-board LED to GPIO2, but this varies between manufacturers, so check the silkscreen or schematic for your board.",
      },
      {
        type: "link-card",
        href: "/learn/esp32-first-steps",
        title: "Tutorial: ESP32 first steps",
        text: "Set up the board, blink an LED, read an analog value, and join WiFi.",
      },
    ],
  },
  {
    slug: "dht11",
    category: "hardware-knowledge",
    title: "DHT11 temperature and humidity sensor",
    summary:
      "A cheap single-wire sensor for temperature and humidity, with modest accuracy and a slow read rate.",
    tags: ["dht11", "temperature", "humidity", "sensor", "single-wire", "digital"],
    related: ["hardware-knowledge/arduino-uno", "hardware-knowledge/esp32-devkit"],
    blocks: [
      {
        type: "p",
        text: "The DHT11 measures air temperature and relative humidity and reports them over a single data wire. It is a good teaching sensor: easy to wire and read, but coarse. In the Kiungo library it appears as `dht11`.",
      },
      {
        type: "table",
        caption: "At a glance",
        head: ["Property", "Value"],
        rows: [
          ["Supply voltage", "About 3 to 5.5 V"],
          ["Temperature", "0 to 50 °C, accuracy about ±2 °C, 1 °C resolution"],
          ["Humidity", "About 20 to 80 % RH, accuracy about ±5 %, 1 % resolution"],
          ["Interface", "One data pin using a proprietary protocol (not Dallas 1-Wire)"],
          ["Maximum read rate", "About once per second"],
        ],
      },
      { type: "h2", text: "Wiring" },
      {
        type: "ul",
        items: [
          "Bare 4-pin sensors: VCC, DATA, an unused pin, and GND. Add a pull-up resistor of about 10 kΩ between DATA and VCC.",
          "3-pin breakout modules usually include the pull-up already. Check the label for the pin order, which varies.",
          "Power it from the same voltage as the board's logic, so its data line is safe for the board's pin.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        title: "Need better accuracy?",
        text: "The DHT22 has finer resolution and a wider range for a small price difference. It is also in the component library as `dht22`.",
      },
      {
        type: "link-card",
        href: "/learn/read-temperature-and-humidity-dht11",
        title: "Tutorial: Read temperature and humidity",
        text: "Wire a DHT11 and print readings over serial.",
      },
    ],
  },
  {
    slug: "hc-sr04",
    category: "hardware-knowledge",
    title: "HC-SR04 ultrasonic distance sensor",
    summary:
      "Measures distance by timing an ultrasonic echo. Needs 5 V and a level shift on 3.3 V boards.",
    tags: ["hc-sr04", "ultrasonic", "distance", "sensor", "echo", "trigger", "5v", "level shifting"],
    related: ["hardware-knowledge/esp32-devkit", "hardware-knowledge/arduino-uno"],
    blocks: [
      {
        type: "p",
        text: "The HC-SR04 sends a burst of ultrasound and times how long the echo takes to return. Distance follows from the speed of sound. In the Kiungo library it appears as `hc-sr04`.",
      },
      {
        type: "table",
        caption: "At a glance",
        head: ["Property", "Value"],
        rows: [
          ["Supply voltage", "5 V"],
          ["Range", "About 2 cm to 400 cm"],
          ["Beam angle", "About 15°"],
          ["Trigger", "A 10 µs HIGH pulse on TRIG"],
          ["Output", "ECHO goes HIGH for a time proportional to distance (5 V logic)"],
        ],
      },
      { type: "h2", text: "Turning time into distance" },
      {
        type: "p",
        text: "Sound travels about 343 m/s in air at 20 °C, which is 0.0343 cm per microsecond. The pulse travels to the object and back, so halve the result: `distance (cm) = echo time (µs) × 0.0343 / 2`, roughly the echo time divided by 58.",
      },
      {
        type: "callout",
        tone: "warning",
        title: "ECHO is a 5 V signal",
        text: "On an ESP32 or any 3.3 V board, reduce ECHO to 3.3 V before it reaches the pin, for example with a divider of 1 kΩ and 2 kΩ resistors or a level shifter. TRIG can usually be driven directly from a 3.3 V pin.",
      },
      { type: "h2", text: "Limits" },
      {
        type: "ul",
        items: [
          "Soft or angled surfaces such as fabric or a slanted wall reflect poorly and can give wrong or missing readings.",
          "Objects closer than about 2 cm are not measured reliably.",
          "Temperature changes the speed of sound slightly, which matters for precise work.",
        ],
      },
      {
        type: "link-card",
        href: "/learn/measure-distance-with-hc-sr04",
        title: "Tutorial: Measure distance",
        text: "Wire the sensor and convert echo time to centimetres.",
      },
    ],
  },
  {
    slug: "pir-sensor",
    category: "hardware-knowledge",
    title: "PIR motion sensor",
    summary:
      "Detects movement of warm bodies using infrared. Has a warm-up period and adjustable sensitivity and delay.",
    tags: ["pir", "motion", "hc-sr501", "infrared", "sensor", "digital", "presence"],
    related: ["hardware-knowledge/arduino-uno"],
    blocks: [
      {
        type: "p",
        text: "A passive infrared (PIR) sensor reports changes in the infrared radiation in its view, which happens when a warm body such as a person moves across its field. In the Kiungo library it appears as `pir`.",
      },
      {
        type: "table",
        caption: "At a glance (typical HC-SR501 module)",
        head: ["Property", "Value"],
        rows: [
          ["Supply voltage", "About 5 V (modules accept roughly 4.5 to 20 V)"],
          ["Output", "Digital HIGH at about 3.3 V when motion is detected"],
          ["Detection range", "A few metres, adjustable"],
          ["Warm-up", "About a minute after power-on before readings settle"],
          ["Adjustments", "Sensitivity and hold-time trimmers, and often a trigger-mode jumper"],
        ],
      },
      {
        type: "ul",
        items: [
          "A PIR detects **motion**, not presence. A person standing perfectly still can stop being detected.",
          "The output stays HIGH for the hold time, then drops. Use the trimmer to shorten it while testing.",
          "Its 3.3 V output is safe for both 3.3 V and 5 V boards.",
        ],
      },
      {
        type: "link-card",
        href: "/learn/detect-motion-with-pir",
        title: "Tutorial: Detect motion",
        text: "Light an LED and log events when movement is seen.",
      },
    ],
  },
  {
    slug: "servo-motor",
    category: "hardware-knowledge",
    title: "Hobby servo motor",
    summary:
      "A position-controlled motor driven by a 50 Hz pulse. Power it separately from the board.",
    tags: ["servo", "sg90", "motor", "pwm", "actuator", "robotics"],
    related: ["hardware-knowledge/arduino-uno", "hardware-knowledge/esp32-devkit"],
    blocks: [
      {
        type: "p",
        text: "A hobby servo (such as the common SG90) turns to an angle set by the width of a repeating control pulse. It is a staple of robot arms and steering. In the Kiungo library it appears as `servo`.",
      },
      {
        type: "table",
        caption: "At a glance (typical micro servo)",
        head: ["Property", "Value"],
        rows: [
          ["Supply voltage", "About 4.8 to 6 V"],
          ["Control signal", "Pulse every 20 ms (50 Hz)"],
          ["Pulse width", "About 1 ms for one end, 1.5 ms for centre, 2 ms for the other end (exact range varies by model)"],
          ["Wires", "Signal (often orange or yellow), power (red), ground (brown or black)"],
        ],
      },
      {
        type: "callout",
        tone: "warning",
        title: "Power it separately",
        text: "A servo can draw hundreds of milliamps when it starts or stalls, enough to reset a board that powers it from a pin. Use an external 5 V supply and join its ground to the board's ground.",
      },
      {
        type: "ul",
        items: [
          "On Arduino, the built-in `Servo` library generates the control pulse on any digital pin.",
          "On ESP32, the `ESP32Servo` library is the usual choice, because the board generates PWM differently from an AVR Arduino.",
          "A 3.3 V signal from an ESP32 is usually enough to drive a servo's signal line even when the servo itself runs on 5 V.",
        ],
      },
    ],
  },
];
