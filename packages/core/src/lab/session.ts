/**
 * Lab session helpers with no browser or store dependencies, shared by the
 * website, the desktop app and the MCP server.
 */

import { getPart } from "../parts";
import type { LabNode, LabSession, LabWire, LogEntry, LogKind } from "./types";

export function makeId(prefix: string): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

const now = () => new Date().toISOString();

export function logEntry(kind: LogKind, text: string, nodes?: string[]): LogEntry {
  return { id: makeId("log"), at: now(), kind, text, ...(nodes?.length ? { nodes } : {}) };
}

export function newSession(input: { name?: string; projectId?: string | null; nodes?: LabNode[]; wires?: LabWire[] } = {}): LabSession {
  const at = now();
  const name = input.name?.trim() || "Untitled lab";
  return {
    id: makeId("lab"),
    name,
    projectId: input.projectId ?? null,
    createdAt: at,
    updatedAt: at,
    nodes: input.nodes ?? [],
    wires: input.wires ?? [],
    log: [logEntry("session", `Session “${name}” started`)],
    view: "top",
    runMs: 0,
    inputs: {},
    runtime: null,
  };
}

/** Short names for the canvas; catalog names are written for the library. */
const SHORT: Record<string, string> = {
  "arduino-uno": "Arduino Uno",
  "arduino-mega": "Arduino Mega",
  "arduino-nano": "Arduino Nano",
  esp32: "ESP32",
  esp8266: "NodeMCU",
  "raspberry-pi-pico": "Pico",
  "raspberry-pi-4": "Raspberry Pi 4",
  stm32: "Blue Pill",
  microbit: "micro:bit",
  teensy: "Teensy 4.1",
  dht11: "DHT11",
  dht22: "DHT22",
  am2302: "AM2302",
  "hc-sr04": "HC-SR04",
  pir: "PIR sensor",
  ldr: "LDR",
  ds18b20: "DS18B20",
  "soil-moisture": "Soil sensor",
  mq2: "MQ-2",
  mpu6050: "MPU-6050",
  bmp280: "BMP280",
  led: "LED",
  resistor: "Resistor",
  "breadboard-full": "Full breadboard",
  "breadboard-mini": "Mini breadboard",
  "rgb-led": "RGB LED",
  buzzer: "Buzzer",
  servo: "Servo",
  "dc-motor": "DC motor",
  relay: "Relay",
  "stepper-motor": "Stepper",
  "lcd-16x2": "LCD 16×2",
  "oled-ssd1306": "OLED",
  "tft-display": "TFT display",
  "hc-05": "HC-05",
  "wifi-module": "ESP-01",
  nrf24l01: "nRF24",
  lora: "LoRa",
  "battery-4aa": "4 × AA battery",
  "battery-9v": "9 V battery",
  "battery-18650": "2 × 18650 battery",
  "lipo-2s": "2S LiPo",
  "lipo-3s": "3S LiPo",
  "lipo-battery": "1S LiPo",
  "buck-converter": "Buck converter",
  "breadboard-power": "Breadboard supply",
  "battery-charger": "TP4056 charger",
  "boost-converter": "Boost converter",
  capacitor: "Capacitor",
  "level-shifter": "Level shifter",
  "push-button": "Button",
  potentiometer: "Potentiometer",
  joystick: "Joystick",
  "ir-receiver": "IR receiver",
  "rotary-encoder": "Rotary encoder",
  keypad: "Keypad",
  "slide-switch": "Slide switch",
  "limit-switch": "Limit switch",
  "line-sensor": "Line sensor",
  "ir-obstacle": "Obstacle sensor",
  vl53l0x: "VL53L0X",
  "wheel-encoder": "Wheel encoder",
  "line-array": "Line array",
  "sharp-ir": "Sharp IR ranger",
  tcs34725: "Color sensor",
  bno055: "BNO055",
  "gy-271": "Compass",
  "sound-sensor": "Sound sensor",
  ina219: "INA219",
  "micro-gear-motor": "N20 motor",
  "servo-mg996r": "MG996R servo",
  nema17: "NEMA 17",
  "water-pump": "Water pump",
  l298n: "L298N",
  tb6612fng: "TB6612FNG",
  l293d: "L293D",
  drv8833: "DRV8833",
  "mosfet-module": "MOSFET module",
  pca9685: "PCA9685",
  a4988: "A4988",
  tm1637: "TM1637",
  max7219: "LED matrix",
  rc522: "RC522",
};

export function shortName(partId: string): string {
  return SHORT[partId] ?? (getPart(partId)?.name ?? partId).split(",")[0].replace(/\s*\(.*\)\s*$/, "");
}

/** A unique, readable label: "LED", "LED 2", … */
export function nextLabel(nodes: LabNode[], partId: string): string {
  const short = shortName(partId);
  const taken = new Set(nodes.map((n) => n.label));
  if (!taken.has(short)) return short;
  for (let i = 2; ; i++) if (!taken.has(`${short} ${i}`)) return `${short} ${i}`;
}

