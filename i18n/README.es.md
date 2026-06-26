<!-- es -->
[English](../README.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [日本語](README.ja.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [中文](README.zh-CN.md) | [Italiano](README.it.md) | [Tiếng Việt](README.vi.md)

# Claude Usage

Una app de escritorio nativa, residente en la bandeja, que **visualiza tus datos de [ccusage](https://github.com/ryoppippi/ccusage) en tiempo real** y **genera automáticamente un informe PDF mensual**.

Hecha con Electron + ECharts. Multiplataforma y autónoma: no necesitas instalar Node, ccusage ni fuentes en la máquina de destino.

_Capturas de pantalla próximamente._

## Funciones

- **Panel en vivo** (UI clara estilo Toss): indicador de consumo del bloque activo de 5 h ($/h y tokens/h), tendencia diaria de costo/tokens, donut de modelos, KPIs de hoy y top de proyectos.
- **Informe PDF mensual** (4 páginas): portada + resumen, tendencia diaria, desglose (modelos, composición de tokens, eficiencia de caché), proyectos y sesiones.
- El **costo y los tokens son equivalentes** en todas partes; el USD se muestra junto al KRW (`$X (₩Y)`).
- **Residente en la bandeja** con inicio automático; el informe se genera el día 1 de cada mes, con una red de seguridad al arrancar.
- **i18n**: interfaz en 10 idiomas, aplicada automáticamente según la configuración regional del sistema. Informe PDF en inglés o coreano.

## Instalación

Descarga la última versión para tu plataforma desde la página de [Releases](https://github.com/gyeongminn/claude-usage/releases):

- **Windows**: `ClaudeUsage-<version>-win-x64-setup.exe` (instalador) o `...-portable.exe` (sin instalación). Instalación silenciosa: `ClaudeUsage-...-setup.exe /S`.
- **macOS**: `ClaudeUsage-<version>-mac-<arch>.dmg` o `.zip`.

### Ejecutar desde el código fuente

```sh
npm install
npm start
```

## Desarrollo

```sh
npm test
npm start
npm run shot
```

### Compilación y publicación

```sh
npm run build
npm run release:patch
```

## Fuente de datos

Todas las cifras de uso provienen de la CLI [ccusage](https://github.com/ryoppippi/ccusage), que lee `~/.claude/projects/**/*.jsonl` (o `CLAUDE_CONFIG_DIR`). Los precios provienen de ccusage; los valores en KRW se convierten del USD con un tipo de cambio en vivo (con respaldo sin conexión). Esta app solo visualiza e informa; no reimplementa la agregación de ccusage.

## Licencia

[MIT](../LICENSE) © gyeongmin
