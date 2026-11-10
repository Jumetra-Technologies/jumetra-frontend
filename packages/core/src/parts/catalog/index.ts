/**
 * Every part in the library, one file each.
 *
 * To add a part: write `catalog/<group>/<id>.ts` (see docs/parts/AUTHORING.md),
 * import it here and add it to the list. `npm run parts:check` and the test
 * suite fail if a file under `catalog/` is not listed.
 */
import type { PartEntry } from "../define";
import l298n from "./drivers/l298n";
import hcSr04 from "./sensors/hc-sr04";

export const CATALOG: PartEntry[] = [hcSr04, l298n];
