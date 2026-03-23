import { useState, useCallback } from "react";
import { Upload, Layers, Building2, Zap, Trees, Square, ImagePlus, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const presetBackgrounds = [
  { id: "office", label: "辦公室", icon: Building2, color: "from-amber-900/30 to-amber-800/10" },
  { id: "cyber", label: "賽博龐克", icon: Zap, color: "from-violet-900/30 to-blue-900/10" },
  { id: "nature", label: "自然風景", icon: Trees, color: "from-emerald-900/30 to-green-800/10" },
  { id: "green", label: "純色綠幕", icon: Square, color: "from-green-700/30 to-green-600/10" },
];

export default function BackgroundReplace() {
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [selectedBg, setSelectedBg] = useState<string | null>(null);
  const [customBg, setCustomBg] = useState<string | null>(null);
  const [showAfter, setShowAfter] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) setVideoFile(file.name);
  }, []);

  const handleProcess = async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 3000));
    setIsProcessing(false);
    setShowAfter(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI 影片背景置換</h1>
        <p className="text-muted-foreground mt-1">智慧去背並替換影片背景</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upload + Bg selection */}
        <div className="space-y-4">
          {/* Video upload */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            {videoFile ? (
              <p className="text-sm text-foreground font-medium">{videoFile}</p>
            ) : (
              <>
                <p className="text-sm text-foreground">上傳需要去背的影片</p>
                <p className="text-xs text-muted-foreground mt-1">支援 MP4/MOV 格式</p>
              </>
            )}
            <input type="file" accept="video/*" className="hidden" id="bg-video-upload"
              onChange={(e) => { if (e.target.files?.[0]) setVideoFile(e.target.files[0].name); }}
            />
            <label htmlFor="bg-video-upload">
              <Button variant="outline" size="sm" className="mt-3 cursor-pointer" asChild>
                <span>選擇影片</span>
              </Button>
            </label>
          </div>

          {/* Background gallery */}
          <div className="p-4 rounded-xl bg-card border border-border glow-border space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              預設背景
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {presetBackgrounds.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => { setSelectedBg(bg.id); setCustomBg(null); }}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedBg === bg.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className={`w-full h-16 rounded-md bg-gradient-to-br ${bg.color} mb-2 flex items-center justify-center`}>
                    <bg.icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-medium text-foreground">{bg.label}</p>
                </button>
              ))}
            </div>

            {/* Custom bg upload */}
            <div className="pt-3 border-t border-border">
              <Label className="text-xs text-muted-foreground mb-2 block">自定義背景</Label>
              <input type="file" accept="image/*" className="hidden" id="custom-bg"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setCustomBg(e.target.files[0].name);
                    setSelectedBg(null);
                  }
                }}
              />
              <label htmlFor="custom-bg">
                <div className="border-2 border-dashed border-border rounded-lg p-3 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <ImagePlus className="h-5 w-5 mx-auto text-muted-foreground" />
                  {customBg ? (
                    <p className="text-xs text-foreground mt-1">{customBg}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">上傳自定義背景圖</p>
                  )}
                </div>
              </label>
            </div>
          </div>

          <Button
            className="w-full"
            disabled={!videoFile || (!selectedBg && !customBg) || isProcessing}
            onClick={handleProcess}
          >
            {isProcessing ? "AI 處理中..." : "開始背景置換"}
          </Button>
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">效果預覽</h3>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">
                {showAfter ? "處理後" : "處理前"}
              </Label>
              <Switch checked={showAfter} onCheckedChange={setShowAfter} />
            </div>
          </div>

          <div className="aspect-video rounded-xl bg-muted border border-border overflow-hidden relative">
            {videoFile ? (
              <div className="absolute inset-0">
                {showAfter ? (
                  <div className="w-full h-full bg-gradient-to-br from-violet-900/20 to-blue-900/20 flex items-center justify-center">
                    <div className="text-center">
                      <ArrowLeftRight className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-sm text-foreground">背景已替換</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedBg ? presetBackgrounds.find((b) => b.id === selectedBg)?.label : customBg || ""}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-muted to-card flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm text-foreground">原始影片</p>
                      <p className="text-xs text-muted-foreground mt-1">{videoFile}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">請先上傳影片</p>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 rounded-xl bg-card border border-border text-xs text-muted-foreground space-y-1">
            <p>• AI 去背使用深度學習模型進行人物分割</p>
            <p>• 支援即時預覽處理前後效果對比</p>
            <p>• 預留 Cloudinary / OpenAI API 對接介面</p>
          </div>
        </div>
      </div>
    </div>
  );
}
