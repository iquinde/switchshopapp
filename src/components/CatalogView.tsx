import React from 'react';
import Hero from './Hero';
import ProductCard from './ProductCard';
import { Product, Company } from '../types';
import { Search, X, Grid2X2, Grid3X3, Instagram, Facebook, Twitter, Mail, Phone, MapPin, Sparkles, Music2 } from 'lucide-react';
import { motion } from 'motion/react';

interface CatalogViewProps {
  products: Product[];
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  mobileCols: 2 | 3;
  setMobileCols: (cols: 2 | 3) => void;
  onAddToCart: (p: Product) => void;
  onProductClick: (p: Product) => void;
  user: any;
  settings?: any;
  companies?: Company[];
  activeCompany?: Company | null;
}

const CatalogView: React.FC<CatalogViewProps> = ({
  products,
  activeCategory,
  setActiveCategory,
  searchTerm,
  setSearchTerm,
  mobileCols,
  setMobileCols,
  onAddToCart,
  onProductClick,
  user,
  settings,
  companies = [],
  activeCompany
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>('all');

  // Derive categories dynamically from existing products to support both Coffee and Bracelets sellers seamlessly
  const categories = React.useMemo(() => {
    const rawCategories = products
      .map(p => p.category?.trim().toLowerCase())
      .filter(Boolean);
    return ['todos', ...Array.from(new Set(rawCategories))];
  }, [products]);
  
  const filteredProducts = products.filter(p => {
    // If activeCompany is active, products are already filtered by companyId in App TS sync logic.
    // If NOT in activeCompany mode, respect the selected filter button.
    if (activeCompany) {
      const matchesCategory = activeCategory === 'todos' || p.category?.trim().toLowerCase() === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch && (p.status === 'active' || !p.status);
    }

    const matchesCompany = selectedCompanyId === 'all' 
      ? true 
      : (p.companyId === selectedCompanyId);
    const matchesCategory = activeCategory === 'todos' || p.category?.trim().toLowerCase() === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCompany && matchesCategory && matchesSearch && (p.status === 'active' || !p.status);
  });

  const displayStoreName = settings?.storeName || 'SwitchShop';
  const displayFooterText = settings?.footerText || 'Productos seleccionados con alma, sabor y tradición.';
  const displayProductTitle = settings?.productSectionTitle || 'Nuestros Productos';
  const displayProductDescription = settings?.productSectionDescription || 'Cada producto es seleccionado o creado con dedicación, garantizando la calidez de lo tradicional y la máxima calidad.';
  const socialLinks = settings?.socialLinks || {};
  const socialItems = [
    { key: 'instagram', label: 'Instagram', icon: Instagram, config: socialLinks.instagram },
    { key: 'facebook', label: 'Facebook', icon: Facebook, config: socialLinks.facebook },
    { key: 'tiktok', label: 'TikTok', icon: Music2, config: socialLinks.tiktok },
    { key: 'twitter', label: 'X / Twitter', icon: Twitter, config: socialLinks.twitter }
  ].filter(item => item.config?.enabled && item.config?.url?.trim());

  return (
    <main>
      <Hero user={user} activeCompany={activeCompany} settings={settings} />

      <section id="productos" className="scroll-mt-24 py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">

          <h2 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 mb-4">{displayProductTitle}</h2>
          <p className="text-stone-500 max-w-2xl mx-auto">{displayProductDescription}</p>


        </div>

        <div className="flex flex-col items-center gap-8 mb-12">
          <div className="relative w-full max-w-md group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-stone-400 group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Buscar productos o café..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-stone-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 capitalize ${
                  activeCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white text-stone-600 hover:bg-stone-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex md:hidden items-center bg-white p-1 rounded-xl shadow-sm border border-stone-100">
            <button onClick={() => setMobileCols(2)} className={`p-2 rounded-lg transition-all ${mobileCols === 2 ? 'bg-stone-900 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}>
              <Grid2X2 size={20} />
            </button>
            <button onClick={() => setMobileCols(3)} className={`p-2 rounded-lg transition-all ${mobileCols === 3 ? 'bg-stone-900 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}>
              <Grid3X3 size={20} />
            </button>
          </div>
        </div>

        {filteredProducts.length > 0 ? (
          <div className={`grid ${mobileCols === 2 ? 'grid-cols-2' : 'grid-cols-3'} sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-8`}>
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} onClick={onProductClick} isCompact={mobileCols >= 2} companies={companies} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200">
            <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Search size={24} className="text-stone-300" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">No se encontraron productos</h3>
            <p className="text-stone-500">Intenta con otro término de búsqueda o categoría.</p>
            <button onClick={() => { setSearchTerm(''); setActiveCategory('todos'); }} className="mt-6 text-primary font-bold hover:underline">Ver todos los productos</button>
          </div>
        )}
      </section>

      <footer className="bg-stone-900 text-white">
        <section id="nosotros" className="scroll-mt-24 pt-20 pb-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 text-center">
            <motion.div className="flex flex-col items-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0 }}>
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                {settings?.logoImage && (
                  <div className="h-12 w-12 rounded-lg bg-white border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={settings.logoImage}
                      alt={`${displayStoreName} logo`}
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-5 flex flex-col items-center">
              <div className="flex items-center justify-center gap-3">
                <h2 className="text-2xl font-serif font-bold text-white">
                  {displayStoreName}<span className="text-primary">.</span>
                </h2>
              </div>
              <p className="max-w-sm mx-auto text-sm leading-relaxed text-stone-400">{displayFooterText}</p>
              {socialItems.length > 0 && (
                <div className="flex items-center justify-center gap-2 text-stone-400">
                  {socialItems.map(item => {
                    const Icon = item.icon;
                    const href = item.config.url.trim();
                    return (
                      <a
                        key={item.key}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={item.label}
                        className="h-9 w-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:border-primary hover:text-primary hover:bg-white/10 transition-colors"
                      >
                        <Icon size={17} />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
            </motion.div>

            <motion.div className="flex flex-col items-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <MapPin className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Envío Nacional</h3>
              <div className="space-y-4 text-sm max-w-sm mx-auto">
                <div className="flex flex-col items-center gap-2">
                  <MapPin size={16} className="text-stone-500 shrink-0" />
                  <div className="text-center">
                    <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest leading-none block mb-1">Envíos</span>
                    <p className="text-stone-300 leading-relaxed">Cobertura nacional y despachos en menos de 24 horas laborables.</p>
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest leading-none block mb-1">Horarios</span>
                  <p className="text-stone-300 font-medium">Lunes a Sábado: 08:30 AM - 07:00 PM</p>
                </div>
              </div>
            </motion.div>

            <motion.div className="flex flex-col items-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}>
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Phone className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Soporte directo</h3>
              <ul className="space-y-4 text-sm max-w-sm mx-auto">
                {settings?.supportPhone && (
                  <li className="flex flex-col items-center gap-2">
                    <Phone size={16} className="text-stone-500 shrink-0" />
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest leading-none mb-1">Llámanos</span>
                      <a href={`tel:${settings.supportPhone}`} className="hover:text-primary transition-colors font-medium text-stone-200">{settings.supportPhone}</a>
                    </div>
                  </li>
                )}
                {settings?.supportEmail && (
                  <li className="flex flex-col items-center gap-2">
                    <Mail size={16} className="text-stone-500 shrink-0" />
                    <div className="flex flex-col items-center min-w-0">
                      <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest leading-none mb-1">Escríbenos</span>
                      <a href={`mailto:${settings.supportEmail}`} className="hover:text-primary transition-colors font-medium text-stone-200 break-all text-center">{settings.supportEmail}</a>
                    </div>
                  </li>
                )}
                {settings?.whatsappNumber && (
                  <li className="pt-1">
                    <a
                      href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white transition-colors text-xs font-bold py-2.5 px-3 rounded-lg shadow-sm"
                    >
                      <span>WhatsApp Activo</span>
                    </a>
                  </li>
                )}
              </ul>
            </motion.div>
          </div>
          </div>
        </section>

        <div id="contacto" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7 pb-8 border-t border-white/10 text-stone-300">
          <div className="flex flex-col sm:flex-row justify-center sm:justify-between items-center gap-3 text-stone-500 text-xs text-center">
            <p>© 2026 {displayStoreName}. Todos los derechos reservados.</p>
            <p className="text-[11px] text-stone-600">Desarrollado con alma artesanal y tecnología de vanguardia.</p>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default CatalogView;
