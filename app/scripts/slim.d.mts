import type { Question } from "../src/types";

export interface ExamIndexEntry {
  id: string;
  count: number;
  ids: string[];
}

/** 配信用の問題。データ検査の免除指定(auditWaivers)はアプリでは使わない。 */
export type SlimQuestion = Question & {
  auditWaivers?: ("missing-option" | "embedded-label" | "orphan-answer")[];
};

export function toSlim(all: unknown[]): SlimQuestion[];
export function examIdOf(questionId: string): string;
export function buildIndex(byExam: Record<string, Question[]>): ExamIndexEntry[];
