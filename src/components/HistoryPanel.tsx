import { Clock, CheckCircle, Loader2 } from "lucide-react";

interface HistoryItem {
  id: string;
  title: string;
  type: string;
  status: "completed" | "processing" | "queued";
  time: string;
}

const mockHistory: HistoryItem[] = [
  { id: "1", title: "產品介紹影片翻譯", type: "影片翻譯", status: "completed", time: "2 分鐘前" },
  { id: "2", title: "行銷素材合成", type: "多圖轉影片", status: "processing", time: "5 分鐘前" },
  { id: "3", title: "直播背景置換", type: "背景置換", status: "completed", time: "12 分鐘前" },
  { id: "4", title: "教學影片字幕", type: "影片翻譯", status: "queued", time: "30 分鐘前" },
];

export function HistoryPanel() {
  return (
    <div className="w-72 border-l border-border surface-elevated flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          處理紀錄
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {mockHistory.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/30 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.type}</p>
              </div>
              {item.status === "completed" ? (
                <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
              ) : item.status === "processing" ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{item.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
