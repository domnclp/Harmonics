import { BarChart3, CalendarDays, Home, Layers3, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { appBrand } from "../../lib/branding";
import { cn } from "../../lib/utils";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/templates", label: "Templates", icon: Layers3 },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings }
];

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 border-r bg-card px-4 py-5 lg:block">
      <div className="mb-7">
        <div className="text-xl font-bold">{appBrand.name}</div>
        <p className="mt-1 text-sm text-muted-foreground">{appBrand.tagline}</p>
      </div>
      <nav className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
