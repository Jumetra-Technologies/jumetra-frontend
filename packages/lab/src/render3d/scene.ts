/**
 * A part model as a three.js object: every solid as a mesh with a physically
 * based material, printed layers as textures, and handles on what lights up,
 * spins or sweeps when the part is powered.
 *
 * World axes: x is the model's x, y is the model's y flipped (models count y
 * down the page), z is up out of the board. Units are millimeters.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { flattenPath } from "@kiungo/core/parts/path";
import type { PartModel, Solid } from "@kiungo/core/parts/types";
import { baseColor, finishOf, materialFor, metalOf } from "./materials";
import { boxTopTexture, flatLayers, glowSprite, layerTexture } from "./surface";

export interface PartObject {
  root: THREE.Group;
  /** Solid id → the meshes and glow sprites to switch on when it's lit. */
  lights: Map<string, { meshes: THREE.Mesh[]; glows: THREE.Sprite[]; color: string; finish: ReturnType<typeof finishOf>; base: string }>;
  /** Solids that turn (motor shafts, fans) or sweep back and forth (servo horns), about their own center. */
  spin: THREE.Object3D[];
  sweep: THREE.Object3D[];
  /** Everything disposable. */
  dispose(): void;
}

/** Height of the main board's top face: where flat printing without its own z sits. */
export function surfaceHeight(model: PartModel): number {
  const board = model.solids.find((solid) => (solid.kind === "box" || solid.kind === "extrude") && solid.id === "pcb");
  return board && (board.kind === "box" || board.kind === "extrude") ? (board.z ?? 0) + board.d : 0;
}

function keep<T extends THREE.BufferGeometry>(g: T, list: THREE.BufferGeometry[]): T {
  list.push(g);
  return g;
}

/** A pivot at a point, so a child turns about that point. */
function pivotAt(x: number, y: number, z: number): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(x, -y, z);
  return pivot;
}

export function buildPart(model: PartModel): PartObject {
  const root = new THREE.Group();
  const owned: THREE.BufferGeometry[] = [];
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];
  const lights: PartObject["lights"] = new Map();
  const spinIds = new Set(model.animate?.spin ?? []);
  const sweepIds = new Set(model.animate?.sweep ?? []);
  const spin: THREE.Object3D[] = [];
  const sweep: THREE.Object3D[] = [];

  const noteLight = (solid: Extract<Solid, { kind: "box" | "cyl" | "dome" | "extrude" }>, mesh: THREE.Mesh, at: THREE.Vector3, size: number) => {
    if (!solid.id || !solid.glow) return;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: new THREE.Color(solid.glow), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    materials.push(sprite.material);
    sprite.scale.setScalar(Math.max(3, size * 2.6));
    sprite.position.copy(at);
    sprite.visible = false;
    sprite.renderOrder = 10;
    root.add(sprite);
    const entry = lights.get(solid.id) ?? { meshes: [], glows: [], color: solid.glow, finish: finishOf(solid), base: baseColor(solid) };
    entry.meshes.push(mesh);
    entry.glows.push(sprite);
    lights.set(solid.id, entry);
  };

  // With a shared axis, everything that moves hangs off one pivot per motion.
  const axis = model.animate?.axis;
  const shared: { spin?: THREE.Group; sweep?: THREE.Group } = {};
  const sharedPivot = (motion: "spin" | "sweep"): THREE.Group => {
    let pivot = shared[motion];
    if (!pivot) {
      pivot = new THREE.Group();
      pivot.position.set(axis!.at[0], -axis!.at[1], axis!.at[2]);
      pivot.userData.axis = axis!.dir;
      root.add(pivot);
      (motion === "spin" ? spin : sweep).push(pivot);
      shared[motion] = pivot;
    }
    return pivot;
  };
  /** Adds an object to the scene: on a pivot if it moves, straight onto the part if it doesn't. */
  const attach = (solid: Solid, object: THREE.Object3D, center: { x: number; y: number; z: number }) => {
    const id = "id" in solid ? solid.id : undefined;
    if (id && (spinIds.has(id) || sweepIds.has(id))) {
      const motion = spinIds.has(id) ? "spin" : "sweep";
      if (axis) {
        const pivot = sharedPivot(motion);
        object.position.sub(pivot.position);
        pivot.add(object);
        return;
      }
      const pivot = pivotAt(center.x, center.y, 0);
      object.position.sub(pivot.position);
      pivot.add(object);
      root.add(pivot);
      (motion === "spin" ? spin : sweep).push(pivot);
    } else root.add(object);
  };

  for (const solid of model.solids) {
    if (solid.kind === "box") {
      const z = solid.z ?? 0;
      const r = Math.max(0.01, Math.min(solid.radius ?? 0.3, solid.w / 2 - 0.01, solid.h / 2 - 0.01, solid.d / 2 - 0.01));
      const geometry = keep(new RoundedBoxGeometry(solid.w, solid.h, solid.d, r > 0.2 ? 3 : 1, r), owned);
      const finish = finishOf(solid);
      const mesh = new THREE.Mesh(geometry, materialFor(finish, baseColor(solid)));
      mesh.castShadow = solid.d > 0.4;
      mesh.receiveShadow = true;
      const cx = solid.x + solid.w / 2;
      const cy = solid.y + solid.h / 2;
      // The group sits at the box's center, so a turned box turns about itself.
      mesh.position.set(0, 0, z + solid.d / 2);
      const group = new THREE.Group();
      group.position.set(cx, -cy, 0);
      if (solid.turn) group.rotation.z = (-solid.turn * Math.PI) / 180;
      group.add(mesh);
      const decal = boxTopTexture(solid);
      if (decal) {
        textures.push(decal);
        // Printing never hides what is drawn after it: without depthWrite off, a see-through layer above would blank this label from some angles.
        const material = new THREE.MeshStandardMaterial({ map: decal, transparent: true, depthWrite: false, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
        materials.push(material);
        const plane = new THREE.Mesh(keep(new THREE.PlaneGeometry(solid.w - r * 0.6, solid.h - r * 0.6), owned), material);
        plane.position.set(0, 0, z + solid.d + 0.005);
        plane.receiveShadow = true;
        group.add(plane);
      }
      attach(solid, group, { x: cx, y: cy, z });
      noteLight(solid, mesh, new THREE.Vector3(cx, -cy, z + solid.d + 0.2), Math.max(solid.w, solid.h));
    } else if (solid.kind === "cyl") {
      const z = solid.z ?? 0;
      const segments = solid.segments && solid.segments <= 8 ? solid.segments : 40;
      const axis = solid.axis ?? "z";
      const geometry = keep(new THREE.CylinderGeometry(solid.r2 ?? solid.r, solid.r, solid.d, segments, 1, false), owned);
      // The geometry stands along y with `r2` at its far end; turn it so that end
      // points up (z), towards +x, or towards the model's +y (the world's -y).
      if (axis === "z") geometry.rotateX(Math.PI / 2);
      else if (axis === "x") geometry.rotateZ(-Math.PI / 2);
      else geometry.rotateX(Math.PI);
      const mesh = new THREE.Mesh(geometry, materialFor(finishOf(solid), baseColor(solid)));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (axis === "z") mesh.position.set(solid.cx, -solid.cy, z + solid.d / 2);
      else mesh.position.set(solid.cx, -solid.cy, z + Math.max(solid.r, solid.r2 ?? solid.r));
      attach(solid, mesh, { x: solid.cx, y: solid.cy, z });
      noteLight(solid, mesh, new THREE.Vector3(solid.cx, -solid.cy, z + (axis === "z" ? solid.d : solid.r * 2)), solid.r * 2);
    } else if (solid.kind === "dome") {
      const z = solid.z ?? 0;
      const geometry = keep(new THREE.SphereGeometry(solid.r, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), owned);
      geometry.rotateX(Math.PI / 2);
      geometry.scale(1, 1, solid.d / solid.r);
      const finish = finishOf(solid);
      const mesh = new THREE.Mesh(geometry, materialFor(finish, solid.color));
      mesh.castShadow = true;
      mesh.position.set(solid.cx, -solid.cy, z);
      attach(solid, mesh, { x: solid.cx, y: solid.cy, z });
      noteLight(solid, mesh, new THREE.Vector3(solid.cx, -solid.cy, z + solid.d * 0.6), solid.r * 2);
    } else if (solid.kind === "pins") {
      const rows = solid.rows ?? 1;
      const size = solid.size ?? 0.64;
      const len = Math.abs(solid.len);
      if (len <= 0) continue;
      const geometry = keep(new THREE.BoxGeometry(size, size, len), owned);
      // A chamfered tip reads as a pin, not a stick: taper the far end slightly.
      const mesh = new THREE.InstancedMesh(geometry, materialFor(finishOf(solid), baseColor(solid)), solid.count * rows);
      mesh.castShadow = true;
      const m = new THREE.Matrix4();
      const zc = (solid.z ?? 0) + solid.len / 2;
      let n = 0;
      for (let rr = 0; rr < rows; rr++) {
        for (let i = 0; i < solid.count; i++) {
          const along = (i + 0.5) * solid.pitch;
          const across = (rr + 0.5) * solid.pitch;
          const px = solid.dir === "x" ? solid.x + along : solid.x + across;
          const py = solid.dir === "x" ? solid.y + across : solid.y + along;
          m.makeTranslation(px, -py, zc);
          mesh.setMatrixAt(n++, m);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      root.add(mesh);
    } else if (solid.kind === "extrude") {
      const [outline, ...holes] = flattenPath(solid.path);
      if (!outline || outline.length < 3) continue;
      const z = solid.z ?? 0;
      const toShape = <T extends THREE.Path>(target: T, points: typeof outline): T => {
        points.forEach((p, i) => (i === 0 ? target.moveTo(p.x, -p.y) : target.lineTo(p.x, -p.y)));
        target.closePath();
        return target;
      };
      const shape = toShape(new THREE.Shape(), outline);
      for (const hole of holes) if (hole.length >= 3) shape.holes.push(toShape(new THREE.Path(), hole));
      // A bevel rounds the top and bottom edges without growing the outline or the height.
      const bevel = Math.max(0, Math.min(solid.bevel ?? 0, solid.d / 2 - 0.01));
      const geometry = keep(
        new THREE.ExtrudeGeometry(shape, { depth: solid.d - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 2, curveSegments: 1, steps: 1 }),
        owned,
      );
      geometry.translate(0, 0, bevel);
      const mesh = new THREE.Mesh(geometry, materialFor(finishOf(solid), baseColor(solid)));
      mesh.castShadow = solid.d > 0.4;
      mesh.receiveShadow = true;
      mesh.position.set(0, 0, z);
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      const mx = (box.min.x + box.max.x) / 2;
      const my = (box.min.y + box.max.y) / 2;
      // A moving outline turns about the shared axis, or about its own middle.
      attach(solid, mesh, { x: mx, y: -my, z });
      noteLight(solid, mesh, new THREE.Vector3(mx, my, z + solid.d + 0.2), Math.max(box.max.x - box.min.x, box.max.y - box.min.y));
    } else if (solid.kind === "wire") {
      if (solid.points.length < 2) continue;
      const points = solid.points.map(([x, y, z]) => new THREE.Vector3(x, -y, z));
      const curve = points.length === 2 ? new THREE.LineCurve3(points[0], points[1]) : new THREE.CatmullRomCurve3(points, false, "centripetal");
      const geometry = keep(new THREE.TubeGeometry(curve, Math.max(6, (points.length - 1) * 10), solid.r, 10, false), owned);
      const mesh = new THREE.Mesh(geometry, materialFor(finishOf(solid), baseColor(solid)));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
      // Round ends, so a cut lead doesn't show a hollow tube.
      const cap = keep(new THREE.SphereGeometry(solid.r, 10, 8), owned);
      for (const end of [points[0], points[points.length - 1]]) {
        const ball = new THREE.Mesh(cap, mesh.material);
        ball.position.copy(end);
        root.add(ball);
      }
    }
  }

  // Printed layers: silkscreen, traces, pads. Metal pads (gold, tin) are thin
  // plated discs that catch the light; everything else prints into a texture.
  const surface = surfaceHeight(model);
  const disc = (cx: number, cy: number, r: number, z: number, color: string, h: number) => {
    const metal = metalOf(color);
    const geometry = keep(new THREE.CylinderGeometry(r, r, h, 28), owned);
    geometry.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, materialFor(metal ?? "soldermask", color));
    mesh.position.set(cx, -cy, z + h / 2);
    mesh.receiveShadow = true;
    root.add(mesh);
  };
  const ring = (cx: number, cy: number, inner: number, outer: number, z: number, color: string) => {
    const geometry = keep(new THREE.RingGeometry(inner, outer, 32), owned);
    const mesh = new THREE.Mesh(geometry, materialFor(metalOf(color) ?? "soldermask", color));
    mesh.position.set(cx, -cy, z + 0.02);
    mesh.receiveShadow = true;
    root.add(mesh);
  };
  for (const [z, layer] of flatLayers(model, surface)) {
    const flats = layer.filter((f) => {
      if (f.kind !== "disc") return true;
      if (f.hole) {
        // Drilled through: the plating round it, and nothing over the hole.
        if (f.ring) ring(f.cx, f.cy, f.r, f.r + f.ring.width, z, f.ring.color);
        return false;
      }
      const ringMetal = f.ring && metalOf(f.ring.color);
      if (!metalOf(f.color) && !ringMetal) return true;
      if (f.ring) disc(f.cx, f.cy, f.r + f.ring.width, z, f.ring.color, 0.035);
      disc(f.cx, f.cy, f.r, z, f.color, f.ring ? 0.045 : 0.035);
      return false;
    });
    if (!flats.length) continue;
    const { texture, x, y, w, h } = layerTexture(model, flats);
    textures.push(texture);
    const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, depthWrite: false, roughness: 0.6, metalness: 0, polygonOffset: true, polygonOffsetFactor: -4 });
    materials.push(material);
    const plane = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, h), owned), material);
    plane.position.set(x + w / 2, -(y + h / 2), z + 0.004);
    plane.receiveShadow = true;
    root.add(plane);
  }

  return {
    root,
    lights,
    spin,
    sweep,
    dispose() {
      owned.forEach((g) => g.dispose());
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

/** Light the given solids (and only those), as a powered part shows them. */
export function setLit(part: PartObject, lit: ReadonlySet<string>): void {
  for (const [id, entry] of part.lights) {
    const on = lit.has(id);
    for (const mesh of entry.meshes) mesh.material = materialFor(entry.finish, entry.base, { emissive: entry.color, lit: on });
    for (const glow of entry.glows) glow.visible = on;
  }
}

/** Pose the moving parts at a moment, in seconds. */
export function setMotion(part: PartObject, powered: boolean, time: number): void {
  const turn = (pivot: THREE.Object3D, angle: number) => {
    const dir = (pivot.userData.axis as "x" | "y" | "z" | undefined) ?? "z";
    pivot.rotation.set(dir === "x" ? angle : 0, dir === "y" ? angle : 0, dir === "z" ? angle : 0);
  };
  for (const p of part.spin) turn(p, powered ? -time * Math.PI * 1.2 : 0);
  for (const p of part.sweep) turn(p, powered ? Math.sin(time * 1.6) * (Math.PI / 3) : 0);
}

