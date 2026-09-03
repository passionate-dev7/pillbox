/**
 * The interface the WebMCP tool layer needs from the rest of the app.
 *
 * Domain types come from `src/lib/types.ts` (UI agent, canonical). This file adds only what is
 * specific to the tool layer: the actions interface tools call, and the WebMCP tool descriptor
 * shape. There is no reader interface in this template because every tool reads straight off the
 * `CaseState` already loaded on the page; a real domain fork that reads external data adds a
 * `CaseReaders` interface here the same way `out-of-service` had `TripReaders`.
 */
export type {
  Role,
  SourceRef,
  CaseItem,
  Proposal,
  TimelineEvent,
  CaseReport,
  CaseState,
  CreateCaseInput,
} from "@/lib/types";

import type { CaseState, CreateCaseInput } from "@/lib/types";

/**
 * Mutations, exactly the `actions` object from the UI agent's `useCase() -> { caseState,
 * role, actions }`. Every one of these is server-authoritative: the server re-checks the role,
 * so a hidden tool is never the only thing standing between a partner and an owner-only action.
 */
export interface CaseActions {
  createCase(input: CreateCaseInput): Promise<CaseState & { ownerUrl: string; partnerUrl: string }>;
  addItem(text: string): Promise<CaseState>;
  proposeChange(text: string, reason: string): Promise<CaseState>;
  acceptChange(proposalId: string): Promise<CaseState>;
  rejectChange(proposalId: string): Promise<CaseState>;
  addNote(text: string): Promise<CaseState>;
  report(subject: string, description: string): Promise<CaseState>;
}

/** JSON Schema (draft 2020-12 subset) as accepted by `document.modelContext.registerTool`. */
export type JsonSchema = {
  type: "object";
  properties: Record<string, Record<string, unknown>>;
  required?: string[];
  additionalProperties: false;
};

/** WebMCP has exactly two annotations. There is no destructiveHint. */
export type ToolAnnotations = { readOnlyHint: boolean; untrustedContentHint: boolean };

export type ToolExecuteOptions = { signal?: AbortSignal };

export type WebMcpToolDef = {
  name: string;
  title?: string;
  description: string;
  inputSchema: JsonSchema;
  annotations: ToolAnnotations;
  /**
   * Native Chrome passes `{ signal }` per spec; `@mcp-b/webmcp-polyfill` calls
   * `execute(args)` with one argument, so `options` must be treated as optional.
   */
  execute: (input: Record<string, unknown>, options?: ToolExecuteOptions) => Promise<unknown>;
  /**
   * "form" means this tool is registered by the browser from a `<form toolname=...>`,
   * not by registerTool. WebMCPTools skips these so the two never collide on name.
   */
  declarative?: "form";
};
