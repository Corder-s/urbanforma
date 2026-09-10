import * as THREE from "three";
import { EXISTING_STYLE, LAND_USE_STYLE } from "../../data/visualization.data";
import { heightRamp } from "../../lib/lighting";
import type { BuildingObject, BuildingStyle, ContextBuildingObject, LandUse } from "../../types/visualization.types";

/**
 * Buildings as extruded boxes, batched per material with InstancedMesh so a
 * whole city is a handful of draw calls. Picking uses instanceId → object id.
 */
export interface BuildingBatch {
  group: THREE.Group;
  /** Resolve a raycast hit to a building id. */
  resolve: (mesh: THREE.Object3D, instanceId: number | undefined) => string | null;
  /** Set (or clear) the highlighted building. */
  highlight: (id: string | null) => void;
  /** Re-colour buildings per id (analysis overlays); null restores the land-use palette. */
  tint: (colors: Map<string, THREE.Color> | null) => void;
}

interface Slot {
  mesh: THREE.InstancedMesh;
  index: number;
  matrix: THREE.Matrix4;
}

const unit = new THREE.BoxGeometry(1, 1, 1);
unit.translate(0, 0.5, 0); // pivot at the base

function buildMatrix(cx: number, cz: number, w: number, d: number, h: number, rotationDeg = 0): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (-rotationDeg * Math.PI) / 180);
  m.compose(new THREE.Vector3(cx, 0, cz), q, new THREE.Vector3(w, h, d));
  return m;
}

export interface BuildingBuildOptions {
  heights: boolean;
  shadows: boolean;
  /** Building appearance (Step 15): simple massing, architectural detail, height ramp or land-use colours. */
  style?: BuildingStyle;
  /** Multiplier on building heights ("Building Height Emphasis"). */
  heightScale?: number;
}

const SIMPLE_HEX = 0xe9eef5;
const FLOOR_M = 3.2;

export function buildBuildings(buildings: BuildingObject[], context: ContextBuildingObject[], opts: BuildingBuildOptions): BuildingBatch {
  const group = new THREE.Group();
  group.name = "buildings";
  const slots = new Map<string, Slot>();
  const style = opts.style ?? "land-use";
  const heightScale = opts.heights ? opts.heightScale ?? 1 : 1;
  const heightOf = (b: BuildingObject) => (opts.heights ? Math.max(3, b.properties.height) * heightScale : 3);
  const styleColors: Map<string, THREE.Color> | null = style === "height" ? new Map(buildings.map((b) => [b.id, new THREE.Color(heightRamp(b.properties.floors))])) : null;

  // --- planned buildings, batched by land use (or "existing") --------------------------
  const byKey = new Map<string, BuildingObject[]>();
  for (const b of buildings) {
    const key = b.properties.status === "Existing" ? "existing" : b.properties.landUse;
    const arr = byKey.get(key) ?? [];
    arr.push(b);
    byKey.set(key, arr);
  }
  for (const [key, list] of byKey) {
    const landUseHex = key === "existing" ? EXISTING_STYLE.hex : LAND_USE_STYLE[key as LandUse].hex;
    // simple = neutral massing; architectural = softened category colour; height = white (ramp via instance colours); land-use = palette
    const hex = style === "simple" ? SIMPLE_HEX : style === "architectural" ? new THREE.Color(landUseHex).lerp(new THREE.Color(0xffffff), 0.4).getHex() : landUseHex;
    const mat = new THREE.MeshLambertMaterial({ color: hex });
    const mesh = new THREE.InstancedMesh(unit, mat, list.length);
    mesh.castShadow = opts.shadows;
    mesh.receiveShadow = opts.shadows;
    mesh.name = `buildings:${key}`;
    mesh.userData.baseHex = hex;
    list.forEach((b, i) => {
      const g = b.geometry;
      const h = heightOf(b);
      const m = buildMatrix(g.center.x, g.center.y, Math.max(2, g.width), Math.max(2, g.depth), h, g.rotation);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, new THREE.Color(0xffffff));
      slots.set(b.id, { mesh, index: i, matrix: m });
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  }

  // --- architectural detail: floor bands + roof parapets (one instanced draw call each) -------------
  if (style === "architectural" && buildings.length > 0 && opts.heights) {
    let bands = 0;
    for (const b of buildings) bands += Math.max(0, Math.floor(heightOf(b) / (FLOOR_M * heightScale)) - 1);
    if (bands > 0) {
      const bandMesh = new THREE.InstancedMesh(unit, new THREE.MeshLambertMaterial({ color: 0xb9c6d8 }), bands);
      bandMesh.name = "building-detail";
      bandMesh.castShadow = false;
      bandMesh.receiveShadow = false;
      let i = 0;
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const step = FLOOR_M * heightScale;
      for (const b of buildings) {
        const g = b.geometry;
        const h = heightOf(b);
        const floors = Math.floor(h / step);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (-(g.rotation ?? 0) * Math.PI) / 180);
        for (let f = 1; f < floors; f++) {
          m.compose(new THREE.Vector3(g.center.x, f * step - 0.12, g.center.y), q, new THREE.Vector3(Math.max(2, g.width) + 0.5, 0.24, Math.max(2, g.depth) + 0.5));
          bandMesh.setMatrixAt(i++, m);
        }
      }
      bandMesh.count = i;
      bandMesh.instanceMatrix.needsUpdate = true;
      group.add(bandMesh);
    }
    const roofs = new THREE.InstancedMesh(unit, new THREE.MeshLambertMaterial({ color: 0xcfd8e6 }), buildings.length);
    roofs.name = "building-detail";
    roofs.castShadow = false;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    buildings.forEach((b, i) => {
      const g = b.geometry;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (-(g.rotation ?? 0) * Math.PI) / 180);
      m.compose(new THREE.Vector3(g.center.x, heightOf(b), g.center.y), q, new THREE.Vector3(Math.max(2, g.width) * 0.6, 0.9, Math.max(2, g.depth) * 0.6));
      roofs.setMatrixAt(i, m);
    });
    roofs.instanceMatrix.needsUpdate = true;
    group.add(roofs);
  }

  // --- context (surrounding) buildings ------------------------------------------------------
  if (context.length > 0) {
    const mesh = new THREE.InstancedMesh(unit, new THREE.MeshLambertMaterial({ color: 0xdfe5ee, transparent: true, opacity: 0.85 }), context.length);
    mesh.name = "context-buildings";
    mesh.castShadow = false;
    mesh.receiveShadow = opts.shadows;
    context.forEach((c, i) => {
      const g = c.geometry;
      mesh.setMatrixAt(i, buildMatrix(g.center.x, g.center.y, g.width, g.depth, opts.heights ? c.properties.height * heightScale : 3));
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }

  // --- selection outline ---------------------------------------------------------------------
  const outlineMat = new THREE.LineBasicMaterial({ color: 0x1d4ed8 });
  const edges = new THREE.EdgesGeometry(unit);
  const outline = new THREE.LineSegments(edges, outlineMat);
  outline.visible = false;
  outline.name = "selection-outline";
  group.add(outline);
  const glow = new THREE.Mesh(unit, new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.18, depthWrite: false }));
  glow.visible = false;
  group.add(glow);

  let highlighted: string | null = null;
  const white = new THREE.Color(0xffffff);
  const highlightTint = new THREE.Color(0xbfd3ff);
  /** Per-building base colour (white = material colour; analysis overlays replace it). */
  let baseColors: Map<string, THREE.Color> | null = null;
  const baseOf = (id: string) => baseColors?.get(id) ?? white;

  const highlight = (id: string | null) => {
    if (highlighted) {
      const prev = slots.get(highlighted);
      if (prev) {
        prev.mesh.setColorAt(prev.index, baseOf(highlighted));
        if (prev.mesh.instanceColor) prev.mesh.instanceColor.needsUpdate = true;
      }
    }
    highlighted = id;
    const slot = id ? slots.get(id) : undefined;
    if (!id || !slot) {
      outline.visible = false;
      glow.visible = false;
      return;
    }
    slot.mesh.setColorAt(slot.index, baseColors ? baseOf(id).clone().lerp(white, 0.45) : highlightTint);
    if (slot.mesh.instanceColor) slot.mesh.instanceColor.needsUpdate = true;
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    slot.matrix.decompose(pos, quat, scl);
    outline.position.copy(pos);
    outline.quaternion.copy(quat);
    outline.scale.set(scl.x + 1.2, scl.y + 0.6, scl.z + 1.2);
    outline.visible = true;
    glow.position.copy(pos);
    glow.quaternion.copy(quat);
    glow.scale.set(scl.x + 3, scl.y + 1.5, scl.z + 3);
    glow.visible = true;
  };

  const ids = new Map<THREE.Object3D, string[]>();
  for (const [id, slot] of slots) {
    const arr = ids.get(slot.mesh) ?? [];
    arr[slot.index] = id;
    ids.set(slot.mesh, arr);
  }
  const resolve = (mesh: THREE.Object3D, instanceId: number | undefined) => {
    if (instanceId === undefined) return null;
    return ids.get(mesh)?.[instanceId] ?? null;
  };

  const tint = (overlay: Map<string, THREE.Color> | null) => {
    const colors = overlay ?? styleColors;
    baseColors = colors;
    const touched = new Set<THREE.InstancedMesh>();
    for (const [id, slot] of slots) {
      const wantsMaterial = !colors; // no overlay → the land-use material colour shows through
      // Tinted overlays multiply the material colour, so use a white material colour instead.
      slot.mesh.setColorAt(slot.index, id === highlighted ? (colors ? baseOf(id).clone().lerp(white, 0.45) : highlightTint) : baseOf(id));
      touched.add(slot.mesh);
      const mat = slot.mesh.material as THREE.MeshLambertMaterial;
      const target = wantsMaterial ? (slot.mesh.userData.baseHex as number) : 0xffffff;
      if (mat.color.getHex() !== target) mat.color.setHex(target);
    }
    for (const m of touched) if (m.instanceColor) m.instanceColor.needsUpdate = true;
  };

  if (styleColors) tint(null); // height ramp via instance colours
  return { group, resolve, highlight, tint };
}
