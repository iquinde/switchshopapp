import React from 'react';
import { motion } from 'motion/react';
import { db, getDownloadURL, ref, storage, uploadBytes } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { StoreSettings } from '../types';
import { Save, Sparkles, RefreshCw, Layers, Check, Layout, AlertCircle, Palette, Image, CheckCircle2, Upload, X, ShoppingBag, Heart, Search, Grid2X2, ArrowRight, Mail, Phone, MapPin, Instagram, Facebook, Twitter, Music2, Pencil } from 'lucide-react';
import { getOfflineFallbackActive, offlineDb, setOfflineFallbackActive } from '../lib/offlineDb';

// Predefined professional color palettes for the catalog top background
interface ColorPalette {
  id: string;
  name: string;
  type: 'solid' | 'gradient';
  value: string;
  textColor: 'light' | 'dark';
}

const PRESET_PALETTES: ColorPalette[] = [
  { id: 'obsidian', name: 'Obsidiana Elegante', type: 'solid', value: '#1c1917', textColor: 'light' },
  { id: 'mocha', name: 'Mocha Caliente', type: 'solid', value: '#2b1509', textColor: 'light' },
  { id: 'terracotta', name: 'Terracota Rustica', type: 'solid', value: '#7c2d12', textColor: 'light' },
  { id: 'sage', name: 'Bosque y Menta', type: 'solid', value: '#1a2d24', textColor: 'light' },
  { id: 'teal', name: 'Bruma Marina', type: 'solid', value: '#111e25', textColor: 'light' },
  { id: 'burgundy', name: 'Vino Artesanal', type: 'solid', value: '#450a0a', textColor: 'light' },
  { id: 'violet', name: 'Esencia Amatista', type: 'solid', value: '#23153c', textColor: 'light' },
  { id: 'sunset', name: 'Atardecer Dorado', type: 'gradient', value: 'linear-gradient(135deg, #78350f 0%, #1a0b02 100%)', textColor: 'light' },
  { id: 'cozy-dusk', name: 'Anochecer Cálido', type: 'gradient', value: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)', textColor: 'light' },
  { id: 'latte', name: 'Crema Capuchino', type: 'solid', value: '#f5f2eb', textColor: 'dark' },
  { id: 'mustard', name: 'Miel de Abeja', type: 'solid', value: '#eab308', textColor: 'dark' },
  { id: 'minimal-light', name: 'Lino Minimalista', type: 'solid', value: '#f5f5f4', textColor: 'dark' },
];

interface SettingsManagerProps {
  companyId?: string;
}

const DEFAULT_SOCIAL_LINKS: NonNullable<StoreSettings['socialLinks']> = {
  instagram: { enabled: false, url: '' },
  facebook: { enabled: false, url: '' },
  tiktok: { enabled: false, url: '' },
  twitter: { enabled: false, url: '' }
};

const normalizeSocialLinks = (links?: StoreSettings['socialLinks']) => ({
  instagram: { ...DEFAULT_SOCIAL_LINKS.instagram, ...(links?.instagram || {}) },
  facebook: { ...DEFAULT_SOCIAL_LINKS.facebook, ...(links?.facebook || {}) },
  tiktok: { ...DEFAULT_SOCIAL_LINKS.tiktok, ...(links?.tiktok || {}) },
  twitter: { ...DEFAULT_SOCIAL_LINKS.twitter, ...(links?.twitter || {}) }
});

export default function SettingsManager({ companyId }: SettingsManagerProps) {
  const settingsDocId = companyId || 'store';

  const [settings, setSettings] = React.useState<StoreSettings>({
    storeName: 'SwitchShop',
    heroTitle: 'Calidad y Tradición Hecha a Mano.',
    heroSubtitle: 'Descubre nuestra cuidada selección de café premium de especialidad y piezas de joyería artesanal única. Cultivados y creados con dedicación para deleitar tus sentidos.',
    heroBadgeText: 'Bienvenido a la tienda',
    productSectionTitle: 'Nuestros Productos',
    productSectionDescription: 'Cada producto es seleccionado o creado con dedicaci�n, garantizando la calidez de lo tradicional y la m�xima calidad.',
    heroImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2000',
    logoImage: '',
    footerText: 'Productos seleccionados con alma, sabor y tradición.',
    socialLinks: DEFAULT_SOCIAL_LINKS,
    heroBgType: 'image',
    heroBgColor: '#1c1917',
    heroTextColor: 'light',
    stockAlertPercentage: 20,
    supportPhone: '+593 99 999 9999',
    supportEmail: 'soporte@switchshop.com',
    whatsappNumber: '+593 99 999 9999'
  });

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [logoUploadError, setLogoUploadError] = React.useState('');
  const [pendingLogoFile, setPendingLogoFile] = React.useState<File | null>(null);
  const [pendingLogoPreview, setPendingLogoPreview] = React.useState('');
  const [isHeroBackgroundEditorOpen, setIsHeroBackgroundEditorOpen] = React.useState(false);

  // Load existing settings
  React.useEffect(() => {
    const fetchSettings = async () => {
      if (getOfflineFallbackActive()) {
        const local = offlineDb.getSettings();
        setSettings({
          ...local,
          heroBgType: local.heroBgType || 'solid',
          heroBgColor: local.heroBgColor || '#1c1917',
          heroTextColor: local.heroTextColor || 'light',
          stockAlertPercentage: local.stockAlertPercentage ?? 20,
          supportPhone: local.supportPhone || '+593 99 999 9999',
          supportEmail: local.supportEmail || 'soporte@switchshop.com',
          whatsappNumber: local.whatsappNumber || '+593 99 999 9999',
          logoImage: local.logoImage || '',
          socialLinks: normalizeSocialLinks(local.socialLinks)
        });
        setIsLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'settings', settingsDocId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as StoreSettings;
          setSettings({
            ...data,
            heroBgType: data.heroBgType || 'solid',
            heroBgColor: data.heroBgColor || '#1c1917',
            heroTextColor: data.heroTextColor || 'light',
            stockAlertPercentage: data.stockAlertPercentage ?? 20,
            supportPhone: data.supportPhone || '+593 99 999 9999',
            supportEmail: data.supportEmail || 'soporte@switchshop.com',
            whatsappNumber: data.whatsappNumber || '+593 99 999 9999',
            logoImage: data.logoImage || '',
            socialLinks: normalizeSocialLinks(data.socialLinks)
          });
        } else {
          const local = offlineDb.getSettings();
          setSettings({
            ...local,
            heroBgType: local.heroBgType || 'solid',
            heroBgColor: local.heroBgColor || '#1c1917',
            heroTextColor: local.heroTextColor || 'light',
            stockAlertPercentage: local.stockAlertPercentage ?? 20,
            supportPhone: local.supportPhone || '+593 99 999 9999',
            supportEmail: local.supportEmail || 'soporte@switchshop.com',
            whatsappNumber: local.whatsappNumber || '+593 99 999 9999',
            logoImage: local.logoImage || '',
            socialLinks: normalizeSocialLinks(local.socialLinks)
          });
        }
      } catch (err) {
        console.warn("Error loading cloud settings, falling back to local: ", err);
        setOfflineFallbackActive(true);
        const local = offlineDb.getSettings();
        setSettings({
          ...local,
          heroBgType: local.heroBgType || 'solid',
          heroBgColor: local.heroBgColor || '#1c1917',
          heroTextColor: local.heroTextColor || 'light',
          stockAlertPercentage: local.stockAlertPercentage ?? 20,
          supportPhone: local.supportPhone || '+593 99 999 9999',
          supportEmail: local.supportEmail || 'soporte@switchshop.com',
          whatsappNumber: local.whatsappNumber || '+593 99 999 9999',
          logoImage: local.logoImage || '',
          socialLinks: normalizeSocialLinks(local.socialLinks)
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [settingsDocId]);

  const handlePresetSelect = (presetType: 'coffee' | 'bracelets' | 'switchshop') => {
    if (presetType === 'coffee') {
      setSettings(prev => ({
        ...prev,
        storeName: 'Granos & Café',
        heroTitle: 'Aromas Únicos y Café de Especialidad Directo a tu Taza.',
        heroSubtitle: 'Disfruta del auténtico sabor del café de altura cultivado con pasión, secado al sol y tostado artesanalmente para consentir tus sentidos.',
        heroImage: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=2000',
        footerText: 'El sabor único de la pasión por el auténtico café artesano.',
        heroBgType: 'solid',
        heroBgColor: '#2b1509',
        heroTextColor: 'light'
      }));
    } else if (presetType === 'bracelets') {
      setSettings(prev => ({
        ...prev,
        storeName: 'Esencia Pulseras',
        heroTitle: 'Energía y Belleza Hecha a Mano con Piedras Naturales.',
        heroSubtitle: 'Diseños que cuentan historias. Creamos accesorios exclusivos y pulseras ajustables utilizando minerales auténticos, cuarzos y amatistas silvestres.',
        heroImage: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=2000',
        footerText: 'Accesorios creados para conectar con tu energía interior y elegancia.',
        heroBgType: 'solid',
        heroBgColor: '#23153c',
        heroTextColor: 'light'
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        storeName: 'SwitchShop',
        heroTitle: 'Calidad y Tradición Hecha a Mano.',
        heroSubtitle: 'Descubre nuestra cuidada selección de café premium de especialidad y piezas de joyería artesanal única. Cultivados y creados con dedicación para deleitar tus sentidos.',
        heroImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2000',
        footerText: 'Productos seleccionados con alma, sabor y tradición.',
        heroBgType: 'solid',
        heroBgColor: '#1c1917',
        heroTextColor: 'light'
      }));
    }
  };

  const handlePaletteClick = (palette: ColorPalette) => {
    setSettings(prev => ({
      ...prev,
      heroBgType: palette.type,
      heroBgColor: palette.value,
      heroTextColor: palette.textColor
    }));
  };

  const persistSettings = async (nextSettings: StoreSettings) => {
    if (getOfflineFallbackActive()) {
      offlineDb.saveSettings(nextSettings);
      return;
    }

    const docRef = doc(db, 'settings', settingsDocId);
    await setDoc(docRef, nextSettings, { merge: true });
  };

  const getFileExtension = (file: File) => {
    const fromName = file.name.split('.').pop()?.toLowerCase();
    if (fromName) return fromName;
    return file.type.split('/')[1] || 'png';
  };

  const uploadLogoFile = async (file: File) => {
    if (!storage) {
      throw new Error('Firebase Storage no está configurado. Revisa el storageBucket del proyecto.');
    }

    const extension = getFileExtension(file);
    const storageRef = ref(storage, `logos/${settingsDocId}/logo-${Date.now()}.${extension}`);
    const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
    return getDownloadURL(snapshot.ref);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!supportedTypes.includes(file.type)) {
      setLogoUploadError('Formato no soportado. Usa JPG, PNG, WEBP, SVG o GIF.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoUploadError('El logo supera 2MB. Usa una versión más liviana para que la tienda cargue rápido.');
      return;
    }

    setLogoUploadError('');
    setPendingLogoFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setPendingLogoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setPendingLogoFile(null);
    setPendingLogoPreview('');
    setSettings(prev => ({ ...prev, logoImage: '' }));
    setLogoUploadError('');
  };

  const handleHeroImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen excede los 2MB. Usa una imagen mas liviana para que la tienda cargue rapido.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setSettings(prev => ({ ...prev, heroBgType: 'image', heroImage: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    if (getOfflineFallbackActive()) {
      if (pendingLogoFile && pendingLogoPreview) {
        const localSettings = { ...settings, logoImage: pendingLogoPreview };
        offlineDb.saveSettings(localSettings);
        setSettings(localSettings);
      } else {
        offlineDb.saveSettings(settings);
      }
      setPendingLogoFile(null);
      setPendingLogoPreview('');
      setSaveSuccess(true);
      setIsSaving(false);
      setTimeout(() => setSaveSuccess(false), 4000);
      return;
    }

    try {
      const nextSettings = pendingLogoFile
        ? { ...settings, logoImage: await uploadLogoFile(pendingLogoFile) }
        : settings;
      await persistSettings(nextSettings);
      setSettings(nextSettings);
      setPendingLogoFile(null);
      setPendingLogoPreview('');
      setLogoUploadError('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4500);
    } catch (err) {
      console.warn("Error saving setting to cloud: ", err);
      setLogoUploadError('No se pudo guardar la configuración. Revisa permisos de Firebase Storage y reglas de Firestore para settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSocialLink = (
    key: keyof NonNullable<StoreSettings['socialLinks']>,
    patch: { enabled?: boolean; url?: string }
  ) => {
    setSettings(prev => {
      const socialLinks = normalizeSocialLinks(prev.socialLinks);
      return {
        ...prev,
        socialLinks: {
          ...socialLinks,
          [key]: {
            ...socialLinks[key],
            ...patch
          }
        }
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-stone-900" />
      </div>
    );
  }

  // Handy checking variables formatted nicely
  const activeBgType = settings.heroBgType || 'solid';
  const activeBgColor = settings.heroBgColor || '#1c1917';
  const isLightText = settings.heroTextColor !== 'dark';
  const logoPreview = pendingLogoPreview || settings.logoImage || '';
  const previewSettings = {
    ...settings,
    logoImage: logoPreview,
    heroBadgeText: settings.heroBadgeText || 'Bienvenido a la tienda',
    productSectionTitle: settings.productSectionTitle || 'Nuestros Productos',
    productSectionDescription: settings.productSectionDescription || 'Cada producto es seleccionado o creado con dedicaci�n, garantizando la calidez de lo tradicional y la m�xima calidad.'
  };
  const socialLinks = normalizeSocialLinks(settings.socialLinks);
  const previewSocialItems = [
    { key: 'instagram', label: 'Instagram', icon: Instagram, config: socialLinks.instagram },
    { key: 'facebook', label: 'Facebook', icon: Facebook, config: socialLinks.facebook },
    { key: 'tiktok', label: 'TikTok', icon: Music2, config: socialLinks.tiktok },
    { key: 'twitter', label: 'X / Twitter', icon: Twitter, config: socialLinks.twitter }
  ].filter(item => item.config?.enabled && item.config?.url?.trim());
  const colorSwatches = [
    '#1c1917', '#292524', '#44403c', '#f5f5f4', '#f5f2eb', '#eab308',
    '#7c2d12', '#450a0a', '#831843', '#23153c', '#1a2d24', '#111e25',
    '#0f766e', '#2563eb', '#4f46e5', '#9333ea', '#16a34a', '#dc2626'
  ];
  const gradientColorMatches = activeBgColor.match(/#[0-9a-fA-F]{6}/g) || [];
  const gradientStartColor = gradientColorMatches[0] || '#78350f';
  const gradientEndColor = gradientColorMatches[1] || '#1a0b02';
  const solidCustomColor = activeBgColor.startsWith('#') && activeBgColor.length === 7 ? activeBgColor : '#1c1917';
  const setSolidBackgroundColor = (color: string) => {
    setSettings(prev => ({ ...prev, heroBgType: 'solid', heroBgColor: color }));
  };
  const setGradientBackgroundColor = (position: 'start' | 'end', color: string) => {
    const start = position === 'start' ? color : gradientStartColor;
    const end = position === 'end' ? color : gradientEndColor;
    setSettings(prev => ({
      ...prev,
      heroBgType: 'gradient',
      heroBgColor: `linear-gradient(135deg, ${start} 0%, ${end} 100%)`
    }));
  };
  const previewProducts = [
    {
      name: 'Producto destacado',
      category: 'artesanal',
      price: '$24.90',
      image: previewSettings.heroImage || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=600'
    },
    {
      name: 'Edicion especial',
      category: 'nuevo',
      price: '$18.50',
      image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=600'
    },
    {
      name: 'Seleccion premium',
      category: 'favorito',
      price: '$32.00',
      image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=600'
    }
  ];
  const socialOptions: Array<{
    key: keyof NonNullable<StoreSettings['socialLinks']>;
    label: string;
    placeholder: string;
  }> = [
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/tu_marca' },
    { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/tu_marca' },
    { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@tu_marca' },
    { key: 'twitter', label: 'X / Twitter', placeholder: 'https://x.com/tu_marca' }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-xl sm:text-3xl font-serif font-bold text-stone-900">Configuración de Tienda</h2>
          <p className="text-stone-500 text-xs sm:text-sm">Personaliza el diseño, textos, imágenes y paleta de colores del banner principal de tus clientes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 items-start">
        
        {/* Configuration Column */}
        <div className="order-2 space-y-6">
          
          {/* Quick Pre-settings */}
          <div className="bg-white p-6 rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm space-y-4">
            <div className="flex items-center space-x-2">
              <Layers size={18} className="text-stone-400" />
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest">Plantillas Rápidas</h3>
            </div>
            <p className="text-xs text-stone-400">Elige una plantilla lista para rellenar los datos de inicio instantáneamente (marca, textos y un color de fondo combinable):</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button 
                type="button"
                onClick={() => handlePresetSelect('coffee')}
                className="p-3 bg-amber-50/50 border border-amber-100 hover:border-amber-200 rounded-xl text-left transition-all hover:bg-amber-50"
              >
                <div className="font-semibold text-xs text-amber-900 flex items-center gap-1">
                  <span>☕ Café Premium</span>
                </div>
                <div className="text-[10px] text-amber-700/70 mt-1">Personalizado para granos</div>
              </button>
              
              <button 
                type="button"
                onClick={() => handlePresetSelect('bracelets')}
                className="p-3 bg-purple-50/50 border border-purple-100 hover:border-purple-200 rounded-xl text-left transition-all hover:bg-purple-50"
              >
                <div className="font-semibold text-xs text-purple-900 flex items-center gap-1">
                  <span>✨ Pulseras & Joyería</span>
                </div>
                <div className="text-[10px] text-purple-700/70 mt-1">Diseño de accesorios</div>
              </button>
            </div>
          </div>

          {/* Core Configuration Form */}
          <form id="store-settings-form" onSubmit={handleSave} className="bg-white p-6 rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm space-y-6">
            <div className="flex items-center space-x-2 border-b border-stone-100 pb-3">
              <Layout size={18} className="text-stone-400" />
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest">Ajustes Generales de la Tienda</h3>
            </div>

            <div className="space-y-4">
              
              {/* Datos de Contacto y Soporte */}
              <div className="border border-stone-100 p-5 rounded-2xl bg-stone-50/50 space-y-4">
                <div className="flex items-center space-x-2 border-b border-stone-100 pb-2">
                  <span className="text-primary font-serif font-bold text-sm">☎</span>
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider font-serif">Soporte y Contactos de la Tienda</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Teléfono de Soporte</label>
                    <input
                      type="text"
                      placeholder="Ej. +593 99 999 9999"
                      value={settings.supportPhone || ''}
                      onChange={e => setSettings({ ...settings, supportPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-stone-100 outline-none focus:ring-2 focus:ring-primary/20 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="Ej. soporte@mitienda.com"
                      value={settings.supportEmail || ''}
                      onChange={e => setSettings({ ...settings, supportEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-stone-105 outline-none focus:ring-2 focus:ring-primary/20 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Número de WhatsApp</label>
                    <input
                      type="text"
                      placeholder="Ej. +593 99 999 9999"
                      value={settings.whatsappNumber || ''}
                      onChange={e => setSettings({ ...settings, whatsappNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-stone-105 outline-none focus:ring-2 focus:ring-primary/20 text-xs"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-stone-400 leading-relaxed font-light">
                  Estos datos se mostrarán en la sección de <span className="font-semibold text-stone-600">Contacto</span> del pie de página público, facilitando que tus clientes te escriban por correo, llamada o WhatsApp.
                </p>
              </div>

              {/* Redes Sociales */}
              <div className="border border-stone-100 p-5 rounded-2xl bg-stone-50/50 space-y-4">
                <div className="flex items-center space-x-2 border-b border-stone-100 pb-2">
                  <span className="text-primary font-serif font-bold text-sm">@</span>
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider font-serif">Redes Sociales</h4>
                </div>

                <div className="space-y-3">
                  {socialOptions.map(option => {
                    const item = socialLinks[option.key] || { enabled: false, url: '' };
                    return (
                      <div key={option.key} className="grid grid-cols-1 md:grid-cols-[170px_1fr] gap-3 items-center bg-white border border-stone-100 rounded-2xl p-3">
                        <label className="flex w-full items-center justify-start gap-3">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={!!item.enabled}
                            onClick={() => updateSocialLink(option.key, { enabled: !item.enabled })}
                            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                              item.enabled ? 'bg-stone-900' : 'bg-stone-200'
                            }`}
                          >
                            <span
                              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                                item.enabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="text-xs font-bold text-stone-800">{option.label}</span>
                        </label>

                        <input
                          type="url"
                          placeholder={option.placeholder}
                          value={item.url || ''}
                          onChange={e => updateSocialLink(option.key, { url: e.target.value })}
                          className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-100 outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-xs font-mono disabled:text-stone-300"
                        />
                      </div>
                    );
                  })}
                </div>

                <p className="text-[10px] text-stone-400 leading-relaxed font-light">
                  Solo se mostrarán en la tienda las redes que estén activas y tengan un enlace configurado.
                </p>
              </div>

              {/* Configuración de Alertas de Stock */}
              <div className="border border-stone-100 p-5 rounded-2xl bg-stone-50/50 space-y-4">
                <div className="flex items-center space-x-2 border-b border-stone-100 pb-2">
                  <AlertCircle size={16} className="text-primary" />
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider font-serif">Alertas de Bajo Stock</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Margen de Advertencia (%)</label>
                    <span className="bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold font-mono px-2 py-0.5 rounded-md">
                      +{settings.stockAlertPercentage ?? 20}% sobre mínimo
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="5"
                      value={settings.stockAlertPercentage ?? 20}
                      onChange={e => setSettings({ ...settings, stockAlertPercentage: parseInt(e.target.value) || 0 })}
                      className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                  <p className="text-[10px] text-stone-400 leading-relaxed font-light">
                    Define con qué nivel de anticipación deseas recibir avisos de bajo stock. 
                    <br />
                    Ejemplo: Con <span className="font-semibold text-stone-600">20%</span>, si el stock mínimo de un café es <span className="font-semibold text-stone-600">10u</span>, verás alertas de color de advertencia cuando el stock sea menor o igual a <span className="font-semibold text-stone-600">12u</span> (el mínimo + 20%). Con <span className="font-semibold text-stone-600">0%</span>, el aviso se activará estrictamente cuando el stock toque o baje del nivel mínimo.
                  </p>
                </div>
              </div>

            </div>

          </form>

        </div>

        {/* Visual Real-time Store Preview Column */}
        <div className="order-1 space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div className="flex items-center space-x-2">
                <Sparkles size={18} className="text-stone-400" />
                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest">Vista Previa Real</h3>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {saveSuccess && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold animate-in fade-in duration-300">
                    <CheckCircle2 size={16} />
                    <span>Configuracion guardada</span>
                  </div>
                )}
                <button
                  type="submit"
                  form="store-settings-form"
                  disabled={isSaving}
                  className="bg-stone-900 hover:bg-stone-850 text-white font-bold py-2.5 px-5 rounded-xl transition-colors text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-stone-400">La vista previa replica la tienda publica: encabezado, banner, productos, pie de pagina, contacto y redes.</p>

            <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-sm bg-stone-50">
              <div className="bg-stone-100 px-4 py-1.5 flex justify-between items-center text-[9px] font-semibold text-stone-400 select-none">
                <span className="truncate">{previewSettings.storeName || 'SwitchShop'}.com</span>
                <span>Vista cliente</span>
              </div>

              <div className="max-h-[760px] overflow-y-auto bg-white">
                <div className="sticky top-0 z-30 bg-white border-b border-stone-100 py-3 shadow-sm">
                  <div className="px-4 sm:px-6 flex items-center justify-between gap-4">
                    <div className="flex items-center min-w-0 flex-1 gap-3">
                      <label className="relative h-12 w-12 shrink-0 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center overflow-hidden cursor-pointer group" title="Cambiar logo desde la vista previa">
                        {previewSettings.logoImage ? (
                          <img src={previewSettings.logoImage} alt={`${previewSettings.storeName} logo`} className="h-full w-full object-contain p-1.5" />
                        ) : (
                          <Image size={18} className="text-stone-300" />
                        )}
                        <span className="absolute right-0 top-0 h-5 w-5 rounded-bl-lg bg-primary text-white flex items-center justify-center shadow-sm"><Pencil size={11} /></span><span className="absolute inset-0 bg-stone-900/70 text-white text-[8px] font-bold uppercase tracking-widest hidden group-hover:flex items-center justify-center text-center px-1">Logo</span>
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" className="hidden" disabled={isSaving} onChange={handleLogoUpload} />
                      </label>
                      <div className="min-w-0 flex-1">
                        <input
                          type="text"
                          required
                          aria-label="Nombre comercial en vista previa"
                          value={previewSettings.storeName}
                          onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                          className="w-full max-w-sm bg-transparent border-b border-dashed border-stone-200 focus:border-primary outline-none font-serif font-bold text-xl text-stone-900 tracking-tight"
                        />
                        <div className="hidden md:flex items-center gap-5 pt-1 text-[11px] font-medium text-stone-500">
                          <span>Inicio</span>
                          <span>Productos</span>
                          <span>Nosotros</span>
                          <span>Contacto</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-stone-600">
                      <Heart size={19} />
                      <div className="relative">
                        <ShoppingBag size={20} />
                        <span className="absolute -top-2 -right-2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">0</span>
                      </div>
                    </div>
                  </div>
                </div>

                <section className="relative min-h-[430px] flex items-center overflow-hidden" style={activeBgType !== 'image' ? { background: activeBgColor } : undefined}>
                  {activeBgType === 'image' && (
                    <div className="absolute inset-0 z-0">
                      <img src={previewSettings.heroImage || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=1200'} alt="Fondo de tienda" className="w-full h-full object-cover scale-105" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-r from-stone-900/90 via-stone-900/70 to-stone-900/30" />
                    </div>
                  )}
                  <div className="absolute right-4 top-4 z-20 w-[min(92%,360px)]">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsHeroBackgroundEditorOpen(prev => !prev)}
                        className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-stone-900 shadow-lg backdrop-blur-md border border-white/40 hover:bg-white"
                      >
                        <Palette size={14} />
                        <span>Fondo</span>
                        <Pencil size={12} />
                      </button>
                    </div>

                    {isHeroBackgroundEditorOpen && (
                      <div className="mt-3 rounded-2xl border border-white/50 bg-white/95 p-4 shadow-2xl backdrop-blur-md space-y-4 text-stone-900">
                        <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
                          {[
                            { key: 'image', label: 'Imagen' },
                            { key: 'solid', label: 'Color' }
                          ].map(option => {
                            const isSelected = option.key === 'image' ? activeBgType === 'image' : activeBgType !== 'image';
                            return (
                              <button
                                key={option.key}
                                type="button"
                                onClick={() => setSettings(prev => ({ ...prev, heroBgType: option.key as StoreSettings['heroBgType'] }))}
                                className={`rounded-lg px-2 py-1.5 text-[10px] font-bold transition-colors ${
                                  isSelected ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>

                        {activeBgType === 'image' ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              placeholder="URL de imagen"
                              value={previewSettings.heroImage}
                              onChange={e => setSettings({ ...settings, heroImage: e.target.value })}
                              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <div className="flex flex-wrap gap-2">
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-stone-900 px-3 py-2 text-xs font-bold text-white hover:bg-stone-850">
                                <Upload size={13} />
                                <span>Subir imagen</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleHeroImageUpload} />
                              </label>
                              {[
                                { label: 'Cafe', url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=2000' },
                                { label: 'Tienda', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2000' },
                                { label: 'Joyas', url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=2000' }
                              ].map(preset => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => setSettings({ ...settings, heroImage: preset.url })}
                                  className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[10px] font-bold text-stone-600 hover:bg-stone-50"
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <div className="grid grid-cols-6 gap-2">
                                {PRESET_PALETTES.map(palette => {
                                  const isSelected = activeBgType === palette.type && activeBgColor === palette.value;
                                  return (
                                    <button
                                      key={palette.id}
                                      type="button"
                                      title={palette.name}
                                      onClick={() => handlePaletteClick(palette)}
                                      className={`h-8 rounded-full border transition-all ${isSelected ? 'border-stone-900 ring-2 ring-stone-900/20 scale-105' : 'border-stone-200'}`}
                                      style={{ background: palette.value }}
                                    >
                                      {isSelected && <Check size={12} className={palette.textColor === 'light' ? 'mx-auto text-white' : 'mx-auto text-stone-900'} />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {activeBgType === 'solid' ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-9 gap-2 rounded-2xl bg-stone-50 p-2 border border-stone-200">
                                  {colorSwatches.map(color => {
                                    const isSelected = activeBgColor === color;
                                    return (
                                      <button
                                        key={color}
                                        type="button"
                                        aria-label="Elegir color"
                                        onClick={() => setSolidBackgroundColor(color)}
                                        className={`h-7 rounded-full border transition-all ${isSelected ? 'border-stone-900 ring-2 ring-stone-900/20 scale-110' : 'border-stone-200'}`}
                                        style={{ backgroundColor: color }}
                                      >
                                        {isSelected && <Check size={11} className={color === '#f5f5f4' || color === '#f5f2eb' || color === '#eab308' ? 'mx-auto text-stone-900' : 'mx-auto text-white'} />}
                                      </button>
                                    );
                                  })}
                                </div>
                                <label className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-3 cursor-pointer hover:bg-stone-50">
                                  <span className="text-xs font-bold text-stone-700">Color personalizado</span>
                                  <span className="h-9 w-14 rounded-xl border border-stone-200 shadow-inner" style={{ backgroundColor: solidCustomColor }} />
                                  <input
                                    type="color"
                                    value={solidCustomColor}
                                    onChange={e => setSolidBackgroundColor(e.target.value)}
                                    className="sr-only"
                                  />
                                </label>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <label className="rounded-2xl border border-stone-200 bg-white p-3 cursor-pointer hover:bg-stone-50">
                                    <span className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Color inicial</span>
                                    <span className="block h-12 rounded-xl border border-stone-200 shadow-inner" style={{ backgroundColor: gradientStartColor }} />
                                    <input
                                      type="color"
                                      value={gradientStartColor}
                                      onChange={e => setGradientBackgroundColor('start', e.target.value)}
                                      className="sr-only"
                                    />
                                  </label>
                                  <label className="rounded-2xl border border-stone-200 bg-white p-3 cursor-pointer hover:bg-stone-50">
                                    <span className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Color final</span>
                                    <span className="block h-12 rounded-xl border border-stone-200 shadow-inner" style={{ backgroundColor: gradientEndColor }} />
                                    <input
                                      type="color"
                                      value={gradientEndColor}
                                      onChange={e => setGradientBackgroundColor('end', e.target.value)}
                                      className="sr-only"
                                    />
                                  </label>
                                </div>
                                <div className="h-10 rounded-2xl border border-stone-200 shadow-inner" style={{ background: `linear-gradient(135deg, ${gradientStartColor} 0%, ${gradientEndColor} 100%)` }} />
                              </div>
                            )}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-1">
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, heroTextColor: 'light' })}
                            className={`rounded-lg py-1.5 text-[10px] font-bold ${isLightText ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900'}`}
                          >
                            Texto claro
                          </button>
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, heroTextColor: 'dark' })}
                            className={`rounded-lg py-1.5 text-[10px] font-bold ${!isLightText ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900'}`}
                          >
                            Texto oscuro
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative z-10 px-6 sm:px-10 py-16 w-full max-w-3xl">
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 ${isLightText ? 'bg-white/15 backdrop-blur-md border border-white/20 text-stone-100' : 'bg-stone-900/10 border border-stone-100/30 text-stone-800'}`}>
                      <Sparkles size={14} className="text-accent" />
                      <input
                        type="text"
                        aria-label="Texto destacado del banner"
                        value={previewSettings.heroBadgeText}
                        onChange={e => setSettings({ ...settings, heroBadgeText: e.target.value })}
                        className="min-w-0 bg-transparent outline-none text-xs font-medium tracking-wide"
                      />
                      <Pencil size={11} className="opacity-70" />
                    </div>
                    <div className="relative max-w-3xl mb-5 group/title">
                      <textarea
                        required
                        rows={2}
                        aria-label="Titulo de bienvenida en vista previa"
                        value={previewSettings.heroTitle}
                        onChange={e => setSettings({ ...settings, heroTitle: e.target.value })}
                        className={`w-full min-h-[112px] bg-transparent pr-10 border-b border-dashed outline-none resize-none focus:border-primary text-4xl sm:text-5xl font-serif font-bold leading-tight tracking-tight ${
                          isLightText ? 'text-white border-white/20 placeholder:text-white/45' : 'text-stone-900 border-stone-900/20 placeholder:text-stone-400'
                        }`}
                        placeholder="Titulo de bienvenida"
                      />
                      <span className={`absolute right-0 top-2 h-8 w-8 rounded-full flex items-center justify-center shadow-sm ${
                        isLightText ? 'bg-white text-stone-900' : 'bg-stone-900 text-white'
                      }`}>
                        <Pencil size={14} />
                      </span>
                    </div>
                    <div className="relative max-w-xl mb-8 group/subtitle">
                      <textarea
                        required
                        rows={3}
                        aria-label="Descripcion del banner en vista previa"
                        value={previewSettings.heroSubtitle}
                        onChange={e => setSettings({ ...settings, heroSubtitle: e.target.value })}
                        className={`w-full bg-transparent pr-10 border-b border-dashed outline-none resize-none focus:border-primary text-base sm:text-lg leading-relaxed ${
                          isLightText ? 'text-stone-200 border-white/20 placeholder:text-white/45' : 'text-stone-600 border-stone-900/20 placeholder:text-stone-400'
                        }`}
                        placeholder="Descripcion del banner"
                      />
                      <span className={`absolute right-0 top-1 h-7 w-7 rounded-full flex items-center justify-center shadow-sm ${
                        isLightText ? 'bg-white text-stone-900' : 'bg-stone-900 text-white'
                      }`}>
                        <Pencil size={13} />
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-sm shadow-lg ${isLightText ? 'bg-white text-stone-900' : 'bg-stone-900 text-white'}`}>
                        <span>Ver Productos</span>
                        <ArrowRight size={17} />
                      </button>
                      <button type="button" className={`inline-flex items-center justify-center px-6 py-3 rounded-full font-bold border text-sm ${isLightText ? 'text-white border-white/30' : 'text-stone-900 border-stone-900/30'}`}>Nuestra Historia</button>
                    </div>
                  </div>
                </section>

                <section className="py-14 px-4 sm:px-8 bg-stone-50">
                  <div className="text-center mb-8">
                    <div className="relative max-w-2xl mx-auto mb-3">
                      <input
                        type="text"
                        required
                        aria-label="Titulo de la seccion de productos"
                        value={previewSettings.productSectionTitle}
                        onChange={e => setSettings({ ...settings, productSectionTitle: e.target.value })}
                        className="w-full bg-transparent pr-9 border-b border-dashed border-stone-200 focus:border-primary outline-none text-center text-3xl sm:text-4xl font-serif font-bold text-stone-900"
                      />
                      <span className="absolute right-0 top-2 h-7 w-7 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-sm"><Pencil size={13} /></span>
                    </div>
                    <div className="relative max-w-xl mx-auto">
                      <textarea
                        required
                        rows={2}
                        aria-label="Descripcion de la seccion de productos"
                        value={previewSettings.productSectionDescription}
                        onChange={e => setSettings({ ...settings, productSectionDescription: e.target.value })}
                        className="w-full bg-transparent pr-9 border-b border-dashed border-stone-200 focus:border-primary outline-none resize-none text-sm text-stone-500 text-center leading-relaxed"
                      />
                      <span className="absolute right-0 top-0 h-7 w-7 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-sm"><Pencil size={13} /></span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-5 mb-8">
                    <div className="relative w-full max-w-md">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                      <div className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-2xl text-stone-400 text-sm shadow-sm">Buscar productos o cafe...</div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                      {['todos', 'artesanal', 'nuevo'].map(cat => (
                        <button key={cat} type="button" className={`px-5 py-2 rounded-full text-xs font-bold capitalize ${cat === 'todos' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white text-stone-600'}`}>{cat}</button>
                      ))}
                      <span className="md:hidden p-2 bg-stone-900 text-white rounded-lg"><Grid2X2 size={16} /></span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {previewProducts.map(product => (
                      <div key={product.name} className="bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col">
                        <div className="aspect-square bg-stone-100 overflow-hidden"><img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /></div>
                        <div className="p-4 flex flex-col flex-1">
                          <span className="text-[9px] uppercase tracking-widest text-stone-400 font-bold mb-1">{product.category}</span>
                          <div className="flex justify-between gap-3 mb-4"><h3 className="text-sm sm:text-base font-serif font-bold text-stone-900 leading-tight">{product.name}</h3><p className="text-sm font-bold text-stone-900">{product.price}</p></div>
                          <button type="button" className="mt-auto w-full flex items-center justify-center gap-2 bg-stone-900 text-white py-2.5 rounded-xl text-xs font-semibold"><ShoppingBag size={15} /><span>Agregar</span></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <footer className="bg-stone-900 text-white">
                  <section className="px-4 sm:px-8 pt-14 pb-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-9 text-center">
                      <div className="flex flex-col items-center">
                        <label className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-5 overflow-hidden cursor-pointer group relative" title="Cambiar logo desde la vista previa">
                          {previewSettings.logoImage ? (<img src={previewSettings.logoImage} alt={`${previewSettings.storeName} logo`} className="h-12 w-12 object-contain rounded-lg bg-white p-1" />) : (<Image size={24} className="text-stone-500" />)}
                          <span className="absolute right-0 top-0 h-5 w-5 rounded-bl-lg bg-primary text-white flex items-center justify-center shadow-sm"><Pencil size={11} /></span><span className="absolute inset-0 bg-stone-950/80 text-white text-[8px] font-bold uppercase tracking-widest hidden group-hover:flex items-center justify-center">Logo</span>
                          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" className="hidden" disabled={isSaving} onChange={handleLogoUpload} />
                        </label>
                        <input type="text" required aria-label="Nombre comercial en pie de pagina" value={previewSettings.storeName} onChange={e => setSettings({ ...settings, storeName: e.target.value })} className="w-full max-w-xs bg-transparent border-b border-dashed border-white/20 focus:border-primary outline-none text-center text-2xl font-serif font-bold text-white" />
                        <div className="relative max-w-sm mx-auto mt-4 w-full">
                          <textarea
                            required
                            rows={3}
                            aria-label="Slogan o sello de pagina"
                            value={previewSettings.footerText}
                            onChange={e => setSettings({ ...settings, footerText: e.target.value })}
                            className="w-full bg-transparent pr-9 border-b border-dashed border-white/15 focus:border-primary outline-none resize-none text-sm leading-relaxed text-stone-400 text-center"
                          />
                          <span className="absolute right-0 top-0 h-7 w-7 rounded-full bg-white text-stone-900 flex items-center justify-center shadow-sm"><Pencil size={13} /></span>
                        </div>
                        {previewSocialItems.length > 0 && (
                          <div className="flex items-center justify-center gap-2 text-stone-400 mt-5">
                            {previewSocialItems.map(item => {
                              const Icon = item.icon;
                              return <span key={item.key} aria-label={item.label} className="h-9 w-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center"><Icon size={17} /></span>;
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-5"><MapPin className="text-accent" size={30} /></div>
                        <h3 className="text-xl font-serif font-bold mb-2">Envio Nacional</h3>
                        <p className="text-stone-300 text-sm leading-relaxed max-w-sm">Cobertura nacional y despachos en menos de 24 horas laborables.</p>
                        <p className="text-stone-300 text-sm font-medium mt-4">Lunes a Sabado: 08:30 AM - 07:00 PM</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-5"><Phone className="text-accent" size={30} /></div>
                        <h3 className="text-xl font-serif font-bold mb-2">Soporte directo</h3>
                        <div className="space-y-3 text-sm max-w-sm mx-auto text-stone-200">
                          {previewSettings.supportPhone && <div className="flex flex-col items-center gap-1"><Phone size={15} className="text-stone-500" /><span>{previewSettings.supportPhone}</span></div>}
                          {previewSettings.supportEmail && <div className="flex flex-col items-center gap-1"><Mail size={15} className="text-stone-500" /><span className="break-all text-center">{previewSettings.supportEmail}</span></div>}
                          {previewSettings.whatsappNumber && <span className="inline-flex items-center gap-2 bg-emerald-500 text-white text-xs font-bold py-2.5 px-3 rounded-lg">WhatsApp Activo</span>}
                        </div>
                      </div>
                    </div>
                  </section>
                  <div className="px-4 sm:px-8 py-6 border-t border-white/10 text-stone-500 text-xs text-center flex flex-col sm:flex-row justify-between gap-3">
                    <p>� 2026 {previewSettings.storeName}. Todos los derechos reservados.</p>
                    <p className="text-stone-600">Desarrollado con alma artesanal y tecnologia de vanguardia.</p>
                  </div>
                </footer>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {logoPreview && (
                <button type="button" onClick={handleRemoveLogo} disabled={isSaving} className="inline-flex items-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors">
                  <X size={14} />
                  <span>Quitar logo</span>
                </button>
              )}
              {pendingLogoFile && <span className="inline-flex items-center px-3 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-bold">Logo pendiente de guardar</span>}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
