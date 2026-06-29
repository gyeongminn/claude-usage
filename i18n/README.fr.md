<!-- fr -->
[English](../README.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [日本語](README.ja.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [中文](README.zh-CN.md) | [Italiano](README.it.md) | [Tiếng Việt](README.vi.md)

# Claude Usage

Une application de bureau native, résidente dans la barre d’état système, qui **visualise vos données [ccusage](https://github.com/ryoppippi/ccusage) en temps réel** et **génère automatiquement un rapport PDF mensuel**.

Conçue avec Electron + ECharts. Multiplateforme et autonome : aucun Node, ccusage ni police à préinstaller sur la machine cible.

<p align="center">
  <img src="../assets/dashboard.png" alt="Claude Usage — live dashboard" width="380">
</p>

<details>
<summary>Plus de captures — thème sombre, détails, mise en page responsive</summary>

<table>
  <tr>
    <td width="50%"><img src="../assets/dashboard-dark.png" alt="Dark theme"></td>
    <td width="50%"><img src="../assets/detail.png" alt="Details — model usage share and token composition"></td>
  </tr>
  <tr>
    <td width="50%"><img src="../assets/detail-dark.png" alt="Details (dark theme)"></td>
    <td width="50%"><img src="../assets/responsive.png" alt="Responsive layout at a narrow width"></td>
  </tr>
</table>

</details>

## Fonctionnalités

- **Tableau de bord en direct** (UI claire façon Toss) : jauge de consommation du bloc actif de 5 h ($/h et tokens/h), tendance quotidienne coût/tokens, donut des modèles, KPI du jour et top projets.
- **Rapport PDF mensuel** (4 pages) : couverture + résumé, tendance quotidienne, répartition (modèles, composition des tokens, efficacité du cache), projets et sessions.
- Le **coût et les tokens sont d’égale importance** partout ; l’USD est affiché avec le KRW (`$X (₩Y)`).
- **Résident dans la barre d’état** avec lancement automatique ; le rapport est généré le 1er de chaque mois, avec un rattrapage au démarrage.
- **i18n** : interface en 10 langues, appliquée automatiquement selon la locale du système. Rapport PDF en anglais ou en coréen.

## Installation

Téléchargez la dernière version pour votre plateforme depuis la page [Releases](https://github.com/gyeongminn/claude-usage/releases) :

- **Windows** : `ClaudeUsage-<version>-win-x64-setup.exe` (installateur) ou `...-portable.exe` (sans installation). Installation silencieuse : `ClaudeUsage-...-setup.exe /S`.
- **macOS** : `ClaudeUsage-<version>-mac-<arch>.dmg` ou `.zip`.

### Exécuter depuis les sources

```sh
npm install
npm start
```

## Développement

```sh
npm test
npm start
npm run shot
```

### Build et publication

```sh
npm run build
npm run release:patch
```

## Source des données

Tous les chiffres d’utilisation proviennent de la CLI [ccusage](https://github.com/ryoppippi/ccusage), qui lit `~/.claude/projects/**/*.jsonl` (ou `CLAUDE_CONFIG_DIR`). Les tarifs proviennent de ccusage ; les valeurs en KRW sont converties depuis l’USD avec un taux de change en direct (avec repli hors ligne). Cette app se contente de visualiser et de rapporter ; elle ne réimplémente pas l’agrégation de ccusage.

## Licence

[MIT](../LICENSE) © gyeongmin
