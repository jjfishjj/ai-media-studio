import type { SubtitleEntry } from "./subtitleExporter";

const langVoiceMap: Record<string, string> = {
  zh: "zh-TW",
  en: "en-US",
  ja: "ja-JP",
  ko: "ko-KR",
  es: "es-ES",
  de: "de-DE",
  fr: "fr-FR",
};

export function getSpeechLang(lang: string): string {
  return langVoiceMap[lang] || lang;
}

export function getAvailableVoices(lang: string): SpeechSynthesisVoice[] {
  const speechLang = getSpeechLang(lang);
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.startsWith(speechLang.split("-")[0]));
}

export function timeToSeconds(time: string): number {
  const parts = time.split(":");
  const h = parseInt(parts[0] || "0", 10);
  const m = parseInt(parts[1] || "0", 10);
  const sFull = parts[2] || "0";
  const sParts = sFull.split(".");
  const s = parseInt(sParts[0], 10);
  const ms = sParts[1]
    ? parseInt(sParts[1].padEnd(3, "0").slice(0, 3), 10) / 1000
    : 0;
  return h * 3600 + m * 60 + s + ms;
}

/**
 * Manages real-time TTS dubbing synced to video playback.
 */
export class DubbingController {
  private video: HTMLVideoElement | null = null;
  private subtitles: SubtitleEntry[] = [];
  private lang: string = "zh";
  private lastSpokenId: number | null = null;
  private animFrameId: number | null = null;
  private active = false;

  start(
    video: HTMLVideoElement,
    subtitles: SubtitleEntry[],
    targetLang: string
  ) {
    this.stop();
    this.video = video;
    this.subtitles = subtitles;
    this.lang = targetLang;
    this.active = true;
    this.lastSpokenId = null;
    this.tick();
  }

  stop() {
    this.active = false;
    if (this.animFrameId != null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    window.speechSynthesis.cancel();
    this.lastSpokenId = null;
  }

  private tick = () => {
    if (!this.active || !this.video) return;

    const currentTime = this.video.currentTime;
    const activeSub = this.subtitles.find(
      (s) =>
        s.translated &&
        currentTime >= timeToSeconds(s.start) &&
        currentTime <= timeToSeconds(s.end)
    );

    if (activeSub && activeSub.id !== this.lastSpokenId) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(activeSub.translated);
      utterance.lang = getSpeechLang(this.lang);
      utterance.rate = 1.1;
      utterance.pitch = 1;

      // Try to pick a voice for this language
      const voices = getAvailableVoices(this.lang);
      if (voices.length > 0) {
        utterance.voice = voices[0];
      }

      window.speechSynthesis.speak(utterance);
      this.lastSpokenId = activeSub.id;
    } else if (!activeSub) {
      this.lastSpokenId = null;
    }

    this.animFrameId = requestAnimationFrame(this.tick);
  };
}
