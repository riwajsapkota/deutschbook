"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VocabularyItem } from "@/types";

const POS_OPTIONS = ["noun", "verb", "adjective", "adverb", "preposition", "conjunction", "pronoun", "other"];
const ARTICLES = ["", "der", "die", "das"];

interface FormState {
  word: string;
  article: string;
  plural: string;
  translation: string;
  example_sentence: string;
  part_of_speech: string;
  tags: string;
}

const emptyForm: FormState = {
  word: "",
  article: "",
  plural: "",
  translation: "",
  example_sentence: "",
  part_of_speech: "noun",
  tags: "",
};

function formFromItem(v: VocabularyItem): FormState {
  return {
    word: v.word,
    article: v.article ?? "",
    plural: v.plural ?? "",
    translation: v.translation,
    example_sentence: v.example_sentence ?? "",
    part_of_speech: v.part_of_speech ?? "noun",
    tags: (v.tags ?? []).join(", "),
  };
}

export default function VocabClient({ initialVocab }: { initialVocab: VocabularyItem[] }) {
  const router = useRouter();
  const [vocab, setVocab] = useState(initialVocab);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const byPos = vocab.reduce<Record<string, VocabularyItem[]>>((acc, v) => {
    const key = v.part_of_speech || "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(v: VocabularyItem) {
    setEditingId(v.id);
    setForm(formFromItem(v));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  async function handleSave() {
    if (!form.word.trim() || !form.translation.trim()) return;
    setSaving(true);
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = {
      word: form.word.trim(),
      article: form.article || null,
      plural: form.plural || null,
      translation: form.translation.trim(),
      example_sentence: form.example_sentence.trim(),
      part_of_speech: form.part_of_speech,
      tags,
    };

    if (editingId) {
      await fetch(`/api/vocab/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setVocab((prev) =>
        prev.map((v) => (v.id === editingId ? { ...v, ...payload, tags } : v))
      );
    } else {
      const res = await fetch("/api/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const { id } = await res.json();
      setVocab((prev) => [
        ...prev,
        { id, chapter_id: null, created_at: new Date().toISOString(), ...payload, tags },
      ]);
    }

    setSaving(false);
    closeModal();
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/vocab/${id}`, { method: "DELETE" });
    setVocab((prev) => prev.filter((v) => v.id !== id));
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Vocabulary</h1>
        <button
          onClick={openAdd}
          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Add word
        </button>
      </div>
      <p className="text-slate-600 mb-8">{vocab.length} words across all chapters</p>

      {vocab.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-lg px-6 py-16 text-center text-slate-600">
          <p>No vocabulary yet. Process a session or add words manually.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byPos).map(([pos, words]) => (
            <section key={pos}>
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 capitalize">
                {pos}s ({words.length})
              </h2>
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-blue-900">Word</th>
                      <th className="text-left px-4 py-2 font-medium text-blue-900">Translation</th>
                      <th className="text-left px-4 py-2 font-medium text-blue-900 hidden lg:table-cell">Example</th>
                      <th className="text-left px-4 py-2 font-medium text-blue-900 hidden md:table-cell">Tags</th>
                      <th className="px-4 py-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {words.map((v, i) => (
                      <tr key={v.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="px-4 py-3 font-medium text-blue-900">
                          {v.article && <span className="text-slate-500 text-xs mr-1">{v.article}</span>}
                          {v.word}
                          {v.plural && <span className="text-slate-500 text-xs ml-1">({v.plural})</span>}
                        </td>
                        <td className="px-4 py-3 text-blue-900 font-medium">{v.translation}</td>
                        <td className="px-4 py-3 text-slate-700 italic hidden lg:table-cell">{v.example_sentence}</td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {(v.tags ?? []).map((t) => (
                            <span key={t} className="inline-block text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-1">
                              {t}
                            </span>
                          ))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => openEdit(v)}
                              className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                              title="Edit"
                            >
                              <PencilIcon />
                            </button>
                            <button
                              onClick={() => handleDelete(v.id)}
                              disabled={deletingId === v.id}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1 disabled:opacity-40"
                              title="Delete"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">{editingId ? "Edit word" : "Add word"}</h2>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Word *</label>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.word}
                    onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))}
                    placeholder="bemerken"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Article</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.article}
                    onChange={(e) => setForm((f) => ({ ...f, article: e.target.value }))}
                  >
                    {ARTICLES.map((a) => <option key={a} value={a}>{a || "—"}</option>)}
                  </select>
                </div>
                <div className="w-28">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Plural</label>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.plural}
                    onChange={(e) => setForm((f) => ({ ...f, plural: e.target.value }))}
                    placeholder="-e"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Translation *</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.translation}
                  onChange={(e) => setForm((f) => ({ ...f, translation: e.target.value }))}
                  placeholder="to notice, to realize"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Example sentence</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.example_sentence}
                  onChange={(e) => setForm((f) => ({ ...f, example_sentence: e.target.value }))}
                  placeholder="Ich habe bemerkt, dass er müde war."
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Part of speech</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.part_of_speech}
                    onChange={(e) => setForm((f) => ({ ...f, part_of_speech: e.target.value }))}
                  >
                    {POS_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tags (comma-separated)</label>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="irregular, modal"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.word.trim() || !form.translation.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : editingId ? "Save changes" : "Add word"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
