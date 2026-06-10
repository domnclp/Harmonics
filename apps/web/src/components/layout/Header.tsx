import { LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { useAuth } from "../../hooks/useAuth";
import { appBrand } from "../../lib/branding";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/schedule": "Weekly Schedule",
  "/templates": "Block Templates",
  "/analytics": "Analytics",
  "/settings": "Settings"
};

export function Header() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b bg-background">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:hidden">{appBrand.name}</div>
          <h1 className="text-xl font-semibold">{titles[location.pathname] ?? appBrand.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-52 truncate text-sm text-muted-foreground sm:block">{user?.email}</span>
          <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Log out">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
