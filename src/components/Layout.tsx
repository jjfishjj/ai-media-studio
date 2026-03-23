import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { HistoryPanel } from "@/components/HistoryPanel";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 surface-elevated">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="ml-4 h-5 w-px bg-border" />
            <span className="ml-4 text-sm text-muted-foreground">AI 影音處理平台</span>
          </header>
          <div className="flex-1 flex overflow-hidden">
            <main className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>
            <HistoryPanel />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
