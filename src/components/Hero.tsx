import { ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Company } from '../types';

interface HeroProps {
  user: any;
  activeCompany?: Company | null;
  settings?: {
    heroTitle: string;
    heroSubtitle: string;
    heroBadgeText?: string;
    heroImage: string;
    heroBgType?: 'image' | 'solid' | 'gradient';
    heroBgColor?: string;
    heroTextColor?: 'light' | 'dark';
  };
}

export default function Hero({ user, activeCompany, settings }: HeroProps) {
  const firstName = user?.displayName ? user.displayName.trim().split(' ')[0] : '';
  const greetingName = activeCompany?.name?.trim().split(" ")[0] || firstName;
  
  const heroImage = settings?.heroImage?.trim() || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2000";
  const heroTitle = settings?.heroTitle?.trim() || "Calidad y Tradición Hecha a Mano.";
  const heroSubtitle = settings?.heroSubtitle?.trim() || "Descubre nuestra cuidada selección de café premium de especialidad y piezas de joyería artesanal única. Cultivados y creados con dedicación para deleitar tus sentidos.";
  const heroBadgeText = settings?.heroBadgeText?.trim() || (greetingName ? `¡Hola, ${firstName}! Nos alegra tenerte aquí` : '');
  
  // Default to image if unspecified so that existing user backgrounds are not lost.
  const bgType = settings?.heroBgType || 'image';
  const bgColor = settings?.heroBgColor || '#1c1917';
  const isLightText = settings?.heroTextColor !== 'dark';

  return (
    <section
      id="inicio"
      className="relative h-screen flex items-center overflow-hidden animate-in fade-in duration-700"
      style={bgType !== 'image' ? { background: bgColor } : undefined}
    >
      {/* Background Image with Overlay */}
      {bgType === 'image' && (
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Artisan workspace cover background"
            className="w-full h-full object-cover transition-all duration-1000 scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-900/90 via-stone-900/70 to-stone-900/30" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl"
        >
          {heroBadgeText && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 ${
                isLightText 
                  ? 'bg-white/15 backdrop-blur-md border border-white/20 text-stone-100' 
                  : 'bg-stone-900/10 border border-stone-100/30 text-stone-800'
              }`}
            >
              <Sparkles size={14} className="text-accent animate-pulse" />
              <span className="text-xs sm:text-sm font-medium tracking-wide">{heroBadgeText}</span>
            </motion.div>
          )}
          
          <h1 className={`text-4xl sm:text-5xl md:text-7xl font-serif font-bold leading-tight mb-6 tracking-tight ${
            isLightText ? 'text-white' : 'text-stone-900'
          }`}>
            {heroTitle}
          </h1>
          
          <p className={`text-base sm:text-lg md:text-xl mb-10 leading-relaxed max-w-lg ${
            isLightText ? 'text-stone-200' : 'text-stone-600'
          }`}>
            {heroSubtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <a
              href="#productos"
              className={`inline-flex items-center justify-center space-x-2 px-8 py-4 rounded-full font-bold transition-all duration-300 shadow-lg group text-sm sm:text-base ${
                isLightText 
                  ? 'bg-white text-stone-900 hover:bg-accent hover:text-white' 
                  : 'bg-stone-900 text-white hover:bg-stone-800'
              }`}
            >
              <span>Ver Productos</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#nosotros"
              className={`inline-flex items-center justify-center px-8 py-4 rounded-full font-bold border transition-all duration-300 text-sm sm:text-base ${
                isLightText
                  ? 'text-white border-white/30 hover:bg-white/10'
                  : 'text-stone-900 border-stone-900/30 hover:bg-stone-900/5'
              }`}
            >
              Nuestra Historia
            </a>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-10 hidden sm:block ${
          isLightText ? 'text-white/50' : 'text-stone-900/40'
        }`}
      >
        <div className={`w-6 h-10 border-2 rounded-full flex justify-center p-1 ${
          isLightText ? 'border-white/30' : 'border-stone-900/20'
        }`}>
          <div className={`w-1 h-2 rounded-full ${isLightText ? 'bg-white' : 'bg-stone-900'}`} />
        </div>
      </motion.div>
    </section>
  );
}
