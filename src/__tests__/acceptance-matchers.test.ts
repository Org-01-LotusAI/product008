// @vitest-environment node
import { describe, expect, it } from "vitest";
import { normalizeAcceptanceMatchers } from "../harness/acceptance-matchers";

type Matcher = (
  content: string,
  node: { textContent?: string } | null,
) => boolean;
function matcherFrom(code: string): Matcher {
  let matcher: Matcher | undefined;
  const screen = {
    getByText: (callback: Matcher) => {
      matcher = callback;
    },
  };
  // Only fixed test fixtures are evaluated here, never generated acceptance code.
  new Function("screen", normalizeAcceptanceMatchers(code))(screen);
  if (!matcher) throw new Error("Fixture did not supply a matcher");
  return matcher;
}

describe("acceptance matcher normalization", () => {
  it.each([
    "screen.getByText((content, node) => node?.textContent?.includes(content));",
    "screen.getByText((content, node) => { return node?.textContent?.includes(content); });",
    "screen.getByText(function(content, node) { if (node) return node.textContent?.includes(content); });",
    "screen.getByText((content, node) => { if (!node) return; return node.textContent?.includes(content); });",
  ])(
    "returns boolean for missing nodes and text without changing matches: %s",
    (code) => {
      const matcher = matcherFrom(code);
      expect(matcher("shipping", null)).toBe(false);
      expect(matcher("shipping", {})).toBe(false);
      expect(matcher("shipping", { textContent: "Free shipping" })).toBe(true);
      expect(matcher("shipping", { textContent: "Shopping bag" })).toBe(false);
    },
  );

  it("leaves non-query callbacks and role names unchanged", () => {
    const code =
      "const pick = (node) => node?.textContent; values.map(pick); screen.getByRole('status');";
    expect(normalizeAcceptanceMatchers(code)).toBe(code);
  });

  it("does not rewrite returns inside a matcher's helper functions", () => {
    const code =
      "screen.getByText((content, node) => { const text = () => node?.textContent; return text()?.includes(content); });";
    expect(normalizeAcceptanceMatchers(code)).toContain(
      "() => node?.textContent",
    );
    const matcher = matcherFrom(code);
    expect(matcher("shipping", null)).toBe(false);
    expect(matcher("shipping", { textContent: "Free shipping" })).toBe(true);
  });
});
