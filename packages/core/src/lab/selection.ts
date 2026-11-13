/**
 * Selection on the lab canvas has one owner: the lab. React Flow only tells
 * us what the user did (its "select" changes from clicks, Shift-clicks and
 * the pane), and the lab pushes the result back down as props.
 *
 * Don't listen to React Flow's onSelectionChange for this. It also fires
 * when our own props arrive, one render late, so the stale value it reports
 * overwrites the newer one, the newer one comes back round, and the two
 * alternate until React stops with "Maximum update depth exceeded". That's
 * the crash users saw when finishing a wire while a part was selected.
 */

export type Selection = { nodes: string[]; wire: string | null };
export type SelectChange = { type: string; id?: string; selected?: boolean };

/**
 * Apply React Flow's node and edge changes to the current selection.
 * Returns null if nothing about selection changed (so callers can skip
 * setting state).
 */
export function nextSelection(current: Selection, nodeChanges: readonly SelectChange[], edgeChanges: readonly SelectChange[] = []): Selection | null {
  const nodeSel = nodeChanges.filter((c) => c.type === "select" && c.id);
  const edgeSel = edgeChanges.filter((c) => c.type === "select" && c.id);
  if (!nodeSel.length && !edgeSel.length) return null;

  const ids = [...current.nodes];
  for (const c of nodeSel) {
    const at = ids.indexOf(c.id!);
    if (c.selected && at < 0) ids.push(c.id!);
    if (!c.selected && at >= 0) ids.splice(at, 1);
  }

  let wire = current.wire;
  for (const c of edgeSel) {
    if (c.selected) wire = c.id!;
    else if (wire === c.id) wire = null;
  }
  // A wire is inspected on its own; picking parts clears it.
  if (ids.length && nodeSel.some((c) => c.selected)) wire = null;
  if (wire && edgeSel.some((c) => c.selected)) ids.length = 0;

  const same = wire === current.wire && ids.length === current.nodes.length && ids.every((id, i) => id === current.nodes[i]);
  return same ? null : { nodes: ids, wire };
}

/** What the properties popover (B3) shows: one part, or one wire. */
export type PropertiesTarget = { kind: "node"; id: string } | { kind: "wire"; id: string };

/**
 * Whether a click on the canvas opens the properties popover, and for what.
 * Only a plain click does: Shift, Cmd or Ctrl add to a selection, and a click
 * that ends a drag (or a marquee) only moves or picks things.
 */
export function propertiesOnClick(click: { kind: "node" | "wire"; id: string; shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean; dragged?: boolean }): PropertiesTarget | null {
  if (click.dragged || click.shiftKey || click.metaKey || click.ctrlKey) return null;
  return { kind: click.kind, id: click.id };
}

/** Whether the popover's target is still what's selected; it closes when it isn't. */
export function propertiesShown(target: PropertiesTarget | null, selection: Selection): boolean {
  if (!target) return false;
  if (target.kind === "node") return selection.nodes.length === 1 && selection.nodes[0] === target.id;
  return !selection.nodes.length && selection.wire === target.id;
}

type Rect = { left: number; top: number; right: number; bottom: number };

/**
 * Where the popover goes: beside its anchor, on the right if it fits and
 * flipped to the left if it doesn't (then whichever side has more room), its
 * top level with the anchor's and kept inside the bounds.
 */
export function placePopover(anchor: Rect, size: { width: number; height: number }, bounds: Rect, gap = 12): { left: number; top: number; side: "right" | "left" } {
  const roomRight = bounds.right - anchor.right - gap;
  const roomLeft = anchor.left - bounds.left - gap;
  const side = roomRight >= size.width || roomRight >= roomLeft ? "right" : "left";
  const rawLeft = side === "right" ? anchor.right + gap : anchor.left - gap - size.width;
  const left = Math.max(bounds.left + 8, Math.min(rawLeft, bounds.right - size.width - 8));
  const top = Math.max(bounds.top + 8, Math.min(anchor.top, bounds.bottom - size.height - 8));
  return { left: Math.round(left), top: Math.round(top), side };
}
