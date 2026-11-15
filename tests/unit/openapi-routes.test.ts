import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const API_DIR = join("src", "app", "api");
const METHODS = ["GET", "PUT", "POST", "DELETE", "PATCH"];

function implementedRoutes(): string[] {
  const routes: string[] = [];
  function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name === "route.ts") {
        const source = readFileSync(path, "utf8");
        const url =
          "/" +
          relative(API_DIR, dir)
            .split("\\")
            .join("/")
            .replace(/\[(\w+)\]/g, "{$1}");
        for (const method of METHODS) {
          if (
            new RegExp(
              `export (async function|function|const) ${method}\\b`,
            ).test(source)
          )
            routes.push(`${method} ${url}`);
        }
      }
    }
  }
  walk(API_DIR);
  return routes.sort();
}

function documentedRoutes(): string[] {
  const spec = readFileSync(join("docs", "api", "openapi.yaml"), "utf8");
  const pathsBlock = spec.slice(
    spec.indexOf("\npaths:"),
    spec.indexOf("\ncomponents:"),
  );
  const routes: string[] = [];
  let current = "";
  for (const line of pathsBlock.split("\n")) {
    const path = /^  (\/\S+):\s*$/.exec(line);
    if (path) current = path[1];
    const method = /^    (get|put|post|delete|patch):/.exec(line);
    if (method && current) routes.push(`${method[1].toUpperCase()} ${current}`);
  }
  return routes.sort();
}

describe("OpenAPI spec", () => {
  it("documents exactly the implemented API routes", () => {
    expect(documentedRoutes()).toEqual(implementedRoutes());
  });
});
