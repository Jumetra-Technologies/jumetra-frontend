import type { FaqItem } from "../types";

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "need-hardware",
    question: "Do I need physical hardware to use HHIP?",
    answer:
      "No. Components can run in virtual mode, so you can design and test a system with no parts at all. You can also mix: connect the real parts you have and keep the rest virtual. See [Prototype virtually, then build](/learn/prototype-virtually-then-build).",
    tags: ["hardware", "virtual", "hybrid", "beginner", "requirements"],
  },
  {
    id: "where-saved",
    question: "Where are my projects and experiment records saved?",
    answer:
      "In your browser's local storage. They are not yet backed up, synced between devices, or shared with teammates, and clearing site data deletes them. Export a Markdown report from [Reports](/reports) to keep a copy.",
    tags: ["storage", "projects", "experiments", "backup", "local storage", "data"],
  },
  {
    id: "sign-in",
    question: "Do I need to sign in?",
    answer:
      "Google sign-in is available, but in the current build the data features do not require it. See [API and environment](/docs/technical-guides/api-and-environment) if you want to configure it for your own deployment.",
    tags: ["sign in", "login", "google", "auth", "account"],
  },
  {
    id: "without-backend",
    question: "What works without the backend running?",
    answer:
      "Documentation, the Learning Center, projects, experiment records, and Markdown reports work without the API. The component library, engineering laboratory, hybrid bridge, and firmware tools need the backend. See [Run HHIP locally](/docs/technical-guides/run-locally).",
    tags: ["backend", "offline", "api", "requirements", "localhost"],
  },
  {
    id: "supported-hardware",
    question: "Which boards and sensors are included?",
    answer:
      "The component library currently covers Arduino, ESP32, Raspberry Pi Pico, and STM32 boards, plus sensors such as the DHT11, DHT22, HC-SR04, and PIR, actuators such as servos, relays, and buzzers, displays, passive parts, and prototyping parts. Browse the [component library](/components) for the full list.",
    tags: ["components", "boards", "sensors", "library", "supported", "catalog"],
  },
  {
    id: "simulation-accuracy",
    question: "How accurate is the simulation?",
    answer:
      "Virtual components use deterministic behavior models, not physics-accurate circuit simulation. They are good for exercising logic and checking wiring rules, not for proving electrical safety or real-world performance. Read [Device modes and simulation limits](/docs/technical-guides/device-modes).",
    tags: ["simulation", "accuracy", "limits", "spice", "virtual", "safety"],
  },
  {
    id: "five-volt-esp32",
    question: "Can I connect a 5 V sensor to an ESP32?",
    answer:
      "Not directly on a signal pin. ESP32 GPIO pins are 3.3 V only and are not 5 V tolerant. Power the sensor as its datasheet requires, then reduce any 5 V output with a voltage divider or level shifter before it reaches the ESP32. The [HC-SR04 tutorial](/learn/measure-distance-with-hc-sr04) shows an example.",
    tags: ["esp32", "5v", "3.3v", "level shifting", "voltage divider", "safety", "gpio"],
  },
  {
    id: "dht-read-fails",
    question: "Why does my DHT11 return NaN or fail to read?",
    answer:
      "The usual causes are wrong pin order on the module, a missing 10 kΩ pull-up on a bare 4-pin sensor, a pin number in the sketch that does not match the wiring, or reading faster than about once per second. See [Read temperature and humidity with a DHT11](/learn/read-temperature-and-humidity-dht11).",
    tags: ["dht11", "nan", "troubleshooting", "temperature", "humidity", "sensor"],
  },
  {
    id: "hybrid-mode",
    question: "What is hybrid mode?",
    answer:
      "A hybrid system combines physical and virtual components, for example a real ESP32 and DHT11 working with a virtual relay. Each component has its own mode, set in the Inspector. See [Device modes and simulation limits](/docs/technical-guides/device-modes).",
    tags: ["hybrid", "modes", "physical", "virtual", "inspector"],
  },
  {
    id: "run-own-machine",
    question: "How do I run HHIP on my own computer?",
    answer:
      "Start the backend with Python, then the frontend with npm, and point the frontend at the backend with `.env.local`. The steps are in [Run HHIP locally](/docs/technical-guides/run-locally).",
    tags: ["install", "setup", "localhost", "run", "development"],
  },
  {
    id: "improve-docs",
    question: "How do I fix or add documentation?",
    answer:
      "Content lives as typed data in the repository, so you edit a file and open a pull request. See [Contributing documentation](/docs/developer-resources/contributing-docs).",
    tags: ["contribute", "documentation", "content", "edit", "pull request"],
  },
];
