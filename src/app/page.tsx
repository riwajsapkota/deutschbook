import Link from "next/link";
import { sessions as sessionsDb, chapters as chaptersDb } from "@/lib/db";
import { Session, Chapter } from "@/types";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const recentSessions = (sessionsDb.getAll() as Session[]).slice(0, 5);
  const allChapters = chaptersDb.getAll() as Chapter[];

  const inboxCount = recentSessions.filter((s) => s.status === "inbox").length;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
      <p className="text-gray-500 mb-8">Your German learning at a glance</p>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <StatCard label="Chapters" value={allChapters.length} />
        <StatCard label="Sessions" value={recentSessions.length} />
        <StatCard label="In Inbox" value={inboxCount} accent={inboxCount > 0} />
      </div>

      <div className="grid grid-cols-2 gap-8">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Recent Sessions</h2>
            <Link href="/sessions/new" className="text-sm text-blue-600 hover:underline">
              + New
            </Link>
          </div>
          {recentSessions.length === 0 ? (
            <EmptyState>
              No sessions yet.{" "}
              <Link href="/sessions/new" className="text-blue-600 hover:underline">
                Add your first one.
              </Link>
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {recentSessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/sessions/${s.id}`}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-300 transition-colors"
                  >
                    <span className="font-medium text-sm">
                      {s.lecture_number ? `Lecture ${s.lecture_number} — ` : ""}
                      {s.date}
                    </span>
                    <StatusBadge status={s.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Chapters</h2>
            <Link href="/book" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          {allChapters.length === 0 ? (
            <EmptyState>No chapters yet. Process a session to get started.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {allChapters.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/book/${c.id}`}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-300 transition-colors"
                  >
                    <div>
                      <span className="font-medium text-sm">{c.title}</span>
                      <span className="ml-2 text-xs text-gray-400">{c.level}</span>
                    </div>
                    <span className="text-xs text-gray-400 capitalize">{c.category}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-10 flex gap-3">
        <Link
          href="/sessions/new"
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          New Session
        </Link>
        <Link
          href="/book"
          className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Browse Book
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`bg-white border rounded-lg px-5 py-4 ${accent ? "border-amber-300 bg-amber-50" : "border-gray-200"}`}>
      <div className={`text-2xl font-bold ${accent ? "text-amber-700" : "text-gray-900"}`}>{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    inbox: "bg-amber-100 text-amber-700",
    processed: "bg-green-100 text-green-700",
    partially_processed: "bg-orange-100 text-orange-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-dashed border-gray-300 rounded-lg px-4 py-6 text-sm text-gray-500 text-center">
      {children}
    </div>
  );
}
