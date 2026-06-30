// アプリが扱う問題データ型（スリム版: Discussion除外）

export type Confidence = "high" | "medium" | "low";

export interface Bilingual {
  en: string;
  ja: string | null;
}

export interface Option {
  key: string; // "A" | "B" | ...
  en: string;
  ja: string | null;
}

export interface Vote {
  answer: string; // "A" | "BC" 等
  count: number;
  percent: number | null;
}

export interface Question {
  id: string;
  questionNumber: number;
  topic: number;
  isMultipleAnswer: boolean;
  question: Bilingual;
  options: Option[];
  adoptedAnswer: string[]; // 学習用の正解(投票最多)
  communityVote: Vote[];
  answerConfidence: Confidence;
  needsReview: boolean;
}
