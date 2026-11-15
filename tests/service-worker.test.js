"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

test("upgrading the shell preserves unrelated caches and installs the complete new shell", async () => {
  const handlers = {};
  const deleted = [];
  let shell;
  let claimed = false;
  const self = {
    addEventListener(type, handler) { handlers[type] = handler; },
    skipWaiting() {},
    clients: { async claim() { claimed = true; } },
    location: { origin: "https://example.test" }
  };
  const caches = {
    async open(name) {
      assert.equal(name, "superhuman-shell-v23");
      return { async addAll(files) { shell = files; } };
    },
    async keys() { return ["superhuman-shell-v22", "superhuman-shell-v23", "another-app"]; },
    async delete(name) { deleted.push(name); }
  };
  const source = fs.readFileSync(path.join(__dirname, "..", "service-worker.js"), "utf8");
  vm.runInNewContext(source, { self, caches, URL });
  let pending;
  handlers.install({ waitUntil(promise) { pending = promise; } });
  await pending;
  assert.ok(shell.includes("./auto-sync.js"));
  assert.ok(shell.includes("./sync-core.js"));
  assert.ok(shell.includes("./sync-transport.js"));
  handlers.activate({ waitUntil(promise) { pending = promise; } });
  await pending;
  assert.deepEqual(deleted, ["superhuman-shell-v22"]);
  assert.equal(claimed, true);
});
