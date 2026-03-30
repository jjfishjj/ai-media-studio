import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { HistoryPanel } from "@/components/HistoryPanel";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [showHistory, setShowHistory] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 surface-elevated">
            <div className="flex items-center">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="ml-4 h-5 w-px bg-border" />
              <span className="ml-4 text-sm text-muted-foreground">AI 影音處理平台</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground xl:hidden"
              onClick={() => setShowHistory(!showHistory)}
            >
              <Clock className="h-4 w-4 mr-1" />
              <span className="text-xs">紀錄</span>
            </Button>
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
            {/* History panel: always visible on xl+, toggle on smaller */}
            <div className={`${showHistory ? 'block' : 'hidden'} xl:block`}>
              <HistoryPanel />
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
