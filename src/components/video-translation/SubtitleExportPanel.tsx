import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import type { SubtitleEntry } from "@/lib/subtitleExporter";
import { generateSRT, generateVTT, downloadFile } from "@/lib/subtitleExporter";
import { toast } from "sonner";

interface Props {
  subtitles: SubtitleEntry[];
}

export function SubtitleExportPanel({ subtitles }: Props) {
  const [format, setFormat] = useState<"srt" | "vtt">("srt");
  const [content, setContent] = useState<"text" | "translated" | "both">("both");

  const handleExport = () => {
    if (subtitles.length === 0) {
      toast.error("沒有可匯出的字幕");
      return;
    }
    const gen = format === "srt" ? generateSRT : generateVTT;
    const output = gen(subtitles, content);
    const mime = format === "srt" ? "text/plain" : "text/vtt";
    downloadFile(output, `subtitles.${format}`, mime);
    toast.success(`已匯出 ${format.toUpperCase()} 字幕檔`);
  };

  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        字幕匯出
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">格式</span>
          <Select value={format} onValueChange={(v) => setFormat(v as "srt" | "vtt")}>
            <SelectTrigger className="bg-muted border-border text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="srt">SRT</SelectItem>
              <SelectItem value="vtt">VTT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">內容</span>
          <Select value={content} onValueChange={(v) => setContent(v as any)}>
            <SelectTrigger className="bg-muted border-border text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">原文</SelectItem>
              <SelectItem value="translated">譯文</SelectItem>
              <SelectItem value="both">雙語</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button variant="outline" className="w-full" onClick={handleExport}>
        <Download className="h-4 w-4 mr-2" />
        下載字幕檔
      </Button>
    </div>
  );
}
