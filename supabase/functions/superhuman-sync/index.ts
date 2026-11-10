import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store"
};
const MAX_REQUEST_BYTES = 4 * 1024 * 1024;
const MAX_BASE64_CIPHERTEXT_LENGTH = 4 * 1024 * 1024;
const SYNC_ID_PATTERN = /^[0-9a-f]{64}$/;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function validEncryptedBlob(value: unknown): value is { v: number; iv: string; ciphertext: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const blob = value as Record<string, unknown>;
  return blob.v === 1
    && typeof blob.iv === "string"
    && BASE64_PATTERN.test(blob.iv)
    && blob.iv.length === 16
    && typeof blob.ciphertext === "string"
    && blob.ciphertext.length > 0
    && blob.ciphertext.length <= MAX_BASE64_CIPHERTEXT_LENGTH
    && BASE64_PATTERN.test(blob.ciphertext);
}

async function callRpc(name: string, parameters: Record<string, unknown>): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase Edge Function credentials are unavailable.");
  }

  return await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(parameters)
  });
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405);

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_REQUEST_BYTES) return respond({ error: "The sync request is too large." }, 413);

  let input: Record<string, unknown>;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
      return respond({ error: "The sync request is too large." }, 413);
    }
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return respond({ error: "The sync request is invalid." }, 400);
    }
    input = parsed as Record<string, unknown>;
  } catch {
    return respond({ error: "The sync request is not valid JSON." }, 400);
  }

  if (typeof input.syncId !== "string" || !SYNC_ID_PATTERN.test(input.syncId)) {
    return respond({ error: "The sync code is invalid." }, 400);
  }

  let rpcName: string;
  let parameters: Record<string, unknown>;
  switch (input.action) {
    case "get":
      rpcName = "superhuman_sync_get";
      parameters = { p_sync_id: input.syncId };
      break;
    case "put":
      if (!validEncryptedBlob(input.encryptedBlob)) {
        return respond({ error: "The encrypted backup is invalid or too large." }, 400);
      }
      rpcName = "superhuman_sync_put";
      parameters = { p_sync_id: input.syncId, p_encrypted_blob: input.encryptedBlob };
      break;
    case "delete":
      rpcName = "superhuman_sync_delete";
      parameters = { p_sync_id: input.syncId };
      break;
    default:
      return respond({ error: "The requested sync action is not supported." }, 400);
  }

  try {
    const result = await callRpc(rpcName, parameters);
    if (!result.ok) {
      console.error(`Superhuman sync database request failed (${result.status}).`);
      return respond({ error: "The private sync service could not complete that request." }, 502);
    }

    const value: unknown = await result.json();
    if (input.action === "get") {
      if (value === null) return respond({ exists: false });
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return respond({ error: "The stored backup could not be read." }, 502);
      }
      return respond({ exists: true, ...(value as Record<string, unknown>) });
    }
    if (input.action === "put") return respond({ saved: true, updatedAt: value });
    return respond({ deleted: value === true });
  } catch (error) {
    console.error("Superhuman sync request failed.", error);
    return respond({ error: "The private sync service is temporarily unavailable." }, 502);
  }
});
