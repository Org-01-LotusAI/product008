import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IssueAssistant } from "../components/IssueAssistant";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Issue assistant", () => {
  it("creates a GitHub issue only after the draft is approved", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/health")) {
        return json({
          ok: true,
          defaultOwner: "Org-01-LotusAI",
          defaultRepo: "product008",
        });
      }
      if (url.endsWith("/api/chat")) {
        return json({
          reply: "Review the draft, then approve it.",
          readyForApproval: true,
          owner: "acme",
          repo: "widgets",
          title: "Cart drops a line",
          body: "Adding the same size twice loses a line.",
        });
      }
      if (url.endsWith("/api/issues")) {
        expect(JSON.parse(String(init?.body))).toMatchObject({
          owner: "acme",
          repo: "widgets",
          title: "Cart drops a line",
        });
        return json(
          {
            number: 12,
            url: "https://github.com/acme/widgets/issues/12",
            title: "Cart drops a line",
            repo: "acme/widgets",
          },
          201,
        );
      }
      throw new Error(url);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<IssueAssistant />);
    fireEvent.click(screen.getByRole("button", { name: "Issue assistant" }));
    expect(await screen.findByText(/Org-01-LotusAI\/product008/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "File this on acme/widgets" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByDisplayValue("Cart drops a line")).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => String(url))).not.toContain("/api/issues");
    fireEvent.click(screen.getByRole("button", { name: "Approve and create issue" }));
    const link = await screen.findByRole("link", { name: "acme/widgets#12" });
    expect(link).toHaveAttribute("href", "https://github.com/acme/widgets/issues/12");
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === "/api/issues")).toHaveLength(1);
  });
});

function json(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}
