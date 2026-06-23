import React from 'react';
import { Product, Company } from "../types";
import { ShoppingCart, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import ProductImageFallback from './ProductImageFallback';
import { isRealProductImage } from '../lib/productImages';

export interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onClick: (product: Product) => void;
  isCompact?: boolean;
  companies?: Company[];
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, onClick, isCompact, companies = [] }) => {
  const vendor = product.companyId ? companies.find(c => c.id === product.companyId) : null;
  const vendorName = vendor ? vendor.storeName : (product.companyId === 'comp-default' ? 'Matriz' : null);
  const hasImage = isRealProductImage(product.image);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onClick={() => onClick(product)}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col cursor-pointer"
    >
      <div className="aspect-square overflow-hidden bg-stone-100 relative">
        {hasImage ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <ProductImageFallback />
        )}
        <button 
          onClick={(e) => e.stopPropagation()}
          className={`absolute ${isCompact ? 'top-2 right-2 p-1.5' : 'top-4 right-4 p-2'} bg-white/80 backdrop-blur-sm rounded-full text-stone-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100`}
        >
          <Heart size={isCompact ? 14 : 18} />
        </button>
      </div>
      
      <div className={`${isCompact ? 'p-3 sm:p-5' : 'p-5'} flex flex-col flex-1`}>
        <div className={`${isCompact ? 'flex flex-col sm:flex-row sm:justify-between sm:items-start' : 'flex justify-between items-start'} mb-4`}>
          <div className="min-w-0 flex-1">
            <span className={`${isCompact ? 'text-[9px] sm:text-[10px]' : 'text-[10px]'} uppercase tracking-widest text-stone-400 font-bold mb-1 block truncate`}>
              {product.category} {vendorName ? `• ${vendorName}` : ''}
            </span>
            <h3 className={`${isCompact ? 'text-[13px] sm:text-lg leading-snug sm:leading-tight sm:font-serif' : 'text-sm sm:text-lg font-serif'} font-bold text-stone-900 group-hover:text-primary transition-colors line-clamp-2`}>
              {product.name}
            </h3>
          </div>
          <p className={`${isCompact ? 'text-sm sm:text-lg mt-1 sm:mt-0 sm:ml-2' : 'text-lg ml-2'} font-bold text-stone-900`}>
            ${product.price.toFixed(2)}
          </p>
        </div>
        
        <div className="mt-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className={`w-full flex items-center justify-center space-x-2 bg-stone-900 text-white ${isCompact ? 'py-2.5 px-2 sm:py-3' : 'py-3'} rounded-xl hover:bg-primary transition-colors duration-300`}
          >
            <ShoppingCart size={isCompact ? 16 : 18} />
            {isCompact ? (
              <span className="font-semibold text-xs sm:text-sm">Agregar</span>
            ) : (
              <span className="font-medium text-sm">Añadir al Carrito</span>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
