import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { FileQuestion } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <AppShell>
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description={<>There's nothing at <code className="font-mono">{location.pathname}</code>.</>}
        action={
          <Button asChild>
            <a href="/">Back to the app</a>
          </Button>
        }
        className="mx-auto max-w-xl"
      />
    </AppShell>
  );
};

export default NotFound;
