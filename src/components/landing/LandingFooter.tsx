import { Link } from "react-router-dom";

const LandingFooter = () => {
  return (
    <footer className="border-t border-border/30 py-12 px-6 relative">
      {/* Dot divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full" />
            <span className="font-display text-sm font-black tracking-wider uppercase">
              DateWise
            </span>
          </div>

          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
            <Link to="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <Link to="/help" className="hover:text-foreground transition-colors">
              Help
            </Link>
          </div>

          <p className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} DateWise
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
