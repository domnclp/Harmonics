import type { ReactNode } from "react";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col pb-20 lg:pb-0">
          <Header />
          <main className="mx-auto w-full max-w-[96rem] flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
