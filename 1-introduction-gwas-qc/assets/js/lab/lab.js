/* ==========================================================================
   Lecture 1 lab: terminal, shell, virtual file system, charts (window.Lab)
   --------------------------------------------------------------------------
   The in-browser lab of the practical. A reader types the commands of the practical (PLINK 1.9,
   GrafAnc and a small Unix shell) on a toy dataset; output files with real names and columns appear in
   a virtual file system kept in memory, and page widgets read and plot them.

   Load order (all deferred, after site.js):
     toy-data.js (window.TOY_FILES) → data-card.js → plink-core.js (window.PlinkCore)
     → grafanc-core.js (window.GrafAncCore) → lab.js (this file) → rlab.js (optional R console)

   This file has two halves:
     1. A core with no DOM: the virtual file system (VFS), the shell (lexer, parser, expansion,
        executor, ~70 commands), an awk interpreter and a parser for PLINK's whitespace-aligned tables.
        It runs in Node for tests: require() this file to get the core (module.exports = LabCore).
     2. The page part: the Lab API (Lab.ready, Lab.fs, Lab.run, Lab.readTable, Lab.plot.*), the
        terminals rendered from <div class="lab"> and the file panel.
   assets/js/lab/LAB.md documents the markup, the commands and the API for page authors.
   Plain script, no libraries, no network; works from file://.
   ========================================================================== */
(function (G) {
  "use strict";

  /* ======================================================================
     1. Constants and helpers
     ====================================================================== */
  var HOME = "/home/student";
  var PROJECT = HOME + "/statgen-workshop";
  var INPUT_DIR = PROJECT + "/data/inputs/penncath_withPheno";
  var REF_DIR = PROJECT + "/data/inputs/ref";
  var ANALYSIS_DIR = PROJECT + "/analysis";
  var USER = "student", HOST = "lab";
  var LAB_VERSION = "1.0";
  var MAX_LOOP = 100000;          // iterations of a shell loop before the lab stops it

  var TE = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
  var TD = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;

  function utf8Encode(s) {
    if (TE) return TE.encode(s);
    var out = [], i, c;
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      if (c >= 0xd800 && c < 0xdc00 && i + 1 < s.length) { c = 0x10000 + ((c - 0xd800) << 10) + (s.charCodeAt(++i) - 0xdc00); }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | c >> 6, 0x80 | c & 63);
      else if (c < 0x10000) out.push(0xe0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63);
      else out.push(0xf0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63);
    }
    return new Uint8Array(out);
  }
  function utf8Decode(b) {
    if (TD) return TD.decode(b);
    var s = "";
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    try { return decodeURIComponent(escape(s)); } catch (e) { return s; }
  }
  function utf8Length(s) {
    var n = 0, i, c;
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      if (c < 0x80) n += 1;
      else if (c < 0x800) n += 2;
      else if (c >= 0xd800 && c < 0xdc00) { n += 4; i++; }
      else n += 3;
    }
    return n;
  }
  function b64decode(s) {
    s = String(s).replace(/[^A-Za-z0-9+/=]/g, "");
    if (typeof atob === "function") {
      var bin = atob(s), out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    return new Uint8Array(Buffer.from(s, "base64"));
  }
  function latin1(bytes, from, to) {
    var s = "";
    for (var i = from; i < to; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }
  function isBytes(d) { return d instanceof Uint8Array; }
  function pad(s, n, right) {
    s = String(s);
    while (s.length < n) s = right ? s + " " : " " + s;
    return s;
  }
  function hex2(n) { return (n < 16 ? "0" : "") + n.toString(16); }
  function basename(p) { p = String(p).replace(/\/+$/, ""); var i = p.lastIndexOf("/"); return i < 0 ? p : p.slice(i + 1); }
  function dirname(p) {
    p = String(p).replace(/\/+$/, "");
    var i = p.lastIndexOf("/");
    if (i < 0) return ".";
    return i === 0 ? "/" : p.slice(0, i);
  }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); }
  function shellQuote(s) { return /^[A-Za-z0-9_.,\/:@%+=-]+$/.test(s) ? s : "'" + String(s).replace(/'/g, "'\\''") + "'"; }

  /* Sizes as GNU ls -h / du -h print them: powers of 1024, rounded up, one decimal below 10. */
  function humanSize(n) {
    if (n < 1024) return String(n);
    var units = ["K", "M", "G", "T"], v = n, i = -1;
    do { v /= 1024; i++; } while (v >= 1024 && i < units.length - 1);
    if (v < 10) {
      var r = Math.ceil(v * 10 - 1e-9) / 10;
      return (r >= 10 ? "10" : r.toFixed(1)) + units[i];
    }
    var r2 = Math.ceil(v - 1e-9);
    if (r2 >= 1024 && i < units.length - 1) return "1.0" + units[i + 1];
    return r2 + units[i];
  }
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function lsDate(t) {
    var d = new Date(t);
    return MONTHS[d.getMonth()] + " " + pad(d.getDate(), 2) + " " + pad(d.getHours(), 2).replace(" ", "0") + ":" + pad(d.getMinutes(), 2).replace(" ", "0");
  }

  /* gzip with "stored" (uncompressed) deflate blocks, so the stub .gz files are real gzip files. */
  var CRC_TABLE = null;
  function crc32(bytes) {
    if (!CRC_TABLE) {
      CRC_TABLE = new Int32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        CRC_TABLE[n] = c;
      }
    }
    var crc = -1;
    for (var i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
    return (crc ^ -1) >>> 0;
  }
  function gzipStore(data, name) {
    var bytes = isBytes(data) ? data : utf8Encode(String(data));
    var nameBytes = name ? utf8Encode(name) : new Uint8Array(0);
    var blocks = Math.max(1, Math.ceil(bytes.length / 65535));
    var out = new Uint8Array(10 + (name ? nameBytes.length + 1 : 0) + bytes.length + blocks * 5 + 8);
    var p = 0;
    out.set([0x1f, 0x8b, 8, name ? 8 : 0, 0, 0, 0, 0, 0, 3], 0); p = 10;
    if (name) { out.set(nameBytes, p); p += nameBytes.length; out[p++] = 0; }
    for (var b = 0; b < blocks; b++) {
      var start = b * 65535, len = Math.min(65535, bytes.length - start);
      out[p++] = b === blocks - 1 ? 1 : 0;
      out[p++] = len & 255; out[p++] = len >> 8; out[p++] = ~len & 255; out[p++] = (~len >> 8) & 255;
      out.set(bytes.subarray(start, start + len), p); p += len;
    }
    var crc = crc32(bytes), size = bytes.length;
    out[p++] = crc & 255; out[p++] = crc >>> 8 & 255; out[p++] = crc >>> 16 & 255; out[p++] = crc >>> 24 & 255;
    out[p++] = size & 255; out[p++] = size >>> 8 & 255; out[p++] = size >>> 16 & 255; out[p++] = size >>> 24 & 255;
    return out;
  }
  /* Returns the decompressed bytes, null if the data are not gzip, or "unsupported" for real deflate. */
  function gunzipStored(bytes) {
    if (!isBytes(bytes) || bytes.length < 18 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) return null;
    var flg = bytes[3], p = 10;
    if (flg & 4) p += 2 + (bytes[p] | bytes[p + 1] << 8);
    if (flg & 8) { while (p < bytes.length && bytes[p]) p++; p++; }
    if (flg & 16) { while (p < bytes.length && bytes[p]) p++; p++; }
    if (flg & 2) p += 2;
    var parts = [], total = 0;
    for (;;) {
      if (p >= bytes.length) return "unsupported";
      var hdr = bytes[p++];
      if ((hdr >> 1 & 3) !== 0) return "unsupported";
      var len = bytes[p] | bytes[p + 1] << 8; p += 4;
      parts.push(bytes.subarray(p, p + len)); total += len; p += len;
      if (hdr & 1) break;
    }
    var out = new Uint8Array(total), q = 0;
    parts.forEach(function (x) { out.set(x, q); q += x.length; });
    return out;
  }

  /* ======================================================================
     2. Virtual file system
     Directories: {type:"d", kids:{name: node}, mtime}. Files: {type:"f", data: string | Uint8Array,
     mtime, ver, exec?, prog?}. Text files hold strings, binary files (.bed, .gz) hold Uint8Array.
     Every write and removal is recorded while a change log is open (beginChanges/endChanges).
     ====================================================================== */
  function fsError(code, path) {
    var msg = { ENOENT: "No such file or directory", EISDIR: "Is a directory", ENOTDIR: "Not a directory",
      EEXIST: "File exists", ENOTEMPTY: "Directory not empty", EINVAL: "Invalid argument" }[code] || code;
    var e = new Error(msg);
    e.code = code; e.path = path; e.fsMessage = msg;
    return e;
  }
  function newDir(t) { return { type: "d", kids: Object.create(null), mtime: t || Date.now() }; }

  function VFS() {
    this.root = newDir();
    this.ver = 0;
    this.log = null;
  }
  VFS.prototype.normalize = function (path, cwd) {
    path = path == null ? "" : String(path);
    if (path === "~" || path.slice(0, 2) === "~/") path = HOME + path.slice(1);
    var abs = path.charAt(0) === "/" ? path : (cwd || "/") + "/" + path;
    var parts = abs.split("/"), out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === "" || p === ".") continue;
      if (p === "..") out.pop(); else out.push(p);
    }
    return "/" + out.join("/");
  };
  VFS.prototype.lookup = function (abs) {
    if (abs === "/") return this.root;
    var parts = abs.split("/"), node = this.root;
    for (var i = 1; i < parts.length; i++) {
      if (!parts[i]) continue;
      if (!node || node.type !== "d") return null;
      node = node.kids[parts[i]];
      if (!node) return null;
    }
    return node || null;
  };
  VFS.prototype.parent = function (abs, makeParents) {
    var dir = dirname(abs), name = basename(abs);
    var node = this.lookup(dir);
    if (!node && makeParents) { this.mkdir(dir, true); node = this.lookup(dir); }
    if (!node) throw fsError("ENOENT", abs);
    if (node.type !== "d") throw fsError("ENOTDIR", abs);
    return { dir: node, name: name };
  };
  VFS.prototype.record = function (abs) { if (this.log) this.log[abs] = true; };
  VFS.prototype.beginChanges = function () { var prev = this.log; this.log = Object.create(null); return prev; };
  VFS.prototype.endChanges = function (prev) {
    var paths = this.log ? Object.keys(this.log) : [];
    this.log = prev || null;
    if (prev) paths.forEach(function (p) { prev[p] = true; });
    return paths;
  };
  VFS.prototype.exists = function (abs) { return !!this.lookup(abs); };
  VFS.prototype.isDir = function (abs) { var n = this.lookup(abs); return !!n && n.type === "d"; };
  VFS.prototype.isFile = function (abs) { var n = this.lookup(abs); return !!n && n.type === "f"; };
  VFS.prototype.read = function (abs) { var n = this.lookup(abs); return n && n.type === "f" ? n.data : null; };
  VFS.prototype.readText = function (abs) {
    var d = this.read(abs);
    if (d == null) return null;
    return isBytes(d) ? utf8Decode(d) : d;
  };
  VFS.prototype.readBytes = function (abs) {
    var d = this.read(abs);
    if (d == null) return null;
    return isBytes(d) ? d : utf8Encode(d);
  };
  VFS.prototype.write = function (abs, data, opts) {
    opts = opts || {};
    var pp = this.parent(abs, opts.parents);
    var old = pp.dir.kids[pp.name];
    if (old && old.type === "d") throw fsError("EISDIR", abs);
    if (data == null) data = "";
    if (!isBytes(data) && typeof data !== "string") data = String(data);
    if (opts.append && old) {
      if (typeof old.data === "string" && typeof data === "string") data = old.data + data;
      else {
        var a = isBytes(old.data) ? old.data : utf8Encode(old.data), b = isBytes(data) ? data : utf8Encode(data);
        var c = new Uint8Array(a.length + b.length); c.set(a, 0); c.set(b, a.length); data = c;
      }
    }
    var node = { type: "f", data: data, mtime: Date.now(), ver: ++this.ver };
    if (old) { if (old.exec) node.exec = old.exec; if (old.prog) node.prog = old.prog; }
    if (opts.exec) node.exec = true;
    if (opts.prog) { node.prog = opts.prog; node.exec = true; }
    pp.dir.kids[pp.name] = node;
    pp.dir.mtime = node.mtime;
    this.record(abs);
    return abs;
  };
  VFS.prototype.touch = function (abs) {
    var n = this.lookup(abs);
    if (n) { n.mtime = Date.now(); if (n.type === "f") n.ver = ++this.ver; this.record(abs); return; }
    this.write(abs, "");
  };
  VFS.prototype.mkdir = function (abs, parents) {
    if (abs === "/") { if (parents) return; throw fsError("EEXIST", abs); }
    var n = this.lookup(abs);
    if (n) {
      if (parents && n.type === "d") return;
      throw fsError("EEXIST", abs);
    }
    var pp;
    if (parents) {
      var d = dirname(abs);
      var pn = this.lookup(d);
      if (!pn) this.mkdir(d, true);
      else if (pn.type !== "d") throw fsError("ENOTDIR", abs);
    }
    pp = this.parent(abs, false);
    pp.dir.kids[pp.name] = newDir();
    this.record(abs);
  };
  VFS.prototype.list = function (abs) {
    var n = this.lookup(abs);
    if (!n) throw fsError("ENOENT", abs);
    if (n.type !== "d") throw fsError("ENOTDIR", abs);
    return Object.keys(n.kids).sort(cmpBytes);
  };
  VFS.prototype.remove = function (abs, recursive) {
    if (abs === "/") throw fsError("EINVAL", abs);
    var pp = this.parent(abs, false);
    var n = pp.dir.kids[pp.name];
    if (!n) throw fsError("ENOENT", abs);
    if (n.type === "d" && !recursive && Object.keys(n.kids).length) throw fsError("ENOTEMPTY", abs);
    var self = this;
    (function rec(p, node) {
      self.record(p);
      if (node.type === "d") for (var k in node.kids) rec(p + "/" + k, node.kids[k]);
    })(abs, n);
    delete pp.dir.kids[pp.name];
    pp.dir.mtime = Date.now();
  };
  VFS.prototype.fileSize = function (node) {
    if (!node) return 0;
    if (node.type === "d") return 4096;
    return isBytes(node.data) ? node.data.length : utf8Length(node.data);
  };
  VFS.prototype.size = function (abs) {
    var n = this.lookup(abs);
    if (!n) return null;
    if (n.type === "f") return this.fileSize(n);
    var total = 0, self = this;
    (function rec(d) { for (var k in d.kids) { var c = d.kids[k]; if (c.type === "d") rec(c); else total += self.fileSize(c); } })(n);
    return total;
  };
  VFS.prototype.walk = function (abs, withDirs) {
    var out = [], n = this.lookup(abs);
    if (!n) return out;
    (function rec(p, node) {
      if (node.type === "f") { out.push(p); return; }
      if (withDirs) out.push(p);
      Object.keys(node.kids).sort(cmpBytes).forEach(function (k) { rec((p === "/" ? "" : p) + "/" + k, node.kids[k]); });
    })(abs, n);
    return out;
  };
  VFS.prototype.copy = function (src, dst) {
    var n = this.lookup(src);
    if (!n) throw fsError("ENOENT", src);
    var self = this;
    (function rec(s, d, node) {
      if (node.type === "f") { self.write(d, node.data, { exec: node.exec, prog: node.prog }); return; }
      if (!self.lookup(d)) self.mkdir(d, false);
      for (var k in node.kids) rec(s + "/" + k, d + "/" + k, node.kids[k]);
    })(src, dst, n);
  };
  VFS.prototype.move = function (src, dst) {
    var a = this.parent(src, false), n = a.dir.kids[a.name];
    if (!n) throw fsError("ENOENT", src);
    if ((dst + "/").indexOf(src + "/") === 0) throw fsError("EINVAL", dst);
    var b = this.parent(dst, false);
    var old = b.dir.kids[b.name];
    if (old && old.type === "d") throw fsError("EISDIR", dst);
    delete a.dir.kids[a.name];
    b.dir.kids[b.name] = n;
    n.mtime = Date.now();
    var self = this;
    (function rec(p, node) { self.record(p); if (node.type === "d") for (var k in node.kids) rec(p + "/" + k, node.kids[k]); })(dst, n);
    this.record(src);
  };
  function cloneNode(n) {
    if (n.type === "f") { var f = {}; for (var k in n) f[k] = n[k]; return f; }
    var d = newDir(n.mtime);
    for (var c in n.kids) d.kids[c] = cloneNode(n.kids[c]);
    return d;
  }
  VFS.prototype.snapshot = function () { return { root: cloneNode(this.root), ver: this.ver }; };
  /* Put back a snapshot; only files that differ from the current ones are recorded as changed. */
  VFS.prototype.restore = function (snap) {
    var self = this, before = Object.create(null);
    this.walk("/", false).forEach(function (p) { before[p] = self.lookup(p).ver; });
    this.root = cloneNode(snap.root);
    this.ver = Math.max(this.ver, snap.ver) + 1;
    this.walk("/", false).forEach(function (p) {
      if (before[p] !== self.lookup(p).ver) self.record(p);
      delete before[p];
    });
    Object.keys(before).forEach(function (p) { self.record(p); });
  };

  function cmpBytes(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

  /* Seed the file system from window.TOY_FILES ({relative path: {b64} | {text}}); "_"-paths are stub material. */
  function seedFS(fs, files) {
    [HOME, PROJECT, PROJECT + "/data", PROJECT + "/data/inputs", INPUT_DIR, REF_DIR, ANALYSIS_DIR, "/tmp", "/usr/local/bin"].forEach(function (d) { fs.mkdir(d, true); });
    fs.write("/usr/local/bin/plink", "#!/bin/sh\n# PLINK 1.9 in the lab: this path runs the emulator in plink-core.js.\n", { prog: "plink" });
    files = files || {};
    Object.keys(files).forEach(function (rel) {
      if (rel.charAt(0) === "_") return;
      fs.write(PROJECT + "/" + rel.replace(/^\/+/, ""), fileData(files[rel]), { parents: true });
    });
  }
  function fileData(f) {
    if (f == null) return "";
    if (typeof f === "string") return f;
    if (f.b64 != null) return b64decode(f.b64);
    if (f.text != null) return String(f.text);
    return "";
  }

  /* ======================================================================
     3. Shell: lexer
     Tokens: {t:"w", parts, raw} words, {t:"op", v} operators (; & && | || ( ) newline),
     {t:"r", op, fd} redirections (< > >> >& <& &> &>> <<), {t:"eof"}.
     Word parts: {k:"lit", s, q} literal text (q = quoted: no splitting or globbing),
     {k:"var", name, q, op?, arg?}, {k:"cmd", src, q} command substitution, {k:"arith", src, q}.
     A syntax error with .incomplete = true means "the command continues on the next line".
     ====================================================================== */
  function ShellSyntax(msg, incomplete) {
    var e = new Error(msg);
    e.shellSyntax = true;
    e.incomplete = !!incomplete;
    return e;
  }
  function ShellFail(msg, code) {
    var e = new Error(msg);
    e.shellFail = true;
    e.exitCode = code == null ? 1 : code;
    return e;
  }

  /* Index of the ")" that closes a "(" opened just before position i, or -1. Skips quotes. */
  function matchParen(src, i) {
    var depth = 1;
    while (i < src.length) {
      var c = src.charAt(i);
      if (c === "\\") { i += 2; continue; }
      if (c === "'") { var j = src.indexOf("'", i + 1); if (j < 0) return -1; i = j + 1; continue; }
      if (c === '"') {
        i++;
        while (i < src.length && src.charAt(i) !== '"') i += src.charAt(i) === "\\" ? 2 : 1;
        if (i >= src.length) return -1;
        i++; continue;
      }
      if (c === "(") depth++;
      else if (c === ")") { depth--; if (!depth) return i; }
      i++;
    }
    return -1;
  }

  function parseBrace(body, q) {
    var m;
    if ((m = /^#([A-Za-z_][A-Za-z0-9_]*|[0-9?#$])$/.exec(body))) return { k: "var", name: m[1], q: q, op: "len" };
    if ((m = /^([A-Za-z_][A-Za-z0-9_]*|[0-9?#$@*!-])$/.exec(body))) return { k: "var", name: m[1], q: q };
    if ((m = /^([A-Za-z_][A-Za-z0-9_]*|[0-9])(:-|:=|:\+|:\?|-|=|\+|\?|%%|%|##|#|\/\/|\/)([\s\S]*)$/.exec(body))) {
      var part = { k: "var", name: m[1], q: q, op: m[2], arg: m[3] };
      if (m[2] === "/" || m[2] === "//") {
        var k = m[3].indexOf("/");
        part.arg = k < 0 ? m[3] : m[3].slice(0, k);
        part.rep = k < 0 ? "" : m[3].slice(k + 1);
      }
      return part;
    }
    throw ShellSyntax("${" + body + "}: bad substitution");
  }

  function lex(src) {
    var toks = [], i = 0, n = src.length, word = null;
    function cur() { if (!word) word = { parts: [], start: i }; return word; }
    function lit(s, q) {
      var w = cur(), last = w.parts[w.parts.length - 1];
      if (last && last.k === "lit" && last.q === q) last.s += s;
      else w.parts.push({ k: "lit", s: s, q: q });
    }
    function end() {
      if (word) { toks.push({ t: "w", parts: word.parts, raw: src.slice(word.start, i) }); word = null; }
    }
    function dollar(j, q) {
      var c = src.charAt(j + 1);
      if (c === "{") {
        var k = j + 2;
        while (k < n && src.charAt(k) !== "}") k += src.charAt(k) === "\\" ? 2 : 1;
        if (k >= n) throw ShellSyntax("unexpected EOF while looking for matching `}'", true);
        return { part: parseBrace(src.slice(j + 2, k), q), end: k + 1 };
      }
      if (c === "(") {
        var e = matchParen(src, j + 2);
        if (e < 0) throw ShellSyntax("unexpected EOF while looking for matching `)'", true);
        var inner = src.slice(j + 2, e);
        if (inner.charAt(0) === "(" && inner.charAt(inner.length - 1) === ")" && matchParen(inner, 1) === inner.length - 1)
          return { part: { k: "arith", src: inner.slice(1, -1), q: q }, end: e + 1 };
        return { part: { k: "cmd", src: inner, q: q }, end: e + 1 };
      }
      var m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(j + 1, j + 129));
      if (m) return { part: { k: "var", name: m[0], q: q }, end: j + 1 + m[0].length };
      if (c && "?$#!@*-0123456789".indexOf(c) >= 0) return { part: { k: "var", name: c, q: q }, end: j + 2 };
      return null;
    }
    function backtick(j, q) {
      var k = j + 1, s = "";
      while (k < n && src.charAt(k) !== "`") {
        if (src.charAt(k) === "\\" && k + 1 < n) { s += src.charAt(k + 1); k += 2; continue; }
        s += src.charAt(k++);
      }
      if (k >= n) throw ShellSyntax("unexpected EOF while looking for matching ``'", true);
      return { part: { k: "cmd", src: s, q: q }, end: k + 1 };
    }
    function dquote(j) {
      var s = "";
      lit("", true);
      while (j < n) {
        var c = src.charAt(j);
        if (c === '"') { if (s) lit(s, true); return j + 1; }
        if (c === "\\") {
          var d = src.charAt(j + 1);
          if (d === "$" || d === "`" || d === '"' || d === "\\") { s += d; j += 2; continue; }
          if (d === "\n") { j += 2; continue; }
          s += c; j++; continue;
        }
        if (c === "$") {
          var r = dollar(j, true);
          if (r) { if (s) { lit(s, true); s = ""; } cur().parts.push(r.part); j = r.end; continue; }
        }
        if (c === "`") { if (s) { lit(s, true); s = ""; } var b = backtick(j, true); cur().parts.push(b.part); j = b.end; continue; }
        s += c; j++;
      }
      throw ShellSyntax("unexpected EOF while looking for matching `\"'", true);
    }
    function ansiC(j) {   // $'...'
      var s = "", map = { n: "\n", t: "\t", r: "\r", a: "\x07", b: "\b", f: "\f", v: "\v", e: "\x1b", "\\": "\\", "'": "'", '"': '"', "?": "?" };
      while (j < n && src.charAt(j) !== "'") {
        var c = src.charAt(j);
        if (c === "\\" && j + 1 < n) {
          var d = src.charAt(j + 1), m;
          if (map[d] != null) { s += map[d]; j += 2; continue; }
          if ((m = /^x([0-9a-fA-F]{1,2})/.exec(src.slice(j + 1, j + 4)))) { s += String.fromCharCode(parseInt(m[1], 16)); j += 1 + m[0].length; continue; }
          if ((m = /^[0-7]{1,3}/.exec(src.slice(j + 1, j + 4)))) { s += String.fromCharCode(parseInt(m[0], 8)); j += 1 + m[0].length; continue; }
          s += c + d; j += 2; continue;
        }
        s += c; j++;
      }
      if (j >= n) throw ShellSyntax("unexpected EOF while looking for matching `''", true);
      lit(s, true);
      return j + 1;
    }
    function redirOp() {
      var c = src.charAt(i), d = src.charAt(i + 1);
      if (c === ">") {
        if (d === ">") { i += 2; return ">>"; }
        if (d === "&") { i += 2; return ">&"; }
        if (d === "|") { i += 2; return ">"; }
        i++; return ">";
      }
      if (d === "<") { i += src.charAt(i + 2) === "<" ? 3 : 2; return "<<"; }
      if (d === "&") { i += 2; return "<&"; }
      if (d === ">") { i += 2; return "<>"; }
      i++; return "<";
    }
    while (i < n) {
      var c = src.charAt(i);
      if (c === "\\") {
        if (i + 1 >= n) throw ShellSyntax("unexpected end of file", true);
        if (src.charAt(i + 1) === "\n") { i += 2; continue; }
        if (src.charAt(i + 1) === "\r" && src.charAt(i + 2) === "\n") { i += 3; continue; }
        lit(src.charAt(i + 1), true); i += 2; continue;
      }
      if (c === "'") {
        var j = src.indexOf("'", i + 1);
        if (j < 0) throw ShellSyntax("unexpected EOF while looking for matching `''", true);
        lit(src.slice(i + 1, j), true); i = j + 1; continue;
      }
      if (c === '"') { cur(); i = dquote(i + 1); continue; }
      if (c === "$" && src.charAt(i + 1) === "'") { cur(); i = ansiC(i + 2); continue; }
      if (c === "$") {
        var r = dollar(i, false);
        if (r) { cur().parts.push(r.part); i = r.end; continue; }
        lit("$", false); i++; continue;
      }
      if (c === "`") { var b = backtick(i, false); cur().parts.push(b.part); i = b.end; continue; }
      if (c === " " || c === "\t" || c === "\r") { end(); i++; continue; }
      if (c === "\n") { end(); toks.push({ t: "op", v: "\n" }); i++; continue; }
      if (c === "#" && !word) { while (i < n && src.charAt(i) !== "\n") i++; continue; }
      if (!word && c >= "0" && c <= "9" && (src.charAt(i + 1) === ">" || src.charAt(i + 1) === "<")) {
        var fd = +c; i++;
        toks.push({ t: "r", op: redirOp(), fd: fd });
        continue;
      }
      if (c === ">" || c === "<") { end(); toks.push({ t: "r", op: redirOp(), fd: null }); continue; }
      if (c === "&" && src.charAt(i + 1) === ">") {
        end(); i += 2;
        if (src.charAt(i) === ">") { i++; toks.push({ t: "r", op: "&>>", fd: null }); }
        else toks.push({ t: "r", op: "&>", fd: null });
        continue;
      }
      if (c === "&" || c === "|" || c === ";" || c === "(" || c === ")") {
        end();
        var two = src.substr(i, 2);
        if (two === "&&" || two === "||" || two === ";;") { toks.push({ t: "op", v: two }); i += 2; continue; }
        if (two === "|&") { toks.push({ t: "op", v: "|" }); toks.push({ t: "r", op: ">&", fd: 2, implicit: true }); i += 2; continue; }
        toks.push({ t: "op", v: c }); i++; continue;
      }
      lit(c, false); i++;
    }
    end();
    toks.push({ t: "eof" });
    // "|&" is "2>&1 |": move the implicit redirection before the pipe
    for (var k = 0; k < toks.length; k++) {
      if (toks[k].implicit) {
        var red = toks.splice(k, 1)[0];
        toks.splice(k - 1, 0, red, { t: "w", parts: [{ k: "lit", s: "1", q: true }], raw: "1" });
        k++;
      }
    }
    return toks;
  }

  /* ======================================================================
     4. Shell: parser (recursive descent → AST)
     list: {type:"list", items:[{node, sep}]}; andor: {first, rest:[{op, node}]};
     pipe: {cmds, bang}; simple: {assigns:[{name, value}], words, redirs};
     if: {clauses:[{cond, body}], elseBody}; for: {name, words, body}; while: {until, cond, body};
     group: {body}; subshell: {body}. Compound commands may carry redirs.
     ====================================================================== */
  function plainWord(tok) {
    if (!tok || tok.t !== "w" || tok.parts.length !== 1) return null;
    var p = tok.parts[0];
    return p.k === "lit" && !p.q ? p.s : null;
  }
  var STOP_WORDS = { then: 1, elif: 1, "else": 1, fi: 1, "do": 1, done: 1, "}": 1, esac: 1 };

  function Parser(toks) { this.t = toks; this.i = 0; }
  Parser.prototype.peek = function () { return this.t[this.i]; };
  Parser.prototype.next = function () { return this.t[this.i++]; };
  Parser.prototype.isOp = function (v) { var k = this.t[this.i]; return k.t === "op" && k.v === v; };
  Parser.prototype.isWord = function (v) { return plainWord(this.t[this.i]) === v; };
  Parser.prototype.skipNL = function () { while (this.isOp("\n")) this.i++; };
  Parser.prototype.eofError = function () { throw ShellSyntax("syntax error: unexpected end of file", true); };
  Parser.prototype.unexpected = function (tok) {
    if (tok.t === "eof") this.eofError();
    var s = tok.t === "op" ? (tok.v === "\n" ? "newline" : tok.v) : tok.t === "r" ? tok.op : tok.raw;
    throw ShellSyntax("syntax error near unexpected token `" + s + "'");
  };
  Parser.prototype.expectWord = function (w) {
    if (plainWord(this.peek()) !== w) this.unexpected(this.peek());
    this.i++;
  };
  Parser.prototype.parseProgram = function () {
    var list = this.parseList([]);
    if (this.peek().t !== "eof") this.unexpected(this.peek());
    return list;
  };
  Parser.prototype.parseList = function (stops) {
    var items = [];
    for (;;) {
      this.skipNL();
      var tok = this.peek();
      if (tok.t === "eof") { if (stops.length) this.eofError(); break; }
      var w = plainWord(tok);
      if (w !== null && stops.indexOf(w) >= 0) break;
      if (tok.t === "op" && tok.v === ")") { if (stops.indexOf(")") >= 0) break; this.unexpected(tok); }
      if (tok.t === "op" && tok.v !== "(") this.unexpected(tok);
      var node = this.parseAndOr(), sep = ";", t2 = this.peek();
      if (t2.t === "op" && (t2.v === ";" || t2.v === "&")) { sep = t2.v; this.i++; }
      else if (t2.t === "op" && t2.v === "\n") this.i++;
      else if (t2.t === "eof" || (t2.t === "op" && t2.v === ")")) { /* end of list */ }
      else this.unexpected(t2);
      items.push({ node: node, sep: sep });
    }
    return { type: "list", items: items };
  };
  Parser.prototype.parseAndOr = function () {
    var first = this.parsePipeline(), rest = [];
    while (this.isOp("&&") || this.isOp("||")) {
      var op = this.next().v;
      this.skipNL();
      if (this.peek().t === "eof") this.eofError();
      rest.push({ op: op, node: this.parsePipeline() });
    }
    return rest.length ? { type: "andor", first: first, rest: rest } : first;
  };
  Parser.prototype.parsePipeline = function () {
    var bang = false;
    if (this.isWord("!")) { this.i++; bang = true; }
    var cmds = [this.parseCommand()];
    while (this.isOp("|")) {
      this.i++; this.skipNL();
      if (this.peek().t === "eof") this.eofError();
      cmds.push(this.parseCommand());
    }
    return cmds.length === 1 && !bang ? cmds[0] : { type: "pipe", cmds: cmds, bang: bang };
  };
  Parser.prototype.parseCommand = function () {
    var w = plainWord(this.peek()), node;
    if (w === "if") node = this.parseIf();
    else if (w === "for") node = this.parseFor();
    else if (w === "while" || w === "until") node = this.parseWhile();
    else if (w === "{") { this.i++; node = { type: "group", body: this.parseBody(["}"]) }; this.expectWord("}"); }
    else if (this.isOp("(")) {
      this.i++;
      node = { type: "subshell", body: this.parseBody([")"]) };
      if (!this.isOp(")")) this.unexpected(this.peek());
      this.i++;
    }
    else if (w === "case" || w === "function" || w === "select") throw ShellSyntax("`" + w + "': this shell construct is not available in the lab (if, for and while are)");
    else return this.parseSimple();
    node.redirs = [];
    while (this.peek().t === "r") node.redirs.push(this.parseRedir());
    return node;
  };
  Parser.prototype.parseBody = function (stops) {
    var body = this.parseList(stops);
    if (!body.items.length) this.unexpected(this.peek());
    return body;
  };
  Parser.prototype.parseIf = function () {
    this.i++;
    var clauses = [], elseBody = null;
    var cond = this.parseBody(["then"]);
    this.expectWord("then");
    clauses.push({ cond: cond, body: this.parseBody(["elif", "else", "fi"]) });
    for (;;) {
      var w = plainWord(this.peek());
      if (w === "elif") {
        this.i++;
        var c2 = this.parseBody(["then"]);
        this.expectWord("then");
        clauses.push({ cond: c2, body: this.parseBody(["elif", "else", "fi"]) });
        continue;
      }
      if (w === "else") { this.i++; elseBody = this.parseBody(["fi"]); }
      break;
    }
    this.expectWord("fi");
    return { type: "if", clauses: clauses, elseBody: elseBody };
  };
  Parser.prototype.parseFor = function () {
    this.i++;
    var tok = this.next();
    if (tok.t === "eof") this.eofError();
    var name = plainWord(tok);
    if (!name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw ShellSyntax("`" + (tok.raw || "") + "': not a valid identifier");
    var words = null;
    this.skipNL();
    if (this.isWord("in")) {
      this.i++; words = [];
      while (this.peek().t === "w") words.push(this.next().parts);
      if (this.isOp(";") || this.isOp("\n")) this.i++;
      else this.unexpected(this.peek());
    } else if (this.isOp(";")) this.i++;
    this.skipNL();
    this.expectWord("do");
    var body = this.parseBody(["done"]);
    this.expectWord("done");
    return { type: "for", name: name, words: words, body: body };
  };
  Parser.prototype.parseWhile = function () {
    var until = this.next().parts[0].s === "until";
    var cond = this.parseBody(["do"]);
    this.expectWord("do");
    var body = this.parseBody(["done"]);
    this.expectWord("done");
    return { type: "while", until: until, cond: cond, body: body };
  };
  Parser.prototype.parseRedir = function () {
    var r = this.next();
    if (r.op === "<<") throw ShellSyntax("here-documents (<<) are not available in the lab; write the text to a file with echo or printf first");
    if (r.op === "<>") throw ShellSyntax("the <> redirection is not available in the lab");
    var t = this.peek();
    if (t.t !== "w") this.unexpected(t);
    this.i++;
    return { op: r.op, fd: r.fd, target: t.parts };
  };
  Parser.prototype.parseSimple = function () {
    var assigns = [], words = [], redirs = [];
    for (;;) {
      var tok = this.peek();
      if (tok.t === "r") { redirs.push(this.parseRedir()); continue; }
      if (tok.t !== "w") break;
      if (!words.length) {
        var pw = plainWord(tok);
        if (pw !== null && STOP_WORDS[pw] && !assigns.length && !redirs.length) break;
        var a = assignmentOf(tok);
        if (a) { assigns.push(a); this.i++; continue; }
      }
      words.push(tok.parts);
      this.i++;
    }
    if (!assigns.length && !words.length && !redirs.length) this.unexpected(this.peek());
    return { type: "simple", assigns: assigns, words: words, redirs: redirs };
  };
  function assignmentOf(tok) {
    var p = tok.parts[0];
    if (!p || p.k !== "lit" || p.q) return null;
    var m = /^([A-Za-z_][A-Za-z0-9_]*)(\+?)=/.exec(p.s);
    if (!m) return null;
    var rest = p.s.slice(m[0].length);
    var value = (rest ? [{ k: "lit", s: rest, q: false }] : []).concat(tok.parts.slice(1));
    return { name: m[1], append: !!m[2], value: value };
  }
  function parseShell(src) { return new Parser(lex(src)).parseProgram(); }

  /* Is the text a complete command (no open quote, trailing "\", "|", "&&" or unclosed if/for/while)? */
  function isComplete(src) {
    try { parseShell(src); return true; }
    catch (e) { if (e && e.shellSyntax) return !e.incomplete; return true; }
  }
  /* Split a script into complete commands (one per line, with continuations and multi-line blocks kept together). */
  function splitCommands(text) {
    var lines = String(text).replace(/\r\n?/g, "\n").split("\n"), out = [], acc = null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (acc === null) {
        if (!line.trim()) continue;
        acc = line;
      } else acc += "\n" + line;
      if (isComplete(acc)) { out.push(acc); acc = null; }
    }
    if (acc !== null && acc.trim()) out.push(acc);
    return out;
  }

  /* ======================================================================
     5. Shell: glob patterns, arithmetic and test
     ====================================================================== */
  function hasGlob(pat) {
    for (var i = 0; i < pat.length; i++) {
      var c = pat.charAt(i);
      if (c === "\\") { i++; continue; }
      if (c === "*" || c === "?" || c === "[") return true;
    }
    return false;
  }
  function escapeGlob(s) { return s.replace(/[\\*?[\]]/g, "\\$&"); }
  function unescapeGlob(s) { return s.replace(/\\(.)/g, "$1"); }
  function reEscape(s) { return s.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&"); }
  /* Glob pattern → regular-expression source (no anchors). star: what "*" matches. */
  function globSource(pat, star) {
    var out = "", i = 0;
    while (i < pat.length) {
      var c = pat.charAt(i);
      if (c === "\\" && i + 1 < pat.length) { out += reEscape(pat.charAt(i + 1)); i += 2; continue; }
      if (c === "*") { out += star; i++; continue; }
      if (c === "?") { out += star === ".*" ? "." : "[^/]"; i++; continue; }
      if (c === "[") {
        var j = i + 1, neg = false;
        if (pat.charAt(j) === "!" || pat.charAt(j) === "^") { neg = true; j++; }
        var k = j;
        if (pat.charAt(k) === "]") k++;
        while (k < pat.length && pat.charAt(k) !== "]") k++;
        if (k >= pat.length) { out += "\\["; i++; continue; }
        var body = pat.slice(j, k).replace(/\\/g, "\\\\").replace(/\[:(\w+):\]/g, function (m, cls) { return POSIX_CLASSES[cls] || m; });
        out += "[" + (neg ? "^" : "") + body.replace(/^\]/, "\\]") + "]";
        i = k + 1; continue;
      }
      out += reEscape(c); i++;
    }
    return out;
  }
  var POSIX_CLASSES = { alpha: "A-Za-z", digit: "0-9", alnum: "A-Za-z0-9", upper: "A-Z", lower: "a-z", space: " \\t\\n\\r\\f\\v",
    blank: " \\t", punct: "!-\\/:-@\\[-`{-~", xdigit: "0-9A-Fa-f", word: "A-Za-z0-9_", print: " -~", graph: "!-~", cntrl: "\\x00-\\x1f" };
  function globRegex(pat) { return new RegExp("^" + globSource(pat, "[^/]*") + "$"); }

  /* $(( )) integer arithmetic: + - * / % ** comparisons && || ! ?: and parentheses; names read variables. */
  function arith(src, getVar) {
    var toks = src.match(/\s*(\d+|[A-Za-z_][A-Za-z0-9_]*|\*\*|<=|>=|==|!=|&&|\|\||<<|>>|[-+*\/%()<>!?:~&|^])/g) || [];
    var joined = toks.join("").replace(/\s+/g, ""), clean = src.replace(/\s+/g, "");
    if (joined !== clean) throw ShellFail("bash: " + src.trim() + ": syntax error in expression");
    toks = toks.map(function (t) { return t.trim(); });
    var i = 0;
    function peek() { return toks[i]; }
    function val(t) {
      if (/^\d+$/.test(t)) return parseInt(t, 10);
      var v = getVar(t);
      var n = parseInt(v, 10);
      return isNaN(n) ? 0 : n;
    }
    function primary() {
      var t = toks[i++];
      if (t === undefined) throw ShellFail("bash: " + src.trim() + ": syntax error: operand expected");
      if (t === "(") { var v = ternary(); if (toks[i++] !== ")") throw ShellFail("bash: " + src.trim() + ": missing `)'"); return v; }
      if (t === "-") return -unary();
      if (t === "+") return +unary();
      if (t === "!") return unary() ? 0 : 1;
      if (t === "~") return ~unary();
      return val(t);
    }
    function unary() { return primary(); }
    function power() { var b = unary(); if (peek() === "**") { i++; var e = power(); return Math.pow(b, e) | 0; } return b; }
    function mul() {
      var v = power();
      while (peek() === "*" || peek() === "/" || peek() === "%") {
        var op = toks[i++], r = power();
        if ((op === "/" || op === "%") && r === 0) throw ShellFail("bash: " + src.trim() + ": division by 0");
        v = op === "*" ? v * r : op === "/" ? (v / r) | 0 : v % r;
      }
      return v;
    }
    function add() { var v = mul(); while (peek() === "+" || peek() === "-") { var op = toks[i++], r = mul(); v = op === "+" ? v + r : v - r; } return v; }
    function rel() {
      var v = add();
      while (["<", ">", "<=", ">=", "==", "!="].indexOf(peek()) >= 0) {
        var op = toks[i++], r = add();
        v = (op === "<" ? v < r : op === ">" ? v > r : op === "<=" ? v <= r : op === ">=" ? v >= r : op === "==" ? v === r : v !== r) ? 1 : 0;
      }
      return v;
    }
    function and() { var v = rel(); while (peek() === "&&") { i++; var r = rel(); v = v && r ? 1 : 0; } return v; }
    function or() { var v = and(); while (peek() === "||") { i++; var r = and(); v = v || r ? 1 : 0; } return v; }
    function ternary() { var c = or(); if (peek() === "?") { i++; var a = ternary(); if (toks[i++] !== ":") throw ShellFail("bash: " + src.trim() + ": expected `:'"); var b = ternary(); return c ? a : b; } return c; }
    if (!toks.length) return 0;
    var r = ternary();
    if (i < toks.length) throw ShellFail("bash: " + src.trim() + ": syntax error in expression (error token is \"" + toks.slice(i).join(" ") + "\")");
    return r;
  }

  /* test / [ ... ]: returns 0 (true), 1 (false); throws ShellFail with exit code 2 on errors. */
  function testEval(args, sh, name) {
    var i = 0;
    function intOf(s) {
      if (!/^\s*[-+]?\d+\s*$/.test(s)) throw ShellFail("bash: " + name + ": " + s + ": integer expression expected", 2);
      return parseInt(s, 10);
    }
    var UN = { "-e": 1, "-f": 1, "-d": 1, "-s": 1, "-r": 1, "-w": 1, "-x": 1, "-z": 1, "-n": 1, "-L": 1, "-h": 1, "-a": 0 };
    var BIN = { "=": 1, "==": 1, "!=": 1, "<": 1, ">": 1, "-eq": 1, "-ne": 1, "-lt": 1, "-le": 1, "-gt": 1, "-ge": 1, "-nt": 1, "-ot": 1 };
    function unary(op, a) {
      if (op === "-z") return a.length === 0;
      if (op === "-n") return a.length > 0;
      var node = sh.fs.lookup(sh.resolve(a));
      switch (op) {
        case "-e": case "-r": case "-w": return !!node;
        case "-f": return !!node && node.type === "f";
        case "-d": return !!node && node.type === "d";
        case "-s": return !!node && (node.type === "d" || sh.fs.fileSize(node) > 0);
        case "-x": return !!node && (node.type === "d" || !!node.exec);
        default: return false;
      }
    }
    function binary(a, op, b) {
      switch (op) {
        case "=": case "==": return a === b;
        case "!=": return a !== b;
        case "<": return a < b;
        case ">": return a > b;
        case "-eq": return intOf(a) === intOf(b);
        case "-ne": return intOf(a) !== intOf(b);
        case "-lt": return intOf(a) < intOf(b);
        case "-le": return intOf(a) <= intOf(b);
        case "-gt": return intOf(a) > intOf(b);
        case "-ge": return intOf(a) >= intOf(b);
        case "-nt": case "-ot":
          var x = sh.fs.lookup(sh.resolve(a)), y = sh.fs.lookup(sh.resolve(b));
          if (!x || !y) return false;
          return op === "-nt" ? x.mtime > y.mtime : x.mtime < y.mtime;
      }
      return false;
    }
    function primary() {
      var t = args[i];
      if (t === undefined) throw ShellFail("bash: " + name + ": argument expected", 2);
      if (t === "!") { i++; return !primary(); }
      if (t === "(") { i++; var v = orExpr(); if (args[i] !== ")") throw ShellFail("bash: " + name + ": `)' expected", 2); i++; return v; }
      if (args[i + 1] !== undefined && BIN[args[i + 1]] && args[i + 2] !== undefined) { i += 3; return binary(t, args[i - 2], args[i - 1]); }
      if (UN[t] && args[i + 1] !== undefined) { i += 2; return unary(t, args[i - 1]); }
      i++;
      return t.length > 0;
    }
    function andExpr() { var v = primary(); while (args[i] === "-a") { i++; var r = primary(); v = v && r; } return v; }
    function orExpr() { var v = andExpr(); while (args[i] === "-o") { i++; var r = andExpr(); v = v || r; } return v; }
    if (!args.length) return 1;
    if (args.length === 1) return args[0].length ? 0 : 1;
    if (args.length === 2) {
      if (args[0] === "!") return args[1].length ? 1 : 0;
      if (UN[args[0]]) return unary(args[0], args[1]) ? 0 : 1;
      throw ShellFail("bash: " + name + ": " + args[0] + ": unary operator expected", 2);
    }
    if (args.length === 3 && BIN[args[1]]) return binary(args[0], args[1], args[2]) ? 0 : 1;
    var res = orExpr();
    if (i < args.length) throw ShellFail("bash: " + name + ": too many arguments", 2);
    return res ? 0 : 1;
  }

  /* ======================================================================
     6. Shell: state, expansion and execution
     ====================================================================== */
  function Shell(opts) {
    opts = opts || {};
    this.fs = opts.fs || new VFS();
    this.vars = Object.create(null);
    this.exported = Object.create(null);
    this.cwd = PROJECT;
    this.history = [];
    this.lastCode = 0;
    this.positional = [];
    this.files = opts.files || {};
    this.getPlink = opts.plink || function () { return G.PlinkCore; };
    this.getGrafAnc = opts.grafanc || function () { return G.GrafAncCore; };
    this.aborted = false;
    this.hintsShown = Object.create(null);
    var self = this;
    [["HOME", HOME], ["USER", USER], ["LOGNAME", USER], ["SHELL", "/bin/bash"], ["PATH", "/usr/local/bin:/usr/bin:/bin"],
      ["PWD", PROJECT], ["LANG", "C.UTF-8"], ["TERM", "xterm-256color"],
      ["input_dir", INPUT_DIR], ["reference_dir", REF_DIR], ["analysis_dir", ANALYSIS_DIR]].forEach(function (kv) { self.setVar(kv[0], kv[1], true); });
    this.setVar("HOSTNAME", HOST);
    this.initial = this.saveState();
  }
  Shell.prototype.setVar = function (name, value, exp) {
    this.vars[name] = String(value);
    if (exp) this.exported[name] = true;
  };
  Shell.prototype.getVar = function (name) {
    var v = this.vars[name];
    return v === undefined ? undefined : v;
  };
  Shell.prototype.unsetVar = function (name) { delete this.vars[name]; delete this.exported[name]; };
  Shell.prototype.env = function () {
    var e = {};
    for (var k in this.exported) if (this.vars[k] !== undefined) e[k] = this.vars[k];
    return e;
  };
  Shell.prototype.resolve = function (p) { return this.fs.normalize(p, this.cwd); };
  /* The working directory with $HOME shown as ~ (the prompt's \w). */
  Shell.prototype.prettyCwd = function () {
    var c = this.cwd;
    if (c === HOME) return "~";
    if (c.indexOf(HOME + "/") === 0) return "~" + c.slice(HOME.length);
    return c;
  };
  Shell.prototype.prompt = function () { return USER + "@" + HOST + ":" + this.prettyCwd() + "$"; };
  Shell.prototype.saveState = function () {
    var v = {}, e = {};
    for (var k in this.vars) v[k] = this.vars[k];
    for (var x in this.exported) e[x] = true;
    return { vars: v, exported: e, cwd: this.cwd };
  };
  Shell.prototype.restoreState = function (s) {
    this.vars = Object.create(null); this.exported = Object.create(null);
    for (var k in s.vars) this.vars[k] = s.vars[k];
    for (var x in s.exported) this.exported[x] = true;
    this.cwd = s.cwd;
  };
  Shell.prototype.abort = function () { this.aborted = true; };
  Shell.prototype.isComplete = isComplete;

  /* Run a command line. io = {out(text, kind), isTTY, columns, beforeLong(name), afterLong(), clear(), interactive}
     kind is "out" (stdout), "err" (stderr) or "note" (a lab hint, not part of real output).
     Resolves to {code, stdout, stderr, outputs: [absolute paths written or removed]}. */
  Shell.prototype.run = function (src, io) {
    var self = this;
    io = io || {};
    var res = { code: 0, stdout: "", stderr: "", outputs: [] };
    var top = {
      out: function (s) { if (s === "" || s == null) return; if (isBytes(s)) s = "[binary data not shown]\n"; res.stdout += s; if (io.out) io.out(s, "out"); },
      err: function (s) { if (!s) return; res.stderr += s; if (io.out) io.out(s, "err"); },
      note: function (s) { if (!s) return; res.stderr += s; if (io.out) io.out(s, "note"); },
      info: function (s) { if (!s) return; res.stderr += s; if (io.out) io.out(s, "info"); },
      stdin: null, isTTY: !!io.isTTY, io: io
    };
    var ast;
    try { ast = parseShell(src); }
    catch (e) {
      if (!e || !e.shellSyntax) throw e;
      top.err("bash: " + e.message + "\n");
      res.code = self.lastCode = 2;
      return Promise.resolve(res);
    }
    var prev = self.fs.beginChanges();
    self.aborted = false;
    return self.exec(ast, top).then(function (code) { return code; }, function (e) {
      if (e && e.shellFail) { if (e.message) top.err(e.message + "\n"); return e.exitCode; }
      if (e && e.shellExit) return e.exitCode;
      top.err("bash: internal error in the lab shell: " + (e && e.message || e) + "\n");
      if (typeof console !== "undefined") console.error(e);
      return 1;
    }).then(function (code) {
      res.code = self.lastCode = code;
      res.outputs = self.fs.endChanges(prev);
      return res;
    });
  };

  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

  Shell.prototype.exec = async function (node, ctx) {
    if (this.aborted) return 130;
    switch (node.type) {
      case "list": return this.execList(node, ctx);
      case "andor": {
        var code = await this.exec(node.first, ctx);
        for (var i = 0; i < node.rest.length; i++) {
          if (this.aborted) return 130;
          var r = node.rest[i];
          if ((r.op === "&&" && code === 0) || (r.op === "||" && code !== 0)) code = await this.exec(r.node, ctx);
        }
        this.lastCode = code;
        return code;
      }
      case "pipe": return this.execPipe(node, ctx);
      case "simple": return this.execSimple(node, ctx);
      default: {
        var red = await this.applyRedirs(node.redirs || [], ctx);
        if (red.error) return 1;
        var c;
        try { c = await this.execCompound(node, red.ctx); }
        finally { red.finish(); }
        return c;
      }
    }
  };
  Shell.prototype.execList = async function (node, ctx) {
    var code = 0;
    for (var i = 0; i < node.items.length; i++) {
      if (this.aborted) return 130;
      var it = node.items[i];
      if (it.sep === "&") ctx.note("lab: background jobs (&) are not available; the command runs in the foreground.\n");
      code = await this.exec(it.node, ctx);
      this.lastCode = code;
    }
    return code;
  };
  Shell.prototype.execPipe = async function (node, ctx) {
    var input = ctx.stdin, code = 0, n = node.cmds.length;
    for (var k = 0; k < n; k++) {
      if (this.aborted) return 130;
      var last = k === n - 1, buf = [];
      var sub = {
        out: last ? ctx.out : function (s) { buf.push(s); },
        err: ctx.err, note: ctx.note, info: ctx.info, stdin: input, isTTY: last ? ctx.isTTY : false, io: ctx.io
      };
      code = await this.exec(node.cmds[k], sub);
      input = last ? null : { text: buf.map(function (s) { return isBytes(s) ? latin1(s, 0, s.length) : s; }).join(""), pos: 0 };
    }
    if (node.bang) code = code === 0 ? 1 : 0;
    this.lastCode = code;
    return code;
  };
  Shell.prototype.execCompound = async function (node, ctx) {
    var code = 0, guard = 0, k;
    if (node.type === "if") {
      for (k = 0; k < node.clauses.length; k++) {
        var c = await this.exec(node.clauses[k].cond, ctx);
        if (this.aborted) return 130;
        if (c === 0) return this.exec(node.clauses[k].body, ctx);
      }
      return node.elseBody ? this.exec(node.elseBody, ctx) : 0;
    }
    if (node.type === "for") {
      var items = [];
      if (node.words) {
        for (k = 0; k < node.words.length; k++) items = items.concat(await this.expandWord(node.words[k], { split: true, glob: true }, ctx));
      } else items = this.positional.slice();
      for (k = 0; k < items.length; k++) {
        if (this.aborted) return 130;
        this.setVar(node.name, items[k]);
        code = await this.exec(node.body, ctx);
        if (++guard % 200 === 0) await tick();
      }
      return code;
    }
    if (node.type === "while") {
      for (;;) {
        if (this.aborted) return 130;
        var cc = await this.exec(node.cond, ctx);
        if (node.until ? cc === 0 : cc !== 0) break;
        code = await this.exec(node.body, ctx);
        if (++guard > MAX_LOOP) { ctx.err("bash: lab: loop stopped after " + MAX_LOOP + " iterations\n"); return 1; }
        if (guard % 200 === 0) await tick();
      }
      return code;
    }
    if (node.type === "group") return this.exec(node.body, ctx);
    if (node.type === "subshell") {
      var saved = this.saveState();
      try { return await this.exec(node.body, ctx); }
      finally { this.restoreState(saved); }
    }
    return 0;
  };

  Shell.prototype.expandPart = async function (p, ctx) {
    if (p.k === "lit") return p.s;
    if (p.k === "cmd") return this.commandSub(p.src, ctx);
    if (p.k === "arith") {
      var self = this;
      var src = await this.expandString(p.src, ctx);
      return String(arith(src, function (n) { return self.getVar(n); }));
    }
    var name = p.name, v;
    if (name === "?") v = String(this.lastCode);
    else if (name === "$") v = "4242";
    else if (name === "#") v = String(this.positional.length);
    else if (name === "0") v = "bash";
    else if (/^[1-9]$/.test(name)) v = this.positional[+name - 1];
    else if (name === "@" || name === "*") v = this.positional.join(" ");
    else if (name === "!") v = "";
    else if (name === "-") v = "hB";
    else v = this.getVar(name);
    var op = p.op;
    if (!op) return v === undefined ? "" : v;
    if (op === "len") return String((v || "").length);
    var unsetOrEmpty = v === undefined || v === "", unset = v === undefined;
    switch (op) {
      case ":-": return unsetOrEmpty ? this.expandString(p.arg, ctx) : v;
      case "-": return unset ? this.expandString(p.arg, ctx) : v;
      case ":=": case "=":
        if (op === ":=" ? unsetOrEmpty : unset) { var w = await this.expandString(p.arg, ctx); this.setVar(name, w); return w; }
        return v;
      case ":+": return unsetOrEmpty ? "" : this.expandString(p.arg, ctx);
      case "+": return unset ? "" : this.expandString(p.arg, ctx);
      case ":?": case "?":
        if (op === ":?" ? unsetOrEmpty : unset) throw ShellFail("bash: " + name + ": " + (p.arg ? await this.expandString(p.arg, ctx) : "parameter null or not set"));
        return v;
    }
    v = v || "";
    var pat = await this.expandString(p.arg, ctx), re, i;
    if (op === "%" || op === "%%") {
      re = new RegExp("^" + globSource(pat, ".*") + "$");
      if (op === "%") { for (i = v.length; i >= 0; i--) if (re.test(v.slice(i))) return v.slice(0, i); }
      else { for (i = 0; i <= v.length; i++) if (re.test(v.slice(i))) return v.slice(0, i); }
      return v;
    }
    if (op === "#" || op === "##") {
      re = new RegExp("^" + globSource(pat, ".*") + "$");
      if (op === "#") { for (i = 0; i <= v.length; i++) if (re.test(v.slice(0, i))) return v.slice(i); }
      else { for (i = v.length; i >= 0; i--) if (re.test(v.slice(0, i))) return v.slice(i); }
      return v;
    }
    if (op === "/" || op === "//") {
      if (!pat) return v;
      var rep = await this.expandString(p.rep || "", ctx);
      re = new RegExp(globSource(pat, ".*"), op === "//" ? "g" : "");
      return v.replace(re, function () { return rep; });
    }
    return v;
  };
  /* Expand $VAR, ${...}, $(...) inside a raw string (the word of ${VAR:-word}). */
  Shell.prototype.expandString = async function (raw, ctx) {
    if (!raw || raw.indexOf("$") < 0 && raw.indexOf("`") < 0 && raw.indexOf("\\") < 0 && raw.indexOf("'") < 0 && raw.indexOf('"') < 0) return raw || "";
    var toks;
    try { toks = lex('"' + raw.replace(/(\\*)"/g, function (m, b) { return b.length % 2 ? m : b + '\\"'; }) + '"'); }
    catch (e) { return raw; }
    var tok = toks[0];
    if (!tok || tok.t !== "w") return raw;
    return (await this.expandWord(tok.parts, { split: false }, ctx))[0];
  };
  Shell.prototype.commandSub = async function (src, ctx) {
    var ast;
    try { ast = parseShell(src); }
    catch (e) { if (e && e.shellSyntax) { ctx.err("bash: command substitution: " + e.message + "\n"); return ""; } throw e; }
    var buf = [], saved = this.saveState();
    var sub = { out: function (s) { buf.push(isBytes(s) ? "" : s); }, err: ctx.err, note: ctx.note, info: ctx.info, stdin: null, isTTY: false, io: ctx.io };
    var code;
    try { code = await this.exec(ast, sub); }
    catch (e) { if (e && e.shellFail) { if (e.message) ctx.err(e.message + "\n"); code = e.exitCode; } else throw e; }
    finally { this.restoreState(saved); }
    this.lastCode = code;
    return buf.join("").replace(/\n+$/, "");
  };
  /* Expand one word into fields: tilde, parameters, command substitution, arithmetic, field splitting
     of unquoted expansions, pathname expansion (globs) and quote removal. */
  Shell.prototype.expandWord = async function (parts, opts, ctx) {
    var self = this, i, p;
    if (!opts.split) {
      var s = "";
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        if (p.k === "lit") {
          var t = p.s;
          if (i === 0 && !p.q && t.charAt(0) === "~" && (t.length === 1 || t.charAt(1) === "/")) t = HOME + t.slice(1);
          s += t;
        } else s += await this.expandPart(p, ctx);
      }
      return [s];
    }
    var fields = [], cur = null;
    function ensure() { if (!cur) cur = { s: "", pat: "", glob: false, quoted: false }; return cur; }
    function add(text, quoted) {
      var c = ensure();
      c.s += text;
      if (quoted) { c.pat += escapeGlob(text); c.quoted = true; }
      else { c.pat += text; if (/[*?[]/.test(text)) c.glob = true; }
    }
    function brk() { if (cur) { fields.push(cur); cur = null; } }
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      if (p.k === "lit") {
        var lt = p.s;
        if (i === 0 && !p.q && lt.charAt(0) === "~" && (lt.length === 1 || lt.charAt(1) === "/")) { add(HOME, true); lt = lt.slice(1); }
        if (lt) add(lt, p.q);
        else if (p.q) ensure().quoted = true;
        continue;
      }
      var val = await this.expandPart(p, ctx);
      if (p.q) { add(val, true); continue; }
      var pieces = val.split(/[ \t\n]+/);
      for (var k = 0; k < pieces.length; k++) {
        if (k > 0) brk();
        if (pieces[k]) add(pieces[k], false);
      }
    }
    brk();
    var out = [];
    fields.forEach(function (f) {
      if (!f.s && !f.quoted) return;
      if (f.glob && opts.glob) {
        var m = self.glob(f.pat);
        if (m.length) { Array.prototype.push.apply(out, m); return; }
        out.push(unescapeGlob(f.pat));
        return;
      }
      out.push(f.s);
    });
    return out;
  };
  Shell.prototype.glob = function (pat) {
    var fs = this.fs, self = this;
    var absolute = pat.charAt(0) === "/";
    var segs = pat.split("/"), bases = [absolute ? "/" : ""];
    function join(b, name) { return b === "" ? name : b === "/" ? "/" + name : b + "/" + name; }
    for (var i = 0; i < segs.length; i++) {
      var seg = segs[i], next = [];
      if (seg === "") {
        if (i > 0 && i === segs.length - 1) bases = bases.filter(function (b) { return fs.isDir(self.resolve(b || ".")); }).map(function (b) { return b + "/"; });
        continue;
      }
      if (!hasGlob(seg)) {
        var lit = unescapeGlob(seg);
        bases.forEach(function (b) { var c = join(b, lit); if (fs.exists(self.resolve(c))) next.push(c); });
      } else {
        var re = globRegex(seg), dotOk = seg.charAt(0) === ".";
        bases.forEach(function (b) {
          var d = self.resolve(b || ".");
          if (!fs.isDir(d)) return;
          fs.list(d).forEach(function (name) {
            if (name.charAt(0) === "." && !dotOk) return;
            if (re.test(name)) next.push(join(b, name));
          });
        });
      }
      bases = next;
      if (!bases.length) return [];
    }
    return bases.sort(cmpBytes);
  };

  /* Redirections: returns {ctx, finish(), error}. Output to files is collected and written by finish(). */
  Shell.prototype.applyRedirs = async function (redirs, ctx) {
    var self = this, files = [];
    var outT = { fn: ctx.out, tty: ctx.isTTY, orig: true }, errT = { fn: ctx.err, tty: false, orig: true, isErr: true };
    var stdin = ctx.stdin;
    var noop = { fn: function () {}, tty: false };
    function finish() {
      files.forEach(function (f) {
        var bin = f.chunks.some(isBytes), data;
        if (bin) {
          var parts = f.chunks.map(function (c) { return isBytes(c) ? c : utf8Encode(c); }), len = 0, q = 0;
          parts.forEach(function (x) { len += x.length; });
          data = new Uint8Array(len);
          parts.forEach(function (x) { data.set(x, q); q += x.length; });
        } else data = f.chunks.join("");
        try { self.fs.write(f.abs, data, { append: true }); } catch (e) { ctx.err("bash: " + f.name + ": " + (e.fsMessage || e.message) + "\n"); }
      });
    }
    function openOut(name, append) {
      if (name === "/dev/null") return noop;
      if (name === "/dev/stdout") return outT;
      if (name === "/dev/stderr") return errT;
      var abs = self.resolve(name), node = self.fs.lookup(abs);
      if (node && node.type === "d") throw ShellFail("bash: " + name + ": Is a directory");
      var pn = self.fs.lookup(dirname(abs));
      if (!pn) throw ShellFail("bash: " + name + ": No such file or directory");
      if (pn.type !== "d") throw ShellFail("bash: " + name + ": Not a directory");
      if (!append || !node) self.fs.write(abs, "");
      var f = { abs: abs, name: name, chunks: [] };
      files.push(f);
      return { fn: function (s) { f.chunks.push(s); }, tty: false };
    }
    try {
      for (var i = 0; i < redirs.length; i++) {
        var r = redirs[i];
        var target = (await this.expandWord(r.target, { split: false }, ctx))[0];
        if (r.op === ">&" || r.op === "<&") {
          var fd = r.fd == null ? (r.op === ">&" ? 1 : 0) : r.fd;
          if (target === "1" || target === "2") {
            var src = target === "1" ? outT : errT;
            if (fd === 1) outT = src; else if (fd === 2) errT = src;
          } else if (target !== "-" && r.op === ">&" && r.fd == null) {
            var t2 = openOut(target, false); outT = t2; errT = t2;
          } else if (target !== "-") throw ShellFail("bash: " + target + ": ambiguous redirect");
          continue;
        }
        if (r.op === "<") {
          if (target === "/dev/null") { stdin = { text: "", pos: 0 }; continue; }
          var abs = this.resolve(target), node = this.fs.lookup(abs);
          if (!node) throw ShellFail("bash: " + target + ": No such file or directory");
          if (node.type === "d") throw ShellFail("bash: " + target + ": Is a directory");
          var d = node.data;
          stdin = { text: isBytes(d) ? latin1(d, 0, d.length) : d, pos: 0, name: target };
          continue;
        }
        var t = openOut(target, r.op === ">>" || r.op === "&>>");
        if (r.op === "&>" || r.op === "&>>") { outT = t; errT = t; }
        else if (r.fd === 2) errT = t;
        else outT = t;
      }
    } catch (e) {
      if (e && e.shellFail) { ctx.err(e.message + "\n"); finish(); return { error: true, finish: function () {} }; }
      throw e;
    }
    var errOrig = errT.orig && errT.isErr;
    var c = {
      out: outT.fn, err: errT.fn,
      note: errOrig ? ctx.note : function () {},
      info: errOrig ? ctx.info : errT.fn,
      stdin: stdin, isTTY: !!outT.tty, io: ctx.io
    };
    return { ctx: c, finish: finish };
  };

  Shell.prototype.execSimple = async function (node, ctx) {
    var self = this, argv = [], i, j;
    try {
      for (i = 0; i < node.words.length; i++) {
        var f = await this.expandWord(node.words[i], { split: true, glob: true }, ctx);
        for (j = 0; j < f.length; j++) argv.push(f[j]);
      }
      var assigns = [];
      for (i = 0; i < node.assigns.length; i++) {
        var a = node.assigns[i];
        var v = (await this.expandWord(a.value, { split: false }, ctx))[0];
        if (a.append) v = (this.getVar(a.name) || "") + v;
        assigns.push([a.name, v]);
      }
    } catch (e) {
      if (e && e.shellFail) { if (e.message) ctx.err(e.message + "\n"); return e.exitCode; }
      throw e;
    }
    var red = await this.applyRedirs(node.redirs, ctx);
    if (red.error) return 1;
    var code;
    try {
      if (!argv.length) {
        assigns.forEach(function (kv) { self.setVar(kv[0], kv[1], !!self.exported[kv[0]]); });
        code = 0;
      } else code = await this.invoke(argv, red.ctx, assigns);
    } finally { red.finish(); }
    this.lastCode = code;
    return code;
  };

  var NOT_FOUND_NOTES = {
    plink2: "The practical uses PLINK 1.9, which the lab runs as plink.",
    "plink1.9": "PLINK 1.9 is called plink in the lab (and in the practical).",
    bcftools: "GrafAnc in the lab reads PLINK files directly, so bcftools is not needed here.",
    python: "Python is not part of the lab; the practical uses bash, PLINK and R.",
    python3: "Python is not part of the lab; the practical uses bash, PLINK and R.",
    nano: "The lab has no text editor. Write small files with echo 'text' > file or printf.",
    vi: "The lab has no text editor. Write small files with echo 'text' > file or printf.",
    vim: "The lab has no text editor. Write small files with echo 'text' > file or printf.",
    emacs: "The lab has no text editor. Write small files with echo 'text' > file or printf.",
    curl: "The lab has no network. The toy data are already in data/inputs/.",
    wget: "The lab has no network. The toy data are already in data/inputs/.",
    ssh: "The lab runs inside this page; there is no remote computer to connect to.",
    conda: "Installing software does not work in the lab: plink and the commands listed by help are already here. The Setup page explains how to install PLINK on your own computer.",
    mamba: "Installing software does not work in the lab. The Setup page explains how to install PLINK on your own computer.",
    pip: "Installing software does not work in the lab. The Setup page explains how to install PLINK on your own computer.",
    brew: "Installing software does not work in the lab. The Setup page explains how to install PLINK on your own computer.",
    apt: "Installing software does not work in the lab. The Setup page explains how to install PLINK on your own computer.",
    "apt-get": "Installing software does not work in the lab. The Setup page explains how to install PLINK on your own computer.",
    sudo: "There is no administrator account in the lab, and nothing here needs one.",
    docker: "Containers do not run in the lab. The Setup page explains the Docker route on your own computer.",
    sed: "sed is not part of the lab's shell; awk, grep, cut and tr cover the practical's text processing."
  };
  Shell.prototype.notFound = function (name, ctx) {
    ctx.err("bash: " + name + ": command not found\n");
    if (NOT_FOUND_NOTES[name]) ctx.note("lab: " + NOT_FOUND_NOTES[name] + "\n");
    else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && /[A-Z]/.test(name) && CMDS[name.toLowerCase()]) ctx.note("lab: commands are case-sensitive; did you mean " + name.toLowerCase() + "?\n");
  };
  Shell.prototype.invoke = async function (argv, ctx, assigns) {
    var name = argv[0], cmd = null, label = name;
    var env = this.env();
    (assigns || []).forEach(function (kv) { env[kv[0]] = kv[1]; });
    if (name.indexOf("/") >= 0) {
      var abs = this.resolve(name), node = this.fs.lookup(abs);
      if (!node) {
        ctx.err("bash: " + name + ": No such file or directory\n");
        if (/\/grafanc$/.test(abs)) ctx.note("lab: the GrafAnc program appears after the install step (git clone https://github.com/jimmy-penn/grafanc.git in $analysis_dir).\n");
        return 127;
      }
      if (node.type === "d") { ctx.err("bash: " + name + ": Is a directory\n"); return 126; }
      var prog = node.prog || (/\/grafanc$/.test(abs) ? "grafanc" : null);
      if (prog) { cmd = CMDS[prog]; label = prog; }
      else if (!node.exec) { ctx.err("bash: " + name + ": Permission denied\n"); return 126; }
      else return this.runScript(this.fs.readText(abs), ctx, argv, true);
    } else cmd = CMDS[name];
    if (!cmd) { this.notFound(name, ctx); return 127; }
    var c = {
      argv: argv, args: argv.slice(1), name: name,
      out: ctx.out, err: ctx.err, note: ctx.note, info: ctx.info, stdin: ctx.stdin, isTTY: ctx.isTTY, io: ctx.io || {},
      env: env, sh: this, fs: this.fs,
      columns: (ctx.io && ctx.io.columns) || 80
    };
    var long = label === "plink" || label === "grafanc";
    if (long && c.io.beforeLong) await c.io.beforeLong(label);
    try {
      var code = await cmd.call(this, c);
      return typeof code === "number" ? code : 0;
    } catch (e) {
      if (e && e.shellFail) { if (e.message) ctx.err(e.message + "\n"); return e.exitCode; }
      if (e && e.shellExit) throw e;
      if (e && e.fsMessage) { ctx.err(name + ": " + e.path + ": " + e.fsMessage + "\n"); return 1; }
      throw e;
    } finally {
      if (long && c.io.afterLong) c.io.afterLong();
    }
  };
  /* Run a script's text: in a subshell (bash file, ./file) or in the current shell (source file). */
  Shell.prototype.runScript = async function (text, ctx, argv, subshell) {
    var ast;
    try { ast = parseShell(text || ""); }
    catch (e) { if (e && e.shellSyntax) { ctx.err((argv[0] || "bash") + ": " + e.message + "\n"); return 2; } throw e; }
    var saved = subshell ? this.saveState() : null, savedPos = this.positional;
    this.positional = argv.slice(1);
    this.positionalDepth = (this.positionalDepth || 0) + 1;
    try { return await this.exec(ast, ctx); }
    catch (e) { if (e && e.shellExit) return e.exitCode; throw e; }
    finally { this.positionalDepth--; this.positional = savedPos; if (saved) this.restoreState(saved); }
  };

  /* ======================================================================
     7. Commands
     Each command is async function(c) → exit code, with c = {args, argv, name, out, err, note, info,
     stdin: {text, pos} | null, isTTY, io, env, sh, fs, columns}.
     out(text) is stdout; err(text) stderr shown in red; info(text) stderr shown plainly;
     note(text) a lab hint that real programs do not print.
     ====================================================================== */
  var CMDS = Object.create(null), HELP = Object.create(null);
  function def(names, help, fn) {
    names.split(" ").forEach(function (n) { CMDS[n] = fn; if (help) HELP[n] = help; });
  }
  function getopt(args, flags, valued, longs) {
    var opts = {}, operands = [], error = null;
    longs = longs || {};
    for (var i = 0; i < args.length; i++) {
      var a = args[i];
      if (a === "--") { operands = operands.concat(args.slice(i + 1)); break; }
      if (a.length > 1 && a.charAt(0) === "-") {
        if (a.charAt(1) === "-") {
          var eq = a.indexOf("="), key = eq > 0 ? a.slice(0, eq) : a, val = eq > 0 ? a.slice(eq + 1) : null;
          var target = Object.prototype.hasOwnProperty.call(longs, a) ? longs[a] : Object.prototype.hasOwnProperty.call(longs, key) ? longs[key] : undefined;
          if (target === undefined) { error = "unrecognized option '" + a + "'"; break; }
          if (target === "") continue;
          if (target.slice(-1) === "=") {
            if (val === null) { val = args[++i]; if (val === undefined) { error = "option '" + key + "' requires an argument"; break; } }
            opts[target.slice(0, -1)] = val;
          } else opts[target] = true;
          continue;
        }
        for (var j = 1; j < a.length; j++) {
          var ch = a.charAt(j);
          if (flags.indexOf(ch) >= 0) { opts[ch] = true; continue; }
          if (valued.indexOf(ch) >= 0) {
            var v = a.slice(j + 1);
            if (!v) { v = args[++i]; if (v === undefined) { error = "option requires an argument -- '" + ch + "'"; break; } }
            opts[ch] = v;
            break;
          }
          error = "invalid option -- '" + ch + "'";
          break;
        }
        if (error) break;
        continue;
      }
      operands.push(a);
    }
    return { opts: opts, operands: operands, error: error };
  }
  function usageError(c, msg, code) {
    c.err(c.name + ": " + msg + "\nTry '" + c.name + " --help' for more information.\n");
    return code == null ? 1 : code;
  }
  function looksBinary(bytes) {
    var n = Math.min(bytes.length, 4096);
    for (var i = 0; i < n; i++) {
      var b = bytes[i];
      if (b === 0 || b < 9 || (b > 13 && b < 32 && b !== 27)) return true;
    }
    return false;
  }
  function readStdin(c) {
    if (!c.stdin) return null;
    var t = c.stdin.text.slice(c.stdin.pos);
    c.stdin.pos = c.stdin.text.length;
    return t;
  }
  function readInputs(c, operands) {
    if (!operands.length) operands = ["-"];
    return operands.map(function (name) {
      if (name === "-") {
        if (!c.stdin) return { name: name, error: "keyboard" };
        return { name: name, text: readStdin(c), stdin: true };
      }
      if (name === "/dev/null") return { name: name, text: "" };
      var abs = c.sh.resolve(name), node = c.fs.lookup(abs);
      if (!node) return { name: name, error: "No such file or directory" };
      if (node.type === "d") return { name: name, error: "Is a directory" };
      var d = node.data;
      if (isBytes(d)) {
        var bin = looksBinary(d);
        return { name: name, abs: abs, bytes: d, binary: bin, text: bin ? null : utf8Decode(d) };
      }
      return { name: name, abs: abs, text: d };
    });
  }
  function textOf(f) {
    if (f.text != null) return f.text;
    if (f.bytes) return latin1(f.bytes, 0, f.bytes.length);
    return "";
  }
  function keyboardNote(c) {
    c.note("lab: " + c.name + " is waiting for text from the keyboard, which this terminal cannot send to a command. Give a file name, or pipe text into it (for example: head FILE | " + c.name + ").\n");
  }
  function describeBinary(name) {
    if (/\.bed$/i.test(name)) return "PLINK .bed genotypes, two bits per genotype";
    if (/\.gz$/i.test(name)) return "gzip-compressed";
    return "not text";
  }
  function binaryNote(c, name) {
    c.note("lab: " + name + " is a binary file (" + describeBinary(name) + "), so its bytes are not printable text. Look inside with  xxd -l 32 " + name + "  or click it in the file panel.\n");
  }
  function toLines(text) {
    if (!text) return [];
    var a = text.split("\n");
    if (a[a.length - 1] === "") a.pop();
    return a;
  }
  function fromLines(lines) { return lines.length ? lines.join("\n") + "\n" : ""; }
  function ansi(code, s, on) { return on ? "\x1b[" + code + "m" + s + "\x1b[0m" : s; }
  function hintOnce(c, key, text) {
    if (c.sh.hintsShown[key]) return;
    c.sh.hintsShown[key] = true;
    c.note(text);
  }

  /* ---------------- PLINK and GrafAnc ---------------- */
  function emulatorIO(c, written) {
    var sh = c.sh;
    function openError(p) {
      var e = new Error("Failed to open " + p + ".");
      e.labOpen = true; e.path = p;
      return e;
    }
    return {
      // The program path as typed, after expansion ("plink", "/home/student/…/grafanc/bin/grafanc", "bin/grafanc").
      argv0: c.argv[0],
      read: function (p) {
        var abs = sh.resolve(p), node = sh.fs.lookup(abs);
        if (!node || node.type !== "f") return null;
        var d = node.data;
        if (/\.(bed|gz)$/i.test(abs)) return isBytes(d) ? d : utf8Encode(d);
        return isBytes(d) ? utf8Decode(d) : d;
      },
      write: function (p, data) {
        var abs = sh.resolve(p);
        try { sh.fs.write(abs, data); } catch (e) { throw openError(p); }
        written.push(abs);
      },
      // Deletes a file (PLINK removes a stale <out>-merge.fam this way); false if there was none.
      // The removal is recorded like a write, so lab:fs-change reports it.
      remove: function (p) {
        var abs = sh.resolve(p), node = sh.fs.lookup(abs);
        if (!node || node.type !== "f") return false;
        sh.fs.remove(abs);
        written.push(abs);
        return true;
      },
      exists: function (p) { return sh.fs.exists(sh.resolve(p)); },
      // One line of console output; print(line, "stderr") goes to standard error, as PLINK's
      // logerrprint() does for errors and warnings.
      print: function (line, stream) {
        var s = String(line) + "\n";
        if (stream === "stderr") c.err(s); else c.out(s);
      },
      list: function (p) { try { return sh.fs.list(sh.resolve(p)); } catch (e) { return null; } },
      cwd: sh.cwd,
      env: c.env
    };
  }
  function runEmulator(c, core, label, extra) {
    var written = [], io = emulatorIO(c, written);
    var r;
    try { r = extra ? core.run(c.args.slice(), io, extra) : core.run(c.args.slice(), io); }
    catch (e) { return Promise.reject(e); }
    return Promise.resolve(r).then(function (res) {
      return res && typeof res.code === "number" ? res.code : 0;
    }, function (e) { throw e; }).catch(function (e) {
      if (e && e.labOpen) { c.err("Error: Failed to open " + e.path + ".\n"); return 2; }
      c.err(label + ": internal error in the lab emulator: " + (e && e.message || e) + "\n");
      if (typeof console !== "undefined") console.error(e);
      return 1;
    });
  }
  def("plink", "plink --bfile PREFIX [options] --out PREFIX   PLINK 1.9 (lab emulator; see the practical pages)", function (c) {
    var P = c.sh.getPlink();
    if (!P || typeof P.run !== "function") {
      c.err("bash: plink: command not found\n");
      c.note("lab: the PLINK emulator (assets/js/lab/plink-core.js) did not load on this page.\n");
      return 127;
    }
    return runEmulator(c, P, "plink");
  });
  def("grafanc", "grafanc INPUT_PREFIX OUTPUT.txt   GrafAnc genetic-ancestry assignment (lab emulator; needs GRAFPATH)", function (c) {
    var A = c.sh.getGrafAnc();
    if (!A || typeof A.run !== "function") {
      c.err("bash: grafanc: command not found\n");
      c.note("lab: the GrafAnc emulator (assets/js/lab/grafanc-core.js) did not load on this page.\n");
      return 127;
    }
    return runEmulator(c, A, "grafanc", c.env);
  });

  /* ---------------- Text output ---------------- */
  function backslashEscapes(s, forEcho) {
    var out = "", i = 0, m;
    while (i < s.length) {
      var ch = s.charAt(i);
      if (ch !== "\\" || i + 1 >= s.length) { out += ch; i++; continue; }
      var d = s.charAt(i + 1);
      var map = { n: "\n", t: "\t", r: "\r", a: "\x07", b: "\b", f: "\f", v: "\v", e: "\x1b", "\\": "\\", '"': '"' };
      if (map[d] != null) { out += map[d]; i += 2; continue; }
      if (d === "c" && forEcho) return { text: out, stop: true };
      if (forEcho && d === "0" && (m = /^0([0-7]{0,3})/.exec(s.slice(i + 1)))) { out += String.fromCharCode(parseInt(m[1] || "0", 8)); i += 1 + m[0].length; continue; }
      if (!forEcho && (m = /^[0-7]{1,3}/.exec(s.slice(i + 1)))) { out += String.fromCharCode(parseInt(m[0], 8)); i += 1 + m[0].length; continue; }
      if ((m = /^x([0-9a-fA-F]{1,2})/.exec(s.slice(i + 1)))) { out += String.fromCharCode(parseInt(m[1], 16)); i += 1 + m[0].length; continue; }
      out += ch + d; i += 2;
    }
    return { text: out, stop: false };
  }
  def("echo", "echo [-n] [-e] [TEXT ...]   print the arguments", function (c) {
    var args = c.args.slice(), nl = true, esc = false;
    while (args.length && /^-[neE]+$/.test(args[0])) {
      var f = args.shift();
      if (f.indexOf("n") >= 0) nl = false;
      if (f.indexOf("e") >= 0) esc = true;
      if (f.indexOf("E") >= 0) esc = false;
    }
    var s = args.join(" ");
    if (esc) { var r = backslashEscapes(s, true); s = r.text; if (r.stop) nl = false; }
    c.out(s + (nl ? "\n" : ""));
    return 0;
  });
  def("printf", "printf FORMAT [ARG ...]   formatted output (%s %d %f %e %g %x %c %%)", function (c) {
    if (!c.args.length) { c.err("bash: printf: usage: printf [-v var] format [arguments]\n"); return 2; }
    var fmt = c.args[0], args = c.args.slice(1), out = "", guard = 0, bad = null;
    var fmtE = backslashEscapes(fmt, false).text;
    do {
      var r = formatC(fmtE, function (k) { return args[k]; }, function (k) {
        var s = args[k];
        if (s === undefined || s === "") return 0;
        var m = /^\s*[-+]?(\d+\.?\d*(e[-+]?\d+)?|\.\d+(e[-+]?\d+)?|0x[0-9a-f]+)\s*$/i.exec(s);
        if (m) return Number(s);
        if (/^['"]./.test(s)) return s.charCodeAt(1);
        bad = s;
        return parseFloat(s) || 0;
      }, args.length);
      out += r.text;
      args = args.slice(r.used);
    } while (args.length && r.used > 0 && ++guard < 10000);
    c.out(out);
    if (bad !== null) { c.err("bash: printf: " + bad + ": invalid number\n"); return 1; }
    return 0;
  });
  def("seq", "seq [FIRST [STEP]] LAST   print a sequence of numbers (-s SEP)", function (c) {
    var g = getopt(c.args, "w", "s", { "--separator": "s=" });
    var nums = [];
    for (var k = 0; k < g.operands.length; k++) {
      var a = g.operands[k];
      if (/^-?\d*\.?\d+(e[-+]?\d+)?$/i.test(a)) nums.push(a);
      else return usageError(c, "invalid floating point argument: '" + a + "'");
    }
    if (g.error && !/^-?\d/.test(g.error)) return usageError(c, g.error);
    if (!nums.length || nums.length > 3) return usageError(c, nums.length ? "extra operand '" + nums[3] + "'" : "missing operand");
    var first = nums.length > 1 ? +nums[0] : 1, step = nums.length === 3 ? +nums[1] : 1, last = +nums[nums.length - 1];
    var dec = Math.max.apply(null, nums.map(function (s) { var i = s.indexOf("."); return i < 0 || /e/i.test(s) ? 0 : s.length - i - 1; }));
    if (step === 0) return usageError(c, "invalid Zero increment value: '0'");
    var out = [], sep = g.opts.s != null ? g.opts.s : "\n";
    for (var v = first, n = 0; step > 0 ? v <= last + 1e-12 : v >= last - 1e-12; v = first + (++n) * step) {
      out.push(dec ? v.toFixed(dec) : String(Math.round(v * 1e12) / 1e12));
      if (out.length > 1e6) break;
    }
    c.out(out.length ? out.join(sep) + "\n" : "");
    return 0;
  });

  /* ---------------- Navigation ---------------- */
  def("cd", "cd [DIR]   change the working directory (cd alone goes home, cd - goes back)", function (c) {
    var sh = c.sh, target = c.args[0];
    if (c.args.length > 1) { c.err("bash: cd: too many arguments\n"); return 1; }
    if (target === undefined) target = sh.getVar("HOME") || HOME;
    if (target === "") return 0;
    if (target === "-") {
      target = sh.getVar("OLDPWD");
      if (!target) { c.err("bash: cd: OLDPWD not set\n"); return 1; }
      c.out(target + "\n");
    }
    var abs = sh.resolve(target), node = sh.fs.lookup(abs);
    if (!node) { c.err("bash: cd: " + target + ": No such file or directory\n"); return 1; }
    if (node.type !== "d") { c.err("bash: cd: " + target + ": Not a directory\n"); return 1; }
    sh.setVar("OLDPWD", sh.cwd, true);
    sh.cwd = abs;
    sh.setVar("PWD", abs, true);
    return 0;
  });
  def("pwd", "pwd   print the working directory", function (c) { c.out(c.sh.cwd + "\n"); return 0; });

  /* ---------------- ls ---------------- */
  function columnize(raw, shown, width) {
    var n = raw.length;
    if (!n) return "";
    var layout = null;
    for (var cols = Math.min(n, Math.max(1, Math.floor(width / 3))); cols >= 1; cols--) {
      var rows = Math.ceil(n / cols), used = Math.ceil(n / rows), widths = [], total = 0;
      for (var j = 0; j < used; j++) {
        var w = 0;
        for (var r = 0; r < rows; r++) { var idx = j * rows + r; if (idx < n) w = Math.max(w, raw[idx].length); }
        widths.push(w);
        total += w + (j < used - 1 ? 2 : 0);
      }
      if (total <= width || cols === 1) { layout = { rows: rows, used: used, widths: widths }; break; }
    }
    var out = "";
    for (var rr = 0; rr < layout.rows; rr++) {
      var line = "";
      for (var jj = 0; jj < layout.used; jj++) {
        var k = jj * layout.rows + rr;
        if (k >= n) continue;
        line += shown[k];
        var nextK = (jj + 1) * layout.rows + rr;
        if (jj < layout.used - 1 && nextK < n) line += new Array(layout.widths[jj] - raw[k].length + 3).join(" ");
      }
      out += line + "\n";
    }
    return out;
  }
  def("ls", "ls [-l] [-h] [-a] [-A] [-1] [-d] [-t] [-S] [-r] [-R] [-F] [FILE ...]   list files", function (c) {
    var g = getopt(c.args, "lhaA1dtSrRFCG", "", { "--all": "a", "--almost-all": "A", "--human-readable": "h", "--reverse": "r",
      "--directory": "d", "--recursive": "R", "--classify": "F", "--color": "", "--color=auto": "", "--color=always": "", "--color=never": "" });
    if (g.error) return usageError(c, g.error, 2);
    var o = g.opts, fs = c.fs, sh = c.sh, code = 0, color = c.isTTY;
    var ops = g.operands.length ? g.operands : ["."], files = [], dirs = [];
    ops.forEach(function (a) {
      var abs = sh.resolve(a), node = fs.lookup(abs);
      if (!node) { c.err("ls: cannot access '" + a + "': No such file or directory\n"); code = 2; return; }
      if (node.type === "d" && !o.d) dirs.push({ name: a, abs: abs, node: node });
      else files.push({ name: a, abs: abs, node: node });
    });
    function sizeOf(it) { return fs.fileSize(it.node); }
    function sortItems(items) {
      items.sort(function (x, y) {
        if (o.t) { var d = y.node.mtime - x.node.mtime; if (d) return d; }
        if (o.S) { var s = sizeOf(y) - sizeOf(x); if (s) return s; }
        return cmpBytes(x.name, y.name);
      });
      if (o.r) items.reverse();
      return items;
    }
    function shownName(it) {
      var n = it.name, isD = it.node.type === "d", ex = !isD && it.node.exec;
      var s = isD ? ansi("1;34", n, color) : ex ? ansi("1;32", n, color) : n;
      if (o.F) s += isD ? "/" : ex ? "*" : "";
      return s;
    }
    function rawName(it) { return it.name + (o.F ? (it.node.type === "d" ? "/" : it.node.exec ? "*" : "") : ""); }
    function blocks(it) { return it.node.type === "d" ? 4 : Math.ceil(sizeOf(it) / 4096) * 4; }
    function fmt(items) {
      if (!items.length) return "";
      if (o.l) {
        var rows = items.map(function (it) {
          var n = it.node, isD = n.type === "d";
          var links = isD ? 2 + Object.keys(n.kids).filter(function (k) { return n.kids[k].type === "d"; }).length : 1;
          var size = sizeOf(it);
          return { mode: isD ? "drwxr-xr-x" : n.exec ? "-rwxr-xr-x" : "-rw-r--r--", links: String(links), size: o.h ? humanSize(size) : String(size), date: lsDate(n.mtime), name: shownName(it) };
        });
        var lw = 0, sw = 0;
        rows.forEach(function (r) { lw = Math.max(lw, r.links.length); sw = Math.max(sw, r.size.length); });
        return rows.map(function (r) { return r.mode + " " + pad(r.links, lw) + " " + USER + " " + USER + " " + pad(r.size, sw) + " " + r.date + " " + r.name; }).join("\n") + "\n";
      }
      if (o["1"] || !c.isTTY) return items.map(shownName).join("\n") + "\n";
      return columnize(items.map(rawName), items.map(shownName), c.columns);
    }
    var out = "";
    if (files.length) out += fmt(sortItems(files));
    var multi = files.length + dirs.length > 1 || o.R, first = !files.length;
    function listDir(label, abs, node) {
      if (!first) out += "\n";
      first = false;
      if (multi) out += label + ":\n";
      var names = Object.keys(node.kids);
      if (!o.a && !o.A) names = names.filter(function (n) { return n.charAt(0) !== "."; });
      var items = names.map(function (n) { return { name: n, abs: (abs === "/" ? "" : abs) + "/" + n, node: node.kids[n] }; });
      sortItems(items);
      if (o.a) items = [{ name: ".", node: node }, { name: "..", node: fs.lookup(dirname(abs)) || node }].concat(items);
      if (o.l) {
        var total = 0;
        items.forEach(function (it) { total += blocks(it); });
        out += "total " + (o.h ? (total ? humanSize(total * 1024) : "0") : total) + "\n";
      }
      out += fmt(items);
      if (o.R) items.forEach(function (it) {
        if (it.node.type === "d" && it.name !== "." && it.name !== "..") listDir((label === "/" ? "" : label) + "/" + it.name, it.abs, it.node);
      });
    }
    sortItems(dirs).forEach(function (d) { listDir(d.name, d.abs, d.node); });
    c.out(out);
    return code;
  });

  /* ---------------- Files ---------------- */
  def("mkdir", "mkdir [-p] [-v] DIR ...   make directories (-p: with parents, no error if present)", function (c) {
    var g = getopt(c.args, "pv", "m", { "--parents": "p", "--verbose": "v" });
    if (g.error) return usageError(c, g.error);
    if (!g.operands.length) return usageError(c, "missing operand");
    var code = 0;
    g.operands.forEach(function (d) {
      try {
        c.fs.mkdir(c.sh.resolve(d), !!g.opts.p);
        if (g.opts.v) c.out("mkdir: created directory '" + d + "'\n");
      } catch (e) { c.err("mkdir: cannot create directory '" + d + "': " + (e.fsMessage || e.message) + "\n"); code = 1; }
    });
    return code;
  });
  def("rmdir", "rmdir DIR ...   remove empty directories", function (c) {
    var g = getopt(c.args, "pv", "", {});
    if (g.error) return usageError(c, g.error);
    if (!g.operands.length) return usageError(c, "missing operand");
    var code = 0;
    g.operands.forEach(function (d) {
      var abs = c.sh.resolve(d), n = c.fs.lookup(abs);
      if (!n) { c.err("rmdir: failed to remove '" + d + "': No such file or directory\n"); code = 1; return; }
      if (n.type !== "d") { c.err("rmdir: failed to remove '" + d + "': Not a directory\n"); code = 1; return; }
      try { c.fs.remove(abs, false); } catch (e) { c.err("rmdir: failed to remove '" + d + "': " + e.fsMessage + "\n"); code = 1; }
    });
    return code;
  });
  def("touch", "touch FILE ...   create empty files or update their times", function (c) {
    var g = getopt(c.args, "acm", "dt", {});
    if (g.error) return usageError(c, g.error);
    if (!g.operands.length) return usageError(c, "missing file operand");
    var code = 0;
    g.operands.forEach(function (f) {
      var abs = c.sh.resolve(f);
      try { if (!(g.opts.c && !c.fs.exists(abs))) c.fs.touch(abs); }
      catch (e) { c.err("touch: cannot touch '" + f + "': " + (e.fsMessage || e.message) + "\n"); code = 1; }
    });
    return code;
  });
  def("chmod", "chmod MODE FILE ...   change permissions (the lab only tracks +x)", function (c) {
    var args = c.args.filter(function (a) { return a !== "-R" && a !== "-v" && a !== "-f"; });
    if (args.length < 2) return usageError(c, args.length ? "missing operand after '" + args[0] + "'" : "missing operand");
    var mode = args[0];
    if (!/^([ugoa]*[-+=][rwxXst]*,?)+$|^[0-7]{3,4}$/.test(mode)) { c.err("chmod: invalid mode: '" + mode + "'\nTry 'chmod --help' for more information.\n"); return 1; }
    var code = 0;
    args.slice(1).forEach(function (f) {
      var n = c.fs.lookup(c.sh.resolve(f));
      if (!n) { c.err("chmod: cannot access '" + f + "': No such file or directory\n"); code = 1; return; }
      if (n.type === "f") {
        if (/\+[rwXst]*x/.test(mode) || (/^[0-7]{3,4}$/.test(mode) && parseInt(mode.slice(-3, -2), 8) & 1)) n.exec = true;
        else if (/-[rwXst]*x/.test(mode) || /^[0-7]{3,4}$/.test(mode)) { if (!n.prog) n.exec = false; }
      }
    });
    return code;
  });
  function copyOrMove(c, move) {
    var g = getopt(c.args, move ? "fivnu" : "rRfvpaiunL", "t", { "--recursive": "r", "--force": "f", "--verbose": "v", "--archive": "a", "--no-clobber": "n" });
    if (g.error) return usageError(c, g.error);
    var o = g.opts, ops = g.operands.slice(), fs = c.fs, sh = c.sh, code = 0, cmd = c.name;
    if (o.t) ops.push(o.t);
    if (ops.length < 2) return usageError(c, ops.length ? "missing destination file operand after '" + ops[0] + "'" : "missing file operand");
    var dest = ops.pop(), dAbs = sh.resolve(dest), dIsDir = fs.isDir(dAbs);
    if (ops.length > 1 && !dIsDir) { c.err(cmd + ": target '" + dest + "' is not a directory\n"); return 1; }
    ops.forEach(function (src) {
      var sAbs = sh.resolve(src), node = fs.lookup(sAbs);
      if (!node) { c.err(cmd + ": cannot stat '" + src + "': No such file or directory\n"); code = 1; return; }
      if (!move && node.type === "d" && !o.r && !o.R && !o.a) { c.err("cp: -r not specified; omitting directory '" + src + "'\n"); code = 1; return; }
      var target = dIsDir ? (dAbs === "/" ? "" : dAbs) + "/" + basename(sAbs) : dAbs;
      if (target === sAbs) { c.err(cmd + ": '" + src + "' and '" + dest + "' are the same file\n"); code = 1; return; }
      if (node.type === "d" && (target + "/").indexOf(sAbs + "/") === 0) { c.err(cmd + ": cannot " + (move ? "move" : "copy") + " a directory, '" + src + "', into itself, '" + dest + "'\n"); code = 1; return; }
      var tNode = fs.lookup(target);
      if (tNode && o.n) return;
      if (tNode && tNode.type === "d" && node.type !== "d") { c.err(cmd + ": cannot overwrite directory '" + target + "' with non-directory\n"); code = 1; return; }
      try {
        if (move) { if (tNode) fs.remove(target, true); fs.move(sAbs, target); }
        else fs.copy(sAbs, target);
        if (o.v) c.out((move ? "renamed " : "") + "'" + src + "' -> '" + (dIsDir ? dest.replace(/\/$/, "") + "/" + basename(sAbs) : dest) + "'\n");
      } catch (e) { c.err(cmd + ": cannot create '" + dest + "': " + (e.fsMessage || e.message) + "\n"); code = 1; }
    });
    return code;
  }
  def("cp", "cp [-r] [-v] SOURCE ... DEST   copy files (-r: directories too)", function (c) { return copyOrMove(c, false); });
  def("mv", "mv [-v] SOURCE ... DEST   move or rename files", function (c) { return copyOrMove(c, true); });
  def("rm", "rm [-r] [-f] [-v] FILE ...   remove files (-r: directories too; -f: no error if missing)", function (c) {
    var g = getopt(c.args, "rRfvid", "", { "--recursive": "r", "--force": "f", "--verbose": "v" });
    if (g.error) return usageError(c, g.error);
    var o = g.opts, code = 0, inputs = false;
    if (!g.operands.length) { if (o.f) return 0; return usageError(c, "missing operand"); }
    g.operands.forEach(function (f) {
      var abs = c.sh.resolve(f), n = c.fs.lookup(abs);
      if (abs === "/") { c.err("rm: it is dangerous to operate recursively on '/'\nrm: use --no-preserve-root to override this failsafe\n"); code = 1; return; }
      if (/(^|\/)\.\.?$/.test(f)) { c.err("rm: refusing to remove '.' or '..' directory: skipping '" + f + "'\n"); code = 1; return; }
      if (!n) { if (!o.f) { c.err("rm: cannot remove '" + f + "': No such file or directory\n"); code = 1; } return; }
      if (n.type === "d" && !o.r && !o.R) {
        if (o.d && !Object.keys(n.kids).length) { c.fs.remove(abs, false); return; }
        c.err("rm: cannot remove '" + f + "': Is a directory\n"); code = 1; return;
      }
      if ((abs + "/").indexOf(PROJECT + "/data/") === 0 || (PROJECT + "/data/").indexOf(abs + "/") === 0) inputs = true;
      if (o.v) {
        var vlist = c.fs.walk(abs, true).reverse();
        vlist.forEach(function (p) { var t = c.fs.lookup(p); c.out((t && t.type === "d" ? "removed directory '" : "removed '") + (f + p.slice(abs.length)) + "'\n"); });
      }
      c.fs.remove(abs, true);
    });
    if (inputs) hintOnce(c, "rm-inputs", "lab: you removed toy input data. The Reset files button above the terminal restores the files the page started with.\n");
    return code;
  });
  def("du", "du [-s] [-h] [-a] [-c] [PATH ...]   disk usage (in 1K blocks; -h human-readable)", function (c) {
    var g = getopt(c.args, "shacbk", "d", { "--summarize": "s", "--human-readable": "h", "--all": "a", "--total": "c", "--max-depth": "d=" });
    if (g.error) return usageError(c, g.error);
    var o = g.opts, fs = c.fs, sh = c.sh, code = 0, grand = 0, lines = [];
    var maxDepth = o.s ? 0 : o.d != null ? parseInt(o.d, 10) : Infinity;
    function fmtK(k) { return o.h ? (k ? humanSize(k * 1024) : "0") : String(k); }
    (g.operands.length ? g.operands : ["."]).forEach(function (a) {
      var abs = sh.resolve(a), n = fs.lookup(abs);
      if (!n) { c.err("du: cannot access '" + a + "': No such file or directory\n"); code = 1; return; }
      var tot = (function rec(label, node, depth) {
        if (node.type === "f") {
          var kb = Math.ceil(fs.fileSize(node) / 4096) * 4;
          if (depth === 0 || (o.a && depth <= maxDepth)) lines.push(fmtK(kb) + "\t" + label);
          return kb;
        }
        var sum = 4;
        Object.keys(node.kids).sort(cmpBytes).forEach(function (k) { sum += rec(label.replace(/\/$/, "") + "/" + k, node.kids[k], depth + 1); });
        if (depth <= maxDepth) lines.push(fmtK(sum) + "\t" + label);
        return sum;
      })(a, n, 0);
      grand += tot;
    });
    if (o.c) lines.push(fmtK(grand) + "\ttotal");
    c.out(fromLines(lines));
    return code;
  });
  def("find", "find [PATH ...] [-name PATTERN] [-type f|d] [-maxdepth N]   search for files", function (c) {
    var paths = [], name = null, type = null, maxd = Infinity, i, a = c.args;
    for (i = 0; i < a.length && a[i].charAt(0) !== "-"; i++) paths.push(a[i]);
    for (; i < a.length; i++) {
      if (a[i] === "-name" || a[i] === "-iname") { name = { re: globRegex(a[++i] || ""), ci: a[i - 1] === "-iname", pat: a[i] }; if (name.ci) name.re = new RegExp(name.re.source, "i"); }
      else if (a[i] === "-type") type = a[++i];
      else if (a[i] === "-maxdepth") maxd = parseInt(a[++i], 10);
      else if (a[i] === "-print") continue;
      else { c.err("find: unknown predicate `" + a[i] + "'\n"); c.note("lab: find supports -name, -iname, -type f|d and -maxdepth.\n"); return 1; }
    }
    if (!paths.length) paths = ["."];
    var out = [], code = 0, fs = c.fs, sh = c.sh;
    paths.forEach(function (p) {
      var abs = sh.resolve(p), n = fs.lookup(abs);
      if (!n) { c.err("find: '" + p + "': No such file or directory\n"); code = 1; return; }
      (function rec(label, node, depth) {
        var okType = !type || (type === "f" && node.type === "f") || (type === "d" && node.type === "d");
        if (okType && (!name || name.re.test(basename(label) || label))) out.push(label);
        if (node.type === "d" && depth < maxd) Object.keys(node.kids).sort(cmpBytes).forEach(function (k) { rec(label.replace(/\/$/, "") + "/" + k, node.kids[k], depth + 1); });
      })(p, n, 0);
    });
    c.out(fromLines(out));
    return code;
  });
  def("tree", "tree [-L LEVEL] [DIR]   show a directory as a tree", function (c) {
    var g = getopt(c.args, "adh", "L", {});
    if (g.error) return usageError(c, g.error);
    var root = g.operands[0] || ".", abs = c.sh.resolve(root), n = c.fs.lookup(abs), fs = c.fs;
    if (!n) { c.err(root + " [error opening dir]\n"); return 2; }
    var maxL = g.opts.L ? parseInt(g.opts.L, 10) : Infinity, nd = 0, nf = 0, out = [ansi("1;34", root, c.isTTY)];
    (function rec(node, prefix, depth) {
      if (node.type !== "d" || depth >= maxL) return;
      var names = Object.keys(node.kids).sort(cmpBytes).filter(function (k) { return g.opts.a || k.charAt(0) !== "."; });
      names.forEach(function (k, i) {
        var last = i === names.length - 1, ch = node.kids[k];
        var label = ch.type === "d" ? ansi("1;34", k, c.isTTY) : ch.exec ? ansi("1;32", k, c.isTTY) : k;
        if (g.opts.h && ch.type === "f") label = "[" + pad(humanSize(fs.fileSize(ch)), 4) + "]  " + label;
        out.push(prefix + (last ? "└── " : "├── ") + label);
        if (ch.type === "d") { nd++; rec(ch, prefix + (last ? "    " : "│   "), depth + 1); } else nf++;
      });
    })(n, "", 0);
    out.push("", plural(nd, "directory", "directories") + ", " + plural(nf, "file"));
    c.out(fromLines(out));
    return 0;
  });
  def("file", "file FILE ...   guess what kind of data a file holds", function (c) {
    if (!c.args.length) { c.err("Usage: file [-bchikLlNnprsSvzZ0] [--apple] [--extension] [--mime-encoding] [--mime-type] file ...\n"); return 1; }
    c.args.forEach(function (f) {
      var n = c.fs.lookup(c.sh.resolve(f)), d;
      if (!n) { c.out(f + ": cannot open `" + f + "' (No such file or directory)\n"); return; }
      if (n.type === "d") { c.out(f + ": directory\n"); return; }
      d = n.data;
      var desc;
      if (isBytes(d) && d[0] === 0x1f && d[1] === 0x8b) desc = "gzip compressed data, original size modulo 2^32 " + (d[d.length - 4] | d[d.length - 3] << 8 | d[d.length - 2] << 16 | d[d.length - 1] << 24 >>> 0);
      else if (isBytes(d) && looksBinary(d)) desc = "data";
      else {
        var t = isBytes(d) ? utf8Decode(d) : d;
        if (!t.length) desc = "empty";
        else if (n.exec && /^#!/.test(t)) desc = "POSIX shell script, ASCII text executable";
        else desc = (/[^\x00-\x7f]/.test(t) ? "Unicode text, UTF-8 text" : "ASCII text") + (toLines(t).some(function (l) { return l.length > 300; }) ? ", with very long lines" : "");
      }
      c.out(f + ": " + desc + "\n");
      if (desc === "data" && /\.bed$/i.test(f)) hintOnce(c, "file-bed", "lab: PLINK .bed files start with the bytes 6c 1b 01; see them with  xxd -l 8 " + f + "\n");
    });
    return 0;
  });

  /* ---------------- Reading files ---------------- */
  def("cat", "cat [-n] [FILE ...]   print files", function (c) {
    var g = getopt(c.args, "nbAesETuv", "", { "--number": "n" });
    if (g.error) return usageError(c, g.error);
    var code = 0, lineNo = 0;
    readInputs(c, g.operands).forEach(function (f) {
      if (f.error === "keyboard") { keyboardNote(c); code = 1; return; }
      if (f.error) { c.err("cat: " + f.name + ": " + f.error + "\n"); code = 1; return; }
      if (f.binary) {
        if (c.isTTY) { binaryNote(c, f.name); return; }
        c.out(f.bytes); return;
      }
      var t = f.text;
      if (g.opts.n || g.opts.b) {
        var lines = t.split("\n"), last = lines.length - 1;
        t = lines.map(function (l, i) {
          if (i === last && l === "") return "";
          if (g.opts.b && l === "") return l;
          return pad(++lineNo, 6) + "\t" + l;
        }).join("\n");
      }
      c.out(t);
    });
    return code;
  });
  function headTailArgs(c) {
    var a = c.args, r = { n: 10, bytes: false, plus: false, minus: false, files: [], quiet: false, verbose: false, follow: false, error: null };
    function val(v, opt) {
      var m = /^([+-]?)(\d+)([kKmM]?)$/.exec(v);
      if (!m) { r.error = "invalid number of " + (r.bytes ? "bytes" : "lines") + ": '" + v + "'"; return; }
      r.n = +m[2] * (m[3] === "k" || m[3] === "K" ? 1024 : m[3] === "m" || m[3] === "M" ? 1048576 : 1);
      r.plus = m[1] === "+"; r.minus = m[1] === "-";
    }
    for (var i = 0; i < a.length && !r.error; i++) {
      var x = a[i], m;
      if (x === "--") { r.files = r.files.concat(a.slice(i + 1)); break; }
      if ((m = /^-(\d+)$/.exec(x))) { r.n = +m[1]; continue; }
      if (x === "-n" || x === "-c" || x === "--lines" || x === "--bytes") {
        r.bytes = x === "-c" || x === "--bytes";
        if (a[i + 1] === undefined) { r.error = "option requires an argument -- '" + x.replace(/^-+/, "").charAt(0) + "'"; break; }
        val(a[++i]); continue;
      }
      if ((m = /^-([nc])(.+)$/.exec(x))) { r.bytes = m[1] === "c"; val(m[2]); continue; }
      if ((m = /^--(lines|bytes)=(.+)$/.exec(x))) { r.bytes = m[1] === "bytes"; val(m[2]); continue; }
      if (x === "-q" || x === "--quiet" || x === "--silent") { r.quiet = true; continue; }
      if (x === "-v" || x === "--verbose") { r.verbose = true; continue; }
      if (x === "-f" || x === "-F" || x === "--follow") { r.follow = true; continue; }
      if (x.length > 1 && x.charAt(0) === "-") { r.error = (x.charAt(1) === "-" ? "unrecognized option '" + x + "'" : "invalid option -- '" + x.charAt(1) + "'"); break; }
      r.files.push(x);
    }
    return r;
  }
  function headTail(c, isHead) {
    var r = headTailArgs(c);
    if (r.error) return usageError(c, r.error);
    if (r.follow) c.note("lab: tail -f follows a file that another program is still writing; lab files do not grow, so it prints the end once.\n");
    var ins = readInputs(c, r.files), code = 0, many = ins.length > 1;
    ins.forEach(function (f, k) {
      if (f.error === "keyboard") { keyboardNote(c); code = 1; return; }
      if (f.error) {
        c.err(c.name + ": cannot open '" + f.name + "' for reading: " + f.error + "\n");
        code = 1; return;
      }
      if ((many && !r.quiet) || r.verbose) c.out((k ? "\n" : "") + "==> " + (f.name === "-" ? "standard input" : f.name) + " <==\n");
      if (r.bytes) {
        var b = f.bytes || utf8Encode(f.text), sl;
        if (isHead) sl = r.minus ? b.subarray(0, Math.max(0, b.length - r.n)) : b.subarray(0, r.n);
        else sl = r.plus ? b.subarray(Math.max(0, r.n - 1)) : b.subarray(Math.max(0, b.length - r.n));
        if (f.binary || f.bytes) { if (c.isTTY && f.binary) binaryNote(c, f.name); else c.out(f.binary ? sl : utf8Decode(sl)); }
        else c.out(utf8Decode(sl));
        return;
      }
      if (f.binary) { if (c.isTTY) { binaryNote(c, f.name); return; } }
      var t = textOf(f), out;
      var parts = t.split("\n"), endsNL = t.slice(-1) === "\n";
      if (endsNL) parts.pop();
      var sel;
      if (isHead) sel = r.minus ? parts.slice(0, Math.max(0, parts.length - r.n)) : parts.slice(0, r.n);
      else sel = r.plus ? parts.slice(Math.max(0, r.n - 1)) : r.n === 0 ? [] : parts.slice(-r.n);
      out = sel.join("\n");
      var lastIncluded = isHead ? (r.minus ? false : sel.length === parts.length) : true;
      if (sel.length && (!lastIncluded || endsNL)) out += "\n";
      if (f.binary) c.out(out); else c.out(out);
    });
    return code;
  }
  def("head", "head [-n N | -N] [FILE ...]   first N lines (default 10; -n -N: all but the last N)", function (c) { return headTail(c, true); });
  def("tail", "tail [-n N | -n +N] [FILE ...]   last N lines (default 10; -n +N: from line N on)", function (c) { return headTail(c, false); });
  def("less more", "less FILE   show a file (the lab has no pager: it prints the file)", function (c) {
    var files = c.args.filter(function (a) { return a.charAt(0) !== "-" || a === "-"; });
    if (!files.length && !c.stdin) { c.err("Missing filename (\"less --help\" for help)\n"); return 1; }
    var code = 0, LIMIT = 500;
    readInputs(c, files).forEach(function (f) {
      if (f.error) { c.err(f.name + ": " + f.error + "\n"); code = 1; return; }
      if (f.binary) { binaryNote(c, f.name); return; }
      var lines = toLines(f.text);
      if (c.isTTY && lines.length > LIMIT) {
        c.out(fromLines(lines.slice(0, LIMIT)));
        c.note("lab: " + c.name + " is a pager that shows a file one screen at a time; the lab printed the first " + LIMIT + " of " + lines.length + " lines. Use head, tail, grep or the file panel for the rest.\n");
      } else c.out(f.text);
    });
    if (c.isTTY) hintOnce(c, "less", "lab: in a real terminal " + c.name + " opens a scrollable view (press q to quit); here it prints the file.\n");
    return code;
  });
  def("wc", "wc [-l] [-w] [-c] [-m] [FILE ...]   count lines, words and bytes", function (c) {
    var g = getopt(c.args, "lwcmL", "", { "--lines": "l", "--words": "w", "--bytes": "c", "--chars": "m" });
    if (g.error) return usageError(c, g.error);
    var o = g.opts, show = [];
    if (o.l) show.push("l");
    if (o.w) show.push("w");
    if (o.m) show.push("m");
    if (o.c) show.push("c");
    if (!show.length) show = ["l", "w", "c"];
    var rows = [], code = 0, anyStdin = false, fileBytes = 0, tot = { l: 0, w: 0, c: 0, m: 0 };
    readInputs(c, g.operands).forEach(function (f) {
      if (f.error === "keyboard") { keyboardNote(c); code = 1; return; }
      if (f.error) { c.err("wc: " + f.name + ": " + f.error + "\n"); code = 1; return; }
      var v = { l: 0, w: 0, c: 0, m: 0 };
      if (f.bytes) {
        var b = f.bytes, inWord = false;
        v.c = b.length;
        for (var i = 0; i < b.length; i++) {
          var x = b[i];
          if (x === 10) v.l++;
          var sp = x === 32 || (x >= 9 && x <= 13);
          if (!sp && !inWord) { v.w++; inWord = true; } else if (sp) inWord = false;
        }
        v.m = f.binary ? b.length : Array.from(utf8Decode(b)).length;
      } else {
        var t = f.text;
        v.l = (t.match(/\n/g) || []).length;
        v.w = (t.match(/[^ \t\n\r\f\v]+/g) || []).length;
        v.c = utf8Length(t);
        v.m = Array.from(t).length;
      }
      if (f.stdin) anyStdin = true; else fileBytes += v.c;
      ["l", "w", "c", "m"].forEach(function (k) { tot[k] += v[k]; });
      rows.push({ v: v, name: f.stdin ? "" : f.name });
    });
    if (rows.length > 1) rows.push({ v: tot, name: "total" });
    var width = show.length === 1 && rows.length === 1 ? 1 : anyStdin ? 7 : Math.max(1, String(fileBytes).length);
    c.out(rows.map(function (r) {
      return show.map(function (k) { return pad(r.v[k], width); }).join(" ") + (r.name ? " " + r.name : "");
    }).join("\n") + (rows.length ? "\n" : ""));
    return code;
  });

  /* ---------------- sort, uniq, cut ---------------- */
  function isBlank(ch) { return ch === " " || ch === "\t"; }
  function fieldBounds(line, sep) {
    var f = [], i, n = line.length;
    if (sep !== null) {
      var s = 0;
      for (i = 0; i <= n; i++) if (i === n || line.charAt(i) === sep) { f.push([s, i]); s = i + 1; }
      return f;
    }
    i = 0;
    while (i < n) {
      var st = i;
      while (i < n && isBlank(line.charAt(i))) i++;
      while (i < n && !isBlank(line.charAt(i))) i++;
      f.push([st, i]);
    }
    return f;
  }
  function parseSortKey(s) {
    var m = /^(\d+)(?:\.(\d+))?([bdfghinMRrV]*)(?:,(\d+)(?:\.(\d+))?([bdfghinMRrV]*))?$/.exec(s);
    if (!m) return { error: "invalid number at field start: invalid count at start of '" + s + "'" };
    if (+m[1] === 0) return { error: "field number is zero: invalid field specification '" + s + "'" };
    var opts = {};
    (m[3] + (m[6] || "")).split("").forEach(function (ch) { opts[ch] = true; });
    return { sf: +m[1], sc: m[2] ? +m[2] : 1, ef: m[4] ? +m[4] : null, ec: m[5] ? +m[5] : 0, opts: opts, bStart: m[3].indexOf("b") >= 0, bEnd: (m[6] || "").indexOf("b") >= 0, hasOpts: !!(m[3] + (m[6] || "")).replace(/b/g, "") || !!(m[3] + (m[6] || "")) };
  }
  function keyText(line, k, sep, gb) {
    var f = fieldBounds(line, sep);
    if (k.sf > f.length) return "";
    var start = f[k.sf - 1][0];
    if (k.bStart || gb) while (start < line.length && isBlank(line.charAt(start))) start++;
    start += k.sc - 1;
    var end;
    if (k.ef == null || k.ef > f.length) end = line.length;
    else if (k.ec === 0) end = f[k.ef - 1][1];
    else {
      var es = f[k.ef - 1][0];
      if (k.bEnd || gb) while (es < line.length && isBlank(line.charAt(es))) es++;
      end = Math.min(es + k.ec, line.length);
    }
    return end <= start ? "" : line.slice(start, end);
  }
  function leadNum(s) {
    var m = /^[ \t]*(-?)(\d*)(?:\.(\d*))?/.exec(s);
    if (!m || (!m[2] && !m[3])) return 0;
    return parseFloat((m[1] || "") + (m[2] || "0") + "." + (m[3] || "0"));
  }
  function genNum(s) {
    var m = /^[ \t]*([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?|[-+]?inf(?:inity)?|[-+]?nan)/i.exec(s);
    if (!m) return { rank: 0, v: 0 };
    var t = m[1].toLowerCase();
    if (/nan/.test(t)) return { rank: 1, v: 0 };
    if (/inf/.test(t)) return t.charAt(0) === "-" ? { rank: 2, v: 0 } : { rank: 4, v: 0 };
    return { rank: 3, v: parseFloat(t) };
  }
  function humanNum(s) {
    var m = /^[ \t]*(-?\d+\.?\d*)([KMGTPE]?)/i.exec(s);
    if (!m) return 0;
    return parseFloat(m[1]) * Math.pow(1024, "KMGTPE".indexOf((m[2] || "").toUpperCase()) + 1);
  }
  function versionCmp(a, b) {
    var re = /(\d+|\D+)/g, x = a.match(re) || [], y = b.match(re) || [];
    for (var i = 0; i < Math.min(x.length, y.length); i++) {
      var p = x[i], q = y[i];
      if (/^\d/.test(p) && /^\d/.test(q)) { var d = parseInt(p, 10) - parseInt(q, 10); if (d) return d < 0 ? -1 : 1; }
      else if (p !== q) return p < q ? -1 : 1;
    }
    return x.length - y.length;
  }
  def("sort", "sort [-n] [-g] [-h] [-V] [-r] [-u] [-f] [-b] [-s] [-t SEP] [-k F1[,F2][OPTS]] [-o FILE] [FILE ...]   sort lines", function (c) {
    var a = c.args, glob = {}, keys = [], sep = null, outFile = null, files = [], i, j, err = null;
    var LONG = { "--numeric-sort": "n", "--general-numeric-sort": "g", "--reverse": "r", "--unique": "u", "--ignore-case": "f", "--stable": "s", "--human-numeric-sort": "h", "--version-sort": "V", "--ignore-leading-blanks": "b", "--dictionary-order": "d" };
    for (i = 0; i < a.length && !err; i++) {
      var x = a[i];
      if (x === "--") { files = files.concat(a.slice(i + 1)); break; }
      if (x.length > 1 && x.charAt(0) === "-") {
        if (x.charAt(1) === "-") {
          var m = /^(--[a-z-]+)(?:=(.*))?$/.exec(x);
          if (m && LONG[m[1]]) { glob[LONG[m[1]]] = true; continue; }
          if (m && (m[1] === "--key" || m[1] === "--field-separator" || m[1] === "--output")) {
            var vv = m[2] != null ? m[2] : a[++i];
            if (vv === undefined) { err = "option '" + m[1] + "' requires an argument"; break; }
            if (m[1] === "--key") { var kk = parseSortKey(vv); if (kk.error) err = kk.error; else keys.push(kk); }
            else if (m[1] === "--field-separator") sep = vv; else outFile = vv;
            continue;
          }
          err = "unrecognized option '" + x + "'"; break;
        }
        for (j = 1; j < x.length; j++) {
          var ch = x.charAt(j);
          if ("ngrufbshVdcm".indexOf(ch) >= 0) { glob[ch] = true; continue; }
          if (ch === "k" || ch === "t" || ch === "o" || ch === "T" || ch === "S") {
            var v = x.slice(j + 1);
            if (!v) { v = a[++i]; if (v === undefined) { err = "option requires an argument -- '" + ch + "'"; break; } }
            if (ch === "k") { var key = parseSortKey(v); if (key.error) err = key.error; else keys.push(key); }
            else if (ch === "t") sep = v;
            else if (ch === "o") outFile = v;
            break;
          }
          err = "invalid option -- '" + ch + "'"; break;
        }
        continue;
      }
      files.push(x);
    }
    if (err) return usageError(c, err, 2);
    if (sep !== null && sep.length !== 1) {
      c.err("sort: multi-character tab '" + sep + "'\n");
      if (sep === "\\t") c.note("lab: for a tab, write -t $'\\t' (bash turns $'\\t' into a tab character).\n");
      return 2;
    }
    var lines = [], code = 0;
    readInputs(c, files).forEach(function (f) {
      if (f.error === "keyboard") { keyboardNote(c); code = 2; return; }
      if (f.error) { c.err("sort: cannot read: " + f.name + ": " + f.error + "\n"); code = 2; return; }
      Array.prototype.push.apply(lines, toLines(textOf(f)));
    });
    if (code) return code;
    var ks = keys.length ? keys : [{ whole: true, opts: {} }];
    var eff = ks.map(function (k) {
      var own = Object.keys(k.opts).some(function (o) { return o !== "b"; });
      var e = {};
      var src = own ? k.opts : glob;
      for (var o in src) e[o] = src[o];
      if (k.opts.b) e.b = true;
      return e;
    });
    var items = lines.map(function (l, idx) {
      return { l: l, idx: idx, k: ks.map(function (k, n) {
        var t = k.whole ? l : keyText(l, k, sep, eff[n].b);
        var e = eff[n];
        if (e.n) return leadNum(t);
        if (e.g) return genNum(t);
        if (e.h) return humanNum(t);
        if (e.b) t = t.replace(/^[ \t]+/, "");
        if (e.d) t = t.replace(/[^ \tA-Za-z0-9]/g, "");
        if (e.f) t = t.toUpperCase();
        return t;
      }) };
    });
    function cmp(x, y) {
      for (var n = 0; n < ks.length; n++) {
        var e = eff[n], p = x.k[n], q = y.k[n], r;
        if (e.g) r = p.rank !== q.rank ? p.rank - q.rank : p.v < q.v ? -1 : p.v > q.v ? 1 : 0;
        else if (e.n || e.h) r = p < q ? -1 : p > q ? 1 : 0;
        else if (e.V) r = versionCmp(p, q);
        else r = cmpBytes(p, q);
        if (r) return e.r ? -r : r;
      }
      if (glob.s || glob.u) return 0;
      var r2 = cmpBytes(x.l, y.l);
      return glob.r ? -r2 : r2;
    }
    items.sort(function (x, y) { return cmp(x, y) || x.idx - y.idx; });
    if (glob.u) items = items.filter(function (it, n) { return n === 0 || cmp(items[n - 1], it) !== 0; });
    var text = fromLines(items.map(function (it) { return it.l; }));
    if (outFile) {
      try { c.fs.write(c.sh.resolve(outFile), text); } catch (e) { c.err("sort: open failed: " + outFile + ": " + e.fsMessage + "\n"); return 2; }
    } else c.out(text);
    return 0;
  });
  def("uniq", "uniq [-c] [-d] [-u] [-i] [INPUT [OUTPUT]]   collapse repeated adjacent lines (-c: count them)", function (c) {
    var g = getopt(c.args, "cdui", "fs", { "--count": "c", "--repeated": "d", "--unique": "u", "--ignore-case": "i" });
    if (g.error) return usageError(c, g.error);
    var o = g.opts, ins = readInputs(c, g.operands.slice(0, 1)), f = ins[0];
    if (f.error === "keyboard") { keyboardNote(c); return 1; }
    if (f.error) { c.err("uniq: " + f.name + ": " + f.error + "\n"); return 1; }
    var skipF = o.f ? parseInt(o.f, 10) : 0, skipC = o.s ? parseInt(o.s, 10) : 0;
    function keyOf(l) {
      var k = l;
      if (skipF) { var fb = fieldBounds(l, null); k = skipF >= fb.length ? "" : l.slice(fb[skipF][0]); }
      if (skipC) k = k.slice(skipC);
      return o.i ? k.toLowerCase() : k;
    }
    var lines = toLines(textOf(f)), out = [], k = 0;
    while (k < lines.length) {
      var j = k + 1, key = keyOf(lines[k]);
      while (j < lines.length && keyOf(lines[j]) === key) j++;
      var cnt = j - k;
      if (!(o.d && cnt < 2) && !(o.u && cnt > 1)) out.push((o.c ? pad(cnt, 7) + " " : "") + lines[k]);
      k = j;
    }
    var text = fromLines(out);
    if (g.operands[1]) {
      try { c.fs.write(c.sh.resolve(g.operands[1]), text); } catch (e) { c.err("uniq: " + g.operands[1] + ": " + e.fsMessage + "\n"); return 1; }
    } else c.out(text);
    return 0;
  });
  function parseList(s) {
    var ranges = [];
    var parts = String(s).split(",");
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], m;
      if ((m = /^(\d+)$/.exec(p))) ranges.push([+m[1], +m[1]]);
      else if ((m = /^(\d*)-(\d*)$/.exec(p)) && (m[1] || m[2])) ranges.push([m[1] ? +m[1] : 1, m[2] ? +m[2] : Infinity]);
      else return { error: "invalid field value '" + p + "'" };
      var last = ranges[ranges.length - 1];
      if (last[0] === 0 || last[1] === 0) return { error: "fields and positions are numbered from 1" };
      if (last[1] < last[0]) return { error: "invalid decreasing range" };
    }
    return { ranges: ranges };
  }
  function inRanges(n, ranges) { for (var i = 0; i < ranges.length; i++) if (n >= ranges[i][0] && n <= ranges[i][1]) return true; return false; }
  def("cut", "cut -f LIST [-d DELIM] [-s] | -c LIST [FILE ...]   take columns (fields are tab-separated unless -d)", function (c) {
    var g = getopt(c.args, "sn", "fdcb", { "--fields": "f=", "--delimiter": "d=", "--characters": "c=", "--bytes": "b=", "--only-delimited": "s", "--output-delimiter": "o=", "--complement": "C" });
    if (g.error) return usageError(c, g.error);
    var o = g.opts;
    if (o.f == null && o.c == null && o.b == null) return usageError(c, "you must specify a list of bytes, characters, or fields");
    var delim = o.d != null ? o.d : "\t";
    if (delim.length !== 1) {
      c.err("cut: the delimiter must be a single character\nTry 'cut --help' for more information.\n");
      if (delim === "\\t") c.note("lab: a tab is cut's default delimiter, so leave out -d; or write -d $'\\t'.\n");
      return 1;
    }
    var L = parseList(o.f != null ? o.f : o.c != null ? o.c : o.b);
    if (L.error) return usageError(c, L.error);
    var outDelim = o.o != null ? o.o : (o.f != null ? delim : ""), code = 0, sawDelim = false, sawSpaces = false, out = [];
    readInputs(c, g.operands).forEach(function (f) {
      if (f.error === "keyboard") { keyboardNote(c); code = 1; return; }
      if (f.error) { c.err("cut: " + f.name + ": " + f.error + "\n"); code = 1; return; }
      toLines(textOf(f)).forEach(function (line) {
        if (o.f != null) {
          if (line.indexOf(delim) < 0) { if (/ {2,}|^ +\S/.test(line)) sawSpaces = true; if (!o.s) out.push(line); return; }
          sawDelim = true;
          var fields = line.split(delim);
          out.push(fields.filter(function (x, i) { return inRanges(i + 1, L.ranges) !== !!o.C; }).join(outDelim));
        } else {
          var chars = Array.from(line);
          out.push(chars.filter(function (x, i) { return inRanges(i + 1, L.ranges) !== !!o.C; }).join(outDelim));
        }
      });
    });
    c.out(fromLines(out));
    if (o.f != null && o.d == null && !sawDelim && sawSpaces) hintOnce(c, "cut-spaces", "lab: these lines contain no tab, so cut printed them whole. PLINK lines up its columns with spaces: take a column with awk '{print $2}', or squeeze the spaces first with tr -s ' '.\n");
    return code;
  });

  /* ---------------- grep ---------------- */
  /* POSIX basic (BRE) or extended (ERE) regular expression → JavaScript RegExp source. */
  function posixRegex(re, extended) {
    var out = "", i = 0, n = re.length, atStart = true;
    while (i < n) {
      var ch = re.charAt(i);
      if (ch === "\\" && i + 1 < n) {
        var d = re.charAt(i + 1);
        if (!extended && "(){}|+?".indexOf(d) >= 0) { out += d; atStart = d === "(" || d === "|"; i += 2; continue; }
        if (d === "<" || d === ">") { out += "\\b"; i += 2; continue; }
        if ("wWsSbB".indexOf(d) >= 0 || /[1-9]/.test(d)) { out += "\\" + d; i += 2; atStart = false; continue; }
        if (d === "t") { out += "t"; i += 2; atStart = false; continue; }
        out += reEscape(d); i += 2; atStart = false; continue;
      }
      if (ch === "[") {
        var j = i + 1, body = "";
        if (re.charAt(j) === "^") { body += "^"; j++; }
        if (re.charAt(j) === "]") { body += "\\]"; j++; }
        while (j < n && re.charAt(j) !== "]") {
          if (re.charAt(j) === "[" && re.charAt(j + 1) === ":") {
            var e = re.indexOf(":]", j + 2);
            if (e > 0) { var cls = re.slice(j + 2, e); body += POSIX_CLASSES[cls] || ""; j = e + 2; continue; }
          }
          var cc = re.charAt(j);
          body += cc === "\\" || cc === "[" ? "\\" + cc : cc;
          j++;
        }
        if (j >= n) { out += "\\["; i++; atStart = false; continue; }
        out += "[" + body + "]";
        i = j + 1; atStart = false; continue;
      }
      if (!extended && "(){}|+?".indexOf(ch) >= 0) { out += "\\" + ch; i++; atStart = false; continue; }
      if (ch === "*" && atStart) { out += "\\*"; i++; atStart = false; continue; }
      if (extended && (ch === "(" || ch === "|")) { out += ch; i++; atStart = true; continue; }
      if (ch === "^") { out += ch; i++; continue; }
      if (ch === "/") { out += "\\/"; i++; atStart = false; continue; }
      out += ch; i++; atStart = false;
    }
    return out;
  }
  def("grep", "grep [-v] [-c] [-i] [-w] [-x] [-n] [-o] [-l] [-h] [-H] [-q] [-E] [-F] [-e PATTERN] [-m N] PATTERN [FILE ...]   lines that match", function (c) {
    var a = c.args, o = {}, pats = [], files = [], i, j, err = null, max = Infinity;
    for (i = 0; i < a.length && !err; i++) {
      var x = a[i];
      if (x === "--") { files = files.concat(a.slice(i + 1)); break; }
      if (x.length > 1 && x.charAt(0) === "-") {
        if (x.charAt(1) === "-") {
          var LONG = { "--invert-match": "v", "--count": "c", "--ignore-case": "i", "--word-regexp": "w", "--line-regexp": "x", "--line-number": "n", "--only-matching": "o", "--files-with-matches": "l", "--no-filename": "h", "--with-filename": "H", "--quiet": "q", "--silent": "q", "--extended-regexp": "E", "--fixed-strings": "F", "--basic-regexp": "G" };
          var mm = /^(--[a-z-]+)(?:=(.*))?$/.exec(x);
          if (mm && LONG[mm[1]]) { o[LONG[mm[1]]] = true; continue; }
          if (mm && (mm[1] === "--color" || mm[1] === "--colour")) continue;
          if (mm && mm[1] === "--regexp") { pats.push(mm[2] != null ? mm[2] : a[++i]); continue; }
          err = "unrecognized option '" + x + "'"; break;
        }
        for (j = 1; j < x.length; j++) {
          var ch = x.charAt(j);
          if ("vciwxnolhHqEFGsr".indexOf(ch) >= 0) { o[ch] = true; continue; }
          if (ch === "e" || ch === "m" || ch === "A" || ch === "B" || ch === "C") {
            var v = x.slice(j + 1);
            if (!v) { v = a[++i]; if (v === undefined) { err = "option requires an argument -- '" + ch + "'"; break; } }
            if (ch === "e") pats.push(v);
            else if (ch === "m") max = parseInt(v, 10);
            else { c.note("lab: grep's context options (-A, -B, -C) are not available in the lab.\n"); }
            break;
          }
          err = "invalid option -- '" + ch + "'"; break;
        }
        continue;
      }
      files.push(x);
    }
    if (err) { c.err("grep: " + err + "\nUsage: grep [OPTION]... PATTERNS [FILE]...\nTry 'grep --help' for more information.\n"); return 2; }
    if (!pats.length) {
      if (!files.length) { c.err("Usage: grep [OPTION]... PATTERNS [FILE]...\nTry 'grep --help' for more information.\n"); return 2; }
      pats.push(files.shift());
    }
    if (o.r) { c.note("lab: grep -r (search folders) is not available; list the files instead, for example grep PATTERN analysis/*.log\n"); }
    var srcs = [];
    pats.forEach(function (p) { p.split("\n").forEach(function (q) { srcs.push(o.F ? reEscape(q) : posixRegex(q, !!o.E)); }); });
    var body = srcs.length === 1 ? srcs[0] : srcs.map(function (s) { return "(?:" + s + ")"; }).join("|");
    if (o.w) body = "(?<![A-Za-z0-9_])(?:" + body + ")(?![A-Za-z0-9_])";
    if (o.x) body = "^(?:" + body + ")$";
    var re, reG;
    try { re = new RegExp(body, o.i ? "i" : ""); reG = new RegExp(body, o.i ? "gi" : "g"); }
    catch (e) { c.err("grep: invalid regular expression: " + pats[0] + "\n"); return 2; }
    var ins = readInputs(c, files), many = ins.length > 1, anySel = false, code = 0, color = c.isTTY;
    var showName = (many && !o.h) || o.H;
    for (var k = 0; k < ins.length; k++) {
      var f = ins[k];
      if (f.error === "keyboard") { keyboardNote(c); code = 2; continue; }
      if (f.error) { if (!o.s) c.err("grep: " + f.name + ": " + f.error + "\n"); code = 2; continue; }
      var label = f.name === "-" ? "(standard input)" : f.name;
      var lines = toLines(textOf(f)), count = 0, out = [];
      for (var li = 0; li < lines.length && count < max; li++) {
        var line = lines[li], hit = re.test(line);
        if (hit === !!o.v) continue;
        count++;
        if (o.q || o.l || o.c) continue;
        if (f.binary) continue;
        var prefix = (showName ? ansi("35", label, color) + ansi("36", ":", color) : "") + (o.n ? ansi("32", String(li + 1), color) + ansi("36", ":", color) : "");
        if (o.o && !o.v) {
          reG.lastIndex = 0;
          var mt;
          while ((mt = reG.exec(line))) { if (mt[0] === "") { reG.lastIndex++; continue; } out.push(prefix + ansi("1;31", mt[0], color)); }
        } else out.push(prefix + (color && !o.v ? line.replace(reG, function (s) { return s ? ansi("1;31", s, true) : s; }) : line));
      }
      if (count) anySel = true;
      if (o.q) { if (anySel) return 0; continue; }
      if (o.l) { if (count) c.out(ansi("35", label, color) + "\n"); continue; }
      if (o.c) { c.out((showName ? label + ":" : "") + count + "\n"); continue; }
      if (f.binary && count) { c.out("grep: " + label + ": binary file matches\n"); continue; }
      c.out(fromLines(out));
    }
    if (code === 2 && !anySel) return 2;
    return anySel ? 0 : 1;
  });

  /* ---------------- tr, tee ---------------- */
  function trSet(s) {
    var chars = [], i = 0, m;
    var esc = { n: "\n", t: "\t", r: "\r", "\\": "\\", a: "\x07", b: "\b", f: "\f", v: "\v" };
    function one() {
      var ch = s.charAt(i);
      if (ch === "\\" && i + 1 < s.length) {
        var d = s.charAt(i + 1);
        if (esc[d] != null) { i += 2; return esc[d]; }
        if ((m = /^[0-7]{1,3}/.exec(s.slice(i + 1)))) { i += 1 + m[0].length; return String.fromCharCode(parseInt(m[0], 8)); }
        i += 2; return d;
      }
      i++; return ch;
    }
    while (i < s.length) {
      if (s.charAt(i) === "[" && s.charAt(i + 1) === ":" && (m = /^\[:(\w+):\]/.exec(s.slice(i)))) {
        var src = POSIX_CLASSES[m[1]];
        if (src) {
          var re = new RegExp("[" + src + "]");
          for (var code = 0; code < 128; code++) { var cch = String.fromCharCode(code); if (re.test(cch)) chars.push(cch); }
        }
        i += m[0].length; continue;
      }
      var a = one();
      if (s.charAt(i) === "-" && i + 1 < s.length) {
        i++;
        var b = one();
        for (var x = a.charCodeAt(0); x <= b.charCodeAt(0); x++) chars.push(String.fromCharCode(x));
      } else chars.push(a);
    }
    return chars;
  }
  def("tr", "tr [-d] [-s] [-c] SET1 [SET2]   translate, squeeze (-s) or delete (-d) characters", function (c) {
    var g = getopt(c.args, "dscC", "", { "--delete": "d", "--squeeze-repeats": "s", "--complement": "c" });
    if (g.error) return usageError(c, g.error);
    var o = g.opts, ops = g.operands;
    if (!ops.length) return usageError(c, "missing operand");
    if (!o.d && !o.s && ops.length < 2) return usageError(c, "missing operand after '" + ops[0] + "'\nTwo strings must be given when translating.");
    if (!c.stdin) { keyboardNote(c); return 1; }
    var text = readStdin(c), s1 = trSet(ops[0]), s2 = ops[1] != null ? trSet(ops[1]) : null;
    var in1 = Object.create(null);
    s1.forEach(function (ch) { in1[ch] = true; });
    function inSet1(ch) { return (o.c || o.C) ? !in1[ch] : !!in1[ch]; }
    var out = "", prev = null, squeezeSet = null;
    if (o.s) { squeezeSet = Object.create(null); ((o.d || !s2) ? s1 : s2).forEach(function (ch) { squeezeSet[ch] = true; }); }
    var map = null;
    if (s2 && !o.d) { map = Object.create(null); s1.forEach(function (ch, k) { map[ch] = s2[Math.min(k, s2.length - 1)]; }); }
    for (var k = 0; k < text.length; k++) {
      var ch = text.charAt(k);
      if (o.d && inSet1(ch)) continue;
      if (map) {
        if (o.c || o.C) { if (!in1[ch]) ch = s2[s2.length - 1]; }
        else if (map[ch] != null) ch = map[ch];
      }
      if (squeezeSet && ((o.c || o.C) && !o.d && !s2 ? !in1[ch] : squeezeSet[ch]) && ch === prev) continue;
      out += ch;
      prev = ch;
    }
    c.out(out);
    return 0;
  });
  def("tee", "tee [-a] FILE ...   copy standard input to files and to the screen", function (c) {
    var g = getopt(c.args, "ai", "", { "--append": "a" });
    if (g.error) return usageError(c, g.error);
    if (!c.stdin) { keyboardNote(c); return 1; }
    var text = readStdin(c), code = 0;
    g.operands.forEach(function (f) {
      try { c.fs.write(c.sh.resolve(f), text, { append: !!g.opts.a }); }
      catch (e) { c.err("tee: " + f + ": " + e.fsMessage + "\n"); code = 1; }
    });
    c.out(text);
    return code;
  });

  /* ---------------- Bytes: xxd, hexdump, gzip ---------------- */
  def("xxd", "xxd [-l LEN] [-s OFFSET] [-c COLS] [-g N] [-b] [-p] FILE   hex (or -b binary) dump of a file's bytes", function (c) {
    var g = getopt(c.args, "bpu", "lscg", {});
    if (g.error) return usageError(c, g.error);
    var o = g.opts, f = readInputs(c, g.operands.slice(0, 1))[0];
    if (f.error === "keyboard") { keyboardNote(c); return 1; }
    if (f.error) { c.err("xxd: " + f.name + ": " + f.error + "\n"); return 2; }
    var bytes = f.bytes || utf8Encode(f.text);
    var seek = o.s ? parseInt(o.s, 0) || 0 : 0, len = o.l != null ? parseInt(o.l, 0) : bytes.length;
    var data = bytes.subarray(Math.max(0, seek), Math.max(0, seek) + Math.max(0, len));
    var out = [];
    if (o.p) {
      var hx = "";
      for (var q = 0; q < data.length; q++) { hx += hex2(data[q]); if (hx.length === 60) { out.push(hx); hx = ""; } }
      if (hx) out.push(hx);
      c.out(fromLines(out));
      return 0;
    }
    var cols = o.c ? parseInt(o.c, 0) : (o.b ? 6 : 16), grp = o.g != null ? parseInt(o.g, 0) : (o.b ? 1 : 2);
    if (!grp || grp < 1) grp = cols;
    var cellW = o.b ? 8 : 2;
    var hexWidth = cols * cellW + Math.ceil(cols / grp) - 1;
    for (var off = 0; off < data.length; off += cols) {
      var row = data.subarray(off, off + cols), h = "", asc = "";
      for (var k = 0; k < row.length; k++) {
        if (k && k % grp === 0) h += " ";
        var v = row[k];
        h += o.b ? ("0000000" + v.toString(2)).slice(-8) : hex2(v);
        asc += v >= 32 && v < 127 ? String.fromCharCode(v) : ".";
      }
      out.push(("0000000" + (off + seek).toString(16)).slice(-8) + ": " + pad(h, hexWidth, true) + "  " + asc);
    }
    c.out(fromLines(out));
    if (/\.bed$/i.test(f.name || "") && c.isTTY) hintOnce(c, "xxd-bed", "lab: the first three bytes of a .bed file are 6c 1b 01 (PLINK's magic number, then 01 = SNP-major). Each following byte holds 4 genotypes, 2 bits each, read from the lowest bits: 00 = homozygous A1, 01 = missing, 10 = heterozygous, 11 = homozygous A2. Try xxd -b -l 8 on it.\n");
    return 0;
  });
  def("hexdump hd", "hexdump -C [-n LEN] FILE   canonical hex + ASCII dump", function (c) {
    var g = getopt(c.args, "Cvbcdox", "ns", {});
    if (g.error) return usageError(c, g.error);
    var f = readInputs(c, g.operands.slice(0, 1))[0];
    if (f.error === "keyboard") { keyboardNote(c); return 1; }
    if (f.error) { c.err("hexdump: " + f.name + ": " + f.error + "\n"); return 1; }
    var bytes = f.bytes || utf8Encode(f.text), skip = g.opts.s ? parseInt(g.opts.s, 0) : 0;
    var data = bytes.subarray(skip, g.opts.n != null ? skip + parseInt(g.opts.n, 0) : bytes.length), out = [], off;
    var canon = g.opts.C || c.name === "hd";
    for (off = 0; off < data.length; off += 16) {
      var row = data.subarray(off, off + 16);
      if (canon) {
        var h = "", asc = "";
        for (var k = 0; k < 16; k++) {
          h += k < row.length ? hex2(row[k]) + " " : "   ";
          if (k === 7) h += " ";
          if (k < row.length) asc += row[k] >= 32 && row[k] < 127 ? String.fromCharCode(row[k]) : ".";
        }
        out.push(("0000000" + (off + skip).toString(16)).slice(-8) + "  " + h + " |" + asc + "|");
      } else {
        var words = [];
        for (var w = 0; w < row.length; w += 2) words.push(("000" + ((row[w + 1] || 0) << 8 | row[w]).toString(16)).slice(-4));
        out.push(("000000" + (off + skip).toString(16)).slice(-7) + " " + words.join(" "));
      }
    }
    out.push(canon ? ("0000000" + (data.length + skip).toString(16)).slice(-8) : ("000000" + (data.length + skip).toString(16)).slice(-7));
    c.out(fromLines(out));
    return 0;
  });
  function gunzipFile(c, f, opts) {
    var abs = c.sh.resolve(f), node = c.fs.lookup(abs);
    if (!node) { c.err("gzip: " + f + ": No such file or directory\n"); return 1; }
    if (node.type === "d") { c.err("gzip: " + f + " is a directory -- ignored\n"); return 2; }
    if (!/\.gz$|\.tgz$|\.z$/i.test(f) && !opts.c) { c.err("gzip: " + f + ": unknown suffix -- ignored\n"); return 2; }
    var res = gunzipStored(c.fs.readBytes(abs));
    if (res === null) { c.err("gzip: " + f + ": not in gzip format\n"); return 1; }
    if (res === "unsupported") {
      var z = null;
      try { if (typeof require === "function") z = require("zlib"); } catch (e) { z = null; }
      if (!z) { c.err("gzip: " + f + ": compressed with a method the lab cannot decompress\n"); return 1; }
      res = new Uint8Array(z.gunzipSync(c.fs.readBytes(abs)));
    }
    var data = looksBinary(res) ? res : utf8Decode(res);
    if (opts.c) { c.out(data); return 0; }
    var outAbs = abs.replace(/\.tgz$/i, ".tar").replace(/\.(gz|z)$/i, "");
    if (c.fs.exists(outAbs) && !opts.f) { c.err("gzip: " + outAbs.slice(abs.length - f.length) + " already exists; not overwritten\n"); return 2; }
    c.fs.write(outAbs, data);
    if (!opts.k) c.fs.remove(abs, false);
    if (opts.v) c.info(f + ":\t" + (100 - Math.round(100 * c.fs.fileSize(node) / Math.max(1, res.length))) + "% -- replaced with " + basename(outAbs) + "\n");
    return 0;
  }
  def("gunzip", "gunzip [-c] [-k] [-f] FILE.gz ...   decompress gzip files", function (c) {
    var g = getopt(c.args, "ckfvqdtn", "", { "--stdout": "c", "--keep": "k", "--force": "f", "--verbose": "v" });
    if (g.error) return usageError(c, g.error);
    if (!g.operands.length) { c.note("lab: give gunzip a file name, for example gunzip FILE.gz\n"); return 1; }
    var code = 0;
    g.operands.forEach(function (f) { code = Math.max(code, gunzipFile(c, f, g.opts)); });
    return code;
  });
  def("zcat", "zcat FILE.gz ...   print a gzip file decompressed", function (c) {
    var code = 0;
    c.args.filter(function (a) { return a.charAt(0) !== "-"; }).forEach(function (f) { code = Math.max(code, gunzipFile(c, f, { c: true })); });
    return code;
  });
  def("gzip", "gzip [-d] [-c] [-k] FILE ...   compress files (stored blocks in the lab)", function (c) {
    var g = getopt(c.args, "dckfv123456789", "", { "--decompress": "d", "--stdout": "c", "--keep": "k", "--force": "f" });
    if (g.error) return usageError(c, g.error);
    if (g.opts.d) { var cd = 0; g.operands.forEach(function (f) { cd = Math.max(cd, gunzipFile(c, f, g.opts)); }); return cd; }
    if (!g.operands.length) { c.note("lab: give gzip a file name, for example gzip FILE\n"); return 1; }
    var code = 0;
    g.operands.forEach(function (f) {
      var abs = c.sh.resolve(f), node = c.fs.lookup(abs);
      if (!node) { c.err("gzip: " + f + ": No such file or directory\n"); code = 1; return; }
      if (node.type === "d") { c.err("gzip: " + f + " is a directory -- ignored\n"); code = 2; return; }
      if (/\.gz$/i.test(f)) { c.err("gzip: " + f + " already has .gz suffix -- unchanged\n"); code = 2; return; }
      var gz = gzipStore(node.data, basename(abs));
      if (g.opts.c) { c.out(gz); return; }
      if (c.fs.exists(abs + ".gz") && !g.opts.f) { c.err("gzip: " + f + ".gz already exists; not overwritten\n"); code = 2; return; }
      c.fs.write(abs + ".gz", gz);
      if (!g.opts.k) c.fs.remove(abs, false);
    });
    return code;
  });

  /* ---------------- git clone (stubs of the two repositories the practical uses) ---------------- */
  var PANEL_KEY = "_panel/integrated_call_samples_v3.20130502.ALL.panel";
  function stubFiles(files, prefix) {
    return Object.keys(files || {}).filter(function (k) { return k.indexOf(prefix) === 0; });
  }
  function cloneAkt(c, dest) {
    var fs = c.fs, files = c.sh.files || {};
    fs.mkdir(dest + "/data", true);
    var key = files[PANEL_KEY] ? PANEL_KEY : Object.keys(files).filter(function (k) { return /integrated_call_samples.*\.panel$/.test(k); })[0];
    var panel = key ? fileData(files[key]) : "sample\tpop\tsuper_pop\tgender\n";
    if (!key) c.note("lab: the toy reference labels were not found (toy-data.js did not provide " + PANEL_KEY + "), so the panel file has only its header.\n");
    fs.write(dest + "/data/integrated_call_samples_v3.20130502.ALL.panel", panel);
    fs.write(dest + "/README.md", "# akt (lab stub)\n\nThe real repository, https://github.com/Illumina/akt, holds the source code of akt, the\nAncestry and Kinship Toolkit. The practical uses one file from it:\ndata/integrated_call_samples_v3.20130502.ALL.panel, the 1000 Genomes sample list with population\n(pop) and superpopulation (super_pop) labels. In the lab that file lists the people of the toy\nreference panel (toy_1kg) with the same four columns: sample pop super_pop gender.\n");
    stubFiles(files, "_akt/").forEach(function (k) { fs.write(dest + "/" + k.slice(5), fileData(files[k]), { parents: true }); });
  }
  var ANC_STUB = "# Lab stub of GrafAnc's AncSnpPopAFs.txt.\n# The real file lists GrafAnc's 282,424 ancestry SNPs with their allele frequencies in GrafAnc's\n# reference populations. The lab's GrafAnc emulator (grafanc-core.js) keeps its own small reference\n# for the toy SNPs, so this file only marks the step where you decompress the reference data.\n";
  function cloneGrafanc(c, dest) {
    var fs = c.fs, files = c.sh.files || {};
    fs.mkdir(dest + "/bin", true);
    fs.mkdir(dest + "/cpp/data", true);
    fs.write(dest + "/bin/grafanc", "#!/bin/sh\n# Lab stub of the GrafAnc program. The real file is a compiled Linux binary.\n# In the lab, running this path runs the GrafAnc emulator in grafanc-core.js.\n", { prog: "grafanc" });
    var ak = Object.keys(files).filter(function (k) { return /^_grafanc\/.*AncSnpPopAFs\.txt$/.test(k); })[0];
    var anc = ak ? fileData(files[ak]) : ANC_STUB;
    fs.write(dest + "/cpp/data/AncSnpPopAFs.txt.gz", gzipStore(anc, "AncSnpPopAFs.txt"));
    fs.write(dest + "/README.md", "# GrafAnc (lab stub)\n\nThe real repository, https://github.com/jimmy-penn/grafanc, holds GrafAnc's program (bin/grafanc),\nits source code (cpp/) and its reference data (cpp/data/AncSnpPopAFs.txt.gz), with the manual in\nGrafAncDocumentation.md. The program needs the environment variable GRAFPATH to point to the cpp\nfolder, so it can find the reference data. This stub has the same layout with only those files.\n");
    stubFiles(files, "_grafanc/").forEach(function (k) {
      if (k === ak) return;
      fs.write(dest + "/" + k.slice(9), fileData(files[k]), { parents: true });
    });
  }
  def("git", "git clone URL [DIR]   only the two repositories of the practical (akt, grafanc), as stubs", function (c) {
    var sub = c.args[0];
    if (!sub) { c.out("usage: git [--version] [--help] <command> [<args>]\n"); return 1; }
    if (sub === "--version" || sub === "version") { c.out("git version 2.43.0\n"); return 0; }
    if (sub !== "clone") {
      c.err("git: '" + sub + "' is not available in the lab.\n");
      c.note("lab: only git clone works here, for the akt and grafanc repositories the practical uses.\n");
      return 1;
    }
    var rest = c.args.slice(1).filter(function (x, i, arr) { return x.charAt(0) !== "-" && !(i > 0 && /^--?(depth|branch|b)$/.test(arr[i - 1])); });
    var url = rest[0];
    if (!url) { c.err("fatal: You must specify a repository to clone.\n"); return 128; }
    var m = /github\.com[\/:]([^\/]+)\/([^\/]+?)(?:\.git)?\/?$/i.exec(url);
    var key = m ? (m[1] + "/" + m[2]).toLowerCase() : "";
    var dirName = rest[1] || (m ? m[2] : basename(url).replace(/\.git$/, ""));
    var known = { "illumina/akt": cloneAkt, "jimmy-penn/grafanc": cloneGrafanc };
    if (!known[key]) {
      var host = (/^[a-z]+:\/\/([^\/]+)/i.exec(url) || [0, url])[1];
      c.info("Cloning into '" + dirName + "'...\n");
      c.err("fatal: unable to access '" + url + "': Could not resolve host: " + host + "\n");
      c.note("lab: the lab has no network. It can clone only the two repositories the practical uses: https://github.com/Illumina/akt.git and https://github.com/jimmy-penn/grafanc.git\n");
      return 128;
    }
    var dest = c.sh.resolve(dirName), node = c.fs.lookup(dest);
    if (node && (node.type !== "d" || Object.keys(node.kids).length)) { c.err("fatal: destination path '" + dirName + "' already exists and is not an empty directory.\n"); return 128; }
    var pn = c.fs.lookup(dirname(dest));
    if (!pn || pn.type !== "d") { c.err("fatal: could not create leading directories of '" + dirName + "'\n"); return 128; }
    c.info("Cloning into '" + dirName + "'...\n");
    known[key](c, dest);
    var nFiles = c.fs.walk(dest, false).length;
    c.info("remote: Enumerating objects: " + nFiles + ", done.\nReceiving objects: 100% (" + nFiles + "/" + nFiles + "), done.\n");
    c.note("lab: this is a stub of the repository with only the files the practical uses (see " + dirName + "/README.md).\n");
    return 0;
  });

  /* ---------------- Shell builtins and environment ---------------- */
  def("env", "env [NAME=VALUE ...] [COMMAND ...]   print the environment, or run a command with changes", function (c) {
    var args = c.args.slice(), extra = [];
    while (args.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(args[0])) { var x = args.shift(), k = x.indexOf("="); extra.push([x.slice(0, k), x.slice(k + 1)]); }
    if (args.length) {
      var ctx = { out: c.out, err: c.err, note: c.note, info: c.info, stdin: c.stdin, isTTY: c.isTTY, io: c.io };
      return c.sh.invoke(args, ctx, extra);
    }
    var e = c.env;
    extra.forEach(function (kv) { e[kv[0]] = kv[1]; });
    c.out(Object.keys(e).map(function (k) { return k + "=" + e[k]; }).join("\n") + "\n");
    return 0;
  });
  def("printenv", "printenv [NAME ...]   print environment variables", function (c) {
    var e = c.env;
    if (!c.args.length) { c.out(Object.keys(e).map(function (k) { return k + "=" + e[k]; }).join("\n") + "\n"); return 0; }
    var code = 0;
    c.args.forEach(function (n) { if (e[n] !== undefined) c.out(e[n] + "\n"); else code = 1; });
    return code;
  });
  def("export", "export NAME=VALUE ...   set environment variables that programs can read (export alone lists them)", function (c) {
    var sh = c.sh, args = c.args.filter(function (a) { return a !== "-p" && a !== "-n"; });
    if (!args.length) {
      Object.keys(sh.exported).sort(cmpBytes).forEach(function (k) {
        var v = sh.getVar(k);
        c.out("declare -x " + k + (v === undefined ? "" : '="' + v.replace(/(["\\$`])/g, "\\$1") + '"') + "\n");
      });
      return 0;
    }
    var code = 0;
    args.forEach(function (a) {
      var m = /^([A-Za-z_][A-Za-z0-9_]*)(?:=([\s\S]*))?$/.exec(a);
      if (!m) { c.err("bash: export: `" + a + "': not a valid identifier\n"); code = 1; return; }
      if (m[2] !== undefined) sh.setVar(m[1], m[2].replace(/^~(?=\/|$)/, HOME), true);
      else sh.exported[m[1]] = true;
    });
    return code;
  });
  def("unset", "unset NAME ...   remove variables", function (c) {
    c.args.filter(function (a) { return a.charAt(0) !== "-"; }).forEach(function (n) { c.sh.unsetVar(n); });
    return 0;
  });
  def("set", "set   list shell variables", function (c) {
    if (c.args.length) { c.note("lab: shell options (set " + c.args.join(" ") + ") are not available; the command did nothing.\n"); return 0; }
    var v = c.sh.vars;
    c.out(Object.keys(v).sort(cmpBytes).map(function (k) { return k + "=" + shellQuote(v[k]); }).join("\n") + "\n");
    return 0;
  });
  var BUILTINS = { cd: 1, pwd: 1, echo: 1, printf: 1, export: 1, unset: 1, set: 1, history: 1, help: 1, source: 1, ".": 1, exit: 1, logout: 1,
    test: 1, "[": 1, "[[": 1, read: 1, type: 1, "true": 1, "false": 1, ":": 1, command: 1 };
  var KEYWORDS = { "if": 1, then: 1, "else": 1, elif: 1, fi: 1, "for": 1, "in": 1, "do": 1, done: 1, "while": 1, until: 1, "{": 1, "}": 1, "!": 1 };
  var NOT_ON_PATH = { grafanc: 1, module: 1, ml: 1, Rscript: 1, R: 1, sinteractive: 1, sbatch: 1, srun: 1, squeue: 1, salloc: 1, swarm: 1, scancel: 1, sacct: 1, clear: 0 };
  function programPath(n) {
    if (n === "plink") return "/usr/local/bin/plink";
    if (!CMDS[n] || NOT_ON_PATH[n] || BUILTINS[n] && !{ echo: 1, printf: 1, pwd: 1, test: 1, "[": 1, "true": 1, "false": 1 }[n]) return null;
    return "/usr/bin/" + n;
  }
  def("which", "which NAME ...   where a program is installed", function (c) {
    var code = 0, names = c.args.filter(function (a) { return a.charAt(0) !== "-"; });
    if (!names.length) return 1;
    names.forEach(function (n) {
      if (n.indexOf("/") >= 0) {
        var node = c.fs.lookup(c.sh.resolve(n));
        if (node && node.type === "f" && (node.exec || node.prog)) c.out(n + "\n"); else code = 1;
        return;
      }
      var p = programPath(n);
      if (p) c.out(p + "\n"); else code = 1;
    });
    return code;
  });
  def("type", "type NAME ...   how the shell interprets a name", function (c) {
    var code = 0;
    c.args.filter(function (a) { return a.charAt(0) !== "-"; }).forEach(function (n) {
      if (KEYWORDS[n]) c.out(n + " is a shell keyword\n");
      else if (BUILTINS[n]) c.out(n + " is a shell builtin\n");
      else if (n === "module" || n === "ml") c.out(n + " is a function (on HPC clusters; in the lab it explains itself)\n");
      else if (programPath(n)) c.out(n + " is " + programPath(n) + "\n");
      else if (CMDS[n]) c.out(n + " is a lab command\n");
      else { c.err("bash: type: " + n + ": not found\n"); code = 1; }
    });
    return code;
  });
  def("command", "command -v NAME   print how a name would be run", function (c) {
    if (c.args[0] === "-v" || c.args[0] === "-V") {
      var code = 0;
      c.args.slice(1).forEach(function (n) { if (BUILTINS[n] || KEYWORDS[n]) c.out(n + "\n"); else if (programPath(n)) c.out(programPath(n) + "\n"); else code = 1; });
      return code;
    }
    if (!c.args.length) return 0;
    var ctx = { out: c.out, err: c.err, note: c.note, info: c.info, stdin: c.stdin, isTTY: c.isTTY, io: c.io };
    return c.sh.invoke(c.args, ctx, []);
  });
  def("history", "history [-c]   list the commands typed in this page's terminals", function (c) {
    var h = c.sh.history;
    if (c.args[0] === "-c") { h.length = 0; return 0; }
    var n = c.args[0] && /^\d+$/.test(c.args[0]) ? +c.args[0] : h.length;
    var start = Math.max(0, h.length - n);
    c.out(h.slice(start).map(function (cmd, i) { return pad(start + i + 1, 5) + "  " + cmd.replace(/\n/g, "\n       "); }).join("\n") + (h.length ? "\n" : ""));
    return 0;
  });
  def("clear", "clear   clear the terminal screen (also Ctrl-L)", function (c) {
    if (c.io && c.io.clear && c.isTTY) c.io.clear();
    return 0;
  });
  def("true :", "true   do nothing, successfully", function () { return 0; });
  def("false", "false   do nothing, unsuccessfully", function () { return 1; });
  def("exit logout", "exit   (in the lab: explains that the page has no session to end)", function (c) {
    var code = c.args[0] && /^-?\d+$/.test(c.args[0]) ? (+c.args[0] & 255) : c.sh.lastCode;
    if (c.sh.positionalDepth) { var e = new Error(""); e.shellExit = true; e.exitCode = code; throw e; }
    c.note("lab: this terminal is part of the page, so there is no session to end. Reset files restores the starting files; reloading the page starts over.\n");
    return 0;
  });
  def("test", "test EXPRESSION   evaluate a condition: -e -f -d -s -z -n = != -eq -ne -lt -le -gt -ge", function (c) { return testEval(c.args, c.sh, "test"); });
  def("[", "[ EXPRESSION ]   same as test, for example [ -d \"$analysis_dir/grafanc\" ]", function (c) {
    var a = c.args;
    if (a[a.length - 1] !== "]") { c.err("bash: [: missing `]'\n"); return 2; }
    return testEval(a.slice(0, -1), c.sh, "[");
  });
  def("[[", "[[ EXPRESSION ]]   like [ ] (the lab supports the same tests)", function (c) {
    var a = c.args;
    if (a[a.length - 1] !== "]]") { c.err("bash: syntax error: missing `]]'\n"); return 2; }
    return testEval(a.slice(0, -1).map(function (x) { return x === "==" ? "=" : x; }), c.sh, "[[");
  });
  def("read", "read [-r] NAME ...   read one line of standard input into variables", function (c) {
    var g = getopt(c.args, "rs", "pa", {});
    var names = g.operands.length ? g.operands : ["REPLY"];
    if (!c.stdin) { c.note("lab: read waits for keyboard input, which this terminal cannot send to a command; use it after a pipe or with < FILE.\n"); return 1; }
    var t = c.stdin.text, p = c.stdin.pos;
    if (p >= t.length) return 1;
    var nl = t.indexOf("\n", p), line = nl < 0 ? t.slice(p) : t.slice(p, nl);
    c.stdin.pos = nl < 0 ? t.length : nl + 1;
    if (!g.opts.r) line = line.replace(/\\(.)/g, "$1");
    var rest = line.replace(/^[ \t]+/, "");
    names.forEach(function (n, i) {
      if (i === names.length - 1) { c.sh.setVar(n, rest.replace(/[ \t]+$/, "")); return; }
      var m = /^(\S*)[ \t]*/.exec(rest);
      c.sh.setVar(n, m[1]);
      rest = rest.slice(m[0].length);
    });
    return nl < 0 ? 1 : 0;
  });
  def("source .", "source FILE   run the commands in FILE in this shell", function (c) {
    var f = c.args[0];
    if (!f) { c.err("bash: " + c.name + ": filename argument required\n"); return 2; }
    var text = c.fs.readText(c.sh.resolve(f));
    if (text == null) { c.err("bash: " + f + ": No such file or directory\n"); return 1; }
    return runScriptFrom(c, text, c.args, false);
  });
  def("bash sh", "bash FILE | bash -c 'COMMANDS'   run a script in a new shell", function (c) {
    if (c.args[0] === "-c") {
      if (c.args[1] == null) { c.err("bash: -c: option requires an argument\n"); return 2; }
      return runScriptFrom(c, c.args[1], c.args.length > 2 ? c.args.slice(2) : ["bash"], true);
    }
    var f = c.args.filter(function (a) { return a.charAt(0) !== "-"; })[0];
    if (!f) { c.note("lab: this terminal is already running bash.\n"); return 0; }
    var text = c.fs.readText(c.sh.resolve(f));
    if (text == null) { c.err("bash: " + f + ": No such file or directory\n"); return 127; }
    return runScriptFrom(c, text, c.args.slice(c.args.indexOf(f)), true);
  });
  function runScriptFrom(c, text, argv, subshell) {
    var ctx = { out: c.out, err: c.err, note: c.note, info: c.info, stdin: c.stdin, isTTY: c.isTTY, io: c.io };
    return c.sh.runScript(text, ctx, argv, subshell);
  }
  def("sleep", "sleep SECONDS   wait (at most 5 s in the lab)", function (c) {
    var s = parseFloat(c.args[0]);
    if (isNaN(s)) { c.err("sleep: missing operand\nTry 'sleep --help' for more information.\n"); return 1; }
    return new Promise(function (r) { setTimeout(function () { r(0); }, Math.min(5, Math.max(0, s)) * 1000); });
  });
  def("date", "date   print the date and time", function (c) {
    var d = new Date(), days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    function z(n) { return (n < 10 ? "0" : "") + n; }
    c.out(days[d.getUTCDay()] + " " + MONTHS[d.getUTCMonth()] + " " + pad(d.getUTCDate(), 2) + " " + z(d.getUTCHours()) + ":" + z(d.getUTCMinutes()) + ":" + z(d.getUTCSeconds()) + " UTC " + d.getUTCFullYear() + "\n");
    return 0;
  });
  def("whoami", "whoami   your user name", function (c) { c.out(USER + "\n"); return 0; });
  def("id", "id   your user and group ids", function (c) { c.out("uid=1000(" + USER + ") gid=1000(" + USER + ") groups=1000(" + USER + ")\n"); return 0; });
  def("hostname", "hostname   the computer's name", function (c) { c.out(HOST + "\n"); return 0; });
  def("uname", "uname [-a]   the operating system", function (c) {
    c.out(c.args.indexOf("-a") >= 0 ? "Linux " + HOST + " 6.8.0-lab #1 SMP x86_64 GNU/Linux\n" : "Linux\n");
    return 0;
  });
  def("basename", "basename PATH [SUFFIX]   the last part of a path", function (c) {
    if (!c.args.length) return usageError(c, "missing operand");
    var b = basename(c.args[0]) || "/";
    if (c.args[1] && b !== c.args[1] && b.slice(-c.args[1].length) === c.args[1]) b = b.slice(0, -c.args[1].length);
    c.out(b + "\n");
    return 0;
  });
  def("dirname", "dirname PATH   the path without its last part", function (c) {
    if (!c.args.length) return usageError(c, "missing operand");
    c.args.forEach(function (p) { c.out(dirname(p) + "\n"); });
    return 0;
  });
  def("man", "man NAME   (the lab has no manual pages; use help NAME)", function (c) {
    var n = c.args[0];
    if (!n) { c.err("What manual page do you want?\nFor example, try 'man man'.\n"); return 1; }
    c.err("No manual entry for " + n + "\n");
    c.note("lab: try  help " + n + (n === "plink" ? "  or the PLINK 1.9 documentation at https://www.cog-genomics.org/plink/1.9/" : n === "grafanc" ? "  or GrafAnc's documentation at https://github.com/jimmy-penn/grafanc/blob/master/GrafAncDocumentation.md" : "") + "\n");
    return 16;
  });

  /* ---------------- Cluster commands: explained, not run ---------------- */
  def("module ml", "module load NAME   an HPC command (explained here, not run)", function (c) {
    var sub = c.name === "ml" ? (c.args.length ? "load" : "list") : (c.args[0] || "");
    var mods = (c.name === "ml" ? c.args : c.args.slice(1)).join(" ");
    if (sub === "load" || sub === "add") {
      var lines = [
        "lab: `module load " + mods + "` makes software available on an HPC cluster such as NIH's Biowulf.",
        "     A cluster keeps many programs and versions; environment modules put the chosen version on",
        "     your PATH (the list of folders the shell searches for programs) for the current session.",
        "     On your own computer you install a program once (see the Setup page) and it stays on your",
        "     PATH, so there is nothing to load. In this lab plink is already installed: try  which plink"
      ];
      if (/bcftools/.test(mods)) lines.push("     GrafAnc never runs bcftools; on Biowulf the module most likely makes htslib, the library GrafAnc uses for VCF input, available. The lab's GrafAnc reads PLINK files, so nothing more is needed.");
      c.note(lines.join("\n") + "\n");
      return 0;
    }
    if (sub === "avail" || sub === "spider") { c.note("lab: on a cluster, module avail lists the installed software. The lab has one program set: plink (PLINK 1.9) on your PATH, GrafAnc after git clone, and the commands listed by help.\n"); return 0; }
    if (sub === "list") { c.out("No modules loaded\n"); return 0; }
    if (sub === "purge" || sub === "unload") return 0;
    c.note("lab: module manages software on HPC clusters (module load NAME, module avail, module list). Nothing needs loading in the lab.\n");
    return 0;
  });
  var SLURM = {
    sinteractive: "asks Biowulf's job scheduler (Slurm) for an interactive session on a compute node, so heavy programs do not run on the shared login node.",
    sbatch: "submits a batch script to the Slurm job scheduler, which runs it on a compute node when the requested CPUs and memory are free.",
    srun: "runs a command on compute nodes through the Slurm job scheduler.",
    salloc: "reserves compute nodes through the Slurm job scheduler.",
    squeue: "lists the jobs waiting or running in the Slurm job scheduler.",
    scancel: "cancels a Slurm job.",
    sacct: "reports on finished Slurm jobs.",
    swarm: "is Biowulf's tool for submitting many similar commands as one group of Slurm jobs.",
    jobhist: "reports on a finished Biowulf job."
  };
  def(Object.keys(SLURM).join(" "), "sinteractive, sbatch, srun, squeue …   HPC scheduler commands (explained here, not run)", function (c) {
    c.err("bash: " + c.name + ": command not found\n");
    c.note("lab: " + c.name + " " + SLURM[c.name] + " This lab, like your own computer, runs each command directly in the terminal, so you can type the PLINK commands as they are.\n");
    return 127;
  });
  def("Rscript R", "Rscript, R   R does not run in the terminal; use the page's R console boxes", function (c) {
    c.err("bash: " + c.name + ": command not found\n");
    c.note("lab: R does not run in this terminal. Run the practical's R code in the R console boxes on the practical pages (they use WebR, R compiled to run in the browser), or in R or RStudio on your own computer.\n");
    return 127;
  });

  /* ---------------- help ---------------- */
  var HELP_GROUPS = [
    ["PLINK and GrafAnc", "plink grafanc git gunzip gzip zcat"],
    ["Files and folders", "ls cd pwd mkdir rmdir cp mv rm touch chmod du find tree file"],
    ["Reading files", "cat head tail less wc xxd hexdump"],
    ["Text processing", "grep awk sort uniq cut tr tee seq"],
    ["Shell", "echo printf env printenv export unset set which type command history clear source bash test read sleep date whoami id hostname uname basename dirname true false exit man"],
    ["Explained, not run", "module sinteractive sbatch srun squeue Rscript R"]
  ];
  def("help", "help [NAME]   what the lab is, and the commands it knows", function (c) {
    var n = c.args[0];
    if (n) {
      if (HELP[n]) { c.out(HELP[n].replace(/ {3,}/, "\n    ") + "\n"); return 0; }
      if (KEYWORDS[n]) { c.out(n + ": a shell keyword. The lab supports  if …; then …; [elif …; then …;] [else …;] fi,  for NAME in WORDS; do …; done  and  while …; do …; done.\n"); return 0; }
      c.err("bash: help: no help topics match `" + n + "'.\n");
      return 1;
    }
    var w = 20, out = [
      "Lab shell: the practical's commands, run in your browser",
      "",
      "  This terminal runs inside the page. plink is a JavaScript emulation of PLINK 1.9 and grafanc of",
      "  GrafAnc; they run the practical's commands on a small toy dataset (toy.bed/.bim/.fam in place of",
      "  penncath.*) and write output files with PLINK's real names and columns. Files are kept in this",
      "  page's memory: the file panel shows and downloads them, Reset files restores the start, and",
      "  leaving the page discards them. The terminals on a page share one set of files and variables.",
      "",
      "  Folders:  $input_dir      " + INPUT_DIR.replace(HOME, "~") + "  (toy study)",
      "            $reference_dir  " + REF_DIR.replace(HOME, "~") + "  (toy reference panel)",
      "            $analysis_dir   " + ANALYSIS_DIR.replace(HOME, "~") + "  (your outputs)",
      "  Shell:    pipes |, redirection > >> < 2>, ; && ||, quotes, \\ line continuation, # comments,",
      "            $VAR ${VAR} ~ * globs, VAR=value, export, $(command), if/for/while",
      "  Keys:     Up/Down history, Tab completes commands and paths, Ctrl-L clears, Ctrl-C cancels,",
      "            Shift+Enter adds a line, Esc then Tab moves on from the terminal",
      ""
    ];
    HELP_GROUPS.forEach(function (gr) {
      var words = gr[1].split(" "), line = pad(gr[0], w, true), first = true;
      words.forEach(function (x) {
        if (line.length + x.length + 1 > 98) { out.push(line); line = pad("", w, true); first = true; }
        line += (first ? "" : " ") + x;
        first = false;
      });
      out.push(line);
    });
    out.push("", "Type  help NAME  for a command's options, for example  help sort");
    c.out(out.join("\n") + "\n");
    return 0;
  });

  /* ======================================================================
     8. printf formatting (shared by printf and awk) and awk
     ====================================================================== */
  function expFix(s) { return s.replace(/e([+-])(\d)$/, "e$10$2"); }
  function floatFmt(v, conv, flags, p) {
    var up = conv === "E" || conv === "F" || conv === "G";
    if (p == null) p = 6;
    var s, neg = v < 0 || (v === 0 && 1 / v < 0);
    if (isNaN(v)) s = "nan";
    else if (!isFinite(v)) s = "inf";
    else {
      var a = Math.abs(v);
      if (conv === "f" || conv === "F") s = a < 1e21 ? a.toFixed(p) : a.toExponential(p);
      else if (conv === "e" || conv === "E") s = expFix(a.toExponential(p));
      else {
        var P = p === 0 ? 1 : p;
        if (a === 0) s = flags.indexOf("#") >= 0 ? (0).toFixed(P - 1) : "0";
        else {
          var ex = parseInt(a.toExponential(P - 1).split("e")[1], 10);
          if (ex < -4 || ex >= P) {
            s = a.toExponential(P - 1);
            if (flags.indexOf("#") < 0) s = s.replace(/\.?0+e/, "e");
            s = expFix(s);
          } else {
            s = a.toFixed(Math.max(0, P - 1 - ex));
            if (flags.indexOf("#") < 0 && s.indexOf(".") >= 0) s = s.replace(/\.?0+$/, "");
          }
        }
      }
    }
    if (up) s = s.toUpperCase();
    if (neg && !isNaN(v)) s = "-" + s;
    else if (flags.indexOf("+") >= 0) s = "+" + s;
    else if (flags.indexOf(" ") >= 0) s = " " + s;
    return s;
  }
  /* C-style formatting. getStr(i) / getNum(i) return argument i as a string / number. */
  function formatC(fmt, getStr, getNum) {
    var out = "", i = 0, argi = 0, n = fmt.length;
    while (i < n) {
      var ch = fmt.charAt(i);
      if (ch !== "%") { out += ch; i++; continue; }
      if (fmt.charAt(i + 1) === "%") { out += "%"; i += 2; continue; }
      var m = /^%([-+ #0]*)(\*|\d+)?(?:\.(\*|\d*))?(?:hh|h|ll|l|L|q|j|z|t)?([diouxXeEfFgGcs])/.exec(fmt.slice(i));
      if (!m) { out += ch; i++; continue; }
      var flags = m[1], width = m[2], prec = m[3], conv = m[4], s;
      if (width === "*") { var wv = getNum(argi++) | 0; if (wv < 0) { flags += "-"; wv = -wv; } width = String(wv); }
      if (prec === "*") prec = String(getNum(argi++) | 0);
      var w = width ? parseInt(width, 10) : 0;
      var p = prec === undefined ? null : prec === "" ? 0 : parseInt(prec, 10);
      var numeric = "diouxXeEfFgG".indexOf(conv) >= 0;
      switch (conv) {
        case "d": case "i": {
          var v = getNum(argi++);
          if (!isFinite(v)) { s = floatFmt(v, "f", flags, 0); break; }
          v = Math.trunc(v);
          var digits = String(Math.abs(v));
          if (Math.abs(v) >= 1e21) digits = BigInt ? BigInt(Math.abs(v)).toString() : digits;
          if (p !== null) { while (digits.length < p) digits = "0" + digits; if (p === 0 && v === 0) digits = ""; }
          s = (v < 0 ? "-" : flags.indexOf("+") >= 0 ? "+" : flags.indexOf(" ") >= 0 ? " " : "") + digits;
          break;
        }
        case "o": case "u": case "x": case "X": {
          var u = Math.trunc(getNum(argi++));
          if (u < 0) u = u >>> 0;
          s = conv === "o" ? u.toString(8) : conv === "u" ? String(u) : u.toString(16);
          if (conv === "X") s = s.toUpperCase();
          if (p !== null) while (s.length < p) s = "0" + s;
          if (flags.indexOf("#") >= 0 && u !== 0) s = (conv === "o" ? "0" : conv === "x" ? "0x" : conv === "X" ? "0X" : "") + s;
          break;
        }
        case "e": case "E": case "f": case "F": case "g": case "G":
          s = floatFmt(getNum(argi++), conv, flags, p);
          break;
        case "c": { var cs = getStr(argi++, "c"); s = cs == null ? "" : String(cs).charAt(0); break; }
        default: { s = getStr(argi++); s = s == null ? "" : String(s); if (p !== null) s = s.slice(0, p); }
      }
      if (s.length < w) {
        var fill = w - s.length;
        if (flags.indexOf("-") >= 0) s += new Array(fill + 1).join(" ");
        else if (flags.indexOf("0") >= 0 && numeric && !(p !== null && "diouxX".indexOf(conv) >= 0) && /^[-+ ]?[0-9]/.test(s)) {
          var sign = /^[-+ ]/.test(s) ? s.charAt(0) : "";
          s = sign + new Array(fill + 1).join("0") + s.slice(sign.length);
        } else s = new Array(fill + 1).join(" ") + s;
      }
      out += s;
      i += m[0].length;
    }
    return { text: out, used: argi };
  }

  /* ---------------- awk: values ----------------
     Numbers are JS numbers, strings JS strings, input fields are strnums (new SN(text): compared as numbers
     when they look numeric), and UNINIT is the uninitialized value ("" and 0 at once). */
  function SN(s) { this.s = s; }
  var UNINIT = { uninit: true };
  var NUM_RE = /^[ \t\n]*[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?[ \t\n]*$/;
  var LEAD_NUM_RE = /^[ \t\n]*([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/;
  function strtod(s) { var m = LEAD_NUM_RE.exec(s); return m ? parseFloat(m[1]) : 0; }
  function AwkError(msg) { var e = new Error(msg); e.awk = true; return e; }

  /* awk escape sequences in string literals and regex literals */
  function awkUnescape(s, inRegex) {
    var out = "", i = 0, m;
    var map = { n: "\n", t: "\t", r: "\r", f: "\f", v: "\v", a: "\x07", b: "\b", "\\": "\\", '"': '"', "/": "/" };
    while (i < s.length) {
      var ch = s.charAt(i);
      if (ch !== "\\" || i + 1 >= s.length) { out += ch; i++; continue; }
      var d = s.charAt(i + 1);
      if (inRegex) {
        if (d === "/") { out += "/"; i += 2; continue; }
        if (d === '"') { out += '"'; i += 2; continue; }
        if ("ntrfva".indexOf(d) >= 0) { out += map[d]; i += 2; continue; }
        out += ch + d; i += 2; continue;
      }
      if (map[d] != null) { out += map[d]; i += 2; continue; }
      if ((m = /^[0-7]{1,3}/.exec(s.slice(i + 1)))) { out += String.fromCharCode(parseInt(m[0], 8)); i += 1 + m[0].length; continue; }
      out += d === "&" ? "\\&" : d; i += 2;
    }
    return out;
  }

  var AWK_KW = { BEGIN: 1, END: 1, "function": 1, func: 1, "if": 1, "else": 1, "while": 1, "for": 1, "do": 1, "break": 1, "continue": 1,
    next: 1, nextfile: 1, exit: 1, "return": 1, "delete": 1, "in": 1, getline: 1, print: 1, printf: 1 };
  var AWK_BUILTIN = { length: 1, substr: 1, index: 1, split: 1, sub: 1, gsub: 1, match: 1, sprintf: 1, sin: 1, cos: 1, atan2: 1, exp: 1,
    log: 1, sqrt: 1, "int": 1, rand: 1, srand: 1, tolower: 1, toupper: 1, system: 1, close: 1, fflush: 1 };
  var AWK_OPS = ["**=", "+=", "-=", "*=", "/=", "%=", "^=", "==", "<=", ">=", "!=", "++", "--", "&&", "||", ">>", "!~", "**",
    "{", "}", "(", ")", "[", "]", ";", ",", "+", "-", "*", "/", "%", "^", "!", ">", "<", "|", "?", ":", "~", "=", "$"];

  function awkLex(src) {
    var toks = [], i = 0, n = src.length, line = 1;
    function push(t, v) { toks.push({ t: t, v: v, line: line }); }
    function regexOK() {
      var t = toks[toks.length - 1];
      if (!t) return true;
      if (t.t === "num" || t.t === "str" || t.t === "name" || t.t === "fname" || t.t === "re") return false;
      if (t.t === "builtin") return false;
      if (t.t === "op" && (t.v === ")" || t.v === "]" || t.v === "$" || t.v === "++" || t.v === "--")) return false;
      return true;
    }
    while (i < n) {
      var ch = src.charAt(i), m;
      if (ch === " " || ch === "\t" || ch === "\r") { i++; continue; }
      if (ch === "\\" && src.charAt(i + 1) === "\n") { i += 2; line++; continue; }
      if (ch === "\\" && src.charAt(i + 1) === "\r" && src.charAt(i + 2) === "\n") { i += 3; line++; continue; }
      if (ch === "\n") { push("nl"); i++; line++; continue; }
      if (ch === "#") { while (i < n && src.charAt(i) !== "\n") i++; continue; }
      if ((m = /^(?:\d+\.?\d*(?:[eE][-+]?\d+)?|\.\d+(?:[eE][-+]?\d+)?)/.exec(src.slice(i)))) { push("num", parseFloat(m[0])); i += m[0].length; continue; }
      if (ch === '"') {
        var j = i + 1, raw = "";
        while (j < n && src.charAt(j) !== '"') {
          if (src.charAt(j) === "\\" && j + 1 < n) { raw += src.charAt(j) + src.charAt(j + 1); j += 2; continue; }
          if (src.charAt(j) === "\n") throw AwkError("newline in string " + JSON.stringify(raw) + " at source line " + line);
          raw += src.charAt(j++);
        }
        if (j >= n) throw AwkError("non-terminated string " + JSON.stringify(raw) + " at source line " + line);
        push("str", awkUnescape(raw, false));
        i = j + 1; continue;
      }
      if (ch === "/" && regexOK()) {
        var k = i + 1, body = "", inBr = false;
        while (k < n) {
          var c2 = src.charAt(k);
          if (c2 === "\\" && k + 1 < n) { body += c2 + src.charAt(k + 1); k += 2; continue; }
          if (c2 === "[") inBr = true;
          else if (c2 === "]") inBr = false;
          else if (c2 === "/" && !inBr) break;
          else if (c2 === "\n") throw AwkError("newline in regex at source line " + line);
          body += c2; k++;
        }
        if (k >= n) throw AwkError("non-terminated regular expression " + body + " at source line " + line);
        push("re", awkUnescape(body, true));
        i = k + 1; continue;
      }
      if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i)))) {
        var w = m[0];
        i += w.length;
        if (AWK_KW[w]) push("kw", w === "func" ? "function" : w);
        else if (AWK_BUILTIN[w]) push("builtin", w);
        else if (src.charAt(i) === "(") push("fname", w);
        else push("name", w);
        continue;
      }
      var op = null;
      for (var q = 0; q < AWK_OPS.length; q++) if (src.substr(i, AWK_OPS[q].length) === AWK_OPS[q]) { op = AWK_OPS[q]; break; }
      if (!op) throw AwkError("syntax error at source line " + line + ": unexpected character '" + ch + "'");
      if (op === "**") op = "^";
      if (op === "**=") op = "^=";
      push("op", op);
      i += src.substr(i, 3) === "**=" ? 3 : src.substr(i, 2) === "**" ? 2 : op.length;
    }
    push("eof");
    return toks;
  }

  function AwkParser(toks) { this.t = toks; this.i = 0; this.funcs = {}; }
  var AP = AwkParser.prototype;
  AP.peek = function () { return this.t[this.i]; };
  AP.next = function () { return this.t[this.i++]; };
  AP.is = function (t, v) { var k = this.t[this.i]; return k.t === t && (v === undefined || k.v === v); };
  AP.isOp = function (v) { return this.is("op", v); };
  AP.eat = function (t, v) { if (this.is(t, v)) { this.i++; return true; } return false; };
  AP.optNL = function () { while (this.is("nl")) this.i++; };
  AP.optTerm = function () { while (this.is("nl") || this.isOp(";")) this.i++; };
  AP.fail = function (what) {
    var k = this.peek();
    var near = k.t === "eof" ? "end of program" : k.t === "nl" ? "newline" : k.t === "str" ? JSON.stringify(k.v) : k.t === "re" ? "/" + k.v + "/" : String(k.v);
    throw AwkError("syntax error at source line " + k.line + (what ? ": " + what : "") + " near " + near);
  };
  AP.expect = function (t, v) { if (!this.eat(t, v)) this.fail("expected " + (v || t)); };
  AP.program = function () {
    var prog = { begin: [], end: [], rules: [], funcs: this.funcs };
    this.optTerm();
    while (!this.is("eof")) {
      if (this.is("kw", "BEGIN")) { this.i++; this.optNL(); prog.begin.push(this.block()); }
      else if (this.is("kw", "END")) { this.i++; this.optNL(); prog.end.push(this.block()); }
      else if (this.is("kw", "function")) this.func();
      else {
        var rule = { pattern: null, pattern2: null, action: null };
        if (!this.isOp("{")) {
          rule.pattern = this.expr();
          if (this.eat("op", ",")) { this.optNL(); rule.pattern2 = this.expr(); }
        }
        if (this.isOp("{")) rule.action = this.block();
        prog.rules.push(rule);
      }
      this.optTerm();
    }
    return prog;
  };
  AP.func = function () {
    this.i++;
    var nt = this.next();
    if (nt.t !== "name" && nt.t !== "fname") this.fail("expected a function name");
    this.expect("op", "(");
    var params = [];
    while (!this.isOp(")")) {
      var p = this.next();
      if (p.t !== "name") this.fail("expected a parameter name");
      params.push(p.v);
      if (!this.eat("op", ",")) break;
      this.optNL();
    }
    this.expect("op", ")");
    this.optNL();
    this.funcs[nt.v] = { params: params, body: this.block() };
  };
  AP.block = function () {
    this.expect("op", "{");
    var list = [];
    this.optTerm();
    while (!this.isOp("}")) {
      if (this.is("eof")) this.fail("missing }");
      list.push(this.stmt());
      this.optTerm();
    }
    this.i++;
    return { t: "block", list: list };
  };
  AP.simpleEnd = function () {
    if (this.isOp(";") || this.is("nl")) { this.i++; return; }
    if (this.isOp("}") || this.is("eof")) return;
    this.fail();
  };
  AP.stmt = function () {
    var k = this.peek();
    if (k.t === "op" && k.v === "{") return this.block();
    if (k.t === "op" && k.v === ";") { this.i++; return { t: "block", list: [] }; }
    if (k.t === "kw") {
      switch (k.v) {
        case "if": {
          this.i++; this.expect("op", "("); var c = this.expr(); this.expect("op", ")"); this.optNL();
          var a = this.stmt(), b = null, save = this.i;
          this.optTerm();
          if (this.is("kw", "else")) { this.i++; this.optNL(); b = this.stmt(); } else this.i = save;
          return { t: "if", c: c, a: a, b: b };
        }
        case "while": {
          this.i++; this.expect("op", "("); var wc = this.expr(); this.expect("op", ")");
          if (this.isOp(";")) { this.i++; return { t: "while", c: wc, body: { t: "block", list: [] } }; }
          this.optNL();
          return { t: "while", c: wc, body: this.stmt() };
        }
        case "do": {
          this.i++; this.optNL(); var body = this.stmt(); this.optTerm();
          if (!this.is("kw", "while")) this.fail("expected while");
          this.i++; this.expect("op", "("); var dc = this.expr(); this.expect("op", ")"); this.simpleEnd();
          return { t: "do", body: body, c: dc };
        }
        case "for": {
          this.i++; this.expect("op", "(");
          if (this.is("name") && this.t[this.i + 1].t === "kw" && this.t[this.i + 1].v === "in" && this.t[this.i + 2].t === "name" && this.t[this.i + 3].t === "op" && this.t[this.i + 3].v === ")") {
            var v = this.next().v; this.i++; var arr = this.next().v; this.i++; this.optNL();
            return { t: "forin", v: v, arr: arr, body: this.stmt() };
          }
          var init = this.isOp(";") ? null : this.simple();
          this.expect("op", ";"); this.optNL();
          var cond = this.isOp(";") ? null : this.expr();
          this.expect("op", ";"); this.optNL();
          var step = this.isOp(")") ? null : this.simple();
          this.expect("op", ")");
          if (this.isOp(";")) { this.i++; return { t: "for", init: init, c: cond, step: step, body: { t: "block", list: [] } }; }
          this.optNL();
          return { t: "for", init: init, c: cond, step: step, body: this.stmt() };
        }
        case "next": this.i++; this.simpleEnd(); return { t: "next" };
        case "nextfile": this.i++; this.simpleEnd(); return { t: "nextfile" };
        case "break": this.i++; this.simpleEnd(); return { t: "break" };
        case "continue": this.i++; this.simpleEnd(); return { t: "continue" };
        case "exit": case "return": {
          this.i++;
          var e = (this.isOp(";") || this.is("nl") || this.isOp("}") || this.is("eof")) ? null : this.expr();
          this.simpleEnd();
          return { t: k.v, e: e };
        }
        case "delete": {
          this.i++;
          var nm = this.next();
          if (nm.t !== "name") this.fail("expected an array name");
          var subs = null;
          if (this.eat("op", "[")) { subs = this.exprList(); this.expect("op", "]"); }
          this.simpleEnd();
          return { t: "delete", name: nm.v, subs: subs };
        }
        case "getline": throw AwkError("getline is not available in the lab's awk");
        case "print": case "printf": { var s = this.printStmt(); this.simpleEnd(); return s; }
      }
    }
    var ex = this.simple();
    this.simpleEnd();
    return ex;
  };
  AP.simple = function () {
    if (this.is("kw", "print") || this.is("kw", "printf")) return this.printStmt();
    return { t: "expr", e: this.expr() };
  };
  AP.printStmt = function () {
    var kind = this.next().v, args = [];
    var end = function (p) { return p.isOp(";") || p.is("nl") || p.isOp("}") || p.isOp(">") || p.isOp(">>") || p.isOp("|") || p.is("eof"); };
    if (!end(this)) {
      if (this.isOp("(")) {
        var save = this.i;
        this.i++;
        var list = this.exprList();
        if (this.eat("op", ")") && end(this)) args = list;
        else { this.i = save; args = this.exprList(true); }
      } else args = this.exprList(true);
    }
    var redir = null;
    if (this.isOp(">") || this.isOp(">>") || this.isOp("|")) {
      var op = this.next().v;
      if (op === "|") throw AwkError("piping awk output to a command is not available in the lab");
      redir = { op: op, e: this.concat(true) };
    }
    if (kind === "printf" && !args.length) this.fail("printf needs a format");
    return { t: kind, args: args, redir: redir };
  };
  AP.exprList = function (noGt) {
    var list = [this.expr(noGt)];
    while (this.eat("op", ",")) { this.optNL(); list.push(this.expr(noGt)); }
    return list;
  };
  AP.expr = function (noGt) { return this.ternary(noGt); };
  function isLvalue(n) { return n.t === "var" || n.t === "field" || n.t === "idx"; }
  AP.ternary = function (noGt) {
    var c = this.or(noGt);
    if (this.isOp("?")) {
      this.i++; this.optNL();
      var a = this.ternary(noGt); this.optNL();
      this.expect("op", ":"); this.optNL();
      var b = this.ternary(noGt);
      return { t: "cond", c: c, a: a, b: b };
    }
    var k = this.peek();
    if (k.t === "op" && /^(=|\+=|-=|\*=|\/=|%=|\^=)$/.test(k.v) && isLvalue(c)) {
      this.i++; this.optNL();
      return { t: "assign", op: k.v, lv: c, e: this.ternary(noGt) };
    }
    return c;
  };
  AP.or = function (noGt) {
    var a = this.and(noGt);
    while (this.isOp("||")) { this.i++; this.optNL(); a = { t: "or", a: a, b: this.and(noGt) }; }
    return a;
  };
  AP.and = function (noGt) {
    var a = this.inop(noGt);
    while (this.isOp("&&")) { this.i++; this.optNL(); a = { t: "and", a: a, b: this.inop(noGt) }; }
    return a;
  };
  AP.inop = function (noGt) {
    var a = this.match(noGt);
    while (this.is("kw", "in")) {
      this.i++;
      var nm = this.next();
      if (nm.t !== "name") this.fail("expected an array name after in");
      a = { t: "in", subs: a.t === "grouplist" ? a.list : [a], name: nm.v };
    }
    return a;
  };
  AP.match = function (noGt) {
    var a = this.rel(noGt);
    while (this.isOp("~") || this.isOp("!~")) {
      var op = this.next().v;
      a = { t: "match", neg: op === "!~", a: a, re: this.rel(noGt) };
    }
    return a;
  };
  AP.rel = function (noGt) {
    var a = this.concat(noGt);
    var k = this.peek();
    if (k.t === "op" && (k.v === "<" || k.v === "<=" || k.v === "==" || k.v === "!=" || k.v === ">=" || (k.v === ">" && !noGt))) {
      this.i++;
      return { t: "cmp", op: k.v, a: a, b: this.concat(noGt) };
    }
    return a;
  };
  AP.startsConcat = function () {
    var k = this.peek();
    if (k.t === "num" || k.t === "str" || k.t === "name" || k.t === "fname" || k.t === "builtin" || k.t === "re") return true;
    if (k.t === "op" && (k.v === "$" || k.v === "(" || k.v === "!" || k.v === "++" || k.v === "--" || k.v === "-" && false)) return k.v !== "!";
    return false;
  };
  AP.concat = function (noGt) {
    var a = this.additive();
    while (this.startsConcat()) a = { t: "concat", a: a, b: this.additive() };
    return a;
  };
  AP.additive = function () {
    var a = this.mul();
    while (this.isOp("+") || this.isOp("-")) { var op = this.next().v; a = { t: "bin", op: op, a: a, b: this.mul() }; }
    return a;
  };
  AP.mul = function () {
    var a = this.unary();
    while (this.isOp("*") || this.isOp("/") || this.isOp("%")) { var op = this.next().v; a = { t: "bin", op: op, a: a, b: this.unary() }; }
    return a;
  };
  AP.unary = function () {
    if (this.isOp("!")) { this.i++; return { t: "not", a: this.unary() }; }
    if (this.isOp("-")) { this.i++; return { t: "neg", a: this.unary() }; }
    if (this.isOp("+")) { this.i++; return { t: "pos", a: this.unary() }; }
    return this.power();
  };
  AP.power = function () {
    var a = this.postfix();
    if (this.isOp("^")) { this.i++; return { t: "bin", op: "^", a: a, b: this.unaryPow() }; }
    return a;
  };
  AP.unaryPow = function () {
    if (this.isOp("-")) { this.i++; return { t: "neg", a: this.unaryPow() }; }
    if (this.isOp("+")) { this.i++; return this.unaryPow(); }
    if (this.isOp("!")) { this.i++; return { t: "not", a: this.unaryPow() }; }
    return this.power();
  };
  AP.postfix = function () {
    var a = this.primary();
    if (isLvalue(a) && (this.isOp("++") || this.isOp("--"))) return { t: "incdec", op: this.next().v, prefix: false, lv: a };
    return a;
  };
  AP.primary = function () {
    var k = this.next();
    switch (k.t) {
      case "num": return { t: "num", v: k.v };
      case "str": return { t: "str", v: k.v };
      case "re": return { t: "re", src: k.v };
      case "name":
        if (this.isOp("[")) { this.i++; var subs = this.exprList(); this.expect("op", "]"); return { t: "idx", name: k.v, subs: subs }; }
        return { t: "var", name: k.v };
      case "fname": {
        this.expect("op", "(");
        var args = this.isOp(")") ? [] : this.exprList();
        this.expect("op", ")");
        return { t: "ucall", name: k.v, args: args };
      }
      case "builtin": {
        if (this.isOp("(")) {
          this.i++;
          var bargs = this.isOp(")") ? [] : this.exprList();
          this.expect("op", ")");
          return { t: "call", name: k.v, args: bargs };
        }
        if (k.v === "length") return { t: "call", name: "length", args: [] };
        this.i--; this.fail("expected ( after " + k.v);
      }
      // falls through
      case "op":
        if (k.v === "$") { var e = this.fieldOperand(); return { t: "field", e: e }; }
        if (k.v === "(") {
          var list = this.exprList();
          this.expect("op", ")");
          if (list.length > 1) { if (!this.is("kw", "in")) this.fail("expected in after (list)"); return { t: "grouplist", list: list }; }
          return { t: "group", e: list[0] };
        }
        if (k.v === "++" || k.v === "--") {
          var lv = this.primary();
          if (!isLvalue(lv)) this.fail("++ or -- needs a variable");
          return { t: "incdec", op: k.v, prefix: true, lv: lv };
        }
        if (k.v === "-") return { t: "neg", a: this.unary() };
        if (k.v === "!") return { t: "not", a: this.unary() };
        break;
      case "kw":
        if (k.v === "getline") throw AwkError("getline is not available in the lab's awk");
        break;
    }
    this.i--;
    this.fail();
  };
  AP.fieldOperand = function () {
    var k = this.peek();
    if (k.t === "op" && (k.v === "++" || k.v === "--")) { this.i++; var lv = this.primary(); return { t: "incdec", op: k.v, prefix: true, lv: lv }; }
    if (k.t === "op" && k.v === "-") { this.i++; return { t: "neg", a: this.fieldOperand() }; }
    return this.primary();
  };

  /* ---------------- awk: interpreter ---------------- */
  var BRK = { brk: 1 }, CONT = { cont: 1 }, NEXT = { next: 1 }, NEXTFILE = { nextfile: 1 };
  function AwkVM(prog, out, err, fs) {
    this.prog = prog; this.out = out; this.err = err; this.vfs = fs;
    this.G = Object.create(null);
    this.frames = [];
    this.rec = ""; this.fields = []; this.nf = 0; this.splitDone = true;
    this.reCache = Object.create(null);
    this.files = Object.create(null);
    this.steps = 0;
    this.seed = 0; this.rng = mulberry(0);
    var g = this.G;
    g.FS = " "; g.OFS = " "; g.ORS = "\n"; g.RS = "\n"; g.NR = 0; g.FNR = 0; g.FILENAME = ""; g.SUBSEP = "\x1c";
    g.RSTART = 0; g.RLENGTH = -1; g.CONVFMT = "%.6g"; g.OFMT = "%.6g";
  }
  function mulberry(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var VM = AwkVM.prototype;
  VM.num = function (v) {
    if (typeof v === "number") return v;
    if (typeof v === "string") return strtod(v);
    if (v === UNINIT || v == null) return 0;
    if (v instanceof SN) return strtod(v.s);
    return 0;
  };
  VM.fmtNum = function (v, fmtName) {
    if (Number.isInteger(v) && Math.abs(v) < 1e16) return String(v);
    var f = this.str(this.G[fmtName]);
    if (f === "%.6g") return floatFmt(v, "g", "", 6);
    return formatC(f, function () { return ""; }, function () { return v; }).text;
  };
  VM.str = function (v) {
    if (typeof v === "string") return v;
    if (typeof v === "number") return this.fmtNum(v, "CONVFMT");
    if (v instanceof SN) return v.s;
    return "";
  };
  VM.outStr = function (v) { return typeof v === "number" ? this.fmtNum(v, "OFMT") : this.str(v); };
  VM.isNumeric = function (v) { return typeof v === "number" || v === UNINIT || (v instanceof SN && NUM_RE.test(v.s)); };
  VM.truth = function (v) {
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") return v !== "";
    if (v instanceof SN) return NUM_RE.test(v.s) ? strtod(v.s) !== 0 : v.s !== "";
    return false;
  };
  VM.compare = function (a, b) {
    if (this.isNumeric(a) && this.isNumeric(b)) { var x = this.num(a), y = this.num(b); return x < y ? -1 : x > y ? 1 : 0; }
    var s = this.str(a), t = this.str(b);
    return s < t ? -1 : s > t ? 1 : 0;
  };
  VM.regex = function (src, flags) {
    var key = (flags || "") + "\x00" + src;
    var re = this.reCache[key];
    if (!re) {
      try { re = new RegExp(posixRegex(src, true), flags || ""); }
      catch (e) { throw AwkError("invalid regular expression /" + src + "/"); }
      this.reCache[key] = re;
    }
    re.lastIndex = 0;
    return re;
  };
  VM.regexOf = function (node, flags) {
    if (node.t === "re") return this.regex(node.src, flags);
    return this.regex(this.str(this.eval(node)), flags);
  };
  /* ---- records and fields ---- */
  VM.setRecord = function (s) { this.rec = s; this.splitDone = false; };
  VM.split = function () {
    if (this.splitDone) return;
    this.fields = this.splitText(this.rec, this.str(this.G.FS));
    this.nf = this.fields.length;
    this.splitDone = true;
  };
  VM.splitText = function (s, fs) {
    if (s === "") return [];
    if (fs === " ") { var t = s.replace(/^[ \t\n]+|[ \t\n]+$/g, ""); return t === "" ? [] : t.split(/[ \t\n]+/); }
    if (fs.length === 1 && fs !== "\\") return s.split(fs);
    return s.split(this.regex(fs));
  };
  VM.getField = function (i) {
    i = Math.trunc(this.num(i));
    if (i < 0) throw AwkError("trying to access out of range field " + i);
    if (i === 0) return new SN(this.rec);
    this.split();
    if (i > this.nf) return UNINIT;
    var f = this.fields[i - 1];
    return typeof f === "string" ? new SN(f) : f;
  };
  VM.rebuild = function () {
    var self = this, ofs = this.str(this.G.OFS);
    this.rec = this.fields.map(function (f) { return self.str(f); }).join(ofs);
  };
  VM.setField = function (i, v) {
    i = Math.trunc(this.num(i));
    if (i < 0) throw AwkError("trying to access out of range field " + i);
    if (i === 0) { this.setRecord(this.str(v)); return; }
    this.split();
    while (this.fields.length < i) this.fields.push("");
    this.fields[i - 1] = v instanceof SN ? v.s : v;
    this.nf = this.fields.length;
    this.rebuild();
  };
  VM.setNF = function (n) {
    this.split();
    n = Math.max(0, Math.trunc(this.num(n)));
    while (this.fields.length < n) this.fields.push("");
    this.fields.length = n;
    this.nf = n;
    this.rebuild();
  };
  /* ---- variables ---- */
  VM.scope = function (name) {
    var f = this.frames[this.frames.length - 1];
    return f && Object.prototype.hasOwnProperty.call(f, name) ? f : this.G;
  };
  VM.getVar = function (name) {
    if (name === "NF") { this.split(); return this.nf; }
    var s = this.scope(name), v = s[name];
    if (v === undefined) return UNINIT;
    if (v && v.arr) throw AwkError("can't use array " + name + " in scalar context");
    return v;
  };
  VM.setVar = function (name, v) {
    if (name === "NF") { this.setNF(v); return; }
    var s = this.scope(name);
    if (s[name] && s[name].arr) throw AwkError("can't assign to " + name + "; it's an array name.");
    s[name] = v;
  };
  VM.array = function (name) {
    var s = this.scope(name), v = s[name];
    if (v === undefined || v === UNINIT) { v = { arr: true, map: new Map() }; s[name] = v; }
    if (!v.arr) throw AwkError("can't use scalar " + name + " as array");
    return v.map;
  };
  VM.subKey = function (subs) {
    var self = this;
    return subs.map(function (e) { return self.str(self.eval(e)); }).join(this.str(this.G.SUBSEP));
  };
  VM.lget = function (lv) {
    if (lv.t === "var") return this.getVar(lv.name);
    if (lv.t === "field") return this.getField(this.eval(lv.e));
    var m = this.array(lv.name), k = this.subKey(lv.subs);
    if (!m.has(k)) m.set(k, UNINIT);
    return m.get(k);
  };
  VM.lset = function (lv, v, fieldIdx, key) {
    if (lv.t === "var") this.setVar(lv.name, v);
    else if (lv.t === "field") this.setField(fieldIdx !== undefined ? fieldIdx : this.eval(lv.e), v);
    else this.array(lv.name).set(key !== undefined ? key : this.subKey(lv.subs), v);
    return v;
  };
  /* Resolve an lvalue's field index or array key once (for x op= y and ++). */
  VM.lref = function (lv) {
    if (lv.t === "field") return { lv: lv, idx: this.eval(lv.e) };
    if (lv.t === "idx") return { lv: lv, key: this.subKey(lv.subs) };
    return { lv: lv };
  };
  VM.refGet = function (r) {
    if (r.lv.t === "var") return this.getVar(r.lv.name);
    if (r.lv.t === "field") return this.getField(r.idx);
    var m = this.array(r.lv.name);
    if (!m.has(r.key)) m.set(r.key, UNINIT);
    return m.get(r.key);
  };
  VM.refSet = function (r, v) { return this.lset(r.lv, v, r.idx, r.key); };
  VM.arith = function (op, x, y) {
    switch (op) {
      case "+": return x + y;
      case "-": return x - y;
      case "*": return x * y;
      case "/": if (y === 0) throw AwkError("division by zero"); return x / y;
      case "%": if (y === 0) throw AwkError("division by zero in %"); return x % y;
      case "^": return Math.pow(x, y);
    }
    return 0;
  };
  VM.eval = function (n) {
    switch (n.t) {
      case "num": return n.v;
      case "str": return n.v;
      case "re": return this.regex(n.src).test(this.rec) ? 1 : 0;
      case "group": return this.eval(n.e);
      case "var": return this.getVar(n.name);
      case "field": return this.getField(this.eval(n.e));
      case "idx": return this.lget(n);
      case "concat": return this.str(this.eval(n.a)) + this.str(this.eval(n.b));
      case "bin": return this.arith(n.op, this.num(this.eval(n.a)), this.num(this.eval(n.b)));
      case "neg": return -this.num(this.eval(n.a));
      case "pos": return this.num(this.eval(n.a));
      case "not": return this.truth(this.eval(n.a)) ? 0 : 1;
      case "and": return this.truth(this.eval(n.a)) && this.truth(this.eval(n.b)) ? 1 : 0;
      case "or": return this.truth(this.eval(n.a)) || this.truth(this.eval(n.b)) ? 1 : 0;
      case "cond": return this.truth(this.eval(n.c)) ? this.eval(n.a) : this.eval(n.b);
      case "cmp": {
        var r = this.compare(this.eval(n.a), this.eval(n.b));
        switch (n.op) { case "<": return r < 0 ? 1 : 0; case "<=": return r <= 0 ? 1 : 0; case ">": return r > 0 ? 1 : 0; case ">=": return r >= 0 ? 1 : 0; case "==": return r === 0 ? 1 : 0; default: return r !== 0 ? 1 : 0; }
      }
      case "match": {
        var s = this.str(this.eval(n.a)), hit = this.regexOf(n.re).test(s);
        return (hit !== n.neg) ? 1 : 0;
      }
      case "in": { var key = this.subKey(n.subs); return this.array(n.name).has(key) ? 1 : 0; }
      case "assign": {
        var ref = this.lref(n.lv);
        var v = this.eval(n.e);
        if (n.op === "=") return this.refSet(ref, v instanceof SN ? new SN(v.s) : v);
        var cur = this.num(this.refGet(ref));
        return this.refSet(ref, this.arith(n.op.charAt(0), cur, this.num(v)));
      }
      case "incdec": {
        var r2 = this.lref(n.lv), old = this.num(this.refGet(r2)), nv = n.op === "++" ? old + 1 : old - 1;
        this.refSet(r2, nv);
        return n.prefix ? nv : old;
      }
      case "call": return this.call(n);
      case "ucall": return this.ucall(n);
      case "grouplist": throw AwkError("syntax error: (list) without in");
    }
    throw AwkError("cannot evaluate " + n.t);
  };
  VM.call = function (n) {
    var a = n.args, self = this;
    function S(i) { return self.str(self.eval(a[i])); }
    function N(i) { return self.num(self.eval(a[i])); }
    switch (n.name) {
      case "length":
        if (!a.length) return this.rec.length;
        if (a[0].t === "var") { var sc = this.scope(a[0].name)[a[0].name]; if (sc && sc.arr) return sc.map.size; }
        return S(0).length;
      case "substr": {
        var s = S(0), m = Math.round(N(1)), len = a.length > 2 ? Math.round(N(2)) : Infinity;
        if (isNaN(m)) m = 1;
        var start = m, end = len === Infinity ? Infinity : m + len;
        if (start < 1) start = 1;
        if (end > s.length + 1) end = s.length + 1;
        return end <= start ? "" : s.slice(start - 1, end - 1);
      }
      case "index": return S(0).indexOf(S(1)) + 1;
      case "split": {
        if (!a[1] || a[1].t !== "var") throw AwkError("split: second argument is not an array");
        var text = S(0), sep = a.length > 2 ? (a[2].t === "re" ? null : S(2)) : this.str(this.G.FS);
        var parts = a.length > 2 && a[2].t === "re" ? (text === "" ? [] : text.split(this.regex(a[2].src))) : this.splitText(text, sep);
        var map = this.array(a[1].name);
        map.clear();
        parts.forEach(function (p, i) { map.set(String(i + 1), new SN(p)); });
        return parts.length;
      }
      case "sub": case "gsub": {
        var re = this.regexOf(a[0], n.name === "gsub" ? "g" : "");
        var repl = S(1), target = a[2] || { t: "field", e: { t: "num", v: 0 } };
        if (!isLvalue(target)) throw AwkError(n.name + ": third argument is not a variable");
        var ref = this.lref(target), str = this.str(this.refGet(ref)), count = 0;
        var res = str.replace(re, function (mt) {
          count++;
          var o = "";
          for (var i = 0; i < repl.length; i++) {
            var ch = repl.charAt(i);
            if (ch === "\\" && (repl.charAt(i + 1) === "&" || repl.charAt(i + 1) === "\\")) { o += repl.charAt(i + 1); i++; }
            else if (ch === "&") o += mt;
            else o += ch;
          }
          return o;
        });
        if (count) this.refSet(ref, res);
        return count;
      }
      case "match": {
        var ms = S(0), mm = this.regexOf(a[1]).exec(ms);
        this.G.RSTART = mm ? mm.index + 1 : 0;
        this.G.RLENGTH = mm ? mm[0].length : -1;
        return this.G.RSTART;
      }
      case "sprintf": {
        if (!a.length) throw AwkError("sprintf: no format");
        var vals = a.slice(1).map(function (e) { return self.eval(e); });
        return formatC(S(0), function (i, cv) {
          var v = vals[i];
          if (cv === "c" && typeof v === "number") return String.fromCharCode(v);
          return v === undefined ? "" : self.str(v);
        }, function (i) { return vals[i] === undefined ? 0 : self.num(vals[i]); }).text;
      }
      case "sin": return Math.sin(N(0));
      case "cos": return Math.cos(N(0));
      case "atan2": return Math.atan2(N(0), N(1));
      case "exp": return Math.exp(N(0));
      case "log": return Math.log(N(0));
      case "sqrt": return Math.sqrt(N(0));
      case "int": return Math.trunc(N(0));
      case "rand": return this.rng();
      case "srand": { var prev = this.seed; this.seed = a.length ? N(0) : Math.floor(Date.now() / 1000); this.rng = mulberry(this.seed | 0); return prev; }
      case "tolower": return S(0).toLowerCase();
      case "toupper": return S(0).toUpperCase();
      case "close": this.closeFile(S(0)); return 0;
      case "fflush": return 0;
      case "system": throw AwkError("system() is not available in the lab's awk");
    }
    throw AwkError("function " + n.name + " is not available");
  };
  VM.ucall = function (n) {
    var f = this.prog.funcs[n.name];
    if (!f) throw AwkError("calling undefined function " + n.name);
    if (this.frames.length > 200) throw AwkError("function call nesting is too deep");
    var frame = Object.create(null), self = this;
    f.params.forEach(function (p, i) {
      var arg = n.args[i];
      if (!arg) { frame[p] = undefined; return; }
      if (arg.t === "var") {
        var holder = self.scope(arg.name)[arg.name];
        if (holder && holder.arr) { frame[p] = holder; return; }
        if (holder === undefined && self.prog.funcs[n.name] && usedAsArray(f.body, p)) { frame[p] = { arr: true, map: new Map() }; self.scope(arg.name)[arg.name] = frame[p]; return; }
      }
      var v = self.eval(arg);
      frame[p] = v instanceof SN ? new SN(v.s) : v;
    });
    this.frames.push(frame);
    try { this.execBlock(f.body); return UNINIT; }
    catch (e) { if (e && e.ret) return e.v; throw e; }
    finally { this.frames.pop(); }
  };
  function usedAsArray(node, name) {
    if (!node || typeof node !== "object") return false;
    if ((node.t === "idx" || node.t === "in" || node.t === "forin" || node.t === "delete") && (node.name === name || node.arr === name)) return true;
    for (var k in node) { var v = node[k]; if (v && typeof v === "object" && usedAsArray(v, name)) return true; }
    return false;
  }
  VM.tickStep = function () {
    if (++this.steps > 2e7) throw AwkError("lab: stopped after 20,000,000 loop iterations (is there an endless loop?)");
  };
  VM.execBlock = function (b) { for (var i = 0; i < b.list.length; i++) this.exec(b.list[i]); };
  VM.emit = function (text, redir) {
    if (!redir) { this.out(text); return; }
    var name = this.str(this.eval(redir.e));
    if (name === "/dev/stdout" || name === "-") { this.out(text); return; }
    if (name === "/dev/stderr") { this.err(text); return; }
    var f = this.files[name];
    if (!f) f = this.files[name] = { chunks: [], append: redir.op === ">>" };
    f.chunks.push(text);
  };
  VM.closeFile = function (name) {
    var f = this.files[name];
    if (!f || !this.vfs) return;
    this.vfs.write(name, f.chunks.join(""), f.append);
    f.chunks = []; f.append = true;
  };
  VM.flushFiles = function () { for (var k in this.files) this.closeFile(k); };
  VM.exec = function (s) {
    switch (s.t) {
      case "block": this.execBlock(s); return;
      case "expr": this.eval(s.e); return;
      case "print": {
        var self = this, text;
        if (!s.args.length) text = this.rec;
        else text = s.args.map(function (e) { return self.outStr(self.eval(e)); }).join(this.str(this.G.OFS));
        this.emit(text + this.str(this.G.ORS), s.redir);
        return;
      }
      case "printf": {
        var me = this, vals = s.args.map(function (e) { return me.eval(e); });
        var fmt = this.str(vals[0]), rest = vals.slice(1);
        this.emit(formatC(fmt, function (i, cv) {
          var v = rest[i];
          if (cv === "c" && typeof v === "number") return String.fromCharCode(v);
          return v === undefined ? "" : me.str(v);
        }, function (i) { return rest[i] === undefined ? 0 : me.num(rest[i]); }).text, s.redir);
        return;
      }
      case "if": if (this.truth(this.eval(s.c))) this.exec(s.a); else if (s.b) this.exec(s.b); return;
      case "while":
        while (this.truth(this.eval(s.c))) {
          this.tickStep();
          try { this.exec(s.body); } catch (e) { if (e === BRK) break; if (e === CONT) continue; throw e; }
        }
        return;
      case "do":
        do {
          this.tickStep();
          try { this.exec(s.body); } catch (e) { if (e === BRK) break; if (e === CONT) continue; throw e; }
        } while (this.truth(this.eval(s.c)));
        return;
      case "for":
        if (s.init) this.exec(s.init);
        while (!s.c || this.truth(this.eval(s.c))) {
          this.tickStep();
          try { this.exec(s.body); } catch (e) { if (e === BRK) break; if (e !== CONT) throw e; }
          if (s.step) this.exec(s.step);
        }
        return;
      case "forin": {
        var keys = Array.from(this.array(s.arr).keys());
        for (var i = 0; i < keys.length; i++) {
          this.tickStep();
          if (!this.array(s.arr).has(keys[i])) continue;
          this.setVar(s.v, NUM_RE.test(keys[i]) ? new SN(keys[i]) : keys[i]);
          try { this.exec(s.body); } catch (e) { if (e === BRK) break; if (e !== CONT) throw e; }
        }
        return;
      }
      case "next": throw NEXT;
      case "nextfile": throw NEXTFILE;
      case "break": throw BRK;
      case "continue": throw CONT;
      case "exit": { var ex = new Error("exit"); ex.exit = true; ex.code = s.e ? this.num(this.eval(s.e)) | 0 : (this.exitCode || 0); throw ex; }
      case "return": { var r = new Error("return"); r.ret = true; r.v = s.e ? this.eval(s.e) : UNINIT; throw r; }
      case "delete":
        if (s.subs) this.array(s.name).delete(this.subKey(s.subs));
        else this.array(s.name).clear();
        return;
    }
    throw AwkError("cannot execute " + s.t);
  };
  VM.matches = function (pat) {
    if (pat.t === "re") return this.regex(pat.src).test(this.rec);
    return this.truth(this.eval(pat));
  };
  /* inputs: [{name, text} | {assign: [name, value]}]; returns the exit status. */
  VM.run = function (inputs) {
    var p = this.prog, self = this, code = 0, exited = false;
    function runBlocks(blocks) { blocks.forEach(function (b) { self.execBlock(b); }); }
    try { runBlocks(p.begin); }
    catch (e) { if (e && e.exit) { exited = true; code = e.code; } else if (e === NEXT) throw AwkError("next used in BEGIN"); else throw e; }
    if (!exited && (p.rules.length || p.end.length)) {
      try {
        for (var k = 0; k < inputs.length; k++) {
          var inp = inputs[k];
          if (inp.assign) { this.G[inp.assign[0]] = NUM_RE.test(inp.assign[1]) ? new SN(inp.assign[1]) : inp.assign[1]; continue; }
          this.G.FILENAME = inp.name === "-" ? "" : inp.name;
          this.G.FNR = 0;
          var text = inp.text, rs = this.str(this.G.RS), recs;
          if (rs === "\n") { recs = text.split("\n"); if (recs[recs.length - 1] === "") recs.pop(); }
          else if (rs === "") recs = text.replace(/^\n+/, "").split(/\n\n+/).filter(function (r) { return r !== ""; }).map(function (r) { return r.replace(/\n+$/, ""); });
          else { recs = text.split(rs.length === 1 ? rs : this.regex(rs)); if (recs[recs.length - 1] === "" || recs[recs.length - 1] === "\n") recs.pop(); }
          fileLoop:
          for (var r = 0; r < recs.length; r++) {
            this.G.NR = this.num(this.G.NR) + 1;
            this.G.FNR = this.num(this.G.FNR) + 1;
            this.setRecord(recs[r]);
            for (var q = 0; q < p.rules.length; q++) {
              var rule = p.rules[q], hit;
              if (rule.pattern2) {
                if (rule.inRange) { hit = true; if (this.matches(rule.pattern2)) rule.inRange = false; }
                else if (this.matches(rule.pattern)) { hit = true; rule.inRange = !this.matches(rule.pattern2); }
                else hit = false;
              } else hit = !rule.pattern || this.matches(rule.pattern);
              if (!hit) continue;
              try {
                if (rule.action) this.execBlock(rule.action);
                else this.out(this.rec + this.str(this.G.ORS));
              } catch (e) {
                if (e === NEXT) continue fileLoop;
                if (e === NEXTFILE) break fileLoop;
                throw e;
              }
            }
          }
        }
      } catch (e) { if (e && e.exit) { code = e.code; this.exitCode = code; } else throw e; }
      try { runBlocks(p.end); }
      catch (e) { if (e && e.exit) code = e.code; else throw e; }
    } else if (exited) {
      this.exitCode = code;
      try { runBlocks(p.end); } catch (e) { if (e && e.exit) code = e.code; else throw e; }
    }
    this.flushFiles();
    return code;
  };
  function compileAwk(src) { return new AwkParser(awkLex(src)).program(); }
  /* Run an awk program on text (used by the awk command and available to widgets via LabCore.awk). */
  function runAwk(src, inputs, opts) {
    opts = opts || {};
    var outBuf = [], errBuf = [];
    var prog = compileAwk(src);
    var vm = new AwkVM(prog, function (s) { outBuf.push(s); }, function (s) { errBuf.push(s); }, opts.vfs || null);
    if (opts.FS != null) vm.G.FS = opts.FS;
    if (opts.vars) for (var k in opts.vars) vm.G[k] = NUM_RE.test(opts.vars[k]) ? new SN(opts.vars[k]) : opts.vars[k];
    if (opts.env) { var envMap = new Map(); for (var e in opts.env) envMap.set(e, new SN(opts.env[e])); vm.G.ENVIRON = { arr: true, map: envMap }; }
    var code = vm.run(inputs);
    return { code: code, out: outBuf.join(""), err: errBuf.join("") };
  }
  def("awk gawk mawk nawk", "awk [-F SEP] [-v VAR=VALUE] 'PROGRAM' [FILE ...]   patterns, fields ($1 … $NF), NR, NF, BEGIN/END, printf, arrays, gsub …", function (c) {
    var a = c.args, i, fsv = null, vars = {}, src = null, ops = [];
    for (i = 0; i < a.length; i++) {
      var x = a[i];
      if (src === null && x === "--") { i++; break; }
      if (src !== null || x.charAt(0) !== "-" || x === "-") break;
      if (x === "-F" || x === "-v" || x === "-f") {
        var v = a[++i];
        if (v === undefined) { c.err("awk: option requires an argument -- " + x.charAt(1) + "\n"); return 2; }
        x = x + v;
      }
      if (x.slice(0, 2) === "-F") { fsv = x.slice(2); fsv = fsv === "t" ? "\t" : awkUnescape(fsv, false); continue; }
      if (x.slice(0, 2) === "-v") {
        var m = /^([A-Za-z_][A-Za-z0-9_]*)=([\s\S]*)$/.exec(x.slice(2));
        if (!m) { c.err("awk: invalid -v argument: " + x.slice(2) + "\n"); return 2; }
        vars[m[1]] = awkUnescape(m[2], false); continue;
      }
      if (x.slice(0, 2) === "-f") {
        var t = c.fs.readText(c.sh.resolve(x.slice(2)));
        if (t == null) { c.err("awk: can't open file " + x.slice(2) + "\n"); return 2; }
        src = t; continue;
      }
      if (x === "--version") { c.out("GNU Awk 5.2.1 (lab subset)\n"); return 0; }
      c.err("awk: unknown option " + x + " ignored\n");
    }
    if (src === null) {
      if (i >= a.length) { c.err("usage: awk [-F fs][-v var=value][prog | -f progfile][file ...]\n"); return 2; }
      src = a[i++];
    }
    ops = a.slice(i);
    var prog;
    try { prog = compileAwk(src); }
    catch (e) {
      if (e && e.awk) { c.err("awk: " + e.message + "\n"); c.note("lab: the lab's awk supports patterns, $N fields, NR, NF, FS/OFS, BEGIN/END, if/while/for, print/printf, arrays, functions and the string functions (length, substr, index, split, sub, gsub, match, sprintf, tolower, toupper). getline and pipes are not available.\n"); return 2; }
      throw e;
    }
    var inputs = [], code = 0, needsInput = prog.rules.length || prog.end.length, anyFile = false;
    for (var k = 0; k < ops.length; k++) {
      var am = /^([A-Za-z_][A-Za-z0-9_]*)=([\s\S]*)$/.exec(ops[k]);
      if (am) { inputs.push({ assign: [am[1], awkUnescape(am[2], false)] }); continue; }
      anyFile = true;
      var f = readInputs(c, [ops[k]])[0];
      if (f.error === "keyboard") { keyboardNote(c); return 2; }
      if (f.error) { c.err("awk: fatal: cannot open file `" + ops[k] + "' for reading: " + f.error + "\n"); code = 2; continue; }
      inputs.push({ name: ops[k], text: textOf(f) });
    }
    if (!anyFile && needsInput) {
      if (!c.stdin) { keyboardNote(c); return 2; }
      inputs.push({ name: "-", text: readStdin(c) });
    }
    var outChunks = [], sh = c.sh;
    var vm = new AwkVM(prog, function (s) { outChunks.push(s); if (outChunks.length > 4096) { c.out(outChunks.join("")); outChunks = []; } }, function (s) { c.err(s); }, {
      write: function (name, text, append) {
        try { sh.fs.write(sh.resolve(name), text, { append: append }); }
        catch (e) { throw AwkError("can't redirect to `" + name + "' (" + (e.fsMessage || e.message) + ")"); }
      }
    });
    if (fsv !== null) vm.G.FS = fsv;
    for (var vn in vars) vm.G[vn] = NUM_RE.test(vars[vn]) ? new SN(vars[vn]) : vars[vn];
    var envMap = new Map();
    for (var en in c.env) envMap.set(en, new SN(c.env[en]));
    vm.G.ENVIRON = { arr: true, map: envMap };
    try { code = Math.max(code, vm.run(inputs)); }
    catch (e) {
      c.out(outChunks.join("")); outChunks = [];
      if (e && e.awk) { c.err("awk: " + e.message + (vm.G.NR ? " (input record " + vm.G.NR + ")" : "") + "\n"); return 2; }
      throw e;
    }
    c.out(outChunks.join(""));
    return code;
  });

  /* ======================================================================
     9. Tables: PLINK's whitespace-aligned output → columns
     parseTable(text, {header: true|false|"auto", names, path, sep, comment})
     → {header, rows, n, numeric, col(name|index), index(name), objects()}
     Numeric columns hold numbers (NA, nan → NaN); other columns hold strings.
     header "auto": files PLINK writes without a header (.fam .bim .prune.in .prune.out .missnp .eigenvec
     .eigenval .irem .nosex) get V1, V2, … like R's fread; otherwise the first line is a header when none of
     its cells is a number (fread's rule).
     sep (a string or RegExp, e.g. /\t/): the line is split on it and every cell is trimmed, as fread's
     strip.white does, so GrafAnc's padded numbers (" 96.52") become numbers; an empty cell counts as NA
     in a numeric column, and an empty first or last field (a leading or trailing tab) is kept.
     ====================================================================== */
  var NA_CELL = { "NA": 1, "nan": 1, "NaN": 1, "-nan": 1, "-NaN": 1, "NAN": 1, "N/A": 1 };
  var HEADERLESS = /\.(fam|bim|prune\.in|prune\.out|missnp|eigenval|irem|nosex|hh|in|out)$/i;
  function cellNumber(s) {
    if (/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(s)) return parseFloat(s);
    if (/^[-+]?inf(?:inity)?$/i.test(s)) return s.charAt(0) === "-" ? -Infinity : Infinity;
    return null;
  }
  function trimCell(x) { return x.replace(/^\s+|\s+$/g, ""); }
  function isNA(x) { return x === undefined || x === "" || NA_CELL[x] === 1; }
  function parseTable(text, opts) {
    opts = opts || {};
    var lines = String(text || "").split(/\r?\n/), rows = [], sep = opts.sep;
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].replace(/^\s+|\s+$/g, "");
      if (!t) continue;
      if (opts.comment && t.indexOf(opts.comment) === 0) continue;
      // With a separator, split the line with only its spaces trimmed (so a leading or trailing tab still
      // marks an empty field), then trim each cell.
      if (sep) rows.push(lines[i].replace(/^ +| +$/g, "").split(sep).map(trimCell));
      else rows.push(t.split(/\s+/));
    }
    var header = opts.header, path = opts.path || "";
    if (header === undefined || header === "auto") {
      if (/\.eigenvec$/i.test(path)) header = !!rows[0] && rows[0][0] === "FID" && rows[0][1] === "IID";
      else if (HEADERLESS.test(path)) header = false;
      else header = rows.length > 0 && rows[0].some(function (x) { return x !== ""; }) &&
        rows[0].every(function (x) { return x === "" || (cellNumber(x) === null && !NA_CELL[x]); });
    }
    var names = header ? rows.shift() : [];
    var ncol = names.length;
    rows.forEach(function (r) { if (r.length > ncol) ncol = r.length; });
    names = names.slice();
    for (var k = names.length; k < ncol; k++) names.push("V" + (k + 1));
    if (opts.names) opts.names.forEach(function (nm, j) { names[j] = nm; });
    var numeric = names.map(function (nm, j) {
      var any = false;
      for (var r = 0; r < rows.length; r++) {
        var x = rows[r][j];
        if (isNA(x)) continue;
        if (cellNumber(x) === null) return false;
        any = true;
      }
      return any || rows.length > 0;
    });
    rows = rows.map(function (r) {
      return names.map(function (nm, j) {
        var x = r[j];
        if (!numeric[j]) return x === undefined ? "" : x;
        if (isNA(x)) return NaN;
        return cellNumber(x);
      });
    });
    function index(name) { return typeof name === "number" ? name : names.indexOf(name); }
    return {
      header: names, rows: rows, n: rows.length, numeric: numeric,
      index: index,
      col: function (name) { var j = index(name); if (j < 0 || j >= names.length) return null; return rows.map(function (r) { return r[j]; }); },
      objects: function () { return rows.map(function (r) { var o = {}; names.forEach(function (nm, j) { o[nm] = r[j]; }); return o; }); }
    };
  }

  /* ======================================================================
     10. Node export: the core above has no DOM and runs in Node for tests
     ====================================================================== */
  var LabCore = {
    version: LAB_VERSION, HOME: HOME, PROJECT: PROJECT, INPUT_DIR: INPUT_DIR, REF_DIR: REF_DIR, ANALYSIS_DIR: ANALYSIS_DIR,
    VFS: VFS, Shell: Shell, seedFS: seedFS, parseTable: parseTable, runAwk: runAwk, compileAwk: compileAwk,
    lex: lex, parseShell: parseShell, isComplete: isComplete, splitCommands: splitCommands, commands: CMDS, help: HELP,
    humanSize: humanSize, gzipStore: gzipStore, gunzipStored: gunzipStored, b64decode: b64decode,
    utf8Encode: utf8Encode, utf8Decode: utf8Decode, formatC: formatC, posixRegex: posixRegex
  };
  if (typeof module !== "undefined" && module.exports) module.exports = LabCore;
  if (typeof document === "undefined" || typeof window === "undefined") return;

  /* ======================================================================
     11. Page part: one file system and one shell per page
     ====================================================================== */
  var doc = G.document;
  var uid = 0;
  function nextId(prefix) { uid++; return prefix + "-" + uid; }

  /* h("div", {class: "x", text: "..."}, child, "text", [children]) */
  function h(tag, attrs) {
    var e = doc.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        var v = attrs[k];
        if (v == null || v === false) continue;
        if (k === "text") e.textContent = v;
        else if (k === "class") e.className = v;
        else if (k.slice(0, 2) === "on" && typeof v === "function") e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? "" : String(v));
      }
    }
    for (var i = 2; i < arguments.length; i++) appendKids(e, arguments[i]);
    return e;
  }
  function appendKids(e, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { for (var i = 0; i < c.length; i++) appendKids(e, c[i]); return; }
    e.appendChild(typeof c === "object" ? c : doc.createTextNode(String(c)));
  }
  function pickEl(el) { return typeof el === "string" ? doc.querySelector(el) : el; }
  function coarsePointer() {
    try { return G.matchMedia && G.matchMedia("(pointer: coarse)").matches; } catch (e) { return false; }
  }
  function copyText(text) {
    function fallback() {
      var ta = h("textarea", { "aria-hidden": "true" });
      ta.value = text;
      ta.style.position = "fixed"; ta.style.top = "0"; ta.style.left = "0"; ta.style.opacity = "0";
      doc.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = doc.execCommand("copy"); } catch (e) { ok = false; }
      ta.remove();
      return ok;
    }
    if (G.navigator && G.navigator.clipboard && G.navigator.clipboard.writeText) {
      return G.navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }
  /* Save bytes or text as a file the reader downloads (Blob URL; works from file://). */
  function downloadData(name, data) {
    var blob = new Blob([data], { type: isBytes(data) ? "application/octet-stream" : "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = h("a", { href: url, download: name });
    a.style.display = "none";
    doc.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 30000);
  }
  /* Expand ~, $VAR and ${VAR} in a path given to Lab.fs or Lab.readTable. */
  function expandPathVars(p, sh) {
    p = String(p == null ? "" : p);
    p = p.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, function (m, a, b) {
      var v = sh ? sh.getVar(a || b) : undefined;
      return v === undefined ? "" : v;
    });
    return p;
  }

  function Page() {
    this.fs = new VFS();
    this.sh = null;
    this.terminals = [];
    this.queue = Promise.resolve();
    this.start = null;
    this.ready = false;
    this.problems = [];
    this.history = [];
  }
  /* All commands of the page run one after another (terminals, Lab.run, setups). */
  Page.prototype.enqueue = function (fn) {
    var p = this.queue.then(function () { return fn(); });
    this.queue = p.then(function () {}, function () {});
    return p;
  };
  /* Run a command line in a session ({cwd, oldpwd}): the shell's variables and files are shared by the
     page, the working directory belongs to the session. opts: {io, source, onStart(prompt)} */
  Page.prototype.execIn = function (session, src, opts) {
    var P = this;
    return P.enqueue(function () { return P.runSession(session, src, opts); });
  };
  /* The body of execIn, for code that already holds the queue (setups). */
  Page.prototype.runSession = function (session, src, opts) {
    var P = this, sh = P.sh;
    opts = opts || {};
    if (!sh.fs.isDir(session.cwd)) session.cwd = P.fs.isDir(PROJECT) ? PROJECT : "/";
    sh.cwd = session.cwd;
    sh.setVar("PWD", session.cwd, true);
    if (session.oldpwd) sh.setVar("OLDPWD", session.oldpwd, true); else sh.unsetVar("OLDPWD");
    if (opts.onStart) opts.onStart(sh.prompt());
    return sh.run(src, opts.io || {}).then(function (res) {
      session.cwd = sh.cwd;
      session.oldpwd = sh.getVar("OLDPWD") || null;
      if (res.outputs.length) P.changed(res.outputs, opts.source || "terminal", src);
      return res;
    });
  };
  Page.prototype.changed = function (paths, source, command) {
    if (!paths || !paths.length) return;
    var detail = { paths: paths.slice(), source: source || "terminal", command: command || null };
    this.terminals.forEach(function (t) { if (t.files) t.files.onChange(detail); });
    try { doc.dispatchEvent(new CustomEvent("lab:fs-change", { detail: detail })); }
    catch (e) { if (G.console) console.error(e); }
  };
  Page.prototype.resolve = function (p) {
    return this.fs.normalize(expandPathVars(p, this.sh), PROJECT);
  };
  /* Restore the files and shell variables of the moment the page finished loading. */
  Page.prototype.reset = function () {
    var P = this;
    return P.enqueue(function () {
      if (!P.start) return [];
      var prev = P.fs.beginChanges();
      P.fs.restore(P.start.fs);
      var paths = P.fs.endChanges(prev);
      var cwd = P.sh.cwd;
      P.sh.restoreState(P.start.shell);
      P.sh.cwd = cwd;
      P.terminals.forEach(function (t) {
        t.session.cwd = t.startCwd; t.session.oldpwd = null;
        t.updatePrompt();
      });
      P.changed(paths, "reset", null);
      return paths;
    });
  };

  var page = new Page();
  var readyResolve;
  var readyPromise = new Promise(function (r) { readyResolve = r; });
  var bootResolve;
  var bootPromise = new Promise(function (r) { bootResolve = r; });

  /* ======================================================================
     12. Terminals: <div class="lab" data-title="…"> with pre.lab-setup and pre.lab-script
     ====================================================================== */
  var OUTPUT_CAP = 400000;      // characters of one command's output shown in the terminal
  var SCROLLBACK_CAP = 1500000; // characters kept in a terminal's scrollback

  function normCmd(s) { return String(s).replace(/\\\r?\n/g, " ").replace(/\s+/g, " ").trim(); }
  /* A command on one line for a chip: continuation lines joined, other line breaks shown as ↵ (or spoken). */
  function flatCmd(s, spoken) {
    return String(s).replace(/[ \t]*\\\r?\n[ \t]*/g, " ").replace(/[ \t]*\r?\n[ \t]*/g, spoken ? " (new line) " : " ↵ ").trim();
  }

  /* Split pasted text into commands to run now and a remainder that stays on the input line. */
  function splitRunnable(text) {
    text = text.replace(/\r\n?/g, "\n");
    var endsNL = /\n$/.test(text);
    var lines = text.split("\n");
    if (endsNL) lines.pop();
    var cmds = [], cur = [];
    for (var i = 0; i < lines.length; i++) {
      cur.push(lines[i]);
      if (i === lines.length - 1 && !endsNL) break;
      var chunk = cur.join("\n");
      if (isComplete(chunk)) { if (chunk.trim()) cmds.push(chunk); cur = []; }
    }
    return { commands: cmds, rest: cur.join("\n") };
  }

  /* ANSI colour codes from ls and grep → spans */
  var ANSI_RE = /\x1b\[([0-9;]*)m/g;
  var ANSI_NAMES = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];
  function ansiFragment(text, baseClass) {
    var frag = doc.createDocumentFragment(), last = 0, cls = "", m;
    ANSI_RE.lastIndex = 0;
    function push(s) {
      if (!s) return;
      var c = (baseClass ? baseClass + " " : "") + cls;
      if (c.trim()) frag.appendChild(h("span", { "class": c.trim() }, s));
      else frag.appendChild(doc.createTextNode(s));
    }
    while ((m = ANSI_RE.exec(text))) {
      push(text.slice(last, m.index));
      last = ANSI_RE.lastIndex;
      var codes = m[1].split(";").filter(Boolean).map(Number), bits = [];
      if (!codes.length || codes.indexOf(0) >= 0) cls = "";
      codes.forEach(function (c) {
        if (c === 1) bits.push("a-bold");
        else if (c >= 30 && c <= 37) bits.push("a-" + ANSI_NAMES[c - 30]);
        else if (c >= 90 && c <= 97) bits.push("a-" + ANSI_NAMES[c - 90]);
      });
      if (bits.length) cls = (cls ? cls + " " : "") + bits.join(" ");
    }
    push(text.slice(last));
    return frag;
  }

  function Terminal(el, P) {
    this.el = el;
    this.page = P;
    this.id = el.id || nextId("lab");
    this.session = { cwd: PROJECT, oldpwd: null };
    this.startCwd = PROJECT;
    this.histPos = -1;
    this.draft = "";
    this.pending = 0;
    this.cmdChars = 0;
    this.chars = 0;
    this.stick = true;
    this.tabExit = false;
    this.tabCount = 0;
    this.suggestions = [];
    this.setupText = "";
    this.build();
  }
  Terminal.prototype.build = function () {
    var T = this, el = T.el, id = T.id;
    var title = el.getAttribute("data-title") || "Terminal";
    var setups = el.querySelectorAll("pre.lab-setup"), scripts = el.querySelectorAll("pre.lab-script");
    T.setupText = Array.prototype.map.call(setups, function (p) { return p.textContent.replace(/\s+$/, ""); }).filter(Boolean).join("\n");
    T.scriptText = Array.prototype.map.call(scripts, function (p) { return p.textContent.replace(/\s+$/, ""); }).filter(Boolean).join("\n");
    Array.prototype.forEach.call(setups, function (p) { p.hidden = true; });
    Array.prototype.forEach.call(scripts, function (p) { p.hidden = true; });
    el.classList.add("lab-on");
    if (!el.id) el.id = id;

    T.titleEl = h("span", { "class": "lab-title", id: id + "-title" }, title);
    T.filesBtn = h("button", { type: "button", "class": "lab-btn", "aria-expanded": "false", "aria-controls": id + "-files", title: "Show the files of this lab's computer" }, "Show files");
    T.resetBtn = h("button", { type: "button", "class": "lab-btn", title: "Put the files and shell variables back as they were when the page loaded" }, "Reset files");
    T.copyBtn = h("button", { type: "button", "class": "lab-btn", title: "Copy everything shown in this terminal" }, "Copy output");
    var bar = h("div", { "class": "lab-bar" },
      h("span", { "class": "lab-dots", "aria-hidden": "true" }, h("i"), h("i"), h("i")),
      T.titleEl,
      h("span", { "class": "lab-tools" }, T.filesBtn, T.resetBtn, T.copyBtn));

    T.out = h("div", { "class": "lab-out", role: "log", "aria-live": "polite", "aria-labelledby": id + "-title", tabindex: "0" });
    T.ps1 = h("label", { "class": "lab-ps1", "for": id + "-in" });
    T.input = h("textarea", { "class": "lab-in", id: id + "-in", rows: "1", spellcheck: "false", autocapitalize: "off",
      autocomplete: "off", autocorrect: "off", enterkeyhint: "send", "aria-label": "Command line. Enter runs the command; Tab completes names; up and down arrows recall earlier commands." });
    T.runBtn = h("button", { type: "button", "class": "lab-run", "aria-label": "Run the command on the command line" }, "Run");
    T.status = h("span", { "class": "lab-status", role: "status" });
    T.line = h("div", { "class": "lab-line" }, T.ps1, T.input, T.runBtn);
    T.screen = h("div", { "class": "lab-screen" }, T.out, T.line, T.status);

    var kids = [bar];
    if (T.setupText) {
      T.setupSummary = h("summary", null, "Setup: commands from earlier steps are running…");
      T.setupLog = h("pre", { "class": "lab-setup-log" });
      T.setupNote = h("details", { "class": "lab-setup-note" }, T.setupSummary, T.setupLog);
      kids.push(T.setupNote);
    }
    kids.push(T.screen);
    if (T.scriptText) kids.push(T.buildSuggestions(T.scriptText));
    T.files = new FilePanel(T);
    kids.push(T.files.el);

    // Keep the author's pre blocks (hidden) in place; put the terminal after them.
    T.box = h("div", { "class": "lab-box" }, kids);
    el.appendChild(T.box);

    T.updatePrompt();
    T.welcome();
    T.wire();
  };
  Terminal.prototype.welcome = function () {
    var probs = this.page.problems;
    this.write("Lab terminal: PLINK 1.9 emulator and a small Unix shell, running in your browser on the toy data.\nType help for the commands; files are kept until you reload the page.\n", "note");
    if (probs.indexOf("toy-data") >= 0) this.write("lab: the toy data (assets/js/lab/toy-data.js) did not load, so the data folders are empty.\n", "err");
    if (!G.PlinkCore) this.write("lab: the PLINK emulator (assets/js/lab/plink-core.js) did not load, so plink commands will not run.\n", "err");
  };
  Terminal.prototype.wire = function () {
    var T = this, ta = T.input;
    ta.addEventListener("keydown", function (e) { T.onKey(e); });
    ta.addEventListener("input", function () { T.autosize(); T.tabCount = 0; });
    ta.addEventListener("paste", function (e) { T.onPaste(e); });
    T.runBtn.addEventListener("click", function () { T.submit(); if (!coarsePointer()) ta.focus(); });
    T.copyBtn.addEventListener("click", function () {
      copyText(T.out.textContent).then(function (ok) {
        T.flash(T.copyBtn, ok ? "Copied" : "Copy failed", "Copy output");
      });
    });
    T.resetBtn.addEventListener("click", function () {
      T.page.reset().then(function (paths) {
        T.write("lab: the files and shell variables are back to how they were when the page loaded (" + plural(paths.length, "path") + " restored).\n", "note");
        T.flash(T.resetBtn, "Files reset", "Reset files");
      });
    });
    T.filesBtn.addEventListener("click", function () { T.files.toggle(); });
    T.out.addEventListener("scroll", function () {
      var o = T.out;
      T.stick = o.scrollHeight - o.scrollTop - o.clientHeight < 24;
    });
    // A click in the output (not a text selection) puts the cursor on the command line.
    T.out.addEventListener("mouseup", function () {
      var sel = G.getSelection && G.getSelection();
      if (sel && String(sel).length) return;
      if (!coarsePointer()) ta.focus({ preventScroll: true });
    });
  };
  Terminal.prototype.flash = function (btn, text, back) {
    btn.textContent = text;
    clearTimeout(btn._labT);
    btn._labT = setTimeout(function () { btn.textContent = back; }, 1600);
  };
  Terminal.prototype.autosize = function () {
    var ta = this.input;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 400) + "px";
  };
  Terminal.prototype.updatePrompt = function () {
    var cwd = this.session.cwd, pretty = cwd === HOME ? "~" : cwd.indexOf(HOME + "/") === 0 ? "~" + cwd.slice(HOME.length) : cwd;
    this.ps1.textContent = "";
    this.ps1.appendChild(h("span", { "class": "p" }, h("span", { "class": "u" }, USER + "@" + HOST), ":", h("span", { "class": "d" }, pretty), "$"));
  };
  Terminal.prototype.promptFragment = function (prompt) {
    var m = /^([^:]+):(.*)\$$/.exec(prompt || "");
    if (!m) return h("span", { "class": "lab-ps1" }, prompt);
    return h("span", { "class": "lab-ps1" }, h("span", { "class": "u" }, m[1]), ":", h("span", { "class": "d" }, m[2]), "$");
  };
  /* The number of characters that fit on one line of the output (for ls columns). */
  Terminal.prototype.columns = function () {
    var o = this.out, w = o.clientWidth;
    if (!w) return 80;
    if (!this.charW) {
      var probe = h("span", { "aria-hidden": "true" }, "MMMMMMMMMM");
      probe.style.visibility = "hidden"; probe.style.position = "absolute";
      o.appendChild(probe);
      this.charW = probe.getBoundingClientRect().width / 10 || 7.8;
      probe.remove();
    }
    var cs = G.getComputedStyle(o), padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
    return Math.max(20, Math.floor((w - padL - padR) / this.charW) - 1);
  };

  /* ---- output ---- */
  Terminal.prototype.write = function (text, kind) {
    if (!text) return;
    text = String(text);
    if (kind !== "note" && kind !== "echo") {
      if (this.cmdChars > OUTPUT_CAP) return;
      this.cmdChars += text.length;
      if (this.cmdChars > OUTPUT_CAP) {
        var keep = Math.max(0, text.length - (this.cmdChars - OUTPUT_CAP));
        var cut = text.lastIndexOf("\n", keep);
        text = text.slice(0, cut < 0 ? keep : cut + 1);
        this.writeNode(this.renderChunk(text, kind));
        this.writeNode(this.renderChunk("lab: the rest of this output is not shown in the terminal (more than " + Math.round(OUTPUT_CAP / 1000) + " kB). Use head, tail or grep, or redirect it to a file (> file.txt) and open that in the file panel.\n", "note"));
        this.lastKind = "note";
        return;
      }
    }
    this.writeNode(this.renderChunk(text, kind));
    this.lastKind = kind;
  };
  Terminal.prototype.renderChunk = function (text, kind) {
    if (kind === "err") {
      // Warnings are yellow, errors red; a line continuing the previous standard-error line (PLINK
      // wraps long warnings over several lines) keeps that line's colour.
      var cls = /^warning/i.test(text) ? "lab-warn" : /^error/i.test(text) ? "lab-err" :
        (this.lastKind === "err" && this.errClass) || "lab-err";
      this.errClass = cls;
      return ansiFragment(text, cls);
    }
    if (kind === "note") return ansiFragment(text, "lab-note");
    if (/(^|\n)(Error|Warning)[: ]/.test(text)) {
      var frag = doc.createDocumentFragment();
      text.split(/(?=\n)/).forEach(function (seg) {
        var body = seg.replace(/^\n/, ""), nl = seg.charAt(0) === "\n" ? "\n" : "";
        if (nl) frag.appendChild(doc.createTextNode(nl));
        if (/^Error[: ]/.test(body)) frag.appendChild(ansiFragment(body, "lab-err"));
        else if (/^Warning[: ]/.test(body)) frag.appendChild(ansiFragment(body, "lab-warn"));
        else frag.appendChild(ansiFragment(body, ""));
      });
      return frag;
    }
    if (text.indexOf("\x1b[") >= 0) return ansiFragment(text, "");
    return doc.createTextNode(text);
  };
  Terminal.prototype.writeNode = function (node) {
    var o = this.out;
    var len = node.textContent.length;
    o.appendChild(node);
    this.chars += len;
    if (this.chars > SCROLLBACK_CAP) {
      while (o.firstChild && this.chars > SCROLLBACK_CAP * 0.8) {
        this.chars -= (o.firstChild.textContent || "").length;
        o.removeChild(o.firstChild);
      }
    }
    if (this.stick) o.scrollTop = o.scrollHeight;
  };
  Terminal.prototype.echo = function (prompt, src) {
    var frag = doc.createDocumentFragment();
    frag.appendChild(this.promptFragment(prompt));
    var lines = String(src).split("\n");
    frag.appendChild(h("span", { "class": "lab-cmd" }, " " + lines[0] + "\n"));
    for (var i = 1; i < lines.length; i++) frag.appendChild(h("span", { "class": "lab-cmd" }, "> " + lines[i] + "\n"));
    this.stick = true;
    this.lastKind = "echo";
    this.writeNode(frag);
  };
  Terminal.prototype.clear = function () {
    this.out.textContent = "";
    this.chars = 0;
  };
  Terminal.prototype.setBusy = function (text) {
    this.line.classList.toggle("busy", !!text);
    this.status.textContent = text || "";
    if (text) this.ps1.setAttribute("data-busy", text); else this.ps1.removeAttribute("data-busy");
  };

  /* ---- running commands ---- */
  Terminal.prototype.io = function () {
    var T = this;
    return {
      out: function (text, kind) { T.write(text, kind); },
      isTTY: true,
      columns: T.columns(),
      interactive: true,
      beforeLong: function (name) {
        T.setBusy("running " + name + "…");
        return new Promise(function (r) { setTimeout(r, 30); });
      },
      afterLong: function () {},
      clear: function () { T.clear(); }
    };
  };
  Terminal.prototype.run = function (src, opts) {
    var T = this, P = T.page;
    opts = opts || {};
    src = String(src).replace(/\r\n?/g, "\n");
    if (!opts.noHistory && src.trim()) {
      var hist = P.history;
      if (hist[hist.length - 1] !== src) hist.push(src);
      if (hist.length > 500) hist.splice(0, hist.length - 500);
    }
    T.histPos = -1;
    T.pending++;
    T.el.classList.add("lab-busy");
    return P.execIn(T.session, src, {
      io: T.io(),
      source: "terminal",
      onStart: function (prompt) { T.cmdChars = 0; T.echo(prompt, src); }
    }).then(function (res) {
      T.markDone(src);
      return res;
    }, function (e) {
      T.write("lab: " + (e && e.message || e) + "\n", "err");
      if (G.console) console.error(e);
      return { code: 1, stdout: "", stderr: String(e), outputs: [] };
    }).then(function (res) {
      T.pending--;
      if (!T.pending) { T.el.classList.remove("lab-busy"); T.setBusy(""); }
      T.updatePrompt();
      return res;
    });
  };
  Terminal.prototype.submit = function () {
    var T = this, ta = T.input, v = ta.value.replace(/\r\n?/g, "\n");
    if (v.trim() && !isComplete(v)) {
      // Unfinished command (open quote, trailing \, if without fi): continue on a new line like bash's "> ".
      ta.value = v + "\n";
      ta.selectionStart = ta.selectionEnd = ta.value.length;
      T.autosize();
      return;
    }
    ta.value = "";
    T.autosize();
    T.draft = "";
    if (!v.trim()) {
      // An empty line prints a new prompt, as in a real terminal.
      T.page.enqueue(function () { T.echo(promptFor(T.session.cwd), ""); });
      return;
    }
    T.run(v);
  };
  function promptFor(cwd) {
    var pretty = cwd === HOME ? "~" : cwd.indexOf(HOME + "/") === 0 ? "~" + cwd.slice(HOME.length) : cwd;
    return USER + "@" + HOST + ":" + pretty + "$";
  }
  Terminal.prototype.interrupt = function () {
    var T = this, ta = T.input;
    if (T.pending) {
      T.page.sh.abort();
      T.write("^C\n", "echo");
      return;
    }
    T.echo(promptFor(T.session.cwd), ta.value + "^C");
    ta.value = "";
    T.autosize();
    T.histPos = -1;
  };
  Terminal.prototype.onKey = function (e) {
    var T = this, ta = T.input;
    if (e.isComposing) return;
    var key = e.key;
    if (key === "Enter" && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) { e.preventDefault(); T.submit(); return; }
    if (key === "Tab" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      if (T.tabExit || !ta.value.trim()) { T.tabExit = false; return; }   // leave the terminal with Tab
      e.preventDefault();
      T.complete();
      return;
    }
    if (key === "Escape") { T.tabExit = true; return; }
    T.tabExit = false;
    if (e.ctrlKey && !e.metaKey && !e.altKey) {
      var k = key.toLowerCase();
      if (k === "l") { e.preventDefault(); T.clear(); return; }
      if (k === "c" && ta.selectionStart === ta.selectionEnd) { e.preventDefault(); T.interrupt(); return; }
      if (k === "u") { e.preventDefault(); ta.value = ta.value.slice(ta.selectionStart); ta.selectionStart = ta.selectionEnd = 0; T.autosize(); return; }
    }
    if (key === "ArrowUp" && !e.shiftKey && !e.altKey && !e.metaKey) {
      if (ta.value.slice(0, ta.selectionStart).indexOf("\n") >= 0) return;
      e.preventDefault(); T.recall(-1); return;
    }
    if (key === "ArrowDown" && !e.shiftKey && !e.altKey && !e.metaKey) {
      if (ta.value.slice(ta.selectionEnd).indexOf("\n") >= 0) return;
      e.preventDefault(); T.recall(1); return;
    }
  };
  Terminal.prototype.recall = function (dir) {
    var T = this, hist = T.page.history, ta = T.input;
    if (!hist.length) return;
    if (T.histPos === -1) {
      if (dir > 0) return;
      T.draft = ta.value;
      T.histPos = hist.length - 1;
    } else {
      T.histPos += dir;
      if (T.histPos < 0) T.histPos = 0;
      if (T.histPos >= hist.length) { T.histPos = -1; ta.value = T.draft; T.autosize(); ta.selectionStart = ta.selectionEnd = ta.value.length; return; }
    }
    ta.value = hist[T.histPos];
    T.autosize();
    ta.selectionStart = ta.selectionEnd = ta.value.length;
  };
  Terminal.prototype.onPaste = function (e) {
    var T = this, ta = T.input;
    var text = e.clipboardData ? e.clipboardData.getData("text/plain") : "";
    if (!text || text.indexOf("\n") < 0) return;
    e.preventDefault();
    var full = ta.value.slice(0, ta.selectionStart) + text + ta.value.slice(ta.selectionEnd);
    T.paste(full);
  };
  /* Run every finished line of a multi-line paste in order; an unfinished last line stays on the input line. */
  Terminal.prototype.paste = function (full) {
    var T = this, ta = T.input;
    var parts = splitRunnable(full);
    ta.value = parts.rest;
    T.autosize();
    ta.selectionStart = ta.selectionEnd = ta.value.length;
    var p = Promise.resolve();
    parts.commands.forEach(function (c) { p = T.run(c); });
    return p;
  };

  /* ---- Tab completion ---- */
  Terminal.prototype.complete = function () {
    var T = this, ta = T.input, sh = T.page.sh;
    var v = ta.value, pos = ta.selectionStart;
    var before = v.slice(0, pos), after = v.slice(pos);
    var word = /[^\s;|&()<>]*$/.exec(before)[0];
    var prefix = before.slice(0, before.length - word.length);
    var isCmd = /(^|[;|&({]|\b(?:then|do|else|elif|if|while|until|time)\s)\s*$/.test(prefix) || /(^|\n)\s*$/.test(prefix);
    var cands = [], base, insertCands;
    if (isCmd && word.indexOf("/") < 0 && word.charAt(0) !== "$" && word.charAt(0) !== "~") {
      base = word;
      var names = Object.keys(CMDS).filter(function (n) { return /^[a-z][\w.-]*$/i.test(n) && n.indexOf(word) === 0; });
      ["if", "for", "while", "export", "cd"].forEach(function (k) { if (k.indexOf(word) === 0 && names.indexOf(k) < 0) names.push(k); });
      cands = names.sort().map(function (n) { return { name: n, dir: false }; });
    } else {
      var raw = word.replace(/^['"]/, "");
      var slash = raw.lastIndexOf("/");
      var dirPart = slash >= 0 ? raw.slice(0, slash + 1) : "";
      base = (slash >= 0 ? raw.slice(slash + 1) : raw).replace(/\\(.)/g, "$1");
      var dirExpanded = expandPathVars(dirPart, sh);
      if (dirExpanded === "~" || dirExpanded.slice(0, 2) === "~/") dirExpanded = HOME + dirExpanded.slice(1);
      if (/^\$\{?[A-Za-z_]\w*$/.test(raw)) {
        // complete a variable name: $ana → $analysis_dir
        var vb = raw.replace(/^\$\{?/, "");
        var brace = raw.charAt(1) === "{";
        Object.keys(sh.vars).sort().forEach(function (k) {
          if (k.indexOf(vb) === 0) cands.push({ name: k, dir: false, varName: true });
        });
        base = vb;
        insertCands = function (c) { return c.name + (brace ? "}" : ""); };
      } else {
        var absDir = sh.fs.normalize(dirExpanded || ".", T.session.cwd);
        var list = [];
        try { list = sh.fs.list(absDir); } catch (err) { list = []; }
        list.forEach(function (n) {
          if (n.indexOf(base) !== 0) return;
          if (n.charAt(0) === "." && base.charAt(0) !== ".") return;
          cands.push({ name: n, dir: sh.fs.isDir((absDir === "/" ? "" : absDir) + "/" + n) });
        });
      }
    }
    if (!cands.length) { T.tabCount = 0; return; }
    var esc = function (s) { return s.replace(/([\s'"\\$`&;|<>()*?!#])/g, "\\$1"); };
    if (cands.length === 1) {
      var c = cands[0];
      var add = insertCands ? insertCands(c) : esc(c.name) + (c.dir ? "/" : (word.charAt(0) === '"' || word.charAt(0) === "'" ? word.charAt(0) + " " : " "));
      var rest = insertCands ? add.slice(base.length) : add.slice(esc(base).length);
      T.insertAt(before + rest, after);
      T.tabCount = 0;
      return;
    }
    var lcp = cands[0].name;
    cands.forEach(function (x) { while (x.name.indexOf(lcp) !== 0) lcp = lcp.slice(0, -1); });
    if (lcp.length > base.length) {
      T.insertAt(before + (insertCands ? lcp.slice(base.length) : esc(lcp).slice(esc(base).length)), after);
      T.tabCount = 0;
      return;
    }
    // Several matches and nothing more in common: list them (bash does this on the second Tab).
    var shown = cands.map(function (x) { return x.name + (x.dir ? "/" : ""); });
    T.echo(promptFor(T.session.cwd), v);
    T.write(columnize(shown, shown, T.columns()), "out");
  };
  Terminal.prototype.insertAt = function (before, after) {
    var ta = this.input;
    ta.value = before + after;
    ta.selectionStart = ta.selectionEnd = before.length;
    this.autosize();
  };

  /* ---- suggested commands ---- */
  Terminal.prototype.buildSuggestions = function (text) {
    var T = this;
    var cmds = splitCommands(text).filter(function (c) { return c.trim() && !/^\s*#/.test(c); });
    T.suggestions = cmds.map(function (c, i) { return { cmd: c, norm: normCmd(c), done: false, i: i }; });
    var list = h("ol", { "class": "lab-chips" });
    T.suggestions.forEach(function (s, i) {
      var flat = flatCmd(s.cmd);
      s.btn = h("button", { type: "button", "class": "lab-chip", title: s.cmd, "aria-label": "Put command " + (i + 1) + " on the command line: " + flatCmd(s.cmd, true) },
        h("span", { "class": "n", "aria-hidden": "true" }, String(i + 1)), h("code", null, flat));
      s.btn.addEventListener("click", function () {
        T.input.value = s.cmd;
        T.autosize();
        T.input.selectionStart = T.input.selectionEnd = s.cmd.length;
        if (!coarsePointer()) T.input.focus({ preventScroll: true });
        T.histPos = -1;
      });
      list.appendChild(h("li", null, s.btn));
    });
    T.nextBtn = h("button", { type: "button", "class": "btn primary lab-next" }, "Run next");
    T.progress = h("span", { "class": "lab-progress", "aria-live": "polite" });
    T.nextBtn.addEventListener("click", function () { T.runNext(); });
    T.suggestEl = h("div", { "class": "lab-suggest" },
      h("div", { "class": "lab-suggest-head" }, h("span", { "class": "lab-suggest-title" }, "Suggested commands"), T.progress, T.nextBtn),
      list);
    T.updateProgress();
    return T.suggestEl;
  };
  Terminal.prototype.nextSuggestion = function () {
    for (var i = 0; i < this.suggestions.length; i++) if (!this.suggestions[i].done && !this.suggestions[i].queued) return this.suggestions[i];
    return null;
  };
  Terminal.prototype.runNext = function () {
    var s = this.nextSuggestion();
    if (!s) return Promise.resolve(null);
    s.queued = true;
    this.updateProgress();
    var self = this;
    return this.run(s.cmd).then(function (res) { s.queued = false; s.done = true; self.updateProgress(); return res; });
  };
  Terminal.prototype.markDone = function (src) {
    var n = normCmd(src), changed = false;
    this.suggestions.forEach(function (s) { if (!s.done && s.norm === n) { s.done = true; changed = true; } });
    if (changed) this.updateProgress();
  };
  Terminal.prototype.updateProgress = function () {
    if (!this.suggestions.length || !this.nextBtn) return;
    var done = 0;
    this.suggestions.forEach(function (s) {
      if (s.done) done++;
      s.btn.classList.toggle("done", s.done);
    });
    var total = this.suggestions.length, next = this.nextSuggestion();
    this.progress.textContent = done + " of " + total + " run";
    this.nextBtn.disabled = !next;
    this.nextBtn.textContent = next ? "Run next (" + (next.i + 1) + ")" : "All run";
    this.nextBtn.setAttribute("aria-label", next ? "Run suggested command " + (next.i + 1) + ": " + flatCmd(next.cmd, true) : "All suggested commands have run");
  };

  /* ---- setup: pre.lab-setup runs silently when the lab mounts ---- */
  Terminal.prototype.runSetup = function () {
    var T = this, P = T.page;
    if (!T.setupText) return Promise.resolve();
    var cmds = splitCommands(T.setupText).filter(function (c) { return c.trim() && !/^\s*#/.test(c); });
    var log = [], failed = null;
    return P.enqueue(function () {
      var i = 0;
      function step() {
        if (i >= cmds.length || failed) return null;
        var c = cmds[i++], buf = "";
        return P.runSession(T.session, c, { io: { out: function (t) { buf += t; }, isTTY: false, columns: 100 }, source: "setup" }).then(function (res) {
          log.push({ cmd: c, out: buf, code: res.code });
          if (res.code !== 0 && !/\|\|\s*true\s*$/.test(c)) failed = { cmd: c, out: buf, code: res.code };
          return step();
        });
      }
      return step();
    }).then(function () {
      T.startCwd = T.session.cwd;
      T.updatePrompt();
      T.setupLog.textContent = "";
      log.forEach(function (x, k) {
        T.setupLog.appendChild(h("span", { "class": "lab-cmd" }, "$ " + x.cmd + "\n"));
        if (failed && k === log.length - 1) T.setupLog.appendChild(doc.createTextNode(x.out));
      });
      T.setupSummary.textContent = failed ? "Setup failed: a command from an earlier step did not run (details)" :
        "Setup: " + plural(cmds.length, "command") + " from earlier steps already ran on these files";
      if (failed) {
        T.setupNote.classList.add("failed");
        if (G.console) console.error("lab: setup command failed in #" + T.el.id + " (exit " + failed.code + "): " + failed.cmd + "\n" + failed.out);
      }
    });
  };

  /* ======================================================================
     13. File panel: a tree of the lab's files, a viewer and downloads
     ====================================================================== */
  var VIEW_LINES = 300;          // lines of a text file shown in the viewer
  var GENO_NAMES = ["homozygous A1", "missing", "heterozygous", "homozygous A2"];
  var GENO_CODES = ["00", "01", "10", "11"];

  function FilePanel(T) {
    this.term = T;
    this.page = T.page;
    this.open = false;
    this.expanded = Object.create(null);
    this.collapsed = Object.create(null);
    this.fresh = Object.create(null);
    this.selected = null;
    var id = T.id + "-files";
    this.tree = h("ul", { "class": "lab-tree", "aria-label": "Files" });
    this.viewer = h("div", { "class": "lab-view", hidden: true, "aria-live": "polite" });
    this.el = h("div", { "class": "lab-files", id: id, hidden: true },
      h("div", { "class": "lab-files-tree" },
        h("div", { "class": "lab-files-head" }, "Files on the lab computer ", h("span", { "class": "muted" }, "(click a file to look inside)")),
        this.tree),
      this.viewer);
    var self = this;
    var initial = T.el.getAttribute("data-files");
    if (initial) {
      setTimeout(function () {
        bootPromise.then(function () {
          if (initial === "open") self.show(true);
          else { self.show(true); readyPromise.then(function () { self.view(self.page.resolve(initial)); }); }
        });
      }, 0);
    }
    this.tree.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button[data-path]") : null;
      if (!b) return;
      var p = b.getAttribute("data-path");
      if (b.getAttribute("data-dir")) {
        if (self.isOpen(p)) { self.collapsed[p] = true; delete self.expanded[p]; }
        else { self.expanded[p] = true; delete self.collapsed[p]; }
        self.render();
        var again = self.tree.querySelector('button[data-path="' + cssEscape(p) + '"]');
        if (again) again.focus();
      } else self.view(p);
    });
  }
  // A path as text pieces with a line-break opportunity after each "/", so a long path wraps between folders.
  function breakablePath(p) {
    var parts = String(p).split("/"), out = [];
    parts.forEach(function (part, i) {
      out.push(i < parts.length - 1 ? part + "/" : part);
      if (i < parts.length - 1) out.push(h("wbr"));
    });
    return out;
  }
  function cssEscape(s) { return String(s).replace(/["\\]/g, "\\$&"); }
  FilePanel.prototype.toggle = function () { this.show(!this.open); };
  FilePanel.prototype.show = function (on) {
    this.open = on;
    this.el.hidden = !on;
    this.term.filesBtn.setAttribute("aria-expanded", on ? "true" : "false");
    this.term.filesBtn.textContent = on ? "Hide files" : "Show files";
    if (on) this.render();
  };
  /* Directories are open unless the reader closed them; cloned repositories start closed. */
  FilePanel.prototype.isOpen = function (p) {
    if (this.collapsed[p]) return false;
    if (this.expanded[p]) return true;
    if (p.indexOf(ANALYSIS_DIR + "/") === 0) return false;
    return true;
  };
  FilePanel.prototype.onChange = function (detail) {
    var now = Date.now(), self = this;
    detail.paths.forEach(function (p) { self.fresh[p] = now; });
    if (this.open) this.render();
    if (this.selected && detail.paths.indexOf(this.selected) >= 0) this.view(this.selected, true);
  };
  FilePanel.prototype.render = function () {
    var fs = this.page.fs, self = this, now = Date.now();
    var ul = this.tree;
    ul.textContent = "";
    var roots = [{ path: HOME, label: "~  (" + HOME + ")" }];
    try { if (fs.isDir("/tmp") && fs.list("/tmp").length) roots.push({ path: "/tmp", label: "/tmp" }); } catch (e) { /* no /tmp */ }
    function row(path, name, depth, isDir) {
      var size = fs.size(path);
      var open = isDir && self.isOpen(path);
      var fresh = self.fresh[path] && now - self.fresh[path] < 4000;
      var btn = h("button", { type: "button", "class": "lab-node" + (isDir ? " dir" : " file") + (path === self.selected ? " sel" : ""),
        "data-path": path, "data-dir": isDir ? "1" : null, "aria-expanded": isDir ? (open ? "true" : "false") : null,
        "aria-current": path === self.selected ? "true" : null,
        title: path },
        h("span", { "class": "tw", "aria-hidden": "true" }, isDir ? (open ? "▾" : "▸") : ""),
        h("span", { "class": "nm" }, name + (isDir && depth > 0 ? "/" : "")),
        h("span", { "class": "sz" }, humanSize(size)));
      btn.style.paddingLeft = (6 + depth * 14) + "px";
      ul.appendChild(h("li", { "class": fresh ? "lab-fresh" : null }, btn));
      if (isDir && open) {
        var kids = [];
        try { kids = fs.list(path); } catch (e) { kids = []; }
        kids.filter(function (k) { return k.charAt(0) !== "."; }).forEach(function (k) {
          var cp = (path === "/" ? "" : path) + "/" + k;
          row(cp, k, depth + 1, fs.isDir(cp));
        });
      }
    }
    roots.forEach(function (r) {
      if (!fs.isDir(r.path)) return;
      row(r.path, r.label, 0, true);
    });
  };

  /* ---- viewer ---- */
  FilePanel.prototype.view = function (abs, refresh) {
    var fs = this.page.fs, v = this.viewer, self = this;
    if (!this.open) this.show(true);
    this.selected = abs;
    if (!refresh) this.render();
    v.hidden = false;
    this.el.classList.add("with-view");
    v.textContent = "";
    var node = fs.lookup(abs);
    var closeBtn = h("button", { type: "button", "class": "lab-btn light", "aria-label": "Close the file viewer" }, "Close");
    closeBtn.addEventListener("click", function () {
      self.selected = null; v.hidden = true; v.textContent = ""; self.el.classList.remove("with-view"); self.render();
      var row = self.tree.querySelector('button[data-path="' + cssEscape(abs) + '"]');
      if (row) row.focus();
    });
    if (!node || node.type !== "f") {
      v.appendChild(h("div", { "class": "lab-view-head" }, h("code", { "class": "path" }, breakablePath(abs)), closeBtn));
      v.appendChild(h("p", { "class": "lab-view-note" }, "This file no longer exists (it was removed or the files were reset)."));
      return;
    }
    var data = node.data, size = fs.fileSize(node), name = basename(abs);
    var dl = h("button", { type: "button", "class": "lab-btn light" }, "Download");
    dl.addEventListener("click", function () { downloadData(name, fs.read(abs)); });
    v.appendChild(h("div", { "class": "lab-view-head" },
      h("code", { "class": "path" }, breakablePath(abs.indexOf(HOME + "/") === 0 ? "~" + abs.slice(HOME.length) : abs)),
      h("span", { "class": "muted" }, size.toLocaleString("en-US") + " bytes"),
      h("span", { "class": "lab-view-tools" }, dl, closeBtn)));
    if (/\.bed$/i.test(abs) && isBytes(data)) v.appendChild(bedView(fs, abs, data));
    else if (isBytes(data) && !looksText(data)) v.appendChild(binaryView(abs, data));
    else v.appendChild(textView(isBytes(data) ? utf8Decode(data) : data));
  };
  function looksText(bytes) {
    var n = Math.min(bytes.length, 4096);
    for (var i = 0; i < n; i++) { var b = bytes[i]; if (b === 0 || (b < 9) || (b > 13 && b < 32 && b !== 27)) return false; }
    return true;
  }
  function textView(text) {
    var lines = text.split("\n");
    if (lines[lines.length - 1] === "") lines.pop();
    var shown = lines.slice(0, VIEW_LINES);
    var box = h("div", null);
    box.appendChild(h("pre", { "class": "lab-view-text", tabindex: "0", "aria-label": "File contents" }, shown.join("\n") + (shown.length ? "\n" : "")));
    if (!lines.length) box.appendChild(h("p", { "class": "lab-view-note" }, "The file is empty."));
    else if (lines.length > VIEW_LINES) box.appendChild(h("p", { "class": "lab-view-note" }, "Showing the first " + VIEW_LINES + " of " + lines.length.toLocaleString("en-US") + " lines. Download the file to see all of it, or use head, tail and grep in the terminal."));
    else box.appendChild(h("p", { "class": "lab-view-note" }, plural(lines.length, "line") + "."));
    return box;
  }
  function hexDump(bytes, n) {
    var out = [], len = Math.min(bytes.length, n);
    for (var off = 0; off < len; off += 16) {
      var hx = [], asc = "";
      for (var i = off; i < off + 16; i++) {
        if (i < len) { hx.push(hex2(bytes[i])); asc += bytes[i] >= 32 && bytes[i] < 127 ? String.fromCharCode(bytes[i]) : "."; }
        else hx.push("  ");
      }
      out.push(pad(off.toString(16), 8).replace(/ /g, "0") + "  " + hx.slice(0, 8).join(" ") + "  " + hx.slice(8).join(" ") + "  " + asc);
    }
    return out.join("\n") + "\n";
  }
  function binaryView(abs, bytes) {
    var box = h("div", null);
    var gz = bytes[0] === 0x1f && bytes[1] === 0x8b;
    box.appendChild(h("p", { "class": "lab-view-note" }, gz ? "A gzip-compressed file (it starts with the bytes 1f 8b). Decompress it with gunzip to read it. The first bytes:" :
      "A binary file: its bytes are not text. The first bytes in hexadecimal:"));
    box.appendChild(h("pre", { "class": "lab-view-text", tabindex: "0" }, hexDump(bytes, 128)));
    return box;
  }
  function byteBits(b) { var s = b.toString(2); while (s.length < 8) s = "0" + s; return s; }
  /* A .bed file explained: magic number, mode byte and the first variant's genotypes decoded. */
  function bedView(fs, abs, bytes) {
    var box = h("div", { "class": "lab-bed" });
    var prefix = abs.replace(/\.bed$/i, "");
    var famT = fs.readText(prefix + ".fam"), bimT = fs.readText(prefix + ".bim");
    var fam = famT ? famT.split("\n").filter(function (l) { return l.trim(); }) : null;
    var bim = bimT ? bimT.split("\n").filter(function (l) { return l.trim(); }) : null;
    var n = fam ? fam.length : null, m = bim ? bim.length : null;
    var magic = bytes.length >= 3 && bytes[0] === 0x6c && bytes[1] === 0x1b;
    box.appendChild(h("p", { "class": "lab-view-note" }, "PLINK's binary genotype file. The bytes are not text; here is what they mean."));
    var dl = h("dl", { "class": "lab-bed-dl" });
    dl.appendChild(h("dt", null, h("code", null, bytes.length >= 3 ? hex2(bytes[0]) + " " + hex2(bytes[1]) + " " + hex2(bytes[2]) : "?")));
    dl.appendChild(h("dd", null, magic && bytes[2] === 1 ?
      "The three magic numbers that start every PLINK 1 .bed file. 6c 1b say \u201cthis is a .bed file\u201d; 01 says variant-major (SNP-major) order: after these 3 bytes, each variant's genotypes for all people are stored together, one variant after another." :
      magic ? "6c 1b mark a .bed file; the third byte should be 01 (variant-major), the only order PLINK 1.9 writes." :
      "A .bed file should start with the bytes 6c 1b 01; this one does not."));
    box.appendChild(dl);
    if (n == null || m == null) {
      box.appendChild(h("p", { "class": "lab-view-note" }, "To decode genotypes the viewer needs the matching " + basename(prefix) + ".fam and .bim files (for the number of people and the alleles), and they are not next to this file."));
      box.appendChild(h("pre", { "class": "lab-view-text", tabindex: "0" }, hexDump(bytes, 64)));
      return box;
    }
    var bpv = Math.ceil(n / 4), expected = 3 + m * bpv;
    box.appendChild(h("p", null, "Size check: " + n.toLocaleString("en-US") + " people → " + bpv.toLocaleString("en-US") +
      " bytes per variant (4 people per byte, rounded up). 3 + " + m.toLocaleString("en-US") + " variants × " + bpv + " = " +
      expected.toLocaleString("en-US") + " bytes; the file has " + bytes.length.toLocaleString("en-US") + (expected === bytes.length ? " ✓" : " ✗ (they should match)")));
    var snp = bim[0].trim().split(/\s+/);
    var a1 = snp[4] || "A1", a2 = snp[5] || "A2";
    box.appendChild(h("p", null, "The first variant, ", h("code", null, snp[1] || "?"), " (chromosome " + (snp[0] || "?") + ", position " + (snp[3] || "?") +
      "; A1 = " + a1 + ", A2 = " + a2 + " from the .bim), is stored in bytes 4–" + (3 + bpv) + ". Each byte holds 4 people as 2-bit codes, read from the right (lowest bits first):"));
    // First two bytes drawn as bit pairs
    var bytesTable = h("table", { "class": "lab-bits" });
    var hrow = h("tr", null, h("th", { scope: "col" }, "Byte"), h("th", { scope: "col" }, "Hex"), h("th", { scope: "col" }, "Bits (people 4·3·2·1 of the byte)"));
    bytesTable.appendChild(h("thead", null, hrow));
    var tb = h("tbody");
    for (var b = 0; b < Math.min(2, bpv); b++) {
      var val = bytes[3 + b], bits = byteBits(val);
      var pairs = h("span", { "class": "pairs" });
      for (var q = 0; q < 4; q++) {
        var who = b * 4 + (3 - q) + 1;
        if (who > n) { pairs.appendChild(h("span", { "class": "pair pad", title: "padding" }, bits.slice(q * 2, q * 2 + 2))); continue; }
        pairs.appendChild(h("span", { "class": "pair g" + parseInt(bits.slice(q * 2, q * 2 + 2), 2), title: "person " + who }, bits.slice(q * 2, q * 2 + 2), h("sub", null, String(who))));
      }
      tb.appendChild(h("tr", null, h("td", null, String(4 + b)), h("td", null, h("code", null, hex2(val))), h("td", null, pairs)));
    }
    bytesTable.appendChild(tb);
    box.appendChild(h("div", { "class": "lab-table-wrap" }, bytesTable));
    // People decoded
    var show = Math.min(n, 8);
    var t = h("table", { "class": "lab-geno" });
    t.appendChild(h("thead", null, h("tr", null, h("th", { scope: "col" }, "Person (FID IID)"), h("th", { scope: "col" }, "Code"), h("th", { scope: "col" }, "Meaning"), h("th", { scope: "col" }, "Genotype"))));
    var body = h("tbody");
    for (var i = 0; i < show; i++) {
      var byte = bytes[3 + (i >> 2)], code = (byte >> ((i & 3) * 2)) & 3;
      var f = fam[i].trim().split(/\s+/);
      var gt = code === 0 ? a1 + "/" + a1 : code === 2 ? a1 + "/" + a2 : code === 3 ? a2 + "/" + a2 : "—";
      body.appendChild(h("tr", null, h("td", null, h("code", null, (f[0] || "") + " " + (f[1] || ""))), h("td", null, h("code", { "class": "g" + code }, GENO_CODES[code])), h("td", null, GENO_NAMES[code]), h("td", null, gt)));
    }
    t.appendChild(body);
    box.appendChild(h("div", { "class": "lab-table-wrap" }, t));
    box.appendChild(h("p", { "class": "lab-view-note" }, "Codes: 00 = homozygous for A1, 01 = missing, 10 = heterozygous, 11 = homozygous for A2." +
      (n > show ? " Showing " + show + " of " + n.toLocaleString("en-US") + " people." : "")));
    box.appendChild(h("details", { "class": "lab-hex" }, h("summary", null, "The first 64 bytes in hexadecimal"), h("pre", { "class": "lab-view-text", tabindex: "0" }, hexDump(bytes, 64))));
    return box;
  }

  /* ======================================================================
     14. Charts: Lab.plot.histogram / scatter / qq / bar (SVG, sized to their box)
     Every chart draws at the pixel width of its container (so text stays ≥ 10 px on a phone),
     redraws when the container is resized, and returns a handle {update, destroy, svg, …}.
     ====================================================================== */
  var SVG_NS = "http://www.w3.org/2000/svg";
  function sv(tag, attrs, text) {
    var e = doc.createElementNS(SVG_NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  var SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
  function pow10Label(k) { return "10" + String(k).split("").map(function (c) { return SUP[c] || c; }).join(""); }
  function ticks(lo, hi, count) {
    if (!(hi > lo)) return [lo];
    var raw = (hi - lo) / Math.max(1, count), mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), r = raw / mag;
    var step = (r > 5 ? 10 : r > 2 ? 5 : r > 1 ? 2 : 1) * mag;
    var out = [], start = Math.ceil(lo / step - 1e-9) * step;
    for (var v = start; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    out.step = step;
    return out;
  }
  function fmtTick(v, step) {
    if (v === 0) return "0";
    var a = Math.abs(v);
    if (a >= 1e6 || (a < 1e-4)) return v.toExponential(Math.max(0, Math.min(3, -Math.floor(Math.log(step) / Math.LN10) + Math.floor(Math.log(a) / Math.LN10)))).replace("e+", "e");
    var d = Math.max(0, Math.ceil(-Math.log(step) / Math.LN10 - 1e-9));
    var s = v.toFixed(Math.min(d, 10));
    if (a >= 1000 && d === 0) s = Math.round(v).toLocaleString("en-US");
    return s.replace("-", "−");
  }
  function fmtNum(v) {
    if (v == null || isNaN(v)) return "NA";
    if (!isFinite(v)) return v > 0 ? "∞" : "−∞";
    var a = Math.abs(v);
    if (a !== 0 && (a < 1e-3 || a >= 1e6)) return v.toExponential(2).replace("e+", "e").replace("-", "−");
    var s = a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toPrecision(3);
    if (s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
    return s.replace("-", "−");
  }
  function groupColor(i) { return "var(--q" + ((i % 8) + 1) + ")"; }

  /* The frame shared by all charts: container, SVG sized to the box, controls, legend, tooltip. */
  function Chart(el, opts, kind) {
    el = pickEl(el);
    if (!el) throw new Error("Lab.plot." + kind + ": the element was not found");
    this.el = el; this.opts = opts || {}; this.kind = kind;
    el.textContent = "";
    el.classList.add("lab-plot", "lab-plot-" + kind);
    this.legendEl = h("div", { "class": "lab-legend" });
    this.svgBox = h("div", { "class": "lab-plot-svg" });
    this.tip = h("div", { "class": "lab-tip", role: "status", hidden: true });
    this.controls = h("div", { "class": "lab-plot-controls" });
    this.noteEl = h("p", { "class": "lab-plot-note" });
    el.appendChild(this.legendEl);
    el.appendChild(this.svgBox);
    this.svgBox.appendChild(this.tip);
    el.appendChild(this.controls);
    el.appendChild(this.noteEl);
    var self = this, lastW = this.svgBox.clientWidth;
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(function () {
        var w = self.svgBox.clientWidth;
        if (w && Math.abs(w - lastW) > 2) { lastW = w; self.draw(); }
      });
      this.ro.observe(this.svgBox);
    } else {
      this.onResize = function () { self.draw(); };
      G.addEventListener("resize", this.onResize);
    }
  }
  Chart.prototype.size = function (defH) {
    var w = Math.max(240, Math.floor(this.svgBox.clientWidth || this.el.clientWidth || 600));
    var hgt = this.opts.height || defH;
    if (typeof hgt === "function") hgt = hgt(w);
    return { w: w, h: Math.round(hgt) };
  };
  Chart.prototype.newSvg = function (w, hh, label) {
    var old = this.svg;
    var svg = sv("svg", { width: w, height: hh, viewBox: "0 0 " + w + " " + hh, role: "img", "aria-label": label, focusable: "false" });
    if (old && old.parentNode) old.parentNode.replaceChild(svg, old); else this.svgBox.insertBefore(svg, this.tip);
    this.svg = svg;
    return svg;
  };
  Chart.prototype.margins = function (w) {
    var m = { l: 56, r: 14, t: 12, b: 44 };
    if (this.opts.title) m.t = 30;
    if (w < 420) { m.l = 50; m.r = 10; }
    return m;
  };
  Chart.prototype.destroy = function () {
    if (this.ro) this.ro.disconnect();
    if (this.onResize) G.removeEventListener("resize", this.onResize);
    this.el.textContent = "";
  };
  function setText(el, text) { el.textContent = text || ""; el.hidden = !text; }
  /* Axes: x ticks along the bottom, y ticks on the left, light grid lines, axis titles. */
  function drawAxes(svg, o) {
    var g = sv("g", { "class": "lp-axes" });
    var m = o.m, W = o.w, H = o.h;
    o.yt.forEach(function (v) {
      var y = o.sy(v);
      g.appendChild(sv("line", { "class": "lp-grid", x1: m.l, x2: W - m.r, y1: y, y2: y }));
      g.appendChild(sv("text", { x: m.l - 6, y: y + 3.5, "text-anchor": "end" }, o.yfmt(v)));
    });
    o.xt.forEach(function (v) {
      var x = o.sx(v);
      if (o.xgrid) g.appendChild(sv("line", { "class": "lp-grid", x1: x, x2: x, y1: m.t, y2: H - m.b }));
      g.appendChild(sv("line", { "class": "lp-tick", x1: x, x2: x, y1: H - m.b, y2: H - m.b + 4 }));
      g.appendChild(sv("text", { x: x, y: H - m.b + 16, "text-anchor": "middle" }, o.xfmt(v)));
    });
    g.appendChild(sv("line", { "class": "lp-base", x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }));
    if (o.yzero !== false) g.appendChild(sv("line", { "class": "lp-base", x1: m.l, x2: m.l, y1: m.t, y2: H - m.b }));
    if (o.xLabel) g.appendChild(sv("text", { "class": "lp-title", x: m.l + (W - m.l - m.r) / 2, y: H - 8, "text-anchor": "middle" }, o.xLabel));
    if (o.yLabel) g.appendChild(sv("text", { "class": "lp-title", transform: "translate(13," + (m.t + (H - m.t - m.b) / 2) + ") rotate(-90)", "text-anchor": "middle" }, o.yLabel));
    if (o.title) g.appendChild(sv("text", { "class": "lp-title lp-head", x: m.l, y: 16 }, o.title));
    svg.appendChild(g);
  }
  function clipRect(svg, id, m, W, H) {
    var defs = sv("defs"), cp = sv("clipPath", { id: id });
    cp.appendChild(sv("rect", { x: m.l, y: m.t - 1, width: Math.max(0, W - m.l - m.r), height: Math.max(0, H - m.t - m.b + 2) }));
    defs.appendChild(cp);
    svg.appendChild(defs);
    return "url(#" + id + ")";
  }
  /* Static reference lines: {x} vertical, {y} horizontal, {slope, intercept} or {identity: true}. */
  function drawRefLines(svg, lines, o, clip) {
    (lines || []).forEach(function (r) {
      var m = o.m, W = o.w, H = o.h, x1, x2, y1, y2;
      if (r.x != null) { var xv = o.tx ? o.tx(r.x) : r.x; x1 = x2 = o.sx(xv); y1 = m.t; y2 = H - m.b; }
      else if (r.y != null) { var yv = o.ty ? o.ty(r.y) : r.y; y1 = y2 = o.sy(yv); x1 = m.l; x2 = W - m.r; }
      else {
        var s = r.identity ? 1 : (r.slope || 0), b = r.identity ? 0 : (r.intercept || 0);
        var d = o.xd; x1 = o.sx(d[0]); x2 = o.sx(d[1]); y1 = o.sy(s * d[0] + b); y2 = o.sy(s * d[1] + b);
      }
      if (![x1, x2, y1, y2].every(isFinite)) return;
      if ((r.x != null && (x1 < m.l - 0.5 || x1 > W - m.r + 0.5)) || (r.y != null && (y1 < m.t - 0.5 || y1 > H - m.b + 0.5))) return;
      var ln = sv("line", { "class": "lp-ref", x1: x1, x2: x2, y1: y1, y2: y2, "clip-path": clip });
      if (r.color) ln.style.stroke = r.color;
      if (r.dash === false) ln.style.strokeDasharray = "none";
      svg.appendChild(ln);
      if (r.label) {
        var lx = r.x != null ? Math.min(x1 + 4, W - m.r - 4) : W - m.r - 4, ly = r.x != null ? m.t + 11 : y1 - 4;
        var t = sv("text", { "class": "lp-ref-label", x: lx, y: ly, "text-anchor": r.x != null ? (x1 > W - m.r - 80 ? "end" : "start") : "end" }, r.label);
        if (r.x != null && x1 > W - m.r - 80) t.setAttribute("x", x1 - 4);
        svg.appendChild(t);
      }
    });
  }
  function finiteValues(values, key) {
    var out = [], missing = 0;
    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (key != null && v != null && typeof v === "object") v = v[key];
      v = typeof v === "string" ? (v === "" ? NaN : Number(v)) : v;
      if (typeof v === "number" && isFinite(v)) out.push(v); else missing++;
    }
    return { values: out, missing: missing };
  }

  /* ---------------- histogram ---------------- */
  function Histogram(el, values, opts) {
    Chart.call(this, el, opts, "histogram");
    this.setData(values);
    this.buildControls();
    this.draw();
  }
  Histogram.prototype = Object.create(Chart.prototype);
  Histogram.prototype.setData = function (values) {
    var o = this.opts, f = finiteValues(values || [], o.key);
    this.raw = f.values; this.missing = f.missing;
    this.logX = o.logX || o.log === true || o.log === "x" || o.log === "xy";
    this.logY = o.logY || o.log === "y" || o.log === "xy";
    var vals = this.raw, dropped = 0;
    if (this.logX) {
      vals = []; for (var i = 0; i < this.raw.length; i++) { if (this.raw[i] > 0) vals.push(Math.log(this.raw[i]) / Math.LN10); else dropped++; }
    }
    this.t = vals; this.dropped = dropped;
    var lo = Infinity, hi = -Infinity;
    vals.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; });
    var dom = o.domain ? (this.logX ? o.domain.map(function (d) { return Math.log(d) / Math.LN10; }) : o.domain.slice()) : null;
    if (dom) { lo = dom[0]; hi = dom[1]; }
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    if (hi === lo) { var pad0 = lo === 0 ? 0.5 : Math.abs(lo) * 0.05; lo -= pad0; hi += pad0; }
    var nb = Math.max(1, Math.round(o.bins || 30));
    if (o.binWidth) nb = Math.max(1, Math.ceil((hi - lo) / o.binWidth - 1e-9));
    var bw = o.binWidth || (hi - lo) / nb;
    if (o.binWidth) hi = lo + nb * bw;
    var counts = new Array(nb), outside = 0;
    for (var b = 0; b < nb; b++) counts[b] = 0;
    vals.forEach(function (v) {
      if (v < lo || v > hi) { outside++; return; }
      var k = Math.floor((v - lo) / bw);
      if (k >= nb) k = nb - 1;
      counts[k]++;
    });
    this.lo = lo; this.hi = hi; this.bw = bw; this.counts = counts; this.outside = outside;
    var thr = o.threshold;
    if (thr != null && typeof thr !== "object") thr = { value: thr };
    this.thr = thr ? Object.assign({ direction: "above" }, thr) : null;
    if (this.thr && this.thrValue == null) this.thrValue = this.thr.value != null ? this.thr.value : (this.logX ? Math.pow(10, (lo + hi) / 2) : (lo + hi) / 2);
  };
  Histogram.prototype.countBeyond = function (v) {
    var above = this.thr.direction !== "below", n = 0, raw = this.raw;
    for (var i = 0; i < raw.length; i++) if (above ? raw[i] > v : raw[i] < v) n++;
    return n;
  };
  Histogram.prototype.buildControls = function () {
    var self = this, o = this.opts;
    this.controls.textContent = "";
    if (!this.thr) return;
    var t = this.thr, logX = this.logX;
    var lo = t.min != null ? (logX ? Math.log(t.min) / Math.LN10 : t.min) : this.lo;
    var hi = t.max != null ? (logX ? Math.log(t.max) / Math.LN10 : t.max) : this.hi;
    var step = t.step != null ? t.step : (hi - lo) / 200;
    var id = nextId("lab-thr");
    this.slider = h("input", { type: "range", id: id, min: lo, max: hi, step: step, value: logX ? Math.log(this.thrValue) / Math.LN10 : this.thrValue });
    this.thrOut = h("output", { "for": id, "class": "lab-thr-val" });
    this.readout = h("div", { "class": "readout lab-plot-readout", "aria-live": "polite" });
    this.slider.addEventListener("input", function () {
      var v = parseFloat(self.slider.value);
      self.setThreshold(logX ? Math.pow(10, v) : v, true);
    });
    this.controls.appendChild(h("label", { "for": id, "class": "lab-thr-label" }, (t.label || "Threshold") + " ", this.thrOut));
    this.controls.appendChild(this.slider);
    this.controls.appendChild(this.readout);
  };
  Histogram.prototype.setThreshold = function (v, fromSlider) {
    if (!this.thr || !isFinite(v)) return;
    var t = this.thr;
    if (t.min != null) v = Math.max(t.min, v);
    if (t.max != null) v = Math.min(t.max, v);
    if (t.step && !this.logX) v = Math.round((v - (t.min || 0)) / t.step) * t.step + (t.min || 0);
    v = parseFloat(v.toPrecision(6));
    this.thrValue = v;
    if (!fromSlider && this.slider) this.slider.value = this.logX ? Math.log(v) / Math.LN10 : v;
    this.drawThreshold();
    this.updateReadout();
    if (typeof this.opts.onThreshold === "function") {
      var n = this.countBeyond(v);
      this.opts.onThreshold(v, { count: n, total: this.raw.length, fraction: this.raw.length ? n / this.raw.length : 0 });
    }
  };
  Histogram.prototype.updateReadout = function () {
    if (!this.thr || !this.readout) return;
    var t = this.thr, v = this.thrValue, n = this.countBeyond(v), N = this.raw.length;
    var fmt = t.format || fmtNum;
    this.thrOut.textContent = fmt(v);
    var unit = this.opts.unit || "values";
    var what = (this.opts.xLabel || "value") + " " + (t.direction === "below" ? "<" : ">") + " " + fmt(v);
    this.readout.textContent = what + ": " + n.toLocaleString("en-US") + " of " + N.toLocaleString("en-US") + " " + unit +
      (N ? " (" + (100 * n / N).toFixed(1) + "%)" : "") + (t.verb ? " " + t.verb : "");
    if (this.svg) this.svg.setAttribute("aria-label", this.ariaLabel());
  };
  Histogram.prototype.ariaLabel = function () {
    var o = this.opts;
    if (o.ariaLabel) return o.ariaLabel;
    var s = "Histogram of " + (o.xLabel || "values") + ": " + this.raw.length + " values in " + this.counts.length + " bins" + (this.logX ? " on a log scale" : "") + ".";
    if (this.thr) s += " Threshold " + fmtNum(this.thrValue) + ": " + this.countBeyond(this.thrValue) + " values " + (this.thr.direction === "below" ? "below" : "above") + ".";
    return s;
  };
  Histogram.prototype.draw = function () {
    var o = this.opts, self = this;
    var sz = this.size(o.height || function (w) { return w < 420 ? 220 : 260; });
    var W = sz.w, H = sz.h, m = this.margins(W);
    var svg = this.newSvg(W, H, this.ariaLabel());
    var counts = this.counts, maxC = Math.max.apply(null, counts.concat([1]));
    var logY = this.logY;
    var yTop = logY ? Math.log(maxC + 1) / Math.LN10 : maxC;
    var yt = logY ? [] : ticks(0, maxC, Math.max(2, Math.round((H - m.t - m.b) / 45)));
    if (logY) { for (var k = 0; Math.pow(10, k) <= maxC * 1.0001; k++) yt.push(Math.log(Math.pow(10, k) + 1) / Math.LN10); if (!yt.length) yt.push(0); }
    if (!logY && yt[yt.length - 1] < maxC) yt.push(yt[yt.length - 1] + (yt.step || 1));
    if (!logY) yTop = Math.max(yTop, yt[yt.length - 1]);
    var sx = function (v) { return m.l + (v - self.lo) / (self.hi - self.lo) * (W - m.l - m.r); };
    var sy = function (c) { return H - m.b - c / (yTop || 1) * (H - m.t - m.b); };
    this.sx = sx; this.m = m; this.W = W; this.H = H;
    var xt;
    if (this.logX) {
      xt = [];
      for (var e = Math.ceil(this.lo - 1e-9); e <= this.hi + 1e-9; e++) xt.push(e);
      var every = Math.max(1, Math.ceil(xt.length / Math.max(2, Math.floor((W - m.l - m.r) / 46))));
      xt = xt.filter(function (v) { return v % every === 0; });
    } else xt = ticks(this.lo, this.hi, Math.max(2, Math.floor((W - m.l - m.r) / 70)));
    drawAxes(svg, { m: m, w: W, h: H, sx: sx, sy: sy, xt: xt, yt: yt,
      xfmt: this.logX ? function (v) { return pow10Label(Math.round(v)); } : function (v) { return fmtTick(v, xt.step || 1); },
      yfmt: logY ? function (v) { return fmtTick(Math.round(Math.pow(10, v) - 1), 1); } : function (v) { return fmtTick(v, yt.step || 1); },
      xLabel: o.xLabel, yLabel: o.yLabel || (logY ? "Count (log scale)" : "Count"), title: o.title });
    var bars = sv("g", { "class": "lp-bars" });
    var bw = (W - m.l - m.r) / counts.length;
    for (var b = 0; b < counts.length; b++) {
      if (!counts[b]) continue;
      var c = logY ? Math.log(counts[b] + 1) / Math.LN10 : counts[b];
      var x = m.l + b * bw, y = sy(c);
      var r = sv("rect", { "class": "lp-bar", x: x + (bw > 3 ? 0.5 : 0), y: y, width: Math.max(0.5, bw - (bw > 3 ? 1 : 0)), height: Math.max(0, H - m.b - y), "data-bin": b });
      var x0 = this.lo + b * this.bw, x1 = x0 + this.bw;
      r.appendChild(sv("title", null, (this.logX ? fmtNum(Math.pow(10, x0)) + " to " + fmtNum(Math.pow(10, x1)) : fmtNum(x0) + " to " + fmtNum(x1)) + ": " + counts[b]));
      bars.appendChild(r);
    }
    svg.appendChild(bars);
    this.hiLayer = sv("g", { "class": "lp-bars-hi" });
    svg.appendChild(this.hiLayer);
    var clip = clipRect(svg, nextId("lab-clip"), m, W, H);
    drawRefLines(svg, o.lines, { m: m, w: W, h: H, sx: sx, sy: sy, tx: this.logX ? function (v) { return Math.log(v) / Math.LN10; } : null }, clip);
    this.thrLayer = sv("g", { "class": "lp-thr" });
    svg.appendChild(this.thrLayer);
    var notes = [];
    if (this.missing) notes.push(this.missing + " missing (NA) " + (this.missing === 1 ? "value" : "values") + " not shown.");
    if (this.dropped) notes.push(this.dropped + (this.dropped === 1 ? " value" : " values") + " ≤ 0 not shown on the log scale.");
    if (this.outside) notes.push(this.outside + (this.outside === 1 ? " value lies" : " values lie") + " outside the plotted range.");
    if (o.note) notes.push(o.note);
    setText(this.noteEl, notes.join(" "));
    if (this.thr) {
      this.drawThreshold();
      this.updateReadout();
      this.wireDrag(svg);
    }
  };
  Histogram.prototype.drawThreshold = function () {
    if (!this.thrLayer) return;
    var L = this.thrLayer, hi = this.hiLayer, m = this.m, W = this.W, H = this.H;
    L.textContent = ""; hi.textContent = "";
    var tv = this.logX ? Math.log(this.thrValue) / Math.LN10 : this.thrValue;
    var x = this.sx(tv), above = this.thr.direction !== "below";
    var xc = Math.max(m.l, Math.min(W - m.r, x));
    // bars beyond the threshold, cut at the line
    var bars = this.svg.querySelectorAll(".lp-bars rect");
    Array.prototype.forEach.call(bars, function (r) {
      var bx = +r.getAttribute("x"), bwid = +r.getAttribute("width");
      var x0 = above ? Math.max(bx, xc) : bx, x1 = above ? bx + bwid : Math.min(bx + bwid, xc);
      if (x1 - x0 <= 0.01) return;
      hi.appendChild(sv("rect", { "class": "lp-bar-hi", x: x0, y: r.getAttribute("y"), width: x1 - x0, height: r.getAttribute("height") }));
    });
    if (x < m.l - 0.5 || x > W - m.r + 0.5) return;
    L.appendChild(sv("line", { x1: x, x2: x, y1: m.t - 2, y2: H - m.b }));
    L.appendChild(sv("circle", { cx: x, cy: m.t + 4, r: 6 }));
  };
  Histogram.prototype.wireDrag = function (svg) {
    var self = this, dragging = false;
    svg.classList.add("lp-drag");
    function setFromEvent(e) {
      var rect = svg.getBoundingClientRect();
      var px = e.clientX - rect.left;
      var v = self.lo + (px - self.m.l) / (self.W - self.m.l - self.m.r) * (self.hi - self.lo);
      v = Math.max(self.lo, Math.min(self.hi, v));
      self.setThreshold(self.logX ? Math.pow(10, v) : v, false);
    }
    svg.addEventListener("pointerdown", function (e) {
      if (e.button != null && e.button !== 0) return;
      var rect = svg.getBoundingClientRect(), py = e.clientY - rect.top;
      if (py > self.H - self.m.b + 2) return;
      dragging = true;
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
      setFromEvent(e);
    });
    svg.addEventListener("pointermove", function (e) { if (dragging) setFromEvent(e); });
    function end() { dragging = false; }
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);
  };
  Histogram.prototype.update = function (values, opts) {
    if (opts) Object.assign(this.opts, opts);
    if (opts && opts.threshold != null) this.thrValue = null;
    this.setData(values != null ? values : this.raw);
    this.buildControls();
    this.draw();
    return this;
  };
  Histogram.prototype.getThreshold = function () { return this.thrValue; };

  /* ---------------- scatter ---------------- */
  function normPoints(points, o) {
    var out = [];
    (points || []).forEach(function (p, i) {
      var q;
      if (Array.isArray(p)) q = { x: p[0], y: p[1], group: p[2], label: p[3] };
      else q = { x: p[o.xKey || "x"], y: p[o.yKey || "y"], group: p[o.groupKey || "group"], label: p[o.labelKey || "label"], data: p };
      q.x = +q.x; q.y = +q.y; q.i = i;
      if (q.group == null || q.group === "") q.group = o.defaultGroup || "";
      q.group = String(q.group);
      out.push(q);
    });
    return out;
  }
  function Scatter(el, points, opts) {
    Chart.call(this, el, opts, "scatter");
    this.hidden = Object.create(null);
    this.setData(points);
    this.wireHover();
    this.draw();
  }
  Scatter.prototype = Object.create(Chart.prototype);
  Scatter.prototype.setData = function (points) {
    var o = this.opts;
    var all = normPoints(points, o);
    this.points = all.filter(function (p) { return isFinite(p.x) && isFinite(p.y); });
    this.missing = all.length - this.points.length;
    var groups = (o.groups || []).map(String), seen = Object.create(null);
    groups.forEach(function (g) { seen[g] = true; });
    this.points.forEach(function (p) { if (!seen[p.group]) { seen[p.group] = true; groups.push(p.group); } });
    this.groups = groups;
    var colors = o.colors || {};
    this.colorOf = Object.create(null);
    var self = this;
    groups.forEach(function (g, i) { self.colorOf[g] = colors[g] || groupColor(i); });
    this.buildLegend();
  };
  Scatter.prototype.buildLegend = function () {
    var L = this.legendEl, self = this, o = this.opts;
    L.textContent = "";
    var show = o.legend != null ? o.legend : this.groups.length > 1 || (this.groups.length === 1 && this.groups[0] !== "");
    if (!show) return;
    var counts = Object.create(null);
    this.points.forEach(function (p) { counts[p.group] = (counts[p.group] || 0) + 1; });
    if (o.legendTitle) L.appendChild(h("span", { "class": "lab-legend-title" }, o.legendTitle));
    this.groups.forEach(function (g) {
      var b = h("button", { type: "button", "class": "lab-key", "aria-pressed": self.hidden[g] ? "false" : "true", title: "Show or hide " + (g || "(none)") },
        h("span", { "class": "sw", "aria-hidden": "true" }), (g || "(none)") + " ", h("span", { "class": "muted" }, "(" + (counts[g] || 0) + ")"));
      b.querySelector(".sw").style.background = self.colorOf[g];
      b.addEventListener("click", function () {
        if (self.hidden[g]) delete self.hidden[g]; else self.hidden[g] = true;
        b.setAttribute("aria-pressed", self.hidden[g] ? "false" : "true");
        self.draw();
      });
      L.appendChild(b);
    });
  };
  Scatter.prototype.domains = function () {
    var o = this.opts, pts = this.points;
    var xl = Infinity, xh = -Infinity, yl = Infinity, yh = -Infinity;
    pts.forEach(function (p) { if (p.x < xl) xl = p.x; if (p.x > xh) xh = p.x; if (p.y < yl) yl = p.y; if (p.y > yh) yh = p.y; });
    (o.refLines || []).forEach(function (r) {
      if (r.x != null && r.extend !== false) { xl = Math.min(xl, r.x); xh = Math.max(xh, r.x); }
      if (r.y != null && r.extend !== false) { yl = Math.min(yl, r.y); yh = Math.max(yh, r.y); }
    });
    if (!isFinite(xl)) { xl = 0; xh = 1; yl = 0; yh = 1; }
    function padR(a, b) { var d = b - a; if (d === 0) d = Math.abs(a) || 1; return [a - d * 0.05, b + d * 0.05]; }
    var xd = o.xDomain ? o.xDomain.slice() : padR(xl, xh), yd = o.yDomain ? o.yDomain.slice() : padR(yl, yh);
    return { x: xd, y: yd };
  };
  Scatter.prototype.draw = function () {
    var o = this.opts, self = this;
    var sz = this.size(o.height || function (w) { return o.equal ? Math.min(w, w < 420 ? 340 : 420) : (w < 420 ? 280 : 340); });
    var W = sz.w, H = sz.h, m = this.margins(W);
    var d = this.domains(), xd = d.x, yd = d.y;
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    if (o.equal) {
      // the same number of pixels per unit on both axes (PCA plots)
      var k = Math.min(pw / (xd[1] - xd[0]), ph / (yd[1] - yd[0]));
      var cx = (xd[0] + xd[1]) / 2, cy = (yd[0] + yd[1]) / 2;
      xd = [cx - pw / k / 2, cx + pw / k / 2]; yd = [cy - ph / k / 2, cy + ph / k / 2];
    }
    var sx = function (v) { return m.l + (v - xd[0]) / (xd[1] - xd[0]) * pw; };
    var sy = function (v) { return H - m.b - (v - yd[0]) / (yd[1] - yd[0]) * ph; };
    this.sx = sx; this.sy = sy; this.m = m; this.W = W; this.H = H;
    var svg = this.newSvg(W, H, this.ariaLabel());
    var xt = ticks(xd[0], xd[1], Math.max(2, Math.floor(pw / 70))), yt = ticks(yd[0], yd[1], Math.max(2, Math.floor(ph / 45)));
    drawAxes(svg, { m: m, w: W, h: H, sx: sx, sy: sy, xt: xt, yt: yt, xgrid: true, yzero: true,
      xfmt: function (v) { return fmtTick(v, xt.step || 1); }, yfmt: function (v) { return fmtTick(v, yt.step || 1); },
      xLabel: o.xLabel, yLabel: o.yLabel, title: o.title });
    var clip = clipRect(svg, nextId("lab-clip"), m, W, H);
    drawRefLines(svg, o.refLines, { m: m, w: W, h: H, sx: sx, sy: sy, xd: xd }, clip);
    var r = o.r || (this.points.length > 2000 ? 2.2 : this.points.length > 400 ? 3 : 3.8);
    var order = this.groups.slice();
    var hl = [].concat(o.highlight || []).map(String);
    order.sort(function (a, b) { return (hl.indexOf(a) >= 0) - (hl.indexOf(b) >= 0); });
    var layer = sv("g", { "class": "lp-dots", "clip-path": clip });
    var seenPx = Object.create(null), drawn = [];
    order.forEach(function (g) {
      if (self.hidden[g]) return;
      var gg = sv("g", { fill: self.colorOf[g] });
      gg.style.fill = self.colorOf[g];
      var big = hl.indexOf(g) >= 0;
      self.points.forEach(function (p) {
        if (p.group !== g) return;
        var px = sx(p.x), py = sy(p.y);
        if (self.points.length > 3000) {
          var key = g + "|" + Math.round(px * 2) + "|" + Math.round(py * 2);
          if (seenPx[key]) { drawn.push({ p: p, x: px, y: py }); return; }
          seenPx[key] = 1;
        }
        var c = sv("circle", { cx: px.toFixed(1), cy: py.toFixed(1), r: big ? r * 1.35 : r, "class": "lp-dot" + (big ? " hl" : "") });
        if (o.opacity != null) c.style.fillOpacity = o.opacity;
        gg.appendChild(c);
        drawn.push({ p: p, x: px, y: py });
      });
      layer.appendChild(gg);
    });
    svg.appendChild(layer);
    this.drawn = drawn;
    this.ring = sv("circle", { "class": "lp-ring", r: r + 4, cx: -50, cy: -50 });
    svg.appendChild(this.ring);
    var notes = [];
    if (this.missing) notes.push(this.missing + " point" + (this.missing === 1 ? "" : "s") + " with a missing coordinate not shown.");
    if (o.note) notes.push(o.note);
    setText(this.noteEl, notes.join(" "));
  };
  Scatter.prototype.ariaLabel = function () {
    var o = this.opts;
    if (o.ariaLabel) return o.ariaLabel;
    var self = this, counts = this.groups.map(function (g) {
      var n = self.points.filter(function (p) { return p.group === g; }).length;
      return (g || "points") + " " + n;
    });
    return "Scatter plot of " + (o.yLabel || "y") + " against " + (o.xLabel || "x") + ": " + this.points.length + " points" + (this.groups.length > 1 ? " (" + counts.join(", ") + ")" : "") + ".";
  };
  Scatter.prototype.wireHover = function () {
    var self = this, box = this.svgBox;
    function find(e) {
      if (!self.svg || !self.drawn) return null;
      var rect = self.svg.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
      var best = null, bd = (e.pointerType === "touch" ? 22 : 12);
      bd *= bd;
      for (var i = 0; i < self.drawn.length; i++) {
        var d = self.drawn[i], dx = d.x - x, dy = d.y - y, dd = dx * dx + dy * dy;
        if (dd < bd) { bd = dd; best = d; }
      }
      return best;
    }
    function show(e) {
      var d = find(e);
      if (!d) { hide(); return; }
      var p = d.p, o = self.opts;
      var text = typeof o.tooltip === "function" ? o.tooltip(p.data || p) : (p.label != null && p.label !== "" ? p.label + "\n" : "") +
        (o.xLabel || "x") + " " + fmtNum(p.x) + ", " + (o.yLabel || "y") + " " + fmtNum(p.y) + (p.group ? "\n" + p.group : "");
      self.tip.textContent = text;
      self.tip.hidden = false;
      var tw = self.tip.offsetWidth, th = self.tip.offsetHeight;
      var left = d.x + 12, top = d.y - th - 8;
      if (left + tw > self.W - 4) left = Math.max(4, d.x - tw - 12);
      if (top < 0) top = d.y + 12;
      self.tip.style.left = left + "px"; self.tip.style.top = top + "px";
      self.ring.setAttribute("cx", d.x); self.ring.setAttribute("cy", d.y);
      self.ring.style.stroke = self.colorOf[p.group];
    }
    function hide() { self.tip.hidden = true; if (self.ring) { self.ring.setAttribute("cx", -50); self.ring.setAttribute("cy", -50); } }
    box.addEventListener("pointermove", function (e) { if (e.pointerType !== "touch") show(e); });
    box.addEventListener("pointerdown", function (e) { show(e); });
    box.addEventListener("pointerleave", function (e) { if (e.pointerType !== "touch") hide(); });
  };
  Scatter.prototype.update = function (points, opts) {
    if (opts) Object.assign(this.opts, opts);
    this.setData(points != null ? points : this.points.map(function (p) { return p.data || [p.x, p.y, p.group, p.label]; }));
    this.draw();
    return this;
  };

  /* ---------------- Q–Q plot of p-values ---------------- */
  function QQ(el, pvalues, opts) {
    opts = Object.assign({ equal: false }, opts || {});
    var labels = opts.labels || null;
    var f = [], bad = 0, zero = 0;
    (pvalues || []).forEach(function (p, i) {
      if (p != null && typeof p === "object") { p = p[opts.key || "p"]; }
      p = +p;
      if (!(p >= 0 && p <= 1) || isNaN(p)) { bad++; return; }
      if (p === 0) { zero++; p = Number.MIN_VALUE; }
      f.push({ p: p, label: labels ? labels[i] : null });
    });
    f.sort(function (a, b) { return a.p - b.p; });
    var n = f.length;
    var pts = f.map(function (d, i) {
      return { x: -Math.log((i + 0.5) / n) / Math.LN10, y: -Math.log(d.p) / Math.LN10, label: d.label, group: opts.group || "" };
    });
    var maxE = n ? -Math.log(0.5 / n) / Math.LN10 : 1;
    var maxO = pts.length ? pts[0].y : 1;
    var top = Math.max(maxE, maxO);
    (opts.refLines || []).forEach(function (r) { if (r.y != null && r.extend !== false) top = Math.max(top, r.y); });
    top *= 1.05;
    var refs = [{ identity: true, label: opts.identityLabel || "y = x (expected)", dash: false }].concat(opts.refLines || []);
    var notes = [];
    if (bad) notes.push(bad + " missing or invalid p-value" + (bad === 1 ? "" : "s") + " not shown.");
    if (zero) notes.push(zero + " p-value" + (zero === 1 ? " of 0 is" : "s of 0 are") + " drawn at the smallest number the browser can represent.");
    if (opts.note) notes.push(opts.note);
    var so = Object.assign({}, opts, {
      xLabel: opts.xLabel || "Expected −log₁₀(p)", yLabel: opts.yLabel || "Observed −log₁₀(p)",
      xDomain: opts.xDomain || [0, maxE * 1.05], yDomain: opts.yDomain || [0, top],
      refLines: refs, legend: false, note: notes.join(" "),
      ariaLabel: opts.ariaLabel || ("Q–Q plot of " + n + " p-values: observed against expected −log₁₀(p); the largest observed value is " + fmtNum(maxO) + " where at most " + fmtNum(maxE) + " is expected."),
      tooltip: opts.tooltip || function (p) { return (p.label ? p.label + "\n" : "") + "p = " + fmtNum(Math.pow(10, -p.y)) + "\nexpected −log₁₀(p) " + fmtNum(p.x) + ", observed " + fmtNum(p.y); }
    });
    var sc = new Scatter(el, pts, so);
    sc.el.classList.add("lab-plot-qq");
    sc.maxExpected = maxE;
    return sc;
  }

  /* ---------------- bar chart ---------------- */
  function Bar(el, data, opts) {
    Chart.call(this, el, opts, "bar");
    this.setData(data);
    this.draw();
  }
  Bar.prototype = Object.create(Chart.prototype);
  Bar.prototype.setData = function (data) {
    var o = this.opts;
    var rows = Array.isArray(data) ? data.map(function (d) { return Array.isArray(d) ? { label: d[0], value: d[1] } : d; })
      : Object.keys(data || {}).map(function (k) { return { label: k, value: data[k] }; });
    rows = rows.map(function (d, i) { return { label: String(d.label), value: +d.value, color: d.color, i: i }; });
    if (o.sort === "desc") rows.sort(function (a, b) { return b.value - a.value; });
    else if (o.sort === "asc") rows.sort(function (a, b) { return a.value - b.value; });
    this.rows = rows;
  };
  Bar.prototype.draw = function () {
    var o = this.opts, rows = this.rows;
    var W0 = Math.max(240, Math.floor(this.svgBox.clientWidth || 600));
    var longest = Math.max.apply(null, rows.map(function (r) { return r.label.length; }).concat([1]));
    var horiz = o.horizontal != null ? o.horizontal : (longest > 6 || rows.length * 46 > W0 - 70);
    var fmt = o.format || function (v) { return isFinite(v) ? (Math.round(v) === v ? v.toLocaleString("en-US") : fmtNum(v)) : "NA"; };
    var maxV = o.max != null ? o.max : Math.max.apply(null, rows.map(function (r) { return isFinite(r.value) ? r.value : 0; }).concat([0]));
    var minV = Math.min(0, Math.min.apply(null, rows.map(function (r) { return isFinite(r.value) ? r.value : 0; }).concat([0])));
    if (maxV === minV) maxV = minV + 1;
    var svg, W = W0, H;
    if (horiz) {
      var labW = Math.min(Math.max(60, longest * 7 + 12), Math.round(W * 0.42));
      var rowH = 28, m = { l: labW, r: 64, t: o.title ? 30 : 8, b: o.xLabel ? 40 : 26 };
      H = o.height || (m.t + m.b + rows.length * rowH);
      svg = this.newSvg(W, H, this.ariaLabel());
      var pw = W - m.l - m.r;
      var sx = function (v) { return m.l + (v - minV) / (maxV - minV) * pw; };
      var xt = ticks(minV, maxV, Math.max(2, Math.floor(pw / 80)));
      var g = sv("g", { "class": "lp-axes" });
      xt.forEach(function (v) {
        g.appendChild(sv("line", { "class": "lp-grid", x1: sx(v), x2: sx(v), y1: m.t, y2: H - m.b }));
        g.appendChild(sv("text", { x: sx(v), y: H - m.b + 15, "text-anchor": "middle" }, fmtTick(v, xt.step || 1)));
      });
      if (o.xLabel) g.appendChild(sv("text", { "class": "lp-title", x: m.l + pw / 2, y: H - 6, "text-anchor": "middle" }, o.xLabel));
      if (o.title) g.appendChild(sv("text", { "class": "lp-title lp-head", x: 4, y: 16 }, o.title));
      svg.appendChild(g);
      var slotH = (H - m.t - m.b) / Math.max(1, rows.length);
      rows.forEach(function (r, i) {
        var y = m.t + i * slotH, bh = Math.min(20, slotH * 0.72), yc = y + slotH / 2;
        var lab = r.label.length > Math.floor(labW / 7) ? r.label.slice(0, Math.floor(labW / 7) - 1) + "…" : r.label;
        svg.appendChild(sv("text", { "class": "lp-cat", x: m.l - 8, y: yc + 4, "text-anchor": "end" }, lab));
        if (!isFinite(r.value)) return;
        var x0 = sx(Math.min(0, r.value)), x1 = sx(Math.max(0, r.value));
        var rect = sv("rect", { "class": "lp-bar", x: x0, y: yc - bh / 2, width: Math.max(1, x1 - x0), height: bh });
        rect.style.fill = r.color || o.color || "var(--q1)";
        rect.appendChild(sv("title", null, r.label + ": " + fmt(r.value)));
        svg.appendChild(rect);
        svg.appendChild(sv("text", { "class": "lp-val", x: x1 + 5, y: yc + 4 }, fmt(r.value)));
      });
      svg.appendChild(sv("line", { "class": "lp-base", x1: sx(0), x2: sx(0), y1: m.t, y2: H - m.b }));
    } else {
      var mm = { l: 52, r: 10, t: o.title ? 30 : 14, b: o.xLabel ? 50 : 34 };
      H = o.height || (W < 420 ? 240 : 280);
      svg = this.newSvg(W, H, this.ariaLabel());
      var ph = H - mm.t - mm.b, pw2 = W - mm.l - mm.r;
      var sy = function (v) { return H - mm.b - (v - minV) / (maxV - minV) * ph; };
      var yt = ticks(minV, maxV, Math.max(2, Math.floor(ph / 45)));
      drawAxes(svg, { m: mm, w: W, h: H, sx: function () { return -100; }, sy: sy, xt: [], yt: yt, yfmt: function (v) { return fmtTick(v, yt.step || 1); },
        xLabel: o.xLabel, yLabel: o.yLabel, title: o.title });
      var slot = pw2 / Math.max(1, rows.length);
      rows.forEach(function (r, i) {
        var x = mm.l + i * slot, bw = Math.min(56, slot * 0.7), xc = x + slot / 2;
        svg.appendChild(sv("text", { "class": "lp-cat", x: xc, y: H - mm.b + 15, "text-anchor": "middle" }, r.label));
        if (!isFinite(r.value)) return;
        var y0 = sy(Math.max(0, r.value)), y1 = sy(Math.min(0, r.value));
        var rect = sv("rect", { "class": "lp-bar", x: xc - bw / 2, y: y0, width: bw, height: Math.max(1, y1 - y0) });
        rect.style.fill = r.color || o.color || "var(--q1)";
        rect.appendChild(sv("title", null, r.label + ": " + fmt(r.value)));
        svg.appendChild(rect);
        svg.appendChild(sv("text", { "class": "lp-val", x: xc, y: y0 - 4, "text-anchor": "middle" }, fmt(r.value)));
      });
    }
    setText(this.noteEl, o.note || "");
  };
  Bar.prototype.ariaLabel = function () {
    var o = this.opts;
    if (o.ariaLabel) return o.ariaLabel;
    return "Bar chart" + (o.title ? " of " + o.title : "") + ": " + this.rows.map(function (r) { return r.label + " " + (isFinite(r.value) ? r.value : "NA"); }).join(", ") + ".";
  };
  Bar.prototype.update = function (data, opts) {
    if (opts) Object.assign(this.opts, opts);
    if (data != null) this.setData(data);
    this.draw();
    return this;
  };

  var plot = {
    histogram: function (el, values, opts) { return new Histogram(el, values, opts); },
    scatter: function (el, points, opts) { return new Scatter(el, points, opts); },
    qq: function (el, pvalues, opts) { return QQ(el, pvalues, opts); },
    bar: function (el, data, opts) { return new Bar(el, data, opts); },
    color: groupColor,
    format: fmtNum,
    ticks: ticks
  };

  /* ======================================================================
     15. window.Lab: what pages and widgets use (documented in LAB.md)
     ====================================================================== */
  function mutate(fn) {
    if (!page.sh) throw new Error("Lab.fs: the lab has not started yet; wait for Lab.ready");
    var prev = page.fs.beginChanges();
    var r;
    try { r = fn(); }
    finally {
      var changed = page.fs.endChanges(prev);
      if (changed.length) page.changed(changed, "api", null);
    }
    return r;
  }
  var labFS = {
    /* paths: absolute, relative to ~/statgen-workshop, or with ~ / $VAR / ${VAR} */
    resolve: function (p) { return page.resolve(p); },
    read: function (p) { return page.fs.read(page.resolve(p)); },
    readText: function (p) { return page.fs.readText(page.resolve(p)); },
    readBytes: function (p) { return page.fs.readBytes(page.resolve(p)); },
    exists: function (p) { return page.fs.exists(page.resolve(p)); },
    isDir: function (p) { return page.fs.isDir(page.resolve(p)); },
    isFile: function (p) { return page.fs.isFile(page.resolve(p)); },
    list: function (p) { try { return page.fs.list(page.resolve(p == null ? "." : p)); } catch (e) { return null; } },
    size: function (p) { return page.fs.size(page.resolve(p)); },
    walk: function (p) { return page.fs.walk(page.resolve(p == null ? "." : p), false); },
    write: function (p, data) { var abs = page.resolve(p); return mutate(function () { return page.fs.write(abs, data, { parents: true }); }); },
    append: function (p, data) { var abs = page.resolve(p); return mutate(function () { return page.fs.write(abs, data, { parents: true, append: true }); }); },
    mkdir: function (p) { var abs = page.resolve(p); return mutate(function () { page.fs.mkdir(abs, true); return abs; }); },
    remove: function (p, recursive) {
      var abs = page.resolve(p);
      if (!page.fs.exists(abs)) return false;
      return mutate(function () { page.fs.remove(abs, recursive !== false); return true; });
    },
    download: function (p) { var abs = page.resolve(p), d = page.fs.read(abs); if (d == null) return false; downloadData(basename(abs), d); return true; }
  };

  function labRun(command, opts) {
    opts = opts || {};
    return bootPromise.then(function () {
      var session = { cwd: opts.cwd ? page.resolve(opts.cwd) : PROJECT, oldpwd: null };
      var io = {
        out: function (text, kind) { if (opts.onOutput) opts.onOutput(text, kind); },
        isTTY: false, columns: opts.columns || 100,
        beforeLong: opts.onLong ? function (name) { opts.onLong(name); return new Promise(function (r) { setTimeout(r, 20); }); } : null
      };
      return page.execIn(session, String(command), { io: io, source: opts.source || "run" });
    });
  }

  function readTable(path, opts) {
    var abs = page.resolve(path);
    var d = page.fs.read(abs);
    if (d == null) return null;
    if (isBytes(d) && !looksText(d)) throw new Error("Lab.readTable: " + abs + " is a binary file, not a text table");
    var t = parseTable(isBytes(d) ? utf8Decode(d) : d, Object.assign({ path: abs }, opts || {}));
    t.path = abs;
    return t;
  }

  /* Build the terminal of a div.lab. During boot its setup runs in document order before Lab.ready;
     a lab mounted later runs its setup at once. */
  function mount(el) {
    el = pickEl(el);
    if (!el || el._lab) return el && el._lab;
    var T = new Terminal(el, page);
    el._lab = T;
    page.terminals.push(T);
    if (page.sh) T.runSetup();
    return T;
  }

  var Lab = {
    version: LAB_VERSION,
    ready: readyPromise,
    fs: labFS,
    run: labRun,
    readTable: readTable,
    parseTable: parseTable,
    plot: plot,
    mount: mount,
    reset: function () { return page.reset(); },
    vars: {
      get: function (name) { return page.sh ? page.sh.getVar(name) : undefined; },
      set: function (name, value) { if (page.sh) page.sh.setVar(name, value, true); },
      all: function () { return page.sh ? page.sh.env() : {}; }
    },
    paths: { home: HOME, project: PROJECT, input_dir: INPUT_DIR, reference_dir: REF_DIR, analysis_dir: ANALYSIS_DIR },
    get terminals() { return page.terminals.slice(); },
    get history() { return page.history.slice(); },
    core: LabCore,
    _page: page
  };
  G.Lab = Lab;

  /* ======================================================================
     16. Boot: seed the files, mount every div.lab, run their setups, then resolve Lab.ready
     ====================================================================== */
  function boot() {
    var files = G.TOY_FILES;
    if (!files) {
      page.problems.push("toy-data");
      if (G.console) console.error("lab: window.TOY_FILES is missing; load assets/js/lab/toy-data.js before lab.js");
    }
    try { seedFS(page.fs, files || {}); }
    catch (e) { page.problems.push("seed"); if (G.console) console.error("lab: could not decode TOY_FILES", e); }
    var labs = doc.querySelectorAll("div.lab");
    Array.prototype.forEach.call(labs, function (el) {
      try { mount(el); } catch (e) { if (G.console) console.error("lab: could not build the terminal", el, e); }
    });
    page.sh = new Shell({ fs: page.fs, files: files || {} });
    page.sh.history = page.history;
    // Setups run in document order, then the page's starting state (for Reset) is saved.
    page.terminals.forEach(function (T) { T.runSetup(); });
    bootResolve();
    page.enqueue(function () {
      page.start = { fs: page.fs.snapshot(), shell: page.sh.saveState() };
      page.ready = true;
    }).then(function () {
      readyResolve(Lab);
      try { doc.dispatchEvent(new CustomEvent("lab:ready", { detail: { lab: Lab } })); } catch (e) { /* old browsers */ }
    });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : globalThis);
