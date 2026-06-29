import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

/* ─────────────────────────────────────────────────
   SCENE BUILDERS — each returns { scene, camera, animate }
   ──────────────────────────────────────────────── */

function buildGlassOrbs(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050510');
  scene.fog = new THREE.FogExp2('#050510', 0.04);
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const p1 = new THREE.PointLight(0x00d4ff, 2, 30); p1.position.set(8, 8, 8); scene.add(p1);
  const p2 = new THREE.PointLight(0xbf00ff, 1.5, 25); p2.position.set(-8, -4, 4); scene.add(p2);

  // Stars background
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(3000 * 3);
  for (let i = 0; i < 3000; i++) {
    starPos[i * 3]     = (Math.random() - 0.5) * 100;
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 100;
    starPos[i * 3 + 2] = (Math.random() - 0.5) * 100;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.7 })));

  // Orbs
  const group = new THREE.Group();
  scene.add(group);
  const colors = [0x00d4ff, 0xbf00ff, 0xff6348, 0x00ff88, 0xffa502, 0x7c3aed];
  const orbs = [];
  for (let i = 0; i < 12; i++) {
    const geo = new THREE.SphereGeometry(0.4 + Math.random() * 0.8, 48, 48);
    const mat = new THREE.MeshPhysicalMaterial({
      color: colors[i % 6], roughness: 0.1, metalness: 0.85,
      clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, opacity: 0.85,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    mesh.userData = {
      baseY: mesh.position.y, speed: 0.3 + Math.random() * 1.5, amp: 0.3 + Math.random() * 0.8,
      rotSpeed: (Math.random() - 0.5) * 0.02,
    };
    group.add(mesh);
    orbs.push(mesh);
  }

  const animate = (t) => {
    group.rotation.y = t * 0.06;
    orbs.forEach(o => {
      o.position.y = o.userData.baseY + Math.sin(t * o.userData.speed) * o.userData.amp;
      o.rotation.x += o.userData.rotSpeed;
      o.rotation.z += o.userData.rotSpeed * 0.5;
    });
  };
  return { scene, camera, animate };
}

function buildNeonGrid() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050510');
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 3, 7);
  camera.lookAt(0, 0, -5);

  scene.add(new THREE.AmbientLight(0xffffff, 0.15));
  const p1 = new THREE.PointLight(0xbf00ff, 3, 20); p1.position.set(0, 6, 0); scene.add(p1);

  // Stars
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(2500 * 3);
  for (let i = 0; i < 2500; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 80;
    starPos[i * 3 + 1] = Math.random() * 40 + 2;
    starPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.6 })));

  // Grid
  const gridMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor1: { value: new THREE.Color('#00d4ff') }, uColor2: { value: new THREE.Color('#bf00ff') } },
    vertexShader: `
      varying vec2 vUv; varying float vEl; uniform float uTime;
      void main() {
        vUv = uv; vec3 p = position;
        float w = sin(p.x * 2.0 + uTime) * 0.3 + sin(p.y * 3.0 + uTime * 0.7) * 0.2;
        p.z += w; vEl = w;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vUv; varying float vEl; uniform vec3 uColor1; uniform vec3 uColor2;
      void main() {
        float gx = step(0.96, fract(vUv.x * 30.0));
        float gy = step(0.96, fract(vUv.y * 30.0));
        float g = max(gx, gy);
        vec3 c = mix(uColor1, uColor2, vUv.y + vEl * 0.5);
        gl_FragColor = vec4(c, g * 0.8 + 0.03);
      }`,
    transparent: true, side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(22, 22, 128, 128), gridMat);
  plane.rotation.x = -Math.PI / 2.5;
  plane.position.set(0, -2, -3);
  scene.add(plane);

  // Horizon glow
  const glow = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 32), new THREE.MeshBasicMaterial({ color: 0xbf00ff, transparent: true, opacity: 0.12 }));
  glow.position.set(0, 1, -12);
  scene.add(glow);

  const animate = (t) => { gridMat.uniforms.uTime.value = t; };
  return { scene, camera, animate };
}

function buildParticleGalaxy() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050510');
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 4, 8);
  camera.lookAt(0, 0, 0);

  const count = 10000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c1 = new THREE.Color('#00d4ff'), c2 = new THREE.Color('#bf00ff'), c3 = new THREE.Color('#ff6348');

  for (let i = 0; i < count; i++) {
    const r = Math.random() * 8;
    const spin = r * 2.5;
    const branch = ((i % 5) / 5) * Math.PI * 2;
    const rx = (Math.random() - 0.5) * Math.pow(Math.random(), 3) * 3;
    const ry = (Math.random() - 0.5) * Math.pow(Math.random(), 3) * 2;
    const rz = (Math.random() - 0.5) * Math.pow(Math.random(), 3) * 3;
    pos[i * 3]     = Math.cos(branch + spin) * r + rx;
    pos[i * 3 + 1] = ry;
    pos[i * 3 + 2] = Math.sin(branch + spin) * r + rz;
    const mc = c1.clone(); mc.lerp(r / 8 < 0.5 ? c2 : c3, r / 8);
    col[i * 3] = mc.r; col[i * 3 + 1] = mc.g; col[i * 3 + 2] = mc.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.04, sizeAttenuation: true, vertexColors: true,
    transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(pts);

  const animate = (t) => { pts.rotation.y = t * 0.05; };
  return { scene, camera, animate };
}

function buildMorphIcosa() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050510');
  scene.fog = new THREE.FogExp2('#050510', 0.03);
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 7);

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const p1 = new THREE.PointLight(0x00d4ff, 2.5, 20); p1.position.set(5, 5, 5); scene.add(p1);
  const p2 = new THREE.PointLight(0xbf00ff, 2, 20); p2.position.set(-5, -5, -5); scene.add(p2);

  // Stars
  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(2000 * 3);
  for (let i = 0; i < 2000; i++) { sp[i*3]=(Math.random()-0.5)*80; sp[i*3+1]=(Math.random()-0.5)*80; sp[i*3+2]=(Math.random()-0.5)*80; }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.6 })));

  // Main icosahedron with vertex displacement shader
  const icoMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color('#7c3aed') },
      uColor2: { value: new THREE.Color('#00d4ff') },
    },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vPosition; uniform float uTime;
      void main() {
        vNormal = normal; vPosition = position;
        vec3 p = position;
        float d = sin(p.x * 3.0 + uTime * 2.0) * sin(p.y * 3.0 + uTime * 1.5) * sin(p.z * 3.0 + uTime) * 0.35;
        p += normal * d;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vNormal; varying vec3 vPosition; uniform vec3 uColor1; uniform vec3 uColor2;
      void main() {
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.0);
        vec3 c = mix(uColor1, uColor2, fresnel);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 12), icoMat);
  scene.add(ico);

  // Orbiting ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.5, 0.025, 16, 100),
    new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.35 })
  );
  scene.add(ring);

  const animate = (t) => {
    icoMat.uniforms.uTime.value = t;
    ico.rotation.x = t * 0.15;
    ico.rotation.y = t * 0.1;
    ring.rotation.x = t * 0.3;
    ring.rotation.y = t * 0.2;
  };
  return { scene, camera, animate };
}

function buildCosmicWaves() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050510');
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 3, 7);
  camera.lookAt(0, 0, -2);

  // Stars
  const starGeo = new THREE.BufferGeometry();
  const sp2 = new Float32Array(2000 * 3);
  for (let i = 0; i < 2000; i++) { sp2[i*3]=(Math.random()-0.5)*80; sp2[i*3+1]=Math.random()*40+2; sp2[i*3+2]=(Math.random()-0.5)*80; }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp2, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.5 })));

  const waveMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv; varying float vEl; uniform float uTime;
      void main() {
        vUv = uv; vec3 p = position;
        float w = sin(p.x*3.0+uTime*0.8)*0.4 + sin(p.y*2.0-uTime*0.5)*0.3 + sin((p.x+p.y)*1.5+uTime*1.2)*0.2;
        p.z += w; vEl = w;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vUv; varying float vEl;
      void main() {
        vec3 deep = vec3(0.0, 0.05, 0.15);
        vec3 cyan = vec3(0.0, 0.83, 1.0);
        vec3 purp = vec3(0.75, 0.0, 1.0);
        float t = (vEl + 0.5) * 0.7;
        vec3 c = mix(deep, mix(cyan, purp, vUv.x), t);
        gl_FragColor = vec4(c, 0.95);
      }`,
    side: THREE.DoubleSide,
  });
  const wave = new THREE.Mesh(new THREE.PlaneGeometry(20, 16, 200, 200), waveMat);
  wave.rotation.x = -Math.PI / 3;
  wave.position.set(0, -1, -2);
  scene.add(wave);

  const animate = (t) => { waveMat.uniforms.uTime.value = t; };
  return { scene, camera, animate };
}

/* ─────────────────────────────────────────────────
   SCENE REGISTRY
   ──────────────────────────────────────────────── */
const BUILDERS = {
  'glass-orbs': buildGlassOrbs,
  'neon-grid': buildNeonGrid,
  'particle-galaxy': buildParticleGalaxy,
  'morph-icosa': buildMorphIcosa,
  'cosmic-waves': buildCosmicWaves,
};

/* ─────────────────────────────────────────────────
   MAIN EXPORTED COMPONENT
   ──────────────────────────────────────────────── */
export default function SplineWallpaper({ sceneUrl }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Build the selected scene
    const builder = BUILDERS[sceneUrl] || buildGlassOrbs;
    const { scene, camera, animate } = builder(renderer);

    // Animation loop — full device FPS for smooth experience
    const clock = new THREE.Clock();
    let frameId;
    const loop = () => {
      frameId = requestAnimationFrame(loop);
      animate(clock.getElapsedTime());
      renderer.render(scene, camera);
    };
    loop();

    // Handle resize
    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      // Dispose all Three.js objects to prevent GPU memory leaks
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [sceneUrl]);

  return (
    <div
      ref={containerRef}
      className="os-wallpaper three-wallpaper-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    />
  );
}
