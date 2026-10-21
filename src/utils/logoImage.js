// Logo file ne PNG data URL ma convert kare chhe (max 400px width) -> dompdf ma badha format (webp/svg) ane
// moti file ni problem na aave. Convert na thay to original data URL return kare chhe.
const MAX_W = 400;

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export async function fileToLogoDataUrl(file) {
  const original = await readAsDataUrl(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = original;
    });
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    if (!w0 || !h0) return original; // svg jene size nathi
    const scale = Math.min(1, MAX_W / w0);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w0 * scale);
    canvas.height = Math.round(h0 * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return original;
  }
}
