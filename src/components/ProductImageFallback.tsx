import { ImageOff } from 'lucide-react';

interface ProductImageFallbackProps {
  label?: string;
  compact?: boolean;
  className?: string;
}

export default function ProductImageFallback({ label = 'Sin imagen', compact = false, className = '' }: ProductImageFallbackProps) {
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center bg-stone-100 text-stone-400 ${className}`}>
      <ImageOff size={compact ? 16 : 34} className="mb-1" />
      {!compact && <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>}
    </div>
  );
}
