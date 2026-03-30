import { useState, useCallback } from "react";
import { ImagePlus, GripHorizontal, Timer, Sparkles, Film, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface ImageItem {
  id: string;
  name: string;
  file: File;
  preview: string;
}

export default function ImageToVideo() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [duration, setDuration] = useState(3);
  const [fadeTransition, setFadeTransition] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleFiles = useCallback((files: FileList) => {
    const remaining = 5 - images.length;
    const newImages = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, remaining)
      .map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        file,
        preview: URL.createObjectURL(file),
      }));
    setImages((prev) => [...prev, ...newImages]);
  }, [images.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeImage = (id: string) => setImages((prev) => prev.filter((i) => i.id !== id));

  const handleReorder = (fromIdx: number, toIdx: number) => {
    setImages((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const handleGenerate = async () => {
    if (images.length === 0) return;
    setIsRendering(true);
    setRenderProgress(0);
    setResultUrl(null);

    try {
      const width = 1280;
      const height = 720;
      const fps = 30;
      const frameDuration = duration * fps;
      const fadeFrames = fadeTransition ? Math.min(15, Math.floor(frameDuration / 4)) : 0;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordingDone = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      });

      // Load all images
      const loadedImages = await Promise.all(images.map((img) => loadImage(img.preview)));
      setRenderProgress(10);

      recorder.start();

      const totalFrames = images.length * frameDuration;
      let frameCount = 0;

      for (let imgIdx = 0; imgIdx < loadedImages.length; imgIdx++) {
        const img = loadedImages[imgIdx];

        for (let f = 0; f < frameDuration; f++) {
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, width, height);

          // Draw image (cover fit)
          const scale = Math.max(width / img.width, height / img.height);
          const dw = img.width * scale;
          const dh = img.height * scale;
          const dx = (width - dw) / 2;
          const dy = (height - dh) / 2;

          let alpha = 1;
          if (fadeTransition) {
            if (f < fadeFrames) {
              alpha = f / fadeFrames;
            } else if (f > frameDuration - fadeFrames) {
              alpha = (frameDuration - f) / fadeFrames;
            }
          }

          ctx.globalAlpha = alpha;
          ctx.drawImage(img, dx, dy, dw, dh);
          ctx.globalAlpha = 1;

          frameCount++;
          setRenderProgress(10 + Math.floor((frameCount / totalFrames) * 85));

          // Wait for next frame timing
          await new Promise((r) => setTimeout(r, 1000 / fps));
        }
      }

      recorder.stop();
      const blob = await recordingDone;
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setRenderProgress(100);
      toast.success("影片生成完成！");
    } catch (err: any) {
      console.error("Render error:", err);
      toast.error(err.message || "影片生成失敗");
    } finally {
      setTimeout(() => {
        setIsRendering(false);
        setRenderProgress(0);
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">多圖轉影片製作工具</h1>
        <p className="text-muted-foreground mt-1">上傳多張圖片，自動生成精美影片</p>
      </div>

      {/* Upload area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <ImagePlus className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-foreground">拖拽圖片至此（最多 5 張）</p>
        <p className="text-xs text-muted-foreground mt-1">已上傳 {images.length}/5</p>
        <input type="file" accept="image/*" multiple className="hidden" id="img-upload"
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files); }}
        />
        <label htmlFor="img-upload">
          <Button variant="outline" size="sm" className="mt-3 cursor-pointer" asChild>
            <span>選擇圖片</span>
          </Button>
        </label>
      </div>

      {/* Timeline */}
      {images.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Film className="h-4 w-4 text-primary" />
            時間軸工作區
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {images.map((img, idx) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragIndex !== null && dragIndex !== idx) handleReorder(dragIndex, idx); setDragIndex(null); }}
                className={`relative group shrink-0 w-40 rounded-lg border-2 overflow-hidden transition-all cursor-grab active:cursor-grabbing ${
                  dragIndex === idx ? "border-primary scale-95 opacity-70" : "border-border hover:border-primary/50"
                }`}
              >
                <img src={img.preview} alt={img.name} className="w-full h-24 object-cover" />
                <div className="p-2 bg-card">
                  <p className="text-xs text-foreground truncate">{img.name}</p>
                  <p className="text-xs text-muted-foreground">{duration}s</p>
                </div>
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-background/80 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute top-1 left-1 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripHorizontal className="h-3 w-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border glow-border space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            參數設定
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">單張停留時間</Label>
              <span className="text-xs text-primary font-mono">{duration}s</span>
            </div>
            <Slider value={[duration]} onValueChange={([v]) => setDuration(v)} min={1} max={5} step={0.5} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">淡入淡出轉場</Label>
            <Switch checked={fadeTransition} onCheckedChange={setFadeTransition} />
          </div>
          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            預計影片長度: <span className="text-foreground font-medium">{(images.length * duration).toFixed(1)}s</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border glow-border-accent flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              生成影片
            </h3>
            <p className="text-xs text-muted-foreground mt-1">確認設定後點擊下方按鈕開始渲染</p>
          </div>
          {isRendering && (
            <div className="space-y-2 my-4">
              <Progress value={renderProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{renderProgress}% 渲染中...</p>
            </div>
          )}
          <Button
            className="w-full mt-4"
            disabled={images.length === 0 || isRendering}
            onClick={handleGenerate}
          >
            {isRendering ? "渲染中..." : "生成影片"}
          </Button>
          {resultUrl && (
            <a href={resultUrl} download="slideshow.webm" className="mt-2 block">
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                下載影片 (WebM)
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
