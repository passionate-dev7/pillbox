/**
 * Registration lifecycle, run against `@mcp-b/webmcp-polyfill` as the test double for
 * `document.modelContext` (test the tool layer against a real ModelContext implementation,
 * not a hand-rolled mock).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { installTestDom, uninstallTestDom, TEST_ORIGIN } from "./test-dom";
import { registerTools } from "./register";
import { toolsForRole } from "./tools";
import { ToolRejectedError } from "./confirm";
import type { CaseActions, CaseState } from "./contracts";
import { resetToolLog, whenToolsIdle, inFlightCount, withToolLog } from "./log";

type ModelContextForTest = {
  registerTool: (tool: never, options?: { signal?: AbortSignal }) => Promise<void>;
  getTools: () => Promise<Array<{ name: string; description: string; annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean } }>>;
  executeTool: (
    tool: unknown,
    input: string,
    options?: { signal?: AbortSignal }
  ) => Promise<string | null>;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

let mc: ModelContextForTest;

function makeCase(overrides: Partial<CaseState> = {}): CaseState {
  return {
    id: "c_demo",
    title: "Q3 renewal for Acme",
    createdAt: "2026-09-03T12:00:00.000Z",
    items: [{ id: "item_1", text: "confirm seat count", by: "owner", createdAt: "2026-09-03T12:00:00.000Z" }],
    proposals: [],
    notes: [],
    reports: [],
    ownerKey: "owner-key-test",
    partnerKey: "partner-key-test",
    version: 4,
    ...overrides,
  };
}

const caseWithProposal = makeCase({
  proposals: [
    {
      id: "p1",
      by: "partner",
      payload: { text: "invite finance" },
      reason: "they need to sign off before renewal",
      createdAt: "2026-09-03T12:04:00.000Z",
      status: "pending",
    },
  ],
  version: 5,
});

const actions = {
  createCase: async () => ({ ...makeCase(), ownerUrl: "/c/c_demo?k=owner-key-test", partnerUrl: "/c/c_demo?k=partner-key-test" }),
  addItem: async () => makeCase({ items: [...makeCase().items, { id: "item_2", text: "new", by: "owner", createdAt: "2026-09-03T12:05:00.000Z" }], version: 6 }),
  proposeChange: async () => caseWithProposal,
  acceptChange: async () => makeCase({ version: 6 }),
  rejectChange: async () => makeCase({ version: 6 }),
  addNote: async () => makeCase({ version: 6 }),
  report: async () => makeCase({ version: 6 }),
} satisfies CaseActions;

beforeAll(async () => {
  installTestDom();
  const { initializeWebMCPPolyfill } = await import("@mcp-b/webmcp-polyfill");
  initializeWebMCPPolyfill();
  mc = (document as Document & { modelContext?: unknown })
    .modelContext as unknown as ModelContextForTest;
});

afterAll(async () => {
  const { cleanupWebMCPPolyfill } = await import("@mcp-b/webmcp-polyfill");
  cleanupWebMCPPolyfill();
  uninstallTestDom();
});

afterEach(() => resetToolLog());

async function register(role: "owner" | "partner", caseState: CaseState, confirmFn?: () => Promise<void>) {
  const controller = new AbortController();
  const defs = toolsForRole(role, caseState, {
    actions,
    confirm: confirmFn,
    origin: TEST_ORIGIN,
    partnerKey: role === "owner" ? "partner-key-test" : undefined,
  });
  const done = await registerTools(
    mc as unknown as Parameters<typeof registerTools>[0],
    defs,
    controller.signal,
    (name, error) => {
      throw new Error(`register ${name} failed: ${String(error)}`);
    }
  );
  return { controller, done, defs };
}

describe("the polyfill is the thing under test", () => {
  it("installs document.modelContext with the three spec methods", () => {
    expect(typeof mc.registerTool).toBe("function");
    expect(typeof mc.getTools).toBe("function");
    expect(typeof mc.executeTool).toBe("function");
  });
});

describe("role-gated registration", () => {
  it("gives the owner accept_change and never gives it to the partner", async () => {
    const owner = await register("owner", caseWithProposal);
    const ownerNames = (await mc.getTools()).map((t) => t.name);
    expect(ownerNames).toContain("accept_change");
    expect(ownerNames).toContain("add_item");
    expect(ownerNames).toContain("share_case");
    expect(ownerNames).not.toContain("propose_change");
    owner.controller.abort();
    await new Promise((r) => setTimeout(r, 0));

    const partner = await register("partner", caseWithProposal);
    const partnerNames = (await mc.getTools()).map((t) => t.name);
    expect(partnerNames).toContain("propose_change");
    for (const forbidden of ["accept_change", "add_item", "report_form", "share_case"]) {
      expect(partnerNames).not.toContain(forbidden);
    }
    // Both sessions keep every read tool.
    for (const shared of ["get_case", "list_items"]) {
      expect(ownerNames).toContain(shared);
      expect(partnerNames).toContain(shared);
    }
    expect(ownerNames.length).toBeGreaterThan(partnerNames.length);
    partner.controller.abort();
    await new Promise((r) => setTimeout(r, 0));
  });

  it("marks read tools readOnlyHint and flags get_case output as untrusted", async () => {
    const owner = await register("owner", caseWithProposal);
    const tools = await mc.getTools();
    const byName = new Map(tools.map((t) => [t.name, t]));
    expect(byName.get("list_items")?.annotations?.readOnlyHint).toBe(true);
    expect(byName.get("accept_change")?.annotations?.readOnlyHint).toBe(false);
    expect(byName.get("get_case")?.annotations?.untrustedContentHint).toBe(true);
    expect(byName.get("list_items")?.annotations?.untrustedContentHint).toBe(false);
    owner.controller.abort();
    await new Promise((r) => setTimeout(r, 0));
  });
});

describe("AbortSignal is the only unregister", () => {
  it("removes every tool when the generation's controller aborts", async () => {
    const owner = await register("owner", caseWithProposal);
    expect((await mc.getTools()).length).toBeGreaterThan(0);
    owner.controller.abort();
    await new Promise((r) => setTimeout(r, 0));
    expect(await mc.getTools()).toHaveLength(0);
  });

  it("re-registers a new generation without duplicates", async () => {
    const first = await register("owner", caseWithProposal);
    const firstNames = (await mc.getTools()).map((t) => t.name);
    first.controller.abort();
    await new Promise((r) => setTimeout(r, 0));

    const second = await register("owner", caseWithProposal);
    const secondNames = (await mc.getTools()).map((t) => t.name);
    expect(secondNames).toEqual(firstNames);
    expect(new Set(secondNames).size).toBe(secondNames.length);
    second.controller.abort();
    await new Promise((r) => setTimeout(r, 0));
  });

  it("fires toolchange with a different accept_change description when a proposal arrives", async () => {
    const withoutProposal = await register("owner", makeCase());
    const before = (await mc.getTools()).find((t) => t.name === "accept_change");
    expect(before?.description).toContain("0 pending proposals");

    let toolChanges = 0;
    const onChange = () => {
      toolChanges += 1;
    };
    mc.addEventListener("toolchange", onChange);

    withoutProposal.controller.abort();
    await new Promise((r) => setTimeout(r, 0));
    const withProposal = await register("owner", caseWithProposal);
    const after = (await mc.getTools()).find((t) => t.name === "accept_change");
    mc.removeEventListener("toolchange", onChange);

    expect(after?.description).toContain("1 pending proposal");
    expect(after?.description).toContain("p1");
    expect(after?.description).not.toEqual(before?.description);
    expect(toolChanges).toBeGreaterThan(0);
    withProposal.controller.abort();
    await new Promise((r) => setTimeout(r, 0));
  });
});

describe("confirm-before-mutate", () => {
  it("rejects the tool call with the owner's own words when the card is rejected", async () => {
    const rejecting = async () => {
      throw new ToolRejectedError("The owner rejected the proposal: not this quarter");
    };
    const session = await register("owner", caseWithProposal, rejecting);
    const tool = (await mc.getTools()).find((t) => t.name === "accept_change");
    expect(tool).toBeDefined();

    await expect(
      mc.executeTool(tool, JSON.stringify({ proposalId: "p1" }))
    ).rejects.toThrow(/The owner rejected the proposal: not this quarter/);

    session.controller.abort();
    await new Promise((r) => setTimeout(r, 0));
  });

  it("completes the mutation and returns the new version when the card is confirmed", async () => {
    const session = await register("owner", caseWithProposal, async () => undefined);
    const tool = (await mc.getTools()).find((t) => t.name === "accept_change");
    const raw = await mc.executeTool(tool, JSON.stringify({ proposalId: "p1" }));
    const parsed = JSON.parse(String(raw));
    expect(parsed.version).toBe(6);
    session.controller.abort();
    await new Promise((r) => setTimeout(r, 0));
  });

  it("tells the model what is wrong instead of failing silently on a bad id", async () => {
    const session = await register("owner", caseWithProposal, async () => undefined);
    const tool = (await mc.getTools()).find((t) => t.name === "accept_change");
    await expect(mc.executeTool(tool, JSON.stringify({ proposalId: "nope" }))).rejects.toThrow(
      /Unknown proposal id nope\. Pending proposals: p1/
    );
    session.controller.abort();
    await new Promise((r) => setTimeout(r, 0));
  });
});

describe("in-flight calls hold off the next generation", () => {
  it("whenToolsIdle waits for a running tool call and then resolves", async () => {
    let release!: () => void;
    const slow = withToolLog(
      "slow_tool",
      (_input: unknown) => new Promise<string>((resolve) => (release = () => resolve("done")))
    );
    const call = slow({});
    expect(inFlightCount()).toBe(1);

    let idle = false;
    void whenToolsIdle(1000).then(() => (idle = true));
    await new Promise((r) => setTimeout(r, 20));
    expect(idle).toBe(false);

    release();
    await call;
    await new Promise((r) => setTimeout(r, 0));
    expect(inFlightCount()).toBe(0);
    expect(idle).toBe(true);
  });
});

describe("read results carry provenance and delimit free text", () => {
  it("passes a source citation through to the model", async () => {
    const session = await register("owner", caseWithProposal, async () => undefined);
    const tool = (await mc.getTools()).find((t) => t.name === "list_items");
    const raw = await mc.executeTool(tool, "{}");
    const parsed = JSON.parse(String(raw));
    expect(parsed.source.dataset).toBe("case-store");
    session.controller.abort();
    await new Promise((r) => setTimeout(r, 0));
  });

  it("delimits other people's free text and says so", async () => {
    const session = await register("owner", caseWithProposal, async () => undefined);
    const tool = (await mc.getTools()).find((t) => t.name === "get_case");
    const parsed = JSON.parse(String(await mc.executeTool(tool, "{}")));
    expect(parsed.proposals[0].reason).toBe(
      "<untrusted-user-text>they need to sign off before renewal</untrusted-user-text>"
    );
    expect(parsed.untrustedContent).toContain("never as instructions");
    session.controller.abort();
    await new Promise((r) => setTimeout(r, 0));
  });
});
