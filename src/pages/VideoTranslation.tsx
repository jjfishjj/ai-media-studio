import { useState, useCallback, useRef } from "react";
import { Upload, Mic, Play, Pause, Languages, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractAudioFromVideo } from "@/lib/audioExtractor";

const LANGUAGES = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
];

interface SubtitleEntry {
  id: number;
  start: string;
  end: string;
  text: string;
  translated: string;
}

const mockSubtitles: SubtitleEntry[] = [
  { id: 1, start: "00:00:01", end: "00:00:04", text: "Welcome to our product demo", translated: "歡迎觀看我們的產品展示" },
  { id: 2, start: "00:00:05", end: "00:00:09", text: "Today we'll show you the features", translated: "今天我們將展示各項功能" },
  { id: 3, start: "00:00:10", end: "00:00:14", text: "Let's get started with the basics", translated: "讓我們從基礎開始" },
  { id: 4, start: "00:00:15", end: "00:00:19", text: "First, upload your video file", translated: "首先，上傳您的影片檔案" },
];

export default function VideoTranslation() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sourceLang, setSourceLang] = useState("en");
  const [targetVoice, setTargetVoice] = useState("zh");
  const [subtitle1, setSubtitle1] = useState("en");
  const [subtitle2, setSubtitle2] = useState("zh");
  const [dualSubtitle, setDualSubtitle] = useState(true);
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>(mockSubtitles);
  const [isExtracting, setIsExtracting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "video/mp4" || file.type === "video/quicktime")) {
      setVideoFile(file);
      setVideoFileName(file.name);
    }
  }, []);

  const handleExtractAudio = async () => {
    if (!videoFile) {
      toast.error("請先上傳影片");
      return;
    }
    setIsExtracting(true);
    try {
      const { base64, mimeType } = await extractAudioFromVideo(videoFile, (msg) => {
        toast.info(msg);
      });

      toast.info("正在進行語音辨識...");

      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: {
          audioBase64: base64,
          mimeType,
          sourceLang,
        },
      });

      if (error) throw new Error(error.message || "語音辨識失敗");
      if (data?.error) throw new Error(data.error);

      const segments = data.segments;
      if (segments && segments.length > 0) {
        setSubtitles(
          segments.map((s: any) => ({
            id: s.id,
            start: s.start,
            end: s.end,
            text: s.text,
            translated: "",
          }))
        );
        toast.success(`成功辨識 ${segments.length} 段字幕！`);
      } else {
        toast.warning("未偵測到語音內容");
      }
    } catch (err: any) {
      console.error("Extraction error:", err);
      toast.error(err.message || "語音提取過程中發生錯誤");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleTranslation = async () => {
    if (subtitles.length === 0) {
      toast.error("沒有可翻譯的字幕");
      return;
    }
    setIsTranslating(true);
    setTranslationProgress(20);
    try {
      const { data, error } = await supabase.functions.invoke("translate-subtitles", {
        body: {
          subtitles: subtitles.map((s) => ({ id: s.id, text: s.text })),
          sourceLang: sourceLang,
          targetLang: targetVoice,
        },
      });

      setTranslationProgress(80);

      if (error) {
        throw new Error(error.message || "翻譯失敗");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const translations: { id: number; translated: string }[] = data.translations;
      setSubtitles((prev) =>
        prev.map((s) => {
          const match = translations.find((t) => t.id === s.id);
          return match ? { ...s, translated: match.translated } : s;
        })
      );

      setTranslationProgress(100);
      toast.success("翻譯完成！");
    } catch (err: any) {
      console.error("Translation error:", err);
      toast.error(err.message || "翻譯過程中發生錯誤");
    } finally {
      setTimeout(() => {
        setIsTranslating(false);
        setTranslationProgress(0);
      }, 500);
    }
  };

  const updateSubtitle = (id: number, field: "text" | "translated", value: string) => {
    setSubtitles((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI 影片翻譯與雙語字幕</h1>
        <p className="text-muted-foreground mt-1">上傳影片，自動翻譯並生成雙語字幕</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Upload + Settings */}
        <div className="space-y-4">
          {/* Upload */}
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
                <p className="text-sm text-foreground">拖拽 MP4/MOV 影片至此</p>
                <p className="text-xs text-muted-foreground mt-1">或點擊上傳</p>
              </>
            )}
            <input type="file" accept="video/mp4,video/quicktime" className="hidden" id="video-upload"
              onChange={(e) => { if (e.target.files?.[0]) setVideoFile(e.target.files[0].name); }}
            />
            <label htmlFor="video-upload">
              <Button variant="outline" size="sm" className="mt-3 cursor-pointer" asChild>
                <span>選擇檔案</span>
              </Button>
            </label>
          </div>

          {/* Extract audio */}
          <Button
            variant="outline"
            className="w-full border-primary/30 text-primary hover:bg-primary/10"
            onClick={handleExtractAudio}
            disabled={isExtracting}
          >
            <Mic className="h-4 w-4 mr-2" />
            {isExtracting ? "正在提取語音..." : "自動提取語音內容"}
          </Button>

          {/* Language settings */}
          <div className="space-y-3 p-4 rounded-xl bg-card border border-border glow-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary" />
              語言設定
            </h3>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">來源語種</Label>
              <Select value={sourceLang} onValueChange={setSourceLang}>
                <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">目標語音（配音）</Label>
              <Select value={targetVoice} onValueChange={setTargetVoice}>
                <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label className="text-xs text-muted-foreground">雙語字幕模式</Label>
              <Switch checked={dualSubtitle} onCheckedChange={setDualSubtitle} />
            </div>

            {dualSubtitle && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">第一字幕</Label>
                  <Select value={subtitle1} onValueChange={setSubtitle1}>
                    <SelectTrigger className="bg-muted border-border text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">第二字幕</Label>
                  <Select value={subtitle2} onValueChange={setSubtitle2}>
                    <SelectTrigger className="bg-muted border-border text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <Button className="w-full mt-2" onClick={handleTranslation} disabled={isTranslating}>
              {isTranslating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  翻譯中...
                </>
              ) : (
                "開始翻譯"
              )}
            </Button>
            {isTranslating && (
              <Progress value={translationProgress} className="mt-2" />
            )}
          </div>
        </div>

        {/* Center: Preview Player */}
        <div className="space-y-4">
          <div className="aspect-video rounded-xl bg-muted border border-border overflow-hidden relative">
            <div className="absolute inset-0 flex items-center justify-center">
              {videoFile ? (
                <div className="text-center">
                  <div className="w-full h-full bg-gradient-to-br from-muted to-card absolute inset-0" />
                  <div className="relative z-10">
                    <Play className="h-12 w-12 text-primary mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">{videoFile}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">請先上傳影片</p>
              )}
            </div>
            {/* Subtitle overlay */}
            {videoFile && dualSubtitle && (
              <div className="absolute bottom-4 left-4 right-4 text-center space-y-1">
                <p className="text-sm font-medium text-foreground bg-background/80 inline-block px-3 py-1 rounded">
                  {subtitles[0]?.text}
                </p>
                <p className="text-xs text-primary bg-background/80 inline-block px-3 py-1 rounded">
                  {subtitles[0]?.translated}
                </p>
              </div>
            )}
          </div>
          {/* Playback controls */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
            <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary to-accent" />
            </div>
            <span className="text-xs text-muted-foreground font-mono">00:06 / 00:19</span>
          </div>
        </div>

        {/* Right: Subtitle Editor */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">字幕編輯器</h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {subtitles.map((sub) => (
              <div key={sub.id} className="p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span className="px-2 py-0.5 rounded bg-muted">{sub.start}</span>
                  <span>→</span>
                  <span className="px-2 py-0.5 rounded bg-muted">{sub.end}</span>
                </div>
                <Textarea
                  value={sub.text}
                  onChange={(e) => updateSubtitle(sub.id, "text", e.target.value)}
                  className="min-h-[40px] text-sm bg-muted border-border resize-none"
                  rows={1}
                />
                <Textarea
                  value={sub.translated}
                  onChange={(e) => updateSubtitle(sub.id, "translated", e.target.value)}
                  className="min-h-[40px] text-sm bg-muted border-border resize-none text-primary"
                  rows={1}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
