import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-javascript";

interface Props {
  code: string;
  language?: string;
  className?: string;
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

export default function CodeBlock({ code, language = "python", className = "" }: Props) {
  const prismLang = LANG_MAP[language.toLowerCase()] || "python";
  const grammar = Prism.languages[prismLang];

  const html = grammar
    ? Prism.highlight(code, grammar, prismLang)
    : code;

  return (
    <pre
      className={`rounded-lg p-4 text-sm overflow-x-auto border border-border-subtle ${className}`}
      style={{ background: "#2A2623", color: "#D4C9B8", margin: 0 }}
    >
      <code
        style={{ fontFamily: "var(--font-mono)", background: "none" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </pre>
  );
}
