/**
 * Every part in the library, one file each.
 *
 * Written by `npm run parts:index` from the files in this folder: do not edit
 * it by hand. To add a part, write `catalog/<group>/<id>.ts` (see
 * docs/parts/AUTHORING.md) and run the script.
 */
import type { PartEntry } from "../define";
import arduinoMega from "./boards/arduino-mega";
import arduinoNano from "./boards/arduino-nano";
import arduinoUno from "./boards/arduino-uno";
import esp32 from "./boards/esp32";
import esp8266 from "./boards/esp8266";
import microbit from "./boards/microbit";
import raspberryPi4 from "./boards/raspberry-pi-4";
import raspberryPiPico from "./boards/raspberry-pi-pico";
import stm32 from "./boards/stm32";
import teensy from "./boards/teensy";
import irReceiver from "./controls/ir-receiver";
import joystick from "./controls/joystick";
import keypad from "./controls/keypad";
import limitSwitch from "./controls/limit-switch";
import potentiometer from "./controls/potentiometer";
import pushButton from "./controls/push-button";
import rotaryEncoder from "./controls/rotary-encoder";
import slideSwitch from "./controls/slide-switch";
import lcd16x2 from "./displays/lcd-16x2";
import max7219 from "./displays/max7219";
import oledSsd1306 from "./displays/oled-ssd1306";
import tftDisplay from "./displays/tft-display";
import tm1637 from "./displays/tm1637";
import a4988 from "./drivers/a4988";
import drv8833 from "./drivers/drv8833";
import l293d from "./drivers/l293d";
import l298n from "./drivers/l298n";
import mosfetModule from "./drivers/mosfet-module";
import pca9685 from "./drivers/pca9685";
import relay from "./drivers/relay";
import tb6612fng from "./drivers/tb6612fng";
import dcMotor from "./motors/dc-motor";
import microGearMotor from "./motors/micro-gear-motor";
import nema17 from "./motors/nema17";
import servo from "./motors/servo";
import servoMg996r from "./motors/servo-mg996r";
import stepperMotor from "./motors/stepper-motor";
import waterPump from "./motors/water-pump";
import buzzer from "./outputs/buzzer";
import led from "./outputs/led";
import neopixelRing from "./outputs/neopixel-ring";
import neopixelStick from "./outputs/neopixel-stick";
import rgbLed from "./outputs/rgb-led";
import battery18650 from "./power/battery-18650";
import battery4aa from "./power/battery-4aa";
import battery9v from "./power/battery-9v";
import batteryCharger from "./power/battery-charger";
import boostConverter from "./power/boost-converter";
import breadboardPower from "./power/breadboard-power";
import buckConverter from "./power/buck-converter";
import lipo2s from "./power/lipo-2s";
import lipo3s from "./power/lipo-3s";
import lipoBattery from "./power/lipo-battery";
import breadboard from "./prototyping/breadboard";
import breadboardFull from "./prototyping/breadboard-full";
import breadboardMini from "./prototyping/breadboard-mini";
import capacitor from "./prototyping/capacitor";
import diode from "./prototyping/diode";
import levelShifter from "./prototyping/level-shifter";
import resistor from "./prototyping/resistor";
import transistor from "./prototyping/transistor";
import hc05 from "./radios/hc-05";
import lora from "./radios/lora";
import nrf24l01 from "./radios/nrf24l01";
import rc522 from "./radios/rc522";
import wifiModule from "./radios/wifi-module";
import am2302 from "./sensors/am2302";
import bmp280 from "./sensors/bmp280";
import bno055 from "./sensors/bno055";
import dht11 from "./sensors/dht11";
import dht22 from "./sensors/dht22";
import ds18b20 from "./sensors/ds18b20";
import gy271 from "./sensors/gy-271";
import hcSr04 from "./sensors/hc-sr04";
import ina219 from "./sensors/ina219";
import irObstacle from "./sensors/ir-obstacle";
import ldr from "./sensors/ldr";
import lineArray from "./sensors/line-array";
import lineSensor from "./sensors/line-sensor";
import mpu6050 from "./sensors/mpu6050";
import mq2 from "./sensors/mq2";
import pir from "./sensors/pir";
import sharpIr from "./sensors/sharp-ir";
import soilMoisture from "./sensors/soil-moisture";
import soundSensor from "./sensors/sound-sensor";
import tcs34725 from "./sensors/tcs34725";
import vl53l0x from "./sensors/vl53l0x";
import wheelEncoder from "./sensors/wheel-encoder";

export const CATALOG: PartEntry[] = [
  arduinoMega,
  arduinoNano,
  arduinoUno,
  esp32,
  esp8266,
  microbit,
  raspberryPi4,
  raspberryPiPico,
  stm32,
  teensy,
  irReceiver,
  joystick,
  keypad,
  limitSwitch,
  potentiometer,
  pushButton,
  rotaryEncoder,
  slideSwitch,
  lcd16x2,
  max7219,
  oledSsd1306,
  tftDisplay,
  tm1637,
  a4988,
  drv8833,
  l293d,
  l298n,
  mosfetModule,
  pca9685,
  relay,
  tb6612fng,
  dcMotor,
  microGearMotor,
  nema17,
  servo,
  servoMg996r,
  stepperMotor,
  waterPump,
  buzzer,
  led,
  neopixelRing,
  neopixelStick,
  rgbLed,
  battery18650,
  battery4aa,
  battery9v,
  batteryCharger,
  boostConverter,
  breadboardPower,
  buckConverter,
  lipo2s,
  lipo3s,
  lipoBattery,
  breadboard,
  breadboardFull,
  breadboardMini,
  capacitor,
  diode,
  levelShifter,
  resistor,
  transistor,
  hc05,
  lora,
  nrf24l01,
  rc522,
  wifiModule,
  am2302,
  bmp280,
  bno055,
  dht11,
  dht22,
  ds18b20,
  gy271,
  hcSr04,
  ina219,
  irObstacle,
  ldr,
  lineArray,
  lineSensor,
  mpu6050,
  mq2,
  pir,
  sharpIr,
  soilMoisture,
  soundSensor,
  tcs34725,
  vl53l0x,
  wheelEncoder,
];
