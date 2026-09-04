import type { Metadata } from "next";
import { CreateCase } from "@/components/case/CreateCase";
import { Footer } from "@/components/ui/Footer";

export const metadata: Metadata = {
  title: "Pill Round",
};

export default function Home() {
  return (
    <div>
      <div className="border-b border-hair-strong bg-canvas-night text-on-dark">
        <div className="mx-auto w-full max-w-[1120px] px-4 py-10 sm:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
            <h1 className="plate text-[clamp(2rem,5vw,3rem)] text-balance">Pill Round</h1>
            <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-on-primary">
              caregiver &amp; pharmacist
            </span>
          </div>
          <p className="mt-3 max-w-xl text-[1.0625rem] leading-snug text-pretty text-on-dark/80">
            Start a round for one patient&rsquo;s medication list. Open it as the caregiver and as
            the pharmacist in two tabs: the caregiver&rsquo;s agent can add medications, check
            interactions, and accept a proposed change; the pharmacist&rsquo;s agent can propose a
            hold, dose, or substitution and add counsel notes. The server enforces the same rule
            even if a tool call is forged.
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1120px] px-4 pb-16 sm:px-8">
        <section className="mt-8" aria-label="Start a round">
          <CreateCase />
        </section>

        <section
          className="mt-8 rounded-control border border-hair bg-canvas-soft shadow-[0_1px_2px_rgba(0,0,0,.06)]"
          aria-label="How this works"
        >
          <div className="grid gap-6 px-4 py-4 lg:grid-cols-2">
            <div>
              <h2 className="plate text-[1.0625rem]">Capability keys, not roles</h2>
              <p className="mt-2 max-w-lg text-[0.875rem] leading-snug text-ink-mute">
                Creating a round mints two unguessable tokens, a caregiver key and a pharmacist key.
                The URL you open with (<code className="code text-ink">?k=</code>) decides your
                role; the server derives it from which key matches, never from a self-declared
                label.
              </p>
            </div>
            <div>
              <h2 className="plate text-[1.0625rem]">Confirm before every mutation</h2>
              <p className="mt-2 max-w-lg text-[0.875rem] leading-snug text-ink-mute">
                Every write tool suspends behind an in-page card until a human presses Confirm. The
                side-effect report is a declarative form (
                <code className="code text-ink">report_side_effect</code>) that carries no{" "}
                <code className="code text-ink">toolautosubmit</code>: an agent fills it, a person
                sends it.
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
