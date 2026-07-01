import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ProgressSnapshot } from "../domain/merge";
import type { SyncPayload } from "./gist";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Supabaseの環境変数が設定されているか（未設定ならアカウント機能は無効表示）。 */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(url!, anonKey!)
  : null;

const TABLE = "progress"; // 事前作成: progress(user_id uuid pk, data jsonb, updated_at timestamptz) + RLS

/** メールにログインリンク(マジックリンク/OTP)を送信。 */
export async function signInWithEmail(email: string): Promise<void> {
  if (!supabase) throw new Error("Supabase未設定");
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

/** 自分の進捗をDBから取得。 */
export async function loadAccountProgress(userId: string): Promise<ProgressSnapshot | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABLE).select("data").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data?.data as ProgressSnapshot) ?? null;
}

/** 自分の進捗をDBへ保存(upsert)。 */
export async function saveAccountProgress(userId: string, payload: SyncPayload): Promise<void> {
  if (!supabase) throw new Error("Supabase未設定");
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, data: payload, updated_at: new Date().toISOString() });
  if (error) throw error;
}
