import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="font-display text-6xl font-bold text-foreground">404</h1>
        <p className="text-sm text-muted-foreground">Page not found.</p>
        <Link to="/">
          <Button variant="outline" className="font-display text-xs uppercase tracking-wider mt-2">
            Return
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
