import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { EP1_MANIFEST } from "@/content/episodes";
import { getSupabaseConfig, type SupabaseConfig } from "@/lib/env";
import type { EditorRepository, EpisodeRepository } from "@/lib/db/repository";
import {
  readRole,
  supabaseEditor,
  supabaseEpisodes,
  supabaseProgress,
} from "@/lib/db/supabase-repositories";
import type { ApiDeps, RequestUser } from "./deps";

/** Without a database the API still serves the bundled, validated Episode 1. */
const bundledEpisodes: EpisodeRepository = {
  listPublished: async () => [EP1_MANIFEST],
  getPublished: async (id) =>
    id === EP1_MANIFEST.episodeId ? EP1_MANIFEST : null,
};

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  const match = header ? /^Bearer (.+)$/i.exec(header) : null;
  return match ? match[1] : null;
}

/** A client that acts as the caller, so row-level security applies to every query. */
function clientFor(
  config: SupabaseConfig,
  request: Request,
): { client: SupabaseClient; token: string | null } {
  const token = bearerToken(request);
  if (token) {
    const client = createClient(config.url, config.anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return { client, token };
  }
  const cookies = parseCookieHeader(request.headers.get("cookie") ?? "").map(
    ({ name, value }) => ({
      name,
      value: value ?? "",
    }),
  );
  const client = createServerClient(config.url, config.anonKey, {
    cookies: { getAll: () => cookies, setAll: () => {} },
  });
  return { client, token: null };
}

async function authenticate(
  config: SupabaseConfig,
  request: Request,
): Promise<RequestUser | null> {
  const { client, token } = clientFor(config, request);
  const { data, error } = token
    ? await client.auth.getUser(token)
    : await client.auth.getUser();
  if (error || !data.user) return null;
  const userId = data.user.id;
  const editor: EditorRepository = supabaseEditor(client);
  return {
    userId,
    role: await readRole(client, userId),
    progress: supabaseProgress(client, userId),
    editor,
  };
}

export function createApiDeps(): ApiDeps {
  const config = getSupabaseConfig();
  if (!config) {
    return {
      episodes: bundledEpisodes,
      authenticate: async () => null,
      now: () => new Date(),
    };
  }
  const anon = createClient(config.url, config.anonKey, {
    auth: { persistSession: false },
  });
  return {
    episodes: supabaseEpisodes(anon),
    authenticate: (request) => authenticate(config, request),
    now: () => new Date(),
  };
}
