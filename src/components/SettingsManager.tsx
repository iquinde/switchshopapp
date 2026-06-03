import React from 'react';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { StoreSettings } from '../types';
import { Save, Sparkles, RefreshCw, Layers, Check, Layout, AlertCircle, Palette, Image, CheckCircle2, Upload } from 'lucide-react';
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

export default function SettingsManager({ companyId }: SettingsManagerProps) {
  const settingsDocId = companyId || 'store';

  const [settings, setSettings] = React.useState<StoreSettings>({
    storeName: 'SwitchShop',
    heroTitle: 'Calidad y Tradición Hecha a Mano.',
    heroSubtitle: 'Descubre nuestra cuidada selección de café premium de especialidad y piezas de joyería artesanal única. Cultivados y creados con dedicación para deleitar tus sentidos.',
    heroImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2000',
    footerText: 'Productos seleccionados con alma, sabor y tradición.',
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
  
  // State for customized hex value for solid background when custom is active
  const [customColor, setCustomColor] = React.useState('#1c1917');

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
          whatsappNumber: local.whatsappNumber || '+593 99 999 9999'
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
            whatsappNumber: data.whatsappNumber || '+593 99 999 9999'
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
            whatsappNumber: local.whatsappNumber || '+593 99 999 9999'
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
          whatsappNumber: local.whatsappNumber || '+593 99 999 9999'
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    if (getOfflineFallbackActive()) {
      offlineDb.saveSettings(settings);
      setSaveSuccess(true);
      setIsSaving(false);
      setTimeout(() => setSaveSuccess(false), 4000);
      return;
    }

    try {
      const docRef = doc(db, 'settings', settingsDocId);
      await setDoc(docRef, settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4500);
    } catch (err) {
      console.warn("Error saving setting to cloud, falling back to local: ", err);
      setOfflineFallbackActive(true);
      offlineDb.saveSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4500);
    } finally {
      setIsSaving(false);
    }
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

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-xl sm:text-3xl font-serif font-bold text-stone-900">Configuración de Tienda</h2>
          <p className="text-stone-500 text-xs sm:text-sm">Personaliza el diseño, textos, imágenes y paleta de colores del banner principal de tus clientes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Configuration Column */}
        <div className="lg:col-span-2 space-y-6">
          
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
          <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm space-y-6">
            <div className="flex items-center space-x-2 border-b border-stone-100 pb-3">
              <Layout size={18} className="text-stone-400" />
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest">Ajustes Generales de la Tienda</h3>
            </div>

            <div className="space-y-4">
              
              {/* Store Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Nombre Comercial</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. SwitchShop, Café El Recreo..."
                  value={settings.storeName}
                  onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                  className="w-full px-4 py-2 bg-stone-50 rounded-xl border border-stone-100 outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm"
                />
                <p className="text-[9px] text-stone-400 font-light">Modifica la marca de la tienda en el encabezado, pestañas y pie de página.</p>
              </div>

              {/* Hero Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Título de Bienvenida (Encabezado principal)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Calidad y Tradición Hecha a Mano."
                  value={settings.heroTitle}
                  onChange={e => setSettings({ ...settings, heroTitle: e.target.value })}
                  className="w-full px-4 py-2 bg-stone-50 rounded-xl border border-stone-100 outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm"
                />
              </div>

              {/* Hero Subtitle */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Descripción del Banner</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Escribe el párrafo de presentación de tu marca"
                  value={settings.heroSubtitle}
                  onChange={e => setSettings({ ...settings, heroSubtitle: e.target.value })}
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-100 rounded-xl outline-none resize-none focus:bg-white text-sm"
                />
              </div>

              {/* SECCIÓN DISEÑO DE FONDO - PALETA DE COLORES */}
              <div className="border border-stone-100 p-5 rounded-2xl bg-stone-50/50 space-y-4">
                <div className="flex items-center space-x-2 border-b border-stone-100 pb-2">
                  <Palette size={16} className="text-primary" />
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Fondo & Paleta de Colores</h4>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Tipo de Fondo para el Banner</label>
                  
                  {/* Selector Segmentado del tipo de fondo */}
                  <div className="grid grid-cols-3 gap-2 bg-stone-100/80 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, heroBgType: 'solid' }))}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        activeBgType === 'solid' 
                          ? 'bg-white text-stone-900 shadow-sm' 
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      Color Sólido
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, heroBgType: 'gradient' }))}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        activeBgType === 'gradient' 
                          ? 'bg-white text-stone-900 shadow-sm' 
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      Degradado
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, heroBgType: 'image' }))}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        activeBgType === 'image' 
                          ? 'bg-white text-stone-900 shadow-sm' 
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      Imagen
                    </button>
                  </div>
                </div>

                {/* Si no es de tipo imagen, mostramos la paleta de colores prediseñada para administración fácil */}
                {activeBgType !== 'image' && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Paletas Profesionales Prediseñadas</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {PRESET_PALETTES.map(palette => {
                        const isSelected = activeBgColor === palette.value && activeBgType === palette.type;
                        return (
                          <button
                            key={palette.id}
                            type="button"
                            onClick={() => handlePaletteClick(palette)}
                            className={`flex items-center gap-2 p-2 bg-white rounded-xl border transition-all text-left ${
                              isSelected ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            <div 
                              className="w-6 h-6 rounded-full shrink-0 border border-stone-200/50 flex items-center justify-center text-[9px]"
                              style={{ background: palette.value }}
                            >
                              {isSelected && <Check size={10} className={palette.textColor === 'light' ? 'text-white' : 'text-stone-900'} />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] font-bold text-stone-800 truncate">{palette.name}</div>
                              <div className="text-[8px] text-stone-400 capitalize">{palette.type === 'solid' ? 'Sólido' : 'Degradado'}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Inputs personalizados para el color del fondo y contraste de manera manual si eligen modificar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Valor del Color (HEX o Gradient CSS)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={activeBgType === 'solid' ? 'Ej. #1c1917' : 'linear-gradient(...)'}
                            value={activeBgColor}
                            onChange={e => setSettings({ ...settings, heroBgColor: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white rounded-xl border border-stone-200 outline-none focus:ring-1 focus:ring-stone-400 text-xs font-mono"
                          />
                          {activeBgType === 'solid' && (
                            <input 
                              type="color"
                              value={activeBgColor.startsWith('#') && activeBgColor.length === 7 ? activeBgColor : '#1c1917'}
                              onChange={e => setSettings({ ...settings, heroBgColor: e.target.value })}
                              className="w-8 h-8 rounded-lg border border-stone-200 cursor-pointer p-0 overflow-hidden"
                            />
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block font-serif">Color de Texto (Contraste)</label>
                        <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-xl border border-stone-200">
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, heroTextColor: 'light' })}
                            className={`py-1 text-[10px] font-bold rounded-lg capitalize ${
                              isLightText ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-850'
                            }`}
                          >
                            Letras Claras (Fondo Oscuro)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, heroTextColor: 'dark' })}
                            className={`py-1 text-[10px] font-bold rounded-lg capitalize ${
                              !isLightText ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-850'
                            }`}
                          >
                            Letras Oscuras (Fondo Claro)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Si es de tipo imagen, mostramos el editor de imagen y los presets anteriores para backwards-compatibility */}
                {activeBgType === 'image' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Imagen de Fondo del Banner (URL)</label>
                      <input
                        type="text"
                        required
                        placeholder="https://images.unsplash.com/..."
                        value={settings.heroImage}
                        onChange={e => setSettings({ ...settings, heroImage: e.target.value })}
                        className="w-full px-4 py-2 bg-white rounded-xl border border-stone-150 outline-none focus:ring-2 focus:ring-primary/20 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">O Subir Archivo de Imagen</label>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-stone-200 hover:border-stone-300 rounded-xl cursor-pointer bg-white hover:bg-stone-50 transition-all">
                          <div className="flex flex-col items-center justify-center pt-3 pb-3">
                            <Upload className="w-5 h-5 text-stone-400 mb-1" />
                            <p className="text-[10px] text-stone-500 font-bold">Haz clic para subir un archivo local</p>
                            <p className="text-[8px] text-stone-400 font-medium">Optimizado automáticamente (JPG, PNG, WEBP)</p>
                          </div>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                  alert("La imagen excede los 2MB. Te sugerimos subir una de menor resolución para un óptimo rendimiento.");
                                }
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  const result = reader.result;
                                  if (typeof result === 'string') {
                                    setSettings(prev => ({ ...prev, heroImage: result }));
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    
                    {/* Fast image link presets helpers */}
                    <div className="flex flex-wrap gap-2 pt-1 pb-1">
                      <span className="text-[9px] text-stone-400 self-center font-bold">Presets de fondos:</span>
                      {[
                        { label: 'Granos de Café', url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=2000' },
                        { label: 'Taza y Cafetería', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2000' },
                        { label: 'Pulseras en Mano', url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=2000' },
                        { label: 'Joyas y Cuenta', url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=2000' }
                      ].map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSettings({ ...settings, heroImage: p.url })}
                          className="text-[9px] bg-stone-100 hover:bg-stone-200 text-stone-600 px-2 py-0.5 rounded-md border border-stone-200/40"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block font-serif">Color de Texto (Contraste)</label>
                      <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-xl border border-stone-200 max-w-sm">
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, heroTextColor: 'light' })}
                          className={`py-1 text-[10px] font-bold rounded-lg capitalize ${
                            isLightText ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-850'
                          }`}
                        >
                          Letras Claras
                        </button>
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, heroTextColor: 'dark' })}
                          className={`py-1 text-[10px] font-bold rounded-lg capitalize ${
                            !isLightText ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-850'
                          }`}
                        >
                          Letras Oscuras
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer text */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Eslogan o Sello de Pie de Página (Footer)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Productos artesanales hechos con amor."
                  value={settings.footerText}
                  onChange={e => setSettings({ ...settings, footerText: e.target.value })}
                  className="w-full px-4 py-2 bg-stone-50 rounded-xl border border-stone-100 outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm"
                />
              </div>

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

            {/* Action Bar */}
            <div className="pt-4 border-t border-stone-50 flex items-center justify-between">
              {saveSuccess ? (
                <div className="flex items-center space-x-1.5 text-xs text-green-600 font-semibold animate-in fade-in duration-300">
                  <CheckCircle2 size={16} />
                  <span>¡Configuración guardada! La tienda se actualizó en tiempo real.</span>
                </div>
              ) : (
                <span className="text-[10px] text-stone-400 flex items-center gap-1 font-light">
                  <AlertCircle size={10} />
                  Los cambios se reflejarán instantáneamente para todos los clientes.
                </span>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="bg-stone-900 hover:bg-stone-850 text-white font-bold py-2.5 px-6 rounded-xl transition-colors text-xs flex items-center space-x-2 shadow-sm disabled:opacity-50"
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
          </form>

        </div>

        {/* Visual Real-time Mockup Preview Column */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm space-y-5 sticky top-6">
            <div className="flex items-center space-x-2 border-b border-stone-100 pb-3">
              <Sparkles size={18} className="text-stone-400" />
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest">Vista Previa Real</h3>
            </div>
            
            <p className="text-xs text-stone-400">Así es como verán los clientes la tienda comercial en sus dispositivos:</p>

            {/* Mockup Frame */}
            <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-sm bg-stone-50">
              
              {/* Fake Phone Top Status Bar */}
              <div className="bg-stone-100 px-3 py-1 flex justify-between items-center text-[8px] font-semibold text-stone-400 select-none">
                <span>{settings.storeName}.com</span>
                <span>12:00 PM</span>
              </div>

              {/* Fake App Bar */}
              <div className="bg-white/80 backdrop-blur-md px-3 py-2 flex justify-between items-center border-b border-stone-100">
                <span className="font-serif font-black text-xs text-stone-900">{settings.storeName}<span className="text-primary text-[10px]">.</span></span>
                <div className="h-4 w-4 rounded-full bg-stone-100 flex items-center justify-center text-[8px]">🛒</div>
              </div>

              {/* Fake Hero Banner */}
              <div 
                className="relative h-44 flex items-center px-4 overflow-hidden"
                style={activeBgType !== 'image' ? { background: activeBgColor } : undefined}
              >
                {activeBgType === 'image' && (
                  <>
                    <img
                      src={settings.heroImage || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=600'}
                      alt="Background crop model"
                      className="absolute inset-0 w-full h-full object-cover z-0"
                    />
                    <div className="absolute inset-0 bg-stone-900/80 z-10" />
                  </>
                )}

                <div className="relative z-20 space-y-1.5 w-full">
                  <div className={`text-[10px] font-serif font-bold leading-tight line-clamp-2 pr-2 ${
                    isLightText ? 'text-white' : 'text-stone-900'
                  }`}>
                    {settings.heroTitle}
                  </div>
                  <div className={`text-[8px] leading-snug line-clamp-3 pr-4 font-light ${
                    isLightText ? 'text-stone-300' : 'text-stone-600'
                  }`}>
                    {settings.heroSubtitle}
                  </div>
                  <div className={`inline-block text-[8px] font-bold px-3 py-1 rounded-full ${
                    isLightText ? 'bg-white text-stone-900' : 'bg-stone-900 text-white'
                  }`}>
                    Ver Productos
                  </div>
                </div>
              </div>

              {/* Footer crop */}
              <div className="bg-white p-3 border-t border-stone-100 text-center space-y-1 text-[8px]">
                <div className="font-serif font-bold text-stone-900 text-[9px]">{settings.storeName}.</div>
                <p className="text-stone-400 line-clamp-1">{settings.footerText}</p>
                <div className="text-stone-300 mt-2 font-mono">© 2026 {settings.storeName}.</div>
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
