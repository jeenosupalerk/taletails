/**
 * ครอบ/หมุนรูปในเบราว์เซอร์ แล้วคืนเป็นไฟล์ JPEG
 * pixelCrop มาจาก react-easy-crop (onCropComplete → croppedAreaPixels)
 * ซึ่งอ้างอิงกับรูปหลังหมุนแล้ว
 */

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_EDGE = 1800;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("เปิดรูปนี้ไม่ได้"));
    img.src = src;
  });
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/** ขนาดกรอบใหม่หลังหมุนรูป */
function rotatedSize(width: number, height: number, rotation: number) {
  const r = rad(rotation);
  return {
    width: Math.abs(Math.cos(r) * width) + Math.abs(Math.sin(r) * height),
    height: Math.abs(Math.sin(r) * width) + Math.abs(Math.cos(r) * height),
  };
}

export async function cropImageToFile(
  src: string,
  pixelCrop: PixelCrop,
  rotation: number,
  fileName: string,
): Promise<File> {
  const image = await loadImage(src);
  const bBox = rotatedSize(image.naturalWidth, image.naturalHeight, rotation);

  // วาดตรงลง canvas ผลลัพธ์ (ย่อไม่เกิน MAX_EDGE) — ไม่สร้าง canvas เต็มขนาดรูป
  // เพราะ iOS Safari จำกัดขนาด canvas ~16.7 ล้านพิกเซล รูป 24MP จะได้ภาพว่าง
  const scale = Math.min(1, MAX_EDGE / Math.max(pixelCrop.width, pixelCrop.height));
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(pixelCrop.width * scale));
  out.height = Math.max(1, Math.round(pixelCrop.height * scale));
  const octx = out.getContext("2d");
  if (!octx) throw new Error("เบราว์เซอร์ไม่รองรับการครอบรูป");
  octx.fillStyle = "#fff"; // PNG พื้นใสจะไม่กลายเป็นสีดำเมื่อบันทึกเป็น JPEG
  octx.fillRect(0, 0, out.width, out.height);
  octx.imageSmoothingQuality = "high";
  const s = out.width / pixelCrop.width;
  octx.scale(s, s);
  octx.translate(-pixelCrop.x, -pixelCrop.y);
  octx.translate(bBox.width / 2, bBox.height / 2);
  octx.rotate(rad(rotation));
  octx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("บันทึกรูปที่ครอบไม่สำเร็จ");
  const name = fileName.replace(/\.[^.]+$/, "") + "-crop.jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

/** อ่านสัดส่วนรูปต้นฉบับ (กว้าง/สูง) */
export async function imageAspect(src: string): Promise<number> {
  const img = await loadImage(src);
  return img.naturalWidth / Math.max(1, img.naturalHeight);
}
