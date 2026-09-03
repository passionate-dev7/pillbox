/**
 * Case-state backends, chosen at runtime from env var NAMES only. No value is
 * ever logged. No new dependencies: every remote backend is plain `fetch`
 * against its documented REST API.
 *
 * Every backend is append-only and versioned. A case version is written once,
 * to its own key, and a write of a version that already exists fails instead
 * of overwriting. That is the optimistic-concurrency check, and on Vercel Blob
 * it also sidesteps the CDN: a version is a new immutable URL, so a read never
 * sees a 60-second-stale copy of a pathname that was overwritten.
 */
import type { CaseState } from "@/lib/types";

export type BackendName = "upstash-redis" | "vercel-kv" | "vercel-blob" | "memory";

export interface StoreBackend {
  name: BackendName;
  detail: string;
  read(id: string): Promise<CaseState | null>;
  /** false means that version already exists: someone else wrote first. */
  write(caseState: CaseState): Promise<boolean>;
  listIds(): Promise<string[]>;
}

const pad = (v: number) => String(v).padStart(6, "0");

/* ------------------------------------------------------------------ */
/* Upstash / Vercel KV (identical REST protocol)                       */
/* ------------------------------------------------------------------ */

function redisRest(name: BackendName, url: string, token: string): StoreBackend {
  const base = url.replace(/\/$/, "");
  async function cmd<T>(args: (string | number)[]): Promise<T> {
    const res = await fetch(base, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`store: ${name} ${String(args[0])} failed with HTTP ${res.status}`);
    }
    const json = (await res.json()) as { result?: T; error?: string };
    if (json.error) throw new Error(`store: ${name} error: ${json.error}`);
    return json.result as T;
  }
  const key = (id: string, v: number) => `oos:case:${id}:v${pad(v)}`;
  const head = (id: string) => `oos:case:${id}:head`;

  return {
    name,
    detail: `${new URL(base).host} (REST, SET NX per version)`,
    async read(id) {
      const v = await cmd<string | null>(["GET", head(id)]);
      if (!v) return null;
      const raw = await cmd<string | null>(["GET", key(id, Number(v))]);
      return raw ? (JSON.parse(raw) as CaseState) : null;
    },
    async write(caseState) {
      const ok = await cmd<string | null>([
        "SET",
        key(caseState.id, caseState.version),
        JSON.stringify(caseState),
        "NX",
      ]);
      if (!ok) return false;
      await cmd(["SET", head(caseState.id), String(caseState.version)]);
      return true;
    },
    async listIds() {
      const keys = (await cmd<string[]>(["KEYS", "oos:case:*:head"])) ?? [];
      return keys.map((k) => k.slice("oos:case:".length, -":head".length));
    },
  };
}

/* ------------------------------------------------------------------ */
/* Vercel Blob: one immutable blob per case version                    */
/* ------------------------------------------------------------------ */

const BLOB_API = "https://blob.vercel-storage.com";

type BlobRow = { pathname: string; url: string };

function vercelBlob(token: string): StoreBackend {
  const auth = { Authorization: `Bearer ${token}`, "x-api-version": "7" };
  // Per-instance memo so the 2s SSE poll costs one list() and no body fetch
  // when nothing has changed.
  const memo = new Map<string, { version: number; caseState: CaseState }>();

  async function list(prefix: string): Promise<BlobRow[]> {
    const res = await fetch(`${BLOB_API}/?prefix=${encodeURIComponent(prefix)}&limit=1000`, {
      headers: auth,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`store: blob list failed with HTTP ${res.status}`);
    const json = (await res.json()) as { blobs?: BlobRow[] };
    return json.blobs ?? [];
  }

  const versionOf = (pathname: string) => Number(pathname.split("/").pop()?.replace(".json", ""));

  return {
    name: "vercel-blob",
    detail: "blob.vercel-storage.com (REST, immutable cases/<id>/<version>.json)",
    async read(id) {
      const rows = await list(`cases/${id}/`);
      if (rows.length === 0) return null;
      let best: BlobRow | null = null;
      let bestVersion = -1;
      for (const r of rows) {
        const v = versionOf(r.pathname);
        if (Number.isFinite(v) && v > bestVersion) {
          bestVersion = v;
          best = r;
        }
      }
      if (!best) return null;
      const cached = memo.get(id);
      if (cached && cached.version === bestVersion) return cached.caseState;
      const res = await fetch(best.url, { cache: "no-store" });
      if (!res.ok) throw new Error(`store: blob get failed with HTTP ${res.status}`);
      const caseState = (await res.json()) as CaseState;
      memo.set(id, { version: bestVersion, caseState });
      return caseState;
    },
    async write(caseState) {
      const pathname = `cases/${caseState.id}/${pad(caseState.version)}.json`;
      const res = await fetch(`${BLOB_API}/${pathname}`, {
        method: "PUT",
        headers: {
          ...auth,
          "x-content-type": "application/json",
          "x-add-random-suffix": "0",
          "x-cache-control-max-age": "31536000",
        },
        body: JSON.stringify(caseState),
      });
      if (res.status === 409) return false;
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (/already exists/i.test(body)) return false;
        throw new Error(`store: blob put failed with HTTP ${res.status}. ${body.slice(0, 200)}`);
      }
      memo.set(caseState.id, { version: caseState.version, caseState });
      return true;
    },
    async listIds() {
      const rows = await list("cases/");
      return [...new Set(rows.map((r) => r.pathname.split("/")[1]).filter(Boolean))];
    },
  };
}

/* ------------------------------------------------------------------ */
/* In-memory (dev only)                                                */
/* ------------------------------------------------------------------ */

const globalMem = globalThis as unknown as { __oosMem?: Map<string, CaseState> };

function memory(): StoreBackend {
  globalMem.__oosMem ??= new Map<string, CaseState>();
  const map = globalMem.__oosMem;
  return {
    name: "memory",
    detail: "process-local Map, lost on restart, not shared between serverless instances",
    async read(id) {
      return map.get(id) ?? null;
    },
    async write(caseState) {
      const existing = map.get(caseState.id);
      if (existing && existing.version >= caseState.version) return false;
      map.set(caseState.id, caseState);
      return true;
    },
    async listIds() {
      return [...map.keys()];
    },
  };
}

/* ------------------------------------------------------------------ */
/* Selection                                                           */
/* ------------------------------------------------------------------ */

const globalBackend = globalThis as unknown as { __oosBackend?: StoreBackend };

/**
 * The same REST credential precedence `backend()` uses (Upstash first, then Vercel KV), exposed
 * so `src/lib/store/ratelimit.ts` can issue its own INCR/EXPIRE commands against the identical
 * store without duplicating env-var precedence or minting a second CaseState-shaped backend.
 */
export function redisRestCredentials(): { url: string; token: string } | null {
  const env = process.env;
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return { url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN };
  }
  if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) {
    return { url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN };
  }
  return null;
}

export function backend(): StoreBackend {
  if (globalBackend.__oosBackend) return globalBackend.__oosBackend;

  const env = process.env;
  let chosen: StoreBackend;

  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    chosen = redisRest("upstash-redis", env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
  } else if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) {
    chosen = redisRest("vercel-kv", env.KV_REST_API_URL, env.KV_REST_API_TOKEN);
  } else if (env.BLOB_READ_WRITE_TOKEN) {
    chosen = vercelBlob(env.BLOB_READ_WRITE_TOKEN);
  } else {
    chosen = memory();
    console.warn(
      "[webmcp-two-agent-spine] STORE BACKEND = in-memory Map. Case state is NOT shared " +
        "between processes and is lost on restart. Set BLOB_READ_WRITE_TOKEN (production), or " +
        "UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or KV_REST_API_URL + " +
        "KV_REST_API_TOKEN, to use a real backend.",
    );
  }

  globalBackend.__oosBackend = chosen;
  return chosen;
}
