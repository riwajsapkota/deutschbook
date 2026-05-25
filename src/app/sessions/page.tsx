import Link from "next/link";
import { sessions as sessionsDb } from "@/lib/db";
import { Session } from "@/types";

export const dynamic = "force-dynamic";

export default function SessionsPage() {
  const all = sessionsDb.getAll() as Session[];

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <Link
          href="/sessions/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + New Session
        </Link>
      </div>

      {all.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg px-6 py-12 text-center text-gray-500">
          <p className="mb-3">No sessions yet.</p>
          <Link href="/sessions/new" className="text-blue-600 hover:underline text-sm">
            Create your first session
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {all.map((s) => (
            <li key={s.id}>
              <Link
                href={`/sessions/${s.id}`}
                className="flex items-start justify-between bg-white border border-gray-200 rounded-lg px-5 py-4 hover:border-blue-300 transition-colors"
              >
                <div>
                  <div className="font-medium">
                    {s.lecture_number ? `Lecture ${s.lecture_number} — ` : ""}
                    {s.date}
                  </div>
                  {s.raw_notes && (
                    <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                      {s.raw_notes}
                    </div>
                  )}
                </div>
                <StatusBadge status={s.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
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
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-3 ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
