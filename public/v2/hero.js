import * as THREE from "./assets/three.module.min.js";
// ORDEL hero: particles fly in as code glyphs and assemble into the ORDEL mark (blue ring + rust dot).
// Same technique family as a THREE.Points + ShaderMaterial morph. Pauses off-screen / hidden tab.
const hero = document.querySelector(".hero");
const canvas = hero && hero.querySelector(".hero-gl");
const mark = hero && hero.querySelector(".hero-mark");
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const HOVER = matchMedia("(hover: hover) and (pointer: fine)").matches;
export function start() {
  if (!canvas || !mark) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "high-performance" }); }
  catch (e) { hero.classList.add("no-gl"); return; }
  const small = Math.min(innerWidth, innerHeight) < 700;
  const PR = Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(PR); renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  const N = small ? 2200 : 6000;
  // 1) sample the ORDEL mark into target points
  const S = 512, off = document.createElement("canvas"); off.width = off.height = S;
  const c = off.getContext("2d", { willReadFrequently: true });
  c.lineCap = "round"; c.lineWidth = 40 * S / 256; c.strokeStyle = "#2563eb";
  c.beginPath(); c.arc(128 * S / 256, 128 * S / 256, 96 * S / 256, Math.atan2(39 - 128, 164 - 128), Math.atan2(92 - 128, 217 - 128), true); // the open ring, as in the logo path
  c.stroke();
  c.fillStyle = "#dc5a2c"; c.beginPath(); c.arc(195.9 * S / 256, 60.1 * S / 256, 26 * S / 256, 0, Math.PI * 2); c.fill();
  const img = c.getImageData(0, 0, S, S).data, pts = [];
  for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) {
    const i = (y * S + x) * 4; if (img[i + 3] > 150) pts.push(x, y, img[i] > 150 ? 1 : 0);
  }
  const P = pts.length / 3;
  const pos = new Float32Array(N * 3), start = new Float32Array(N * 3), rnd = new Float32Array(N * 4),
        col = new Float32Array(N * 3), glyph = new Float32Array(N), size = new Float32Array(N);
  const blue = [[0.42, 0.58, 1.0], [0.15, 0.39, 0.92], [0.55, 0.7, 1.0]], rust = [[0.86, 0.35, 0.17], [0.94, 0.54, 0.36]];
  for (let k = 0; k < N; k++) {
    const dust = Math.random() < 0.07;
    let tx, ty, isRust = 0;
    if (dust) { const a = Math.random() * 6.283, r = 1.05 + Math.random() * 0.55; tx = Math.cos(a) * r; ty = Math.sin(a) * r; }
    else { const j = (Math.random() * P | 0) * 3; tx = (pts[j] + Math.random() * 2 - S / 2) / (S / 2); ty = -(pts[j + 1] + Math.random() * 2 - S / 2) / (S / 2); isRust = pts[j + 2]; }
    pos.set([tx, ty, 0], k * 3);
    const sa = Math.random() * 6.283, sr = 0.6 + Math.pow(Math.random(), 0.6) * 2.4;
    start.set([Math.cos(sa) * sr * 1.6, Math.sin(sa) * sr, Math.random()], k * 3);
    rnd.set([Math.random(), Math.random(), Math.random(), Math.random()], k * 4);
    const cc = isRust ? rust[Math.random() * 2 | 0] : blue[Math.random() * 3 | 0];
    col.set(cc, k * 3);
    glyph[k] = Math.random() * 16 | 0;
    size[k] = dust ? 0.5 + Math.random() * 0.5 : 0.7 + Math.random() * 0.8;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
  geo.setAttribute("aRand", new THREE.BufferAttribute(rnd, 4));
  geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aGlyph", new THREE.BufferAttribute(glyph, 1));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  // 2) glyph atlas: particles begin as code characters
  const atlas = document.createElement("canvas"); atlas.width = 512; atlas.height = 128;
  const ac = atlas.getContext("2d"); ac.fillStyle = "#fff"; ac.textAlign = "center"; ac.textBaseline = "middle";
  ac.font = "700 46px ui-monospace, Menlo, Consolas, monospace";
  ["O","R","D","E","L","0","1","{","}","<",">","/","+","=","λ","∑"].forEach((g, i) => ac.fillText(g, (i % 8) * 64 + 32, Math.floor(i / 8) * 64 + 34));
  const tex = new THREE.CanvasTexture(atlas); tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  const U = {
    uTime: { value: 0 }, uProgress: { value: RM ? 1 : 0 }, uMouse: { value: new THREE.Vector2(9999, 9999) },
    uLens: { value: 0 }, uR: { value: 160 }, uScroll: { value: 0 }, uPR: { value: PR }, uCenter: { value: new THREE.Vector2() },
    uScale: { value: 200 }, uView: { value: new THREE.Vector2(1, 1) }, uDot: { value: small ? 3.6 : 3.4 }, uLight: { value: 0 }, uAtlas: { value: tex }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime,uProgress,uLens,uR,uScroll,uPR,uScale,uDot,uLight; uniform vec2 uMouse,uCenter,uView;
      attribute vec3 aStart; attribute vec4 aRand; attribute vec3 aColor; attribute float aGlyph; attribute float aSize;
      varying vec3 vColor; varying float vMorph; varying float vGlyph; varying float vAlpha;
      void main(){
        float t=clamp((uProgress-aRand.x*0.55)/0.45,0.0,1.0);
        float e=1.0-pow(1.0-t,3.0);
        vec2 tg=uCenter+position.xy*uScale;
        tg+=vec2(sin(uTime*0.9+aRand.y*6.283),cos(uTime*0.8+aRand.z*6.283))*(1.2+aRand.w*1.6);
        float br=sin(uTime*0.6)*0.012; tg=uCenter+(tg-uCenter)*(1.0+br);
        vec2 st=uCenter+aStart.xy*vec2(uView.x*0.5,uView.y*0.55);
        vec2 mid=mix(st,tg,0.5)+vec2((aRand.w-0.5)*uScale*2.2,(aRand.z-0.2)*uScale*1.4);
        vec2 p=mix(mix(st,mid,e),mix(mid,tg,e),e);
        vec2 dm=p-uMouse; float d=length(dm)/uR;
        float k=uLens*e*pow(max(0.0,1.0-d),2.0);
        p+=dm*0.85*k;
        float L=uLens*e*(1.0-smoothstep(0.7,1.0,d));
        float s=uScroll; p+=vec2((aRand.y-0.5)*uView.x*0.9,(0.15+aRand.z)*uView.y*0.9)*s*s;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,0.0,1.0);
        float gs=mix(12.0,uDot*aSize,e);
        gl_PointSize=gs*uPR*(1.0+L*1.4);
        vec3 code=mix(vec3(0.55,0.64,1.0),vec3(0.2,0.3,0.7),uLight);
        vec3 base=mix(code,aColor,smoothstep(0.35,0.95,e));
        vec3 hot=mix(vec3(1.0,0.93,0.82),vec3(0.94,0.45,0.22),step(0.6,aRand.y));
        vColor=mix(base,hot,L*0.85);
        vMorph=smoothstep(0.55,0.95,e);
        vGlyph=aGlyph;
        vAlpha=mix(0.35,1.0,e)*(1.0-s*0.95);
      }`,
    fragmentShader: `
      uniform sampler2D uAtlas; uniform float uLight;
      varying vec3 vColor; varying float vMorph; varying float vGlyph; varying float vAlpha;
      void main(){
        vec2 pc=gl_PointCoord; float d=length(pc-0.5);
        float dotA=smoothstep(0.5,0.0,d); float core=smoothstep(0.22,0.0,d);
        float cx=mod(vGlyph,8.0), cy=floor(vGlyph/8.0);
        float g=texture2D(uAtlas,vec2((cx+pc.x)/8.0,1.0-(cy+pc.y)/2.0)).a;
        float a=mix(g*0.9,dotA*0.75+core*0.5,vMorph);
        if(a<0.02) discard;
        vec3 c=vColor*(mix(0.7,0.9,uLight)+core*mix(0.8,0.2,uLight));
        gl_FragColor=vec4(c,a*vAlpha);
      }`
  });
  const points = new THREE.Points(geo, mat); points.frustumCulled = false; scene.add(points);
  // 3) embers rising around the mark
  const E = small ? 60 : 140, eg = new THREE.BufferGeometry(), es = new Float32Array(E * 4);
  for (let i = 0; i < E * 4; i++) es[i] = Math.random();
  eg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(E * 3), 3));
  eg.setAttribute("aSeed", new THREE.BufferAttribute(es, 4));
  const em = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime,uPR,uScale,uProgress,uScroll; uniform vec2 uCenter; attribute vec4 aSeed; varying float vA; varying float vR;
      void main(){ float life=fract(uTime*(0.04+aSeed.y*0.06)+aSeed.x);
        vec2 p=uCenter+vec2((aSeed.z-0.5)*2.6+sin(uTime*0.7+aSeed.w*6.283)*0.12,-1.3+life*2.8)*uScale;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,0.0,1.0);
        gl_PointSize=(1.2+aSeed.w*2.2)*uPR; vA=sin(life*3.1416)*smoothstep(0.7,1.0,uProgress)*(1.0-uScroll)*0.7; vR=step(0.72,aSeed.y); }`,
    fragmentShader: `varying float vA; varying float vR; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d)*vA; if(a<0.01) discard; gl_FragColor=vec4(mix(vec3(0.45,0.62,1.0),vec3(0.95,0.5,0.3),vR),a); }`
  });
  const embers = new THREE.Points(eg, em); embers.frustumCulled = false; scene.add(embers);
  // layout
  let W = 1, H = 1;
  function layout() {
    const hr = hero.getBoundingClientRect(), mr = mark.getBoundingClientRect();
    W = hr.width; H = hr.height; renderer.setSize(W, H, false);
    camera.left = -W / 2; camera.right = W / 2; camera.top = H / 2; camera.bottom = -H / 2; camera.updateProjectionMatrix();
    U.uCenter.value.set(mr.left - hr.left + mr.width / 2 - W / 2, H / 2 - (mr.top - hr.top + mr.height / 2));
    U.uScale.value = mr.width / 2 * 0.9; U.uView.value.set(W, H); U.uR.value = Math.max(110, mr.width * 0.32);
  }
  function theme() { const light = document.documentElement.getAttribute("data-theme") === "light"; U.uLight.value = light ? 1 : 0;
    mat.blending = em.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending; mat.needsUpdate = em.needsUpdate = true; }
  layout(); theme();
  new MutationObserver(() => { theme(); if (!running) draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  // interaction
  let lensTarget = 0, mx = 9999, my = 9999;
  hero.addEventListener("pointermove", e => { const r = hero.getBoundingClientRect(); mx = e.clientX - r.left - W / 2; my = H / 2 - (e.clientY - r.top); lensTarget = 1; }, { passive: true });
  hero.addEventListener("pointerleave", () => { lensTarget = 0; });
  if (!HOVER) hero.addEventListener("pointerdown", e => { const r = hero.getBoundingClientRect(); mx = e.clientX - r.left - W / 2; my = H / 2 - (e.clientY - r.top); lensTarget = 1; setTimeout(() => lensTarget = 0, 900); }, { passive: true });
  addEventListener("scroll", () => { U.uScroll.value = Math.min(1, Math.max(0, scrollY / (H * 0.85))); if (!running && RM) draw(); }, { passive: true });
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { layout(); if (!running) draw(); }, 120); });
  // loop
  const t0 = performance.now(); let running = false, visible = true, raf = 0, last = t0;
  const DUR = 2600, DELAY = 250;
  function draw() { renderer.render(scene, camera); }
  function frame(now) {
    raf = 0; if (!running) return;
    const dt = Math.min(50, now - last); last = now;
    U.uTime.value += dt / 1000;
    U.uProgress.value = Math.min(1, Math.max(0, (now - t0 - DELAY) / DUR));
    U.uLens.value += (lensTarget - U.uLens.value) * 0.08;
    U.uMouse.value.x += (mx - U.uMouse.value.x) * 0.2; U.uMouse.value.y += (my - U.uMouse.value.y) * 0.2;
    draw(); raf = requestAnimationFrame(frame);
  }
  function setRun(on) { on = on && !RM && visible && !document.hidden && U.uScroll.value < 1; if (on === running) return; running = on; if (on) { last = performance.now(); raf = requestAnimationFrame(frame); } else if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; setRun(true); }).observe(hero);
  document.addEventListener("visibilitychange", () => setRun(true));
  addEventListener("scroll", () => setRun(true), { passive: true });
  hero.classList.add("gl-on");
  draw(); setRun(true);
}
start();
