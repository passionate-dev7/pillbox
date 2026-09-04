"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CaseState, Role } from "@/lib/types";
import type { CaseActions } from "@/lib/webmcp/contracts";
import { unspotlight } from "@/lib/spotlight";

/**
 * The case SSE stream spotlights free text the same way a get_case tool result does, so any
 * other reader of that endpoint gets the untrusted-content boundary. This page is a trusted
 * first-party human reader, not a model, so it undoes the wrapping before the text ever reaches
 * a component.
 */
function unspotlightCase(caseState: CaseState): CaseState {
  return {
    ...caseState,
    notes: caseState.notes.map((n) => ({ ...n, text: unspotlight(n.text) })),
    counsel: caseState.counsel.map((n) => ({ ...n, text: unspotlight(n.text) })),
    reports: caseState.reports.map((r) => ({ ...r, description: unspotlight(r.description) })),
    proposals: caseState.proposals.map((p) => ({ ...p, reason: unspotlight(p.reason) })),
  };
}

export type CaseContextValue = {
  caseState: CaseState;
  role: Role;
  actions: CaseActions;
  /** The caregiver's one-time view of the pharmacist's key, known to the caregiver session only. */
  partnerKey?: string;
  stream: "connecting" | "open" | "closed";
  error: string | null;
};

const CaseContext = createContext<CaseContextValue | null>(null);

export function useCase(): CaseContextValue {
  const ctx = useContext(CaseContext);
  if (!ctx) throw new Error("useCase() must be called inside <CaseProvider>.");
  return ctx;
}

async function postAction(
  caseId: string,
  type: string,
  key: string,
  payload: Record<string, unknown>,
): Promise<CaseState> {
  const res = await fetch(`/api/case/${caseId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, key, payload }),
  });
  const body = (await res.json()) as { case?: CaseState; error?: string };
  if (!res.ok || !body.case) {
    throw new Error(body.error ?? `The server rejected ${type} with HTTP ${res.status}.`);
  }
  return body.case;
}

export function CaseProvider({
  caseId,
  role,
  sessionKey,
  partnerKey,
  initialCase,
  children,
}: {
  caseId: string;
  role: Role;
  /** This session's own capability key (the `?k=` it opened with). Sent with every action. */
  sessionKey: string;
  /** The caregiver session's one-time view of the pharmacist's key, for the share link. */
  partnerKey?: string;
  initialCase: CaseState;
  children: ReactNode;
}) {
  const [caseState, setCaseState] = useState<CaseState>(initialCase);
  const [stream, setStream] = useState<CaseContextValue["stream"]>("connecting");
  const [error, setError] = useState<string | null>(null);

  const versionRef = useRef(initialCase.version);
  const apply = useCallback((next: CaseState) => {
    if (next.version < versionRef.current) return;
    versionRef.current = next.version;
    setCaseState(unspotlightCase(next));
  }, []);

  useEffect(() => {
    let stopped = false;
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const disconnect = () => {
      source?.close();
      source = null;
      setStream("closed");
    };

    const connect = () => {
      if (stopped || source) return;
      setStream("connecting");
      const es = new EventSource(`/api/case/${caseId}/stream`);
      source = es;
      es.addEventListener("open", () => setStream("open"));
      es.addEventListener("case", (e) => {
        apply(JSON.parse((e as MessageEvent).data) as CaseState);
        setStream("open");
      });
      es.addEventListener("end", () => {
        disconnect();
        retry = setTimeout(connect, 500);
      });
      es.addEventListener("error", () => setStream("closed"));
    };

    connect();

    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      disconnect();
    };
  }, [caseId, apply]);

  const run = useCallback(
    async (type: string, payload: Record<string, unknown>) => {
      setError(null);
      try {
        const next = await postAction(caseId, type, sessionKey, payload);
        apply(next);
        return next;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    [caseId, sessionKey, apply],
  );

  const actions = useMemo<CaseActions>(
    () => ({
      async createCase(input) {
        const res = await fetch("/api/case", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const body = (await res.json()) as {
          case?: CaseState;
          ownerUrl?: string;
          partnerUrl?: string;
          error?: string;
        };
        if (!res.ok || !body.case || !body.ownerUrl || !body.partnerUrl) {
          throw new Error(body.error ?? `Creating the round failed with HTTP ${res.status}.`);
        }
        return { ...body.case, ownerUrl: body.ownerUrl, partnerUrl: body.partnerUrl };
      },
      addMedication: (generic, dose, schedule, prescriber) =>
        run("add_medication", { generic, dose, schedule, prescriber }),
      proposeChange: (kind, reason, medicationId, fields) =>
        run("propose_change", { kind, reason, medicationId, ...(fields ?? {}) }),
      acceptChange: (proposalId) => run("accept_change", { proposalId }),
      rejectChange: (proposalId) => run("accept_change", { proposalId, decision: "reject" }),
      addCounselNote: (text) => run("add_counsel_note", { text }),
      addNote: (text) => run("add_note", { text }),
      reportSideEffect: (description, onset, severity, medicationId) =>
        run("report_side_effect", { description, onset, severity, medicationId }),
      printRoundCard: () => run("print_round_card", {}),
    }),
    [run],
  );

  const value = useMemo<CaseContextValue>(
    () => ({ caseState, role, actions, partnerKey, stream, error }),
    [caseState, role, actions, partnerKey, stream, error],
  );

  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}
