You are the DATA agent for "Pill Round" at /Users/kamal/Desktop/devpost/projects/webmcp/pill-round.

Deliverable: scripts/build-index.ts (run with `npx tsx scripts/build-index.ts`), data/index.json (< 3 MB), data/index-meta.json, src/lib/index/index.ts + src/lib/index/types.ts exporting EXACTLY the Data layer API in docs/BUILD-CONTRACT.md, and src/lib/index/index.test.ts.

Sources (openFDA, keyless; rate limit 40 req/min without key, so batch with search=openfda.generic_name:(a+b+c) and limit=100, sleep between calls):
- Labels https://api.fda.gov/drug/label.json fields: drug_interactions, warnings, boxed_warning, contraindications, geriatric_use, dosage_and_administration, set_id, openfda.generic_name, openfda.brand_name, openfda.pharm_class_epc, openfda.route, openfda.product_ndc
- NDC https://api.fda.gov/drug/ndc.json (only if needed for brand mapping)
- Enforcement https://api.fda.gov/drug/enforcement.json search=product_description:<generic>+AND+status:Ongoing

Seed set: the >= 60 geriatric generics listed in the contract. Pick one label per generic: the one with the longest drug_interactions text (prefer human prescription, openfda.product_type). Sentence-split (handle "e.g." and numbered lists sensibly). Keep sentences that name >= 1 other seed generic or one of its brands (build a brand -> generic map from the labels you fetch). Also store geriatric_use sentences per drug and Ongoing recalls per generic. Every SourceRef.query is the full openFDA URL you called.

Hard acceptance (test these on real data): INDEX_META.drugs >= 60; interactionSentences >= 200; checkInteractions(["ciprofloxacin","warfarin"]).length >= 1 and its top sentence contains "warfarin" or a warfarin brand; checkInteractions(["warfarin","aspirin","amiodarone"]) returns >= 2 flags; duplicateTherapy(["atorvastatin","simvastatin"]) returns the statin class; geriatricWarnings("diazepam").length >= 1; labelSection("metformin","boxed_warning") non-null. Break one (e.g. drop the mentions filter), see red, restore, see green.

Print a summary at the end of the build: drugs, sentences, geriatric sentences, recalls, top 3 URLs. Reference: ../out-of-service/scripts/build-index.ts shows the SourceRef pattern.

RULES (bind you):
- Work ONLY in the repo path given. Edit ONLY the files your role owns per docs/BUILD-CONTRACT.md. If you need a change elsewhere, write docs/HANDOFF-<role>.md and stub locally against the contract types.
- Read docs/BUILD-CONTRACT.md fully first, then ../docs/NEXT-ENTRIES.md (Entry B), then the existing files you will replace.
- Commit after every solid step with `git add <your paths> && git commit -m "..."`. Never `git add -A` (other agents share the tree). Never push.
- Keyless public data only. For HTTP use curl or node fetch; if you get 403/429 back off and retry, or use mcp__ScraplingServer__get. Never handle secrets.
- Verification: a check that cannot fail is not a check. Never verify against empty data. Break the guarded thing, see red, restore, see green, report both.
- No em dashes anywhere. Never the phrase "medical advice"; say "for discussion with a pharmacist".
- Tests: `npx vitest run src/lib/index`. Types: `npx tsc --noEmit`.
- When done: run the checks that touch your paths, then `swarm report` with status, files, what you verified (numbers), and any HANDOFF items. Then stop.
