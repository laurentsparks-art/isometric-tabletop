import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { godotBinary, godotRun, project, tree } from "./lib/godot-isometric.mjs";
const bin = godotBinary();
if (!bin) throw new Error("Godot not found. Set GODOT_BIN to your Godot 4 console executable.");
const engineVersion = godotRun(bin, ["--version"]).trim();
if (!/^4\.7\.2(?:\.|$)/.test(engineVersion)) throw new Error("This source/export is pinned to Godot 4.7.2; found " + engineVersion);
const templates = process.env.GODOT_WEB_TEMPLATES || path.join(tree, ".godot-export/templates");
const target = path.join(project, ".export-templates");
for (const name of ["web_nothreads_debug.zip", "web_nothreads_release.zip"]) {
  const source = path.join(templates, name);
  if (!fs.existsSync(source)) throw new Error("Missing " + source + ". Extract the matching official export_templates.tpz; set GODOT_WEB_TEMPLATES to its templates directory.");
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(source, path.join(target, name));
}
const out = path.join(tree, "ui");
fs.mkdirSync(out, { recursive: true });
console.log(godotRun(bin, ["--editor", "--import"]));
console.log(godotRun(bin, ["--export-release", "ODM Web", path.join(out, "index.html")]));
if (["index.html", "index.js", "index.wasm", "index.pck"].some(name => !fs.existsSync(path.join(out, name)) || fs.statSync(path.join(out, name)).size === 0)) throw new Error("Godot did not produce a complete Web export.");
const files = Object.fromEntries(["index.html","index.js","index.wasm","index.pck"].map(file=>{const b=fs.readFileSync(path.join(out,file));return [file,{bytes:b.length,sha256:createHash("sha256").update(b).digest("hex")}];}));
fs.writeFileSync(path.join(out,"runtime.json"),JSON.stringify({version:1,renderer:"Compatibility",threaded:false,files},null,2));
console.log("Exported single-threaded ODM renderer to " + out);
