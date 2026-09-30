# Contributing

Thanks for wanting to make inspo better. A few short rules so changes fit in easily.

## Before you start

- For anything big, open an issue first and say what you want to do. It saves everyone a PR
  that doesn't fit. Questions go to [Discussions](https://github.com/brunovareliuu/inspo/discussions).
- The workflow Claude follows lives in [`skills/inspo/SKILL.md`](skills/inspo/SKILL.md), and
  the tools in [`src/server.js`](src/server.js). Read both before changing how a step works.

## Sending a change

1. Fork the repo and branch from `main` (`git switch -c new-source-behance`).
2. `npm install`, then try it for real: point an MCP client at `src/server.js`, or run
   `node bin/inspo.js serve` to open the board for the latest session in `./.inspo`.
3. Keep commits small, in English.
4. Open the pull request against `main`. The template asks what changed, why and how you tested
   it; [CI](.github/workflows/ci.yml) runs the unit tests on Node 20, 22 and 24 and checks
   every file parses.

## The code

- Plain JavaScript (ES modules), no build step. Write like the code around it: same names,
  same comment density.
- The board is one file, [`src/board/app.html`](src/board/app.html). Every string exists in
  English and Spanish; add both.
- **New sources** go in [`src/sources/index.js`](src/sources/index.js) and should return cards
  with `title`, `url`, `image` and, when the gallery links out, `liveUrl`. Run
  `node bin/inspo.js doctor` to check them.
- **New style presets** go in [`src/styles/presets.js`](src/styles/presets.js); the unit tests
  check their contrast.
- **New Lab components** are one self-contained HTML file in [`components/`](components) that
  reads `--bg --fg --muted --accent --accent2` from the URL. See
  [`skills/inspo/references/components.md`](skills/inspo/references/components.md).
- No real people or client data in tests and examples: fictional brands and names.

## Before you send your PR

```bash
npm test                  # offline unit tests
node bin/inspo.js doctor  # if you touched a source
npm run e2e               # if you touched the harvest or the server (needs network + Chrome)
```

## Security

If you find a vulnerability, **don't open a public issue**. Report it privately with the
**Report a vulnerability** button on the repo's **Security** tab.
