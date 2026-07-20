/**
 * Client-side media processing for VideoDrops.
 * 100% browser — Canvas API for thumbnails, MediaRecorder for previews.
 * No server-side processing, no paid services.
 */

const THUMBNAIL_MAX_DIM = 1280;
const PREVIEW_DURATION = 6; // seconds
// ponytail: 24fps da fluidez aceptable sin llegar a 48fps de captureStream
const PREVIEW_FPS = 30;
// ponytail: 1Mbps para 640p — VP9 se la banca, el encoder no acumula backlog
const PREVIEW_BITRATE = 1_000_000; // 1mbps
const PREVIEW_MAX_DIM = 640;

/**
 * Generate a WebP thumbnail from a video file.
 * Seeks to the middle frame and exports it via Canvas.
 */
export function generateThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.playsInline = true;
    video.muted = true;
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      const midTime = video.duration / 2;
      video.currentTime = midTime;
    };

    video.onseeked = () => {
      try {
        const scale = Math.min(
          THUMBNAIL_MAX_DIM / video.videoWidth,
          THUMBNAIL_MAX_DIM / video.videoHeight,
          1
        );
        const w = Math.round(video.videoWidth * scale);
        const h = Math.round(video.videoHeight * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0, w, h);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(video.src);
            if (blob) resolve(blob);
            else reject(new Error("Canvas toBlob returned null"));
          },
          "image/webp",
          0.85
        );
      } catch (err) {
        URL.revokeObjectURL(video.src);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Failed to load video for thumbnail generation"));
    };
  });
}

/**
 * Generate a short preview clip from a video file using MediaRecorder.
 * Returns a WebP or MP4 Blob, or null if MediaRecorder is unavailable.
 */
export function generatePreview(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (!window.MediaRecorder) {
      resolve(null);
      return;
    }

    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      resolve(null);
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.playsInline = true;
    video.muted = true;
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const startTime = Math.max(0, duration * 0.1);
      const endTime = Math.min(duration, startTime + PREVIEW_DURATION);
      const actualDuration = endTime - startTime;

      const scale = Math.min(
        PREVIEW_MAX_DIM / video.videoWidth,
        PREVIEW_MAX_DIM / video.videoHeight,
        1
      );
      const w = Math.round(video.videoWidth * scale);
      const h = Math.round(video.videoHeight * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      // Canvas stream MUST be created after canvas is defined
      const stream = canvas.captureStream(PREVIEW_FPS);
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: PREVIEW_BITRATE,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        URL.revokeObjectURL(video.src);
        resolve(chunks.length > 0 ? new Blob(chunks, { type: mimeType }) : null);
      };

      recorder.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };

      // Seek to start time, then play and record
      video.currentTime = startTime;
      video.onseeked = () => {
        video.play().then(() => {
          // ponytail: sin timeslice — menos overhead, el encoder flushes una vez al final
          recorder.start();
          const interval = setInterval(() => {
            ctx.drawImage(video, 0, 0, w, h);
          }, 1000 / PREVIEW_FPS);
          // ponytail: setTimeout en vez de frame-counting
          setTimeout(() => {
            clearInterval(interval);
            // ponytail: matar el track antes de stop() — sin stream activo el encoder no acumula backlog
            stream.getVideoTracks()[0].stop();
            recorder.stop();
            video.pause();
          }, actualDuration * 1000);
        }).catch(() => {
          URL.revokeObjectURL(video.src);
          resolve(null);
        });
      };
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(null);
    };
  });
}

/**
 * Detect best available MIME type for MediaRecorder.
 * Chain: VP9 → VP8 → WebM → MP4 (Safari)
 */
function getSupportedMimeType(): string | null {
  const options = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4;codecs=h264",
    "video/mp4",
  ];

  for (const mime of options) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }

  return null;
}
