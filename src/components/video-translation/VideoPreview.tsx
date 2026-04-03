import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { SubtitleEntry } from "@/lib/subtitleExporter";
import { DubbingController, timeToSeconds } from "@/lib/speechDubbing";

interface Props {
  videoFile: File | null;
  videoFileName: string | null;
  subtitles: SubtitleEntry[];
  dualSubtitle: boolean;
  burnedVideoUrl?: string | null;
  targetLang?: string;
}

export function VideoPreview({ videoFile, videoFileName, subtitles, dualSubtitle, burnedVideoUrl, targetLang = "zh" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dubbingRef = useRef<DubbingController>(new DubbingController());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showBurned, setShowBurned] = useState(false);
  const [dubbingEnabled, setDubbingEnabled] = useState(false);

  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoUrl(null);
    }
  }, [videoFile]);

  useEffect(() => {
    if (burnedVideoUrl) setShowBurned(true);
  }, [burnedVideoUrl]);

  // Cleanup dubbing on unmount
  useEffect(() => {
    return () => dubbingRef.current.stop();
  }, []);

  const activeSource = showBurned && burnedVideoUrl ? burnedVideoUrl : videoUrl;

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
      if (dubbingEnabled && !showBurned) {
        v.muted = true;
        dubbingRef.current.start(v, subtitles, targetLang);
      }
    } else {
      v.pause();
      setIsPlaying(false);
      dubbingRef.current.stop();
    }
  }, [dubbingEnabled, showBurned, subtitles, targetLang]);

  const handleDubbingToggle = (enabled: boolean) => {
    setDubbingEnabled(enabled);
    const v = videoRef.current;
    if (!v) return;
    if (enabled && isPlaying && !showBurned) {
      v.muted = true;
      dubbingRef.current.start(v, subtitles, targetLang);
    } else {
      v.muted = false;
      dubbingRef.current.stop();
    }
  };

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
    // Reset last spoken so TTS re-triggers on new position
    if (dubbingEnabled) {
      dubbingRef.current.stop();
      if (isPlaying && !showBurned) {
        dubbingRef.current.start(videoRef.current, subtitles, targetLang);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    dubbingRef.current.stop();
    if (videoRef.current) videoRef.current.muted = false;
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

  const hasTranslation = subtitles.some((s) => s.translated);

  return (
    <div className="space-y-4">
      {/* Toggle controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {burnedVideoUrl && (
          <div className="flex items-center gap-2">
            <Switch checked={showBurned} onCheckedChange={setShowBurned} />
            <Label className="text-xs text-muted-foreground">
              {showBurned ? "字幕燒錄版" : "原始影片"}
            </Label>
          </div>
        )}
        {hasTranslation && !showBurned && (
          <div className="flex items-center gap-2">
            <Switch checked={dubbingEnabled} onCheckedChange={handleDubbingToggle} />
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              {dubbingEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
              AI 配音預覽
            </Label>
          </div>
        )}
      </div>

      <div className="aspect-video rounded-xl bg-muted border border-border overflow-hidden relative">
        {activeSource ? (
          <>
            <video
              ref={videoRef}
              src={activeSource}
              className="w-full h-full object-contain bg-black"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              onClick={togglePlay}
            />
            {!showBurned && activeSub && (
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
            {/* Dubbing indicator */}
            {dubbingEnabled && isPlaying && !showBurned && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-primary/90 text-primary-foreground px-2 py-1 rounded-full text-xs">
                <Volume2 className="h-3 w-3 animate-pulse" />
                配音中
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
        <Button variant="ghost" size="icon" onClick={togglePlay} disabled={!activeSource}>
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

      {dubbingEnabled && (
        <p className="text-xs text-muted-foreground italic">
          💡 配音使用瀏覽器內建語音合成，播放時會靜音原始音訊並朗讀翻譯字幕。如需高品質配音，建議連接 ElevenLabs。
        </p>
      )}
    </div>
  );
}
