import { describe, it, expect } from "vitest";
import { isSupabaseConfigured } from "./supabase";

describe("isSupabaseConfigured", () => {
  it("テスト環境では環境変数未設定なので false", () => {
    expect(isSupabaseConfigured()).toBe(false);
  });
});
