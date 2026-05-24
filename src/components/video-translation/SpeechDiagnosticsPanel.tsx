import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Mic,
  Globe,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  isSpeechSynthesisSupported,
  getAvailableVoices,
  getSpeechLang,
} from "@/lib/speechDubbing";

interface VoiceInfo {
  name: string;
  lang: string;
  voiceURI: string;
  local: boolean;
  default: boolean;
}

interface DiagnosticsData {
  supported: boolean;
  userAgent: string;
  platform: string;
  voicesCount: number;
  voices: VoiceInfo[];
  timestamp: string;
}

export function SpeechDiagnosticsPanel({ targetLang = "zh" }: { targetLang?: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = useCallback(() => {
    setLoading(true);
    try {
      const supported = isSpeechSynthesisSupported();
      let voices: SpeechSynthesisVoice[] = [];
      if (supported && typeof window !== "undefined" && window.speechSynthesis) {
        try {
          voices = window.speechSynthesis.getVoices();
        } catch {
          voices = [];
        }
      }

      // Also try language-filtered voices via helper
      const filteredVoices = getAvailableVoices(targetLang);

      const diagnostics: DiagnosticsData = {
        supported,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        voicesCount: voices.length,
        voices: voices.map((v) => ({
          name: v.name,
          lang: v.lang,
          voiceURI: v.voiceURI,
          local: v.localService,
          default: v.default,
        })),
        timestamp: new Date().toISOString(),
      };

      setData(diagnostics);

      // Quick toast summary
      if (!supported) {
        toast.error("瀏覽器不支援 speechSynthesis");
      } else if (voices.length === 0) {
        toast.warning("speechSynthesis 已啟用，但無可用語音");
      } else {
        toast.success(`偵測到 ${voices.length} 個語音（${targetLang} 篩選後 ${filteredVoices.length} 個）`);
      }
    } finally {
      setLoading(false);
    }
  }, [targetLang]);

  // Auto-run once on mount
  useEffect(() => {
    // Delay slightly to allow voices to populate in some browsers
    const timer = setTimeout(runDiagnostics, 500);
    return () => clearTimeout(timer);
  }, [runDiagnostics]);

  const copyToClipboard = async () => {
    if (!data) return;
    const text = JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("診斷資訊已複製到剪貼簿");
    } catch {
      toast.error("複製失敗");
    }
  };

  const filteredVoices = data ? getAvailableVoices(targetLang) : [];
  const filteredCount = filteredVoices.length;

  return (
    <div className="p-3 rounded-xl bg-card border border-border space-y-2">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between text-left">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                TTS 診斷面板
              </span>
              {data && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                    data.supported
                      ? "bg-green-500/15 text-green-400"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {data.supported ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      已啟用
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" />
                      未支援
                    </>
                  )}
                </span>
              )}
            </div>
            {open ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 pt-2">
          {/* Status badges */}
          {data && (
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md bg-muted border border-border">
                <Globe className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">{data.platform}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md bg-muted border border-border">
                <Mic className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  全部語音: {data.voicesCount}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md bg-muted border border-border">
                <Info className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {targetLang} 篩選: {filteredCount}
                </span>
              </div>
            </div>
          )}

          {/* User agent (truncated) */}
          {data && (
            <div className="text-[10px] text-muted-foreground break-all bg-muted/50 p-2 rounded-md border border-border">
              <span className="font-mono">{data.userAgent}</span>
            </div>
          )}

          {/* Voices table */}
          {data && data.voices.length > 1 && (
            <div className="max-h-48 overflow-y-auto border border-border rounded-md">
              <table className="w-full text-[10px]">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1 text-muted-foreground font-medium">
                      名稱
                    </th>
                    <th className="text-left px-2 py-1 text-muted-foreground font-medium">
                      語言
                    </th>
                    <th className="text-left px-2 py-1 text-muted-foreground font-medium">
                      類型
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.voices.map((v, i) => (
                    <tr
                      key={v.voiceURI + i}
                      className={`border-t border-border ${
                        v.lang.startsWith(targetLang.split("-")[1])
                          ? "bg-primary/5"
                          : ""
                      }`}
                    >
                      <td className="px-2 py-1 text-foreground truncate max-w-[120px]">
                        {v.name}
                      </td>
                      <td className="px-2 py-1 text-muted-foreground font-mono">
                        {v.lang}
                      </td>
                      <td className="px-2 py-1 text-muted-foreground">
                        {v.local ? "本機" : "雲端"}
                        {v.default && (
                          <span className="ml-1 text-[9px] text-primary">
                            預設
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.voices.length === 1 && (
            <p className="text-[10px] text-muted-foreground italic">
              未偵測到任何語音資料。部分瀏覽器需使用者互動後才會載入語音清單。
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={runDiagnostics}
              disabled={loading}
            >
              <Activity className="h-3 w-3 mr-1" />
              {loading ? "偵測中..." : "重新偵測"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={copyToClipboard}
              disabled={!data}
            >
              複製診斷資訊
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
