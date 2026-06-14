import { BarChart3, CalendarDays, Home, Layers3, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";

const items = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/schedule", label: "Week", icon: CalendarDays },
  { to: "/templates", label: "Blocks", icon: Layers3 },
  { to: "/analytics", label: "Stats", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings }
];

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-sienna-900 bg-palette-red800 px-2 py-2 lg:hidden">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-1 rounded-md border border-transparent px-2 py-1.5 text-xs font-medium",
              isActive ? "border-cream-400 bg-cream-50 text-palette-heading shadow-soft" : "text-cream-400"
            )
          }
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
