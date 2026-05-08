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

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO />
      <SectionErrorBoundary name="OfferBelt"><OfferBelt /></SectionErrorBoundary>
      <SectionErrorBoundary name="Navbar"><Navbar /></SectionErrorBoundary>
      <SectionErrorBoundary name="Hero"><HeroSection /></SectionErrorBoundary>
      <SectionErrorBoundary name="Stats"><StatsStrip /></SectionErrorBoundary>
      <SectionErrorBoundary name="Announcements"><AnnouncementTicker /></SectionErrorBoundary>
      <SectionErrorBoundary name="Courses"><CoursesSection /></SectionErrorBoundary>
      <SectionErrorBoundary name="LifeAtAtec"><LifeAtAtecSection /></SectionErrorBoundary>
      <SectionErrorBoundary name="About"><AboutSection /></SectionErrorBoundary>
      <SectionErrorBoundary name="Gallery"><GallerySection /></SectionErrorBoundary>
      <SectionErrorBoundary name="Faculty"><FacultySection /></SectionErrorBoundary>
      <SectionErrorBoundary name="Testimonials"><TestimonialsSection /></SectionErrorBoundary>
      <SectionErrorBoundary name="AIUseCases"><AIUseCasesSection /></SectionErrorBoundary>
      <SectionErrorBoundary name="MockTest"><MockTestSection /></SectionErrorBoundary>
      <SectionErrorBoundary name="Videos"><VideosSection /></SectionErrorBoundary>
      <SectionErrorBoundary name="Downloads"><DownloadsSection /></SectionErrorBoundary>
      <SectionErrorBoundary name="Contact"><ContactSection /></SectionErrorBoundary>
      <SectionErrorBoundary name="Footer"><Footer /></SectionErrorBoundary>
    </div>
  );
};

export default Index;
