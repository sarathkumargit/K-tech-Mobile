import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Panel, btnSecondary } from "@/components/admin/ui";
import { readableError } from "@/lib/supabase";
import {
  addProductImages,
  deleteProductImage,
  reorderProductImages,
  type ProductImage,
} from "@/services/productService";
import { validateImageFile } from "@/services/storageService";

// Upload / order / delete product photos (Supabase Storage + product_images).
export function ProductImagesManager({
  productId,
  images,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const upload = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
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
      if (input.current) input.current.value = "";
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
        JPG, PNG, WebP, AVIF or GIF, up to 5 MB each. The first photo is the main image.
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
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple
        hidden
        onChange={(e) => void upload(e.target.files)}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy !== null}
        className={btnSecondary}
      >
        {busy === "upload" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        {busy === "upload" ? "Uploading…" : "Upload photos"}
      </button>
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
