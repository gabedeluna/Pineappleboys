import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sql } from "@vercel/postgres";

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

export async function GET() {
  await ensureTable();
  const { rows } = await sql<Song>`select * from songs order by created_at asc;`;
  return NextResponse.json({ songs: rows.map(normalizeRow) });
}

export async function POST(request: Request) {
  await ensureTable();
  const incoming = (await request.json().catch(() => ({}))) as Song;
  const song: Song = {
    id: incoming.id || randomUUID(),
    title: incoming.title || "Untitled Song",
    status: incoming.status === "future" ? "future" : "current",
    progress:
      typeof incoming.progress === "number"
        ? clamp(incoming.progress, 0, 100)
        : null,
    lyrics: incoming.lyrics || "",
    links: Array.isArray(incoming.links) ? incoming.links : [],
  };
  await sql`
    insert into songs (id, title, status, progress, lyrics, links)
    values (${song.id}, ${song.title}, ${song.status}, ${song.progress}, ${
      song.lyrics
    }, ${JSON.stringify(song.links)})
  `;
  return NextResponse.json({ song });
}

export async function PUT(request: Request) {
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

  const { rows } = await sql<Song>`
    update songs
    set
      title = coalesce(${updates.title}, title),
      status = coalesce(${status}, status),
      progress = coalesce(${progress}, progress),
      lyrics = coalesce(${updates.lyrics}, lyrics),
      links = coalesce(${updates.links ? JSON.stringify(updates.links) : null}, links),
      updated_at = now()
    where id = ${body.id}
    returning *;
  `;
  if (!rows[0]) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }
  return NextResponse.json({ song: normalizeRow(rows[0]) });
}

export async function DELETE(request: Request) {
  await ensureTable();
  const body = (await request.json().catch(() => ({}))) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await sql`delete from songs where id = ${body.id};`;
  return NextResponse.json({ ok: true });
}

async function ensureTable() {
  await sql`
    create table if not exists songs (
      id uuid primary key,
      title text not null,
      status text not null check (status in ('current','future')),
      progress integer,
      lyrics text,
      links jsonb default '[]'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
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
