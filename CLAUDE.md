# CLAUDE.md — 作業規約

このリポジトリで作業する際は以下を必ず守ること。

## プロジェクト概要
AWS SAA(SAA-C03)受験のための個人学習用問題集アプリ。
ExamTopics から収集・日本語化した1011問(`data/questions.json`)を、ブラウザ/スマホで解いて学習する。

- データ収集: `collector/`（完了）
- 翻訳: `translator/`（完了。`data/questions.json` が en/ja 内包の正本）
- アプリ: `app/`（Vite + React + TypeScript の静的SPA）
- 配信: GitHub Pages（リポジトリは public）

## 開発ルール（厳守）

### 1. TDD（テスト駆動開発）— 必須
**すべての実装は TDD で行う。**
1. 先に失敗するテストを書く（Red）
2. テストを通す最小実装をする（Green）
3. リファクタする（Refactor）

- ロジック（採点・出題選択・統計など）は純粋関数として `app/src/domain/` に切り出し、ユニットテストを先に書く。
- UIは React Testing Library でコンポーネントテスト、可能なら Playwright でUIスモークテスト。
- テストの無い実装をmainに入れない。

### 2. 品質ゲート — マージ前に必ず通過
`app/` で `npm run check` を実行し、**すべて green** を確認してからマージする。
- `check` = typecheck(`tsc --noEmit`) + lint(eslint) + test(`vitest run`) + build(`vite build`)
- GitHub Actions CI(`.github/workflows/ci.yml`)が同じゲートをPRで実行する。
- **CIがgreen(またはローカルcheckがgreen)を確認してからマージする。** red のままマージしない。

### 3. ブランチ / マージ運用
- `main` は常に green を保つ。
- **適切な機能単位**で feature ブランチを切る（例: `feat/app-quiz`, `feat/app-progress`）。
- 流れ: ブランチ作成 → TDDで実装 → `npm run check` green → push → PR作成 → CI green → **マージ（ユーザー確認不要）** → issueクローズ → 次のブランチへ。
- 自律的に進めてよい（green確認が条件）。

### 4. issue 運用
- 既存issueに対応するブランチで作業する。
- 実装中に issue に無い必要機能が出たら、その場で `gh issue create` して登録してから対応する。
- 完了したらPR本文に `Closes #N` を入れる、またはマージ後に `gh issue close`。

### 5. UX / 学習しやすさ（このアプリの肝）
学習者が使いやすい機能を必ず作り込む:
- 解答後の**即時フィードバック**（正誤＋採用正解＋投票分布）
- **苦手復習**（誤答の自動収集→再出題）、**ブックマーク**
- **進捗の可視化**（正答率・解答数・Topic別・連続正解）
- **中断/再開**（最後に解いた所から）
- スマホ片手操作（大きいタップ領域）/ PC キーボード操作
- オフライン（PWA）

## コマンド
```bash
cd app
npm install
npm run dev      # 開発サーバ
npm run check    # 品質ゲート(typecheck+lint+test+build)
npm test         # テストのみ
npm run build    # ビルド
```
データ更新: `node app/scripts/build-data.mjs`（questions.json → public/questions.slim.json 生成）

## コミット規約
- 末尾に必ず付与:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- PR本文末尾: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

## データの正解の扱い（重要）
学習用の正解は **`adoptedAnswer`（コミュニティ投票最多）** を採用する。
ExamTopics の `siteSuggestedAnswer` は誤りが多いため参考扱い。`communityVote` を併記して根拠を示す。
