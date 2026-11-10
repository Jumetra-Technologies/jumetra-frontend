/** Pieces the infrared sensor modules share: the blue board, the header labels and the specks of SMD round the LM393. */
import { MATERIAL, silk, smd, type Solid } from "../../sdk";

/** The blue soldermask of the cheap LM393 sensor modules. */
export const MODULE_BLUE = "#1f4fa8";

/** Silkscreen names standing above a header row, read upward, one per pin. */
export function headerLabels(xs: number[], y: number, labels: string[]): Solid[] {
  return labels.map((text, i) => silk(xs[i] + 0.3, y, text, 0.9, MATERIAL.silk, { rotate: -90 }));
}

/** The SMD resistors and capacitors every LM393 sensor board carries: pull-ups, LED resistors, the threshold divider. */
export function comparatorSpecks(spots: Array<[number, number, "r" | "c", "x" | "y"]>): Solid[] {
  return spots.flatMap(([x, y, kind, dir]) => smd(x, y, kind, dir));
}
