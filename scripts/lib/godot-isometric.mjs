import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
export const tree = path.resolve(import.meta.dirname, "../..");
export const project = path.join(tree, "godot");
export function godotBinary() {
  if (process.env.GODOT_BIN) return process.env.GODOT_BIN;
  if (process.platform === "win32") {
    const dir = process.env.ProgramFiles || "C:/Program Files";
    for (const entry of fs.readdirSync(dir).filter(n => /^Godot.*win64/i.test(n)).sort().reverse()) {
      const folder = path.join(dir, entry);
      if (fs.statSync(folder).isDirectory()) {
        const exe = fs.readdirSync(folder).find(n => /console\.exe$/i.test(n));
        if (exe) return path.join(folder, exe);
      }
    }
  }
  for (const exe of ["godot", "godot4"]) {
    if (spawnSync(exe, ["--headless", "--version"], { encoding: "utf8", timeout: 10000 }).status === 0) return exe;
  }
  return null;
}
export function godotRun(bin, args) {
  const result = spawnSync(bin, ["--headless", "--path", project, ...args], { cwd: tree, encoding: "utf8", timeout: args.includes("--script") ? 30000 : 180000, maxBuffer: 8000000 });
  const output = (result.stdout || "") + (result.stderr || "");
  if (result.error || result.status !== 0 || /SCRIPT ERROR:|Parse Error:/.test(output)) throw new Error(result.error?.message || output);
  return output;
}
