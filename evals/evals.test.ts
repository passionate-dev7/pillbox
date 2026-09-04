/**
 * The deterministic half of the eval suite.
 *
 * An eval fixture is only meaningful if the call it expects is a call the page could actually
 * accept: right role, right tool, arguments that satisfy the tool's own inputSchema. A model
 * run cannot tell you that; this can, and it runs in milliseconds on every commit.
 * The probabilistic half (does a real model choose this tool from this sentence) is described
 * in evals/README.md.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { toolSchemas, isAllowed } from "../src/lib/webmcp/tools";
import { validate } from "./schema";

type Fixture = {
  name: string;
  role: "owner" | "partner";
  page: string;
  state?: string;
  messages: Array<{ role: string; content: string }>;
  expectedCall: Array<{ functionName: string; arguments: Record<string, unknown> }>;
  expectedUnavailable?: string[];
  notes?: string;
};

const dir = join(__dirname, "fixtures");
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
const fixtures: Array<[string, Fixture]> = files.map((f) => [
  f,
  JSON.parse(readFileSync(join(dir, f), "utf8")) as Fixture,
]);
const schemas = toolSchemas();

describe("eval fixtures", () => {
  it("ships at least twelve of them", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(12);
  });

  it("covers every tool the app registers", () => {
    const called = new Set(
      fixtures.flatMap(([, fx]) => fx.expectedCall.map((c) => c.functionName))
    );
    const uncovered = Object.keys(schemas).filter((name) => !called.has(name));
    expect(uncovered).toEqual([]);
  });

  it("covers both roles", () => {
    const roles = new Set(fixtures.map(([, fx]) => fx.role));
    expect([...roles].sort()).toEqual(["owner", "partner"]);
  });

  it.each(fixtures)("%s has the shape Chrome's evals doc describes", (_file, fx) => {
    expect(Array.isArray(fx.messages)).toBe(true);
    expect(fx.messages.length).toBeGreaterThan(0);
    for (const message of fx.messages) {
      expect(typeof message.content).toBe("string");
      expect(message.content.length).toBeGreaterThan(0);
    }
    expect(Array.isArray(fx.expectedCall)).toBe(true);
  });

  it.each(fixtures)("%s expects calls that exist in that role's session", (_file, fx) => {
    for (const call of fx.expectedCall) {
      expect(schemas[call.functionName], `unknown tool ${call.functionName}`).toBeDefined();
      expect(
        isAllowed(fx.role, call.functionName),
        `${call.functionName} is not registered in a ${fx.role} session`
      ).toBe(true);
    }
  });

  it.each(fixtures)("%s has arguments that validate against the tool's inputSchema", (_file, fx) => {
    for (const call of fx.expectedCall) {
      const errors = validate(schemas[call.functionName].schema, call.arguments);
      expect(errors, `${call.functionName}: ${errors.join("; ")}`).toEqual([]);
    }
  });

  it.each(fixtures)("%s names only genuinely unavailable tools in expectedUnavailable", (_file, fx) => {
    for (const name of fx.expectedUnavailable ?? []) {
      expect(schemas[name], `unknown tool ${name}`).toBeDefined();
      expect(
        isAllowed(fx.role, name),
        `${name} IS available to a ${fx.role}, so the fixture is wrong`
      ).toBe(false);
    }
  });

  it("expresses the partner-cannot-accept case as an empty expectedCall", () => {
    const negative = fixtures.find(([file]) => file.includes("partner-cannot-accept"));
    expect(negative).toBeDefined();
    const [, fx] = negative!;
    expect(fx.role).toBe("partner");
    expect(fx.expectedCall).toEqual([]);
    expect(fx.expectedUnavailable).toContain("accept_change");
  });
});

describe("the validator can fail", () => {
  it("rejects a wrong type, a missing required field and an unknown property", () => {
    const schema = schemas.propose_change.schema;
    expect(validate(schema, { kind: "hold", reason: "B" })).toEqual([]);
    expect(validate(schema, { kind: "hold" })).toContain('$: missing required property "reason"');
    expect(validate(schema, { kind: 1, reason: "B" })).toContain(
      "$.kind: expected string, got integer"
    );
    expect(validate(schema, { kind: "hold", reason: "B", nope: 1 })).toContain(
      '$: unexpected property "nope"'
    );
    expect(validate(schema, { kind: "hold", reason: "B".repeat(400) })).toContain(
      "$.reason: longer than maxLength 280"
    );
  });
});
