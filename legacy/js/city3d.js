/* ============================================================
   URBANFORMA — interactive 3D city visual (Three.js r128)
   Daylight city: skyline, flowing river, bridges, wind
   turbines, elevated monorail, data layers, orbit controls.
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("cityCanvas");
  var fallback = document.getElementById("stageFallback");
  if (!canvas) return;

  function showFallback(msg) {
    if (fallback) {
      fallback.classList.add("is-on");
      fallback.textContent =
        "3D CITY VISUAL — " + (msg || "WebGL unavailable in this browser");
    }
    canvas.style.display = "none";
  }

  function hasWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (c.getContext("webgl") || c.getContext("experimental-webgl"))
      );
    } catch (e) {
      return false;
    }
  }
  if (typeof THREE === "undefined" || !hasWebGL()) {
    showFallback();
    return;
  }

  var stage = canvas.parentElement;
  var scene, camera, renderer, clock;
  var cityGroup, scanBar, flowLines = [], rotors = [];
  var waterTex, monoCurve, monoTrain, globe, landmarks = [];
  var RIVER_HALF = 4.6;

  /* wind-turbine footprints (kept clear of buildings) */
  var TURBINE_SPOTS = [
    new THREE.Vector2(-27, -24),
    new THREE.Vector2(27, -22),
    new THREE.Vector2(-24, 27)
  ];

  /* landmark-tower footprints (kept clear of instanced buildings) */
  var LANDMARK_SPOTS = [
    new THREE.Vector2(-5, -5),
    new THREE.Vector2(7, -3),
    new THREE.Vector2(-3, 6),
    new THREE.Vector2(8, 7)
  ];

  /* ---------- orbit state ---------- */
  var orbit = {
    theta: 0.7,
    phi: 0.78,
    radius: 58,
    target: new THREE.Vector3(0, 3, 0),
    minR: 34,
    maxR: 92,
    autoSpeed: 0.0014,
    dragging: false,
    lastX: 0,
    lastY: 0,
    idle: 0
  };

  /* ---------- deterministic random ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rnd = mulberry32(20260907);

  /* ---------- river path (meanders through the city) ---------- */
  var riverCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2, 0, -33),
    new THREE.Vector3(-12, 0, -22),
    new THREE.Vector3(12, 0, -10),
    new THREE.Vector3(-4, 0, 4),
    new THREE.Vector3(-14, 0, 16),
    new THREE.Vector3(8, 0, 24),
    new THREE.Vector3(33, 0, 18)
  ]);
  var riverSamples = riverCurve.getPoints(240);

  function distToRiver(x, z) {
    var min = Infinity;
    for (var i = 0; i < riverSamples.length; i++) {
      var p = riverSamples[i];
      var dx = p.x - x, dz = p.z - z;
      var d = dx * dx + dz * dz;
      if (d < min) min = d;
    }
    return Math.sqrt(min);
  }

  init();

  function init() {
    try {
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0xd3dcf6, 0.0052);

      camera = new THREE.PerspectiveCamera(44, 1, 0.1, 400);

      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      /* lights — bright daylight, directional for clear form & shadows */
      scene.add(new THREE.AmbientLight(0xffffff, 0.42));
      var hemi = new THREE.HemisphereLight(0xffffff, 0xc8cfe6, 0.55);
      scene.add(hemi);
      var sun = new THREE.DirectionalLight(0xfff2dc, 1.45);
      sun.position.set(24, 46, 22);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.near = 6;
      sun.shadow.camera.far = 160;
      sun.shadow.camera.left = -48;
      sun.shadow.camera.right = 48;
      sun.shadow.camera.top = 48;
      sun.shadow.camera.bottom = -48;
      sun.shadow.bias = -0.0004;
      sun.shadow.radius = 3;
      scene.add(sun);
      scene.add(sun.target);
      var fill = new THREE.DirectionalLight(0xb9c2ff, 0.3);
      fill.position.set(-28, 22, -24);
      scene.add(fill);

      cityGroup = new THREE.Group();
      scene.add(cityGroup);

      buildGround();
      buildRiver();
      buildBridges();
      buildCity();
      buildLandmarks();
      buildTurbines();
      buildMonorail();
      buildGlobe();
      buildDataLayers();
      buildScanBar();

      clock = new THREE.Clock();
      bindEvents();
      resize();
      animate();
    } catch (err) {
      console.warn("city3d init failed:", err);
      showFallback();
    }
  }

  /* ---------- ground: light land with procedural road grid ---------- */
  function makeGroundTexture() {
    var s = 1024;
    var cv = document.createElement("canvas");
    cv.width = cv.height = s;
    var ctx = cv.getContext("2d");

    ctx.fillStyle = "#cfdcf0"; // light blue-grey land — sits on white slab
    ctx.fillRect(0, 0, s, s);

    // parcel variation
    for (var i = 0; i < 220; i++) {
      ctx.fillStyle = rnd() > 0.5
        ? "rgba(79,142,247,0.14)" : "rgba(123,111,240,0.13)";
      ctx.fillRect(rnd() * s, rnd() * s, 40 + rnd() * 90, 40 + rnd() * 90);
    }

    var step = s / 12;
    // roads — bold dark slate, clearly defines the street grid
    ctx.strokeStyle = "rgba(58,74,108,0.98)";
    ctx.lineWidth = 18;
    for (var g = 0; g <= 12; g++) {
      var p = g * step;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(s, p); ctx.stroke();
    }
    // crisp white lane dashes running down each road
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.setLineDash([16, 16]);
    for (var d = 0; d <= 12; d++) {
      var c = d * step;
      ctx.beginPath(); ctx.moveTo(c, 0); ctx.lineTo(c, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, c); ctx.lineTo(s, c); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.lineCap = "butt";

    var tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    return tex;
  }

  function buildGround() {
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      new THREE.MeshStandardMaterial({
        map: makeGroundTexture(),
        roughness: 0.95,
        metalness: 0.0
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    cityGroup.add(ground);

    // white island slab (rim visible around the land, like a model)
    var slab = new THREE.Mesh(
      new THREE.BoxGeometry(71.5, 1.0, 71.5),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.8,
        metalness: 0.05
      })
    );
    slab.position.y = -0.55;
    cityGroup.add(slab);
  }

  /* ---------- flowing river ---------- */
  function makeWaterTexture() {
    var s = 256;
    var cv = document.createElement("canvas");
    cv.width = cv.height = s;
    var ctx = cv.getContext("2d");

    var grd = ctx.createLinearGradient(0, 0, 0, s);
    grd.addColorStop(0, "#1e84c9");
    grd.addColorStop(1, "#4fb6e8");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, s, s);

    // flowing streaks
    for (var i = 0; i < 60; i++) {
      var y = rnd() * s;
      var len = 30 + rnd() * 90;
      var x = rnd() * s;
      ctx.strokeStyle = "rgba(255,255,255," + (0.18 + rnd() * 0.35) + ")";
      ctx.lineWidth = 1 + rnd() * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + len * 0.3, y - 6, x + len * 0.7, y + 6, x + len, y);
      ctx.stroke();
    }

    var tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function buildRiver() {
    var pts = riverCurve.getPoints(160);
    var positions = [];
    var uvs = [];
    var indices = [];
    var total = 0;
    var prev = null;

    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (prev) {
        total += Math.hypot(p.x - prev.x, p.z - prev.z);
      }
      prev = p;

      // perpendicular in the XZ plane
      var a = pts[Math.max(0, i - 1)];
      var b = pts[Math.min(pts.length - 1, i + 1)];
      var tx = b.x - a.x, tz = b.z - a.z;
      var tl = Math.hypot(tx, tz) || 1;
      var nx = -tz / tl, nz = tx / tl;

      positions.push(p.x + nx * RIVER_HALF, 0.12, p.z + nz * RIVER_HALF);
      positions.push(p.x - nx * RIVER_HALF, 0.12, p.z - nz * RIVER_HALF);
      uvs.push(total / 5, 0);
      uvs.push(total / 5, 1);

      if (i < pts.length - 1) {
        var k = i * 2;
        indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    waterTex = makeWaterTexture();
    var water = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      map: waterTex,
      roughness: 0.1,
      metalness: 0.32,
      emissive: 0x0d5c92,
      emissiveIntensity: 0.34
    }));
    cityGroup.add(water);

    // soft river banks — one embankment just outside each water edge
    var bankMat = new THREE.MeshStandardMaterial({ color: 0xf2f0fb, roughness: 0.9 });
    [1, -1].forEach(function (side) {
      var linePts = [];
      for (var j = 0; j < pts.length; j++) {
        var pp = pts[j];
        var aa = pts[Math.max(0, j - 1)];
        var bb = pts[Math.min(pts.length - 1, j + 1)];
        var ddx = bb.x - aa.x, ddz = bb.z - aa.z;
        var dd = Math.hypot(ddx, ddz) || 1;
        var px = -ddz / dd, pz = ddx / dd;
        var edge = RIVER_HALF + 0.45;
        linePts.push(new THREE.Vector3(
          pp.x + side * px * edge, 0.2, pp.z + side * pz * edge));
      }
      var tube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(linePts), 200, 0.28, 6, false),
        bankMat
      );
      cityGroup.add(tube);
    });
  }

  /* ---------- road bridges over the river ---------- */
  function makeBridge(t) {
    var p = riverCurve.getPointAt(t);
    var tan = riverCurve.getTangentAt(t);
    var g = new THREE.Group();

    var deckMat = new THREE.MeshStandardMaterial({ color: 0xf4f7fc, roughness: 0.6 });
    var railMat = new THREE.MeshStandardMaterial({ color: 0x93a7c4, roughness: 0.6 });

    var len = RIVER_HALF * 2 + 11;
    var deck = new THREE.Mesh(new THREE.BoxGeometry(len, 0.4, 2.8), deckMat);
    deck.position.y = 0.34;
    g.add(deck);

    var road = new THREE.Mesh(
      new THREE.BoxGeometry(len * 0.96, 0.06, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x7086a8, roughness: 0.9 })
    );
    road.position.y = 0.58;
    g.add(road);

    [-1.25, 1.25].forEach(function (zz) {
      var rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, 0.14), railMat);
      rail.position.set(0, 0.85, zz);
      g.add(rail);
    });

    // pylons into the water
    [-RIVER_HALF - 1, RIVER_HALF + 1].forEach(function (xx) {
      var py = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.34, 1.4, 8),
        new THREE.MeshStandardMaterial({ color: 0xe8eef5, roughness: 0.8 })
      );
      py.position.set(xx, -0.2, 0);
      g.add(py);
    });

    g.traverse(function (m) { m.castShadow = true; m.receiveShadow = true; });
    g.position.set(p.x, 0, p.z);
    // local +X (deck length) must point ACROSS the river = normal to tangent
    g.rotation.y = Math.atan2(-tan.x, -tan.z);
    cityGroup.add(g);
  }

  function buildBridges() {
    makeBridge(0.3);
    makeBridge(0.62);
  }

  /* ---------- building facades (light glass) ---------- */
  function makeWindowTexture() {
    var w = 128, h = 256;
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    var ctx = cv.getContext("2d");
    ctx.fillStyle = "#9fb5d8";
    ctx.fillRect(0, 0, w, h);

    var cols = 8, rows = 24;
    var cw = w / cols, rh = h / rows;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var r = rnd();
        if (r < 0.6) {
          ctx.fillStyle = "rgba(24,52,104,0.72)"; // deep navy glass
        } else if (r < 0.82) {
          ctx.fillStyle = "rgba(94,86,210,0.66)"; // indigo glass
        } else if (r < 0.93) {
          ctx.fillStyle = "rgba(52,138,226,0.6)";  // bright sky glass
        } else {
          ctx.fillStyle = "rgba(255,224,140,0.95)"; // warm lit window
        }
        ctx.fillRect(x * cw + cw * 0.18, y * rh + rh * 0.2,
                     cw * 0.64, rh * 0.6);
      }
    }
    var tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function buildCity() {
    var winTex = makeWindowTexture();
    var sideMat = new THREE.MeshStandardMaterial({
      map: winTex,
      emissiveMap: winTex,
      emissive: 0xfff0c8,
      emissiveIntensity: 0.14,
      roughness: 0.32,
      metalness: 0.28,
      color: 0xffffff
    });
    var roofMat = new THREE.MeshStandardMaterial({
      color: 0xb9c4da,
      roughness: 0.9,
      metalness: 0.1
    });

    var geo = new THREE.BoxGeometry(1, 1, 1);
    var buildings = new THREE.InstancedMesh(geo,
      [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat], 260);

    var parkMat = new THREE.MeshStandardMaterial({
      color: 0x79c98f, roughness: 1, metalness: 0
    });

    var dummy = new THREE.Object3D();
    var color = new THREE.Color();
    var n = 12;
    var spacing = 5.2;
    var half = ((n - 1) * spacing) / 2;
    var count = 0;

    for (var ix = 0; ix < n; ix++) {
      for (var iz = 0; iz < n; iz++) {
        var x = ix * spacing - half;
        var z = iz * spacing - half;

        // keep the river clear
        if (distToRiver(x, z) < RIVER_HALF + 1.4) continue;

        // keep turbine plots clear
        var onTurbine = TURBINE_SPOTS.some(function (s) {
          return Math.hypot(s.x - x, s.y - z) < 3.2;
        });
        if (onTurbine) continue;

        // keep landmark plots clear
        var onLandmark = LANDMARK_SPOTS.some(function (s) {
          return Math.hypot(s.x - x, s.y - z) < 3.4;
        });
        if (onLandmark) continue;

        var dx = ix - (n - 1) / 2;
        var dz = iz - (n - 1) / 2;
        var distNorm = Math.sqrt(dx * dx + dz * dz) / (n / 2);
        var core = Math.max(0, 1 - distNorm);

        if (rnd() < 0.14) {
          var park = new THREE.Mesh(
            new THREE.BoxGeometry(spacing * 0.72, 0.22, spacing * 0.72),
            parkMat
          );
          park.position.set(x, 0.11, z);
          park.receiveShadow = true;
          cityGroup.add(park);
          continue;
        }

        var fw = spacing * (0.44 + rnd() * 0.32);
        var fd = spacing * (0.44 + rnd() * 0.32);
        var h = 2.0 + Math.pow(core, 1.5) * 22 + rnd() * 6.5;
        if (rnd() > 0.88 && core > 0.4) h += 11 * core;

        dummy.position.set(x, h / 2 + 0.05, z);
        dummy.scale.set(fw, h, fd);
        dummy.rotation.y = (rnd() - 0.5) * 0.06;
        dummy.updateMatrix();
        buildings.setMatrixAt(count, dummy.matrix);

        var tint = rnd();
        if (tint < 0.4) color.setHSL(0.66, 0.58, 0.64 + rnd() * 0.08);    // indigo
        else if (tint < 0.68) color.setHSL(0.58, 0.62, 0.62 + rnd() * 0.08); // blue glass
        else if (tint < 0.82) color.setHSL(0.08, 0.55, 0.70 + rnd() * 0.06); // warm/peach
        else if (tint < 0.93) color.setHSL(0.46, 0.5, 0.68 + rnd() * 0.08);  // teal/mint
        else color.setHSL(0.6, 0.25, 0.82 + rnd() * 0.06);               // pale/white accent
        buildings.setColorAt(count, color);
        count++;
      }
    }

    buildings.count = count;
    buildings.castShadow = true;
    buildings.receiveShadow = true;
    buildings.instanceMatrix.needsUpdate = true;
    if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
    cityGroup.add(buildings);
  }

  /* ---------- landmark towers with floating labels ---------- */
  function makeLabel(text) {
    var padX = 18, padY = 11, font = "700 30px Inter, Arial, sans-serif";
    var cv = document.createElement("canvas");
    var ctx = cv.getContext("2d");
    ctx.font = font;
    var tw = ctx.measureText(text).width;
    var w = Math.ceil(tw) + padX * 2;
    var h = 52;
    cv.width = w; cv.height = h;
    ctx.font = font;
    ctx.textBaseline = "middle";

    // rounded white pill
    var r = h / 2;
    ctx.beginPath();
    ctx.moveTo(r, 2);
    ctx.arcTo(w - 2, 2, w - 2, h - 2, r);
    ctx.arcTo(w - 2, h - 2, 2, h - 2, r);
    ctx.arcTo(2, h - 2, 2, 2, r);
    ctx.arcTo(2, 2, w - 2, 2, r);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(123,111,240,0.55)";
    ctx.stroke();

    ctx.fillStyle = "#4b3fd0";
    ctx.fillText(text, padX, h / 2 + 1);

    var tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    var spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false
    }));
    var scale = 0.022;
    spr.scale.set(w * scale, h * scale, 1);
    return spr;
  }

  function buildLandmarks() {
    var defs = [
      { x: -5, z: -5, h: 30, c: 0x7b6ff0, label: "Civic Spire" },
      { x: 7,  z: -3, h: 26, c: 0x4f8ef7, label: "Grand Terminal" },
      { x: -3, z: 6,  h: 28, c: 0x6a5ce0, label: "Skyline Tower" },
      { x: 8,  z: 7,  h: 24, c: 0x34a3e0, label: "Riverside Hall" }
    ];

    defs.forEach(function (d) {
      if (distToRiver(d.x, d.z) < RIVER_HALF + 2.2) return;

      var g = new THREE.Group();
      var body = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, d.h, 2.6),
        new THREE.MeshStandardMaterial({
          color: d.c,
          roughness: 0.3,
          metalness: 0.35,
          emissive: d.c,
          emissiveIntensity: 0.12
        })
      );
      body.position.y = d.h / 2;
      body.castShadow = true;
      g.add(body);

      // rooftop crown
      var crown = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 1.8, 1.4, 6),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.4,
          emissive: d.c,
          emissiveIntensity: 0.25
        })
      );
      crown.position.y = d.h + 0.7;
      crown.castShadow = true;
      g.add(crown);

      // antenna
      var mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 3, 6),
        new THREE.MeshBasicMaterial({ color: d.c })
      );
      mast.position.y = d.h + 2.8;
      g.add(mast);

      var label = makeLabel(d.label);
      label.position.y = d.h + 6.4;
      g.add(label);
      landmarks.push(label);

      g.position.set(d.x, 0.05, d.z);
      cityGroup.add(g);
    });
  }

  /* ---------- wind turbines ---------- */
  function makeTurbine(x, z) {
    var g = new THREE.Group();
    var white = new THREE.MeshStandardMaterial({
      color: 0xfbfcff, roughness: 0.5, metalness: 0.1
    });

    var pad = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 2.2, 0.3, 20),
      new THREE.MeshStandardMaterial({ color: 0x6fc98c, roughness: 1 })
    );
    pad.position.y = 0.15;
    pad.receiveShadow = true;
    g.add(pad);

    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.36, 9, 10), white);
    pole.position.y = 4.6;
    g.add(pole);

    var nacelle = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 1.1), white);
    nacelle.position.set(0, 9.2, 0.2);
    g.add(nacelle);

    var rotor = new THREE.Group();
    rotor.position.set(0, 9.2, 0.75);
    var hub = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xe8eef5, roughness: 0.5 })
    );
    rotor.add(hub);

    var bladeGeo = new THREE.BoxGeometry(0.16, 3.4, 0.5);
    bladeGeo.translate(0, 1.9, 0); // pivot at hub
    for (var b = 0; b < 3; b++) {
      var blade = new THREE.Mesh(bladeGeo, white);
      blade.rotation.z = (b / 3) * Math.PI * 2;
      rotor.add(blade);
    }
    g.add(rotor);
    rotors.push(rotor);

    g.traverse(function (m) { if (m.isMesh) m.castShadow = true; });
    g.position.set(x, 0, z);
    g.rotation.y = 0.5;
    cityGroup.add(g);
  }

  function buildTurbines() {
    makeTurbine(-27, -24);
    makeTurbine(27, -22);
    makeTurbine(-24, 27);
  }

  /* ---------- elevated monorail loop + moving train ---------- */
  function buildMonorail() {
    var RAIL_Y = 7.5;
    var pts = [];
    var SEG = 56;
    for (var i = 0; i < SEG; i++) {
      var a = (i / SEG) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * 25, RAIL_Y, Math.sin(a) * 20));
    }
    monoCurve = new THREE.CatmullRomCurve3(pts, true);

    var rail = new THREE.Mesh(
      new THREE.TubeGeometry(monoCurve, 220, 0.26, 8, true),
      new THREE.MeshStandardMaterial({ color: 0xf7f9fd, roughness: 0.4, metalness: 0.2 })
    );
    rail.castShadow = true;
    cityGroup.add(rail);

    // support pillars
    var pillarMat = new THREE.MeshStandardMaterial({ color: 0xc8d3e6, roughness: 0.8 });
    for (var p = 0; p < 14; p++) {
      var pp = monoCurve.getPointAt(p / 14);
      var pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, RAIL_Y, 8), pillarMat);
      pillar.position.set(pp.x, RAIL_Y / 2, pp.z);
      pillar.castShadow = true;
      cityGroup.add(pillar);
    }

    // train (3 carriages, long along local +Z)
    monoTrain = new THREE.Group();
    var bodyMat = new THREE.MeshStandardMaterial({
      color: 0x7b6ff0, roughness: 0.35, metalness: 0.3,
      emissive: 0x5a4bd6, emissiveIntensity: 0.18
    });
    var noseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    [-2.7, 0, 2.7].forEach(function (zz, idx) {
      var car = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 2.5),
        idx === 1 ? bodyMat : noseMat);
      car.position.set(0, 0.3, zz);
      monoTrain.add(car);
      var stripe = new THREE.Mesh(
        new THREE.BoxGeometry(1.56, 0.3, 2.2),
        new THREE.MeshStandardMaterial({ color: 0xb6bdfb, roughness: 0.3 })
      );
      stripe.position.set(0, 0.55, zz);
      monoTrain.add(stripe);
    });
    monoTrain.traverse(function (m) { if (m.isMesh) m.castShadow = true; });
    cityGroup.add(monoTrain);
  }

  /* ---------- floating analytics globe ---------- */
  function buildGlobe() {
    globe = new THREE.Group();
    var R = 4.8;

    var sphere = new THREE.Mesh(
      new THREE.SphereGeometry(R, 40, 40),
      new THREE.MeshStandardMaterial({
        color: 0xe3e1fb,
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.95
      })
    );
    globe.add(sphere);

    var wire = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.012, 24, 18),
      new THREE.MeshBasicMaterial({
        color: 0x7b6ff0,
        wireframe: true,
        transparent: true,
        opacity: 0.16
      })
    );
    globe.add(wire);

    // pastel location pins on the globe surface
    var pinColors = [0x7b6ff0, 0x4f8ef7, 0xff9f43, 0xf7687a, 0x34d399];
    for (var i = 0; i < 12; i++) {
      var theta = rnd() * Math.PI * 2;
      var phi = Math.acos(2 * rnd() - 1);
      var px = R * Math.sin(phi) * Math.cos(theta);
      var py = R * Math.cos(phi);
      var pz = R * Math.sin(phi) * Math.sin(theta);
      var pin = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 10),
        new THREE.MeshStandardMaterial({
          color: pinColors[i % pinColors.length],
          emissive: pinColors[i % pinColors.length],
          emissiveIntensity: 0.35,
          roughness: 0.4
        })
      );
      pin.position.set(px, py, pz);
      pin.userData.base = pin.position.clone();
      globe.add(pin);
    }

    // soft orbital ring
    var ringPts = [];
    for (var a = 0; a <= 64; a++) {
      var ang = (a / 64) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(
        Math.cos(ang) * R * 1.5,
        Math.sin(ang * 1.3) * 0.9,
        Math.sin(ang) * R * 1.5));
    }
    var ring = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(ringPts),
      new THREE.LineBasicMaterial({ color: 0x7b6ff0, transparent: true, opacity: 0.3 })
    );
    globe.add(ring);

    globe.position.set(0, 30, -4);
    globe.rotation.z = 0.32;
    cityGroup.add(globe);
  }

  /* ---------- data flow lines (visible on light bg) ---------- */
  function makeFlow(colorHex, pts) {
    var curve = new THREE.CatmullRomCurve3(pts);
    var geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(120));
    var mat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.55
    });
    var line = new THREE.Line(geo, mat);
    cityGroup.add(line);

    var pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 10, 10),
      new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.6,
        roughness: 0.4
      })
    );
    cityGroup.add(pulse);

    flowLines.push({
      curve: curve, line: line, pulse: pulse,
      offset: rnd(), speed: 0.04 + rnd() * 0.05
    });
  }

  function buildDataLayers() {
    // arcs hugging the city perimeter (outside the building grid) — clear view
    makeFlow(0x7b6ff0, [
      new THREE.Vector3(-31, 16, -18),
      new THREE.Vector3(-35, 23, 0),
      new THREE.Vector3(-31, 17, 20)
    ]);
    makeFlow(0x4f8ef7, [
      new THREE.Vector3(31, 18, -16),
      new THREE.Vector3(35, 25, 2),
      new THREE.Vector3(31, 16, 18)
    ]);
    makeFlow(0xff9f43, [
      new THREE.Vector3(-14, 23, -33),
      new THREE.Vector3(2, 29, -36),
      new THREE.Vector3(18, 22, -32)
    ]);
  }

  /* ---------- soft analysis scan bar ---------- */
  function buildScanBar() {
    var cv = document.createElement("canvas");
    cv.width = 16; cv.height = 256;
    var ctx = cv.getContext("2d");
    var grd = ctx.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, "rgba(123,111,240,0)");
    grd.addColorStop(0.7, "rgba(123,111,240,0.07)");
    grd.addColorStop(0.96, "rgba(123,111,240,0.42)");
    grd.addColorStop(1, "rgba(170,160,255,0.7)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 16, 256);
    var tex = new THREE.CanvasTexture(cv);

    scanBar = new THREE.Mesh(
      new THREE.PlaneGeometry(64, 7),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    scanBar.rotation.x = -Math.PI / 2;
    scanBar.position.y = 0.3;
    cityGroup.add(scanBar);
  }

  /* ---------- interaction ---------- */
  function bindEvents() {
    canvas.addEventListener("pointerdown", function (e) {
      orbit.dragging = true;
      orbit.idle = 0;
      orbit.lastX = e.clientX;
      orbit.lastY = e.clientY;
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    });
    window.addEventListener("pointermove", function (e) {
      if (!orbit.dragging) return;
      var dx = e.clientX - orbit.lastX;
      var dy = e.clientY - orbit.lastY;
      orbit.lastX = e.clientX;
      orbit.lastY = e.clientY;
      orbit.theta -= dx * 0.005;
      orbit.phi -= dy * 0.005;
      orbit.phi = Math.max(0.55, Math.min(1.35, orbit.phi));
      orbit.idle = 0;
    });
    window.addEventListener("pointerup", function () { orbit.dragging = false; });

    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      orbit.radius += e.deltaY * 0.04;
      orbit.radius = Math.max(orbit.minR, Math.min(orbit.maxR, orbit.radius));
      orbit.idle = 0;
    }, { passive: false });

    window.addEventListener("resize", resize);
    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(stage);
    }
  }

  function resize() {
    var w = stage.clientWidth || 800;
    var h = stage.clientHeight || 420;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function updateCamera() {
    orbit.idle++;
    if (!orbit.dragging && orbit.idle > 90) {
      orbit.theta += orbit.autoSpeed;
    }
    var r = orbit.radius;
    camera.position.set(
      orbit.target.x + r * Math.sin(orbit.phi) * Math.sin(orbit.theta),
      orbit.target.y + r * Math.cos(orbit.phi),
      orbit.target.z + r * Math.sin(orbit.phi) * Math.cos(orbit.theta)
    );
    camera.lookAt(orbit.target);
  }

  /* ---------- render loop ---------- */
  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;

    updateCamera();

    // flowing water
    if (waterTex) waterTex.offset.x = (t * 0.045) % 1;

    // scan bar sweep
    if (scanBar) {
      scanBar.position.z = ((t * 7) % 66) - 33;
    }

    // data pulses
    for (var i = 0; i < flowLines.length; i++) {
      var f = flowLines[i];
      var k = (t * f.speed + f.offset) % 1;
      f.pulse.position.copy(f.curve.getPointAt(k));
      f.pulse.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.8);
      f.line.material.opacity = 0.4 + 0.2 * Math.sin(t * 1.5 + i);
    }

    // wind turbine blades
    for (var r = 0; r < rotors.length; r++) {
      rotors[r].rotation.z += dt * 1.4;
    }

    // floating analytics globe
    if (globe) {
      globe.rotation.y += dt * 0.22;
      globe.position.y = 30 + Math.sin(t * 0.6) * 0.9;
    }

    // monorail train
    if (monoTrain && monoCurve) {
      var tk = (t * 0.03) % 1;
      var pos = monoCurve.getPointAt(tk);
      var tgt = monoCurve.getPointAt((tk + 0.01) % 1);
      monoTrain.position.copy(pos);
      monoTrain.lookAt(tgt);
    }

    renderer.render(scene, camera);
  }
})();
