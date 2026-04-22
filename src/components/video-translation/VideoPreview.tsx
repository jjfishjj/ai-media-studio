import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Play, Pause, Volume2, VolumeX, Mic, Subtitles, Eye, EyeOff, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import type { SubtitleEntry } from "@/lib/subtitleExporter";
import { DubbingController, timeToSeconds, getAvailableVoices, getSpeechLang } from "@/lib/speechDubbing";
import { downloadUrlAsFile } from "@/lib/download";

interface Props {
  videoFile: File | null;
  videoFileName: string | null;
  subtitles: SubtitleEntry[];
  dualSubtitle: boolean;
  burnedVideoUrl?: string | null;
  subtitleMode?: SubtitleMode;
  onSubtitleModeChange?: (mode: SubtitleMode) => void;
  targetLang?: string;
}

type SubtitleMode = "both" | "original" | "translated" | "none";

const SUBTITLE_POSITIONS = [
  { value: "bottom", label: "底部" },
  { value: "top", label: "頂部" },
] as const;

export function VideoPreview({ videoFile, videoFileName, subtitles, dualSubtitle, burnedVideoUrl, subtitleMode: controlledSubtitleMode, onSubtitleModeChange, targetLang = "zh" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dubbingRef = useRef<DubbingController>(new DubbingController());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showBurned, setShowBurned] = useState(false);
  const [dubbingEnabled, setDubbingEnabled] = useState(false);

  // Voice selection
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("default");
  const [speechRate, setSpeechRate] = useState(1.0);

  // Subtitle display
  const [subtitleModeState, setSubtitleModeState] = useState<SubtitleMode>("both");
  const [subtitlePosition, setSubtitlePosition] = useState<"bottom" | "top">("bottom");
  const [subtitleSize, setSubtitleSize] = useState(14); // px
  const [subtitleOpacity, setSubtitleOpacity] = useState(80); // percent for bg

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const available = getAvailableVoices(targetLang);
      setVoices(available);
      if (available.length > 0 && selectedVoiceURI === "default") {
        setSelectedVoiceURI(available[0].voiceURI);
      }
    };
    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [targetLang]);

  // Reset voice selection when target language changes
  useEffect(() => {
    setSelectedVoiceURI("default");
  }, [targetLang]);

  // Update dubbing controller settings
  useEffect(() => {
    const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
    dubbingRef.current.setVoice(voice || null);
    dubbingRef.current.setRate(speechRate);
  }, [selectedVoiceURI, speechRate, voices]);

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
  const subtitleMode = controlledSubtitleMode ?? subtitleModeState;

  const handleSubtitleModeChange = (mode: SubtitleMode) => {
    onSubtitleModeChange?.(mode);
    if (!onSubtitleModeChange) setSubtitleModeState(mode);
  };

  const handleDownload = async () => {
    if (!burnedVideoUrl) return;

    try {
      await downloadUrlAsFile(burnedVideoUrl, "translated_video.webm");
      toast.success("已開始下載影片");
    } catch (err: any) {
      toast.error(err?.message || "影片下載失敗");
    }
  };

  // Should we show subtitles on the video?
  const showOriginalSub = subtitleMode === "both" || subtitleMode === "original";
  const showTranslatedSub = subtitleMode === "both" || subtitleMode === "translated";

  const subtitlePositionClass = subtitlePosition === "top" ? "top-4" : "bottom-4";

  return (
    <div className="space-y-4">
      {/* Toggle controls row */}
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
              AI 配音
            </Label>
          </div>
        )}
      </div>

      {/* Video player */}
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
            {/* Subtitle overlay */}
            {!showBurned && activeSub && subtitleMode !== "none" && (
              <div className={`absolute ${subtitlePositionClass} left-2 right-2 text-center space-y-1 pointer-events-none`}>
                {showOriginalSub && activeSub.text && (
                  <p
                    className="font-medium text-white inline-block px-3 py-1.5 rounded-md leading-relaxed"
                    style={{
                      fontSize: `${subtitleSize}px`,
                      backgroundColor: `rgba(0, 0, 0, ${subtitleOpacity / 100})`,
                      textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                    }}
                  >
                    {activeSub.text}
                  </p>
                )}
                {showTranslatedSub && activeSub.translated && (
                  <p
                    className="text-primary inline-block px-3 py-1.5 rounded-md leading-relaxed"
                    style={{
                      fontSize: `${Math.max(subtitleSize - 2, 10)}px`,
                      backgroundColor: `rgba(0, 0, 0, ${subtitleOpacity / 100})`,
                      textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                    }}
                  >
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

      {/* Playback controls */}
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

      {/* Download button */}
      {burnedVideoUrl && (
        <Button
          variant="outline"
          className="w-full border-primary/30 text-primary hover:bg-primary/10"
          onClick={handleDownload}
        >
          <>
            <Download className="h-4 w-4 mr-2" />
            下載影片到本機
          </>
        </Button>
      )}

      {/* Voice selection panel */}
      {dubbingEnabled && !showBurned && (
        <div className="p-3 rounded-xl bg-card border border-border space-y-3">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Mic className="h-3.5 w-3.5 text-primary" />
            配音聲音設定
          </h4>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">語音模板</Label>
            <Select value={selectedVoiceURI} onValueChange={setSelectedVoiceURI}>
              <SelectTrigger className="bg-muted border-border text-xs h-8">
                <SelectValue placeholder="選擇聲音" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">系統預設</SelectItem>
                {voices.map((v) => (
                  <SelectItem key={v.voiceURI} value={v.voiceURI}>
                    {v.name} {v.lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {voices.length === 0 && (
              <p className="text-xs text-muted-foreground/70 italic">
                此語言目前無可用語音，將使用系統預設
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">語速</Label>
              <span className="text-xs text-muted-foreground font-mono">{speechRate.toFixed(1)}x</span>
            </div>
            <Slider
              value={[speechRate]}
              onValueChange={([v]) => setSpeechRate(v)}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </div>
          <p className="text-xs text-muted-foreground/70 italic">
            💡 語音來自瀏覽器內建 TTS。如需高品質或保留原聲音色，建議連接 ElevenLabs。
          </p>
        </div>
      )}

      {/* Subtitle display settings */}
      {subtitles.length > 0 && !showBurned && (
        <div className="p-3 rounded-xl bg-card border border-border space-y-3">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Subtitles className="h-3.5 w-3.5 text-primary" />
            字幕顯示設定
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">顯示模式</Label>
              <Select value={subtitleMode} onValueChange={(v) => handleSubtitleModeChange(v as SubtitleMode)}>
                <SelectTrigger className="bg-muted border-border text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">雙語字幕</SelectItem>
                  <SelectItem value="original">僅原文</SelectItem>
                  <SelectItem value="translated">僅翻譯</SelectItem>
                  <SelectItem value="none">隱藏字幕</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">字幕位置</Label>
              <Select value={subtitlePosition} onValueChange={(v) => setSubtitlePosition(v as "top" | "bottom")}>
                <SelectTrigger className="bg-muted border-border text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBTITLE_POSITIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">字體大小</Label>
              <span className="text-xs text-muted-foreground font-mono">{subtitleSize}px</span>
            </div>
            <Slider
              value={[subtitleSize]}
              onValueChange={([v]) => setSubtitleSize(v)}
              min={10}
              max={24}
              step={1}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">背景透明度</Label>
              <span className="text-xs text-muted-foreground font-mono">{subtitleOpacity}%</span>
            </div>
            <Slider
              value={[subtitleOpacity]}
              onValueChange={([v]) => setSubtitleOpacity(v)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
          <p className="text-xs text-muted-foreground/70 italic">
            💡 若字幕遮擋畫面，可調整位置至頂部、降低背景透明度，或選擇僅顯示翻譯字幕。
          </p>
        </div>
      )}
    </div>
  );
}
