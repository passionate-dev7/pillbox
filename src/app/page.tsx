import type { Metadata } from "next";
import { CreateCase } from "@/components/case/CreateCase";
import { Footer } from "@/components/ui/Footer";

export const metadata: Metadata = {
  title: "Pill Round",
};

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pb-16 sm:px-8">
      <header className="border-b border-ink pb-6 pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <h1 className="plate text-[clamp(2rem,5vw,3rem)] text-balance">Pill Round</h1>
          <p className="colhead">caregiver &amp; pharmacist &middot; one round, two agents</p>
        </div>
        <p className="mt-3 max-w-xl text-[1.0625rem] leading-snug text-pretty">
          Start a round for one patient&rsquo;s medication list. Open it as the caregiver and as
          the pharmacist in two tabs: the caregiver&rsquo;s agent can add medications, check
          interactions, and accept a proposed change; the pharmacist&rsquo;s agent can propose a
          hold, dose, or substitution and add counsel notes. The server enforces the same rule
          even if a tool call is forged.
        </p>
      </header>

      <section className="mt-8" aria-label="Start a round">
        <CreateCase />
      </section>

      <section className="mt-8 border border-hair-strong bg-paper-sunk" aria-label="How this works">
        <div className="grid gap-6 px-4 py-4 lg:grid-cols-2">
          <div>
            <h2 className="plate text-[1.0625rem]">Capability keys, not roles</h2>
            <p className="mt-2 max-w-lg text-[0.875rem] leading-snug text-ink-soft">
              Creating a round mints two unguessable tokens, a caregiver key and a pharmacist key.
              The URL you open with (<code className="code text-ink">?k=</code>) decides your
              role; the server derives it from which key matches, never from a self-declared
              label.
            </p>
          </div>
          <div>
            <h2 className="plate text-[1.0625rem]">Confirm before every mutation</h2>
            <p className="mt-2 max-w-lg text-[0.875rem] leading-snug text-ink-soft">
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
  );
}
