import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTopics, createTopic, deleteTopic } from "../../api/topics";
import type { Topic } from "../../types/topic";
import GenerationDialog from "./GenerationDialog";

interface Props {
  courseId: string;
  courseLanguage: string;
  isOwner: boolean;
}

export default function TopicManagementPanel({ courseId, courseLanguage, isOwner }: Props) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [generatingTopicId, setGeneratingTopicId] = useState<string | null>(null);

  const reload = () => {
    getTopics(courseId).then(setTopics).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [courseId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createTopic(courseId, { name: newName, description: newDesc });
      setNewName("");
      setNewDesc("");
      setShowForm(false);
      reload();
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5">
            <div className="skeleton h-5 w-1/3 mb-2" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {isOwner && (
        <div className="mb-5">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-lime text-[#FDFAF5] px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-lime-hover transition-all duration-200 hover:shadow-[0_0_20px_var(--color-lime-glow)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Topic
            </button>
          ) : (
            <form onSubmit={handleCreate} className="rounded-xl border border-lime/20 bg-lime-dim p-5 animate-fade-in">
              <h4 className="font-display font-bold text-sm text-lime mb-4">New Topic</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors"
                  placeholder="Topic name (e.g. Loops, Recursion...)"
                  required
                />
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors resize-none"
                  rows={2}
                  placeholder="Brief description (optional)"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="bg-lime text-[#FDFAF5] px-4 py-2 rounded-lg text-sm font-bold hover:bg-lime-hover disabled:opacity-50 transition-all"
                  >
                    {creating ? "Creating..." : "Create Topic"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-lg text-sm text-text-secondary border border-border hover:border-surface-3 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {topics.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface/50 p-10 text-center">
          <p className="text-text-secondary font-medium">No topics yet</p>
          <p className="text-text-tertiary text-sm mt-1">Topics organize problems by concept. Add your first topic above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => (
            <div key={topic.id} className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <Link
                  to={`/problems?course_id=${courseId}&topic_id=${topic.id}`}
                  className="group/topic"
                >
                  <h3 className="font-display font-bold text-text-primary group-hover/topic:text-lime transition-colors flex items-center gap-2">
                    {topic.name}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover/topic:opacity-100 transition-opacity">
                      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                    </svg>
                  </h3>
                  {topic.description && (
                    <p className="text-sm text-text-tertiary mt-0.5">{topic.description}</p>
                  )}
                </Link>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGeneratingTopicId(generatingTopicId === topic.id ? null : topic.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                        generatingTopicId === topic.id
                          ? "bg-info/20 text-info"
                          : "bg-surface-2 text-text-secondary hover:text-info hover:bg-info/10"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        Generate
                      </span>
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete topic "${topic.name}"?`)) return;
                        await deleteTopic(courseId, topic.id);
                        reload();
                      }}
                      className="text-error/50 hover:text-error text-xs font-medium px-2 py-1.5 transition-colors"
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
                  onGenerated={reload}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
