#!/usr/bin/env node
/* real_plink_check.mjs: run the practical's PLINK commands on the toy data with real PLINK 1.9 and with the
   lab's emulator (assets/js/lab/plink-core.js), and compare, step by step, the exit code, every file the step
   writes (SHA-256) and the step's .log (after removing the lines that name the program, computer, folder,
   times, random seed, memory and threads). With --write it records real PLINK's results in
   tools/real-plink-1.9.0.json, which test_lab.mjs (section J) checks the emulator against without PLINK.
   Author: CORE.

   Usage, from the repository root:
     PLINK_BIN=/path/to/plink node 1-introduction-gwas-qc/tools/real_plink_check.mjs           compare
     PLINK_BIN=/path/to/plink node 1-introduction-gwas-qc/tools/real_plink_check.mjs --write   compare, then record
     ... --keep DIR    run real PLINK in DIR (kept afterwards) instead of a temporary folder

   Real PLINK runs in a folder that mirrors the lab's layout (data/inputs/penncath_withPheno, data/inputs/ref,
   analysis), and both programs get the same paths, relative to that folder, so their logs wrap lines alike.
   The commands are make_data_card.mjs's practicalCommands(), GrafAnc steps excluded. Exits 1 on a difference. */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { practicalCommands, setupFiles, exerciseRemoveList, awkUpdateIds, WORK, INPUT_DIR, REFERENCE_DIR, ANALYSIS_DIR } from "./make_data_card.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LECTURE = path.resolve(HERE, "..");
export const FIXTURE = path.join(HERE, "real-plink-1.9.0.json");
const require = createRequire(import.meta.url);

export const sha256 = d => crypto.createHash("sha256").update(typeof d === "string" ? Buffer.from(d, "utf8") : Buffer.from(d)).digest("hex");
const DROP = [/^PLINK v1\.9/, /^\(C\) 2005/, /^In-browser teaching emulator/, /^Hostname:/, /^Working directory:/, /^Start time:/,
  /^End time:/, /^Random number seed:/, /MB RAM detected; reserving/, /^Using (up to )?\d+ threads?/, /^Using 1 thread/];
/* A .log without the lines that legitimately differ between runs and computers. */
export function normLog(text) {
  const out = text.replace(/\r/g, "").split("\n").map(l => l.replace(/^\[stderr\] /, "").trimEnd()).filter(l => !DROP.some(r => r.test(l)));
  while (out.length && out[out.length - 1] === "") out.pop();
  while (out.length && out[0] === "") out.shift();
  return out.join("\n") + "\n";
}
const rel = a => (a.startsWith(WORK + "/") ? a.slice(WORK.length + 1) : a);

/* The emulator's side: {step: {exit, files: {name: sha256}, log: sha256 of the normalized log}}. */
export function emulatorRecord(dataDir, PlinkCore) {
  const { mem } = setupFiles(dataDir), rec = {};
  for (const c of practicalCommands()) {
    if (c.argv) {
      const io = mem.io(), r = PlinkCore.run(c.argv.map(rel), io), files = {};
      let log = null;
      for (const p of r.outputs) {
        const d = mem.read(p), name = path.basename(p);
        if (d == null) continue;
        if (name.endsWith(".log")) log = sha256(normLog(typeof d === "string" ? d : Buffer.from(d).toString("utf8")));
        else files[name] = sha256(d);
      }
      rec[c.key] = { exit: r.code, files, log };
    } else if (c.lists) {
      const t = exerciseRemoveList(mem);
      mem.write(ANALYSIS_DIR + "/toy.extra.exercise_remove.txt", t);
      rec[c.key] = { files: { "toy.extra.exercise_remove.txt": sha256(t) } };
    } else if (c.key === "awk_update_ids") {
      const t = awkUpdateIds(mem.text(ANALYSIS_DIR + "/toy.geno0.01.mind0.01.fam"));
      mem.write(ANALYSIS_DIR + "/toy.updateIDs.txt", t);
      rec[c.key] = { files: { "toy.updateIDs.txt": sha256(t) } };
    }
  }
  return rec;
}

function listFiles(dir) {
  const res = new Map();
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isFile()) continue;
    const f = path.join(dir, e.name), st = fs.statSync(f);
    res.set(e.name, st.mtimeMs + ":" + st.size + ":" + sha256(fs.readFileSync(f)));
  }
  return res;
}
/* Real PLINK's side, in the same form; also returns the program's first log line. */
function realRecord(dataDir, plink, root) {
  const map = p => root + p.slice(WORK.length);
  for (const d of [INPUT_DIR, REFERENCE_DIR, ANALYSIS_DIR]) fs.mkdirSync(map(d), { recursive: true });
  for (const f of ["toy.bed", "toy.bim", "toy.fam"]) fs.copyFileSync(path.join(dataDir, f), path.join(map(INPUT_DIR), f));
  for (const f of ["toy_1kg.bed", "toy_1kg.bim", "toy_1kg.fam"]) fs.copyFileSync(path.join(dataDir, f), path.join(map(REFERENCE_DIR), f));
  const disk = { text: p => { const f = map(p); return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null; } };
  const rec = {};
  let program = null;
  for (const c of practicalCommands()) {
    if (c.argv) {
      const before = listFiles(map(ANALYSIS_DIR));
      const r = spawnSync(plink, c.argv.map(rel), { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });
      if (r.error) throw r.error;
      const files = {};
      let log = null;
      for (const [name, sig] of listFiles(map(ANALYSIS_DIR))) {
        if (before.get(name) === sig) continue;
        const d = fs.readFileSync(path.join(map(ANALYSIS_DIR), name));
        if (name.endsWith(".log")) { log = sha256(normLog(d.toString("utf8"))); program = program || d.toString("utf8").split("\n")[0].trim(); }
        else files[name] = sha256(d);
      }
      rec[c.key] = { exit: r.status, files, log };
    } else if (c.lists) {
      const t = exerciseRemoveList(disk);
      fs.writeFileSync(map(ANALYSIS_DIR + "/toy.extra.exercise_remove.txt"), t);
      rec[c.key] = { files: { "toy.extra.exercise_remove.txt": sha256(t) } };
    } else if (c.key === "awk_update_ids") {
      const t = awkUpdateIds(disk.text(ANALYSIS_DIR + "/toy.geno0.01.mind0.01.fam"));
      fs.writeFileSync(map(ANALYSIS_DIR + "/toy.updateIDs.txt"), t);
      rec[c.key] = { files: { "toy.updateIDs.txt": sha256(t) } };
    }
  }
  return { rec, program };
}

/* Differences between two records, as lines of text (none when they agree). */
export function compareRecords(emu, real) {
  const out = [];
  for (const key of Object.keys(real)) {
    const a = emu[key], b = real[key];
    if (!a) { out.push(key + ": missing from the emulator's run"); continue; }
    if (b.exit !== undefined && a.exit !== b.exit) out.push(key + ": exit code " + a.exit + ", real PLINK " + b.exit);
    for (const n of new Set([...Object.keys(a.files), ...Object.keys(b.files)])) {
      if (!(n in a.files)) out.push(key + ": " + n + " written by real PLINK only");
      else if (!(n in b.files)) out.push(key + ": " + n + " written by the emulator only");
      else if (a.files[n] !== b.files[n]) out.push(key + ": " + n + " differs");
    }
    if (b.log !== undefined && a.log !== b.log) out.push(key + ": .log differs (after normalizing)");
  }
  return out;
}

function main() {
  const args = process.argv.slice(2), plink = process.env.PLINK_BIN;
  if (!plink) { console.error("Set PLINK_BIN to the real plink executable."); process.exit(2); }
  const keepAt = args.indexOf("--keep");
  const root = keepAt >= 0 ? path.resolve(args[keepAt + 1]) : fs.mkdtempSync(path.join(os.tmpdir(), "real-plink-"));
  const dataDir = path.join(LECTURE, "data");
  const PlinkCore = require(path.join(LECTURE, "assets", "js", "lab", "plink-core.js"));
  const emu = emulatorRecord(dataDir, PlinkCore);
  const { rec: real, program } = realRecord(dataDir, plink, root);
  if (keepAt < 0) fs.rmSync(root, { recursive: true, force: true });
  const diffs = compareRecords(emu, real);
  let files = 0;
  for (const k of Object.keys(real)) files += Object.keys(real[k].files).length;
  console.log("Real program: " + program + " (" + plink + ")");
  console.log(Object.keys(real).length + " steps, " + files + " output files, " + Object.values(real).filter(r => r.log).length + " logs compared");
  if (diffs.length) console.log("Differences:\n  " + diffs.join("\n  "));
  else console.log("The emulator's exit codes, files and logs equal real PLINK's.");
  if (args.includes("--write")) {
    const fixture = {
      about: "Real PLINK's results for the practical's commands on data/ (tools/real_plink_check.mjs --write): exit code, SHA-256 of each file written and of the normalized .log. test_lab.mjs section J checks the emulator against these.",
      program, platform: process.platform + " " + process.arch, recorded: new Date().toISOString().slice(0, 10),
      data: Object.fromEntries(["toy.bed", "toy.bim", "toy.fam", "toy_1kg.bed", "toy_1kg.bim", "toy_1kg.fam"].map(f => [f, sha256(fs.readFileSync(path.join(dataDir, f)))])),
      steps: real
    };
    fs.writeFileSync(FIXTURE, JSON.stringify(fixture, null, 1) + "\n");
    console.log("Wrote " + path.relative(process.cwd(), FIXTURE));
  }
  process.exit(diffs.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
