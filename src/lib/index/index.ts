/**
 * Data layer for Pillbox: loads data/index.json (built by scripts/build-index.ts from
 * openFDA labels + enforcement) and exposes the query API defined in docs/BUILD-CONTRACT.md.
 */
import indexData from "../../../data/index.json";
import type {
  Drug,
  GeriatricNote,
  IndexFile,
  IndexMeta,
  InteractionFlag,
  InteractionSentence,
  Recall,
  SourceRef,
} from "./types";

const DATA = indexData as unknown as IndexFile;

const SEVERITY_RANK: Record<InteractionSentence["section"], InteractionFlag["severity"]> = {
  boxed_warning: "boxed",
  contraindications: "contraindicated",
  warnings: "warning",
  drug_interactions: "interaction",
};

const SEVERITY_ORDER: InteractionFlag["severity"][] = [
  "boxed",
  "contraindicated",
  "warning",
  "interaction",
];

function severityRank(sev: InteractionFlag["severity"]): number {
  return SEVERITY_ORDER.indexOf(sev);
}

// --- Indices built once at module load ---------------------------------------------------

const drugsByGeneric = new Map<string, Drug>();
const brandToGeneric = new Map<string, string>();
for (const d of DATA.drugs) {
  drugsByGeneric.set(d.generic, d);
  for (const b of d.brands) {
    brandToGeneric.set(b.toLowerCase(), d.generic);
  }
}

function resolveGeneric(nameOrBrand: string): string | null {
  const lower = nameOrBrand.trim().toLowerCase();
  if (drugsByGeneric.has(lower)) return lower;
  const viaBrand = brandToGeneric.get(lower);
  if (viaBrand) return viaBrand;
  return null;
}

// generic -> sentences that mention it (from any label)
const sentencesMentioning = new Map<string, InteractionSentence[]>();
for (const s of DATA.interactionSentences) {
  for (const m of s.mentions) {
    const arr = sentencesMentioning.get(m) ?? [];
    arr.push(s);
    sentencesMentioning.set(m, arr);
  }
}

const geriatricByGeneric = new Map<string, GeriatricNote[]>();
for (const n of DATA.geriatricNotes) {
  const arr = geriatricByGeneric.get(n.generic) ?? [];
  arr.push(n);
  geriatricByGeneric.set(n.generic, arr);
}

const recallsByGeneric = new Map<string, Recall[]>();
for (const r of DATA.recalls) {
  const arr = recallsByGeneric.get(r.generic) ?? [];
  arr.push(r);
  recallsByGeneric.set(r.generic, arr);
}

// --- Public API ----------------------------------------------------------------------------

export function findDrug(query: string): Drug[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: Drug[] = [];
  const seen = new Set<string>();
  for (const d of DATA.drugs) {
    if (d.generic.includes(q) || d.brands.some((b) => b.toLowerCase().includes(q))) {
      if (!seen.has(d.generic)) {
        out.push(d);
        seen.add(d.generic);
      }
    }
  }
  return out;
}

export function getDrug(generic: string): Drug | null {
  const g = resolveGeneric(generic);
  if (!g) return null;
  return drugsByGeneric.get(g) ?? null;
}

export function checkInteractions(generics: string[]): InteractionFlag[] {
  const resolved = Array.from(
    new Set(generics.map((g) => resolveGeneric(g)).filter((g): g is string => g !== null))
  );
  const flags: InteractionFlag[] = [];

  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      const a = resolved[i];
      const b = resolved[j];
      const [lo, hi] = a < b ? [a, b] : [b, a];

      // sentences on lo's or hi's label that mention the other party
      const candidates = [...(sentencesMentioning.get(lo) ?? []), ...(sentencesMentioning.get(hi) ?? [])].filter(
        (s) =>
          (s.labelDrug === lo && s.mentions.includes(hi)) ||
          (s.labelDrug === hi && s.mentions.includes(lo))
      );

      if (candidates.length === 0) continue;

      const sorted = [...candidates].sort(
        (x, y) => severityRank(SEVERITY_RANK[x.section]) - severityRank(SEVERITY_RANK[y.section])
      );
      const top = sorted[0];
      const drug = drugsByGeneric.get(top.labelDrug);

      flags.push({
        a: lo,
        b: hi,
        sentences: sorted,
        severity: SEVERITY_RANK[top.section],
        source: {
          dataset: "openfda-label",
          query: drug?.labelUrl ?? `https://api.fda.gov/drug/label.json?search=set_id:${top.setId}`,
          rows: 1,
        },
      });
    }
  }

  return flags;
}

export function duplicateTherapy(generics: string[]): { class: string; drugs: string[] }[] {
  const resolved = Array.from(
    new Set(generics.map((g) => resolveGeneric(g)).filter((g): g is string => g !== null))
  );

  const byClass = new Map<string, Set<string>>();
  for (const g of resolved) {
    const d = drugsByGeneric.get(g);
    if (!d) continue;
    for (const c of d.classes) {
      const set = byClass.get(c) ?? new Set<string>();
      set.add(g);
      byClass.set(c, set);
    }
  }

  const out: { class: string; drugs: string[] }[] = [];
  for (const [cls, drugs] of byClass) {
    if (drugs.size >= 2) {
      out.push({ class: cls, drugs: Array.from(drugs).sort() });
    }
  }
  return out;
}

export function geriatricWarnings(generic: string): GeriatricNote[] {
  const g = resolveGeneric(generic);
  if (!g) return [];
  return geriatricByGeneric.get(g) ?? [];
}

export function recallsFor(generic: string): Recall[] {
  const g = resolveGeneric(generic);
  if (!g) return [];
  return recallsByGeneric.get(g) ?? [];
}

export function labelSection(
  generic: string,
  section: string
): { text: string; setId: string; source: SourceRef } | null {
  const g = resolveGeneric(generic);
  if (!g) return null;
  const drug = drugsByGeneric.get(g);
  if (!drug) return null;
  const sections = DATA.labelSections[g];
  const text = sections?.[section];
  if (!text) return null;
  return {
    text,
    setId: drug.setId,
    source: { dataset: "openfda-label", query: drug.labelUrl, rows: 1 },
  };
}

export const INDEX_META: IndexMeta = {
  builtAt: DATA.builtAt,
  drugs: DATA.drugs.length,
  interactionSentences: DATA.interactionSentences.length,
  geriatricSentences: DATA.geriatricNotes.length,
  recalls: DATA.recalls.length,
  sources: Array.from(new Set(DATA.labelSources.map((s) => s.query))),
};

export type { Drug, GeriatricNote, InteractionFlag, InteractionSentence, Recall, SourceRef };
