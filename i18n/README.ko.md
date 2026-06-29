<!-- 언어 네비게이션 -->
[English](../README.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [日本語](README.ja.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [中文](README.zh-CN.md) | [Italiano](README.it.md) | [Tiếng Việt](README.vi.md)

# Claude Usage

[ccusage](https://github.com/ryoppippi/ccusage) 데이터를 **실시간으로 시각화**하고 **월별 PDF 보고서를 자동 생성**하는 트레이 상주 네이티브 데스크톱 앱.

Electron + ECharts로 제작. 크로스 머신 · 자립형 — 대상 머신에 Node, ccusage, 폰트를 미리 설치할 필요가 없습니다.

<p align="center">
  <img src="../assets/dashboard.png" alt="Claude Usage — live dashboard" width="380">
</p>

<details>
<summary>스크린샷 더 보기 — 다크 테마, 상세, 반응형 레이아웃</summary>

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

## 기능

- **실시간 대시보드**(토스풍 라이트 UI): 활성 5시간 블록 burn 게이지($/h·토큰/h), 일자별 비용/토큰 추세, 모델 도넛, 오늘 KPI, 프로젝트 Top N.
- **월별 PDF 보고서**(4페이지): 표지+요약, 일자별 추세, 분해(모델·토큰 구성·캐시 효율), 프로젝트·세션.
- **비용과 토큰을 동급**으로 어디서나 병기; USD에 KRW 병기(`$X (₩Y)`).
- **트레이 상주** + 로그인 자동실행; 매월 1일 보고서 자동 생성, 기동 시 catch-up 안전망.
- **다국어**: UI는 10개 언어로 시스템 언어 자동 적용. PDF 보고서는 영어/한국어.

## 설치

[Releases](https://github.com/gyeongminn/claude-usage/releases) 페이지에서 플랫폼별 최신 릴리즈를 받으세요:

- **Windows**: `ClaudeUsage-<version>-win-x64-setup.exe`(인스톨러) 또는 `...-portable.exe`(무설치). 사일런트 설치: `ClaudeUsage-...-setup.exe /S`.
- **macOS**: `ClaudeUsage-<version>-mac-<arch>.dmg` 또는 `.zip`.

### 소스에서 실행

```sh
npm install
npm start
```

## 개발

```sh
npm test           # 테스트 실행 (node --test)
npm start          # 앱 실행
npm run shot       # 검증용 스크린샷 렌더
```

### 빌드 · 릴리즈

```sh
npm run build           # 현재 OS용 인스톨러/포터블 빌드
npm run release:patch   # 버전 bump·태그·푸시 → CI가 빌드·릴리즈 발행
```

릴리즈는 태그 푸시(`v*`) 시 GitHub Actions가 Windows + macOS 매트릭스로 생성합니다. 버전은 `package.json`에서 가져옵니다.

## 데이터 출처

모든 사용량 수치는 [ccusage](https://github.com/ryoppippi/ccusage) CLI에서 옵니다. ccusage는 `~/.claude/projects/**/*.jsonl`(또는 `CLAUDE_CONFIG_DIR`)을 읽습니다. 비용은 ccusage 내장 단가 기준이며, KRW는 USD에 실시간 환율(오프라인 폴백 포함)을 곱해 표시합니다. 이 앱은 시각화·보고만 하며 ccusage의 집계를 재구현하지 않습니다.

## 라이선스

[MIT](../LICENSE) © gyeongmin
