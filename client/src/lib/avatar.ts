/**
 * Client-side avatar compression utility using Canvas API
 * Compresses avatars to < 100KB before sending to server
 */

export async function compressAvatar(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Set canvas size to 256x256
        canvas.width = 256;
        canvas.height = 256;

        // Calculate crop to maintain aspect ratio
        const sourceSize = Math.min(img.width, img.height);
        const x = (img.width - sourceSize) / 2;
        const y = (img.height - sourceSize) / 2;

        // Draw image with cover crop
        ctx.drawImage(img, x, y, sourceSize, sourceSize, 0, 0, 256, 256);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"));
              return;
            }

            // Check if compressed size is under 100KB
            if (blob.size > 100 * 1024) {
              reject(
                new Error(
                  `Compressed image is too large (${(blob.size / 1024).toFixed(1)}KB). Try a smaller or lower-quality image.`,
                ),
              );
              return;
            }

            // Create new File object from blob
            const compressedFile = new File([blob], file.name, {
              type: "image/webp",
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          "image/webp",
          0.8, // Quality 0.8 (80%)
        );
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}
