import { useState, useRef } from "react";
import { generateProblemsStream } from "../../api/generation";
import type { GenerationRequest, Problem } from "../../types/problem";
import type { GenerationEvent } from "../../api/generation";

interface Props {
  topicId: string;
  topicName: string;
  courseLanguage: string;
  onClose: () => void;
  onGenerated: () => void;
}

interface LogEntry {
  message: string;
  type: "info" | "success" | "error";
  timestamp: Date;
}

export default function GenerationDialog({ topicId, topicName, courseLanguage, onClose, onGenerated }: Props) {
  const [form, setForm] = useState<Omit<GenerationRequest, "topic_id">>({
    num_problems: 3,
    difficulty: "easy",
    test_type: "stdin_stdout",
    num_test_cases: 3,
    language: courseLanguage,
    custom_instructions: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState<Problem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [phase, setPhase] = useState<string>("");
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [...prev, { message, type, timestamp: new Date() }]);
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setLogs([]);
    setGenerated([]);
    setPhase("");
    setProgress(null);
    setDone(false);

    const controller = generateProblemsStream(
      { ...form, topic_id: topicId },
      (event: GenerationEvent) => {
        switch (event.type) {
          case "status":
            setPhase(event.data.phase || "");
            if (event.data.current && event.data.total) {
              setProgress({ current: event.data.current, total: event.data.total });
            }
            addLog(event.data.message || "", "info");
            break;
          case "problem_saved":
            if (event.data.problem) {
              setGenerated((prev) => [...prev, event.data.problem!]);
            }
            if (event.data.current && event.data.total) {
              setProgress({ current: event.data.current, total: event.data.total });
            }
            addLog(`Saved: ${event.data.problem?.title || "problem"}`, "success");
            break;
          case "done":
            setDone(true);
            setLoading(false);
            setPhase("done");
            addLog(event.data.message || "Done!", "success");
            onGenerated();
            break;
          case "error":
            setError(event.data.message || "Generation failed");
            setLoading(false);
            addLog(event.data.message || "Error", "error");
            break;
        }
      },
    );
    abortRef.current = controller;
  };

  const handleCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
    if (!done && generated.length === 0) {
      onClose();
    }
  };

  const update = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  // Active generation view with live logs
  if (loading || done || generated.length > 0) {
    return (
      <div className="border-t border-border px-5 py-5 bg-info-dim/30 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-display font-bold text-sm flex items-center gap-2">
            {done ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className="text-success">Generation Complete</span>
              </>
            ) : (
              <>
                <svg className="animate-spin text-info" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span className="text-info">Generating for "{topicName}"</span>
              </>
            )}
          </h4>
          {done && (
            <button onClick={onClose} className="text-sm text-text-tertiary hover:text-text-primary transition-colors">
              Close
            </button>
          )}
        </div>

        {/* Progress bar */}
        {progress && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-text-tertiary mb-1.5">
              <span>{phase === "calling_llm" ? "Waiting for AI..." : `Problem ${progress.current} of ${progress.total}`}</span>
              <span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                  backgroundColor: done ? "var(--color-success)" : "var(--color-info)",
                }}
              />
            </div>
          </div>
        )}

        {/* Live log */}
        <div className="rounded-lg border border-border bg-[#2A2623] p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
          {phase === "calling_llm" && logs.length <= 1 && (
            <div className="flex items-center gap-2 text-text-tertiary">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-info animate-pulse" />
              Waiting for AI response... This may take a moment.
            </div>
          )}
          {logs.map((log, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-text-tertiary shrink-0">
                {log.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span className={
                log.type === "success" ? "text-success" :
                log.type === "error" ? "text-error" :
                "text-text-secondary"
              }>
                {log.type === "success" && "✓ "}
                {log.type === "error" && "✗ "}
                {log.message}
              </span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        {/* Generated problems list */}
        {generated.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
              Generated Problems ({generated.length})
            </p>
            {generated.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface/50 px-4 py-2.5 animate-fade-in">
                <div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                <span className="text-sm text-text-primary font-medium flex-1">{p.title}</span>
                <span className="text-[10px] text-text-tertiary">{p.difficulty}</span>
                <span className="text-[10px] text-text-tertiary">{p.test_cases?.length || 0} tests</span>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 bg-error-dim border border-error/20 rounded-lg px-4 py-3">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        {/* Cancel button while loading */}
        {loading && (
          <button
            onClick={handleCancel}
            className="mt-3 px-4 py-2 rounded-lg text-sm text-text-secondary border border-border hover:border-surface-3 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-border px-5 py-5 bg-info-dim/30 animate-fade-in">
      <h4 className="font-display font-bold text-info text-sm mb-4 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        Generate for "{topicName}"
      </h4>
      <form onSubmit={handleGenerate} className="space-y-4">
        {error && (
          <div className="bg-error-dim border border-error/20 rounded-lg px-4 py-3 animate-fade-in">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Problems</label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.num_problems}
              onChange={(e) => update("num_problems", parseInt(e.target.value))}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-info focus:ring-1 focus:ring-info/30 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => update("difficulty", e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-info focus:ring-1 focus:ring-info/30 transition-colors"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Test Type</label>
            <select
              value={form.test_type}
              onChange={(e) => update("test_type", e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-info focus:ring-1 focus:ring-info/30 transition-colors"
            >
              <option value="stdin_stdout">Stdin / Stdout</option>
              <option value="file_io">File I/O</option>
              <option value="function">Function Signature</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Tests per problem</label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.num_test_cases}
              onChange={(e) => update("num_test_cases", parseInt(e.target.value))}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-info focus:ring-1 focus:ring-info/30 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Language</label>
          <select
            value={form.language}
            onChange={(e) => update("language", e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-info focus:ring-1 focus:ring-info/30 transition-colors"
          >
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
            <option value="c">C</option>
            <option value="cpp">C++</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Custom instructions (optional)</label>
          <textarea
            value={form.custom_instructions}
            onChange={(e) => update("custom_instructions", e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-info focus:ring-1 focus:ring-info/30 transition-colors resize-none"
            rows={2}
            placeholder="E.g. Focus on while loops, use simple variable names..."
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-info text-[#FDFAF5] px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-info/90 transition-all duration-200 flex items-center gap-2"
          >
            Generate
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm text-text-secondary border border-border hover:border-surface-3 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
