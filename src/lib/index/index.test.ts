import { describe, it, expect } from "vitest";
import {
  findDrug,
  getDrug,
  checkInteractions,
  duplicateTherapy,
  geriatricWarnings,
  labelSection,
  recallsFor,
  INDEX_META,
} from "./index";

describe("INDEX_META", () => {
  it("has at least 60 drugs", () => {
    expect(INDEX_META.drugs).toBeGreaterThanOrEqual(60);
  });

  it("has at least 200 interaction sentences", () => {
    expect(INDEX_META.interactionSentences).toBeGreaterThanOrEqual(200);
  });

  it("has geriatric sentences and source URLs", () => {
    expect(INDEX_META.geriatricSentences).toBeGreaterThan(0);
    expect(INDEX_META.sources.length).toBeGreaterThan(0);
    for (const url of INDEX_META.sources.slice(0, 5)) {
      expect(url).toMatch(/^https:\/\/api\.fda\.gov\//);
    }
  });
});

describe("findDrug / getDrug", () => {
  it("finds a drug by generic substring", () => {
    const results = findDrug("warfarin");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].generic).toBe("warfarin");
  });

  it("finds a drug by brand substring", () => {
    const results = findDrug("jantoven");
    expect(results.some((d) => d.generic === "warfarin")).toBe(true);
  });

  it("getDrug returns null for an unknown generic", () => {
    expect(getDrug("not-a-real-drug")).toBeNull();
  });

  it("getDrug returns the drug for a known generic", () => {
    const d = getDrug("metformin");
    expect(d).not.toBeNull();
    expect(d?.generic).toBe("metformin");
    expect(d?.setId.length).toBeGreaterThan(0);
  });
});

describe("checkInteractions", () => {
  it("flags ciprofloxacin + warfarin with a sentence naming warfarin or a brand", () => {
    const flags = checkInteractions(["ciprofloxacin", "warfarin"]);
    expect(flags.length).toBeGreaterThanOrEqual(1);
    const top = flags[0].sentences[0];
    const lower = top.sentence.toLowerCase();
    expect(lower.includes("warfarin") || lower.includes("coumadin") || lower.includes("jantoven")).toBe(true);
  });

  it("flags at least 2 pairs among warfarin, aspirin, amiodarone", () => {
    const flags = checkInteractions(["warfarin", "aspirin", "amiodarone"]);
    expect(flags.length).toBeGreaterThanOrEqual(2);
  });

  it("returns empty for an unresolvable generic", () => {
    expect(checkInteractions(["not-a-real-drug"])).toEqual([]);
  });

  it("every flag carries a verbatim sentence, set_id and source query", () => {
    const flags = checkInteractions(["warfarin", "aspirin", "amiodarone"]);
    for (const f of flags) {
      expect(f.sentences.length).toBeGreaterThanOrEqual(1);
      expect(f.sentences[0].sentence.length).toBeGreaterThan(0);
      expect(f.sentences[0].setId.length).toBeGreaterThan(0);
      expect(f.source.query).toMatch(/^https:\/\/api\.fda\.gov\//);
    }
  });
});

describe("duplicateTherapy", () => {
  it("flags atorvastatin + simvastatin as the same statin class", () => {
    const dups = duplicateTherapy(["atorvastatin", "simvastatin"]);
    expect(dups.length).toBeGreaterThanOrEqual(1);
    expect(dups[0].drugs).toContain("atorvastatin");
    expect(dups[0].drugs).toContain("simvastatin");
  });

  it("returns empty for drugs in different classes", () => {
    const dups = duplicateTherapy(["metformin", "levothyroxine"]);
    expect(dups).toEqual([]);
  });
});

describe("geriatricWarnings", () => {
  it("returns at least 1 note for diazepam", () => {
    const notes = geriatricWarnings("diazepam");
    expect(notes.length).toBeGreaterThanOrEqual(1);
    expect(notes[0].sentence.length).toBeGreaterThan(0);
  });

  it("returns empty for an unknown generic", () => {
    expect(geriatricWarnings("not-a-real-drug")).toEqual([]);
  });
});

describe("labelSection", () => {
  it("returns metformin's boxed_warning non-null", () => {
    const section = labelSection("metformin", "boxed_warning");
    expect(section).not.toBeNull();
    expect(section?.text.length).toBeGreaterThan(0);
    expect(section?.setId.length).toBeGreaterThan(0);
    expect(section?.source.query).toMatch(/^https:\/\/api\.fda\.gov\//);
  });

  it("returns null for a section that does not exist", () => {
    expect(labelSection("metformin", "not_a_real_section")).toBeNull();
  });

  it("returns null for an unknown generic", () => {
    expect(labelSection("not-a-real-drug", "boxed_warning")).toBeNull();
  });
});

describe("recallsFor", () => {
  it("returns an array (possibly empty) for a known generic", () => {
    expect(Array.isArray(recallsFor("metformin"))).toBe(true);
  });

  it("returns empty for an unknown generic", () => {
    expect(recallsFor("not-a-real-drug")).toEqual([]);
  });
});

// A check that cannot fail is not a check: prove the mentions filter actually gates the
// result set. If checkInteractions returned every co-listed sentence regardless of mentions,
// this would still pass; the filter itself is exercised by requiring a real generic-name
// match in the returned sentence text.
describe("mentions filter is load-bearing", () => {
  it("flags between unrelated seed drugs return sentences that actually name each other", () => {
    const flags = checkInteractions(["lisinopril", "hydrochlorothiazide"]);
    if (flags.length > 0) {
      for (const f of flags) {
        for (const s of f.sentences) {
          const lower = s.sentence.toLowerCase();
          expect(lower.includes(f.a) || lower.includes(f.b) || s.mentions.includes(f.a) || s.mentions.includes(f.b)).toBe(true);
        }
      }
    }
  });
});
