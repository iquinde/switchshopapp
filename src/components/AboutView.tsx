import { ArrowRight, Mail, Phone } from 'lucide-react';
import { motion } from 'motion/react';
import { Company, StoreSettings } from '../types';

interface AboutViewProps {
  settings?: StoreSettings;
  activeCompany?: Company | null;
  storeBasePath?: string;
}

const DEFAULT_ABOUT_CONTENT = {
  aboutTitle: 'Nuestra Historia',
  aboutImage: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&q=80&w=1600',
  aboutSections: [
    {
      title: 'Nuestra esencia',
      paragraph: 'SwitchShop es la tienda de los verdaderos artesanos ecuatorianos, de los mas capaces y autenticos. Representa lo mejor que sabemos hacer en Ecuador desde hace muchas generaciones.'
    },
    {
      title: 'Nuestro nombre',
      paragraph: 'El nombre de nuestra marca nace de una palabra local que habla de identidad. Para nosotros esa identidad es una filosofia de vida y lo que defendemos: nuestra identidad.'
    },
    {
      title: 'Disenos creativos y funcionales',
      paragraph: 'Creamos productos propios combinando materiales naturales, texturas y colores de alta calidad, durabilidad y funcionalidad.'
    }
  ]
};

const getAboutSections = (settings?: StoreSettings) => {
  const savedSections = settings?.aboutSections
    ?.map(section => ({
      title: section.title?.trim() || 'Titulo',
      paragraph: section.paragraph?.trim() || 'Parrafo'
    }))
    .filter(section => section.title || section.paragraph)
    .slice(0, 5);

  if (savedSections?.length) {
    return savedSections;
  }

  const hasLegacyContent = Boolean(
    settings?.aboutIntroParagraphOne ||
    settings?.aboutIntroParagraphTwo ||
    settings?.aboutNameTitle ||
    settings?.aboutNameParagraph ||
    settings?.aboutDesignTitle ||
    settings?.aboutDesignParagraph
  );

  const legacySections = hasLegacyContent ? [
    {
      title: 'Nuestra esencia',
      paragraph: [settings?.aboutIntroParagraphOne, settings?.aboutIntroParagraphTwo].filter(Boolean).join(' ')
    },
    {
      title: settings?.aboutNameTitle || 'Nuestro nombre',
      paragraph: settings?.aboutNameParagraph || ''
    },
    {
      title: settings?.aboutDesignTitle || 'Disenos creativos y funcionales',
      paragraph: settings?.aboutDesignParagraph || ''
    }
  ].filter(section => section.title || section.paragraph) : [];

  return legacySections.length ? legacySections.slice(0, 5) : DEFAULT_ABOUT_CONTENT.aboutSections;
};

export default function AboutView({ settings, activeCompany, storeBasePath = '' }: AboutViewProps) {
  const storeName = settings?.storeName || activeCompany?.storeName || 'SwitchShop';
  const aboutTitle = settings?.aboutTitle || DEFAULT_ABOUT_CONTENT.aboutTitle;
  const aboutImage = settings?.aboutImage || DEFAULT_ABOUT_CONTENT.aboutImage;
  const aboutSections = getAboutSections(settings);
  const productsHref = storeBasePath ? `${storeBasePath}/productos` : '#productos';
  const contactHref = storeBasePath ? `${storeBasePath}/contacto` : '#contacto';
  const handleInternalRouteClick = (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!storeBasePath) return;

    event.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <main className="min-h-screen bg-white pt-24">
      <section className="px-4 pb-20 pt-8 sm:px-6 sm:pb-24 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          {aboutImage && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="mb-12 overflow-hidden rounded-2xl bg-stone-100 shadow-sm"
            >
              <img
                src={aboutImage}
                alt={aboutTitle}
                className="h-full max-h-[460px] w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="mx-auto max-w-4xl"
          >
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-stone-400">{storeName}</p>
            <h1 className="mb-8 text-4xl font-serif font-bold text-stone-950 md:text-5xl">{aboutTitle}</h1>

            <div className="mt-10 space-y-10">
              {aboutSections.map((section, index) => (
                <section key={`${section.title}-${index}`} className="space-y-5">
                  <h2 className="text-2xl font-bold text-stone-950">{section.title}</h2>
                  <p className="mx-auto max-w-3xl text-base leading-8 text-stone-400 sm:text-lg sm:leading-9">
                    {section.paragraph}
                  </p>
                </section>
              ))}
            </div>

            <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={productsHref}
                onClick={handleInternalRouteClick(productsHref)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-7 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-primary"
              >
                <span>Ver productos</span>
                <ArrowRight size={17} />
              </a>
              <a
                href={contactHref}
                onClick={handleInternalRouteClick(contactHref)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 px-7 py-3 text-sm font-bold text-stone-700 transition-colors hover:border-primary hover:text-primary"
              >
                <Mail size={16} />
                <span>Contacto</span>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <footer id="contacto" className="border-t border-stone-100 bg-stone-950 px-4 py-10 text-center text-white sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-4 text-sm text-stone-300 sm:flex-row sm:justify-between">
          <p className="font-serif text-xl font-bold text-white">{storeName}<span className="text-primary">.</span></p>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-5">
            {settings?.supportPhone && <span className="inline-flex items-center gap-2"><Phone size={15} />{settings.supportPhone}</span>}
            {settings?.supportEmail && <span className="inline-flex items-center gap-2 break-all"><Mail size={15} />{settings.supportEmail}</span>}
          </div>
        </div>
      </footer>
    </main>
  );
}
