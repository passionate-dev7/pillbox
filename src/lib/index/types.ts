/** Data layer types for Pill Round's openFDA-derived index. See docs/BUILD-CONTRACT.md. */
import type { SourceRef } from "@/lib/types";

export type { SourceRef };

export type Drug = {
  generic: string; // lowercase canonical, e.g. "warfarin"
  brands: string[];
  setId: string; // label set_id used for the corpus
  labelUrl: string; // https://api.fda.gov/drug/label.json?search=set_id:<setId>
  classes: string[]; // openfda.pharm_class_epc when present
  route?: string;
};

export type InteractionSentence = {
  setId: string; // label the sentence came from
  labelDrug: string; // generic whose label contains the sentence
  mentions: string[]; // generics (from the seed set) this sentence names, excluding labelDrug
  sentence: string; // verbatim
  section: "drug_interactions" | "warnings" | "boxed_warning" | "contraindications";
};

export type GeriatricNote = { setId: string; generic: string; sentence: string };

export type Recall = {
  generic: string;
  productNdc?: string;
  reason: string;
  classification: string;
  recallInitiationDate: string;
  recallNumber: string;
  source: SourceRef;
};

export type InteractionFlag = {
  a: string;
  b: string; // generics, sorted
  sentences: InteractionSentence[]; // >= 1
  severity: "boxed" | "contraindicated" | "warning" | "interaction"; // by section, boxed > contraindicated > warning > interaction
  source: SourceRef; // query for the label that supplied the top sentence
};

export type IndexMeta = {
  builtAt: string;
  drugs: number;
  interactionSentences: number;
  geriatricSentences: number;
  recalls: number;
  sources: string[];
};

/** Shape of data/index.json as written by scripts/build-index.ts. */
export type IndexFile = {
  builtAt: string;
  drugs: Drug[];
  interactionSentences: InteractionSentence[];
  geriatricNotes: GeriatricNote[];
  recalls: Recall[];
  labelSections: Record<string, Record<string, string>>;
  labelSources: SourceRef[];
};
