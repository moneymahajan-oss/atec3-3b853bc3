import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
}

export function SEO({
  title = "ATEC Gurdaspur — Avenue to Excellent Careers | AI, Tally, Digital Marketing & More",
  description = "Punjab's premier computer education institute in Gurdaspur. Learn AI, Tally, Busy, Python, Digital Marketing, Full Stack & more. Job-oriented courses with placement assistance.",
  canonical,
  ogImage,
  ogType = "website",
}: SEOProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogImage && <meta property="og:image:width" content="1200" />}
      {ogImage && <meta property="og:image:height" content="630" />}
      <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      {canonical && <link rel="canonical" href={canonical} />}
    </Helmet>
  );
}
