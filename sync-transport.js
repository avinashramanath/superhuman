((root, factory) => {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SuperhumanSyncTransport = factory();
})(globalThis, () => {
  "use strict";

  function createTransport(baseUrl, publishableKey, fetchRequest = fetch) {
    const root = baseUrl.replace(/\/+$/, "");
    const headers = { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` };

    async function request(path, options) {
      const response = await fetchRequest(`${root}${path}`, {
        ...options,
        headers: { ...headers, ...options.headers },
        cache: "no-store"
      });
      if (!response.ok) {
        const error = new Error(`Cloud sync request failed (${response.status}).`);
        error.status = response.status;
        throw error;
      }
      return response;
    }

    async function readRecords() {
      const records = Object.create(null);
      let after = "";
      for (;;) {
        const response = await request("/rest/v1/rpc/superhuman_public_read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ p_after: after, p_limit: 200 })
        });
        const page = await response.json();
        if (!Array.isArray(page) || page.length > 200) throw new Error("The cloud sync response is invalid.");
        for (const record of page) {
          if (!record || typeof record.record_key !== "string" || !record.record_key
            || Object.prototype.hasOwnProperty.call(records, record.record_key)) {
            throw new Error("The cloud sync response contains invalid records.");
          }
          records[record.record_key] = record;
        }
        if (page.length < 200) return records;
        const next = page[page.length - 1].record_key;
        if (next === after) throw new Error("The cloud sync response could not be paginated.");
        after = next;
      }
    }

    async function writeRecord(record, expectedRevision) {
      const response = await request("/rest/v1/rpc/superhuman_public_write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p_key: record.record_key,
          p_value: record.value,
          p_deleted: record.deleted,
          p_client_time: record.client_time,
          p_writer: record.writer,
          p_expected_revision: expectedRevision
        })
      });
      return response.json();
    }

    return { readRecords, writeRecord };
  }

  return { createTransport };
});
