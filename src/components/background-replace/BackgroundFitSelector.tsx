import { Maximize, Minimize, Move, RectangleHorizontal, RectangleVertical } from "lucide-react";
import { Label } from "@/components/ui/label";

export type BgFitMode = "cover" | "contain" | "stretch";

interface Props {
  fitMode: BgFitMode;
  onFitModeChange: (mode: BgFitMode) => void;
  videoOrientation: "landscape" | "portrait" | "square" | null;
  videoDimensions: { width: number; height: number } | null;
}

const fitOptions: { id: BgFitMode; label: string; desc: string; icon: typeof Maximize }[] = [
  { id: "cover", label: "填滿", desc: "背景填滿畫面，可能裁切", icon: Maximize },
  { id: "contain", label: "完整顯示", desc: "背景完整顯示，可能留邊", icon: Minimize },
  { id: "stretch", label: "拉伸", desc: "背景拉伸至影片尺寸", icon: Move },
];

export function BackgroundFitSelector({ fitMode, onFitModeChange, videoOrientation, videoDimensions }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">背景適配模式</Label>
        {videoDimensions && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {videoOrientation === "portrait" ? (
              <RectangleVertical className="h-3 w-3" />
            ) : (
              <RectangleHorizontal className="h-3 w-3" />
            )}
            {videoDimensions.width}×{videoDimensions.height}
            <span className="text-primary/70">
              ({videoOrientation === "portrait" ? "直式" : videoOrientation === "landscape" ? "橫式" : "正方形"})
            </span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {fitOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onFitModeChange(opt.id)}
            className={`p-2 rounded-lg border-2 transition-all text-center ${
              fitMode === opt.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/30"
            }`}
          >
            <opt.icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs font-medium text-foreground">{opt.label}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
