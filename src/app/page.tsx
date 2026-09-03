import type { Metadata } from "next";
import { CreateCase } from "@/components/case/CreateCase";

export const metadata: Metadata = {
  title: "webmcp-two-agent-spine",
};

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pb-24 sm:px-8">
      <header className="border-b border-ink pb-6 pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <h1 className="plate text-[clamp(2rem,5vw,3rem)] text-balance">webmcp-two-agent-spine</h1>
          <p className="colhead">two roles · one page · asymmetric agents</p>
        </div>
        <p className="mt-3 max-w-xl text-[1.0625rem] leading-snug text-pretty">
          Start a case, then open it as the owner and as the partner in two tabs. Each session
          registers a different WebMCP tool set on the same origin: the owner&rsquo;s agent can
          add items and accept a proposal, the partner&rsquo;s agent can only propose one, and the
          server enforces the same rule even if a tool call is forged.
        </p>
      </header>

      <section className="mt-8" aria-label="Start a case">
        <CreateCase />
      </section>

      <section className="mt-8 border border-hair-strong bg-paper-sunk" aria-label="How this works">
        <div className="grid gap-6 px-4 py-4 lg:grid-cols-2">
          <div>
            <h2 className="plate text-[1.0625rem]">Capability keys, not roles</h2>
            <p className="mt-2 max-w-lg text-[0.875rem] leading-snug text-ink-soft">
              Creating a case mints two unguessable tokens, an owner key and a partner key. The
              URL you open with (<code className="code text-ink">?k=</code>) decides your role;
              the server derives it from which key matches, never from a self-declared label. A
              guessed or edited key gets no role at all.
            </p>
          </div>
          <div>
            <h2 className="plate text-[1.0625rem]">Confirm before every mutation</h2>
            <p className="mt-2 max-w-lg text-[0.875rem] leading-snug text-ink-soft">
              Every write tool suspends behind an in-page card until a human presses Confirm. The
              one declarative form (<code className="code text-ink">report_form</code>) carries no{" "}
              <code className="code text-ink">toolautosubmit</code>: an agent fills it, a person
              sends it.
            </p>
          </div>
        </div>
        <div className="border-t border-hair px-4 py-3 text-[0.8125rem] text-ink-soft">
          See <code className="code text-ink">README.md</code> for how to add your own domain: swap{" "}
          <code className="code text-ink">src/lib/types.ts</code> and{" "}
          <code className="code text-ink">src/lib/webmcp/tools.ts</code>, everything else in{" "}
          <code className="code text-ink">src/lib/webmcp</code> and{" "}
          <code className="code text-ink">src/lib/store</code> stays as-is.
        </div>
      </section>
    </main>
  );
}
