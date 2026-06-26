<!-- pt-BR -->
[English](../README.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [日本語](README.ja.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [中文](README.zh-CN.md) | [Italiano](README.it.md) | [Tiếng Việt](README.vi.md)

# Claude Usage

Um app de desktop nativo, residente na bandeja, que **visualiza seus dados do [ccusage](https://github.com/ryoppippi/ccusage) em tempo real** e **gera automaticamente um relatório PDF mensal**.

Feito com Electron + ECharts. Multiplataforma e autônomo: não é preciso pré-instalar Node, ccusage ou fontes na máquina de destino.

_Capturas de tela em breve._

## Recursos

- **Painel ao vivo** (UI clara estilo Toss): medidor de consumo do bloco ativo de 5 h ($/h e tokens/h), tendência diária de custo/tokens, donut de modelos, KPIs de hoje e top de projetos.
- **Relatório PDF mensal** (4 páginas): capa + resumo, tendência diária, detalhamento (modelos, composição de tokens, eficiência de cache), projetos e sessões.
- **Custo e tokens são equivalentes** em todo lugar; USD exibido com KRW ao lado (`$X (₩Y)`).
- **Residente na bandeja** com início automático; o relatório é gerado no dia 1 de cada mês, com uma rede de segurança na inicialização.
- **i18n**: interface em 10 idiomas, aplicada automaticamente conforme o local do sistema. Relatório PDF em inglês ou coreano.

## Instalação

Baixe a versão mais recente para sua plataforma na página de [Releases](https://github.com/gyeongminn/claude-usage/releases):

- **Windows**: `ClaudeUsage-<version>-win-x64-setup.exe` (instalador) ou `...-portable.exe` (sem instalação). Instalação silenciosa: `ClaudeUsage-...-setup.exe /S`.
- **macOS**: `ClaudeUsage-<version>-mac-<arch>.dmg` ou `.zip`.

### Executar a partir do código-fonte

```sh
npm install
npm start
```

## Desenvolvimento

```sh
npm test
npm start
npm run shot
```

### Build e lançamento

```sh
npm run build
npm run release:patch
```

## Fonte de dados

Todos os números de uso vêm da CLI [ccusage](https://github.com/ryoppippi/ccusage), que lê `~/.claude/projects/**/*.jsonl` (ou `CLAUDE_CONFIG_DIR`). Os preços vêm do ccusage; os valores em KRW são convertidos do USD com uma taxa de câmbio ao vivo (com fallback off-line). Este app apenas visualiza e relata; não reimplementa a agregação do ccusage.

## Licença

[MIT](../LICENSE) © gyeongmin
