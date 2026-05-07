import { promises as fs } from "node:fs";
import path from "node:path";

const ROOTS = ["src"];
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".md"]);

// Order matters for some replacements (longer first)
const REPLACEMENTS = [
  // rgba blue → rgba teal
  ["rgba(37, 99, 235", "rgba(79, 149, 152"],
  ["rgba(37,99,235", "rgba(79,149,152"],

  // primary hex
  ["#2563EB", "#4F9598"],
  ["#2563eb", "#4F9598"],
  ["#1D4ED8", "#3E7B7E"],
  ["#1d4ed8", "#3E7B7E"],
  // primary-light variations
  ["#3B82F6", "#6FAEB1"],
  ["#3b82f6", "#6FAEB1"],
  ["#60A5FA", "#88BFC1"],
  ["#60a5fa", "#88BFC1"],
  ["#93C5FD", "#A8CECF"],
  ["#93c5fd", "#A8CECF"],
  // tints
  ["#DBEAFE", "#D4E8E9"],
  ["#dbeafe", "#D4E8E9"],
  ["#EFF6FF", "#EAF4F4"],
  ["#eff6ff", "#EAF4F4"],
  ["#BFDBFE", "#B5D7D8"],
  ["#bfdbfe", "#B5D7D8"],
  // dark blue accents
  ["#1E40AF", "#3E7B7E"],
  ["#1e40af", "#3E7B7E"],
  // light blue surface
  ["#F0F6FF", "#F0F8F8"],
  ["#f0f6ff", "#F0F8F8"],
];

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip node_modules, .next, generated prisma client
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "generated") continue;
      yield* walk(full);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (EXTS.has(ext)) yield full;
    }
  }
}

let totalChanged = 0;
for (const root of ROOTS) {
  for await (const file of walk(root)) {
    const original = await fs.readFile(file, "utf8");
    let updated = original;
    for (const [from, to] of REPLACEMENTS) {
      updated = updated.split(from).join(to);
    }
    if (updated !== original) {
      await fs.writeFile(file, updated, "utf8");
      totalChanged++;
      console.log(`updated ${file}`);
    }
  }
}
console.log(`\nTotal files updated: ${totalChanged}`);
