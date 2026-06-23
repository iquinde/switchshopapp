import React from 'react';
import { 
  Building, User, Mail, Search, Plus, Trash2, Edit2, X, Check, Save, 
  Phone, Copy, ExternalLink, UserPlus
} from 'lucide-react';
import { auth, db } from '../firebase';
import { 
  collection, doc, updateDoc, 
  deleteDoc, setDoc
} from 'firebase/firestore';
import { Company } from '../types';
import { motion } from 'motion/react';

interface CompaniesManagerProps {
  companies: Company[];
}

const PHONE_AREA_CODES = [
  { label: 'Ecuador', code: '+593' },
  { label: 'Colombia', code: '+57' },
  { label: 'Peru', code: '+51' },
  { label: 'Mexico', code: '+52' },
  { label: 'Estados Unidos', code: '+1' },
  { label: 'Espana', code: '+34' },
];

const splitPhoneValue = (value?: string | null) => {
  const cleaned = (value || '').trim();
  const match = PHONE_AREA_CODES.find(area => cleaned.startsWith(area.code));

  if (!match) {
    return { areaCode: '+593', number: cleaned.replace(/\D/g, '') };
  }

  return {
    areaCode: match.code,
    number: cleaned.slice(match.code.length).replace(/\D/g, ''),
  };
};

const buildPhoneValue = (areaCode: string, number: string) => {
  const cleanNumber = number.replace(/\D/g, '');
  return cleanNumber ? `${areaCode}${cleanNumber}` : null;
};

const parseEmailList = (value: string) => {
  return Array.from(new Set(
    value
      .split(/[\n,; ]+/)
      .map(email => email.trim().toLowerCase())
      .filter(Boolean)
  ));
};

export default function CompaniesManager({ companies }: CompaniesManagerProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  
  // Create / Edit modal state
  const [isEditing, setIsEditing] = React.useState(false);
  const [currentCompany, setCurrentCompany] = React.useState<Company | null>(null);
  const [name, setName] = React.useState('');
  const [storeName, setStoreName] = React.useState('');
  const [ownerEmail, setOwnerEmail] = React.useState('');
  const [collaboratorEmailsText, setCollaboratorEmailsText] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [phoneAreaCode, setPhoneAreaCode] = React.useState('+593');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [whatsappAreaCode, setWhatsappAreaCode] = React.useState('+593');
  const [whatsappNumber, setWhatsappNumber] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<'active' | 'inactive'>('active');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const slugifyStoreName = (text: string): string => {
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const getStoreUrl = (storeNameValue: string) => {
    return `${window.location.origin}/tienda/${slugifyStoreName(storeNameValue)}`;
  };

  const resetForm = () => {
    setName('');
    setStoreName('');
    setOwnerEmail('');
    setCollaboratorEmailsText('');
    setDescription('');
    setPhoneAreaCode('+593');
    setPhoneNumber('');
    setWhatsappAreaCode('+593');
    setWhatsappNumber('');
    setEmail('');
    setStatus('active');
    setCurrentCompany(null);
    setIsEditing(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleEdit = (comp: Company) => {
    setCurrentCompany(comp);
    setName(comp.name);
    setStoreName(comp.storeName);
    setOwnerEmail(comp.ownerEmail);
    setCollaboratorEmailsText((comp.collaboratorEmails || []).join('\n'));
    setDescription(comp.description || '');
    const parsedPhone = splitPhoneValue(comp.phone);
    const parsedWhatsapp = splitPhoneValue(comp.whatsapp);
    setPhoneAreaCode(parsedPhone.areaCode);
    setPhoneNumber(parsedPhone.number);
    setWhatsappAreaCode(parsedWhatsapp.areaCode);
    setWhatsappNumber(parsedWhatsapp.number);
    setEmail(comp.email || '');
    setStatus(comp.status);
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !storeName.trim() || !ownerEmail.trim()) {
      alert('Por favor complete los campos obligatorios: Propietario, Marca y Email de Acceso.');
      return;
    }

    setIsSubmitting(true);

    const normalizedOwnerEmail = ownerEmail.trim().toLowerCase();
    const collaboratorEmails = parseEmailList(collaboratorEmailsText)
      .filter(email => email !== normalizedOwnerEmail);

    const companyPayload = {
      name: name.trim(),
      storeName: storeName.trim(),
      ownerEmail: normalizedOwnerEmail,
      collaboratorEmails,
      description: description.trim() || null,
      phone: buildPhoneValue(phoneAreaCode, phoneNumber),
      whatsapp: buildPhoneValue(whatsappAreaCode, whatsappNumber),
      email: email.trim() || null,
      status: status,
      createdAt: currentCompany?.createdAt || new Date().toISOString()
    };

    try {
      if (currentCompany) {
        const docRef = doc(db, 'companies', currentCompany.id);
        await updateDoc(docRef, companyPayload);
        alert('Empresa actualizada exitosamente');
      } else {
        const docRef = doc(collection(db, 'companies'));
        await setDoc(docRef, companyPayload);
        alert('Empresa registrada exitosamente');
      }
      resetForm();
    } catch (error: any) {
      console.error("Error al guardar empresa en Firebase:", error);
      alert('Error de sincronización con Firebase: ' + (error?.message || String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, store: string) => {
    if (!confirm(`¿Estás seguro de eliminar permanentemente el acceso y perfil de "${store}"?`)) return;
    
    try {
      await auth.currentUser?.getIdToken(true);
      await deleteDoc(doc(db, 'companies', id));
      alert('Empresa eliminada');
    } catch (error: any) {
      console.error("Error al eliminar empresa de Firebase:", error);
      const currentUser = auth.currentUser;
      const sessionInfo = currentUser
        ? `\nSesion actual: ${currentUser.email || 'sin email'} | email verificado: ${currentUser.emailVerified ? 'si' : 'no'}`
        : '\nSesion actual: no autenticada';
      alert('Error al eliminar de Firebase: ' + (error?.message || String(error)) + sessionInfo);
    }
  };

  const filtered = companies.filter(c => {
    // Only exclude fixed 'comp-default' to prevent breaking essential system entries
    if (c.id === 'comp-default') {
      return false;
    }
    return c.storeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.collaboratorEmails || []).some(email => email.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-xl sm:text-3xl font-serif font-bold text-stone-900">Empresas</h2>
          <p className="text-stone-500 text-xs sm:text-sm">Administra las cuentas de los vendedores externos autorizados.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 bg-stone-900 hover:bg-primary text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-sm font-bold shadow-sm active:scale-95 transition-all w-full sm:w-auto justify-center"
        >
          <Plus size={18} />
          <span>Configurar Empresa</span>
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
        <input 
          type="text" 
          placeholder="Buscar marcas, propietarios o emails..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-4 py-2.5 w-full bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all font-medium"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(comp => (
          <div 
            key={comp.id} 
            className="bg-white border border-stone-100 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="font-bold text-lg font-serif text-stone-850 block">{comp.storeName}</span>
                <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
                  comp.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {comp.status === 'active' ? 'Activo' : 'Suspendido'}
                </span>
              </div>
              <p className="text-xs text-stone-500 line-clamp-2 mb-4 leading-relaxed">
                {comp.description || 'Sin descripción de marca configurada.'}
              </p>

              <div className="space-y-2 border-t border-stone-50 pt-4 text-xs font-medium text-stone-600">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-stone-400" />
                  <span>Propietario: {comp.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-stone-400" />
                  <span className="font-mono">{comp.ownerEmail}</span>
                </div>
                {(comp.collaboratorEmails || []).length > 0 && (
                  <div className="flex items-start gap-2">
                    <UserPlus size={14} className="text-stone-400 mt-0.5" />
                    <span className="font-mono leading-relaxed">
                      {(comp.collaboratorEmails || []).join(', ')}
                    </span>
                  </div>
                )}
                {(comp.phone || comp.whatsapp) && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-stone-400" />
                    <span>Telf: {comp.phone || comp.whatsapp || 'N/A'}</span>
                  </div>
                )}
              </div>

              {/* Copy Customer Store URL */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex flex-col gap-1.5 bg-stone-50/60 p-2.5 rounded-xl border border-stone-100/50">
                <span className="text-[9px] uppercase font-bold text-stone-400 font-mono tracking-tight">Copiar enlace de tienda (subruta):</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const subruta = slugifyStoreName(comp.storeName);
                      const shareUrl = getStoreUrl(comp.storeName);
                      navigator.clipboard.writeText(shareUrl).then(() => {
                        setCopiedId(comp.id);
                        setTimeout(() => setCopiedId(null), 2500);
                      }).catch(() => {
                        const fallbackUrl = `${window.location.origin}/?tienda=${subruta}`;
                        navigator.clipboard.writeText(fallbackUrl).then(() => {
                          setCopiedId(comp.id);
                          setTimeout(() => setCopiedId(null), 2500);
                        });
                      });
                    }}
                    type="button"
                    className={`min-w-0 flex-1 text-left py-1.5 px-2.5 rounded-lg border flex items-center justify-between text-[11px] transition-all duration-200 ${
                      copiedId === comp.id 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' 
                        : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-600 font-medium'
                    }`}
                    title="Haz click para copiar el enlace"
                  >
                    <span className="truncate font-mono">
                      {copiedId === comp.id ? '¡Copiado Exitosamente!' : `/tienda/${slugifyStoreName(comp.storeName)}`}
                    </span>
                    {copiedId === comp.id ? (
                      <Check size={12} className="text-emerald-600 flex-shrink-0" />
                    ) : (
                      <Copy size={11} className="text-stone-400 flex-shrink-0" />
                    )}
                  </button>
                  <button
                    onClick={() => window.open(getStoreUrl(comp.storeName), '_blank', 'noopener,noreferrer')}
                    type="button"
                    className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:bg-stone-900 hover:border-stone-900 hover:text-white transition-all"
                    title="Abrir tienda en una nueva pestaña"
                  >
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-stone-50 pt-4 mt-6">
              <button
                onClick={() => handleEdit(comp)}
                className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-colors"
                title="Editar Empresa"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDelete(comp.id, comp.storeName)}
                className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar Empresa"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full bg-stone-50 rounded-2xl border border-dashed border-stone-200 py-16 text-center text-stone-400">
            <Building className="mx-auto mb-3 opacity-20" size={40} />
            <p className="text-xs sm:text-sm font-serif">No se encontraron empresas autorizadas.</p>
          </div>
        )}
      </div>

      {/* Editing Dialog Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-5 border-b border-stone-100 flex justify-between items-center bg-stone-50">
              <h3 className="font-serif font-bold text-lg text-stone-900">
                {currentCompany ? 'Editar Configuración de Empresa' : 'Registrar Nueva Empresa'}
              </h3>
              <button onClick={resetForm} className="text-stone-400 hover:text-stone-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1">
                    Marca / Tienda <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej. Esencias & Aromas"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1">
                    Propietario <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="Nombre completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1">
                  Email de Cuenta Google de Acceso <span className="text-red-500">*</span>
                </label>
                <input 
                  type="email" 
                  required
                  placeholder="ejemplo@gmail.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-900 font-medium"
                />
                <span className="text-[10px] text-stone-400 mt-1 block leading-relaxed">
                  El propietario deberá iniciar sesión con esta cuenta de Google para poder gestionar su tienda de forma segura.
                </span>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1">
                  Usuarios autorizados adicionales
                </label>
                <textarea
                  rows={2}
                  placeholder="otro.usuario@gmail.com"
                  value={collaboratorEmailsText}
                  onChange={(e) => setCollaboratorEmailsText(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-900 font-medium"
                />
                <span className="text-[10px] text-stone-400 mt-1 block leading-relaxed">
                  Separa varios correos con coma, espacio o una linea nueva. Cada correo podra entrar con Google y gestionar esta misma empresa.
                </span>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1">
                  Descripción Corta
                </label>
                <textarea 
                  rows={2}
                  maxLength={150}
                  placeholder="Detalla de qué se trata esta marca comercial..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1">
                    Teléfono
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={phoneAreaCode}
                      onChange={(e) => setPhoneAreaCode(e.target.value)}
                      className="w-24 px-2 py-2 border border-stone-200 bg-white rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 font-bold"
                    >
                      {PHONE_AREA_CODES.map(area => (
                        <option key={area.code} value={area.code}>{area.code}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="999999999"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1">
                    WhatsApp (Solo Números)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={whatsappAreaCode}
                      onChange={(e) => setWhatsappAreaCode(e.target.value)}
                      className="w-24 px-2 py-2 border border-stone-200 bg-white rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 font-bold"
                    >
                      {PHONE_AREA_CODES.map(area => (
                        <option key={area.code} value={area.code}>{area.code}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="999999999"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1">
                    Email de Soporte Técnico
                  </label>
                  <input 
                    type="email" 
                    placeholder="soporte@marca.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1">
                    Estado de Acceso
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 border border-stone-200 bg-white rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 font-bold"
                  >
                    <option value="active">Permitido (Activo)</option>
                    <option value="inactive">Suspendido (Inactivo)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-stone-900 text-white hover:bg-primary font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow"
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">Guardando...</span>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Guardar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
