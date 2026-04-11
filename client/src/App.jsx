import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SignInButton,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/clerk-react";
import SummaryDisplay from "./components/SummaryDisplay";
import BackgroundGrid from "./components/BackgroundGrid";

const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+/;

function extractVideoId(url) {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]+)/
  );
  return match ? match[1] : null;
}

export default function App() {
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | streaming | error | done
  const [error, setError] = useState("");
  const [videoId, setVideoId] = useState(null);
  const [elapsed, setElapsed] = useState(null);
  const [dark, setDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const abortRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const trimmed = url.trim();

      if (!YOUTUBE_URL_REGEX.test(trimmed)) {
        setError("Please enter a valid YouTube URL.");
        setStatus("error");
        return;
      }

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const vid = extractVideoId(trimmed);
      setVideoId(vid);
      setSummary("");
      setError("");
      setElapsed(null);
      setStatus("loading");
      startTimeRef.current = performance.now();

      try {
        const token = await getToken();
        const res = await fetch("/api/summarize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url: trimmed }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Something went wrong.");
        }

        setStatus("streaming");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);

            if (payload === "[DONE]") {
              const duration = (
                (performance.now() - startTimeRef.current) /
                1000
              ).toFixed(1);
              setElapsed(duration);
              setStatus("done");
              return;
            }

            try {
              const data = JSON.parse(payload);
              if (data.error) {
                setError(data.error);
                setStatus("error");
                return;
              }
              if (data.text) {
                setSummary((prev) => prev + data.text);
              }
            } catch {
              // skip malformed JSON
            }
          }
        }

        const duration = (
          (performance.now() - startTimeRef.current) /
          1000
        ).toFixed(1);
        setElapsed(duration);
        setStatus("done");
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "An unexpected error occurred.");
        setStatus("error");
      }
    },
    [url]
  );

  const handleCopy = useCallback(() => {
    if (summary) navigator.clipboard.writeText(summary);
  }, [summary]);

  const handleShare = useCallback(() => {
    if (navigator.share && summary) {
      navigator.share({ title: "SYNTHESIZE Summary", text: summary });
    }
  }, [summary]);

  const isLoading = status === "loading" || status === "streaming";

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-cream dark:bg-dark-bg flex items-center justify-center">
        <BackgroundGrid />
        <Spinner />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-cream dark:bg-dark-bg text-ink dark:text-dark-text transition-colors">
        <BackgroundGrid />
        <div className="max-w-[720px] mx-auto px-5 py-16">
          {/* Dark mode toggle */}
          <motion.button
            onClick={() => setDark((d) => !d)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="fixed top-5 right-5 p-2 rounded-xl bg-surface dark:bg-dark-surface shadow-soft dark:shadow-soft-dark border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] text-ink/60 dark:text-dark-text/60 hover:text-ink dark:hover:text-dark-text transition-colors"
            aria-label="Toggle dark mode"
          >
            {dark ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <p className="text-[13px] font-medium uppercase tracking-[0.15em] text-ink/40 dark:text-dark-text/40 mb-2">
              SYNTHESIZE
            </p>
            <h1 className="text-[30px] font-normal leading-[1.3] text-ink dark:text-dark-text">
              Paste a YouTube link.
              <br />
              Get an instant summary.
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-[15px] text-ink/60 dark:text-dark-text/60">
              Sign in to get started.
            </p>
            <SignInButton mode="modal">
              <button className="bg-terracotta hover:bg-terracotta-hover text-white text-[15px] font-medium px-6 py-2.5 rounded-lg transition-colors">
                Sign in
              </button>
            </SignInButton>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-dark-bg text-ink dark:text-dark-text transition-colors">
      <BackgroundGrid />
      <div className="max-w-[720px] mx-auto px-5 py-16">
        {/* Top-right controls */}
        <div className="fixed top-5 right-5 flex items-center gap-2">
          <UserButton />
          <motion.button
            onClick={() => setDark((d) => !d)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="p-2 rounded-xl bg-surface dark:bg-dark-surface shadow-soft dark:shadow-soft-dark border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] text-ink/60 dark:text-dark-text/60 hover:text-ink dark:hover:text-dark-text transition-colors"
            aria-label="Toggle dark mode"
          >
          <AnimatePresence mode="wait">
            {dark ? (
              <motion.svg
                key="sun"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                />
              </motion.svg>
            ) : (
              <motion.svg
                key="moon"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                />
              </motion.svg>
            )}
          </AnimatePresence>
          </motion.button>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <p className="text-[13px] font-medium uppercase tracking-[0.15em] text-ink/40 dark:text-dark-text/40 mb-2">
            SYNTHESIZE
          </p>
          <h1 className="text-[30px] font-normal leading-[1.3] text-ink dark:text-dark-text">
            Paste a YouTube link.
            <br />
            Get an instant summary.
          </h1>
        </motion.div>

        {/* Unified input bar */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="flex items-center bg-surface dark:bg-dark-surface border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] rounded-xl px-4 shadow-soft dark:shadow-soft-dark">
            {/* YouTube icon */}
            <svg
              className="w-5 h-5 flex-shrink-0 opacity-[0.35]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 bg-transparent text-[15px] text-ink dark:text-dark-text placeholder-ink/30 dark:placeholder-dark-text/30 py-3.5 px-3 focus:outline-none"
            />
            <motion.button
              type="submit"
              disabled={isLoading || !url.trim()}
              whileHover={
                !isLoading && url.trim() ? { scale: 1.02 } : {}
              }
              whileTap={
                !isLoading && url.trim() ? { scale: 0.97 } : {}
              }
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex-shrink-0 bg-terracotta hover:bg-terracotta-hover disabled:bg-ink/10 dark:disabled:bg-dark-text/10 disabled:text-ink/30 dark:disabled:text-dark-text/30 text-white text-[15px] font-medium px-6 py-2.5 rounded-lg my-1.5 transition-colors disabled:cursor-not-allowed"
            >
              {status === "loading" ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  Fetching...
                </span>
              ) : status === "streaming" ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  Summarizing...
                </span>
              ) : (
                "Summarize"
              )}
            </motion.button>
          </div>
        </motion.form>

        {/* Error display */}
        <AnimatePresence>
          {status === "error" && error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 rounded-xl px-5 py-4 mb-8 text-[15px]"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video metadata card */}
        <AnimatePresence>
          {videoId && (status === "loading" || status === "streaming" || status === "done") && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-4 bg-surface dark:bg-dark-surface border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] rounded-xl px-5 py-4 mb-8"
            >
              {/* Thumbnail placeholder */}
              <div className="relative flex-shrink-0 w-[80px] h-[52px] bg-ink/10 dark:bg-dark-text/10 rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                <svg
                  className="relative w-6 h-6 text-white/70 drop-shadow-sm"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              {/* Video info */}
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-ink dark:text-dark-text truncate">
                  YouTube Video
                </p>
                <p className="text-[13px] text-ink/50 dark:text-dark-text/50">
                  youtube.com
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary display */}
        <AnimatePresence>
          {(status === "loading" || summary) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <SummaryDisplay
                content={summary}
                isStreaming={status === "streaming"}
                isLoading={status === "loading"}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <AnimatePresence>
          {status === "done" && summary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-between mt-8 pt-4 border-t border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]"
            >
              <p className="text-[13px] text-ink/40 dark:text-dark-text/40">
                {elapsed ? `Summarized in ${elapsed}s` : "Summarized"} &middot;
                Powered by Claude
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-[14px] text-ink/50 dark:text-dark-text/50 hover:text-ink dark:hover:text-dark-text border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-1.5 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                    />
                  </svg>
                  Copy
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 text-[14px] text-ink/50 dark:text-dark-text/50 hover:text-ink dark:hover:text-dark-text border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-1.5 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  Share
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
