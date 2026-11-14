import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EP1_MANIFEST } from "@/content/episodes";
import { buildSeedSql } from "../../scripts/content/seed-sql.mjs";

const MIGRATIONS = join("supabase", "migrations");
const sql = readdirSync(MIGRATIONS)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join(MIGRATIONS, file), "utf8"))
  .join("\n");

describe("database schema", () => {
  it.each(["profiles", "episodes", "scenes", "progress"])("creates %s with row-level security", (table) => {
    expect(sql).toMatch(new RegExp(`create table public\\.${table}\\b`, "i"));
    expect(sql).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  });

  it("limits progress rows to their owner", () => {
    expect(sql).toMatch(/on public\.progress[\s\S]*?auth\.uid\(\) = user_id/i);
  });

  it("stores roles as runner or editor only", () => {
    expect(sql).toMatch(/role text not null default 'runner' check \(role in \('runner', 'editor'\)\)/i);
  });

  it("ships a seed file that matches the Ep1 manifest", () => {
    const seed = readFileSync(join("supabase", "seed.sql"), "utf8");
    expect(seed).toBe(buildSeedSql([EP1_MANIFEST]));
  });
});
