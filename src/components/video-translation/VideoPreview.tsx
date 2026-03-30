import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { SubtitleEntry } from "@/lib/subtitleExporter";

interface Props {
  videoFile: File | null;
  videoFileName: string | null;
  subtitles: SubtitleEntry[];
  dualSubtitle: boolean;
  burnedVideoUrl?: string | null;
}

function timeToSeconds(time: string): number {
  const parts = time.split(":");
  const h = parseInt(parts[0] || "0", 10);
  const m = parseInt(parts[1] || "0", 10);
  const sFull = parts[2] || "0";
  const sParts = sFull.split(".");
  const s = parseInt(sParts[0], 10);
  const ms = sParts[1] ? parseInt(sParts[1].padEnd(3, "0").slice(0, 3), 10) / 1000 : 0;
  return h * 3600 + m * 60 + s + ms;
}

export function VideoPreview({ videoFile, videoFileName, subtitles, dualSubtitle, burnedVideoUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showBurned, setShowBurned] = useState(false);

  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoUrl(null);
    }
  }, [videoFile]);

  // Auto-switch to burned preview when ready
  useEffect(() => {
    if (burnedVideoUrl) setShowBurned(true);
  }, [burnedVideoUrl]);

  const activeSource = showBurned && burnedVideoUrl ? burnedVideoUrl : videoUrl;

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = ratio * duration;
  };

  const activeSub = subtitles.find((s) => {
    const start = timeToSeconds(s.start);
    const end = timeToSeconds(s.end);
    return currentTime >= start && currentTime <= end;
  });

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className="aspect-video rounded-xl bg-muted border border-border overflow-hidden relative">
        {videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain bg-black"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              onClick={togglePlay}
            />
            {activeSub && (
              <div className="absolute bottom-4 left-4 right-4 text-center space-y-1 pointer-events-none">
                <p className="text-sm font-medium text-foreground bg-background/80 inline-block px-3 py-1 rounded">
                  {activeSub.text}
                </p>
                {dualSubtitle && activeSub.translated && (
                  <p className="text-xs text-primary bg-background/80 inline-block px-3 py-1 rounded">
                    {activeSub.translated}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">請先上傳影片</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
        <Button variant="ghost" size="icon" onClick={togglePlay} disabled={!videoUrl}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div
          className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
          />
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
