import fs from "fs/promises";
import path from "path";
import type { Wwh2Feedback } from "@secretlayer/shared";

const DATA_DIR = process.env.WWH2_DATA_DIR ?? path.join(process.cwd(), "data");
const FEEDBACK_FILE = path.join(DATA_DIR, "wwh2-feedback.json");

export class Wwh2FeedbackStore {
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

  add(entry: Wwh2Feedback): Promise<void> {
    this.entries.set(entry.id, entry);
    return this.persist();
  }

  getAll(): Wwh2Feedback[] {
    return [...this.entries.values()];
  }

  get size(): number {
    return this.entries.size;
  }
}
