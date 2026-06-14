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
    <aside className="sticky top-0 hidden h-screen w-64 border-r border-sienna-900 bg-palette-red800 px-4 py-5 text-primary-foreground lg:block">
      <div className="mb-7">
        <div className="text-xl font-bold text-primary-foreground">{appBrand.name}</div>
        <p className="mt-1 text-sm text-cream-400">{appBrand.tagline}</p>
      </div>
      <nav className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-sm font-medium transition",
                isActive ? "border-cream-400 bg-cream-50 text-palette-heading shadow-soft" : "text-cream-400 hover:bg-sienna-900 hover:text-primary-foreground"
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
