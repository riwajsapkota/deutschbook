import Link from "next/link";
import { sessions as sessionsDb, chapters as chaptersDb, reviewSchedules } from "@/lib/db";
import { Session, Chapter } from "@/types";

export const dynamic = "force-dynamic";

interface ChapterHealth {
  id: string;
  total_exercises: number;
  overdue: number;
  due_soon: number;
}

export default function Dashboard() {
  const recentSessions = (sessionsDb.getAll() as Session[]).slice(0, 5);
  const allChapters = chaptersDb.getAll() as Chapter[];
  const now = new Date().toISOString();
  const dueCount = reviewSchedules.countDueNow(now);
  const healthRows = reviewSchedules.getChapterHealth() as ChapterHealth[];
  const healthMap = Object.fromEntries(healthRows.map((r) => [r.id, r]));

  const inboxCount = recentSessions.filter((s) => s.status === "inbox").length;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
      <p className="text-gray-600 mb-8">Your German learning at a glance</p>

      <div className="grid grid-cols-4 gap-4 mb-10">
        <StatCard label="Chapters" value={allChapters.length} />
        <StatCard label="Sessions" value={recentSessions.length} />
        <StatCard label="In Inbox" value={inboxCount} accent={inboxCount > 0} accentColor="amber" />
        <StatCard label="Due for Review" value={dueCount} accent={dueCount > 0} accentColor="blue" />
      </div>

      {/* Due for review CTA */}
      {dueCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-4 mb-8 flex items-center justify-between">
          <div>
            <p className="font-semibold text-blue-800">
              {dueCount} item{dueCount !== 1 ? "s" : ""} due for review
            </p>
            <p className="text-sm text-blue-600 mt-0.5">Keep your retention high — do a quick quiz.</p>
          </div>
          <Link
            href="/quiz"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shrink-0 ml-4"
          >
            Start Quiz
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-8">
        {/* Recent Sessions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Recent Sessions</h2>
            <Link href="/sessions/new" className="text-sm text-blue-600 hover:underline">+ New</Link>
          </div>
          {recentSessions.length === 0 ? (
            <EmptyState>
              No sessions yet.{" "}
              <Link href="/sessions/new" className="text-blue-600 hover:underline">Add your first one.</Link>
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {recentSessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/sessions/${s.id}`}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-300 transition-colors"
                  >
                    <span className="font-medium text-sm text-blue-900">
                      {s.lecture_number ? `Lecture ${s.lecture_number} — ` : ""}{s.date}
                    </span>
                    <StatusBadge status={s.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Chapter health */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Chapter Health</h2>
            <Link href="/book" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          {allChapters.length === 0 ? (
            <EmptyState>No chapters yet. Process a session to get started.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {allChapters.slice(0, 6).map((c) => {
                const h = healthMap[c.id];
                return (
                  <li key={c.id}>
                    <Link
                      href={`/book/${c.id}`}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <HealthDot health={h} />
                        <span className="font-medium text-sm truncate text-blue-900">{c.title}</span>
                      </div>
                      <span className="text-xs text-gray-600 shrink-0 ml-2">{c.level}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-10 flex gap-3">
        <Link href="/sessions/new" className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          New Session
        </Link>
        <Link href="/quiz" className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
          Quiz
        </Link>
        <Link href="/book" className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Browse Book
        </Link>
      </div>
    </div>
  );
}

function HealthDot({ health }: { health: ChapterHealth | undefined }) {
  if (!health || health.total_exercises === 0) {
    return <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" title="No exercises yet" />;
  }
  if (health.overdue > 0) {
    return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Overdue for review" />;
  }
  if (health.due_soon > 0) {
    return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Due for review soon" />;
  }
  return <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="All caught up" />;
}

function StatCard({ label, value, accent = false, accentColor = "amber" }: {
  label: string; value: number; accent?: boolean; accentColor?: "amber" | "blue";
}) {
  const colors = {
    amber: { border: "border-amber-300 bg-amber-50", text: "text-amber-700" },
    blue: { border: "border-blue-300 bg-blue-50", text: "text-blue-700" },
  };
  const c = colors[accentColor];
  return (
    <div className={`bg-white border rounded-lg px-5 py-4 ${accent ? c.border : "border-gray-200"}`}>
      <div className={`text-2xl font-bold ${accent ? c.text : "text-gray-900"}`}>{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
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
    <div className="bg-white border border-dashed border-gray-300 rounded-lg px-4 py-6 text-sm text-gray-600 text-center">
      {children}
    </div>
  );
}
