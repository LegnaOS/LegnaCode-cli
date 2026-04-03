#!/usr/bin/env node
"use strict";

/**
 * postinstall: ensure the correct platform binary package is installed.
 * npm's optionalDependencies with os/cpu filters often fails on Windows
 * and with non-standard registries. This script fixes that.
 */

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
if (!pkg) process.exit(0); // unsupported platform, skip silently

var binName = process.platform === "win32" ? "legna.exe" : "bin/legna";

// Check if platform package is already available
function isInstalled() {
  try {
    var p = path.resolve(require.resolve(pkg + "/package.json"), "..", binName);
    if (fs.existsSync(p)) return true;
  } catch (e) {}

  // Check sibling in global/local node_modules
  var scopeDir = path.resolve(__dirname, "..", "..");
  var pkgName = pkg.split("/")[1];
  if (fs.existsSync(path.resolve(scopeDir, pkgName, binName))) return true;

  // Check nested
  var nested = path.resolve(__dirname, "..", "node_modules", pkg, binName);
  if (fs.existsSync(nested)) return true;

  return false;
}

if (isInstalled()) process.exit(0);

// Not installed — fetch it from official npm registry
var version;
try {
  version = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf-8")).version;
} catch (e) {
  version = "latest";
}

console.log("Installing platform binary " + pkg + "@" + version + "...");

// Use official registry to avoid mirror sync delays
var result = childProcess.spawnSync(
  "npm",
  ["install", "--no-save", pkg + "@" + version, "--registry", "https://registry.npmjs.org"],
  {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    shell: true,
  }
);

if (result.status !== 0) {
  // Try global install as fallback
  var result2 = childProcess.spawnSync(
    "npm",
    ["install", "-g", pkg + "@" + version, "--registry", "https://registry.npmjs.org"],
    { stdio: "inherit", shell: true }
  );
  if (result2.status !== 0) {
    console.error("Warning: could not install " + pkg + ". Run manually:");
    console.error("  npm install -g " + pkg + "@" + version + " --registry https://registry.npmjs.org");
  }
}
