import { Helmet } from "react-helmet-async";

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items: FAQItem[];
  title?: string;
  className?: string;
}

/**
 * FAQ accordion using semantic <details>/<summary>.
 * Emits FAQPage JSON-LD automatically for AEO (Google AI Overviews,
 * ChatGPT, Gemini, Perplexity).
 */
export function FAQ({ items, title = "Frequently Asked Questions", className }: FAQProps) {
  if (!items?.length) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.answer,
      },
    })),
  };

  return (
    <section
      aria-label="Frequently Asked Questions"
      className={`py-12 bg-background ${className ?? ""}`}
    >
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <div className="container mx-auto px-4 max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-8 text-center">
          {title}
        </h2>
        <div className="space-y-3">
          {items.map((it, i) => (
            <details
              key={i}
              className="group rounded-xl border border-border bg-card px-5 py-4 transition-colors open:bg-muted/40 hover:border-primary/40"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-foreground">
                <span>{it.question}</span>
                <span
                  aria-hidden
                  className="text-primary transition-transform duration-200 group-open:rotate-45 text-2xl leading-none"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-muted-foreground leading-relaxed whitespace-pre-line">
                {it.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FAQ;
