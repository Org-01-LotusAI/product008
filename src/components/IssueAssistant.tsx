import { FormEvent, useState } from "react";
import { Check, MessageCircle, Send, X } from "lucide-react";
import {
  assistantHealth,
  createIssue,
  sendChat,
  type AssistantHealth,
  type ChatTurn,
  type CreatedIssue,
  type IssueDraft,
} from "../api/assistant";

const starters = [
  "The cart quantity does not update when I add the same size twice.",
  "File an issue on Org-01-LotusAI/product008 about the free-shipping banner.",
];

export function IssueAssistant() {
  const [open, setOpen] = useState(false);
  const [health, setHealth] = useState<AssistantHealth | null>(null);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [proposal, setProposal] = useState<IssueDraft | null>(null);
  const [created, setCreated] = useState<CreatedIssue | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"chat" | "issue" | null>(null);

  async function openPanel() {
    setOpen(true);
    if (health) return;
    try {
      setHealth(await assistantHealth());
    } catch (caught) {
      setHealth({
        ok: false,
        defaultOwner: "",
        defaultRepo: "",
        error: caught instanceof Error ? caught.message : "Assistant is offline.",
      });
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || busy) return;
    const history = [...messages, { role: "user" as const, content }];
    setMessages(history);
    setDraft("");
    setError("");
    setCreated(null);
    setBusy("chat");
    try {
      const reply = await sendChat(history);
      setMessages([...history, { role: "assistant", content: reply.reply }]);
      setProposal(
        reply.readyForApproval
          ? {
              owner: reply.owner,
              repo: reply.repo,
              title: reply.title,
              body: reply.body,
            }
          : null,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The chat failed.");
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    if (!proposal || busy) return;
    setBusy("issue");
    setError("");
    try {
      const issue = await createIssue(proposal);
      setCreated(issue);
      setProposal(null);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `Created issue #${issue.number} on ${issue.repo}.`,
        },
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "GitHub rejected the issue.");
    } finally {
      setBusy(null);
    }
  }

  const target =
    health?.defaultOwner && health.defaultRepo
      ? `${health.defaultOwner}/${health.defaultRepo}`
      : "";

  return (
    <>
      <button
        className="assistant-launcher"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-expanded={open}
      >
        <MessageCircle size={18} />
        {open ? "Close assistant" : "Issue assistant"}
      </button>
      {open && (
        <section className="assistant-panel" aria-label="Issue assistant">
          <header>
            <div>
              <p>GitHub issues</p>
              <strong>Talk it through, then approve.</strong>
            </div>
            <button aria-label="Close issue assistant" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </header>
          <p className="assistant-target">
            {target
              ? `Default repository is ${target}. Name another as owner/repo in the chat.`
              : health?.error || "Checking the assistant…"}
          </p>
          <div className="assistant-log">
            {messages.length === 0 && (
              <div className="assistant-empty">
                <p>Describe a bug or change. Nothing is filed until you approve the draft.</p>
                {starters.map((starter) => (
                  <button key={starter} type="button" onClick={() => setDraft(starter)}>
                    {starter}
                  </button>
                ))}
              </div>
            )}
            {messages.map((message, index) => (
              <p key={index} className={message.role}>
                {message.content}
              </p>
            ))}
            {busy === "chat" && <p className="assistant">Drafting a reply…</p>}
          </div>
          {proposal && (
            <form
              className="assistant-draft"
              onSubmit={(event) => {
                event.preventDefault();
                void approve();
              }}
            >
              <div className="assistant-repo">
                <label>
                  Owner
                  <input
                    aria-label="Issue owner"
                    value={proposal.owner}
                    onChange={(event) =>
                      setProposal({ ...proposal, owner: event.target.value })
                    }
                  />
                </label>
                <label>
                  Repo
                  <input
                    aria-label="Issue repository"
                    value={proposal.repo}
                    onChange={(event) =>
                      setProposal({ ...proposal, repo: event.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                Title
                <input
                  aria-label="Issue title"
                  value={proposal.title}
                  onChange={(event) =>
                    setProposal({ ...proposal, title: event.target.value })
                  }
                />
              </label>
              <label>
                Body
                <textarea
                  aria-label="Issue body"
                  value={proposal.body}
                  onChange={(event) =>
                    setProposal({ ...proposal, body: event.target.value })
                  }
                />
              </label>
              <div className="assistant-actions">
                <button type="button" onClick={() => setProposal(null)}>
                  Dismiss draft
                </button>
                <button type="submit" disabled={busy === "issue" || !proposalReady(proposal)}>
                  <Check size={16} />
                  {busy === "issue" ? "Creating…" : "Approve and create issue"}
                </button>
              </div>
            </form>
          )}
          {created && (
            <p className="assistant-created">
              Filed{" "}
              <a href={created.url} target="_blank" rel="noreferrer">
                {created.repo}#{created.number}
              </a>
            </p>
          )}
          {error && <p className="assistant-error">{error}</p>}
          <form className="assistant-composer" onSubmit={submit}>
            <label className="sr-only" htmlFor="assistant-message">
              Message
            </label>
            <textarea
              id="assistant-message"
              aria-label="Message"
              placeholder="Describe the issue, and mention owner/repo if it is not the default."
              value={draft}
              rows={3}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button type="submit" disabled={busy !== null || !draft.trim()}>
              <Send size={16} />
              Send
            </button>
          </form>
        </section>
      )}
    </>
  );
}

function proposalReady(proposal: IssueDraft) {
  return [proposal.owner, proposal.repo, proposal.title, proposal.body].every(
    (value) => value.trim().length > 0,
  );
}
