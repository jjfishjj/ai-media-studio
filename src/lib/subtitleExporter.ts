export interface SubtitleEntry {
  id: number;
  start: string;
  end: string;
  text: string;
  translated: string;
}

function timeToSrt(time: string): string {
  // Convert "00:00:01" or "00:00:01.500" to SRT format "00:00:01,000"
  const parts = time.split(".");
  const hms = parts[0];
  const ms = parts[1] ? parts[1].padEnd(3, "0").slice(0, 3) : "000";
  return `${hms},${ms}`;
}

function timeToVtt(time: string): string {
  const parts = time.split(".");
  const hms = parts[0];
  const ms = parts[1] ? parts[1].padEnd(3, "0").slice(0, 3) : "000";
  return `${hms}.${ms}`;
}

export function generateSRT(
  subtitles: SubtitleEntry[],
  field: "text" | "translated" | "both"
): string {
  return subtitles
    .map((s, i) => {
      const text =
        field === "both"
          ? `${s.text}\n${s.translated}`
          : field === "translated"
          ? s.translated
          : s.text;
      return `${i + 1}\n${timeToSrt(s.start)} --> ${timeToSrt(s.end)}\n${text}`;
    })
    .join("\n\n");
}

export function generateVTT(
  subtitles: SubtitleEntry[],
  field: "text" | "translated" | "both"
): string {
  const cues = subtitles
    .map((s) => {
      const text =
        field === "both"
          ? `${s.text}\n${s.translated}`
          : field === "translated"
          ? s.translated
          : s.text;
      return `${timeToVtt(s.start)} --> ${timeToVtt(s.end)}\n${text}`;
    })
    .join("\n\n");
  return `WEBVTT\n\n${cues}`;
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
