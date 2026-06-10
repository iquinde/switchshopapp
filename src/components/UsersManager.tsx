import React from 'react';
import { Edit2, Plus, Save, ShieldCheck, Trash2, X } from 'lucide-react';
import { collection, deleteDoc, doc, onSnapshot, query, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Company } from '../types';
import { AppRole, UserRoleRecord, normalizeEmail } from '../lib/authz';
import { getOfflineFallbackActive } from '../lib/offlineDb';
import { motion } from 'motion/react';

interface UsersManagerProps {
  companies: Company[];
}

export default function UsersManager({ companies }: UsersManagerProps) {
  const [userRoles, setUserRoles] = React.useState<UserRoleRecord[]>([]);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [roleEmail, setRoleEmail] = React.useState('');
  const [roleFirstName, setRoleFirstName] = React.useState('');
  const [roleLastName, setRoleLastName] = React.useState('');
  const [roleType, setRoleType] = React.useState<AppRole>('company_admin');
  const [roleCompanyId, setRoleCompanyId] = React.useState('');
  const [roleStatus, setRoleStatus] = React.useState<'active' | 'inactive'>('active');
  const [editingRoleEmail, setEditingRoleEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (getOfflineFallbackActive()) return;

    const unsubscribe = onSnapshot(query(collection(db, 'userRoles')), (snapshot) => {
      const roles = snapshot.docs
        .map(roleDoc => roleDoc.data() as UserRoleRecord)
        .sort((a, b) => a.email.localeCompare(b.email));
      setUserRoles(roles);
    }, (error) => {
      console.warn('Error al cargar roles de usuario:', error);
      setUserRoles([]);
    });

    return () => unsubscribe();
  }, []);

  const resetRoleForm = () => {
    setRoleEmail('');
    setRoleFirstName('');
    setRoleLastName('');
    setRoleType('company_admin');
    setRoleCompanyId('');
    setRoleStatus('active');
    setEditingRoleEmail(null);
    setIsEditing(false);
  };

  const handleOpenAdd = () => {
    resetRoleForm();
    setIsEditing(true);
  };

  const handleEditRole = (role: UserRoleRecord) => {
    setRoleEmail(role.email);
    setRoleFirstName(role.firstName || '');
    setRoleLastName(role.lastName || '');
    setRoleType(role.role);
    setRoleCompanyId(role.companyId || '');
    setRoleStatus(role.status);
    setEditingRoleEmail(role.email);
    setIsEditing(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedRoleEmail = normalizeEmail(roleEmail);
    if (!normalizedRoleEmail) {
      alert('Ingresa el email del usuario.');
      return;
    }

    const firstName = roleFirstName.trim();
    const lastName = roleLastName.trim();
    if (!firstName || !lastName) {
      alert('Ingresa el nombre y apellido del usuario.');
      return;
    }

    if (roleType !== 'super_admin' && !roleCompanyId) {
      alert('Selecciona una empresa para este rol.');
      return;
    }

    const now = new Date().toISOString();
    const existingRole = userRoles.find(role => role.email === normalizedRoleEmail);
    const payload: UserRoleRecord = {
      email: normalizedRoleEmail,
      firstName,
      lastName,
      role: roleType,
      companyId: roleType === 'super_admin' ? null : roleCompanyId,
      status: roleStatus,
      createdAt: existingRole?.createdAt || now,
      updatedAt: now,
    };

    setIsSubmitting(true);

    try {
      await setDoc(doc(db, 'userRoles', normalizedRoleEmail), payload);
      alert(editingRoleEmail ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente');
      resetRoleForm();
    } catch (error: any) {
      console.error('Error al guardar rol de usuario:', error);
      alert('Error al guardar rol: ' + (error?.message || String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (email: string) => {
    if (!confirm(`Eliminar el rol asignado a "${email}"?`)) return;

    try {
      await deleteDoc(doc(db, 'userRoles', email));
      if (editingRoleEmail === email) resetRoleForm();
      alert('Rol eliminado');
    } catch (error: any) {
      console.error('Error al eliminar rol de usuario:', error);
      alert('Error al eliminar rol: ' + (error?.message || String(error)));
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-xl sm:text-3xl font-serif font-bold text-stone-900">Usuarios</h2>
          <p className="text-stone-500 text-xs sm:text-sm">Administra permisos globales o por empresa para cuentas Google verificadas.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 bg-stone-900 hover:bg-primary text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-sm font-bold shadow-sm active:scale-95 transition-all w-full sm:w-auto justify-center"
        >
          <Plus size={18} />
          <span>Crear Usuario</span>
        </button>
      </div>

      <section className="bg-white border border-stone-100 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-stone-700" />
          <h3 className="font-serif font-bold text-lg text-stone-900">Usuarios autorizados</h3>
        </div>

        {userRoles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {userRoles.map(role => {
              const company = companies.find(comp => comp.id === role.companyId);
              const fullName = [role.firstName, role.lastName].filter(Boolean).join(' ').trim();
              return (
                <div key={role.email} className="border border-stone-100 rounded-xl p-3 flex items-start justify-between gap-3 bg-stone-50/60">
                  <div className="min-w-0">
                    {fullName && (
                      <p className="font-bold text-sm text-stone-900 truncate">{fullName}</p>
                    )}
                    <p className="font-mono text-xs font-bold text-stone-800 truncate">{role.email}</p>
                    <p className="text-[11px] text-stone-500 mt-1">
                      {role.role === 'super_admin' ? 'Super admin' : role.role === 'company_admin' ? 'Admin empresa' : 'Colaborador'}
                      {company ? ` - ${company.storeName}` : ''}
                    </p>
                    <span className={`inline-flex mt-2 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
                      role.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {role.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditRole(role)}
                      className="p-2 text-stone-500 hover:text-stone-900 hover:bg-white rounded-lg transition-colors"
                      title="Editar usuario"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRole(role.email)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar usuario"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/70 px-4 py-8 text-center text-xs font-semibold text-stone-400">
            No hay usuarios configurados todavia.
          </div>
        )}
      </section>

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
                {editingRoleEmail ? 'Editar Usuario' : 'Crear Usuario'}
              </h3>
              <button onClick={resetRoleForm} className="text-stone-400 hover:text-stone-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1">
                  Email de Cuenta Google <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="usuario@gmail.com"
                  value={roleEmail}
                  onChange={(e) => setRoleEmail(e.target.value)}
                  disabled={Boolean(editingRoleEmail)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-900 font-medium disabled:bg-stone-50 disabled:text-stone-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Israel"
                    value={roleFirstName}
                    onChange={(e) => setRoleFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1">
                    Apellido <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Quinde"
                    value={roleLastName}
                    onChange={(e) => setRoleLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1">
                    Rol <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={roleType}
                    onChange={(e) => {
                      const nextRole = e.target.value as AppRole;
                      setRoleType(nextRole);
                      if (nextRole === 'super_admin') setRoleCompanyId('');
                    }}
                    className="w-full px-3 py-2 border border-stone-200 bg-white rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 font-bold"
                  >
                    <option value="company_admin">Admin empresa</option>
                    <option value="company_staff">Colaborador</option>
                    <option value="super_admin">Super admin</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1">
                    Estado
                  </label>
                  <select
                    value={roleStatus}
                    onChange={(e) => setRoleStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 border border-stone-200 bg-white rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 font-bold"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1">
                  Empresa asociada {roleType !== 'super_admin' && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={roleCompanyId}
                  onChange={(e) => setRoleCompanyId(e.target.value)}
                  disabled={roleType === 'super_admin'}
                  className="w-full px-3 py-2 border border-stone-200 bg-white rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 font-bold disabled:bg-stone-50 disabled:text-stone-400"
                >
                  <option value="">{roleType === 'super_admin' ? 'No aplica para Super admin' : 'Selecciona una empresa'}</option>
                  {companies.filter(company => company.id !== 'comp-default').map(company => (
                    <option key={company.id} value={company.id}>{company.storeName}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={resetRoleForm}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-stone-900 text-white hover:bg-primary font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow disabled:opacity-70"
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
