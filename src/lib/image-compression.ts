export interface CompressedImageResult {
  dataUrl: string;
  base64: string;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

const MAX_IMAGE_DIMENSION = 1280;
const COMPRESSION_QUALITY = 0.82;
const MAX_RAW_FILE_SIZE_BYTES = 12 * 1024 * 1024; // 12MB raw limit

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

/**
 * Validates whether a file is an acceptable image format and within initial size bounds.
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No file was selected." };
  }

  const isTypeAllowed =
    ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) ||
    /\.(jpe?g|png|webp|heic)$/i.test(file.name);

  if (!isTypeAllowed) {
    return {
      valid: false,
      error: "Please upload an image in JPEG, PNG, or WebP format.",
    };
  }

  if (file.size > MAX_RAW_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Selected file is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Maximum allowed size is 12MB.`,
    };
  }

  return { valid: true };
}

/**
 * Compresses an image file in-browser using HTML5 Canvas before uploading to server.
 * Downscales images exceeding 1280px dimension to optimize network speed and stay well
 * under API limits.
 */
export async function compressImageForUpload(file: File): Promise<CompressedImageResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid image file.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Failed to read image file from disk."));
    };

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error("Failed to decode image data."));
      };

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Downscale proportionally if larger than maximum dimension
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
            width = MAX_IMAGE_DIMENSION;
          } else {
            width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
            height = MAX_IMAGE_DIMENSION;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not initialize 2D canvas context."));
          return;
        }

        // Fill white background in case of transparent PNG/WebP
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const targetMime = "image/jpeg";
        const dataUrl = canvas.toDataURL(targetMime, COMPRESSION_QUALITY);
        const base64 = dataUrl.split(",")[1] || "";
        const compressedBytes = Math.round((base64.length * 3) / 4);

        resolve({
          dataUrl,
          base64,
          mimeType: targetMime,
          originalSize: file.size,
          compressedSize: compressedBytes,
          width,
          height,
        });
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
