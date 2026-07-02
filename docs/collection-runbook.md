# 問題の収集・翻訳・解説 Runbook（試験横断）

新しいセッションでも、この手順だけで任意のAWS試験を「収集→翻訳→解説」できる。
既存: SAA-C03(完了) / SAP-C02(収集・翻訳済、解説は #44)。他試験は #45〜#54。

## 方式の要点
- 取得元: ExamTopics の**個別ディスカッションページ**（無料・captcha無し）。`/view/`一覧は課金壁なので使わない。
- URLは Google/WebSearch で問題番号ごとに特定して列挙する。
- **中断耐性**: 各エージェントが結果を即ファイル保存。落ちても再実行/resumeで継続。
- **並列は3**（レート制限回避）。

## モデル（各フェーズ）
| フェーズ | モデル | 理由 |
|---|---|---|
| URL列挙 | **haiku** | 検索結果のタイトル解析だけなので軽量で十分 |
| 翻訳 | **sonnet** | 用語文脈を保った自然な訳 |
| 解説 | **opus** | 誤答理由の精度が高い。Pro/Specialtyはさらに手厚く |

## exam識別子（EXAM）と ExamTopics slug
- EXAM は小文字コード（例: `saa-c03`, `sap-c02`, `dva-c02`, `dop-c02`, `ans-c01` …）。
- ディスカッションURL: `https://www.examtopics.com/discussions/amazon/view/<数字id>-exam-aws-certified-<slug>/`
- 着手時に総問数を確認: `/exams/amazon/<slug>/view/1/` を開き「N questions」を読む（下記プローブ）。
- ツールは未登録EXAMを自動導出（`data/<EXAM>/` 配下）。SAA(=saa-c03)のみ従来の `data/` 直下。

## ディレクトリ
```
data/<EXAM>/
  url-batches/     # 列挙の中間(gitignore)
  disc-urls.json   # 列挙結果 [{questionNumber,url}]
  questions.en.json# 収集(英語)
  questions.json   # en+ja(+explanation) ← 成果物
  ja-input/ ja-output/   # 翻訳中間(gitignore)
  expl-input/ expl-output/# 解説中間(gitignore)
collector/cache/disc-<EXAM>/  # rawHTMLキャッシュ(gitignore)
```

---
## フェーズ0: 総問数の確認（プローブ）
`collector/` で（.profile はログイン済みブラウザセッション）:
```js
// probe.mjs 相当。EXAMのslugで /view/1 を開き総問数を得る
import { chromium } from "playwright"; import path from "node:path";
const slug="aws-certified-...-<CODE>";
const ctx=await chromium.launchPersistentContext(path.resolve(".profile"),{headless:true,channel:"chrome"}).catch(()=>chromium.launchPersistentContext(path.resolve(".profile"),{headless:true}));
const p=ctx.pages()[0]||await ctx.newPage();
await p.goto(`https://www.examtopics.com/exams/amazon/${slug}/view/1/`,{waitUntil:"domcontentloaded"});
console.log(await p.evaluate(()=>document.body.innerText.match(/([\d,]+)\s+questions?/i)?.[1]));
await ctx.close();
```

## フェーズ1: URL列挙（Workflow / haiku / 並列3）
Workflow スクリプト雛形（`<CODE>`,`<slug>`,`<TOTAL>`,`<EXAM>` を置換）:
```js
export const meta = { name:'<EXAM>-url-enumerate', description:'...', phases:[{title:'Enumerate',model:'haiku'}] }
phase('Enumerate')
const DIR = 'C:/Users/sanada/Desktop/ripository/aws-exam/data/<EXAM>/url-batches'
const TOTAL=<TOTAL>, BATCH=17, CONC=3
const targets = Array.isArray(args)&&args.length ? args : Array.from({length:TOTAL},(_,i)=>i+1)
const batches=[]; for(let i=0;i<targets.length;i+=BATCH){const nums=targets.slice(i,i+BATCH);batches.push({nums,a:nums[0],b:nums[nums.length-1]})}
function makePrompt(b){return (
 `AWS <CODE> のExamTopicsディスカッションURLを列挙する軽量エージェント。対象:${JSON.stringify(b.nums)}\n`+
 `1. 各N: web_search \`examtopics <CODE> "question N discussion"\`(allowed_domains ["examtopics.com"]。必ずダブルクオート)。\n`+
 `2. タイトル「... <CODE> topic 1 question N discussion」/ URL https://www.examtopics.com/discussions/amazon/view/<id>-exam-aws-certified-<slug>/ の形式。\n`+
 `3. 全結果からタイトルの question番号Nを厳密に読み(取り違えない)、<EXAM>を含むURLのみ(q,url)抽出。別試験除外。重複排除。\n`+
 `4. Write \`${DIR}/batch-${String(b.a).padStart(4,'0')}-${String(b.b).padStart(4,'0')}.json\` に {"pairs":[{"q":N,"url":"..."}]}。\n5.「saved <件数>」だけ報告。`)}
let done=0
for(let i=0;i<batches.length;i+=CONC){const chunk=batches.slice(i,i+CONC)
 await parallel(chunk.map((b)=>()=>agent(makePrompt(b),{label:`enum:${b.a}-${b.b}`,phase:'Enumerate',model:'haiku'})))
 done+=chunk.length; log(`${done}/${batches.length}`)}
return {batches:batches.length}
```
- **wave内の1体が停止して止まったら**: TaskStop → 同じ scriptPath で `resumeFromRunId` 再開（完了分はキャッシュ）。
- 完了後マージ: `cd collector && EXAM=<EXAM> EXAM_TOTAL=<TOTAL> node merge-urls.mjs`
- 欠番があれば `logs/missing-qnums-<EXAM>.json` を args に渡して同Workflowを再実行 → 再マージ。
- 小さい番号や連番は Google未インデックスで取れないことがある（許容。97%前後が目安）。

## フェーズ2: 本収集（無料・captcha無し・再開可）
```bash
cd collector
EXAM=<EXAM> node scrape-disc.mjs > logs/disc-<EXAM>.log 2>&1   # background推奨
# 失敗はlogs/disc-failures-<EXAM>.jsonに記録。再実行でキャッシュ利用し失敗のみ再取得
# 一部URLだけ: EXAM=<EXAM> node scrape-disc.mjs --file <list.json>
```
→ `data/<EXAM>/questions.en.json`（投票分布＋コメント付き）。

## フェーズ3: 翻訳（Workflow / sonnet / 並列3）
```bash
cd translator && EXAM=<EXAM> node split.mjs --batch 17   # 未訳をbatch分割(questions.jsonをen.jsonから初期化)
```
Workflow雛形（`DIR=.../data/<EXAM>`、`ja-input/<name>`読込→`ja-output/<name>`保存、model sonnet、CONC=3）:
出力形式 `{"results":[{"id","question_ja","options":[{"key","ja"}]}]}`。ルール: AWS用語は原語維持。
```bash
cd translator && EXAM=<EXAM> node merge.mjs   # 完了後マージ
```

## フェーズ4: 解説（Workflow / opus / 並列3）
```bash
cd explainer && EXAM=<EXAM> node split.mjs --batch 17
```
Workflow雛形（`DIR=.../data/<EXAM>`、`expl-input/<name>`読込→`expl-output/<name>`保存、model opus、CONC=3）:
出力形式 `{"explanations":[{"id","text"}]}`。書式「正解は X。」＋誤答を箇条書き、AWS用語原語維持。
- **Pro/Specialty は手厚く**（トレードオフ・引っかけ理由・使い分けに踏み込む。#44参照）。
```bash
cd explainer && EXAM=<EXAM> node merge.mjs
```

## 完了確認
```bash
node -e 'const d=require("./data/<EXAM>/questions.json");console.log("収集",d.length,"翻訳",d.filter(q=>q.question.ja&&q.options.every(o=>o.text.ja)).length,"解説",d.filter(q=>q.explanation?.ja).length)'
```

## 汎用化の状態（コード）
- `collector/scrape-disc.mjs`, `collector/merge-urls.mjs`: EXAM未登録は自動導出。
- `translator/split.mjs`,`merge.mjs` / `explainer/split.mjs`,`merge.mjs`: EXAM=saa-c03 は `data/`、それ以外は `data/<EXAM>/`。
- ワークフロー(列挙/翻訳/解説)は本書の雛形からセッション毎にインライン作成する。
- SAA/SAP の既定動作は不変。
