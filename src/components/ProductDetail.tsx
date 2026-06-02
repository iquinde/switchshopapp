import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types';

interface ProductDetailProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductDetail({ product, onClose, onAddToCart }: ProductDetailProps) {
  const images = product.images || [product.image];
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image Gallery */}
        <div className="relative w-full md:w-1/2 bg-stone-100 aspect-square md:aspect-auto">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImageIndex}
              src={images[currentImageIndex]}
              alt={product.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>

          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm rounded-full text-stone-900 hover:bg-white transition-all shadow-lg"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm rounded-full text-stone-900 hover:bg-white transition-all shadow-lg"
              >
                <ChevronRight size={24} />
              </button>
              
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentImageIndex ? 'bg-stone-900 w-4' : 'bg-stone-400'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
          
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 bg-white/80 backdrop-blur-sm rounded-full text-stone-900 md:hidden shadow-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col overflow-y-auto">
          <div className="hidden md:flex justify-end mb-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="mb-8">
            <span className="text-xs uppercase tracking-[0.2em] text-primary font-bold mb-2 block">
              {product.category}
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mb-4 leading-tight">
              {product.name}
            </h2>
            <p className="text-2xl font-bold text-stone-900 mb-6">
              ${product.price.toFixed(2)}
            </p>
            <div className="h-px bg-stone-100 w-full mb-8" />
            <div className="prose prose-stone">
              <h4 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Descripción</h4>
              <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          </div>

          <div className="mt-auto pt-8">
            <button
              onClick={() => {
                onAddToCart(product);
                onClose();
              }}
              className="w-full flex items-center justify-center space-x-3 bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-primary transition-all duration-300 shadow-xl shadow-stone-900/10 hover:shadow-primary/20 active:scale-[0.98]"
            >
              <ShoppingCart size={20} />
              <span>Añadir al Carrito</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
