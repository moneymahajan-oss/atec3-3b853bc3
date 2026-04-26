import Navbar from "@/components/Navbar";
import OfferBelt from "@/components/OfferBelt";
import HeroSection from "@/components/HeroSection";
import StatsStrip from "@/components/StatsStrip";
import AnnouncementTicker from "@/components/AnnouncementTicker";
import CoursesSection from "@/components/CoursesSection";
import AboutSection from "@/components/AboutSection";
import GallerySection from "@/components/GallerySection";
import TestimonialsSection from "@/components/TestimonialsSection";
import AIUseCasesSection from "@/components/AIUseCasesSection";
import MockTestSection from "@/components/MockTestSection";
import VideosSection from "@/components/VideosSection";
import DownloadsSection from "@/components/DownloadsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <OfferBelt />
      <Navbar />
      <HeroSection />
      <StatsStrip />
      <AnnouncementTicker />
      <CoursesSection />
      <AboutSection />
      <GallerySection />
      <TestimonialsSection />
      <AIUseCasesSection />
      <MockTestSection />
      <VideosSection />
      <DownloadsSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
