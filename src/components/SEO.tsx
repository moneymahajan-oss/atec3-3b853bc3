import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
}

export function SEO({
  title = "ATEC Gurdaspur — Avenue to Excellent Careers | AI, Tally, Digital Marketing & More",
  description = "Punjab's premier computer education institute in Gurdaspur. Learn AI, Tally, Busy, Python, Digital Marketing, Full Stack & more. Job-oriented courses with placement assistance.",
  canonical,
}: SEOProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {canonical && <link rel="canonical" href={canonical} />}
    </Helmet>
  );
}
