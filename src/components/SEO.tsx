import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  keywords?: string;
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
  /** When true, ignore admin overrides from crm_seo_meta and use props as-is */
  noOverride?: boolean;
}

const DEFAULT_TITLE =
  "ATEC Gurdaspur — Avenue to Excellent Careers | AI, Tally, Digital Marketing & More";
const DEFAULT_DESCRIPTION =
  "Punjab's premier computer education institute in Gurdaspur. Job-oriented courses in AI, Tally, Busy, Python, Digital Marketing, Full Stack & more with placement assistance.";
const DEFAULT_KEYWORDS =
  "ATEC Gurdaspur, computer institute Gurdaspur, AI course Punjab, Tally course Gurdaspur, Busy accounting course, Digital Marketing course Gurdaspur, Python training, Full Stack development, computer courses Punjab, job oriented IT courses, best computer institute Gurdaspur, GST course, accounting institute Gurdaspur, ATEC Education";

interface SeoOverride {
  title: string | null;
  description: string | null;
  keywords: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  json_ld: any;
}

const cache = new Map<string, SeoOverride | null>();

export function SEO({
  title,
  description,
  canonical,
  ogImage,
  ogType = "website",
  keywords,
  jsonLd,
  noOverride,
}: SEOProps) {
  const location = useLocation();
  const path = location.pathname;
  const [override, setOverride] = useState<SeoOverride | null>(
    cache.get(path) ?? null,
  );

  useEffect(() => {
    if (noOverride) return;
    if (cache.has(path)) {
      setOverride(cache.get(path) ?? null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("crm_seo_meta")
        .select("title,description,keywords,og_image_url,canonical_url,json_ld")
        .eq("page_path", path)
        .eq("is_active", true)
        .maybeSingle();
      const v = (data as SeoOverride) || null;
      cache.set(path, v);
      if (!cancelled) setOverride(v);
    })();
    return () => {
      cancelled = true;
    };
  }, [path, noOverride]);

  const finalTitle = override?.title || title || DEFAULT_TITLE;
  const finalDescription =
    override?.description || description || DEFAULT_DESCRIPTION;
  const finalKeywords = override?.keywords || keywords || DEFAULT_KEYWORDS;
  const finalOgImage = override?.og_image_url || ogImage;
  const finalCanonical =
    override?.canonical_url ||
    canonical ||
    (typeof window !== "undefined"
      ? `${window.location.origin}${path}`
      : undefined);
  const finalJsonLd = override?.json_ld || jsonLd;

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      {finalKeywords && <meta name="keywords" content={finalKeywords} />}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:type" content={ogType} />
      {finalCanonical && <meta property="og:url" content={finalCanonical} />}
      {finalOgImage && <meta property="og:image" content={finalOgImage} />}
      {finalOgImage && <meta property="og:image:width" content="1200" />}
      {finalOgImage && <meta property="og:image:height" content="630" />}
      <meta
        name="twitter:card"
        content={finalOgImage ? "summary_large_image" : "summary"}
      />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      {finalOgImage && <meta name="twitter:image" content={finalOgImage} />}
      {finalCanonical && <link rel="canonical" href={finalCanonical} />}
      {finalJsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(finalJsonLd)}
        </script>
      )}
    </Helmet>
  );
}
