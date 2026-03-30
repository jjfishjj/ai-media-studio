import { useState } from "react";
import { Film, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { SubtitleEntry } from "@/lib/subtitleExporter";
import { generateSRT } from "@/lib/subtitleExporter";
import { toast } from "sonner";

interface Props {
  videoFile: File | null;
  subtitles: SubtitleEntry[];
  onResultReady?: (url: string) => void;
}

export function BurnSubtitlePanel({ videoFile, subtitles }: Props) {
  const [isBurning, setIsBurning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleBurn = async () => {
    if (!videoFile) {
      toast.error("請先上傳影片");
      return;
    }
    if (subtitles.length === 0 || !subtitles.some((s) => s.translated)) {
      toast.error("請先完成字幕翻譯");
      return;
    }

    setIsBurning(true);
    setProgress(10);
    setResultUrl(null);

    try {
      // Generate SRT content for burning
      const srtContent = generateSRT(subtitles, "both");

      // Use client-side approach with canvas + MediaRecorder
      toast.info("正在合成影片，這可能需要一些時間...");
      setProgress(20);

      const videoUrl = URL.createObjectURL(videoFile);
      const video = document.createElement("video");
      video.src = videoUrl;
      video.muted = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("影片載入失敗"));
      });

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(30);

      // Add original audio track
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioCtx.destination);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const timeToSeconds = (time: string): number => {
        const parts = time.split(":");
        const h = parseInt(parts[0] || "0", 10);
        const m = parseInt(parts[1] || "0", 10);
        const sFull = parts[2] || "0";
        const sParts = sFull.split(".");
        const s = parseInt(sParts[0], 10);
        const ms = sParts[1] ? parseInt(sParts[1].padEnd(3, "0").slice(0, 3), 10) / 1000 : 0;
        return h * 3600 + m * 60 + s + ms;
      };

      const drawFrame = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const currentTime = video.currentTime;
        const activeSub = subtitles.find((s) => {
          return currentTime >= timeToSeconds(s.start) && currentTime <= timeToSeconds(s.end);
        });

        if (activeSub) {
          const fontSize = Math.max(16, Math.floor(canvas.height / 20));
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";

          const x = canvas.width / 2;
          let y = canvas.height - 40;

          // Draw translated text
          if (activeSub.translated) {
            const translatedFontSize = Math.max(14, Math.floor(fontSize * 0.85));
            ctx.font = `${translatedFontSize}px sans-serif`;
            ctx.strokeStyle = "rgba(0,0,0,0.8)";
            ctx.lineWidth = 3;
            ctx.strokeText(activeSub.translated, x, y);
            ctx.fillStyle = "#60a5fa";
            ctx.fillText(activeSub.translated, x, y);
            y -= translatedFontSize + 8;
          }

          // Draw original text
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.strokeStyle = "rgba(0,0,0,0.8)";
          ctx.lineWidth = 3;
          ctx.strokeText(activeSub.text, x, y);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(activeSub.text, x, y);
        }

        setProgress(20 + Math.floor((currentTime / (video.duration || 1)) * 70));
      };

      const recordingDone = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: "video/webm" }));
        };
      });

      recorder.start();
      video.currentTime = 0;
      await video.play();

      const renderLoop = () => {
        if (video.ended || video.paused) {
          recorder.stop();
          return;
        }
        drawFrame();
        requestAnimationFrame(renderLoop);
      };
      renderLoop();

      video.onended = () => {
        drawFrame();
        recorder.stop();
      };

      const blob = await recordingDone;
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setProgress(100);
      toast.success("影片合成完成！");

      URL.revokeObjectURL(videoUrl);
      audioCtx.close();
    } catch (err: any) {
      console.error("Burn error:", err);
      toast.error(err.message || "影片合成失敗");
    } finally {
      setTimeout(() => {
        setIsBurning(false);
        setProgress(0);
      }, 500);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Film className="h-4 w-4 text-primary" />
        燒錄字幕影片
      </h3>
      <p className="text-xs text-muted-foreground">
        將雙語字幕燒入影片中，產出新的影片檔案
      </p>
      <Button
        className="w-full"
        onClick={handleBurn}
        disabled={isBurning || !videoFile}
      >
        {isBurning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            合成中...
          </>
        ) : (
          <>
            <Film className="h-4 w-4 mr-2" />
            開始燒錄字幕
          </>
        )}
      </Button>
      {isBurning && <Progress value={progress} className="mt-2" />}
      {resultUrl && (
        <a href={resultUrl} download="translated_video.webm">
          <Button variant="outline" className="w-full mt-2">
            <Download className="h-4 w-4 mr-2" />
            下載翻譯影片 (WebM)
          </Button>
        </a>
      )}
    </div>
  );
}
