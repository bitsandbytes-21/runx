// Usage: node scripts/content/generate-seed.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { buildSeedSql } from "./seed-sql.mjs";

const ep1 = JSON.parse(readFileSync("src/content/ep1.manifest.json", "utf8"));
writeFileSync("supabase/seed.sql", buildSeedSql([ep1]));
console.info("Wrote supabase/seed.sql");
