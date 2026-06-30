# aws-exam-training

AWS SAA（SAA-C03）受験のための学習用問題集アプリ。
ExamTopics の問題・選択肢・コミュニティ投票・Discussion を取得し、日本語化して出題・採点・進捗管理を行う。

## ドキュメント
- 要件定義書: [docs/requirements.md](docs/requirements.md)

## パイプライン
```
収集(collector) → 構造化JSON(data) → 翻訳(Claude Code) → 学習アプリ(app)
```

## 収集ルート（重要）
ExamTopics の `/view/`(一覧) は2ページ目以降が課金壁のため、**無料で取得できる個別ディスカッションページ**を巡回する方式を採用。

```bash
cd collector
npm install
npx playwright install chromium
node login.mjs                 # examtopics に手動ログイン（セッションを .profile に保存）

# URL列挙: 問題番号→ディスカッションURL（Web検索。通常は多エージェントWorkflowで実施）
node enumerate.mjs             # 索引由来の補助列挙（限定的）
node merge-urls.mjs            # url-batches/*.json をマージ → data/disc-urls.json

# 本収集（無料・captcha無し）
node scrape-disc.mjs                       # data/disc-urls.json の全URL
node scrape-disc.mjs --file <list.json>    # 指定URLリストのみ
node scrape-disc.mjs <URL>                 # 単一URL
```

## 進捗
- [x] M0: 要件定義 + 収集試作
- [x] M1: 全問収集 — **1012/1019問(99.3%)** を取得（投票分布＋Discussion本文＋コメント付き）。欠番7問(670,701,730,740,814,889,967)はGoogle未インデックスで未取得
- [ ] M2: 日本語翻訳パイプライン
- [ ] M3: 学習アプリ MVP

データ: `data/questions.en.json`（収集本体）, `data/disc-urls.json`（URL一覧）
