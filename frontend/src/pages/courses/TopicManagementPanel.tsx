import { useEffect, useState } from "react";
import { getTopics, createTopic, deleteTopic } from "../../api/topics";
import type { Topic, TopicCreate } from "../../types/topic";
import GenerationDialog from "./GenerationDialog";

interface Props {
  courseId: string;
  courseLanguage: string;
  isOwner: boolean;
}

export default function TopicManagementPanel({ courseId, courseLanguage, isOwner }: Props) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TopicCreate>({ name: "", description: "" });
  const [generatingTopicId, setGeneratingTopicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    getTopics(courseId)
      .then(setTopics)
      .finally(() => setLoading(false));
  };

  useEffect(load, [courseId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTopic(courseId, form);
    setForm({ name: "", description: "" });
    setShowForm(false);
    load();
  };

  const handleDelete = async (topicId: string) => {
    if (!confirm("Delete this topic?")) return;
    await deleteTopic(courseId, topicId);
    load();
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      {isOwner && (
        <div className="mb-4">
          {showForm ? (
            <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="e.g. Loops, Recursion, File I/O"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={form.description || ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                  Add Topic
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="border border-gray-300 px-4 py-2 rounded text-sm">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
            >
              + Add Topic
            </button>
          )}
        </div>
      )}

      {topics.length === 0 ? (
        <p className="text-gray-500 text-sm">No topics yet.</p>
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => (
            <div key={topic.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{topic.name}</h3>
                  {topic.description && <p className="text-sm text-gray-500 mt-1">{topic.description}</p>}
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setGeneratingTopicId(topic.id)}
                      className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs hover:bg-purple-700"
                    >
                      Generate Problems
                    </button>
                    <button
                      onClick={() => handleDelete(topic.id)}
                      className="text-red-600 hover:text-red-800 text-xs px-2 py-1.5"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {generatingTopicId === topic.id && (
                <GenerationDialog
                  topicId={topic.id}
                  topicName={topic.name}
                  courseLanguage={courseLanguage}
                  onClose={() => setGeneratingTopicId(null)}
                  onGenerated={load}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
