import { VeilError } from "@/src/utils/errors";

export interface ProcessedImage {
  blob: Blob;
  thumbnail: Blob;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

export async function processImage(file: File): Promise<ProcessedImage> {
  if (!file.type.startsWith("image/")) {
    throw new VeilError("Choose an image from your photo library.", "INVALID_IMAGE_TYPE");
  }
  if (file.size > 40 * 1024 * 1024) {
    throw new VeilError("That photo is too large to process. Choose a smaller image.", "IMAGE_TOO_LARGE");
  }

  const source = await decodeImage(file);
  try {
    const full = fit(source, 1800);
    const thumbnail = fit(source, 420);
    const mimeType = supportsWebP() ? "image/webp" : "image/jpeg";
    const [blob, thumbnailBlob] = await Promise.all([
      render(source, full, mimeType, 0.82),
      render(source, thumbnail, mimeType, 0.76),
    ]);
    return {
      blob,
      thumbnail: thumbnailBlob,
      mimeType,
      width: full.width,
      height: full.height,
      byteSize: blob.size + thumbnailBlob.size,
    };
  } finally {
    source.close();
  }
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    if ("createImageBitmap" in window) return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Safari versions that reject the options object use the DOM fallback below.
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new VeilError("Veil couldn’t read that photo.", "IMAGE_DECODE_FAILED"));
      element.src = url;
    });
    return await createImageBitmap(image);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function fit(source: ImageDimensions, maxDimension: number): ImageDimensions {
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  return {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  };
}

async function render(
  source: ImageBitmap,
  dimensions: ImageDimensions,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new VeilError("This browser can’t process photos right now.", "CANVAS_UNAVAILABLE");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, dimensions.width, dimensions.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality));
  canvas.width = 1;
  canvas.height = 1;
  if (!blob) throw new VeilError("Veil couldn’t compress that photo.", "IMAGE_ENCODE_FAILED");
  return blob;
}

let webpSupport: boolean | undefined;

function supportsWebP(): boolean {
  if (webpSupport !== undefined) return webpSupport;
  const canvas = document.createElement("canvas");
  webpSupport = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  return webpSupport;
}
