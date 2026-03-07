import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, ChevronDown, Clock, ExternalLink, ArrowUpRight, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const HISTORY_KEY = "synthesize-history";

type SummaryRecord = {
  url: string;
  summary: string;
  timestamp: number;
};

const isValidYouTubeUrl = (value: string) =>
  /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(value);

const truncate = (value: string, length = 120) =>
  value.length <= length ? value : `${value.slice(0, length).trim()}…`;

const formatTime = (ts: number) =>
  new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const getVideoTitle = (url: string) => {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const v = u.searchParams.get("v");
    return v ? `youtu.be/${v}` : url.replace(/https?:\/\/(www\.)?/, "").slice(0, 40);
  } catch {
    return url.slice(0, 40);
  }
};

const YouTubeSynthesiser = () => {
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [activeUrl, setActiveUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SummaryRecord[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewingHistory, setViewingHistory] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const persistHistory = (record: SummaryRecord) => {
    setHistory((prev) => {
      const next = [record, ...prev.filter(h => h.url !== record.url)].slice(0, 20);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  const deleteHistory = (timestamp: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => {
      const next = prev.filter(h => h.timestamp !== timestamp);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  const loadFromHistory = (item: SummaryRecord) => {
    setSummary(item.summary);
    setActiveUrl(item.url);
    setUrl(item.url);
    setIsComplete(true);
    setIsLoading(false);
    setError(null);
    setViewingHistory(true);
    setHistoryOpen(false);
    setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const handleCopy = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
  };

  const handleSummarize = async (event?: FormEvent) => {
    event?.preventDefault();
    setError(null);
    setCopied(false);
    setViewingHistory(false);

    const trimmed = url.trim();
    if (!trimmed) { setError("Please paste a YouTube URL."); return; }
    if (!isValidYouTubeUrl(trimmed)) { setError("Please enter a valid YouTube URL."); return; }

    setIsLoading(true);
    setIsComplete(false);
    setSummary("");
    setActiveUrl(trimmed);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!response.ok || !response.body) {
        const msg = await response.text();
        try { throw new Error(JSON.parse(msg).error || msg); }
        catch { throw new Error(msg || `Error ${response.status}`); }
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let aggregated = "";

      outer: while (true) {
        const { value, done } = await reader.read();
        buffer += done
          ? decoder.decode(new Uint8Array(), { stream: false })
          : decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!raw.startsWith("data:")) continue;
          const payload = JSON.parse(raw.replace(/^data:\s*/, ""));
          if (payload.error) throw new Error(payload.error);
          if (payload.chunk) { aggregated += payload.chunk; setSummary(aggregated); }
          if (payload.done) break outer;
        }
        if (done) break;
      }

      setIsComplete(true);
      if (aggregated.trim()) {
        persistHistory({ url: trimmed, summary: aggregated, timestamp: Date.now() });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-[680px] px-6 py-16 space-y-10">

        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-2xl font-medium tracking-tight text-zinc-900">Synthesize</h1>
          <p className="text-sm text-zinc-400">Paste a YouTube URL — get a structured AI summary.</p>
        </header>

        {/* Input */}
        <form onSubmit={handleSummarize} className="space-y-3">
          <Input
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            className="h-11 bg-white border-zinc-200 placeholder:text-zinc-400 focus-visible:ring-indigo-500 focus-visible:ring-1 focus-visible:border-indigo-400 rounded-xl text-sm"
          />
          <Button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse [animation-delay:300ms]" />
                <span className="ml-1">Generating</span>
              </span>
            ) : "Generate summary"}
          </Button>
        </form>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50 text-red-700">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary panel */}
        {(isLoading || summary) && (
          <div ref={summaryRef} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-3 min-w-0">
                {isLoading && !isComplete ? (
                  <>
                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-sm text-zinc-500">Streaming summary…</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm text-zinc-500 truncate">
                        {viewingHistory ? "From history — " : ""}
                        {getVideoTitle(activeUrl)}
                      </span>
                      {activeUrl && (
                        <a href={activeUrl} target="_blank" rel="noreferrer" className="text-zinc-300 hover:text-zinc-500 flex-shrink-0">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </>
                )}
              </div>
              {isComplete && summary && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors flex-shrink-0 ml-4"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copied!" : "Copy"}
                </button>
              )}
            </div>

            <div className="px-6 py-5">
              {isLoading && !summary ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-2/3 bg-zinc-100" />
                  <Skeleton className="h-4 w-full bg-zinc-100" />
                  <Skeleton className="h-4 w-5/6 bg-zinc-100" />
                  <Skeleton className="h-4 w-3/4 bg-zinc-100" />
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-zinc-700
                  prose-headings:font-semibold prose-headings:text-zinc-900
                  prose-h1:text-xl prose-h1:mt-0
                  prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2
                  prose-h3:text-base prose-h3:mt-4
                  prose-p:leading-relaxed prose-p:text-zinc-700
                  prose-li:text-zinc-700 prose-li:my-0.5
                  prose-ul:my-3 prose-ol:my-3
                  prose-strong:text-zinc-900 prose-strong:font-medium
                  prose-hr:border-zinc-100
                  prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-600 transition-colors w-full">
                <Clock className="h-3.5 w-3.5" />
                <span>Past summaries ({history.length})</span>
                <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${historyOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-2">
              {history.map((item, i) => (
                <div
                  key={`${item.timestamp}-${i}`}
                  onClick={() => loadFromHistory(item)}
                  className="group bg-white border border-zinc-200 rounded-xl px-4 py-3 space-y-1.5 cursor-pointer hover:border-zinc-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-medium text-zinc-700 truncate">
                        {getVideoTitle(item.url)}
                      </span>
                      <ArrowUpRight className="h-3 w-3 text-zinc-300 group-hover:text-indigo-500 flex-shrink-0 transition-colors" />
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-zinc-400">{formatTime(item.timestamp)}</span>
                      <button
                        onClick={(e) => deleteHistory(item.timestamp, e)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{truncate(item.summary)}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

      </div>
    </div>
  );
};

export default YouTubeSynthesiser;
