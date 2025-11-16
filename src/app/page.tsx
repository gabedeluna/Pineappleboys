"use client";

import { useEffect, useMemo, useState, useCallback, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

type LinkEmbed = {
  type: "youtube" | "spotify" | "soundcloud" | "other";
  url: string;
  label?: string;
};

type Song = {
  id: string;
  title: string;
  status: "current" | "future";
  progress?: number;
  lyrics?: string;
  links?: LinkEmbed[];
};

type VarStyle = CSSProperties & { ["--p"]?: number };

const makeId = () => crypto.randomUUID();

export default function Home() {
  const [currentSongs, setCurrentSongs] = useState<Song[]>([]);
  const [futureSongs, setFutureSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const loadSongs = useCallback(async () => {
    try {
      const res = await fetch("/api/songs", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load songs");
      const data = (await res.json()) as { songs: Song[] };
      const curr = data.songs.filter((s) => s.status === "current");
      const fut = data.songs.filter((s) => s.status === "future");
      setCurrentSongs(curr);
      setFutureSongs(fut);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load songs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  const handleAddSong = async (status: "current" | "future") => {
    const newSong: Song = {
      id: makeId(),
      title: "Untitled Song",
      status,
      progress: status === "current" ? 10 : undefined,
      lyrics: "",
      links: [],
    };
    await saveSong(newSong);
    await loadSongs();
  };

  const handleUpdateSong = async (
    status: "current" | "future",
    id: string,
    updates: Partial<Song>,
  ) => {
    await persistSong({ id, ...updates });
    await loadSongs();
  };

  const handleDeleteSong = async (status: "current" | "future", id: string) => {
    await deleteSong(id);
    await loadSongs();
  };

  const persistSong = async (updates: Partial<Song> & { id: string }) => {
    await fetch("/api/songs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: updates.id, updates }),
    });
  };

  const saveSong = async (song: Song) => {
    await fetch("/api/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(song),
    });
  };

  const deleteSong = async (id: string) => {
    await fetch("/api/songs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  return (
    <div className="app">
      {loading && <p className="hint">Loading songs...</p>}
      {error && <p className="error-text">{error}</p>}

      <h1 className="section-title">Current Songs</h1>
      <section className="song-list">
        {currentSongs.map((song) => (
          <SongCard
            key={song.id}
            song={song}
            onChange={(updates) => handleUpdateSong("current", song.id, updates)}
            onDelete={() => handleDeleteSong("current", song.id)}
          />
        ))}
        <AddCard label="Add Song" onAdd={() => handleAddSong("current")} />
      </section>

      <h1 className="section-title">Future Songs</h1>
      <section className="song-list">
        {futureSongs.map((song) => (
          <SongCard
            key={song.id}
            song={song}
            onChange={(updates) => handleUpdateSong("future", song.id, updates)}
            onDelete={() => handleDeleteSong("future", song.id)}
          />
        ))}
        <AddCard label="Add Song" onAdd={() => handleAddSong("future")} />
      </section>

      <div className="bottom-bar">
        <button
          className="btn-pill logout-btn"
          onClick={async () => {
            await fetch("/api/logout", { method: "POST" });
            router.replace("/login");
          }}
        >
          Log Out
        </button>
      </div>
    </div>
  );
}

function SongCard({
  song,
  onChange,
  onDelete,
}: {
  song: Song;
  onChange: (updates: Partial<Song>) => void;
  onDelete: () => void;
}) {
  const [showLyrics, setShowLyrics] = useState(
    () => Boolean((song.lyrics || "").trim()),
  );
  const [showEmbed, setShowEmbed] = useState(
    () => Boolean((song.links?.[0]?.url || "").trim()),
  );
  const [editing, setEditing] = useState(false);
  const [progress, setProgress] = useState(song.progress || 5);
  const [title, setTitle] = useState(song.title);
  const [lyrics, setLyrics] = useState(song.lyrics || "");
  const [linkType, setLinkType] = useState<LinkEmbed["type"]>(
    song.links?.[0]?.type || "youtube",
  );
  const [linkUrl, setLinkUrl] = useState(song.links?.[0]?.url || "");
  const [progressTimeout, setProgressTimeout] = useState<NodeJS.Timeout | null>(null);

  const hasLyrics = useMemo(() => lyrics.trim().length > 0, [lyrics]);
  const hasLinks = useMemo(() => linkUrl.trim().length > 0, [linkUrl]);

  const normalizedProgress = useMemo(() => {
    if (song.status !== "current" || typeof progress !== "number") {
      return 0;
    }
    return Math.min(Math.max(progress, 5), 100);
  }, [progress, song.status]);
  const progressRatio = normalizedProgress / 100;

  const firstLink = song.links?.[0];

  return (
    <article className="song-card">
      <div className="song-header">
        <div className="song-title">{title}</div>
        <button
          className="edit-btn"
          onClick={() => setEditing((x) => !x)}
          aria-pressed={editing}
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      {editing && (
        <div className="edit-fields">
          <label className="field-label" htmlFor={`title-${song.id}`}>
            Title
          </label>
          <input
            id={`title-${song.id}`}
            className="input-field"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              onChange({ title: e.target.value });
            }}
          />

          <label className="field-label" htmlFor={`lyrics-${song.id}`}>
            Lyrics
          </label>
          <textarea
            id={`lyrics-${song.id}`}
            className="textarea-field"
            rows={4}
            value={lyrics}
            onChange={(e) => {
              setLyrics(e.target.value);
              onChange({ lyrics: e.target.value });
            }}
          />

          <label className="field-label">Link</label>
          <div className="link-row">
            <select
              className="input-field select-field"
              value={linkType}
              onChange={(e) => {
                const nextType = e.target.value as LinkEmbed["type"];
                setLinkType(nextType);
                onChange({
                  links: linkUrl
                    ? [{ type: nextType, url: linkUrl, label: nextType }]
                    : [],
                });
              }}
            >
              <option value="youtube">YouTube</option>
              <option value="spotify">Spotify</option>
              <option value="soundcloud">SoundCloud</option>
              <option value="other">Other</option>
            </select>
            <input
              className="input-field"
              placeholder="Embed/track URL"
              value={linkUrl}
              onChange={(e) => {
                const nextUrl = e.target.value;
                setLinkUrl(nextUrl);
                onChange({
                  links: nextUrl
                    ? [{ type: linkType, url: nextUrl, label: linkType }]
                    : [],
                });
              }}
            />
          </div>
        </div>
      )}

      {song.status === "current" && (
        <div className="song-meta-container">
          <div className="song-meta">
            <div
              className="song-meta-fill"
              style={
                {
                  width: "calc((100% - 16px) * var(--p) + 8px)",
                  "--p": progressRatio,
                } as VarStyle
              }
              aria-label={`Progress ${normalizedProgress || 5}%`}
            />
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={normalizedProgress || 5}
            className="progress-slider"
            onChange={(e) => {
              const next = Number(e.target.value);
              setProgress(next);

              // Clear existing timeout
              if (progressTimeout) {
                clearTimeout(progressTimeout);
              }

              // Debounce the save - only save after user stops dragging for 500ms
              const timeout = setTimeout(() => {
                onChange({ progress: next });
              }, 500);

              setProgressTimeout(timeout);
            }}
          />
        </div>
      )}

      <div className="song-actions">
        <button
          className="btn-pill"
          disabled={!hasLyrics}
          onClick={() => hasLyrics && setShowLyrics((state) => !state)}
          aria-pressed={showLyrics}
        >
          {hasLyrics ? (showLyrics ? "Hide Lyrics" : "Show Lyrics") : "Show Lyrics"}
        </button>

        <button
          className="btn-pill"
          disabled={!hasLinks}
          onClick={() => hasLinks && setShowEmbed((state) => !state)}
          aria-pressed={showEmbed}
        >
          {hasLinks ? (showEmbed ? "Hide Link" : "Show Link") : "Show Link"}
        </button>
      </div>

      {editing && (
        <div className="edit-actions">
          <button
            className="delete-btn"
            onClick={() => {
              const ok = window.confirm(
                "Delete this song? This cannot be undone.",
              );
              if (ok) onDelete();
            }}
            type="button"
          >
            Delete
          </button>
        </div>
      )}

      {showLyrics && hasLyrics && (
        <pre className="song-lyrics" style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>
          {lyrics}
        </pre>
      )}

      {showEmbed && firstLink && (
        <div className="song-link-embed">
          <div className="embed-player">
            <LinkPlayer link={firstLink} />
          </div>
        </div>
      )}
    </article>
  );
}

function AddCard({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <button className="song-card add-card" onClick={onAdd}>
      <div className="add-card-content">
        <span className="add-icon">+</span>
        <span className="add-label">{label}</span>
      </div>
    </button>
  );
}

function LinkPlayer({ link }: { link: LinkEmbed }) {
  if (link.type === "youtube") {
    const embedUrl = normalizeYouTubeUrl(link.url);
    return (
      <iframe
        width="100%"
        height="215"
        src={embedUrl}
        title={link.label || "YouTube player"}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (link.type === "spotify") {
    return (
      <iframe
        title={link.label || "Spotify player"}
        src={link.url}
        width="100%"
        height="152"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    );
  }

  if (link.type === "soundcloud") {
    return (
      <iframe
        width="100%"
        height="166"
        scrolling="no"
        frameBorder="no"
        allow="autoplay"
        src={link.url}
        title={link.label || "SoundCloud player"}
      />
    );
  }

  return (
    <a href={link.url} target="_blank" rel="noreferrer">
      {link.label || link.url}
    </a>
  );
}

function normalizeYouTubeUrl(raw: string) {
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");

    const addQuery = (videoId: string) => {
      const params = new URLSearchParams();
      params.set("rel", "0");
      const list = url.searchParams.get("list");
      if (list) params.set("list", list);
      return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    };

    if (host === "youtu.be") {
      const videoId = url.pathname.slice(1);
      if (videoId) return addQuery(videoId);
    }

    if (host.endsWith("youtube.com")) {
      const videoId =
        url.searchParams.get("v") ||
        url.pathname.split("/").filter(Boolean).pop();
      if (videoId) return addQuery(videoId);
    }
  } catch {
    // fall through
  }
  return raw;
}
