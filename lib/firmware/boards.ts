/**
 * Plain-language facts the Firmware page shows about boards and starters:
 * the names people know boards by, what each starter does, and which
 * Engineering Lab build shows a starter running.
 */

import { getPart } from "@kiungo/core/parts";

/** Board ids the firmware backend knows (engine/firmware/firmware_project.py BOARD_PROFILES). */
export const FIRMWARE_BOARDS = ["arduino-uno", "esp32", "arduino-mega", "esp8266", "raspberry-pi-pico", "stm32", "teensy", "microbit", "nrf52", "raspberry-pi-4"] as const;

const EXTRA_NAMES: Record<string, string> = { nrf52: "Nordic nRF52840" };

/** "Arduino Uno" for "arduino-uno"; falls back to the id for boards the library doesn't have. */
export function boardName(id: string): string {
  return getPart(id)?.name ?? EXTRA_NAMES[id] ?? id;
}

/** What a project is, in words: the backend sends "arduino-sketch" or "raspberry-pi". */
export function projectKind(type: string): string {
  if (type === "arduino-sketch") return "Arduino sketch (C++)";
  if (type === "raspberry-pi") return "Raspberry Pi program (Python)";
  if (type === "platformio") return "PlatformIO project (C++)";
  return type ? type.replace(/-/g, " ") : "Project";
}

export interface Starter {
  /** One line on what the starter code does. */
  does: string;
  /** Parts the Engineering Lab puts beside the board to show it running. Empty: the board alone. */
  lab: string[];
}

/** Starters the backend ships (engine/firmware/project_templates.py). */
export const STARTERS: Record<string, Starter> = {
  blink: { does: "Flashes an LED on and off once a second.", lab: ["led"] },
  led: { does: "Turns an LED on and off, and fades it with PWM.", lab: ["led"] },
  servo: { does: "Sweeps a servo from 0° to 180° and back.", lab: ["servo"] },
  relay: { does: "Switches a relay on and off to control a bigger load.", lab: ["relay"] },
  dht11: { does: "Reads temperature and humidity and prints them.", lab: ["dht11"] },
  "hc-sr04": { does: "Measures distance with an ultrasonic sensor.", lab: ["hc-sr04"] },
  mq2: { does: "Reads a gas sensor and warns past a threshold.", lab: ["mq2", "buzzer"] },
  lcd: { does: "Writes text on a 16×2 character display over I²C.", lab: ["lcd-16x2"] },
  i2c: { does: "Lists every I²C device on the bus by address.", lab: ["oled-ssd1306"] },
  spi: { does: "Sends bytes over SPI and reads them back.", lab: [] },
  wifi: { does: "Joins a Wi-Fi network and prints its IP address.", lab: [] },
  bluetooth: { does: "Sends and receives text over Bluetooth serial.", lab: ["hc-05"] },
  mqtt: { does: "Publishes readings to an MQTT broker over Wi-Fi.", lab: ["dht22"] },
};

/** The lab board for a firmware board: the same board when the lab has it, else an Uno. */
export function labBoardFor(boardId: string): string {
  const part = getPart(boardId);
  return part?.group === "boards" ? boardId : "arduino-uno";
}

/** Starters that need radios the board doesn't have run on an ESP32 in the lab. */
export function labBuildFor(boardId: string, templateId: string): { board: string; parts: string[] } {
  const starter = STARTERS[templateId] ?? { lab: [] };
  const needsWifi = templateId === "wifi" || templateId === "mqtt";
  const board = needsWifi && !["esp32", "esp8266", "raspberry-pi-4", "raspberry-pi-pico"].includes(boardId) ? "esp32" : labBoardFor(boardId);
  return { board, parts: starter.lab };
}
