import * as THREE from "three";
import { getBasemap } from "../../data/visualization.data";
import { getRenderQualityCap } from "../../../settings/services/settings.service";
import { sunModel } from "../../lib/lighting";
import { geometryBounds } from "../../lib/spatial";
import type {
  Annotation,
  AreaObject,
  BasemapId,
  Bounds,
  BoundaryObject,
  BuildingObject,
  CameraPreset,
  ContextBuildingObject,
  Point,
  RoadObject,
  SpatialDataset,
  SpatialObject,
  TerrainObject,
  TransitObject,
  TreeObject,
  UtilityObject,
  VisualizationSettings,
} from "../../types/visualization.types";
import { buildBuildings, type BuildingBatch } from "./BuildingMesh";
import { CameraRig } from "./CameraControls";
import { buildLandscape } from "./LandscapeMesh";
import { buildRoads } from "./RoadMesh";
import { disposeObject, toScene } from "./sceneMath";
import { buildTerrain } from "./Terrain";
import { buildTrees } from "./TreeMesh";
import { buildWater } from "./WaterMesh";

/**
 * The 3-D city renderer. Pure Three.js — no React, no project logic. It is
 * handed a SpatialDataset (already filtered to visible objects) plus display
 * settings, and exposes a tiny imperative API the React wrapper drives.
 *
 * Rendering is on-demand: frames are drawn only while the camera moves or
 * after a scene update, keeping laptops cool.
 */
export interface CitySceneOptions {
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  reducedMotion: boolean;
  /** Called (throttled to one per rendered frame) whenever the camera settles on a new pose. */
  onCamera?: (pose: { position: [number, number, number]; target: [number, number, number] }) => void;
}

export interface SceneInputs {
  data: SpatialDataset;
  visible: SpatialObject[];
  settings: VisualizationSettings;
  basemap: BasemapId;
}

/**
 * Optional analysis overlay: per-building colours and translucent ground
 * plates (zones). Owned by the caller (e.g. the Analysis module); the scene
 * only paints it.
 */
export interface SceneOverlay {
  buildings: Map<string, THREE.Color> | null;
  zones: { bounds: Bounds; color: THREE.Color; opacity: number }[];
}

export class CityScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private rig: CameraRig;
  private root = new THREE.Group();
  private buildings: BuildingBatch | null = null;
  private sun: THREE.DirectionalLight;
  private ambient: THREE.HemisphereLight;
  private fill: THREE.AmbientLight;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private raf = 0;
  private needsRender = true;
  private disposed = false;
  private dom: HTMLElement;
  private opts: CitySceneOptions;
  private inputs: SceneInputs | null = null;
  private pointerDown: { x: number; y: number } | null = null;
  private highlighted: string | null = null;
  private framed = false;
  private overlay: SceneOverlay | null = null;
  private overlayGroup = new THREE.Group();
  private annotationGroup = new THREE.Group();
  private annotations: Annotation[] = [];
  // Scratch objects reused by applyInputs(). Dragging the time-of-day or sun
  // sliders re-runs applyInputs at pointer-event rate, and it used to allocate
  // ~7 Color/Fog objects per call only to overwrite them on the next frame —
  // pure GC pressure. These are mutated in place instead. Declared above the
  // constructor so they exist before the first applyInputs() call.
  private readonly skyColor = new THREE.Color();
  private readonly scratchColor = new THREE.Color();
  private readonly sceneFog = new THREE.Fog(0xffffff, 1, 1000);

  constructor(dom: HTMLElement, inputs: SceneInputs, opts: CitySceneOptions) {
    this.dom = dom;
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
    // Cap from Settings → Visualization → Visual quality ("high" = the 2× this
    // scene has always used). Applied on construction, so a change takes effect
    // the next time the 3-D view is opened.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, getRenderQualityCap()));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    dom.appendChild(this.renderer.domElement);

    this.rig = new CameraRig(this.renderer.domElement, inputs.data.siteBounds, opts.reducedMotion, dom);
    this.rig.heightBias = inputs.settings.cameraHeight;
    this.rig.controls.addEventListener("change", () => (this.needsRender = true));

    // lights
    this.ambient = new THREE.HemisphereLight(0xffffff, 0xdfe7f1, 0.9);
    this.fill = new THREE.AmbientLight(0xffffff, 0.25);
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.6;
    this.overlayGroup.name = "analysis-overlay";
    this.annotationGroup.name = "annotations";
    this.scene.add(this.ambient, this.fill, this.sun, this.sun.target, this.root, this.overlayGroup, this.annotationGroup);

    this.applyInputs(inputs);
    this.resize(); // frames the site as soon as the host has a size (see resize)
    this.bindPointer();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  // --- public API -----------------------------------------------------------------------------

  update(inputs: SceneInputs) {
    const prev = this.inputs;
    const sceneChanged =
      !prev ||
      prev.data !== inputs.data ||
      prev.visible !== inputs.visible ||
      prev.basemap !== inputs.basemap ||
      prev.settings.buildingHeights !== inputs.settings.buildingHeights ||
      prev.settings.buildingShadows !== inputs.settings.buildingShadows ||
      prev.settings.terrain !== inputs.settings.terrain ||
      prev.settings.labels !== inputs.settings.labels ||
      prev.settings.buildingStyle !== inputs.settings.buildingStyle ||
      prev.settings.heightEmphasis !== inputs.settings.heightEmphasis;
    if (prev && prev.data.siteBounds !== inputs.data.siteBounds) this.rig.setSite(inputs.data.siteBounds);
    this.applyInputs(inputs, sceneChanged);
  }

  preset(p: CameraPreset) {
    this.rig.applyPreset(p);
    this.needsRender = true;
  }

  /** Exact camera restore (saved views / slides). */
  setPose(position: [number, number, number], target: [number, number, number], immediate = false) {
    this.rig.setPose(position, target, immediate);
    this.needsRender = true;
  }

  getPose() {
    return this.rig.getPose();
  }

  /** Approximate a 2-D camera (centre + px/m scale) in 3-D: frame the same ground extent from the current direction. */
  setPose2d(center: Point, scale: number, viewportPx: number) {
    const extent = Math.max(60, viewportPx / Math.max(0.01, scale));
    const fov = (this.rig.camera.fov * Math.PI) / 180;
    const d = Math.max(60, extent / 2 / Math.tan(fov / 2));
    const target = new THREE.Vector3(center.x, 0, center.y);
    const dir = new THREE.Vector3(-0.55, 0.75, 0.6).normalize();
    this.rig.flyTo(target.clone().add(dir.multiplyScalar(d)), target, false);
    this.needsRender = true;
  }

  /** Presentation annotations as lightweight sprites (titles, labels, callouts, metric tags). */
  setAnnotations(list: Annotation[]) {
    this.annotations = list;
    disposeObject(this.annotationGroup);
    this.annotationGroup.clear();
    for (const a of list) {
      const text = a.kind === "metric" && a.detail ? `${a.text}  ${a.detail}` : a.text;
      const sprite = makeLabelSprite(text, a.kind === "title" ? 20 : a.kind === "metric" ? 11 : 12, a.kind === "title" ? "#0F172A" : a.kind === "metric" ? "#1D4ED8" : "#0F172A", a.kind === "callout" ? "#FFF7E6" : "rgba(255,255,255,0.94)");
      if (!sprite) continue;
      sprite.position.set(a.position.x, a.kind === "title" ? 34 : 18, a.position.y);
      sprite.name = "annotation";
      this.annotationGroup.add(sprite);
      if (a.kind === "callout") {
        const pts = [new THREE.Vector3(a.position.x, 0.6, a.position.y), new THREE.Vector3(a.position.x, 14, a.position.y)];
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xd97706 }));
        line.name = "annotation-leader";
        this.annotationGroup.add(line);
      }
    }
    this.needsRender = true;
  }

  /** PNG data URL of the current frame (Capture View). Renders synchronously first so the buffer is fresh. */
  capture(): string | null {
    try {
      this.renderer.render(this.scene, this.rig.camera);
      return this.renderer.domElement.toDataURL("image/png");
    } catch {
      return null;
    }
  }

  focus(id: string) {
    const o = this.inputs?.data.objects.find((x) => x.id === id);
    if (!o) return;
    this.rig.focusBounds(geometryBounds(o.geometry));
    this.needsRender = true;
  }

  // --- 360° inspection (BIM element / model turntable) ----------------------------------------

  private inspectPose: { position: [number, number, number]; target: [number, number, number] } | null = null;
  private inspectAngle: ((degrees: number) => void) | null = null;
  private lastAngleAt = 0;

  /**
   * Frame a target for a 360° inspection: the linked spatial object when one is
   * given, otherwise the whole site. The pose the user was at is remembered, so
   * leaving the inspection flies back instead of dumping them somewhere new.
   */
  inspect360(objectId: string | null) {
    const data = this.inputs?.data;
    if (!data) return;
    if (!this.inspectPose) this.inspectPose = this.rig.getPose();
    const object = objectId ? data.objects.find((o) => o.id === objectId) ?? null : null;
    const bounds = object ? geometryBounds(object.geometry) : data.siteBounds;
    const props = object?.properties;
    const height = props && "height" in props && typeof props.height === "number" ? props.height : 0;
    // Orbit mid-height rather than the ground plane, so a tall element is
    // looked at instead of up at. Capped: a 60 m tower should not become a
    // horizon-level orbit.
    this.rig.inspectBounds(bounds, height > 0 ? Math.min(16, height / 2) : 0);
    this.needsRender = true;
  }

  /** Tour playback. The angle callback is throttled in the render loop. */
  setTurntable(opts: { playing: boolean; speed: number; clockwise: boolean; onAngle?: (degrees: number) => void }) {
    this.rig.setTurntable(opts.playing, opts.speed, opts.clockwise);
    this.inspectAngle = opts.onAngle ?? null;
    this.publishAngle(performance.now(), true);
    this.needsRender = true;
  }

  /** Step the orbit by an exact angle — inspect every face without animating. */
  nudge360(degrees: number) {
    this.rig.nudgeAzimuth(degrees);
    this.publishAngle(performance.now(), true);
    this.needsRender = true;
  }

  /** Leave the inspection: stop the orbit, restore the limits, fly back. */
  stopInspect360() {
    this.rig.stopTurntable();
    this.inspectAngle = null;
    const pose = this.inspectPose;
    this.inspectPose = null;
    if (pose) this.rig.setPose(pose.position, pose.target, false);
    this.needsRender = true;
  }

  /**
   * Publish the azimuth about 8× a second, straight to whatever DOM node the
   * caller owns. A 60 Hz React state update here would re-render the whole
   * workspace (model tree included) for a number in a pill.
   */
  private publishAngle(now: number, force = false) {
    if (!this.inspectAngle) return;
    if (!force && now - this.lastAngleAt < 120) return;
    this.lastAngleAt = now;
    this.inspectAngle(this.rig.getAzimuth());
  }

  highlight(id: string | null) {
    this.highlighted = id;
    this.buildings?.highlight(id);
    this.needsRender = true;
  }

  /** Paint (or clear) an analysis overlay on top of the current scene. */
  setOverlay(overlay: SceneOverlay | null) {
    this.overlay = overlay;
    this.buildings?.tint(overlay?.buildings ?? null);
    disposeObject(this.overlayGroup);
    this.overlayGroup.clear();
    if (overlay) {
      for (const z of overlay.zones) {
        const geo = new THREE.PlaneGeometry(z.bounds.width, z.bounds.height);
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: z.color, transparent: true, opacity: z.opacity, depthWrite: false }));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(z.bounds.x + z.bounds.width / 2, 0.3, z.bounds.y + z.bounds.height / 2);
        mesh.renderOrder = 2;
        mesh.name = "analysis-zone";
        this.overlayGroup.add(mesh);
      }
    }
    this.needsRender = true;
  }

  setCameraHeight(v: number) {
    this.rig.heightBias = v;
    this.rig.applyPreset("perspective");
    this.needsRender = true;
  }

  setReducedMotion(v: boolean) {
    this.rig.setReducedMotion(v);
  }

  resize() {
    const w = this.dom.clientWidth;
    const h = this.dom.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.rig.resize(w, h);
    if (!this.framed) {
      this.framed = true;
      this.rig.applyPreset("perspective", true);
    }
    this.needsRender = true;
  }

  dispose() {
    this.disposed = true;
    this.inspectAngle = null;
    cancelAnimationFrame(this.raf);
    this.unbindPointer();
    this.rig.dispose();
    disposeObject(this.root);
    disposeObject(this.overlayGroup);
    disposeObject(this.annotationGroup);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  // --- internals -----------------------------------------------------------------------------

  private applyInputs(inputs: SceneInputs, rebuild = true) {
    this.inputs = inputs;
    const bm = getBasemap(inputs.basemap);
    const far = Math.max(inputs.data.world.width, inputs.data.world.height) * 3.5;

    // lighting from settings — a visual preset (time of day × atmosphere × sun
    // intensity), not a solar calculation
    const s = inputs.settings;
    const sun = sunModel(s);
    const sunK = sun.strength;
    this.sun.intensity = 0.3 + sunK * 1.2;
    const ambientBase = s.ambientLighting ? 0.65 + (1 - Math.min(1, sunK)) * 0.4 : 0.22;
    this.ambient.intensity = ambientBase * sun.preset.ambient * sun.atmosphere.ambientScale;
    this.fill.intensity = (s.ambientLighting ? 0.25 : 0.08) * sun.atmosphere.ambientScale;
    this.sun.castShadow = s.buildingShadows;
    this.renderer.shadowMap.enabled = s.buildingShadows;
    const c = inputs.data.siteBounds;
    const cx = c.x + c.width / 2;
    const cz = c.y + c.height / 2;
    const span = Math.max(c.width, c.height);
    // sun direction: azimuth from the time-of-day preset (+ Sun Position nudge), elevation from the preset
    this.sun.position.set(cx + sun.toSun.x * span * 0.9, span * sun.elevation, cz + sun.toSun.y * span * 0.9);
    this.sun.target.position.set(cx, 0, cz);
    this.sun.color.set(sun.preset.sunColor);
    // sky + fog: basemap tone mixed with the time-of-day tint and the atmosphere's grey.
    // Scratch colors are reused across calls; `scratchColor` is safe to re-set
    // between the chained lerps because each `.lerp()` reads it immediately.
    const sky = this.skyColor
      .set(bm.sky3d)
      .lerp(this.scratchColor.set(sun.preset.skyTint), sun.preset.skyMix)
      .lerp(this.scratchColor.set(0xdfe4ea), sun.atmosphere.skyGrey);
    this.scene.background = sky;
    const fog = this.sceneFog;
    fog.color.copy(sky).lerp(this.scratchColor.set(bm.fog3d), 0.3);
    fog.near = far * sun.atmosphere.fogNear;
    fog.far = far * sun.atmosphere.fogFar;
    this.scene.fog = fog;
    const cam = this.sun.shadow.camera;
    cam.left = -span * 0.75;
    cam.right = span * 0.75;
    cam.top = span * 0.75;
    cam.bottom = -span * 0.75;
    cam.near = 1;
    cam.far = span * 4;
    cam.updateProjectionMatrix();

    if (rebuild) this.rebuild(inputs, bm);
    this.needsRender = true;
  }

  private rebuild(inputs: SceneInputs, bm: ReturnType<typeof getBasemap>) {
    disposeObject(this.root);
    this.root.clear();
    this.buildings = null;

    const v = inputs.visible;
    const boundaryAll = (inputs.data.objects.find((o) => o.type === "boundary") as BoundaryObject | undefined) ?? null;
    const boundaryVisible = v.some((o) => o.type === "boundary");
    const contours = v.filter((o): o is TerrainObject => o.type === "terrain");
    const water = v.filter((o): o is AreaObject => o.type === "water");
    const blocks = v.filter((o): o is AreaObject => o.type === "block");
    const parking = v.filter((o): o is AreaObject => o.type === "parking");
    const green = v.filter((o): o is AreaObject => o.type === "green");
    const roads = v.filter((o): o is RoadObject => o.type === "road" || o.type === "path");
    const transit = v.filter((o): o is TransitObject => o.type === "transit");
    const utilities = v.filter((o): o is UtilityObject => o.type === "utility");
    const buildings = v.filter((o): o is BuildingObject => o.type === "building");
    const context = v.filter((o): o is ContextBuildingObject => o.type === "context-building");
    const trees = v.filter((o): o is TreeObject => o.type === "tree");

    this.root.add(buildTerrain(inputs.data.world, boundaryAll, contours, bm, inputs.settings.terrain));
    this.root.add(buildWater(water, bm));
    this.root.add(buildLandscape(blocks, parking, green));
    this.root.add(buildRoads(roads, transit, utilities));
    this.buildings = buildBuildings(buildings, context, { heights: inputs.settings.buildingHeights, shadows: inputs.settings.buildingShadows, style: inputs.settings.buildingStyle, heightScale: inputs.settings.heightEmphasis ? 1.5 : 1 });
    this.buildings.highlight(this.highlighted);
    if (this.overlay) this.buildings.tint(this.overlay.buildings);
    this.root.add(this.buildings.group);
    this.root.add(buildTrees(trees, inputs.settings.buildingShadows));

    if (boundaryAll && boundaryVisible) {
      const pts = [...boundaryAll.geometry.points, boundaryAll.geometry.points[0]].map((p) => toScene(p, 0.5));
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x2563eb, dashSize: 9, gapSize: 5, linewidth: 1 }));
      line.computeLineDistances();
      line.name = "site-boundary";
      this.root.add(line);
    }

    if (inputs.settings.labels) this.root.add(this.buildLabels(inputs));
  }

  /** Lightweight canvas-sprite labels for POIs and the site name. */
  private buildLabels(inputs: SceneInputs): THREE.Group {
    const group = new THREE.Group();
    group.name = "labels";
    const make = (text: string, x: number, y: number, z: number, scale: number, color: string) => {
      const sprite = makeLabelSprite(text, scale, color, "rgba(255,255,255,0.92)");
      if (!sprite) return;
      sprite.position.set(x, y, z);
      group.add(sprite);
    };
    const sb = inputs.data.siteBounds;
    make(inputs.data.projectName, sb.x + sb.width / 2, 24, sb.y - 20, 14, "#0F172A");
    for (const o of inputs.visible) {
      if (o.type === "poi") make(o.name, o.geometry.point.x, 14, o.geometry.point.y, 9, "#1D4ED8");
    }
    return group;
  }

  private cameraDirty = false;
  private loop(now: number) {
    if (this.disposed) return;
    this.resolveHover();
    const moved = this.rig.update(now);
    if (moved) this.publishAngle(now);
    if (moved || this.needsRender) {
      this.renderer.render(this.scene, this.rig.camera);
      this.needsRender = false;
    }
    if (moved) this.cameraDirty = true;
    else if (this.cameraDirty) {
      // camera settled → publish the pose once
      this.cameraDirty = false;
      this.opts.onCamera?.(this.rig.getPose());
    }
    this.raf = requestAnimationFrame(this.loop);
  }

  // --- picking ---------------------------------------------------------------------------------

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.pointerDown = { x: e.clientX, y: e.clientY };
  };
  private onUp = (e: PointerEvent) => {
    const d = this.pointerDown;
    this.pointerDown = null;
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) return; // it was a drag
    this.opts.onSelect(this.pick(e.clientX, e.clientY));
  };
  private hoverPending: { x: number; y: number } | null = null;
  private lastHover: string | null = null;
  private onMove = (e: PointerEvent) => {
    if (this.pointerDown) return;
    this.hoverPending = { x: e.clientX, y: e.clientY }; // resolved once per frame in loop()
  };
  private resolveHover() {
    const p = this.hoverPending;
    if (!p) return;
    this.hoverPending = null;
    const id = this.pick(p.x, p.y);
    if (id === this.lastHover) return;
    this.lastHover = id;
    this.renderer.domElement.style.cursor = id ? "pointer" : "";
    this.opts.onHover(id);
  }

  private pick(clientX: number, clientY: number): string | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.rig.camera);
    const hits = this.raycaster.intersectObjects(this.root.children, true);
    for (const h of hits) {
      const obj = h.object;
      if (obj.name === "selection-outline" || obj.name === "analysis-zone" || obj.name === "building-detail" || obj.name === "annotation" || obj.type === "Sprite" || obj.type === "Line" || obj.type === "LineSegments") continue;
      const fromInstance = this.buildings?.resolve(obj, h.instanceId);
      if (fromInstance) return fromInstance;
      if (obj.name === "context-buildings") return null;
      const id = obj.userData.objectId as string | undefined;
      if (id) return id;
      if (obj.name === "site-plate") return "site-boundary";
      if (obj.name === "ground") return null;
    }
    return null;
  }

  private bindPointer() {
    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.onDown);
    el.addEventListener("pointerup", this.onUp);
    el.addEventListener("pointermove", this.onMove);
  }
  private unbindPointer() {
    const el = this.renderer.domElement;
    el.removeEventListener("pointerdown", this.onDown);
    el.removeEventListener("pointerup", this.onUp);
    el.removeEventListener("pointermove", this.onMove);
  }
}

/** Canvas-texture sprite with a rounded plate — shared by labels and annotations. */
function makeLabelSprite(text: string, scale: number, color: string, plate: string): THREE.Sprite | null {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const font = "700 28px Inter, sans-serif";
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 32;
  canvas.width = w;
  canvas.height = 48;
  ctx.font = font;
  ctx.fillStyle = plate;
  ctx.strokeStyle = "#DCE6F2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(1, 1, w - 2, 46, 23);
  else ctx.rect(1, 1, w - 2, 46);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 16, 24);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set((w / 48) * scale, scale, 1);
  sprite.renderOrder = 10;
  return sprite;
}
