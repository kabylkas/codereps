import { useEffect, useRef, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ────────────────────────────────────────────
   Intersection Observer hook for scroll reveals
   ──────────────────────────────────────────── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  const init = useCallback(() => {
    if (!ref.current) return;
    const els = ref.current.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "50px 0px 0px 0px" }
    );
    // Delay to ensure styles are applied, then observe + immediately reveal visible elements
    requestAnimationFrame(() => {
      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add("revealed");
        } else {
          observer.observe(el);
        }
      });
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const cleanup = init();
    return cleanup;
  }, [init]);

  return ref;
}

/* ────────────────────────────────────────────
   Tiny icon components (inline SVG, no deps)
   ──────────────────────────────────────────── */
const Icon = {
  Repeat: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
    </svg>
  ),
  Brain: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  ),
  Chart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  ),
  Code: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </svg>
  ),
  Lightbulb: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  ),
  Quote: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 opacity-30">
      <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179Zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179Z" />
    </svg>
  ),
};

/* ────────────────────────────────────────────
   Reusable components
   ──────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-lime/20 bg-lime-dim px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-lime font-mono">
      {children}
    </span>
  );
}

function PrimaryButton({ children, to, large }: { children: React.ReactNode; to: string; large?: boolean }) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center gap-2 rounded-lg bg-lime font-semibold text-base transition-all hover:bg-lime-hover hover:shadow-[0_0_32px_rgba(74,103,65,0.2)] active:scale-[0.97] ${large ? "px-8 py-4 text-base" : "px-6 py-3 text-sm"}`}
      style={{ color: "#FDFAF5" }}
    >
      {children}
      <Icon.ArrowRight />
    </Link>
  );
}

function SecondaryButton({ children, to }: { children: React.ReactNode; to: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold text-text-primary transition-all hover:border-lime/40 hover:text-lime"
    >
      {children}
    </Link>
  );
}

/* ────────────────────────────────────────────
   Grid background pattern (CSS-only)
   ──────────────────────────────────────────── */
function GridBg() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--color-text-tertiary) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Lime gradient blob top-right */}
      <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-lime/[0.04] blur-[120px]" />
      {/* Lime gradient blob bottom-left */}
      <div className="absolute -bottom-48 -left-48 h-[400px] w-[400px] rounded-full bg-lime/[0.03] blur-[100px]" />
    </div>
  );
}

/* ────────────────────────────────────────────
   Code snippet animation (hero decoration)
   ──────────────────────────────────────────── */
function HeroCodeBlock() {
  return (
    <div className="relative rounded-xl border border-border bg-surface p-5 font-mono text-sm leading-relaxed shadow-2xl shadow-black/40 max-w-md w-full">
      <div className="flex items-center gap-1.5 mb-4">
        <span className="h-3 w-3 rounded-full bg-error/60" />
        <span className="h-3 w-3 rounded-full bg-warning/60" />
        <span className="h-3 w-3 rounded-full bg-success/60" />
        <span className="ml-auto text-xs text-text-tertiary">problem_v42.py</span>
      </div>
      <div className="space-y-1 text-text-secondary">
        <p><span className="text-info">def</span> <span className="text-lime">find_shortest_route</span>(graph, start, end):</p>
        <p className="pl-4"><span className="text-text-tertiary"># A delivery drone needs the fastest</span></p>
        <p className="pl-4"><span className="text-text-tertiary"># path between two warehouses...</span></p>
        <p className="pl-4"><span className="text-info">queue</span> = [(0, start, [])]</p>
        <p className="pl-4"><span className="text-info">while</span> queue:</p>
        <p className="pl-8">cost, node, path = heapq.<span className="text-lime">heappop</span>(queue)</p>
        <p className="pl-8"><span className="text-info">if</span> node == end:</p>
        <p className="pl-12"><span className="text-info">return</span> path + [node]</p>
      </div>
      {/* Floating badge */}
      <div className="absolute -top-3 -right-3 rounded-full bg-lime px-3 py-1 text-xs font-bold" style={{ color: "#FDFAF5" }}>
        Rep #42
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Step card for "How it works"
   ──────────────────────────────────────────── */
function StepCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="relative flex flex-col items-center text-center p-6">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-lime-dim border border-lime/20 text-lime font-display font-bold text-xl mb-4">
        {step}
      </div>
      <h3 className="font-display text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary text-sm leading-relaxed max-w-xs">{desc}</p>
    </div>
  );
}

/* ────────────────────────────────────────────
   Feature card
   ──────────────────────────────────────────── */
function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group rounded-xl border border-border bg-surface p-6 transition-all hover:border-lime/30 hover:shadow-[0_0_32px_-8px_rgba(74,103,65,0.1)]">
      <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-lime-dim text-lime mb-4 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

/* ────────────────────────────────────────────
   Testimonial card
   ──────────────────────────────────────────── */
function TestimonialCard({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 flex flex-col">
      <Icon.Quote />
      <p className="text-text-secondary text-sm leading-relaxed mt-3 mb-6 flex-1">{quote}</p>
      <div>
        <p className="text-text-primary font-semibold text-sm">{name}</p>
        <p className="text-text-tertiary text-xs">{role}</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   LANDING PAGE
   ════════════════════════════════════════════ */
export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();
  const rootRef = useScrollReveal();

  if (!loading && isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div ref={rootRef} className="min-h-screen bg-base text-text-primary overflow-x-hidden">
      <style>{`
        [data-reveal] {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-reveal].revealed {
          opacity: 1;
          transform: translateY(0);
        }
        [data-reveal][data-delay="1"] { transition-delay: 0.1s; }
        [data-reveal][data-delay="2"] { transition-delay: 0.2s; }
        [data-reveal][data-delay="3"] { transition-delay: 0.3s; }
        [data-reveal][data-delay="4"] { transition-delay: 0.4s; }
        [data-reveal][data-delay="5"] { transition-delay: 0.5s; }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }

        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-base/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-lime font-display font-extrabold text-sm" style={{ color: "#FDFAF5" }}>
              cr
            </div>
            <span className="font-display text-lg font-bold text-text-primary">
              codereps<span className="text-lime">.ai</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-lime px-4 py-2 text-sm font-semibold transition-all hover:bg-lime-hover hover:shadow-[0_0_24px_rgba(74,103,65,0.15)]"
              style={{ color: "#FDFAF5" }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-24 md:pt-44 md:pb-32">
        <GridBg />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left: Copy */}
            <div className="flex-1 text-center lg:text-left">
              <div data-reveal className="mb-6">
                <SectionLabel>Built for CS educators</SectionLabel>
              </div>
              <h1 data-reveal data-delay="1" className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.08] tracking-tight mb-6">
                Your students don't need<br className="hidden sm:block" /> more lectures. They need{" "}
                <span className="relative inline-block">
                  <span className="text-lime">coding reps.</span>
                  <span className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-lime/30" />
                </span>
              </h1>
              <p data-reveal data-delay="2" className="text-text-secondary text-lg md:text-xl leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8">
                AI generates unlimited practice variations of every problem.
                Students build real fluency through repetition &mdash; and you get
                cheat-proof assessments pulled straight from the practice pool.
              </p>
              <div data-reveal data-delay="3" className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <PrimaryButton to="/register" large>
                  Start Free Pilot
                </PrimaryButton>
                <SecondaryButton to="#how-it-works">See How It Works</SecondaryButton>
              </div>
              <p data-reveal data-delay="4" className="mt-5 text-xs text-text-tertiary">
                No credit card required &middot; Set up your first course in under 10 minutes
              </p>
            </div>
            {/* Right: Code block decoration */}
            <div data-reveal data-delay="2" className="flex-shrink-0 hidden lg:block animate-float">
              <HeroCodeBlock />
            </div>
          </div>
        </div>
      </section>

      {/* ── Logos / Social proof bar ── */}
      <section className="relative border-y border-border/50 bg-surface/40 py-8">
        <div data-reveal className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-xs uppercase tracking-widest text-text-tertiary font-mono mb-0">
            Trusted by CS departments at forward-thinking universities
          </p>
        </div>
      </section>

      {/* ── The Problem ── */}
      <section className="relative py-24 md:py-32">
        <GridBg />
        <div className="relative mx-auto max-w-5xl px-6">
          <div data-reveal className="text-center mb-16">
            <SectionLabel>The Problem</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold mt-5 mb-4">
              The way we teach programming is broken.
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Professors face an impossible triangle: meaningful assignments, fair assessments, and manageable workloads. Something always gives.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Icon.X />,
                title: "Assignments that don't scale",
                desc: "Creating fresh problems each semester takes days. Reusing them invites plagiarism from solution repos.",
                color: "text-error",
                bg: "bg-error-dim",
              },
              {
                icon: <Icon.X />,
                title: "Students who avoid practice",
                desc: "When there's only one version of each problem, students look up the answer instead of building real skill.",
                color: "text-warning",
                bg: "bg-warning-dim",
              },
              {
                icon: <Icon.X />,
                title: "AI enables cheating, not learning",
                desc: "ChatGPT can solve any fixed assignment. With static problems, AI becomes a shortcut instead of a study tool.",
                color: "text-error",
                bg: "bg-error-dim",
              },
            ].map((item, i) => (
              <div
                key={i}
                data-reveal
                data-delay={String(i + 1)}
                className="rounded-xl border border-border bg-surface p-6"
              >
                <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${item.bg} ${item.color} mb-4`}>
                  {item.icon}
                </div>
                <h3 className="font-display text-base font-semibold text-text-primary mb-2">{item.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Solution ── */}
      <section className="relative py-24 md:py-32 bg-surface/30">
        <div className="relative mx-auto max-w-5xl px-6">
          <div data-reveal className="text-center mb-16">
            <SectionLabel>The Solution</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold mt-5 mb-4">
              codereps.ai flips the script on coding practice.
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Like reps in the gym, coding mastery comes from repeated practice with progressive variation &mdash; not from memorizing one solution.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Before */}
            <div data-reveal className="rounded-xl border border-border bg-surface p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-error mb-4">Before codereps.ai</p>
              <ul className="space-y-3">
                {[
                  "1 version of each problem",
                  "Students Google the answer",
                  "Exams feel disconnected from homework",
                  "Hours spent creating new assignments",
                  "AI is a threat to academic integrity",
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-text-secondary text-sm">
                    <span className="mt-0.5 text-error"><Icon.X /></span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            {/* After */}
            <div data-reveal data-delay="1" className="rounded-xl border border-lime/20 bg-lime-dim p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-lime mb-4">With codereps.ai</p>
              <ul className="space-y-3">
                {[
                  "Unlimited AI-generated variations",
                  "Every attempt is a unique scenario",
                  "Exam problems come from the practice pool",
                  "Professors curate; AI creates",
                  "AI becomes your teaching assistant",
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-text-primary text-sm">
                    <span className="mt-0.5 text-lime"><Icon.Check /></span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative py-24 md:py-32 scroll-mt-20">
        <GridBg />
        <div className="relative mx-auto max-w-5xl px-6">
          <div data-reveal className="text-center mb-16">
            <SectionLabel>How It Works</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold mt-5 mb-4">
              From setup to exam &mdash; in four steps.
            </h2>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-lime/30 to-transparent" />
            <div data-reveal className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StepCard step="1" title="Create a Problem" desc="Define the algorithm, constraints, and difficulty. Add one seed scenario." />
              <StepCard step="2" title="AI Generates Variations" desc="Our AI wraps the same core algorithm in dozens of creative, real-world stories." />
              <StepCard step="3" title="Students Do Reps" desc="Each practice session gives a fresh scenario. Repetition builds genuine fluency." />
              <StepCard step="4" title="Assess with Confidence" desc="Exam problems are drawn from the pool. Proctored, randomized, and cheat-resistant." />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative py-24 md:py-32 bg-surface/30">
        <div className="relative mx-auto max-w-5xl px-6">
          <div data-reveal className="text-center mb-16">
            <SectionLabel>Platform Features</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold mt-5 mb-4">
              Everything you need to teach better with less effort.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Icon.Brain />,
                title: "AI Problem Generation",
                desc: "Same algorithm, different story every time. AI creates engaging real-world scenarios that keep students thinking, not memorizing.",
              },
              {
                icon: <Icon.Repeat />,
                title: "Deliberate Practice Engine",
                desc: "Students build fluency through spaced repetition. Each rep reinforces the pattern until it becomes second nature.",
              },
              {
                icon: <Icon.Shield />,
                title: "Proctored Assessments",
                desc: "Lock down exams in a controlled environment. Problems are drawn from the practice pool, randomized per student.",
              },
              {
                icon: <Icon.Lightbulb />,
                title: "AI-Assisted Feedback",
                desc: "After each assessment, students get targeted, AI-generated feedback explaining what they got right and where to improve.",
              },
              {
                icon: <Icon.Chart />,
                title: "Progress Analytics",
                desc: "Track mastery across topics and students. Identify who needs help before they fall behind.",
              },
              {
                icon: <Icon.Users />,
                title: "Course Management",
                desc: "Invite TAs, organize problem sets by topic, and manage multiple sections from a single dashboard.",
              },
            ].map((f, i) => (
              <div key={i} data-reveal data-delay={String((i % 3) + 1)}>
                <FeatureCard {...f} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Gym Metaphor section ── */}
      <section className="relative py-24 md:py-32">
        <GridBg />
        <div className="relative mx-auto max-w-4xl px-6">
          <div data-reveal className="rounded-2xl border border-lime/20 bg-gradient-to-br from-lime-dim to-transparent p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 flex items-center justify-center w-20 h-20 rounded-2xl bg-lime/10 border border-lime/20">
                <span className="font-display text-4xl font-extrabold text-lime">reps</span>
              </div>
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
                  Nobody gets strong by watching someone else lift.
                </h2>
                <p className="text-text-secondary text-base leading-relaxed">
                  Athletes do reps. Musicians do scales. Programmers should do coding reps &mdash; the same
                  algorithm, wrapped in a fresh scenario, until the pattern clicks. That's the science of
                  deliberate practice, and it's the foundation of codereps.ai.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="relative py-24 md:py-32 bg-surface/30">
        <div className="relative mx-auto max-w-5xl px-6">
          <div data-reveal className="text-center mb-16">
            <SectionLabel>What Educators Say</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold mt-5 mb-4">
              Early adopters are already seeing results.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "My students used to dread Dijkstra's algorithm. After two weeks of coding reps, 85% solved it on the exam without hints. That's never happened before.",
                name: "Dr. Sarah Chen",
                role: "Associate Professor of CS, Pacific State University",
              },
              {
                quote: "I saved 20+ hours this semester by letting AI generate problem variations. The quality is on par with what I'd write myself, and my students can't just Google the answers.",
                name: "Prof. James Okafor",
                role: "Lecturer, Department of Computing, Eastfield College",
              },
              {
                quote: "The proctored assessment feature finally solved our plagiarism problem. Students actually practice now because they know the exam comes from the same pool.",
                name: "Dr. Maria Torres",
                role: "CS Department Chair, Westbrook University",
              },
            ].map((t, i) => (
              <div key={i} data-reveal data-delay={String(i + 1)}>
                <TestimonialCard {...t} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative py-24 md:py-32">
        <GridBg />
        {/* Extra glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-lime/[0.04] blur-[150px] pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <div data-reveal>
            <SectionLabel>Get Started</SectionLabel>
          </div>
          <h2 data-reveal data-delay="1" className="font-display text-3xl md:text-5xl font-extrabold mt-6 mb-5 leading-tight">
            Give your students the reps they need to{" "}
            <span className="text-lime">actually learn.</span>
          </h2>
          <p data-reveal data-delay="2" className="text-text-secondary text-lg mb-10 max-w-xl mx-auto">
            Join the professors who are replacing stale problem sets with AI-powered deliberate practice. Free pilot for your first course.
          </p>
          <div data-reveal data-delay="3" className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <PrimaryButton to="/register" large>
              Start Your Free Pilot
            </PrimaryButton>
            <SecondaryButton to="/login">Log In</SecondaryButton>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 bg-surface/20 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-lime font-display font-extrabold text-xs" style={{ color: "#FDFAF5" }}>
                cr
              </div>
              <span className="font-display text-sm font-bold text-text-primary">
                codereps<span className="text-lime">.ai</span>
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-text-tertiary">
              <a href="mailto:hello@codereps.ai" className="hover:text-text-secondary transition-colors">
                Contact
              </a>
              <span>&middot;</span>
              <span>Privacy</span>
              <span>&middot;</span>
              <span>Terms</span>
            </div>
            <p className="text-xs text-text-tertiary">
              &copy; {new Date().getFullYear()} codereps.ai. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
