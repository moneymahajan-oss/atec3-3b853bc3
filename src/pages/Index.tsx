import Navbar from "@/components/Navbar";
import OfferBelt from "@/components/OfferBelt";
import HeroSection from "@/components/HeroSection";
import StatsStrip from "@/components/StatsStrip";
import AnnouncementTicker from "@/components/AnnouncementTicker";
import CoursesSection from "@/components/CoursesSection";
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
      "ATEC offers courses in Web Development, Computer Networking, Artificial Intelligence, Digital Marketing, Tally & Accounting, and Stock Market Trading. All courses include practical training and a completion certificate.",
  },
  {
    question: "Where is ATEC located?",
    answer:
      "ATEC is located at 1st Floor, Atec Avenue, Hardochhanni Road, Gurdaspur, Punjab 143521. We serve students from Gurdaspur, Pathankot, Batala, and surrounding areas.",
  },
  {
    question: "What is the fee for courses at ATEC?",
    answer:
      "Course fees vary by program. Contact us at +91-7009933289 for the current fee structure and available installment options.",
  },
  {
    question: "Does ATEC provide a certificate after course completion?",
    answer:
      "Yes. All students who complete their course at ATEC receive an industry-recognized completion certificate.",
  },
  {
    question: "How long are the courses at ATEC?",
    answer:
      "Course duration ranges from 1 month to 6 months depending on the program. Short-term certification and long-term diploma options are both available.",
  },
];

const HOME_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "EducationalOrganization"],
    name: "ATEC — Avenue to Excellent Careers",
    url: "https://ateceducation.in",
    telephone: "+91-7009933289",
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
    openingHours: "Mo-Sa 09:00-18:00",
    priceRange: "₹₹",
    sameAs: [
      "https://www.instagram.com/atecavenue/",
      "https://www.facebook.com/atecavenue",
    ],
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
      <SEO jsonLd={HOME_JSON_LD} hreflang="en-IN" canonical="https://ateceducation.in/" />
      <SectionErrorBoundary name="OfferBelt"><OfferBelt /></SectionErrorBoundary>
      <SectionErrorBoundary name="Navbar"><Navbar /></SectionErrorBoundary>
      <main>
        <SectionErrorBoundary name="Hero"><section aria-label="Hero"><HeroSection /></section></SectionErrorBoundary>
        <SectionErrorBoundary name="Stats"><section aria-label="Stats"><StatsStrip /></section></SectionErrorBoundary>
        <SectionErrorBoundary name="Announcements"><section aria-label="Announcements"><AnnouncementTicker /></section></SectionErrorBoundary>
        <SectionErrorBoundary name="Courses"><section aria-label="Courses"><CoursesSection /></section></SectionErrorBoundary>
        <SectionErrorBoundary name="LifeAtAtec"><section aria-label="Life at ATEC"><LifeAtAtecSection /></section></SectionErrorBoundary>
        <SectionErrorBoundary name="About"><section aria-label="About"><AboutSection /></section></SectionErrorBoundary>
        <SectionErrorBoundary name="Gallery"><section aria-label="Gallery"><GallerySection /></section></SectionErrorBoundary>
        <SectionErrorBoundary name="Faculty"><section aria-label="Faculty"><FacultySection /></section></SectionErrorBoundary>
        <SectionErrorBoundary name="Testimonials"><section aria-label="Testimonials"><TestimonialsSection /></section></SectionErrorBoundary>
        <SectionErrorBoundary name="AIUseCases"><section aria-label="AI Use Cases"><AIUseCasesSection /></section></SectionErrorBoundary>
        <SectionErrorBoundary name="MockTest"><section aria-label="Mock Tests"><MockTestSection /></section></SectionErrorBoundary>
        <SectionErrorBoundary name="Videos"><section aria-label="Videos"><VideosSection /></section></SectionErrorBoundary>
        <SectionErrorBoundary name="Downloads"><section aria-label="Downloads"><DownloadsSection /></section></SectionErrorBoundary>
        <SectionErrorBoundary name="FAQ"><FAQ items={HOME_FAQS} /></SectionErrorBoundary>
        <SectionErrorBoundary name="Contact"><section aria-label="Contact"><ContactSection /></section></SectionErrorBoundary>
        <SectionErrorBoundary name="SocialConnect"><section aria-label="Social"><SocialConnectSection /></section></SectionErrorBoundary>
      </main>
      <SectionErrorBoundary name="Footer"><Footer /></SectionErrorBoundary>
    </div>
  );
};

export default Index;
