import { scanContent } from "./forbidden-patterns.mjs";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if ([".tsx", ".ts", ".jsx", ".css"].includes(extname(name))) out.push(full);
  }
  return out;
}

let all = [];
for (const f of walk("src")) {
  for (const v of scanContent(readFileSync(f, "utf8"), f)) all.push({ ...v, file: f });
}
console.log(JSON.stringify(all, null, 2));
