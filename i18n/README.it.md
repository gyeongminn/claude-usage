<!-- it -->
[English](../README.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [日本語](README.ja.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [中文](README.zh-CN.md) | [Italiano](README.it.md) | [Tiếng Việt](README.vi.md)

# Claude Usage

Un’app desktop nativa, residente nella tray, che **visualizza i tuoi dati [ccusage](https://github.com/ryoppippi/ccusage) in tempo reale** e **genera automaticamente un report PDF mensile**.

Realizzata con Electron + ECharts. Cross-machine e autonoma: nessun Node, ccusage o font da preinstallare sulla macchina di destinazione.

_Screenshot in arrivo._

## Funzionalità

- **Dashboard live** (UI chiara stile Toss): indicatore di consumo del blocco attivo di 5 h ($/h e token/h), andamento giornaliero costo/token, donut dei modelli, KPI di oggi e progetti principali.
- **Report PDF mensile** (4 pagine): copertina + riepilogo, andamento giornaliero, dettaglio (modelli, composizione token, efficienza cache), progetti e sessioni.
- **Costo e token sono equivalenti** ovunque; l’USD è mostrato accanto al KRW (`$X (₩Y)`).
- **Residente nella tray** con avvio automatico; il report viene generato il 1° di ogni mese, con un recupero all’avvio.
- **i18n**: interfaccia in 10 lingue, applicata automaticamente in base alla locale di sistema. Report PDF in inglese o coreano.

## Installazione

Scarica l’ultima versione per la tua piattaforma dalla pagina [Releases](https://github.com/gyeongminn/claude-usage/releases):

- **Windows**: `ClaudeUsage-<version>-win-x64-setup.exe` (installer) o `...-portable.exe` (senza installazione). Installazione silenziosa: `ClaudeUsage-...-setup.exe /S`.
- **macOS**: `ClaudeUsage-<version>-mac-<arch>.dmg` o `.zip`.

### Eseguire dai sorgenti

```sh
npm install
npm start
```

## Sviluppo

```sh
npm test
npm start
npm run shot
```

### Build e rilascio

```sh
npm run build
npm run release:patch
```

## Fonte dati

Tutti i numeri di utilizzo provengono dalla CLI [ccusage](https://github.com/ryoppippi/ccusage), che legge `~/.claude/projects/**/*.jsonl` (o `CLAUDE_CONFIG_DIR`). I prezzi provengono da ccusage; i valori in KRW sono convertiti dall’USD con un tasso di cambio in tempo reale (con fallback offline). Questa app si limita a visualizzare e creare report; non reimplementa l’aggregazione di ccusage.

## Licenza

[MIT](../LICENSE) © gyeongmin
