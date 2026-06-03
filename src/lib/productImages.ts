export const LEGACY_PRODUCT_IMAGE_FALLBACKS = [
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=600',
];

export function isRealProductImage(image?: string | null) {
  const value = image?.trim();
  return Boolean(value && !LEGACY_PRODUCT_IMAGE_FALLBACKS.includes(value));
}

export function getRealProductImages(images?: string[], image?: string | null) {
  const candidates = images?.length ? images : (image ? [image] : []);
  return candidates.filter(isRealProductImage);
}
