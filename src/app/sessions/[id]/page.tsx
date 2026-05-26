"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Material {
  id: string;
  original_filename: string;
  file_type: string;
  processing_status: string;
  uploaded_at: string;
}

interface Session {
  id: string;
  date: string;
  lecture_number: number | null;
  raw_notes: string | null;
  status: string;
  created_at: string;
  materials: Material[];
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [actioning, setActioning] = useState(false);

  const fetchSession = useCallback(async () => {
    const res = await fetch(`/api/sessions/${id}`);
    if (res.ok) {
      const data = await res.json();
      setSession(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Poll while processing
  useEffect(() => {
    if (!session) return;
    if (session.status !== "inbox") return;

    const interval = setInterval(fetchSession, 3000);
    return () => clearInterval(interval);
  }, [session, fetchSession]);

  const handleProcess = async () => {
    setProcessing(true);
    await fetch(`/api/sessions/${id}/process`, { method: "POST" });
    setSession((s) => s ? { ...s, status: "inbox" } : s);
    fetchSession();
  };

  const handleRetry = async () => {
    setActioning(true);
    const res = await fetch(`/api/sessions/${id}`, { method: "PATCH" });
    if (res.ok) {
      await fetchSession();
    }
    setActioning(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this session and all its uploaded files? This cannot be undone.")) return;
    setActioning(true);
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/sessions");
    } else {
      const body = await res.json();
      alert(body.error ?? "Could not delete session.");
      setActioning(false);
    }
  };

  if (loading) return <div className="p-10 text-gray-600">Loading...</div>;
  if (!session) return <div className="p-10 text-gray-600">Session not found.</div>;

  const isInbox = session.status === "inbox";
  const isPartial = session.status === "partially_processed";

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <Link href="/sessions" className="hover:underline">Sessions</Link>
        <span>/</span>
        <span>
          {session.lecture_number ? `Lecture ${session.lecture_number} — ` : ""}
          {session.date}
        </span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {session.lecture_number ? `Lecture ${session.lecture_number}` : "Session"} — {session.date}
          </h1>
          <StatusBadge status={session.status} className="mt-2" />
        </div>

        <div className="flex items-center gap-2">
          {isInbox && session.materials.length > 0 && (
            <button
              onClick={handleProcess}
              disabled={processing || actioning}
              className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {processing ? "Processing..." : "Process with AI"}
            </button>
          )}
          {isPartial && (
            <button
              onClick={handleRetry}
              disabled={actioning}
              className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {actioning ? "Resetting..." : "Retry Processing"}
            </button>
          )}
          {(isInbox || isPartial) && (
            <button
              onClick={handleDelete}
              disabled={actioning}
              className="border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {session.raw_notes && (
        <section className="mb-6">
          <h2 className="font-semibold mb-2">Notes</h2>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">
            {session.raw_notes}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-3">
          Materials ({session.materials.length})
        </h2>
        {session.materials.length === 0 ? (
          <p className="text-sm text-gray-600">No files uploaded for this session.</p>
        ) : (
          <ul className="space-y-2">
            {session.materials.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <FileIcon type={m.file_type} />
                  <div>
                    <div className="text-sm font-medium">{m.original_filename}</div>
                    <div className="text-xs text-gray-600 capitalize">{m.file_type}</div>
                  </div>
                </div>
                <ProcessingBadge status={m.processing_status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {session.status === "processed" && (
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          Session processed successfully.{" "}
          <Link href="/book" className="font-medium underline">
            View your Book
          </Link>{" "}
          to see the updated chapters.
        </div>
      )}

      <div className="mt-8">
        <button
          onClick={() => router.push("/sessions/new")}
          className="text-sm text-blue-600 hover:underline"
        >
          + Add another session
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const colors: Record<string, string> = {
    inbox: "bg-amber-100 text-amber-700",
    processed: "bg-green-100 text-green-700",
    partially_processed: "bg-orange-100 text-orange-700",
  };
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] ?? "bg-gray-100 text-gray-600"} ${className}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ProcessingBadge({ status }: { status: string }) {
  const styles: Record<string, { color: string; label: string }> = {
    pending:    { color: "bg-gray-100 text-gray-700",   label: "uploaded" },
    processing: { color: "bg-blue-100 text-blue-700",   label: "processing…" },
    processed:  { color: "bg-green-100 text-green-700", label: "processed" },
    failed:     { color: "bg-red-100 text-red-700",     label: "failed" },
  };
  const { color, label } = styles[status] ?? { color: "bg-gray-100 text-gray-600", label: status };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {label}
    </span>
  );
}

function FileIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    pdf: "📄",
    excel: "📊",
    audio: "🎵",
    image: "🖼️",
    text: "📝",
  };
  return <span className="text-lg">{icons[type] ?? "📎"}</span>;
}
