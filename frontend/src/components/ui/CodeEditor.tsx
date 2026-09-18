import { useRef, type CSSProperties } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-javascript";

interface Props {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
}

const LANG_MAP: Record<string, string> = {
  python: "python",
  py: "python",
  c: "c",
  cpp: "cpp",
  "c++": "cpp",
  java: "java",
  javascript: "javascript",
  js: "javascript",
};

export default function CodeEditor({
  value,
  onChange,
  language = "python",
  placeholder = "",
  className = "",
  style = {},
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prismLang = LANG_MAP[language.toLowerCase()] || "python";
  const grammar = Prism.languages[prismLang];

  const highlighted = grammar
    ? Prism.highlight(value || "", grammar, prismLang)
    : (value || "");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = value.substring(0, start) + "    " + value.substring(end);
      onChange(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 4;
      });
    }
  };

  const sharedStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "14px",
    lineHeight: "1.6",
    padding: "16px",
    margin: 0,
    border: 0,
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    overflowWrap: "break-word",
  };

  return (
    <div
      className={className}
      style={{
        position: "relative",
        background: "#2A2623",
        borderRadius: "12px",
        border: "1px solid var(--color-border)",
        overflow: "auto",
        minHeight: "200px",
        ...style,
      }}
    >
      {/* Highlighted overlay */}
      <pre
        aria-hidden="true"
        style={{
          ...sharedStyle,
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          color: "#D4C9B8",
          background: "transparent",
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <code
          style={{ background: "none", fontFamily: "inherit" }}
          dangerouslySetInnerHTML={{ __html: highlighted + (value.endsWith("\n") ? " " : "") }}
        />
      </pre>

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        style={{
          ...sharedStyle,
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: "inherit",
          color: "transparent",
          caretColor: "#D4C9B8",
          background: "transparent",
          resize: "none",
          outline: "none",
          WebkitTextFillColor: "transparent",
        }}
      />
    </div>
  );
}
