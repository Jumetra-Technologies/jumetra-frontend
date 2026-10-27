/**
 * "Try it in the Engineering Lab": open a new lab session with the board and
 * the parts a firmware starter drives, wired up, so Run shows the starter
 * working. The lab runs its own built-in version of the starter, not the
 * code in the editor (see docs/firmware.md).
 */

import { planAutoWire, placeNode } from "@kiungo/core/lab/autowire";
import { flushLab, useLab } from "@/lib/lab/store";
import { getPart } from "@kiungo/core/parts";
import { labBuildFor } from "./boards";

export function openStarterInLab(projectName: string, boardId: string, templateId: string): string {
  const lab = useLab.getState();
  if (!lab.hydrated) lab.hydrate();
  const { board, parts } = labBuildFor(boardId, templateId);
  const session = useLab.getState().createSession({ name: `${projectName} (from Firmware)` });
  const boardNode = useLab.getState().addNode(board, { x: 80, y: 80 });
  const current = () => useLab.getState().sessions.find((s) => s.id === session.id)!;
  for (const partId of parts) {
    if (!getPart(partId)) continue;
    const node = useLab.getState().addNode(partId, placeNode(partId, current().nodes, boardNode));
    if (!node) continue;
    const plan = planAutoWire(node, current().nodes, current().wires);
    if (plan.board && plan.wires.length) useLab.getState().addWires(plan.wires, `Auto-wired ${node.label} to ${plan.board.label}`, plan.remove);
  }
  useLab.getState().log("note", `Opened from the Firmware page: the “${templateId}” starter. The lab runs its built-in version of this starter, not the code in the editor.`);
  flushLab();
  return session.id;
}
