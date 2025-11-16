import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Pool } from "pg";

type Song = {
  id: string;
  title: string;
  status: "current" | "future";
  progress?: number;
  lyrics?: string;
  links?: { type: string; url: string; label?: string }[];
  created_at?: string;
  updated_at?: string;
};

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

export async function GET() {
  try {
    await ensureTable();
    const { rows } = await pool.query<Song>('select * from songs order by created_at asc');
    return NextResponse.json({ songs: rows.map(normalizeRow) });
  } catch (error) {
    console.error("GET /api/songs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch songs", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureTable();
    const incoming = (await request.json().catch(() => ({}))) as Song;
    const song: Song = {
      id: incoming.id || randomUUID(),
      title: incoming.title || "Untitled Song",
      status: incoming.status === "future" ? "future" : "current",
      progress:
        typeof incoming.progress === "number"
          ? clamp(incoming.progress, 0, 100)
          : undefined,
      lyrics: incoming.lyrics || "",
      links: Array.isArray(incoming.links) ? incoming.links : [],
    };
    await pool.query(
      'insert into songs (id, title, status, progress, lyrics, links) values ($1, $2, $3, $4, $5, $6)',
      [song.id, song.title, song.status, song.progress, song.lyrics, JSON.stringify(song.links)]
    );
    return NextResponse.json({ song });
  } catch (error) {
    console.error("POST /api/songs error:", error);
    return NextResponse.json(
      { error: "Failed to create song", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await ensureTable();
    const body = (await request.json().catch(() => ({}))) as {
      id?: string;
      updates?: Partial<Song>;
    };
    if (!body.id || !body.updates) {
      return NextResponse.json({ error: "Missing id or updates" }, { status: 400 });
    }
    const updates = body.updates;
    const progress =
      typeof updates.progress === "number"
        ? clamp(updates.progress, 0, 100)
        : undefined;
    const status =
      updates.status === "future" || updates.status === "current"
        ? updates.status
        : undefined;

    const { rows } = await pool.query<Song>(
      `update songs
       set
         title = coalesce($1, title),
         status = coalesce($2, status),
         progress = coalesce($3, progress),
         lyrics = coalesce($4, lyrics),
         links = coalesce($5, links),
         updated_at = now()
       where id = $6
       returning *`,
      [updates.title, status, progress, updates.lyrics, updates.links ? JSON.stringify(updates.links) : null, body.id]
    );
    if (!rows[0]) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }
    return NextResponse.json({ song: normalizeRow(rows[0]) });
  } catch (error) {
    console.error("PUT /api/songs error:", error);
    return NextResponse.json(
      { error: "Failed to update song", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureTable();
    const body = (await request.json().catch(() => ({}))) as { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await pool.query('delete from songs where id = $1', [body.id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/songs error:", error);
    return NextResponse.json(
      { error: "Failed to delete song", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

async function ensureTable() {
  await pool.query(`
    create table if not exists songs (
      id uuid primary key,
      title text not null,
      status text not null check (status in ('current','future')),
      progress integer,
      lyrics text,
      links jsonb default '[]'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
}

function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}

function normalizeRow(row: {
  id: string;
  title: string;
  status: "current" | "future";
  progress?: number | null;
  lyrics?: string | null;
  links?: unknown;
  created_at?: string;
  updated_at?: string;
}): Song {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    progress: row.progress ?? undefined,
    lyrics: row.lyrics ?? "",
    links: Array.isArray(row.links) ? row.links : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
