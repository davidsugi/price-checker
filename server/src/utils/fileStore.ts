import fs from "fs";
import path from "path";
import { type NameMapping, createEmptyMapping } from "../types";

const DATA_PATH = path.join(__dirname, "../../data/mapping.json");

export function readMapping(): NameMapping {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as NameMapping;
    }
    return createEmptyMapping();
  } catch {
    return createEmptyMapping();
  }
}

export function writeMapping(data: NameMapping): void {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    console.error("Failed to write mapping file");
  }
}
