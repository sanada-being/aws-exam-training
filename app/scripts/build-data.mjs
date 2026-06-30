// データ生成: ../../data/questions.json(翻訳済み正本) から
// アプリ用スリム版 public/questions.slim.json を生成する(Discussion除外で軽量化)。
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "..", "..", "data", "questions.json");
const OUT_DIR = path.resolve(__dirname, "..", "public");
const OUT = path.join(OUT_DIR, "questions.slim.json");

const all = JSON.parse(await readFile(SRC, "utf8"));

const slim = all
  .filter((q) => q.question?.ja && (q.options || []).every((o) => o.text?.ja))
  .map((q) => ({
    id: q.id,
    questionNumber: q.questionNumber,
    topic: q.topic,
    isMultipleAnswer: q.isMultipleAnswer,
    question: { en: q.question.en, ja: q.question.ja },
    options: q.options.map((o) => ({ key: o.key, en: o.text.en, ja: o.text.ja })),
    adoptedAnswer: q.adoptedAnswer,
    communityVote: q.communityVote,
    answerConfidence: q.answerConfidence,
    needsReview: q.needsReview,
  }))
  .sort((a, b) => a.questionNumber - b.questionNumber);

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT, JSON.stringify(slim), "utf8");

const bytes = Buffer.byteLength(JSON.stringify(slim));
console.log(`生成: ${slim.length}問 / ${(bytes / 1048576).toFixed(2)}MB -> ${OUT}`);
