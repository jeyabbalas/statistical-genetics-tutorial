/* setup-path-translator.js — page "Set up your computer" (setup.html), widget #w-path-translator.
   The reader types a project folder and picks a system. The widget writes
     - the shell lines that create the practical's folder layout and set input_dir, reference_dir,
       analysis_dir and PATH for the current terminal,
     - the lines that keep those settings for every new terminal (appended to ~/.zshrc or ~/.bashrc),
     - the R lines that replace the practical's setup chunk (folder variables, Sys.setenv), and
     - for Docker, the docker run line that makes the folder visible inside the container.
   It warns about folder names that break the practical's unquoted commands (spaces, characters the
   shell treats specially, letters outside plain ASCII), relative paths, folders that a cloud service
   keeps in sync, Windows paths, and slow /mnt/c folders under WSL.
   Pure string work: nothing is run, fetched or stored by the widget itself.
   Also, on a first visit (no saved choice), it selects the operating-system tab that matches the
   reader's browser in every tab set with data-group="os" on the page.
   In Node (no document) it exposes the pure functions for tests as globalThis.PATH_TRANSLATOR_TEST. */
(function () {
  "use strict";

  var SYSTEMS = {
    mac: { label: "macOS (Terminal, zsh)", rc: "~/.zshrc", tab: "macOS" },
    linux: { label: "Linux (bash)", rc: "~/.bashrc", tab: "Linux" },
    wsl: { label: "Windows with WSL (Ubuntu, bash)", rc: "~/.bashrc", tab: "Windows (WSL)" },
    docker: { label: "Docker: RStudio Server in a rocker container", rc: null, tab: null }
  };
  var DEFAULT_FOLDER = "~/statgen-workshop";
  var CONTAINER_BASE = "/home/rstudio/statgen-workshop";

  function uniq(a) { var o = []; a.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); return o; }
  function winToWsl(p) {   // C:\Users\Ana\x -> /mnt/c/Users/Ana/x
    return ("/mnt/" + p.charAt(0).toLowerCase() + "/" + p.slice(3).replace(/\\/g, "/")).replace(/\/+$/, "");
  }

  // Turn the typed folder into the forms each language needs.
  // Returns { bashBase, rBase, hostBase, problems: [], notes: [] }.
  function translate(raw, sys) {
    var problems = [], notes = [];
    var s = String(raw == null ? "" : raw).trim();
    if (!s) s = DEFAULT_FOLDER;
    if (s.length > 1) s = s.replace(/[\\\/]+$/, "");
    var winPath = /^[A-Za-z]:[\\\/]/.test(s);
    var typed = s;                    // what the reader typed, for the character checks
    var bashBase, rBase, hostBase = s;

    if (winPath) {
      var conv = winToWsl(s);
      if (sys === "wsl") {
        notes.push("Inside WSL this Windows folder is " + conv + ". It works, but Linux programs read and write files under /mnt/c much more slowly than files in the Linux home folder; ~/statgen-workshop is the better choice.");
        s = conv;
      } else if (sys === "docker") {
        notes.push("The docker command below is written for an Ubuntu (WSL) terminal, where this folder is " + conv + ". Docker Desktop also accepts the Windows form in PowerShell, where a long command continues on the next line with a backtick (`) instead of a backslash.");
        hostBase = conv;
      } else {
        problems.push("This is a Windows path (drive letter and backslashes). On macOS and Linux a full path starts with / or ~. The commands below use " + DEFAULT_FOLDER + " instead.");
        s = DEFAULT_FOLDER;
        hostBase = s;
      }
    }

    var src = sys === "docker" ? CONTAINER_BASE : s;
    if (/^~(\/|$)/.test(src)) {
      bashBase = "$HOME" + src.slice(1);
      rBase = 'path.expand("' + src + '")';
    } else if (/^\$\{?HOME\}?(\/|$)/.test(src)) {
      var rest = src.replace(/^\$\{?HOME\}?/, "");
      bashBase = "$HOME" + rest;
      rBase = rest ? 'file.path(Sys.getenv("HOME"), "' + rest.replace(/^\//, "") + '")' : 'Sys.getenv("HOME")';
    } else if (/^\//.test(src)) {
      bashBase = src;
      rBase = '"' + src + '"';
    } else {
      problems.push("Use a full path, starting with / or ~. A relative path such as " + src + " means a different folder depending on the folder you are in; the commands below read it as ~/" + src + ".");
      bashBase = "$HOME/" + src;
      rBase = 'path.expand("~/' + src + '")';
      if (sys !== "docker") hostBase = "~/" + src;
    }
    if (sys === "docker" && !/^(~|\/|\$\{?HOME)/.test(hostBase)) hostBase = "~/" + hostBase;

    // Character checks on the folder as typed (for Docker, the folder on the reader's computer).
    if (/\s/.test(typed)) {
      problems.push("The folder name contains a space. The practical writes ${input_dir} and the other variables without quotes, so the shell would split such a path into two words and PLINK would not find its files. Choose a folder without spaces, or put double quotes around every path in every command.");
    }
    var rest2 = typed.replace(/^\$\{?HOME\}?/, "").replace(/^~/, "");
    if (winPath) rest2 = rest2.slice(2).replace(/\\/g, "/");
    var odd = rest2.replace(/[A-Za-z0-9._\/\- \t]/g, "");
    if (odd.length) {
      problems.push("The folder name contains " + uniq(odd.split("")).join(" ") + ". Use only the plain letters a\u2013z and A\u2013Z, digits, dot, underscore, hyphen and slash: the shell reads characters such as $ & ; ( ) and quotes as instructions, and letters with accents or from other alphabets break some programs.");
    }
    if (/Mobile Documents|iCloud|OneDrive|Dropbox|Google ?Drive|CloudStorage|My Drive|Box Sync/i.test(typed)) {
      problems.push("This looks like a folder that a cloud service keeps in sync. The practical writes about 3 GB of intermediate files, which would all be uploaded, and a file that the service keeps only online cannot be read by PLINK. Use a folder outside it, such as ~/statgen-workshop.");
    } else if (sys === "mac" && /^(~|\$\{?HOME\}?|\/Users\/[^\/]+)\/(Desktop|Documents)(\/|$)/.test(typed)) {
      notes.push("If the iCloud Drive option \u201cDesktop & Documents Folders\u201d is on, this folder is synced to iCloud. A folder directly in your home folder, such as ~/statgen-workshop, avoids that.");
    }
    if (sys === "wsl" && !winPath && /^\/mnt\/[a-z](\/|$)/.test(s)) {
      notes.push("Folders under /mnt/c are the Windows drive seen from Linux; reading and writing there is much slower than in the Linux home folder.");
    }
    if (sys === "wsl" && !/^\/mnt\//.test(s)) {
      var win = /^\$HOME/.test(bashBase)
        ? "\\\\wsl.localhost\\Ubuntu\\home\\YOUR-LINUX-NAME" + bashBase.slice(5).replace(/\//g, "\\")
        : "\\\\wsl.localhost\\Ubuntu" + bashBase.replace(/\//g, "\\");
      notes.push("To reach these files from Windows (File Explorer, or a program such as RStudio for Windows), use the path " + win + ". Replace YOUR-LINUX-NAME with the user name you chose in Ubuntu; the part after wsl.localhost differs if you installed another Linux distribution.");
    }
    if (sys === "docker") {
      notes.push("Inside the container the project folder is always " + CONTAINER_BASE + ", whatever its name on your computer: the -v option connects the two, and files written in one appear in the other.");
    }
    return { bashBase: bashBase, rBase: rBase, hostBase: hostBase, problems: problems, notes: notes };
  }

  function exportLines(b) {
    return [
      'export input_dir="' + b + '/data/inputs/penncath_withPheno"',
      'export reference_dir="' + b + '/data/inputs/ref"',
      'export analysis_dir="' + b + '/analysis"',
      'export PATH="' + b + '/tools:$PATH"'
    ];
  }

  function shellLines(t) {
    var b = t.bashBase;
    return [
      "# Create the folders (once)",
      'mkdir -p "' + b + '/data/inputs/penncath_withPheno" \\',
      '         "' + b + '/data/inputs/ref" \\',
      '         "' + b + '/analysis" \\',
      '         "' + b + '/tools" \\',
      '         "' + b + '/scripts"',
      "",
      "# Set the three folder variables and PATH for this terminal"
    ].concat(exportLines(b)).join("\n");
  }

  function keepLines(t, sys) {
    var rc = SYSTEMS[sys].rc;
    if (!rc) return null;
    return ["# Once, for new terminals",
      "cat >> " + rc + " <<'EOF'"].concat(exportLines(t.bashBase), ["EOF"]).join("\n");
  }

  function rLines(t) {
    return [
      "# The folders, in R",
      "base          <- " + t.rBase,
      'input_dir     <- file.path(base, "data", "inputs", "penncath_withPheno")',
      'reference_dir <- file.path(base, "data", "inputs", "ref")',
      'analysis_dir  <- file.path(base, "analysis")',
      "dir.create(analysis_dir, recursive = TRUE, showWarnings = FALSE)",
      "Sys.setenv(input_dir = input_dir, reference_dir = reference_dir, analysis_dir = analysis_dir,",
      '           PATH = paste(file.path(base, "tools"), Sys.getenv("PATH"), sep = .Platform$path.sep))'
    ].join("\n");
  }

  function dockerLines(t) {
    var host = t.hostBase;
    var hostArg = /^~(\/|$)/.test(host) ? '"$HOME' + host.slice(1) + '"'
      : /^\$\{?HOME\}?/.test(host) ? '"' + host.replace(/^\$\{?HOME\}?/, "$HOME") + '"'
      : '"' + host + '"';
    return [
      "# Start RStudio Server",
      "docker run --rm -p 8787:8787 -e PASSWORD=choose-a-password \\",
      "  -v " + hostArg + ":" + CONTAINER_BASE + " \\",
      "  statgen-r",
      "# then open http://localhost:8787 and sign in as rstudio"
    ].join("\n");
  }

  if (typeof document === "undefined") {
    globalThis.PATH_TRANSLATOR_TEST = { translate: translate, shellLines: shellLines, keepLines: keepLines, rLines: rLines, dockerLines: dockerLines };
    return;
  }

  function guessSystem() {
    try {
      var ua = (navigator.userAgent || "") + " " + (navigator.platform || "");
      if (/Windows|Win32|Win64/i.test(ua)) return "wsl";
      if (/Mac/i.test(ua) && !/iPhone|iPad/i.test(ua)) return "mac";
      if (/Linux|X11|CrOS/i.test(ua) && !/Android/i.test(ua)) return "linux";
    } catch (e) { /* keep the default */ }
    return null;
  }

  // First visit: open the matching operating-system tab in every data-group="os" tab set.
  (function selectOsTab() {
    var saved = null;
    try { saved = localStorage.getItem("tabs-os"); } catch (e) { return; }
    if (saved) return;
    var sys = guessSystem();
    if (!sys || !SYSTEMS[sys].tab) return;
    var set = document.querySelector('.tabset[data-group="os"]');
    if (!set) return;
    var btn = set.querySelector(':scope > .tab-list > button[data-label="' + SYSTEMS[sys].tab + '"]');
    if (btn && btn.getAttribute("aria-selected") !== "true") btn.click();
  })();

  var root = document.getElementById("w-path-translator");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!body) return;

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }

  var controls = el("div", { "class": "pt-controls" });
  var f1 = el("label", { "class": "pt-field pt-folder" });
  f1.appendChild(el("span", null, "Project folder"));
  var input = el("input", { type: "text", value: DEFAULT_FOLDER, spellcheck: "false", autocomplete: "off", autocapitalize: "off", "aria-describedby": "pt-hint" });
  f1.appendChild(input);
  var f2 = el("label", { "class": "pt-field pt-system" });
  f2.appendChild(el("span", null, "Your system"));
  var select = el("select");
  Object.keys(SYSTEMS).forEach(function (k) { select.appendChild(el("option", { value: k }, SYSTEMS[k].label)); });
  f2.appendChild(select);
  controls.appendChild(f1);
  controls.appendChild(f2);
  body.appendChild(controls);
  body.appendChild(el("p", { "class": "note", id: "pt-hint" }, "Try a folder with a space in its name, a Windows path such as C:\\Users\\Ana\\statgen-workshop with WSL, or a folder inside OneDrive or iCloud Drive."));

  var out = el("div", { "class": "pt-out", "aria-live": "polite" });
  body.appendChild(out);

  var guess = guessSystem();
  if (guess) select.value = guess;

  function block(labelText, cls, text) {
    var frag = document.createDocumentFragment();
    frag.appendChild(el("span", { "class": "code-label " + cls }, labelText));
    var pre = el("pre", { "class": "code" });
    pre.textContent = text;
    frag.appendChild(pre);
    return frag;
  }

  function list(cls, items, heading) {
    var wrap = el("div", { "class": cls });
    wrap.appendChild(el("p", { "class": "pt-h" }, heading));
    var ul = el("ul");
    items.forEach(function (p) { ul.appendChild(el("li", null, p)); });
    wrap.appendChild(ul);
    return wrap;
  }

  function render() {
    var sys = select.value;
    var t = translate(input.value, sys);
    out.textContent = "";
    if (t.problems.length) out.appendChild(list("pt-problems", t.problems, "Change the folder name"));
    if (sys === "docker") {
      out.appendChild(block("bash · on your computer", "bash", dockerLines(t)));
      out.appendChild(block("bash · in RStudio's Terminal tab, inside the container", "bash", shellLines(t)));
    } else {
      out.appendChild(block(sys === "mac" ? "zsh · Terminal (the same lines work in bash)" : "bash · terminal", "bash", shellLines(t)));
      out.appendChild(block((sys === "mac" ? "zsh" : "bash") + " · keep the settings for new terminals", "bash", keepLines(t, sys)));
    }
    out.appendChild(block("r · replaces the practical's setup chunk", "r", rLines(t)));
    if (t.notes.length) out.appendChild(list("pt-notes", t.notes, "Notes"));
    if (window.LectureSite && window.LectureSite.copyButtons) window.LectureSite.copyButtons(out);
  }

  input.addEventListener("input", render);
  select.addEventListener("change", render);
  render();
})();
