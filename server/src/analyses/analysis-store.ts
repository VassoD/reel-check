import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Analysis, AnalysisStatus, AnalysisSummary } from "@/analyses/analysis-types";
import { config } from "@/config";
import { LEGACY_DEFAULT_MODEL } from "@/research/research-models";

const IN_PROGRESS_STATUSES: AnalysisStatus[] = ["queued", "downloading", "transcribing", "breaking_down", "investigating"];

interface AnalysisRow {
  data: string;
}

/**
 * Analyses are stored as one JSON document per row: the app always reads them whole, and the
 * shape is still changing, so columns exist only for what queries filter or sort on.
 */
export class AnalysisStore {
  private readonly db: Database;

  constructor(dbPath: string) {
    mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath, { create: true, strict: true });
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        source_url TEXT NOT NULL,
        status TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_analyses_source_url ON analyses (source_url);
      CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses (created_at);
    `);
  }

  save(analysis: Analysis): void {
    analysis.updatedAt = new Date().toISOString();
    this.db
      .query(
        `INSERT INTO analyses (id, source_url, status, data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET status = excluded.status, data = excluded.data, updated_at = excluded.updated_at`,
      )
      .run(
        analysis.id,
        analysis.sourceUrl,
        analysis.status,
        JSON.stringify(analysis),
        analysis.createdAt,
        analysis.updatedAt,
      );
  }

  findById(id: string): Analysis | null {
    const row = this.db
      .query<AnalysisRow, [string]>("SELECT data FROM analyses WHERE id = ? AND deleted_at IS NULL")
      .get(id);
    return row ? (parseStoredAnalysis(row.data)) : null;
  }

  /** The newest analysis of this URL that has not failed, so re-sharing a Reel reuses the work. */
  findReusableBySourceUrl(sourceUrl: string): Analysis | null {
    const row = this.db
      .query<AnalysisRow, [string]>(
        `SELECT data FROM analyses
         WHERE source_url = ? AND status != 'failed' AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(sourceUrl);
    return row ? (parseStoredAnalysis(row.data)) : null;
  }

  list(limit: number, offset: number): { items: AnalysisSummary[]; total: number } {
    const rows = this.db
      .query<AnalysisRow, [number, number]>(
        "SELECT data FROM analyses WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?",
      )
      .all(limit, offset);
    const countRow = this.db
      .query<{ total: number }, []>("SELECT COUNT(*) AS total FROM analyses WHERE deleted_at IS NULL")
      .get();
    return { items: rows.map((row) => toSummary(parseStoredAnalysis(row.data))), total: countRow?.total ?? 0 };
  }

  softDelete(id: string): boolean {
    const result = this.db
      .query("UPDATE analyses SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL")
      .run(new Date().toISOString(), id);
    return result.changes > 0;
  }

  /** Analyses run in-process, so any left in progress at startup were cut off by a restart. */
  failInterrupted(): number {
    const placeholders = IN_PROGRESS_STATUSES.map(() => "?").join(", ");
    const rows = this.db
      .query<AnalysisRow, string[]>(`SELECT data FROM analyses WHERE status IN (${placeholders})`)
      .all(...IN_PROGRESS_STATUSES);
    for (const row of rows) {
      const analysis = parseStoredAnalysis(row.data);
      analysis.status = "failed";
      analysis.error = { code: "INTERRUPTED", message: "The server restarted during this analysis. Share it again." };
      this.save(analysis);
    }
    return rows.length;
  }
}

function parseStoredAnalysis(data: string): Analysis {
  const stored = JSON.parse(data) as Omit<Analysis, "model"> & { model?: string };
  return { ...stored, model: stored.model ?? LEGACY_DEFAULT_MODEL };
}

function toSummary(analysis: Analysis): AnalysisSummary {
  return {
    id: analysis.id,
    sourceUrl: analysis.sourceUrl,
    status: analysis.status,
    createdAt: analysis.createdAt,
    model: analysis.model,
    topic: analysis.breakdown?.topic ?? null,
    author: analysis.source?.author ?? null,
    thumbnailUrl: analysis.source?.thumbnailUrl ?? null,
    claimCount: analysis.breakdown?.claims.length ?? 0,
  };
}

export const analysisStore = new AnalysisStore(path.join(config.DATA_DIR, "reel-check.sqlite"));
