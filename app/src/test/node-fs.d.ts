// テスト（Node 上の vitest）から実データファイルを読むための最小型宣言。
// 本番バンドルには含まれない。@types/node を devDependencies に入れたらこのファイルは削除してよい。
declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function existsSync(path: string): boolean;
  export function readdirSync(
    path: string,
    options: { withFileTypes: true },
  ): { name: string; isDirectory(): boolean }[];
}

declare module "node:process" {
  const process: { cwd(): string };
  export default process;
}
