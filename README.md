<!-- Language navigation -->
[English](README.md) | [한국어](i18n/README.ko.md) | [Español](i18n/README.es.md) | [Português](i18n/README.pt-BR.md) | [日本語](i18n/README.ja.md) | [Deutsch](i18n/README.de.md) | [Français](i18n/README.fr.md) | [中文](i18n/README.zh-CN.md) | [Italiano](i18n/README.it.md) | [Tiếng Việt](i18n/README.vi.md)

# Claude Usage

A native, tray-resident desktop app that **visualizes your [ccusage](https://github.com/ryoppippi/ccusage) data in real time** and **auto-generates a monthly PDF report**.

Built with Electron + ECharts. Cross-machine and self-contained — no Node, ccusage, or fonts to pre-install on the target machine.

<!-- Screenshots: dashboard and PDF report previews to be added (docs/assets/). -->
_Screenshots coming soon._

## Features

- **Live dashboard** (Toss-style light UI): active 5-hour block burn gauge ($/h and tokens/h), daily cost/token trend, model donut, today's KPIs, and top projects.
- **Monthly PDF report** (4 pages): cover + summary, daily trend, breakdown (models, token composition, cache efficiency), projects & sessions.
- **Cost and tokens are co-equal** everywhere; USD shown with KRW alongside (`$X (₩Y)`).
- **Tray resident** with login auto-launch; the report is generated automatically on the 1st of each month, with a startup catch-up safety net.
- **i18n**: UI in 10 languages, auto-applied from the system locale. PDF report in English or Korean.

## Install

Download the latest release for your platform from the [Releases](https://github.com/gyeongminn/claude-usage/releases) page:

- **Windows**: `ClaudeUsage-<version>-win-x64-setup.exe` (installer) or `...-portable.exe` (no install). Silent install: `ClaudeUsage-...-setup.exe /S`.
- **macOS**: `ClaudeUsage-<version>-mac-<arch>.dmg` or `.zip`.

### Run from source

```sh
npm install
npm start
```

## Development

```sh
npm test           # run the test suite (node --test)
npm start          # launch the app
npm run shot       # render a verification screenshot
```

### Build & release

```sh
npm run build           # build installers/portables for the current OS
npm run release:patch   # bump version, tag, push → CI builds & publishes the release
```

Releases are produced by GitHub Actions on tag push (`v*`) across a Windows + macOS matrix. Version is sourced from `package.json`.

## Data source

All usage figures come from the [ccusage](https://github.com/ryoppippi/ccusage) CLI, which reads `~/.claude/projects/**/*.jsonl` (or `CLAUDE_CONFIG_DIR`). ccusage's bundled pricing is the source of cost figures; KRW values are converted from USD using a live exchange rate (with an offline fallback). This app only visualizes and reports — it does not re-implement ccusage's aggregation.

## License

[MIT](LICENSE) © gyeongmin
