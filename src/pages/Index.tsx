import FounderSection from "@/components/FounderSection";
import Navbar from "@/components/Navbar";
import OfferBelt from "@/components/OfferBelt";
import HeroSection from "@/components/HeroSection";
import StatsStrip from "@/components/StatsStrip";
import AnnouncementTicker from "@/components/AnnouncementTicker";
import CoursesSection from "@/components/CoursesSection";
import OffersSliderSection from "@/components/OffersSliderSection";
import OffersSection from "@/components/OffersSection";
import AboutSection from "@/components/AboutSection";
import GallerySection from "@/components/GallerySection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FacultySection from "@/components/FacultySection";
import AIUseCasesSection from "@/components/AIUseCasesSection";
import MockTestSection from "@/components/MockTestSection";
import VideosSection from "@/components/VideosSection";
import LifeAtAtecSection from "@/components/LifeAtAtecSection";
import DownloadsSection from "@/components/DownloadsSection";
import ContactSection from "@/components/ContactSection";
import SocialConnectSection from "@/components/SocialConnectSection";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { FAQ } from "@/components/FAQ";

const HOME_FAQS = [
  {
    question: "What courses does ATEC Gurdaspur offer?",
    answer:
      "ATEC offers job-oriented courses in Generative AI & Prompt Engineering, Web Development, Computer Networking, Digital Marketing, Tally Prime with GST, Busy Accounting Software, Python Programming, Office Automation, and Stock Market Trading. All courses include practical lab training, a completion certificate, and placement assistance.",
  },
  {
    question: "Where is ATEC Education located in Gurdaspur?",
    answer:
      "ATEC is located at 1st Floor, ATEC Avenue, Hardochhanni Road, Gurdaspur, Punjab 143521. We are conveniently accessible from Pathankot, Batala, Dinanagar and surrounding areas. Call +91-7009933289 for directions.",
  },
  {
    question: "What is the fee for computer courses at ATEC Gurdaspur?",
    answer:
      "Course fees at ATEC vary by program and duration. Short-term certification courses start from ₹3,000 and diploma programs go up to ₹18,000. EMI / installment options are available. Contact us at +91-7009933289 for the current fee structure.",
  },
  {
    question: "Does ATEC provide a certificate after course completion?",
    answer:
      "Yes. Every student who completes their program at ATEC receives an industry-recognized completion certificate. Certificates can be verified online at ateceducation.in/verification.",
  },
  {
    question: "How long are the courses at ATEC?",
    answer:
      "Course duration ranges from 1 month (short-term certifications) to 6 months (diploma programs). Both morning and evening batches are available to fit your schedule.",
  },
  {
    question: "Is ATEC the best computer institute in Gurdaspur?",
    answer:
      "ATEC has been Gurdaspur's leading computer training institute since 2000, with over 5,000 alumni placed across Punjab and India. We are one of the few institutes in the region offering dedicated AI & emerging technology courses alongside traditional IT programs.",
  },
  {
    question: "Does ATEC offer online coaching?",
    answer:
      "Yes. ATEC is expanding its online coaching programs for students across Punjab and India. Hybrid (classroom + online) options are available for select courses. Contact us to check online availability for your preferred course.",
  },
];

const HOME_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "EducationalOrganization"],
    "@id": "https://ateceducation.in/#organization",
    name: "ATEC — Avenue to Excellent Careers",
    alternateName: "ATEC Gurdaspur",
    url: "https://ateceducation.in",
    telephone: "+91-7009933289",
    foundingDate: "2000",
    address: {
      "@type": "PostalAddress",
      streetAddress: "1st Floor, Atec Avenue, Hardochhanni Road",
      addressLocality: "Gurdaspur",
      addressRegion: "Punjab",
      postalCode: "143521",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 32.0378,
      longitude: 75.4066,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00",
        closes: "18:00",
      },
    ],
    priceRange: "₹₹",
    areaServed: ["Gurdaspur", "Pathankot", "Batala", "Punjab"],
    sameAs: [
      "https://www.instagram.com/atecavenue/",
      "https://www.facebook.com/atecavenue",
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "120",
      bestRating: "5",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: "https://ateceducation.in",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://ateceducation.in/courses?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="ATEC Gurdaspur | Best Computer Institute — AI, Tally, Digital Marketing, Web Dev"
        description="ATEC Education, Gurdaspur's #1 computer institute since 2000. Job-oriented courses in AI, Tally Prime, Digital Marketing, Full Stack & more. 100% placement support. Enroll 2025–26."
        keywords="ATEC Gurdaspur, best computer institute Gurdaspur, AI course Punjab, Tally Prime, Digital Marketing, computer courses Gurdaspur, IT training Punjab"
        jsonLd={HOME_JSON_LD}
        hreflang="en-IN"
        canonical="https://ateceducation.in/"
      />

      <SectionErrorBoundary name="OfferBelt"><OfferBelt /></SectionErrorBoundary>
      <SectionErrorBoundary name="Navbar"><Navbar /></SectionErrorBoundary>

      <main id="main-content">
        <SectionErrorBoundary name="Hero">
          <HeroSection />
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Stats">
          <section aria-label="ATEC at a glance — key stats">
            <StatsStrip />
          </section>
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Announcements">
          <section aria-label="Latest announcements from ATEC">
            <AnnouncementTicker />
          </section>
        </SectionErrorBoundary>

        {/* ── Promo Slider — between Hero and Courses, admin-toggleable ── */}
        <SectionErrorBoundary name="PromoSlider">
          <OffersSliderSection />
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Courses">
          <section aria-label="Computer courses at ATEC Gurdaspur" id="courses">
            <CoursesSection />
          </section>
        </SectionErrorBoundary>

        {/* ── Offers & Discounts — appears right after Courses ── */}
        <SectionErrorBoundary name="Offers">
          <section aria-label="Special offers and discounts for students" id="offers">
            <OffersSection />
          </section>
        </SectionErrorBoundary>

        <SectionErrorBoundary name="LifeAtAtec">
          <section aria-label="Life at ATEC — student experience" id="life">
            <LifeAtAtecSection />
          </section>
        </SectionErrorBoundary>

        <SectionErrorBoundary name="About">
          <section aria-label="About ATEC Education Gurdaspur" id="about">
            <AboutSection />
          </section>
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Founder">
          <FounderSection />
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Gallery">
          <section aria-label="ATEC campus and student gallery" id="gallery">
            <GallerySection />
          </section>
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Faculty">
          <section aria-label="ATEC faculty and instructors" id="faculty">
            <FacultySection />
          </section>
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Testimonials">
          <section aria-label="Student testimonials and reviews" id="testimonials">
            <TestimonialsSection />
          </section>
        </SectionErrorBoundary>

        <SectionErrorBoundary name="AIUseCases">
          <section aria-label="AI career pathways and use cases" id="ai-careers">
            <AIUseCasesSection />
          </section>
        </SectionErrorBoundary>

        <SectionErrorBoundary name="MockTest">
          <section aria-label="Free mock tests for students" id="mock-test">
            <MockTestSection />
          </section>
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Videos">
          <section aria-label="ATEC video showcase" id="videos">
            <VideosSection />
          </section>
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Downloads">
          <section aria-label="Course brochures and downloads">
            <DownloadsSection />
          </section>
        </SectionErrorBoundary>

        <SectionErrorBoundary name="FAQ">
          <FAQ items={HOME_FAQS} title="Frequently Asked Questions — ATEC Gurdaspur" />
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Contact">
          <section aria-label="Contact ATEC Gurdaspur" id="contact">
            <ContactSection />
          </section>
        </SectionErrorBoundary>

        <SectionErrorBoundary name="SocialConnect">
          <section aria-label="Follow ATEC on social media">
            <SocialConnectSection />
          </section>
        </SectionErrorBoundary>
      </main>

      <SectionErrorBoundary name="Footer"><Footer /></SectionErrorBoundary>
    </div>
  );
};

export default Index;
