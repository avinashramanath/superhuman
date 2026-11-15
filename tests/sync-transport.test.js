"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createTransport } = require("../sync-transport.js");

test("reads every record page without re-uploading data", async () => {
  const requests = [];
  const first = Array.from({ length: 200 }, (_, index) => ({ record_key: `key-${String(index).padStart(3, "0")}` }));
  const fetchRequest = async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify(requests.length === 1 ? first : [{ record_key: "key-200" }]));
  };
  const transport = createTransport("https://example.test", "public-key", fetchRequest);
  const records = await transport.readRecords();
  assert.equal(Object.keys(records).length, 201);
  assert.equal(JSON.parse(requests[1].options.body).p_after, "key-199");
  assert.equal(requests[0].options.headers.apikey, "public-key");
});

test("propagates cloud failures instead of reporting success", async () => {
  const transport = createTransport("https://example.test", "key", async () => new Response("", { status: 503 }));
  await assert.rejects(transport.readRecords(), /503/);
});

test("writes a record with its expected revision", async () => {
  let body;
  const transport = createTransport("https://example.test", "key", async (_, options) => {
    body = JSON.parse(options.body);
    return new Response(JSON.stringify({ applied: true }));
  });
  const record = { record_key: '["name"]', value: "A", deleted: false, client_time: 2, writer: "a" };
  assert.deepEqual(await transport.writeRecord(record, 4), { applied: true });
  assert.equal(body.p_expected_revision, 4);
  assert.equal(body.p_key, record.record_key);
});
