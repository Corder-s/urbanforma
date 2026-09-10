import * as THREE from "three";
import type { Bounds, Point } from "../../types/visualization.types";

/**
 * Coordinate bridge between the map model (x east, y south, metres) and the
 * Three.js scene (x east, y up, z south). Every mesh module goes through
 * these helpers so the convention lives in exactly one place.
 */
export function toScene(p: Point, elevation = 0): THREE.Vector3 {
  return new THREE.Vector3(p.x, elevation, p.y);
}

export function boundsCenter(b: Bounds): THREE.Vector3 {
  return new THREE.Vector3(b.x + b.width / 2, 0, b.y + b.height / 2);
}

/**
 * Triangulated flat polygon shape from map points. Map y is negated so that
 * after `rotateX(-π/2)` the plate faces up (+y) and map south lands on +z.
 */
export function polygonShape(points: Point[]): THREE.Shape {
  const shape = new THREE.Shape();
  points.forEach((p, i) => (i === 0 ? shape.moveTo(p.x, -p.y) : shape.lineTo(p.x, -p.y)));
  shape.closePath();
  return shape;
}

/** Geometry for a flat polygon lying on the ground, normal pointing up. */
export function flatPolygonGeometry(points: Point[]): THREE.BufferGeometry {
  const geo = new THREE.ShapeGeometry(polygonShape(points));
  geo.rotateX(-Math.PI / 2); // (x, -y, 0) → (x, 0, y); normal (0,0,1) → (0,1,0)
  return geo;
}

/** A ribbon (strip) along a polyline, for roads/paths lying on the ground. */
export function ribbonGeometry(points: Point[], width: number): THREE.BufferGeometry {
  if (points.length < 2) return new THREE.BufferGeometry();
  const half = width / 2;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    left.push({ x: points[i].x + nx * half, y: points[i].y + ny * half });
    right.push({ x: points[i].x - nx * half, y: points[i].y - ny * half });
  }
  const verts: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < points.length; i++) {
    verts.push(left[i].x, 0, left[i].y, right[i].x, 0, right[i].y);
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if ((mesh as THREE.InstancedMesh).isInstancedMesh) (mesh as THREE.InstancedMesh).dispose();
    if (mesh.geometry) mesh.geometry.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const m of mats) {
      const map = (m as THREE.MeshBasicMaterial).map;
      if (map) map.dispose();
      m.dispose();
    }
  });
}
