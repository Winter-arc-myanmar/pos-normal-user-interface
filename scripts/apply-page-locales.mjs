import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import en from "../src/lib/i18n/locales/en.json" with { type: "json" };
import phraseMap from "./i18n-phrase-map.json" with { type: "json" };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function translateTree(tree, lang) {
  if (typeof tree === "string") {
    const entry = phraseMap[tree];
    const value = entry?.[lang];
    if (typeof value !== "string") {
      throw new Error(`Missing ${lang} translation for: ${tree}`);
    }
    return value;
  }
  if (!tree || typeof tree !== "object" || Array.isArray(tree)) return tree;
  const next = {};
  for (const [key, value] of Object.entries(tree)) {
    next[key] = translateTree(value, lang);
  }
  return next;
}

function writeLocale(filename, lang) {
  const target = path.join(root, "src/lib/i18n/locales", filename);
  const json = `${JSON.stringify(translateTree(en, lang), null, 2)}\n`;
  fs.writeFileSync(target, json, "utf8");
}

writeLocale("my.json", "my");
console.log("Wrote my.json");
