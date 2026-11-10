/**
 * Every part in the library, one file each.
 *
 * Written by `npm run parts:index` from the files in this folder: do not edit
 * it by hand. To add a part, write `catalog/<group>/<id>.ts` (see
 * docs/parts/AUTHORING.md) and run the script.
 */
import type { PartEntry } from "../define";
import a4988 from "./drivers/a4988";
import drv8833 from "./drivers/drv8833";
import l293d from "./drivers/l293d";
import l298n from "./drivers/l298n";
import tb6612fng from "./drivers/tb6612fng";
import microGearMotor from "./motors/micro-gear-motor";
import nema17 from "./motors/nema17";
import servoMg996r from "./motors/servo-mg996r";
import waterPump from "./motors/water-pump";
import battery18650 from "./power/battery-18650";
import battery4aa from "./power/battery-4aa";
import battery9v from "./power/battery-9v";
import lipo2s from "./power/lipo-2s";
import lipoBattery from "./power/lipo-battery";
import breadboard from "./prototyping/breadboard";
import breadboardFull from "./prototyping/breadboard-full";
import breadboardMini from "./prototyping/breadboard-mini";
import resistor from "./prototyping/resistor";
import hcSr04 from "./sensors/hc-sr04";

export const CATALOG: PartEntry[] = [
  a4988,
  drv8833,
  l293d,
  l298n,
  tb6612fng,
  microGearMotor,
  nema17,
  servoMg996r,
  waterPump,
  battery18650,
  battery4aa,
  battery9v,
  lipo2s,
  lipoBattery,
  breadboard,
  breadboardFull,
  breadboardMini,
  resistor,
  hcSr04,
];
