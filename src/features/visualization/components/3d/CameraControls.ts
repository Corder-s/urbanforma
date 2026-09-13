import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Bounds, CameraPreset } from "../../types/visualization.types";
import { boundsCenter } from "./sceneMath";

/**
 * Orbit / pan / zoom with smooth transitions to presets. Wraps OrbitControls
 * so the React layer only speaks in presets and targets.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  private site: Bounds;
  private tween: { from: THREE.Vector3; to: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3; start: number; duration: number } | null = null;
  private reducedMotion: boolean;
  private lastNow: number | null = null;
  /** 0–100 relative elevation preference from the settings drawer. */
  heightBias = 55;

  constructor(dom: HTMLElement, site: Bounds, reducedMotion: boolean, keyTarget?: HTMLElement) {
    this.site = site;
    this.reducedMotion = reducedMotion;
    this.camera = new THREE.PerspectiveCamera(45, 1, 1, 20000);
    this.controls = new OrbitControls(this.camera, dom);
    // Arrow keys pan (Shift/Ctrl + arrows orbit) when the focusable host has focus.
    if (keyTarget) {
      this.controls.keyPanSpeed = 14;
      this.controls.listenToKeyEvents(keyTarget);
    }
    this.controls.enableDamping = !reducedMotion;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = false;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.minDistance = 20;
    this.controls.maxDistance = Math.max(site.width, site.height) * 6;
    this.controls.zoomSpeed = 0.8;
    this.controls.rotateSpeed = 0.6;
    this.controls.panSpeed = 0.7;
    this.controls.target.copy(boundsCenter(site));
    this.applyPreset("perspective", true);
  }

  setSite(site: Bounds) {
    this.site = site;
    this.controls.maxDistance = Math.max(site.width, site.height) * 6;
  }

  setReducedMotion(v: boolean) {
    this.reducedMotion = v;
    this.controls.enableDamping = !v;
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  /** Distance needed to frame the site diagonal. */
  private frameDistance(bounds: Bounds, padding = 1.15, floor = 40): number {
    const diag = Math.hypot(bounds.width, bounds.height);
    const fov = (this.camera.fov * Math.PI) / 180;
    const aspect = this.camera.aspect;
    const vertical = (diag * padding) / 2 / Math.tan(fov / 2);
    const horizontal = vertical / Math.min(1, aspect);
    return Math.max(vertical, horizontal, floor);
  }

  applyPreset(preset: CameraPreset, immediate = false, bounds: Bounds = this.site) {
    const target = boundsCenter(bounds);
    const d = this.frameDistance(bounds);
    let pos: THREE.Vector3;
    switch (preset) {
      case "top":
        pos = new THREE.Vector3(target.x, d * 1.05, target.z + 0.01);
        break;
      case "overview": {
        // whole site from the south-west, medium elevation
        const horiz = d * 0.9;
        pos = new THREE.Vector3(target.x - horiz * 0.7, d * 0.62, target.z + horiz * 0.72);
        break;
      }
      case "birds-eye": {
        // high oblique from the north-east
        const horiz = d * 0.55;
        pos = new THREE.Vector3(target.x + horiz * 0.7, d * 1.0, target.z - horiz * 0.7);
        break;
      }
      case "street": {
        // eye level (~2 m) just inside the southern edge, looking north into the site
        const eye = new THREE.Vector3(bounds.x + bounds.width * 0.5, 4, bounds.y + bounds.height + 18);
        const look = new THREE.Vector3(bounds.x + bounds.width * 0.5, 1.5, bounds.y + bounds.height * 0.55);
        this.flyTo(eye, look, immediate);
        return;
      }
      case "site-entrance": {
        // arriving from the south: low oblique on the entrance edge
        const span = Math.max(bounds.width, bounds.height);
        const eye = new THREE.Vector3(bounds.x + bounds.width * 0.5 - span * 0.12, span * 0.16, bounds.y + bounds.height + span * 0.42);
        const look = new THREE.Vector3(bounds.x + bounds.width * 0.5, 0, bounds.y + bounds.height * 0.72);
        this.flyTo(eye, look, immediate);
        return;
      }
      case "central-district": {
        // framed tight on the centre of the site
        const inner: Bounds = { x: bounds.x + bounds.width * 0.3, y: bounds.y + bounds.height * 0.3, width: bounds.width * 0.4, height: bounds.height * 0.4 };
        const c = boundsCenter(inner);
        const di = this.frameDistance(inner, 1.3);
        this.flyTo(new THREE.Vector3(c.x - di * 0.5, di * 0.55, c.z + di * 0.6), c, immediate);
        return;
      }
      case "fit":
      case "reset":
      case "perspective":
      default: {
        // elevation from heightBias: 0 → low oblique, 100 → high oblique
        const elev = THREE.MathUtils.lerp(0.28, 1.05, this.heightBias / 100);
        const horiz = d * 0.85;
        pos = new THREE.Vector3(target.x - horiz * 0.62, d * elev * 0.75, target.z + horiz * 0.78);
        break;
      }
    }
    this.flyTo(pos, target, immediate);
  }

  /** Exact pose (saved views / slides). */
  setPose(position: [number, number, number], target: [number, number, number], immediate: boolean) {
    this.flyTo(new THREE.Vector3(...position), new THREE.Vector3(...target), immediate);
  }

  /** Current pose (published to the state so views can be saved). */
  getPose(): { position: [number, number, number]; target: [number, number, number] } {
    const p = this.camera.position;
    const t = this.controls.target;
    return { position: [round(p.x), round(p.y), round(p.z)], target: [round(t.x), round(t.y), round(t.z)] };
  }

  /** Frame an object's bounds (used by search / focus). */
  focusBounds(bounds: Bounds) {
    const padded: Bounds = { x: bounds.x - 40, y: bounds.y - 40, width: bounds.width + 80, height: bounds.height + 80 };
    const target = boundsCenter(padded);
    const d = this.frameDistance(padded, 1.6);
    const dir = this.camera.position.clone().sub(this.controls.target);
    if (dir.lengthSq() < 1) dir.set(-0.6, 0.7, 0.8);
    dir.normalize();
    const minElev = 0.35;
    if (dir.y < minElev) dir.y = minElev;
    dir.normalize();
    this.flyTo(target.clone().add(dir.multiplyScalar(Math.max(d, 60))), target, false);
  }

  // --- 360° inspection ---------------------------------------------------------------------

  /**
   * Frame one target tightly for a 360° inspection.
   *
   * `focusBounds` pads by a fixed 40 m, which suits a search hit but swamps a
   * single element — a 12 m wall would be framed inside 100 m of empty ground.
   * This sizes the orbit to the target instead, lifts the centre to mid-height so
   * a tall element is looked *at* rather than up at, and relaxes the distance
   * limits (the site-wide `minDistance` of 20 m would keep the camera outside a
   * small component). `stopTurntable` restores both.
   */
  inspectBounds(bounds: Bounds, targetHeight = 0) {
    const span = Math.max(bounds.width, bounds.height, 8);
    const centre = boundsCenter(bounds);
    const target = new THREE.Vector3(centre.x, targetHeight, centre.z);
    // Room to swing past the target (1.5 padding) without the site-scale 40 m
    // floor, which would leave a door or a window 40 m away.
    const d = Math.max(this.frameDistance(bounds, 1.5, 12), span * 1.5, 12);

    this.controls.minDistance = Math.max(6, d * 0.15);
    this.controls.maxDistance = Math.max(this.controls.maxDistance, d * 5);
    // Three-quarter view, about 27° of elevation: faces read without the
    // foreshortening of a near-top-down orbit.
    this.flyTo(new THREE.Vector3(target.x - d * 0.72, target.y + d * 0.52, target.z + d * 0.72), target, false);
  }

  /**
   * Orbit the current target at a constant rate. OrbitControls advances
   * 6°/s per unit of `autoRotateSpeed`, and only while the user is not dragging,
   * so a manual look-around simply pauses the tour.
   */
  setTurntable(on: boolean, degreesPerSecond = 24, clockwise = true) {
    this.controls.autoRotate = on;
    this.controls.autoRotateSpeed = (degreesPerSecond / 6) * (clockwise ? 1 : -1);
  }

  /** Stop orbiting and restore the site-wide distance limits. */
  stopTurntable() {
    this.controls.autoRotate = false;
    this.controls.minDistance = 20;
    this.controls.maxDistance = Math.max(this.site.width, this.site.height) * 6;
  }

  /** Rotate the camera around the target by an exact angle (keyboard stepping). */
  nudgeAzimuth(degrees: number) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += THREE.MathUtils.degToRad(degrees);
    spherical.makeSafe();
    offset.setFromSpherical(spherical);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  /** Current azimuth in degrees, normalised to 0–359 (compass readout). */
  getAzimuth(): number {
    const degrees = THREE.MathUtils.radToDeg(this.controls.getAzimuthalAngle());
    return ((degrees % 360) + 360) % 360;
  }

  flyTo(pos: THREE.Vector3, target: THREE.Vector3, immediate: boolean) {
    if (immediate || this.reducedMotion) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.controls.update();
      this.tween = null;
      return;
    }
    this.tween = { from: this.camera.position.clone(), to: pos, fromT: this.controls.target.clone(), toT: target, start: performance.now(), duration: 650 };
  }

  /** Call every frame; returns true when something changed (needs render). */
  update(now: number): boolean {
    // Passed to OrbitControls so auto-rotation is degrees-per-second rather
    // than degrees-per-frame (a 120 Hz panel would otherwise spin twice as
    // fast). Clamped so a background tab does not jump the camera on return.
    const delta = this.lastNow === null ? null : Math.min(0.1, Math.max(0, (now - this.lastNow) / 1000));
    this.lastNow = now;
    if (this.tween) {
      const t = Math.min(1, (now - this.tween.start) / this.tween.duration);
      const e = 1 - Math.pow(1 - t, 3);
      this.camera.position.lerpVectors(this.tween.from, this.tween.to, e);
      this.controls.target.lerpVectors(this.tween.fromT, this.tween.toT, e);
      if (t >= 1) this.tween = null;
      this.controls.update(delta ?? undefined);
      return true;
    }
    return this.controls.update(delta ?? undefined);
  }

  dispose() {
    this.controls.stopListenToKeyEvents();
    this.controls.dispose();
  }
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
