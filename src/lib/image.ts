/**
 * Downscale an uploaded photo to a JPEG data URL so the demo can keep it in the
 * local repository. With Supabase this is replaced by an upload to Storage.
 */
export async function downscale(file: File, max = 1000, quality = 0.78): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not_image");
  const url = URL.createObjectURL(file);
  try {
    const img = document.createElement("img");
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
