export async function downloadUrlAsFile(url: string, filename: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    triggerDownload(blobUrl, filename);
    URL.revokeObjectURL(blobUrl);
  } catch {
    triggerDownload(url, filename);
  }
}

function triggerDownload(url: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}