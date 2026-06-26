<!-- ja -->
[English](../README.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [日本語](README.ja.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [中文](README.zh-CN.md) | [Italiano](README.it.md) | [Tiếng Việt](README.vi.md)

# Claude Usage

[ccusage](https://github.com/ryoppippi/ccusage) のデータを**リアルタイムで可視化**し、**月次PDFレポートを自動生成**する、トレイ常駐のネイティブデスクトップアプリ。

Electron + ECharts で構築。クロスマシンかつ自己完結型で、対象マシンに Node・ccusage・フォントを事前インストールする必要はありません。

_スクリーンショットは近日公開。_

## 機能

- **ライブダッシュボード**（Toss風ライトUI）: アクティブ5時間ブロックのバーンゲージ（$/h・トークン/h）、日別コスト/トークン推移、モデルドーナツ、今日のKPI、上位プロジェクト。
- **月次PDFレポート**（4ページ）: 表紙+サマリー、日別推移、内訳（モデル・トークン構成・キャッシュ効率）、プロジェクトとセッション。
- どこでも**コストとトークンを同等**に表示。USD は KRW を併記（`$X (₩Y)`）。
- **トレイ常駐**＋ログイン自動起動。レポートは毎月1日に自動生成され、起動時のキャッチアップ機構付き。
- **i18n**: UI は10言語でシステムロケールに自動適用。PDFレポートは英語または韓国語。

## インストール

[Releases](https://github.com/gyeongminn/claude-usage/releases) ページからお使いのプラットフォーム向けの最新リリースを入手してください:

- **Windows**: `ClaudeUsage-<version>-win-x64-setup.exe`（インストーラー）または `...-portable.exe`（インストール不要）。サイレントインストール: `ClaudeUsage-...-setup.exe /S`。
- **macOS**: `ClaudeUsage-<version>-mac-<arch>.dmg` または `.zip`。

### ソースから実行

```sh
npm install
npm start
```

## 開発

```sh
npm test
npm start
npm run shot
```

### ビルドとリリース

```sh
npm run build
npm run release:patch
```

## データ出典

すべての使用量の数値は [ccusage](https://github.com/ryoppippi/ccusage) CLI から取得します。ccusage は `~/.claude/projects/**/*.jsonl`（または `CLAUDE_CONFIG_DIR`）を読み取ります。料金は ccusage の単価に基づき、KRW は USD にライブ為替レート（オフライン時はフォールバック）を掛けて表示します。本アプリは可視化とレポートのみを行い、ccusage の集計を再実装しません。

## ライセンス

[MIT](../LICENSE) © gyeongmin
