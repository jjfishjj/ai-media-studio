import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { BgFitMode } from "./BackgroundFitSelector";

interface Props {
  videoPreviewUrl: string | null;
  customBgPreview: string | null;
  selectedBg: string | null;
  bgLabel: string;
  showAfter: boolean;
  setShowAfter: (v: boolean) => void;
  isProcessed: boolean;
  fitMode: BgFitMode;
  videoOrientation: "landscape" | "portrait" | "square" | null;
}

function getPresetGradient(id: string | null) {
  switch (id) {
    case "cyber": return "linear-gradient(135deg, rgba(139,92,246,0.6), rgba(59,130,246,0.6))";
    case "nature": return "linear-gradient(135deg, rgba(34,197,94,0.5), rgba(16,185,129,0.5))";
    case "office": return "linear-gradient(135deg, rgba(217,119,6,0.5), rgba(245,158,11,0.4))";
    case "green": return "rgba(0, 177, 64, 1)";
    default: return "none";
  }
}

function getObjectFit(fitMode: BgFitMode): React.CSSProperties["objectFit"] {
  switch (fitMode) {
    case "cover": return "cover";
    case "contain": return "contain";
    case "stretch": return "fill";
  }
}

export function VideoPreviewPanel({
  videoPreviewUrl, customBgPreview, selectedBg, bgLabel,
  showAfter, setShowAfter, isProcessed, fitMode, videoOrientation,
}: Props) {
  const aspectClass = videoOrientation === "portrait"
    ? "aspect-[9/16] max-h-[70vh]"
    : videoOrientation === "square"
    ? "aspect-square"
    : "aspect-video";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">效果預覽</h3>
        {isProcessed && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">
              {showAfter ? "處理後" : "處理前"}
            </Label>
            <Switch checked={showAfter} onCheckedChange={setShowAfter} />
          </div>
        )}
      </div>

      <div className={`${aspectClass} rounded-xl bg-muted border border-border overflow-hidden relative mx-auto`}
        style={{ maxWidth: videoOrientation === "portrait" ? "360px" : undefined }}
      >
        {videoPreviewUrl ? (
          <div className="absolute inset-0">
            {showAfter && isProcessed ? (
              <div className="w-full h-full relative">
                {/* Background layer */}
                {customBgPreview ? (
                  <img
                    src={customBgPreview}
                    alt="custom background"
                    className="absolute inset-0 w-full h-full"
                    style={{ objectFit: getObjectFit(fitMode) }}
                  />
                ) : (
                  <div className="absolute inset-0" style={{ background: getPresetGradient(selectedBg) }} />
                )}
                {/* Video overlay */}
                <video
                  src={videoPreviewUrl}
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ mixBlendMode: "screen", filter: "contrast(1.15) saturate(1.2)" }}
                  controls
                  muted
                />
                <div className="absolute top-3 right-3 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-full">
                  已套用: {bgLabel}
                </div>
              </div>
            ) : (
              <video
                src={videoPreviewUrl}
                className="w-full h-full object-contain"
                controls
                muted
              />
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">請先上傳影片</p>
          </div>
        )}
      </div>

      <div className="p-4 rounded-xl bg-card border border-border text-xs text-muted-foreground space-y-1">
        <p>• AI 去背使用深度學習模型進行人物分割</p>
        <p>• 自動偵測影片方向（直式/橫式），背景圖片自動適配</p>
        <p>• 支援填滿、完整顯示、拉伸三種背景適配模式</p>
      </div>
    </div>
  );
}
