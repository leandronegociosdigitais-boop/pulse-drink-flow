import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { FloatingActionButton } from "./FloatingActionButton";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="max-w-lg mx-auto">
        {children}
      </main>
      <FloatingActionButton />
      <BottomNav />
    </div>
  );
}
