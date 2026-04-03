#!/usr/bin/env node
"use strict";

var os = require("os");
var path = require("path");
var fs = require("fs");
var childProcess = require("child_process");

var PLATFORMS = {
  "darwin-arm64": "@legna-lnc/legnacode-darwin-arm64",
  "darwin-x64": "@legna-lnc/legnacode-darwin-x64",
  "linux-x64": "@legna-lnc/legnacode-linux-x64",
  "linux-arm64": "@legna-lnc/legnacode-linux-arm64",
  "win32-x64": "@legna-lnc/legnacode-win32-x64",
};

var key = process.platform + "-" + os.arch();
var pkg = PLATFORMS[key];

if (!pkg) {
  console.error(
    "legna: unsupported platform " + key + "\n" +
    "Supported: " + Object.keys(PLATFORMS).join(", ")
  );
  process.exit(1);
}

var binName = process.platform === "win32" ? "legna.exe" : "bin/legna";

function findBin() {
  // Strategy 1: require.resolve
  try {
    var p = path.resolve(require.resolve(pkg + "/package.json"), "..", binName);
    if (fs.existsSync(p)) return p;
  } catch (e) {}

  // Strategy 2: sibling scope dir (global flat layout)
  var scopeDir = path.resolve(__dirname, "..", "..", "..");
  var pkgName = pkg.split("/")[1];
  var flat = path.resolve(scopeDir, pkgName, binName);
  if (fs.existsSync(flat)) return flat;

  // Strategy 3: nested node_modules inside our package (postinstall puts it here)
  var nested = path.resolve(__dirname, "..", "..", "node_modules", pkg, binName);
  if (fs.existsSync(nested)) return nested;

  return null;
}

var bin = findBin();

if (!bin) {
  console.error(
    "legna: platform binary not found.\n" +
    "Run: npm install -g " + pkg + " --registry https://registry.npmjs.org"
  );
  process.exit(1);
}

var result = childProcess.spawnSync(bin, process.argv.slice(2), {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  if (result.error.code === "EACCES") {
    fs.chmodSync(bin, 0o755);
    result = childProcess.spawnSync(bin, process.argv.slice(2), {
      stdio: "inherit",
      env: process.env,
    });
  } else {
    console.error("legna: " + result.error.message);
    process.exit(1);
  }
}

process.exit(result.status === null ? 1 : result.status);
