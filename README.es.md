# inspo

**Investigación de diseño para Claude Code.** Le das una idea. Estudia tu app, saca referencias de Awwwards, Dribbble, Mobbin, Land-book y más, toma screenshots de sitios en vivo, dibuja tu landing en varios estilos con fotos reales y te abre un tablero donde votas todo, componentes 3D incluidos. Luego aprende tu gusto y llega a una dirección de diseño que sí te late.

[English](README.md)

![Tu landing en seis de los dieciséis estilos](docs/styles-grid.jpg)

```
/inspo suscripción de café mexicano de especialidad, tostado cada semana
```

## Qué te da

- **Referencias.** Awwwards, Dribbble, Land-book, Siteinspire, One Page Love, Lapa Ninja y Mobbin, con un navegador real. A los sitios en vivo les toma captura (hero y página completa) y los analiza: fuentes, paleta, bordes, escala tipográfica y con qué están hechos (three.js, GSAP, Lenis, Webflow, Framer, Spline…).
- **Estilos.** Tu propia landing, con tu copy, en 4–6 direcciones distintas. Cada una trae su paleta, fuentes de Google Fonts, layout, textura, tratamiento de imagen y fotos CC0 reales. Incluye 16 presets, y Claude los ajusta o inventa nuevos.
- **Lab.** 18 componentes en vivo de nivel producción (shaders WebGL, globo de puntos, nudo de vidrio, galaxias de partículas, stacks con scroll, botones magnéticos…), más los que Claude escribe para tu idea. Los puedes repintar todos con un estilo que te gustó.
- **El tablero.** Una página local donde votas 👍 / 👎 / ★, marcas *por qué* (layout, tipografía, color, animación, 3D…), dejas notas y le das **Enviar a Claude**. Tiene atajos de teclado, se guarda solo y está en español o inglés.
- **Rondas.** Claude lee tus votos, incluidas las miniaturas de lo que te gustó, y hace una segunda ronda más afinada.
- **Brief.** La dirección final: concepto, principios, paleta, tipografía, estructura de la página, componentes, qué sí y qué no, y tokens CSS. Aparece en el tablero y se escribe en `DESIGN.md`.

| Estilos | Referencias |
|---|---|
| ![](docs/board-styles.jpg) | ![](docs/board-references.jpg) |
| **Lab** | **Brief** |
| ![](docs/board-lab.jpg) | ![](docs/board-brief.jpg) |

## Instalación

En Claude Code:

```
/plugin marketplace add brunovareliuu/inspo
/plugin install inspo@inspo
```

Eso instala la skill `inspo` (el flujo) y el servidor MCP `inspo` (las herramientas). El servidor instala sus dependencias solo la primera vez que arranca. Usa tu Google Chrome; si no tienes Chrome, corre `npx playwright install chromium`.

Necesitas Node 20 o superior.

<details>
<summary>Otros clientes MCP (Cursor, Claude Desktop, Windsurf…)</summary>

```bash
git clone https://github.com/brunovareliuu/inspo ~/inspo && cd ~/inspo && npm install
```

```json
{
  "mcpServers": {
    "inspo": { "command": "node", "args": ["/ruta/absoluta/a/inspo/src/server.js"] }
  }
}
```

Las herramientas funcionan en cualquier cliente. El flujo vive en [`skills/inspo/SKILL.md`](skills/inspo/SKILL.md); pégalo en las reglas o instrucciones de proyecto de tu cliente.
</details>

## Cómo se usa

Solo describe lo que estás haciendo. La skill se activa sola, o la llamas con `/inspo`:

```
/inspo portafolio para un despacho de arquitectura en Monterrey, muy minimalista
/inspo rediseña esta app, parece plantilla
/inspo landing para mi app de notas con IA, me encantan linear.app y stripe.com
```

El ciclo:

1. **Entender.** Claude lee la idea, y tu código si existe (config de Tailwind, variables CSS, layouts), o ve tu app corriendo.
2. **Investigar.** Búsquedas en galerías, capturas de los mejores sitios del nicho, 4–6 direcciones de estilo y componentes.
3. **Votar.** Se abre el tablero en tu navegador. Votas, marcas razones, dejas notas y le das **Enviar a Claude**.
4. **Afinar.** Claude te dice qué aprendió de tu gusto y hace una ronda 2 más enfocada.
5. **Dirección.** Claude publica el brief y `DESIGN.md`, y te ofrece construirlo en tu stack.

Todo lo de un proyecto vive en `<proyecto>/.inspo/<sesión>/`, que se ignora en git automáticamente.

## Herramientas

| Herramienta | Qué hace |
|---|---|
| `inspo_start` | Sesión nueva: idea, contexto y copy real |
| `inspo_search` | Busca en galerías, guarda miniaturas y opcionalmente captura los sitios en vivo |
| `inspo_capture` | Captura y analiza URLs específicas (fuentes, colores, tecnología) |
| `inspo_analyze` | Ve cualquier URL, incluido `localhost`, y regresa captura y ADN de diseño |
| `inspo_add_styles` | Dibuja tu página en direcciones de estilo con fotos reales |
| `inspo_add_component` | Agrega un componente propio al Lab |
| `inspo_add_images` | Agrega un set de imágenes de moodboard (Openverse, con licencia CC) |
| `inspo_open` | Abre el tablero |
| `inspo_feedback` | Lee votos, razones, notas y patrones; puede esperar a **Enviar a Claude** |
| `inspo_next_round` | Empieza la ronda N |
| `inspo_brief` | Publica la dirección final y la escribe en `DESIGN.md` |
| `inspo_remove` | Quita lo que no va |
| `inspo_catalog` | Lista fuentes, presets y componentes |
| `inspo_login` | Inicia sesión en Mobbin una vez, en una ventana visible |

## Fuentes

| Fuente | Sirve para | Notas |
|---|---|---|
| Awwwards | Sitios premiados con mucha animación | Liga al sitio en vivo |
| Dribbble | Estilos visuales, conceptos de UI, renders 3D | |
| Land-book | Estructura de landings completas | Capturas largas |
| Siteinspire | Tipografía, sobriedad, estudios | Liga al sitio en vivo |
| One Page Love | One-pagers y lanzamientos | |
| Lapa Ninja | Landings de SaaS y startups | |
| Mobbin | Pantallas y flujos reales de apps | Necesita cuenta de Mobbin: `inspo_login` |
| Openverse | Fotos para estilos y moodboards | Licencia CC y créditos, sin API key. Prioriza el stock CC0 de StockSnap |

Las galerías cambian su HTML. Si una se rompe, `node bin/inspo.js doctor` te dice cuál, y casi siempre se arregla con un PR de dos líneas en `src/sources/index.js`.

## Estilos incluidos

Swiss Minimal, Editorial Serif, Neo-Brutalist, Dark Luxury, Aurora Glass, Tech Noir, Y2K Chrome, Organic Soft, Synthwave Retro-future, Playful Pop, Terminal Mono, Architectural Monochrome, Wabi-Sabi Zen, Gradient SaaS, Bauhaus Geometric y Magazine Maximalist. Cada uno se puede ajustar (paleta, fuentes, layout, textura, tratamiento de imagen), y Claude también puede pasar HTML totalmente propio. Los detalles están en el [README en inglés](README.md#style-presets).

## Componentes

Liquid Blob, Particle Galaxy, Glass Knot, Wave Terrain, Dot Globe, Gradient Mesh, Floating Shapes, ASCII Shader, Tilt Cards, Spotlight Cards, Magnetic Buttons, Blend Cursor, Editorial Text Reveal, Scramble Text, Noise Editorial Hero, Velocity Marquee, Bento Grid y Sticky Stack Scroll. Cada uno es un solo archivo HTML en [`components/`](components). Cuando eliges uno, Claude lo porta a tu stack (React/Next con R3F, GSAP, Motion…).

## CLI

```bash
node bin/inspo.js serve          # abre el tablero de la última sesión en ./.inspo
node bin/inspo.js sessions       # lista las sesiones
node bin/inspo.js login mobbin   # inicia sesión en Mobbin una vez
node bin/inspo.js doctor         # revisa navegador, red y cada fuente
```

## Uso responsable

inspo es para investigación de diseño privada, como cuando un diseñador guarda capturas en un moodboard. Lee galerías públicas a ritmo humano, guarda las capturas en tu máquina y liga a cada fuente. No redistribuyas el trabajo de otros ni clones sitios: toma los principios, no los pixeles. Las fotos de Openverse conservan sus créditos de licencia; para producción, contrata o licencia fotografía propia. Respeta los términos de cada sitio: Mobbin en particular requiere tu propia cuenta.

## Desarrollo

```bash
npm install
npm test          # tests unitarios sin red
npm run e2e       # maneja el servidor MCP real de punta a punta (necesita red y Chrome)
```

Los PRs son bienvenidos, sobre todo nuevas fuentes, estilos y componentes para el Lab.

## Licencia

MIT © Bruno Varela
