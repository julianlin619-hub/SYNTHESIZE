import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function SummaryDisplay({ content, isStreaming, isLoading }) {
  const endRef = useRef(null);

  useEffect(() => {
    if (isStreaming && endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [content, isStreaming]);

  if (isLoading && !content) {
    return <SkeletonLoader />;
  }

  const sections = parseSections(content);

  return (
    <div className="space-y-10">
      {sections.map((section, i) => (
        <motion.div
          key={section.title || i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, delay: i * 0.05 }}
        >
          {section.title && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-[3px] h-[18px] bg-terracotta rounded-full flex-shrink-0" />
              <h2 className="text-[16px] font-medium text-ink dark:text-dark-text">
                {section.title}
              </h2>
            </div>
          )}
          <div className="pl-[15px]">
            <SectionContent section={section} />
          </div>
        </motion.div>
      ))}

      {isStreaming && (
        <span className="streaming-cursor inline-block text-terracotta font-normal ml-[15px]">
          |
        </span>
      )}
      <div ref={endRef} />
    </div>
  );
}

function SectionContent({ section }) {
  switch (section.type) {
    case "summary":
      return (
        <p className="text-[17px] leading-[1.75] text-ink dark:text-dark-text font-normal">
          {section.body}
        </p>
      );

    case "bullets":
      return (
        <div className="space-y-3">
          {section.items.map((item, i) => (
            <div key={i} className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-ink/30 dark:bg-dark-text/30 flex-shrink-0 mt-[9px]" />
              <p className="text-[15px] leading-[1.7] text-ink/70 dark:text-dark-text/70">
                {item}
              </p>
            </div>
          ))}
        </div>
      );

    case "timestamps":
      return (
        <div className="space-y-0.5">
          {section.items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg hover:bg-surface dark:hover:bg-dark-surface transition-colors"
            >
              <span className="text-[14px] font-mono text-terracotta min-w-[40px] flex-shrink-0">
                {item.time}
              </span>
              <span className="text-[15px] text-ink dark:text-dark-text">
                {item.text}
              </span>
            </div>
          ))}
        </div>
      );

    case "checklist":
      return (
        <div className="space-y-3">
          {section.items.map((item, i) => (
            <div key={i} className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-ink/30 dark:bg-dark-text/30 flex-shrink-0 mt-[9px]" />
              <p className="text-[15px] leading-[1.7] text-ink/70 dark:text-dark-text/70">
                {item}
              </p>
            </div>
          ))}
        </div>
      );

    case "detailed":
      return (
        <div className="space-y-3">
          {section.items.map((item, i) => (
            <div
              key={i}
              className="bg-cream/60 dark:bg-dark-surface rounded-lg px-5 py-4"
            >
              {item.subtitle && (
                <p className="text-[16px] font-medium text-ink dark:text-dark-text mb-2">
                  {item.subtitle}
                </p>
              )}
              <DetailedBody text={item.body} />
            </div>
          ))}
        </div>
      );

    default:
      return (
        <div className="text-[15px] leading-[1.7] text-ink/70 dark:text-dark-text/70 whitespace-pre-wrap">
          {section.body}
        </div>
      );
  }
}

function DetailedBody({ text }) {
  if (!text) return null;

  const items = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("> ")) {
      items.push({ type: "quote", text: trimmed.replace(/^>\s*/, "") });
    } else {
      items.push({
        type: "bullet",
        text: trimmed.replace(/^[-*]\s+/, ""),
      });
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, i) =>
        item.type === "quote" ? (
          <div
            key={i}
            className="border-l-2 border-ink/10 dark:border-dark-text/15 pl-4 italic text-[15px] leading-[1.7] text-ink/60 dark:text-dark-text/60"
          >
            {renderInlineMarkdown(item.text)}
          </div>
        ) : (
          <div key={i} className="flex gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-ink/30 dark:bg-dark-text/30 flex-shrink-0 mt-[9px]" />
            <p className="text-[15px] leading-[1.7] text-ink/70 dark:text-dark-text/70">
              {renderInlineMarkdown(item.text)}
            </p>
          </div>
        )
      )}
    </div>
  );
}

function renderInlineMarkdown(text) {
  // Split on **bold** patterns and render inline
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return parts.map((part, i) => {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      return (
        <strong key={i} className="font-medium text-ink dark:text-dark-text">
          {boldMatch[1]}
        </strong>
      );
    }
    return part;
  });
}

function SkeletonLoader() {
  return (
    <div className="space-y-10">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-[3px] h-[18px] bg-ink/10 dark:bg-dark-text/10 rounded-full" />
            <div className="skeleton h-4 w-32" />
          </div>
          <div className="pl-[15px] space-y-2.5">
            <div className="skeleton h-3.5 w-full" />
            <div className="skeleton h-3.5 w-5/6" />
            <div className="skeleton h-3.5 w-4/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Parse streaming markdown content into structured sections.
 * Handles partial content gracefully during streaming.
 */
function parseSections(content) {
  if (!content) return [];

  const sections = [];
  // Split on ## headers
  const parts = content.split(/^## /m);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const newlineIdx = trimmed.indexOf("\n");
    if (newlineIdx === -1) {
      // Header with no body yet (still streaming)
      sections.push({
        title: cleanTitle(trimmed),
        type: "text",
        body: "",
        items: [],
      });
      continue;
    }

    const rawTitle = trimmed.slice(0, newlineIdx).trim();
    const body = trimmed.slice(newlineIdx + 1).trim();
    const title = cleanTitle(rawTitle);

    if (/why.*matter/i.test(title)) {
      sections.push({
        title,
        type: "bullets",
        body,
        items: parseBullets(body),
      });
    } else if (/key\s*moments/i.test(title)) {
      sections.push({
        title,
        type: "timestamps",
        body,
        items: parseTimestamps(body),
      });
    } else if (/action\s*items|recommendations/i.test(title)) {
      sections.push({
        title,
        type: "checklist",
        body,
        items: parseChecklist(body),
      });
    } else if (/tl;?dr|summary/i.test(title)) {
      sections.push({
        title: "Summary",
        type: "summary",
        body: stripBullets(body),
        items: [],
      });
    } else if (/detailed\s*notes/i.test(title)) {
      sections.push({
        title: "Detailed Notes",
        type: "detailed",
        body,
        items: parseDetailedNotes(body),
      });
    } else {
      sections.push({
        title,
        type: "text",
        body,
        items: [],
      });
    }
  }

  return sections;
}

function cleanTitle(title) {
  // Remove emojis, leading #, and extra whitespace
  return title
    .replace(/^#+\s*/, "")
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu,
      ""
    )
    .replace(/[🎯❓📋✅]/g, "")
    .trim();
}

function stripBullets(text) {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean)
    .join(" ");
}

function parseBullets(text) {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
}

function parseTimestamps(text) {
  const items = [];
  const lines = text.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    const cleaned = line.replace(/^[-*]\s+/, "").trim();
    // Match timestamps like 0:00, 1:23, 12:34, 1:23:45
    const match = cleaned.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*[-:—]\s*(.+)/);
    if (match) {
      items.push({ time: match[1], text: match[2].trim() });
    } else if (cleaned) {
      // Fallback: treat as description without timestamp
      items.push({ time: "--", text: cleaned });
    }
  }

  return items;
}

function parseChecklist(text) {
  return text
    .split("\n")
    .map((line) =>
      line
        .replace(/^[-*]\s+\[[ x]?\]\s*/i, "")
        .replace(/^[-*]\s+/, "")
        .trim()
    )
    .filter(Boolean);
}

function parseDetailedNotes(text) {
  const items = [];

  // Try ### header splitting first
  if (/^### /m.test(text)) {
    const parts = text.split(/^### /m);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const nlIdx = trimmed.indexOf("\n");
      if (nlIdx === -1) {
        items.push({ subtitle: trimmed, body: "" });
      } else {
        items.push({
          subtitle: trimmed.slice(0, nlIdx).trim(),
          body: trimmed.slice(nlIdx + 1).trim(),
        });
      }
    }
    return items;
  }

  // Split on **Bold** — pattern (each paragraph is a subsection)
  const paragraphs = text.split(/\n\n+/);
  let currentItem = null;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Check if paragraph starts with **Bold** — pattern
    const boldMatch = trimmed.match(/^\*\*(.+?)\*\*\s*[—–-]\s*([\s\S]*)/);
    if (boldMatch) {
      currentItem = {
        subtitle: boldMatch[1].trim(),
        body: boldMatch[2].trim(),
      };
      items.push(currentItem);
    } else if (currentItem) {
      // Continuation paragraph belongs to the current subsection
      currentItem.body += "\n\n" + trimmed;
    } else {
      // No bold header, treat as standalone block
      items.push({ subtitle: "", body: trimmed });
    }
  }

  return items;
}
