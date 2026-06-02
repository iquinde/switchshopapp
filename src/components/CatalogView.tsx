import React from 'react';
import Hero from './Hero';
import ProductCard from './ProductCard';
import { Product, Company } from '../types';
import { Search, X, Grid2X2, Grid3X3, Instagram, Facebook, Twitter, Mail, Phone, MapPin, Sparkles } from 'lucide-react';
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
  onClearActiveCompany?: () => void;
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
  activeCompany,
  onClearActiveCompany
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

  return (
    <main>
      <Hero user={user} settings={settings} />

      <section id="productos" className="scroll-mt-24 py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          {activeCompany && (
            <div className="mb-8 inline-flex items-center gap-3 bg-stone-50 border border-stone-200/60 text-stone-850 px-4 py-2.5 rounded-2xl shadow-sm text-xs sm:text-sm animate-in fade-in duration-300">
              <span className="font-bold">🏪 Tienda de <strong className="text-[#8b5a2b] font-serif font-bold text-sm tracking-tight">{activeCompany.storeName}</strong></span>
              {onClearActiveCompany && (
                <button 
                  onClick={onClearActiveCompany}
                  className="ml-2 font-bold text-stone-500 hover:text-stone-900 bg-white hover:bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200 transition-colors uppercase tracking-wider text-[10px]"
                >
                  Volver al Directorio
                </button>
              )}
            </div>
          )}

          <h2 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 mb-4">Nuestros Productos</h2>
          <p className="text-stone-500 max-w-2xl mx-auto">
            Cada producto es seleccionado o creado con dedicación, garantizando la calidez de lo tradicional y la máxima calidad.
          </p>


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

      {/* Features & Footer */}
      <section id="nosotros" className="scroll-mt-24 bg-stone-900 py-24 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            {/* Item 1 */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0 }}>
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6"><Sparkles className="text-accent" size={32} /></div>
              <h3 className="text-xl font-serif font-bold mb-2">Origen de Origen</h3>
              <p className="text-stone-400">Seleccionado directo de productores.</p>
            </motion.div>

            {/* Item 2 */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6"><MapPin className="text-accent" size={32} /></div>
              <h3 className="text-xl font-serif font-bold mb-2">Envío Nacional</h3>
              <p className="text-stone-400">Llegamos a todo el país.</p>
            </motion.div>

            {/* Item 3 */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}>
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6"><Phone className="text-accent" size={32} /></div>
              <h3 className="text-xl font-serif font-bold mb-3">Soporte y Contacto</h3>
              <div className="space-y-1.5 flex flex-col items-center justify-center text-sm">
                {settings?.supportPhone ? (
                  <a href={`tel:${settings.supportPhone}`} className="hover:text-primary transition-colors hover:underline text-stone-200">
                    <span className="text-[10px] text-stone-500 font-bold uppercase mr-1 font-mono">TEL:</span>{settings.supportPhone}
                  </a>
                ) : (
                  <span className="text-stone-400">Dudas sobre tu pedido.</span>
                )}
                {settings?.supportEmail && (
                  <a href={`mailto:${settings.supportEmail}`} className="hover:text-primary transition-colors hover:underline text-stone-300 text-xs">
                    <span className="text-[10px] text-stone-500 font-bold uppercase mr-1 font-mono">CORREO:</span>{settings.supportEmail}
                  </a>
                )}
                {settings?.whatsappNumber && (
                  <a 
                    href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-350 transition-colors hover:underline"
                  >
                    <span>💬 WhatsApp Activo</span>
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <footer id="contacto" className="scroll-mt-24 bg-white border-t border-stone-100 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-stone-400 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 text-left">
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-stone-900">{displayStoreName}<span className="text-primary">.</span></h2>
              <p className="text-stone-500 text-xs sm:text-sm leading-relaxed">{displayFooterText}</p>
              <div className="flex items-center gap-3 text-stone-400 pt-2">
                <a href="#" className="hover:text-primary transition-colors hover:scale-105 transform duration-200"><Instagram size={18} /></a>
                <a href="#" className="hover:text-primary transition-colors hover:scale-105 transform duration-200"><Facebook size={18} /></a>
                <a href="#" className="hover:text-primary transition-colors hover:scale-105 transform duration-200"><Twitter size={18} /></a>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-950 mb-6 font-serif">Secciones</h3>
              <ul className="space-y-3 text-xs sm:text-sm text-stone-500">
                <li><button onClick={() => { setActiveCategory('Todos'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-primary hover:underline transition-colors">Todos los Productos</button></li>
                <li><button onClick={() => { setActiveCategory('café'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-primary hover:underline transition-colors">Café de Especialidad</button></li>
                <li><button onClick={() => { setActiveCategory('joyas'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-primary hover:underline transition-colors">Pulseras & Accesorios</button></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-950 mb-6 font-serif">Soporte y Contacto</h3>
              <ul className="space-y-4 text-xs sm:text-sm text-stone-500">
                {settings?.supportPhone && (
                  <li className="flex items-start gap-2.5">
                    <Phone size={15} className="text-stone-400 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest leading-none mb-0.5">Llámanos</span>
                      <a href={`tel:${settings.supportPhone}`} className="hover:text-primary transition-colors font-medium text-stone-850">{settings.supportPhone}</a>
                    </div>
                  </li>
                )}
                {settings?.supportEmail && (
                  <li className="flex items-start gap-2.5">
                    <Mail size={15} className="text-stone-400 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest leading-none mb-0.5">Escríbenos</span>
                      <a href={`mailto:${settings.supportEmail}`} className="hover:text-primary transition-colors font-medium text-stone-850 break-all">{settings.supportEmail}</a>
                    </div>
                  </li>
                )}
                {settings?.whatsappNumber && (
                  <li className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 text-xs">●</span>
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest leading-none">WhatsApp Activo</span>
                    </div>
                    <a 
                      href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="hover:bg-emerald-600 bg-emerald-500 text-white transition-all text-xs font-bold py-2 px-3 rounded-lg inline-flex items-center gap-1.5 shadow-sm w-max hover:scale-[1.02] duration-200"
                    >
                      <span className="text-sm font-bold">💬</span>
                      <span>Chatear por WhatsApp</span>
                    </a>
                  </li>
                )}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-950 mb-6 font-serif">Atención y Envíos</h3>
              <div className="space-y-4 text-xs sm:text-sm text-stone-500">
                <div className="flex items-start gap-2.5">
                  <MapPin size={15} className="text-stone-400 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest leading-none mb-1">Envíos</span>
                    <span className="text-stone-700">Cobertura Nacional y despachos en menos de 24 horas laborables.</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest leading-none block mb-1">Horarios</span>
                  <span className="text-stone-700 font-medium">Lunes a Sábado: 08:30 AM - 07:00 PM</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-stone-100 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-stone-400 text-xs text-center sm:text-left">
            <p>© 2026 {displayStoreName}. Todos los derechos reservados.</p>
            <p className="text-[11px] text-stone-300">Desarrollado con alma artesanal y tecnología de vanguardia.</p>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default CatalogView;
