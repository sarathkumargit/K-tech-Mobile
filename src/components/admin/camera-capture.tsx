import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { btnPrimary, btnSecondary } from "@/components/admin/ui";

/**
 * Opens the device camera inside the page and hands back a JPEG.
 *
 * `<input type="file" capture>` is not enough on its own: phones honour it,
 * but a laptop browser ignores it completely and opens the ordinary file
 * dialog instead. getUserMedia is the only way to actually show a camera on a
 * Mac or a PC, and it works on phones too — so it is the main path here, with
 * the capture input kept only for browsers that have no getUserMedia at all.
 */
export function cameraSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    window.isSecureContext
  );
}

type Phase = "starting" | "live" | "review";

export function CameraCapture({
  onCapture,
  disabled,
}: {
  onCapture: (file: File) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("starting");
  const [shot, setShot] = useState<{ file: File; url: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Letting go of the camera matters: the indicator light stays on until
  // every track is stopped.
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const close = useCallback(() => {
    stopStream();
    setShot((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    setPhase("starting");
    setOpen(false);
  }, [stopStream]);

  // Start the camera when the panel opens, and always hand it back on the way out.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // "environment" is the rear camera on a phone; a laptop has only
          // one camera and ignores the hint.
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1920 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setPhase("live");
      } catch (err) {
        if (cancelled) return;
        toast.error(cameraError(err));
        close();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, close]);

  useEffect(() => stopStream, [stopStream]);

  const takeShot = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) {
      toast.error("Couldn't take the photo — try again.");
      return;
    }
    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    // The preview is drawn from the file itself, so what you approve is
    // exactly what gets uploaded.
    setShot({ file, url: URL.createObjectURL(file) });
    setPhase("review");
    stopStream();
  };

  const retake = () => {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
    setPhase("starting");
    // Re-running the start effect: close and reopen the stream.
    setOpen(false);
    setTimeout(() => setOpen(true), 0);
  };

  const use = () => {
    if (!shot) return;
    onCapture(shot.file);
    close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={btnSecondary}
      >
        <Camera className="h-4 w-4" />
        Take a photo
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-foreground/50 backdrop-blur-sm sm:items-center">
          <div className="absolute inset-0" onClick={close} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Take a photo"
            className="relative z-10 w-full max-w-lg rounded-t-3xl border border-border bg-card p-5 shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-foreground">Take a photo</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative mt-4 aspect-square overflow-hidden rounded-2xl bg-foreground/90">
              {/* Kept mounted so the stream has somewhere to go the moment it opens. */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`h-full w-full object-cover ${phase === "review" ? "hidden" : ""}`}
              />
              {phase === "starting" && (
                <div className="absolute inset-0 flex items-center justify-center text-background">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
              {phase === "review" && shot && (
                <img src={shot.url} alt="Photo just taken" className="h-full w-full object-cover" />
              )}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {phase === "review" ? (
                <>
                  <button type="button" onClick={retake} className={btnSecondary}>
                    <RefreshCw className="h-4 w-4" />
                    Retake
                  </button>
                  <button type="button" onClick={use} className={btnPrimary}>
                    <Check className="h-4 w-4" />
                    Use this photo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void takeShot()}
                  disabled={phase !== "live"}
                  className={btnPrimary}
                >
                  <Camera className="h-4 w-4" />
                  Capture
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function cameraError(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "The browser blocked the camera. Allow camera access for this site and try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera found on this device.";
  }
  if (name === "NotReadableError") {
    return "The camera is already in use by another app.";
  }
  return "Couldn't open the camera.";
}
