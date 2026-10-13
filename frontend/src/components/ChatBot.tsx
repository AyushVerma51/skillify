import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles } from "lucide-react";
import { useWorkspace } from "../context/workspace";
import { apiFetch } from "../lib/api";

function ChatBot() {
  const { targetRole } = useWorkspace();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [generatingAnswer, setGeneratingAnswer] = useState(false);

  async function generateAnswer(e: React.FormEvent) {
    setGeneratingAnswer(true);
    e.preventDefault();
    setAnswer("Preparing practical guidance...");
    try {
      const response = await apiFetch<{ answer: string }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: question,
          context: targetRole ? { targetRole } : {},
        }),
      });
      setAnswer(response.answer);
    } catch (error) {
      setAnswer(error instanceof Error ? error.message : "Sorry, something went wrong.");
    }

    setGeneratingAnswer(false);
  }

  return (
    <div className="flex max-h-[78vh] w-[min(92vw,420px)] flex-col bg-[#f4f1e8] p-5">
      <form
        onSubmit={generateAnswer}
        className="w-full rounded-[1.5rem] bg-sk-ink p-5 text-white shadow-lg"
      >
        <span className="eyebrow text-sk-lime"><Sparkles className="h-4 w-4" /> Career coach</span>
        <h1 className="mt-3 text-2xl font-black">What are you trying to figure out?</h1>
        {targetRole && <p className="mt-2 text-sm text-slate-400">Current direction: {targetRole}</p>}
        <textarea
          required
          className="mt-4 min-h-28 w-full rounded-xl border border-white/15 bg-white/10 p-3 text-white outline-none placeholder:text-slate-500 focus:border-sk-lime"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about careers, skills, interviews, or your roadmap"
        ></textarea>
        <button
          type="submit"
          className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sk-lime p-3 font-black text-sk-ink transition hover:bg-white ${
            generatingAnswer ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={generatingAnswer}
        >
          Ask Skillify <Send className="h-4 w-4" />
        </button>
      </form>
      <div
        className="mt-4 min-h-20 w-full overflow-y-auto rounded-[1.5rem] bg-white shadow-lg"
      >
        <ReactMarkdown className="prose prose-sm max-w-none whitespace-pre-line p-5">
          {answer}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export default ChatBot;
