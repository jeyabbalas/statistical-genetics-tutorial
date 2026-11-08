/* plink-data-bed-decoder.js — "Encode genotypes into .bed bytes, and decode them back"
   Shows how PLINK 1 stores a genotype matrix in a .bed file, on real data: the first 12 people of
   penncath.fam and the SNPs on lines 2, 4, 6 and 10 of penncath.bim (rs12565286, rs3094315, rs11240776,
   rs11240777), with their real genotypes.

   Encoding (PLINK 1.9 file-format specification, https://www.cog-genomics.org/plink/1.9/formats#bed):
     file      = 0x6C 0x1B 0x01, then one block per SNP in .bim order (SNP-major)
     block     = B = ceil(n / 4) bytes, where n is the number of people in the .fam file
     person i  (0-based, .fam order) sits in byte floor(i / 4) of the block, in bits 2(i mod 4) and 2(i mod 4) + 1,
               so the first person of each byte is in its two lowest-order bits
     codes     00 = homozygous A1 (2 copies of A1), 01 = missing, 10 = heterozygous (1 copy), 11 = homozygous A2 (0)
     padding   unused high-order bit pairs of the last byte of a block are 0
     size      3 + m * B bytes for m SNPs
   With all 12 people the four blocks equal the first three bytes of the same SNPs' blocks in the real
   penncath.bed (file offsets 354, 1056, 1758 and 3162): f3 ff ff, fb ff fe, fd 7f 7f, bb eb bb.
   The reader can click a genotype to see its bits, change it, and change the number of people. */
(function () {
  "use strict";
  var root = document.getElementById("w-bed-decoder");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!body) return;

  var FAM = ['"10002"', '"10004"', '"10005"', '"10007"', '"10008"', '"10009"', '"10010"', '"10011"',
             '"10012"', '"10013"', '"10014"', '"10015"'];
  var SNPS = [
    { id: "rs12565286", line: 2, a1: "G", a2: "C", offset: 354 },
    { id: "rs3094315", line: 4, a1: "C", a2: "T", offset: 1056 },
    { id: "rs11240776", line: 6, a1: "G", a2: "A", offset: 1758 },
    { id: "rs11240777", line: 10, a1: "A", a2: "G", offset: 3162 }
  ];
  var REAL = [
    [0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [null, 0, 0, 0, 0, 0, 0, null, 0, 0, 0, null],
    [0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1]
  ];
  var CODE = { 2: 0, "null": 1, 1: 2, 0: 3 };          // copies of A1 -> 2-bit code
  var CODE_TXT = ["00", "01", "10", "11"];
  var MEANING = ["2 copies of A1", "missing", "1 copy of A1", "0 copies of A1"];

  var state = { n: 12, g: REAL.map(function (r) { return r.slice(); }), sel: { i: 1, j: 0 } };

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") e.className = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    if (text != null) e.textContent = text;
    return e;
  }
  function hex(b) { return (b < 16 ? "0" : "") + b.toString(16); }
  function bin(b) { var s = b.toString(2); while (s.length < 8) s = "0" + s; return s; }
  function codeOf(v) { return CODE[v === null ? "null" : v]; }
  function letters(s, v) {
    if (v === null) return "NA";
    if (v === 2) return s.a1 + "/" + s.a1;
    if (v === 1) return s.a1 + "/" + s.a2;
    return s.a2 + "/" + s.a2;
  }
  function edited() {
    for (var j = 0; j < SNPS.length; j++) for (var i = 0; i < 12; i++) if (state.g[j][i] !== REAL[j][i]) return true;
    return false;
  }

  /* The encoder: one block of B bytes per SNP. */
  function encodeBlock(col, n) {
    var B = Math.ceil(n / 4), out = [];
    for (var k = 0; k < B; k++) out.push(0);
    for (var i = 0; i < n; i++) out[i >> 2] |= codeOf(col[i]) << (2 * (i & 3));
    return out;
  }
  function encodeFile(n) {
    var bytes = [0x6c, 0x1b, 0x01];
    SNPS.forEach(function (s, j) { bytes = bytes.concat(encodeBlock(state.g[j], n)); });
    return bytes;
  }

  /* ---------- static layout ---------- */
  body.innerHTML = "";
  var controls = el("div", { "class": "controls" });
  var nLab = el("label");
  nLab.appendChild(document.createTextNode("People in the file "));
  var nIn = el("input", { type: "range", min: "1", max: "12", step: "1", value: "12", "aria-label": "Number of people in the file" });
  var nOut = el("output", { "class": "bd-n" }, "12");
  nLab.appendChild(nIn); nLab.appendChild(nOut);
  var resetBtn = el("button", { type: "button", "class": "btn" }, "Reset to the real data");
  controls.appendChild(nLab); controls.appendChild(resetBtn);
  body.appendChild(controls);

  var cols = el("div", { "class": "bd-cols" });
  var left = el("div", { "class": "bd-left" });
  var right = el("div", { "class": "bd-right" });
  cols.appendChild(left); cols.appendChild(right);
  body.appendChild(cols);

  left.appendChild(el("p", { "class": "bd-h" }, "The matrix (copies of A1)"));
  var tableWrap = el("div", { "class": "bd-tablewrap" });
  var table = el("table", { "class": "bd-table" });
  tableWrap.appendChild(table);
  left.appendChild(tableWrap);
  var editor = el("div", { "class": "bd-editor", role: "group", "aria-label": "Change the selected genotype" });
  left.appendChild(editor);

  right.appendChild(el("p", { "class": "bd-h" }, "The .bed blocks (one per SNP)"));
  var blocks = el("div", { "class": "bd-blocks" });
  right.appendChild(blocks);

  var readout = el("div", { "class": "readout bd-readout", "aria-live": "polite" });
  body.appendChild(readout);
  body.appendChild(el("p", { "class": "bd-h" }, "The whole file, byte by byte (hexadecimal)"));
  var dump = el("div", { "class": "bd-dump" });
  body.appendChild(dump);
  var note = el("p", { "class": "note bd-note" });
  body.appendChild(note);

  /* ---------- table ---------- */
  function buildTable() {
    table.innerHTML = "";
    var thead = el("thead"), tr = el("tr");
    tr.appendChild(el("th", { scope: "col" }, ".fam line · FID"));
    SNPS.forEach(function (s) {
      var th = el("th", { scope: "col", title: s.id + ", line " + s.line + " of penncath.bim" });
      th.appendChild(el("span", { "class": "bd-rs" }, s.id));
      th.appendChild(el("span", { "class": "bd-line" }, "SNP " + s.line));
      th.appendChild(el("span", { "class": "bd-al" }, "A1 " + s.a1 + " · A2 " + s.a2));
      tr.appendChild(th);
    });
    thead.appendChild(tr); table.appendChild(thead);
    var tb = el("tbody");
    for (var i = 0; i < 12; i++) {
      var row = el("tr", { "data-i": String(i) });
      var th = el("th", { scope: "row" });
      th.appendChild(el("span", { "class": "bd-ln" }, String(i + 1)));
      th.appendChild(document.createTextNode(" " + FAM[i]));
      row.appendChild(th);
      for (var j = 0; j < SNPS.length; j++) {
        var td = el("td");
        var b = el("button", { type: "button", "class": "bd-cell", "data-i": String(i), "data-j": String(j) });
        td.appendChild(b); row.appendChild(td);
      }
      tb.appendChild(row);
    }
    table.appendChild(tb);
  }

  function renderTable() {
    var rows = table.querySelectorAll("tbody tr");
    for (var i = 0; i < 12; i++) {
      var inFile = i < state.n;
      rows[i].classList.toggle("bd-out", !inFile);
      var btns = rows[i].querySelectorAll("button.bd-cell");
      for (var j = 0; j < SNPS.length; j++) {
        var v = state.g[j][i], b = btns[j];
        b.className = "bd-cell " + (v === null ? "gm" : "g" + v) + (state.sel.i === i && state.sel.j === j ? " sel" : "");
        b.disabled = !inFile;
        b.innerHTML = "";
        b.appendChild(el("span", { "class": "bd-gl" }, letters(SNPS[j], v)));
        b.appendChild(el("span", { "class": "bd-gn" }, v === null ? "missing" : String(v)));
        b.setAttribute("aria-label", "Person " + (i + 1) + " " + FAM[i] + ", " + SNPS[j].id + ": " + letters(SNPS[j], v) +
          (v === null ? ", missing" : ", " + v + " copies of " + SNPS[j].a1) + (inFile ? "" : " (not in the file)"));
        b.setAttribute("aria-pressed", state.sel.i === i && state.sel.j === j ? "true" : "false");
      }
    }
  }

  /* ---------- editor ---------- */
  function renderEditor() {
    editor.innerHTML = "";
    var s = SNPS[state.sel.j], i = state.sel.i;
    editor.appendChild(el("span", { "class": "bd-ed-l" }, "Change person " + (i + 1) + " at " + s.id + " to:"));
    [[0, s.a2 + "/" + s.a2 + " (0)"], [1, s.a1 + "/" + s.a2 + " (1)"], [2, s.a1 + "/" + s.a1 + " (2)"], [null, "missing"]].forEach(function (o) {
      var b = el("button", { type: "button", "class": "btn bd-set" }, o[1]);
      if (state.g[state.sel.j][i] === o[0]) b.classList.add("primary");
      b.addEventListener("click", function () {
        state.g[state.sel.j][i] = o[0];
        render();
      });
      editor.appendChild(b);
    });
  }

  /* ---------- blocks ---------- */
  function renderBlocks() {
    blocks.innerHTML = "";
    var n = state.n, B = Math.ceil(n / 4);
    SNPS.forEach(function (s, j) {
      var blk = encodeBlock(state.g[j], n);
      var start = 3 + j * B;
      var wrap = el("div", { "class": "bd-snp" + (state.sel.j === j ? " cur" : "") });
      wrap.appendChild(el("div", { "class": "bd-snp-h" }, s.id + " · file bytes " + start + "–" + (start + B - 1)));
      var row = el("div", { "class": "bd-bytes" });
      blk.forEach(function (byte, k) {
        var selByte = state.sel.j === j && (state.sel.i >> 2) === k;
        var bx = el("div", { "class": "bd-byte" + (selByte ? " sel" : "") });
        bx.appendChild(el("div", { "class": "bd-hex" }, hex(byte)));
        var pairs = el("div", { "class": "bd-pairs" });
        var who = el("div", { "class": "bd-who" });
        for (var p = 3; p >= 0; p--) {           // high-order pair first, as binary is written
          var i = 4 * k + p;
          var code = (byte >> (2 * p)) & 3;
          var pad = i >= n;
          var sp = el(pad ? "span" : "button", pad ? { "class": "bd-pair pad" } : { type: "button", "class": "bd-pair c" + code, "data-i": String(i), "data-j": String(j) });
          sp.textContent = CODE_TXT[code];
          if (!pad) {
            sp.setAttribute("aria-label", "Bits of person " + (i + 1) + ": " + CODE_TXT[code] + ", " + MEANING[code]);
            if (state.sel.i === i && state.sel.j === j) sp.classList.add("sel");
          } else {
            sp.setAttribute("title", "padding: no person, always 00");
          }
          pairs.appendChild(sp);
          who.appendChild(el("span", null, pad ? "pad" : String(i + 1)));
        }
        bx.appendChild(pairs); bx.appendChild(who);
        row.appendChild(bx);
      });
      wrap.appendChild(row);
      blocks.appendChild(wrap);
    });
  }

  /* ---------- dump, readout, notes ---------- */
  function renderDump() {
    dump.innerHTML = "";
    var bytes = encodeFile(state.n), B = Math.ceil(state.n / 4);
    var selIdx = 3 + state.sel.j * B + (state.sel.i >> 2);
    bytes.forEach(function (b, k) {
      var cls = "bd-db" + (k < 3 ? " hdr" : "") + (k === selIdx ? " sel" : "");
      var blockNo = k < 3 ? -1 : Math.floor((k - 3) / B);
      if (blockNo >= 0 && blockNo % 2 === 1) cls += " alt";
      var sp = el("span", { "class": cls, title: k < 3 ? "header byte " + k : "byte " + k + ": " + SNPS[blockNo].id + ", " + bin(b) }, hex(b));
      dump.appendChild(sp);
      dump.appendChild(document.createTextNode(" "));
    });
  }

  function renderReadout() {
    var i = state.sel.i, j = state.sel.j, s = SNPS[j], n = state.n, B = Math.ceil(n / 4);
    var v = state.g[j][i], c = codeOf(v);
    var k = i >> 2, bitLo = 2 * (i & 3);
    var fileByte = 3 + j * B + k;
    var byte = encodeBlock(state.g[j], n)[k];
    var padBits = 8 * B - 2 * n;
    readout.textContent =
      "Person " + (i + 1) + " " + FAM[i] + " at " + s.id + ": " + letters(s, v) + " = " + MEANING[c] + " (A1 = " + s.a1 + ")" +
      " → code " + CODE_TXT[c] + " → byte " + k + " of the block, bits " + bitLo + "–" + (bitLo + 1) +
      " → file byte " + fileByte + " = " + hex(byte) + " = " + bin(byte) + ".  " +
      "File: 3 + " + SNPS.length + " SNPs × ⌈" + n + "/4⌉ = 3 + " + SNPS.length + " × " + B + " = " + (3 + SNPS.length * B) +
      " bytes; each block ends with " + padBits + " padding bit" + (padBits === 1 ? "" : "s") + ".";
  }

  function renderNote() {
    var parts = [];
    if (state.n === 12 && !edited()) {
      parts.push("These 15 bytes are real: with all 12 people, the four blocks equal the first three bytes of the same SNPs' blocks in penncath.bed (file offsets 354, 1,056, 1,758 and 3,162).");
    } else if (edited()) {
      parts.push("You have edited the genotypes, so these bytes no longer match penncath.bed.");
    } else {
      parts.push("With " + state.n + " people the blocks are " + Math.ceil(state.n / 4) + " byte" + (Math.ceil(state.n / 4) === 1 ? "" : "s") + " long; a fileset of only these people would have exactly these bytes.");
    }
    SNPS.forEach(function (s, j) {
      var a = 0, called = 0;
      for (var i = 0; i < state.n; i++) { var v = state.g[j][i]; if (v !== null) { a += v; called += 1; } }
      if (called && a / (2 * called) > 0.5) {
        parts.push("At " + s.id + ", A1 (" + s.a1 + ") is now the more common allele among these people (frequency " + (a / (2 * called)).toFixed(2) +
          "). PLINK 1.9's --make-bed would swap A1 and A2 in the .bim file and rewrite every code of this SNP (00 ↔ 11).");
      }
    });
    note.textContent = parts.join(" ");
  }

  function render() {
    if (state.sel.i >= state.n) state.sel.i = state.n - 1;
    nOut.textContent = String(state.n);
    renderTable(); renderEditor(); renderBlocks(); renderDump(); renderReadout(); renderNote();
  }

  /* ---------- events ---------- */
  function select(i, j, focusCell) {
    if (i >= state.n) return;
    state.sel = { i: i, j: j };
    render();
    if (focusCell) {
      var b = table.querySelector('button.bd-cell[data-i="' + i + '"][data-j="' + j + '"]');
      if (b) b.focus();
    }
  }
  table.addEventListener("click", function (e) {
    var b = e.target.closest("button.bd-cell");
    if (!b) return;
    select(+b.getAttribute("data-i"), +b.getAttribute("data-j"), true);
  });
  table.addEventListener("keydown", function (e) {
    var b = e.target.closest("button.bd-cell");
    if (!b) return;
    var i = +b.getAttribute("data-i"), j = +b.getAttribute("data-j");
    var di = 0, dj = 0;
    if (e.key === "ArrowDown") di = 1; else if (e.key === "ArrowUp") di = -1;
    else if (e.key === "ArrowRight") dj = 1; else if (e.key === "ArrowLeft") dj = -1; else return;
    e.preventDefault();
    var ni = Math.max(0, Math.min(state.n - 1, i + di)), nj = Math.max(0, Math.min(SNPS.length - 1, j + dj));
    select(ni, nj, true);
  });
  blocks.addEventListener("click", function (e) {
    var b = e.target.closest("button.bd-pair");
    if (!b) return;
    select(+b.getAttribute("data-i"), +b.getAttribute("data-j"), false);
  });
  nIn.addEventListener("input", function () { state.n = +nIn.value; render(); });
  resetBtn.addEventListener("click", function () {
    state.g = REAL.map(function (r) { return r.slice(); });
    state.n = 12; nIn.value = "12"; state.sel = { i: 1, j: 0 };
    render();
  });

  buildTable();
  render();

  /* Exposed for tests in Node or the console: the encoder, applied to the real data. */
  root.bedDecoderTest = function () {
    var saved = state.g; state.g = REAL;
    var out = encodeFile(12).map(hex).join(" ");
    state.g = saved;
    return out;
  };
})();
