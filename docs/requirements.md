# AWS SAA 学習用問題集アプリ 要件定義書

最終更新: 2026-06-30

## 1. 背景・目的

- 受験者（本リポジトリのオーナー）が **AWS Certified Solutions Architect – Associate（SAA-C03）** を受験する。
- 学習リソースとして **ExamTopics**（および同データを整理した二次サイト）の問題・選択肢・コミュニティ投票・Discussion を活用する。
- これらを取得し、**日本語に変換**したうえで、出題・採点・解説・進捗管理ができる **学習用問題集アプリ** を構築する。

> 注: 利用規約・著作権に関する判断は別セッションで合意済みのため、本書では扱わない。本書は「目的を達成するための実現方法」のみを定義する。

## 2. 用語

| 用語 | 意味 |
|---|---|
| Suggested Answer | ExamTopics がページ上で「正解」として表示する回答。**誤りが多い**ことが知られる |
| Community vote distribution | ユーザー投票による回答分布（例: `C 78% / B 15% / ...`） |
| Discussion | 各問へのユーザーコメント群（`Selected Answer: X` と理由、upvote 数、Highly Voted フラグ） |
| Adopted Answer | 本アプリが**学習上の正解として採用**する回答。原則 **コミュニティ投票の最多回答** |

## 3. 設計上の最重要原則

参考記事でも明言されているとおり、**ExamTopics の Suggested Answer は誤りが多い**。
本アプリは以下を鉄則とする。

1. **学習用の正解 = コミュニティ投票の最多回答（Adopted Answer）** を第一とする。
2. Suggested Answer・投票分布・Discussion は**併記して保存**し、ユーザーが根拠を検証できるようにする。
3. 投票割合・票数から **確信度（confidence）** を付与し、低確信度の問題は明示する。

## 4. スコープ

### 今回（本セッション）
- 要件定義書の確定（本書）
- **収集パイプラインの試作**（数問を対象に、取得 → 構造化 JSON 生成まで）

### 将来フェーズ（順次）
- 全問（SAA-C03 は約900問規模）の収集
- 日本語翻訳パイプライン
- 学習アプリ（SPA）の実装

### 対象外
- 規約・著作権の検討（合意済み）
- 他試験への汎用化（将来検討。データモデルは `examCode` で拡張可能にしておく）

## 5. 全体アーキテクチャ（パイプライン）

```
[1] 収集 Collector            (Node + Playwright / ローカル実ブラウザ)
      exam-topics の問題ページを巡回し、
      問題文 / 選択肢 / Suggested Answer / 投票分布 / Discussion を抽出
        │  raw HTML（任意でキャッシュ） + 抽出ログ
        ▼
[2] 構造化 Normalizer         (Node)
      1問=1レコードの正規化 JSON へ。
      Adopted Answer（投票最多）と confidence を算出
        │  data/questions.en.json
        ▼
[3] 翻訳 Translator           (Claude Code 自身 / サブスク枠内)
      問題文・選択肢・（任意で要点解説）を日本語化。
      バッチ処理・差分翻訳（未翻訳分のみ）
        │  data/questions.ja.json
        ▼
[4] 問題集アプリ Study App     (Vite + React + TS / ローカル SPA)
      出題・採点・解説表示・進捗管理（localStorage）
```

各ステージは**疎結合**で、中間生成物（JSON）をファイルで受け渡す。
これにより「収集だけ」「翻訳だけ」を独立して再実行でき、試作・段階開発に向く。

## 6. 機能要件

### 6.1 収集（Collector）
- **C-1** 対象試験（SAA-C03）の全問題ページURL一覧を取得できる。
- **C-2** 1問ごとに以下を抽出する:
  - 問題番号 / Topic 番号 / ソースURL
  - 問題文（本文）
  - 選択肢（A〜E、テキスト）
  - Suggested Answer
  - コミュニティ投票分布（回答記号と割合、可能なら票数）
  - Discussion（投稿者、Selected Answer、upvote 数、Highly Voted、本文）
- **C-3** 閲覧制限モーダル/オーバーレイを**DOM操作で除去**して本文を取得する。
- **C-4** bot対策回避のため、実ブラウザ・適切な待機・**アクセス間隔（スロットリング）**・リトライを行う。
- **C-5** 取得結果は**再取得不要なようキャッシュ**（raw HTML 保存）し、パースは何度でもローカルで再実行可能とする。
- **C-6** 失敗した問題を**ログに記録**し、後から再取得できる。

### 6.2 構造化（Normalizer）
- **N-1** raw データを §7 のスキーマに正規化する。
- **N-2** **Adopted Answer = 投票最多** を算出。複数正解問題（"Choose two" 等）も判定する。
- **N-3** confidence を算出（例: 最多票割合・総票数で `high/medium/low`）。
- **N-4** 投票が無い/割れている問題に**要確認フラグ**を立てる。

### 6.3 翻訳（Translator）
- **T-1** 問題文・選択肢を日本語化。**AWSサービス名・技術用語は原語を維持**（例: "S3", "VPC", "EBS"）。
- **T-2** 既訳分はスキップし、**未翻訳の差分のみ**翻訳する（再実行コスト最小化）。
- **T-3** 翻訳は **Claude Code（サブスク枠）** で実施。外部有料APIは使わない。
- **T-4**（任意）Discussion の要点から**日本語の簡潔な解説**を生成する。
- **T-5** 原文（en）は常に保持し、UIで原文/訳文を切替表示できる。

### 6.4 問題集アプリ（Study App）
- **A-1** 問題を1問ずつ出題し、選択肢を選んで**採点**できる。
- **A-2** 採点後に **Adopted Answer・投票分布・Discussion要点・原文** を表示する。
- **A-3** 出題モード: 順番 / ランダム / **苦手のみ（誤答履歴）** / 未回答のみ。
- **A-4** **進捗・成績を localStorage に保存**（正答率、回答履歴、ブックマーク）。
- **A-5** 絞り込み: Topic番号、タグ（サービス分類）、確信度、要確認フラグ。
- **A-6** 日本語/英語の表示切替。
- **A-7** （任意）模試モード（N問・制限時間・最後にまとめて採点）。

## 7. データモデル（正規化スキーマ）

`data/questions.json`（en/ja を同一レコードに内包）。

```jsonc
{
  "id": "saa-c03-0001",          // 一意ID
  "examCode": "SAA-C03",
  "questionNumber": 1,
  "topic": 1,
  "sourceUrl": "https://...",
  "isMultipleAnswer": false,       // "Choose two" 等
  "question": { "en": "...", "ja": "..." },
  "options": [
    { "key": "A", "text": { "en": "...", "ja": "..." } },
    { "key": "B", "text": { "en": "...", "ja": "..." } }
  ],
  "siteSuggestedAnswer": ["C"],    // ExamTopics の Suggested Answer
  "communityVote": [               // 投票分布（降順）
    { "answer": "C", "percent": 78, "count": null },
    { "answer": "B", "percent": 15, "count": null }
  ],
  "adoptedAnswer": ["C"],          // 学習用の正解 = 投票最多
  "answerConfidence": "high",      // high | medium | low
  "needsReview": false,            // 投票無し/割れ等で要確認
  "discussion": [
    {
      "author": "user123",
      "selectedAnswer": "C",
      "upvotes": 42,
      "highlyVoted": true,
      "comment": { "en": "...", "ja": "..." }
    }
  ],
  "explanation": { "en": null, "ja": null },  // 任意の補足解説
  "tags": ["VPC", "S3"],           // 任意のサービス分類
  "collectedAt": "2026-06-30",
  "translatedAt": null
}
```

- en/ja を1レコードに内包することで、翻訳前でもアプリが動作する（T-5/A-6 を満たす）。
- `adoptedAnswer` と `communityVote` を分離することで §3 の原則を担保。

## 8. 非機能要件

- **NF-1 冪等性**: 収集・翻訳は再実行しても重複生成せず、差分のみ処理。
- **NF-2 耐障害性**: 途中失敗しても再開可能（チェックポイント/失敗ログ）。
- **NF-3 礼節あるアクセス**: スロットリング・適切な待機でサーバ負荷を抑える。
- **NF-4 ローカル完結**: 取得・翻訳・閲覧すべてローカルで完結（サーバ不要）。
- **NF-5 データ可搬性**: 中間生成物は素の JSON。エディタ/他ツールでも扱える。

## 9. 推奨技術スタック

| レイヤ | 採用 | 根拠 |
|---|---|---|
| 収集 | **Node.js + Playwright (Chromium, headed)** | 実ブラウザでbot対策を回避しやすい。DOM操作でモーダル除去が容易 |
| 構造化 | **Node.js（素のスクリプト）** | 収集と同一ランタイムで完結 |
| 翻訳 | **Claude Code（サブスク枠）** | 追加課金なし・用語文脈に強い。Workflow の `agent()` でバッチ化も可 |
| アプリ | **Vite + React + TypeScript** | ビルド軽量・SPAで完結・localStorage進捗管理が容易・拡張性 |
| データ | **JSON ファイル** | サーバ不要。Git管理・差分確認が容易 |

> シンプル最優先なら「単一HTML+JS+JSON」も可能だが、苦手復習・絞り込み・模試など機能拡張を見込み React を推奨。

## 10. ディレクトリ構成（案）

```
aws-exam/
├─ docs/
│  └─ requirements.md          # 本書
├─ collector/                  # 収集 + 構造化（Node + Playwright）
│  ├─ scrape.mjs               # Playwright スクレイパー
│  ├─ parse.mjs                # HTML → 正規化 JSON
│  ├─ cache/                   # raw HTML キャッシュ
│  └─ logs/                    # 失敗ログ
├─ data/
│  ├─ questions.en.json        # 英語（構造化直後）
│  └─ questions.json           # en/ja 統合（アプリが読む）
├─ translator/                 # 翻訳補助（差分抽出・マージ）
└─ app/                        # Vite + React + TS（学習アプリ）
```

## 11. リスク・留意点

- **R-1 bot対策の強化**: サイト構造変更やブロック強化で収集が失敗し得る。→ raw HTML キャッシュ + パース分離で被害を局所化。手動保存HTMLのパースを副系統として用意。
- **R-2 投票が無い/割れる問題**: Adopted Answer の信頼度が落ちる。→ `needsReview` と `confidence` で明示し、Discussion を必ず併記。
- **R-3 翻訳のブレ・誤訳**: 技術用語は原語維持ルールで低減。原文を常時保持し検証可能に。
- **R-4 データ量**: 約900問 + Discussion はサイズ大。→ Topic 単位でのファイル分割も検討。

## 12. マイルストーン

1. **M0（今回）**: 要件定義確定 + 収集試作（数問の取得 → 正規化 JSON 確認）
2. **M1**: 収集を全問へスケール（キャッシュ・再開・失敗再取得を整備）
3. **M2**: 翻訳パイプライン（差分翻訳 + 用語ルール）
4. **M3**: 学習アプリ MVP（出題・採点・解説・進捗）
5. **M4**: 苦手復習・絞り込み・模試モード等の拡張

## 13. 今回の試作で確認すること

- Playwright で実ブラウザ起動 → 対象ページにアクセスできるか（403回避）。
- モーダル除去 → 問題文・選択肢・Suggested Answer・投票分布・Discussion を抽出できるか。
- §7 スキーマの正規化 JSON を数問分生成し、データモデルの妥当性を検証する。
