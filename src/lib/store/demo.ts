import type { CreateCaseMedicationInput } from "@/lib/types";

/**
 * Eleven geriatric medications across four prescribers, for the "Load the demo list
 * (SIMULATED)" button on the home page (UI agent). Every generic here is in the data
 * agent's >= 60-drug seed set (see docs/BUILD-CONTRACT.md), so check_interactions and
 * check_duplicate_therapy have real sentences to find once the index lands.
 */
export const DEMO_MEDICATIONS: CreateCaseMedicationInput[] = [
  { generic: "warfarin", dose: "5 mg", schedule: "once daily, evening", prescriber: "Dr. Alvarez (cardiology)" },
  { generic: "amiodarone", dose: "200 mg", schedule: "once daily", prescriber: "Dr. Alvarez (cardiology)" },
  { generic: "metoprolol", dose: "50 mg", schedule: "twice daily", prescriber: "Dr. Alvarez (cardiology)" },
  { generic: "lisinopril", dose: "10 mg", schedule: "once daily, morning", prescriber: "Dr. Alvarez (cardiology)" },
  { generic: "atorvastatin", dose: "40 mg", schedule: "once daily, evening", prescriber: "Dr. Chen (primary care)" },
  { generic: "metformin", dose: "500 mg", schedule: "twice daily, with food", prescriber: "Dr. Chen (primary care)" },
  { generic: "levothyroxine", dose: "75 mcg", schedule: "once daily, empty stomach", prescriber: "Dr. Chen (primary care)" },
  { generic: "omeprazole", dose: "20 mg", schedule: "once daily, before breakfast", prescriber: "Dr. Chen (primary care)" },
  { generic: "sertraline", dose: "50 mg", schedule: "once daily, morning", prescriber: "Dr. Patel (psychiatry)" },
  { generic: "gabapentin", dose: "300 mg", schedule: "three times daily", prescriber: "Dr. Nakamura (pain management)" },
  { generic: "acetaminophen", dose: "500 mg", schedule: "as needed, max 3g/day", prescriber: "Dr. Nakamura (pain management)" },
];
