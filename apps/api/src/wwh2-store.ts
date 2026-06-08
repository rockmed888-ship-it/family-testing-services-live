import fs from "fs/promises";
import path from "path";
import pg from "pg";
import type { Wwh2Feedback } from "@secretlayer/shared";

export interface Wwh2FeedbackStore {
  load(): Promise<void>;
  add(entry: Wwh2Feedback): Promise<void>;
  getAll(): Promise<Wwh2Feedback[]>;
  count(): Promise<number>;
}

const DATA_DIR = process.env.WWH2_DATA_DIR ?? path.join(process.cwd(), "data");
const FEEDBACK_FILE = path.join(DATA_DIR, "wwh2-feedback.json");

const PG_SCHEMA = `
CREATE TABLE IF NOT EXISTS wwh2_feedback (
  id TEXT PRIMARY KEY,
  playbook_id TEXT NOT NULL,
  playbook_title TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  helpful BOOLEAN NOT NULL,
  comment TEXT,
  completed_steps INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL
);
`;

function rowToFeedback(row: pg.QueryResultRow): Wwh2Feedback {
  return {
    id: row.id,
    playbookId: row.playbook_id,
    playbookTitle: row.playbook_title,
    rating: row.rating,
    helpful: row.helpful,
    comment: row.comment ?? undefined,
    completedSteps: row.completed_steps,
    totalSteps: row.total_steps,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export class FileWwh2FeedbackStore implements Wwh2FeedbackStore {
  private entries = new Map<string, Wwh2Feedback>();

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(FEEDBACK_FILE, "utf8");
      const list = JSON.parse(raw) as Wwh2Feedback[];
      if (!Array.isArray(list)) return;
      for (const entry of list) {
        if (entry?.id) this.entries.set(entry.id, entry);
      }
      console.log(`WWH2: loaded ${this.entries.size} feedback entries from disk`);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        console.warn("WWH2 feedback load failed:", err);
      }
    }
  }

  async persist(): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const list = [...this.entries.values()].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    await fs.writeFile(FEEDBACK_FILE, `${JSON.stringify(list, null, 2)}\n`, "utf8");
  }

  async add(entry: Wwh2Feedback): Promise<void> {
    this.entries.set(entry.id, entry);
    await this.persist();
  }

  async getAll(): Promise<Wwh2Feedback[]> {
    return [...this.entries.values()];
  }

  async count(): Promise<number> {
    return this.entries.size;
  }
}

export class PostgresWwh2FeedbackStore implements Wwh2FeedbackStore {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    const useSsl = process.env.PGSSLMODE !== "disable" && process.env.NODE_ENV === "production";
    this.pool = new pg.Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
  }

  async load(): Promise<void> {
    await this.pool.query(PG_SCHEMA);
    await this.migrateFromFileIfEmpty();
    const count = await this.count();
    console.log(`WWH2: Postgres store ready (${count} feedback entries)`);
  }

  private async migrateFromFileIfEmpty(): Promise<void> {
    const existing = await this.count();
    if (existing > 0) return;

    const fileStore = new FileWwh2FeedbackStore();
    await fileStore.load();
    const legacy = await fileStore.getAll();
    if (legacy.length === 0) return;

    for (const entry of legacy) {
      await this.insert(entry);
    }
    console.log(`WWH2: migrated ${legacy.length} feedback entries from JSON file to Postgres`);
  }

  private async insert(entry: Wwh2Feedback): Promise<void> {
    await this.pool.query(
      `INSERT INTO wwh2_feedback (
        id, playbook_id, playbook_title, rating, helpful, comment,
        completed_steps, total_steps, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (id) DO NOTHING`,
      [
        entry.id,
        entry.playbookId,
        entry.playbookTitle,
        entry.rating,
        entry.helpful,
        entry.comment ?? null,
        entry.completedSteps,
        entry.totalSteps,
        entry.createdAt,
      ],
    );
  }

  async add(entry: Wwh2Feedback): Promise<void> {
    await this.insert(entry);
  }

  async getAll(): Promise<Wwh2Feedback[]> {
    const result = await this.pool.query(
      `SELECT * FROM wwh2_feedback ORDER BY created_at ASC`,
    );
    return result.rows.map(rowToFeedback);
  }

  async count(): Promise<number> {
    const result = await this.pool.query(`SELECT COUNT(*)::int AS count FROM wwh2_feedback`);
    return result.rows[0]?.count ?? 0;
  }
}

export async function createWwh2Store(): Promise<Wwh2FeedbackStore> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    return new PostgresWwh2FeedbackStore(databaseUrl);
  }
  console.log("WWH2: DATABASE_URL not set — using JSON file store");
  return new FileWwh2FeedbackStore();
}
