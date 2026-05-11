import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { SEO } from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <SEO
        title="Page Not Found — ATEC Gurdaspur"
        description="The page you are looking for does not exist. Return to ATEC Gurdaspur to explore our computer courses in AI, Tally, Digital Marketing and more."
        noOverride
      />
      <main className="text-center px-4" aria-label="404 Page not found">
        <p className="text-6xl font-bold text-muted-foreground mb-4" aria-hidden="true">404</p>
        <h1 className="mb-4 text-2xl font-bold text-foreground">Page Not Found</h1>
        <p className="mb-6 text-lg text-muted-foreground">
          Oops! The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
          aria-label="Return to ATEC homepage"
        >
          Return to Home
        </Link>
      </main>
    </div>
  );
};

export default NotFound;
