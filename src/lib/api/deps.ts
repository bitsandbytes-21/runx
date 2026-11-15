import type {
  EditorRepository,
  EpisodeRepository,
  ProgressRepository,
} from "@/lib/db/repository";

export type Role = "runner" | "editor";

export interface RequestUser {
  userId: string;
  role: Role;
  progress: ProgressRepository;
  editor: EditorRepository;
}

/** Everything a handler needs, injected so tests use in-memory fakes. */
export interface ApiDeps {
  episodes: EpisodeRepository;
  /** Verifies the bearer token or session cookie; null when not signed in. */
  authenticate: (request: Request) => Promise<RequestUser | null>;
  now: () => Date;
}
