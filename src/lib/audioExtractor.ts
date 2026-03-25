/**
 * Extract audio from a video file using Web Audio API.
 * Returns base64-encoded WAV data.
 */
export async function extractAudioFromVideo(
  file: File,
  onProgress?: (msg: string) => void
): Promise<{ base64: string; mimeType: string }> {
  onProgress?.("正在讀取影片檔案...");

  const arrayBuffer = await file.arrayBuffer();

  onProgress?.("正在解碼音訊...");
  const audioCtx = new AudioContext();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  onProgress?.("正在轉換音訊格式...");
  const wavBuffer = audioBufferToWav(audioBuffer);
  const base64 = arrayBufferToBase64(wavBuffer);

  await audioCtx.close();

  return { base64, mimeType: "audio/wav" };
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = 1; // mono for speech
  const sampleRate = Math.min(buffer.sampleRate, 16000); // downsample for efficiency
  const originalRate = buffer.sampleRate;
  const ratio = originalRate / sampleRate;
  const originalLength = buffer.length;
  const newLength = Math.floor(originalLength / ratio);

  // Mix down to mono and resample
  const channelData = buffer.getChannelData(0);
  const samples = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIndex = Math.floor(i * ratio);
    samples[i] = channelData[srcIndex];
  }

  // Encode as 16-bit PCM WAV
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const headerSize = 44;
  const wavBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(wavBuffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return wavBuffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
