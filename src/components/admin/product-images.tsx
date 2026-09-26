import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { CameraCapture, cameraSupported } from "@/components/admin/camera-capture";
import { Panel, btnSecondary } from "@/components/admin/ui";
import { readableError } from "@/lib/supabase";
import {
  addProductImages,
  deleteProductImage,
  reorderProductImages,
  type ProductImage,
} from "@/services/productService";
import { validateImageFile } from "@/services/storageService";

// Formats the browser and validateImageFile() both accept. Listing them
// instead of image/* is deliberate: because HEIC is not on the list, an
// iPhone converts a Photos pick to JPEG on the way out instead of handing
// over a .heic file the shop can't display.
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

// Upload / order / delete product photos (Supabase Storage + product_images).
export function ProductImagesManager({
  productId,
  images,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const queryClient = useQueryClient();
  const galleryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Decided after mount, because it reads from `navigator` and the shell is
  // pre-rendered. When getUserMedia is there (every current browser on
  // https) the camera opens inside the page; otherwise fall back to the
  // capture input, which at least gets the camera on a phone.
  const [useLiveCamera, setUseLiveCamera] = useState(false);
  useEffect(() => setUseLiveCamera(cameraSupported()), []);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const upload = async (picked: FileList | File[] | null) => {
    const files = Array.from(picked ?? []);
    if (files.length === 0) return;
    const problems = files.map(validateImageFile).filter(Boolean);
    if (problems.length) {
      problems.forEach((p) => toast.error(p));
      return;
    }
    setBusy("upload");
    try {
      await addProductImages(productId, files, images.length);
      toast.success(files.length === 1 ? "Image uploaded" : `${files.length} images uploaded`);
      refresh();
    } catch (err) {
      toast.error(readableError(err, "Upload failed."));
    } finally {
      setBusy(null);
      // Clear both, so picking the same file again still fires onChange.
      if (galleryInput.current) galleryInput.current.value = "";
      if (cameraInput.current) cameraInput.current.value = "";
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...images];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setBusy("order");
    try {
      await reorderProductImages(next);
      refresh();
    } catch (err) {
      toast.error(readableError(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (image: ProductImage) => {
    setBusy(image.id);
    try {
      await deleteProductImage(image);
      toast.success("Image deleted");
      refresh();
    } catch (err) {
      toast.error(readableError(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel title="Photos">
      <p className="-mt-2 mb-4 text-xs text-muted-foreground">
        Pick photos from the gallery or take one with the camera. JPG, PNG, WebP, AVIF or GIF. Large
        photos are shrunk automatically. The first photo is the main image.
      </p>
      {images.length > 0 && (
        <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <li
              key={img.id}
              className="overflow-hidden rounded-xl border border-border bg-secondary/30"
            >
              <div className="relative aspect-square">
                <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                    Main
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between p-1.5">
                <div className="flex">
                  <IconBtn
                    label="Move earlier"
                    disabled={i === 0 || busy !== null}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn
                    label="Move later"
                    disabled={i === images.length - 1 || busy !== null}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </IconBtn>
                </div>
                <IconBtn
                  label="Delete image"
                  danger
                  disabled={busy !== null}
                  onClick={() => remove(img)}
                >
                  {busy === img.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </IconBtn>
              </div>
            </li>
          ))}
        </ul>
      )}
      {/* Pick from the gallery: several at once. */}
      <input
        ref={galleryInput}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => void upload(e.target.files)}
      />
      {/* capture="environment" opens the rear camera straight away instead of
          the file browser. One shot at a time, so no `multiple` here. */}
      <input
        ref={cameraInput}
        type="file"
        accept={ACCEPT}
        capture="environment"
        hidden
        onChange={(e) => void upload(e.target.files)}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => galleryInput.current?.click()}
          disabled={busy !== null}
          className={btnSecondary}
        >
          {busy === "upload" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {busy === "upload" ? "Uploading…" : "Choose from gallery"}
        </button>
        {useLiveCamera ? (
          <CameraCapture disabled={busy !== null} onCapture={(file) => void upload([file])} />
        ) : (
          <button
            type="button"
            onClick={() => cameraInput.current?.click()}
            disabled={busy !== null}
            className={btnSecondary}
          >
            <Camera className="h-4 w-4" />
            Take a photo
          </button>
        )}
      </div>
    </Panel>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-md disabled:opacity-30 ${
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
