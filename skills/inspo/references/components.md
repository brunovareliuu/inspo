# Components: writing custom ones, porting chosen ones

## Writing a custom Lab component (`inspo_add_component`)

One standalone HTML document that looks alive in a 560×360 iframe *and* full screen.

```html
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { --bg:#0b0b0c; --fg:#f2f1ec; --muted:#8a8a85; --accent:#d6ff3d; --accent2:#7c5cff;
          --font-display:'Inter Tight'; --font-body:'Inter'; }
  html,body { margin:0; height:100%; overflow:hidden; background:var(--bg); color:var(--fg); }
</style>
<script>
  // Let the board re-tint the component with a liked style: ?accent=%23ff4d00&bg=%230b0b0c
  (function(){var q=new URLSearchParams(location.search);['bg','fg','muted','accent','accent2'].forEach(function(k){var v=q.get(k);if(v)document.documentElement.style.setProperty('--'+k,v)})})();
</script>
<script type="importmap">
{ "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
               "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/" } }
</script>
</head>
<body>
<canvas id="c"></canvas>
<script type="module">
  import * as THREE from 'three';
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const accent = new THREE.Color(css('--accent'));
  // … scene. Cap pixel ratio at 2, handle resize, pause when document.hidden
  // and on postMessage 'inspo:pause' / 'inspo:play'.
</script>
</body>
</html>
```

Rules: CDN libraries only (cdn.jsdelivr.net), no remote images, moves on its own (no mouse needed), no console errors. Tailor it to the idea: the product as a 3D object, the brand's signature interaction, a data viz of their real numbers.

## Porting a chosen component into the user's stack

The Lab files are reference implementations, not production code.

- **React / Next.js + three.js** → `@react-three/fiber` + `@react-three/drei`. Move the scene into a `<Canvas>`; shaders become `shaderMaterial` / `<mesh><shaderMaterial …/></mesh>`; the animation loop becomes `useFrame`. Lazy-load the canvas (`next/dynamic`, `ssr:false`) and render a static poster first for LCP.
- **GSAP effects** → `gsap` + `@gsap/react` (`useGSAP`), ScrollTrigger for scroll-driven ones. Or `motion` (Framer Motion) for simpler reveals.
- **CSS effects** (tilt, spotlight, magnetic, marquee) → a small component + CSS module/Tailwind; keep them dependency-free.
- **Tokens** → the brief's `tokensCss` becomes CSS variables in the global stylesheet and, with Tailwind, `theme.extend.colors/fontFamily` pointing at those variables.
- Always: `prefers-reduced-motion`, pause offscreen (IntersectionObserver), DPR ≤ 2, a fallback for no-WebGL.
