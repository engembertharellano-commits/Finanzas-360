import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import AIAssistant from './views/AIAssistant';
import AuditWizard from './views/AuditWizard';
import AuditResults from './views/AuditResults';
import CCTVInventory from './views/CCTVInventory';
import PhysicalInventory from './views/PhysicalInventory';
import VisitLog from './views/VisitLog';
import MonthlySummary from './views/MonthlySummary';
import ManagementReport from './views/ManagementReport';
import PendingTasks from './views/PendingTasks';
import PharmacyList from './views/PharmacyList';
import StaffDirectory from './views/StaffDirectory';
import SupportDirectory from './views/SupportDirectory';
import DeliveryReceipts from './views/DeliveryReceipts';
import AssetControl from './views/AssetControl';
import NewVisit from './views/NewVisit';
import AccessManagement from './views/AccessManagement';
import CaseManagement from './views/CaseManagement';
import Settings from './views/Settings';
import Login from './views/Login';
import { Menu, CheckCircle2, XCircle, WifiOff } from 'lucide-react';
import {
  ViewName,
  Pharmacy,
  AuditState,
  CCTVInventoryRecord,
  PhysicalInventoryRecord,
  ManagementVisitRecord,
  PendingRecord,
  StaffRecord,
  SupportRecord,
  DeliveryReceipt,
  ScheduleEntry,
  BriefingData,
  Asset,
  AssetLoan,
  CaseRecord
} from './types';
import { HARDWARE_CHECKLIST, PROCESS_CHECKLIST } from './constants';
import { supabase } from './lib/supabase';

const DATA_VERSION = "11.21-TRAVEL-MODE-FINAL";

interface UserData {
  version: string;
  pharmacies: Pharmacy[];
  audits: AuditState[];
  cctvRecords: CCTVInventoryRecord[];
  physicalRecords: PhysicalInventoryRecord[];
  managementRecords: ManagementVisitRecord[];
  pendingRecords: PendingRecord[];
  staffRecords: StaffRecord[];
  supportRecords: SupportRecord[];
  deliveryReceipts: DeliveryReceipt[];
  schedule: ScheduleEntry[];
  assets: Asset[];
  loans: AssetLoan[];
  cases: CaseRecord[];
  users: any[];
  dailyBriefing?: BriefingData;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'sync';
}

const App: React.FC = () => {
  // ✅ 1) Creamos una referencia NO NULA para TypeScript
  const sb = supabase;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState<ViewName>('dashboard');
  const [selectedAudit, setSelectedAudit] = useState<AuditState | null>(null);
  const [auditToEdit, setAuditToEdit] = useState<AuditState | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [isTravelMode, setIsTravelMode] = useState(false);

  const syncInProgress = useRef(false);

  const [userData, setUserData] = useState<UserData>(() => {
    const saved = localStorage.getItem('xana_hybrid_cache');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          version: DATA_VERSION,
          pharmacies: parsed.pharmacies || [],
          audits: parsed.audits || [],
          cctvRecords: parsed.cctvRecords || [],
          physicalRecords: parsed.physicalRecords || [],
          managementRecords: parsed.managementRecords || [],
          pendingRecords: parsed.pendingRecords || [],
          staffRecords: parsed.staffRecords || [],
          supportRecords: parsed.supportRecords || [],
          deliveryReceipts: parsed.deliveryReceipts || [],
          schedule: parsed.schedule || [],
          assets: parsed.assets || [],
          loans: parsed.loans || [],
          cases: parsed.cases || [],
          users: parsed.users || [],
          dailyBriefing: parsed.dailyBriefing
        };
      } catch (e) {
        console.error(e);
      }
    }

    return {
      version: DATA_VERSION,
      pharmacies: [],
      audits: [],
      cctvRecords: [],
      physicalRecords: [],
      managementRecords: [],
      pendingRecords: [],
      staffRecords: [],
      supportRecords: [],
      deliveryReceipts: [],
      schedule: [],
      assets: [],
      loans: [],
      cases: [],
      users: [],
      dailyBriefing: undefined
    };
  });

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'sync') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // --- PARCHE DE SEGURIDAD PARA LOCALSTORAGE ---
  useEffect(() => {
    try {
      localStorage.setItem('xana_hybrid_cache', JSON.stringify(userData));
    } catch (error: any) {
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        console.warn("⚠️ Cache excedida. Limpiando para evitar bloqueo de App.");
        // Si se llena, borramos la caché local. La app seguirá funcionando porque 
        // los datos están en el estado `userData` de React y se recuperarán de la nube en el próximo sync.
        localStorage.removeItem('xana_hybrid_cache');
      }
    }
  }, [userData]);
  // ---------------------------------------------

  useEffect(() => {
    const sessionUser = sessionStorage.getItem('xana_active_user');
    if (sessionUser) setCurrentUser(JSON.parse(sessionUser));
  }, []);

  const isReadOnly = useMemo(() => {
    if (!currentUser || !currentUser.email) return false;
    return currentUser.email.trim().toLowerCase() === 'directiva@xana.com';
  }, [currentUser]);

  const isBoss = useMemo(() => {
    if (!currentUser) return false;
    const email = currentUser.email ? currentUser.email.trim().toLowerCase() : '';
    if (email === 'directiva@xana.com') return true;
    const role = (currentUser.role || '').toLowerCase();
    return ['super usuario', 'gerente corporativo de seguridad', 'gerente de seguridad', 'lider de investigaciones'].includes(role);
  }, [currentUser]);

  const visiblePharmacies = useMemo(() => {
    if (!userData.pharmacies) return [];
    if (isBoss || isTravelMode) {
      return userData.pharmacies;
    }
    return userData.pharmacies.filter(p => p.zone === currentUser?.zone);
  }, [userData.pharmacies, currentUser, isBoss, isTravelMode]);

  const checkPermission = () => {
    if (isReadOnly) {
      addToast("Modo Lectura: Acceso Denegado", "error");
      return false;
    }
    return true;
  };

  const saveToCloud = async (table: string, id: string, data: any) => {
    if (!checkPermission()) return;
    if (!sb || !currentUser) return;

    try {
      const realZone =
        data.zone ||
        (data.pharmacy && data.pharmacy.zone) ||
        currentUser.zone ||
        'Global';

      const payload: any = { id, data, created_by: currentUser.fullName || currentUser.email, zone: realZone };

      const pharmacyId = data.pharmacyId || (data.pharmacy && data.pharmacy.id);
      if (pharmacyId) payload.pharmacy_id = pharmacyId;

      const { error } = await sb.from(table).upsert(payload);
      if (error) throw error;

      addToast("Guardado", "success");
    } catch (e) {
      addToast("Error al Guardar", "error");
    }
  };

  const deleteFromCloud = async (table: string, id: string) => {
    if (!checkPermission()) return;
    if (!sb) return;

    try {
      const { error } = await sb.from(table).delete().eq('id', id);
      if (error) throw error;
      addToast("Eliminado Correctamente", "success");
    } catch (e) {
      addToast("Error al borrar", "error");
    }
  };

  const handleUpdateUser = async (email: string, updates: any) => {
    if (!checkPermission()) return;
    if (!sb) return;

    try {
      const dbUpdates: any = {};
      if (updates.isApproved !== undefined) dbUpdates.is_approved = updates.isApproved;
      if (updates.isBlocked !== undefined) dbUpdates.is_blocked = updates.isBlocked;

      const { error } = await sb.from('users').update(dbUpdates).eq('email', email);
      if (error) throw error;

      setUserData(prev => ({
        ...prev,
        users: prev.users.map(u => (u.email === email ? { ...u, ...updates } : u))
      }));

      addToast("Usuario actualizado", "success");
    } catch (e) {
      addToast("Error", "error");
    }
  };

  const fullSync = useCallback(async (user: any) => {
    if (!user || !sb || syncInProgress.current) return;
    syncInProgress.current = true;
    setIsSyncing(true);

    try {
      const role = (user.role || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const userIsBoss =
        ['super usuario', 'gerente corporativo de seguridad', 'gerente de seguridad', 'lider de investigaciones'].includes(role) ||
        email === 'directiva@xana.com';

      const getTableData = async (table: string) => {
        let q: any = sb.from(table).select('*');
        if (!userIsBoss && !['pharmacies', 'users'].includes(table)) {
          q = q.eq('created_by', user.fullName);
        }
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
      };

      const pharmQuery = sb.from('pharmacies').select('*').order('name');

      const [
        pharms,
        auds,
        cctvs,
        phys,
        mgmts,
        pends,
        stfs,
        supps,
        recs,
        assts,
        lns,
        casesData,
        dbUsers,
        schs
      ] = await Promise.all([
        pharmQuery,
        getTableData('audits'),
        getTableData('cctv_records'),
        getTableData('physical_records'),
        getTableData('management_visits'),
        getTableData('pending_tasks'),
        getTableData('staff'),
        getTableData('support_contacts'),
        getTableData('delivery_receipts'),
        getTableData('assets'),
        getTableData('loans'),
        getTableData('cases'),
        sb.from('users').select('*'),
        getTableData('schedule')
      ]);

      const process = (items: any[]) =>
        items.map(item => {
          if (item.data && typeof item.data === 'object' && !Array.isArray(item.data)) {
            return { ...item.data, id: item.id || item.data.id, createdBy: item.created_by || item.data.createdBy };
          }
          return { ...item, createdBy: item.created_by || item.createdBy };
        });

      setUserData(prev => {
        const cloudPharms = (pharms.data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          address: p.address,
          zone: p.zone,
          status: p.status,
          risk: p.risk,
          corporatePhone: (p as any).corporate_phone ?? (p as any).corporatePhone,
          photo: p.photo,
          location: p.location,
          hasSecurityOfficer: (p as any).has_security_officer ?? (p as any).hasSecurityOfficer
        }));

        if (cloudPharms.length === 0 && prev.pharmacies.length > 0 && !(pharms as any).data) return prev;

        return {
          ...prev,
          pharmacies: cloudPharms,
          audits: process(auds),
          cctvRecords: process(cctvs),
          physicalRecords: process(phys),
          managementRecords: process(mgmts),
          pendingRecords: process(pends),
          staffRecords: process(stfs),
          supportRecords: process(supps),
          deliveryReceipts: process(recs),
          assets: process(assts),
          loans: process(lns),
          cases: process(casesData),
          schedule: process(schs),
          users: ((dbUsers.data) || []).map((u: any) => ({
            ...u,
            fullName: u.full_name,
            isApproved: u.is_approved,
            isBlocked: u.is_blocked
          }))
        };
      });

      addToast("Datos Sincronizados", "sync");
    } catch (e) {
      console.error("Sync error:", e);
      addToast("Modo Offline Activo", "sync");
    } finally {
      setIsSyncing(false);
      syncInProgress.current = false;
    }
  }, [addToast, sb]);

  useEffect(() => {
    if (currentUser) fullSync(currentUser);
  }, [currentUser, fullSync]);

  const handleEditAuditRequest = (audit: AuditState) => {
    setAuditToEdit(audit);
    setCurrentView('audit-wizard');
  };

  const calculateAuditScore = (audit: AuditState) => {
    const hardwareWeights = {
      '1. ALARMAS Y DISPOSITIVOS': 0.10,
      '2. SISTEMAS CCTV': 0.40,
      '3. CAJAS FUERTES': 0.10,
      '4. ACCESOS Y PROTECTORES': 0.30,
      '5. OTROS': 0.10,
    };

    const processWeights = {
      '1. CAJA (10%)': 0.10,
      '2. ADMINISTRATIVO (25%)': 0.25,
      '3. INVENTARIO (50%)': 0.50,
      '4. PREVENCIÓN (15%)': 0.15,
    };

    let totalHwScore = 0;
    Object.keys(hardwareWeights).forEach(cat => {
      const items = HARDWARE_CHECKLIST.filter(i => i.category === cat);
      if (items.length === 0) return;

      let validItems = 0;
      let scoreSum = 0;

      items.forEach(item => {
        const answer = audit.hardwareAnswers[item.id];
        if (answer?.status && answer.status !== 'N/A') {
          validItems++;
          if (answer.status === 'Operativo') scoreSum += 1;
        }
      });

      const compliance = validItems > 0 ? (scoreSum / validItems) : 0;
      const weight = hardwareWeights[cat as keyof typeof hardwareWeights];
      totalHwScore += compliance * weight;
    });

    let totalProcScore = 0;
    Object.keys(processWeights).forEach(cat => {
      const items = PROCESS_CHECKLIST.filter(i => i.category === cat);
      if (items.length === 0) return;

      let validItems = 0;
      let scoreSum = 0;

      items.forEach(item => {
        const answer = audit.processAnswers[item.id];
        if (answer?.status && answer.status !== 'N/A') {
          validItems++;
          if (answer.status === 'SI') scoreSum += 1;
        }
      });

      const compliance = validItems > 0 ? (scoreSum / validItems) : 0;
      const weight = processWeights[cat as keyof typeof processWeights];
      totalProcScore += compliance * weight;
    });

    const rawScore = (totalHwScore * 100 * 0.40) + (totalProcScore * 100 * 0.60);
    const finalScore = Math.max(0, Math.min(100, Number(rawScore.toFixed(2))));
    return finalScore;
  };

  const getRiskLevel = (score: number): 'Bajo' | 'Moderado' | 'Medio' | 'Alto' | 'Extremo' => {
    if (score >= 95) return 'Bajo';
    if (score >= 85) return 'Moderado';
    if (score >= 75) return 'Medio';
    if (score >= 65) return 'Alto';
    return 'Extremo';
  };

  const handleFinishAudit = async (audit: AuditState) => {
    if (!checkPermission()) return;

    const isEditing = !!auditToEdit;
    const auditId = isEditing && auditToEdit?.id ? auditToEdit.id : `audit-${Date.now()}`;
    const score = calculateAuditScore(audit);
    const risk = getRiskLevel(score);
    const date = isEditing && auditToEdit?.date ? auditToEdit.date : new Date().toLocaleDateString('es-ES');

    const updatedPharmacy = audit.pharmacy
      ? { ...audit.pharmacy, risk }
      : audit.pharmacy;

    const completedAudit: any = {
      ...audit,
      id: auditId,
      date,
      score,
      pharmacy: updatedPharmacy,
      createdBy: currentUser.fullName || currentUser.email,
      reportLocked: (auditToEdit as any)?.reportLocked ?? false
    };

    setUserData(prev => {
      const newAudits = isEditing
        ? prev.audits.map(a => (a.id === auditId ? completedAudit : a))
        : [completedAudit, ...prev.audits];

      const newPharmacies = updatedPharmacy
        ? prev.pharmacies.map(p => (p.id === updatedPharmacy.id ? updatedPharmacy : p))
        : prev.pharmacies;

      return { ...prev, audits: newAudits, pharmacies: newPharmacies };
    });

    if (updatedPharmacy) {
      await sb.from('pharmacies').upsert({
        id: updatedPharmacy.id,
        name: updatedPharmacy.name,
        address: updatedPharmacy.address,
        zone: updatedPharmacy.zone,
        status: updatedPharmacy.status,
        risk: updatedPharmacy.risk,
        corporate_phone: updatedPharmacy.corporatePhone,
        photo: updatedPharmacy.photo,
        location: updatedPharmacy.location,
        has_security_officer: updatedPharmacy.hasSecurityOfficer
      });
    }

    await saveToCloud('audits', auditId, completedAudit);
    setAuditToEdit(null);
    setSelectedAudit(completedAudit);
    setCurrentView('audit-results');
  };

  const getFilteredUsers = () => {
    return userData.users.filter(u => {
      const email = (u.email || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      return email !== 'directiva@xana.com' && role !== 'super usuario';
    });
  };

  if (!sb) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-black mb-2">Error de Configuración</h1>
          <p className="text-slate-300 text-sm font-medium">
            No se pudo inicializar Supabase. Revisa las variables de entorno (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY) en Vercel.
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Login
        onLogin={(u) => {
          setCurrentUser(u);
          sessionStorage.setItem('xana_active_user', JSON.stringify(u));
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen font-sans text-slate-900 overflow-x-hidden">
      <div className="fixed top-6 right-6 z-[250] space-y-3 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in slide-in-from-right-10 duration-300 pointer-events-auto ${
              toast.type === 'success'
                ? 'bg-emerald-500 text-white'
                : toast.type === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-slate-800 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : toast.type === 'error' ? (
              <XCircle className="w-5 h-5" />
            ) : (
              <WifiOff className="w-5 h-5" />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
          </div>
        ))}
      </div>

      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          if (view !== 'audit-wizard') setAuditToEdit(null);
          setCurrentView(view);
        }}
        user={currentUser}
        onLogout={() => {
          setCurrentUser(null);
          sessionStorage.removeItem('xana_active_user');
        }}
        isSyncing={isSyncing}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isTravelMode={isTravelMode}
        onToggleTravelMode={() => setIsTravelMode(!isTravelMode)}
      />

      <button
        onClick={() => setIsSidebarOpen(true)}
        className="lg:hidden fixed top-6 left-6 z-50 p-4 bg-slate-900/80 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-white/10"
      >
        <Menu className="w-6 h-6" />
      </button>

      <main
        className={`flex-1 transition-all duration-300 lg:ml-80 p-4 md:p-6 ${
          isSidebarOpen ? 'blur-sm pointer-events-none lg:blur-none lg:pointer-events-auto' : ''
        }`}
      >
        {currentView === 'dashboard' && (
          <Dashboard
            onNavigate={setCurrentView}
            pharmacies={visiblePharmacies}
            audits={userData.audits}
            cctvRecords={userData.cctvRecords}
            physicalRecords={userData.physicalRecords}
            managementRecords={userData.managementRecords}
            onSelectAudit={(a) => {
              setSelectedAudit(a);
              setCurrentView('audit-results');
            }}
            readOnly={isReadOnly}
          />
        )}

        {currentView === 'ai-assistant' && !isReadOnly && (
          <AIAssistant
            pharmacies={visiblePharmacies}
            audits={userData.audits}
            cctvRecords={userData.cctvRecords}
            physicalRecords={userData.physicalRecords}
            pendingRecords={userData.pendingRecords}
            staffRecords={userData.staffRecords}
            schedule={userData.schedule}
            dailyBriefing={userData.dailyBriefing}
            onSaveSchedule={async (s) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, schedule: s }));
              if (s.length > 0) await saveToCloud('schedule', s[0].id, s[0]);
            }}
            onSaveBriefing={(b) => setUserData(prev => ({ ...prev, dailyBriefing: b }))}
            onAddPending={async (p) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, pendingRecords: [p, ...prev.pendingRecords] }));
              await saveToCloud('pending_tasks', p.id, p);
            }}
          />
        )}

        {currentView === 'audit-wizard' && !isReadOnly && (
          <AuditWizard
            onCancel={() => {
              setAuditToEdit(null);
              setCurrentView('dashboard');
            }}
            onFinish={handleFinishAudit}
            pharmacies={visiblePharmacies}
            initialAudit={auditToEdit}
            onAddPharmacy={async (p) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, pharmacies: [...prev.pharmacies, p] }));
              await sb.from('pharmacies').insert({
                id: p.id,
                name: p.name,
                address: p.address,
                zone: p.zone,
                status: p.status,
                risk: p.risk,
                corporate_phone: p.corporatePhone,
                photo: p.photo,
                location: p.location,
                has_security_officer: p.hasSecurityOfficer
              });
            }}
          />
        )}

        {currentView === 'audit-results' && selectedAudit && (
          <AuditResults
            audit={selectedAudit}
            onBack={() => setCurrentView('dashboard')}
            onSaveReport={async (id, text, lockReport = false) => {
              if (!checkPermission()) return;

              const updated = userData.audits.map(a =>
                a.id === id
                  ? { ...a, reportText: text, reportLocked: lockReport ? true : ((a as any).reportLocked ?? false) }
                  : a
              );

              setUserData(prev => ({ ...prev, audits: updated }));

              const aud = updated.find(x => x.id === id);
              if (aud) {
                if (selectedAudit?.id === id) setSelectedAudit(aud);
                await saveToCloud('audits', id, aud);
              }
            }}
          />
        )}

        {currentView === 'new-visit' && !isReadOnly && (
          <NewVisit
            pharmacies={visiblePharmacies}
            onCancel={() => setCurrentView('dashboard')}
            onSave={async (r) => {
              if (!checkPermission()) return;
              const rec = { ...r, createdBy: currentUser.fullName || currentUser.email };
              setUserData(prev => ({ ...prev, managementRecords: [rec, ...prev.managementRecords] }));
              await saveToCloud('management_visits', rec.id, rec);
              setCurrentView('visit-log');
            }}
          />
        )}

        {currentView === 'cctv-inventory' && !isReadOnly && (
          <CCTVInventory
            pharmacies={visiblePharmacies}
            records={userData.cctvRecords}
            onBack={() => setCurrentView('dashboard')}
            onSave={async (r) => {
              if (!checkPermission()) return;
              const rec = { ...r, createdBy: currentUser.fullName || currentUser.email };
              setUserData(prev => ({ ...prev, cctvRecords: [...prev.cctvRecords, rec] }));
              await saveToCloud('cctv_records', rec.id, rec);
            }}
            onAddPharmacy={() => {}}
          />
        )}

        {currentView === 'physical-inventory' && !isReadOnly && (
          <PhysicalInventory
            pharmacies={visiblePharmacies}
            records={userData.physicalRecords}
            onBack={() => setCurrentView('dashboard')}
            onSave={async (r) => {
              if (!checkPermission()) return;
              const rec = { ...r, createdBy: currentUser.fullName || currentUser.email };
              setUserData(prev => ({ ...prev, physicalRecords: [...prev.physicalRecords, rec] }));
              await saveToCloud('physical_records', rec.id, rec);
            }}
            onAddPharmacy={() => {}}
          />
        )}

        {currentView === 'pending-tasks' && !isReadOnly && (
          <PendingTasks
            pharmacies={visiblePharmacies}
            records={userData.pendingRecords}
            onAdd={async (r) => {
              if (!checkPermission()) return;
              const rec = { ...r, createdBy: currentUser.fullName || currentUser.email };
              setUserData(prev => ({ ...prev, pendingRecords: [rec, ...prev.pendingRecords] }));
              await saveToCloud('pending_tasks', rec.id, rec);
            }}
            onUpdateStatus={async (id, status) => {
              if (!checkPermission()) return;
              const updated = userData.pendingRecords.map(r => (r.id === id ? { ...r, status } : r));
              setUserData(prev => ({ ...prev, pendingRecords: updated }));
              const p = updated.find(x => x.id === id);
              if (p) await saveToCloud('pending_tasks', id, p);
            }}
            onDelete={async (id) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, pendingRecords: prev.pendingRecords.filter(r => r.id !== id) }));
              await deleteFromCloud('pending_tasks', id);
            }}
          />
        )}

        {currentView === 'delivery-receipts' && !isReadOnly && (
          <DeliveryReceipts
            receipts={userData.deliveryReceipts}
            onAdd={async (r) => {
              if (!checkPermission()) return;
              const rec = { ...r, createdBy: currentUser.fullName || currentUser.email };
              setUserData(prev => ({ ...prev, deliveryReceipts: [rec, ...prev.deliveryReceipts] }));
              await saveToCloud('delivery_receipts', rec.id, rec);
            }}
            onDelete={async (id) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, deliveryReceipts: prev.deliveryReceipts.filter(r => r.id !== id) }));
              await deleteFromCloud('delivery_receipts', id);
            }}
          />
        )}

        {currentView === 'asset-control' && !isReadOnly && (
          <AssetControl
            pharmacies={visiblePharmacies}
            assets={userData.assets}
            loans={userData.loans}
            onAddAsset={async (a) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, assets: [...prev.assets, a] }));
              await saveToCloud('assets', a.id, a);
            }}
            onUpdateAsset={async (a) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, assets: prev.assets.map(x => (x.id === a.id ? a : x)) }));
              await saveToCloud('assets', a.id, a);
            }}
            onDeleteAsset={async (id) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, assets: prev.assets.filter(x => x.id !== id) }));
              await deleteFromCloud('assets', id);
            }}
            onSaveLoan={async (l) => {
              if (!checkPermission()) return;
              const ln = { ...l, createdBy: currentUser.fullName || currentUser.email };
              setUserData(prev => ({ ...prev, loans: [ln, ...prev.loans] }));
              await saveToCloud('loans', ln.id, ln);
            }}
            onReturnLoan={async (id, date, notes) => {
              if (!checkPermission()) return;
              const updated = userData.loans.map(l =>
                l.id === id
                  ? { ...l, status: 'Devuelto' as const, actualReturnDate: date, notes: l.notes + " | RETORNO: " + notes }
                  : l
              );
              setUserData(p => ({ ...p, loans: updated }));
              const ln = updated.find(x => x.id === id);
              if (ln) await saveToCloud('loans', id, ln);
            }}
          />
        )}

        {currentView === 'visit-log' && (
          <VisitLog
            pharmacies={userData.pharmacies}
            audits={userData.audits}
            cctvRecords={userData.cctvRecords}
            physicalRecords={userData.physicalRecords}
            managementRecords={userData.managementRecords}
            users={getFilteredUsers()}
            currentUser={currentUser}
            onDeleteAudit={id => {
              if (!checkPermission()) return;
              setUserData(p => ({ ...p, audits: p.audits.filter(x => x.id !== id) }));
              deleteFromCloud('audits', id);
            }}
            onDeleteCCTV={id => {
              if (!checkPermission()) return;
              setUserData(p => ({ ...p, cctvRecords: p.cctvRecords.filter(x => x.id !== id) }));
              deleteFromCloud('cctv_records', id);
            }}
            onDeletePhysical={id => {
              if (!checkPermission()) return;
              setUserData(p => ({ ...p, physicalRecords: p.physicalRecords.filter(x => x.id !== id) }));
              deleteFromCloud('physical_records', id);
            }}
            onDeleteManagement={id => {
              if (!checkPermission()) return;
              setUserData(p => ({ ...p, managementRecords: p.managementRecords.filter(x => x.id !== id) }));
              deleteFromCloud('management_visits', id);
            }}
            hasAdminPrivileges={isBoss}
            onEditAudit={handleEditAuditRequest}
          />
        )}

        {currentView === 'monthly-summary' && (
          <MonthlySummary
            pharmacies={visiblePharmacies}
            audits={userData.audits}
            cctvRecords={userData.cctvRecords}
            physicalRecords={userData.physicalRecords}
            managementRecords={userData.managementRecords}
            pendingRecords={userData.pendingRecords}
            cases={userData.cases}
            users={getFilteredUsers()}
            currentUser={currentUser}
          />
        )}

        {currentView === 'management-report' && !isReadOnly && (
          <ManagementReport
            pharmacies={visiblePharmacies}
            audits={userData.audits}
            cctvRecords={userData.cctvRecords}
            physicalRecords={userData.physicalRecords}
            managementRecords={userData.managementRecords}
          />
        )}

        {currentView === 'case-management' && (
          <CaseManagement
            pharmacies={visiblePharmacies}
            cases={userData.cases}
            onAddCase={async (c) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, cases: [c, ...prev.cases] }));
              await saveToCloud('cases', c.id, c);
            }}
            onUpdateCase={async (c) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, cases: prev.cases.map(x => (x.id === c.id ? c : x)) }));
              await saveToCloud('cases', c.id, c);
            }}
            onDeleteCase={async (id) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, cases: prev.cases.filter(x => x.id !== id) }));
              await deleteFromCloud('cases', id);
            }}
            currentUser={currentUser}
            hasAdminPrivileges={isBoss}
          />
        )}

        {currentView === 'pharmacy-list' && (
          <PharmacyList
            pharmacies={visiblePharmacies}
            staffRecords={userData.staffRecords}
            onUpdate={async (p) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, pharmacies: prev.pharmacies.map(x => (x.id === p.id ? p : x)) }));
              await sb.from('pharmacies').upsert({
                id: p.id,
                name: p.name,
                address: p.address,
                zone: p.zone,
                status: p.status,
                risk: p.risk,
                corporate_phone: p.corporatePhone,
                photo: p.photo,
                location: p.location,
                has_security_officer: p.hasSecurityOfficer
              });
            }}
            onDelete={async (id) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, pharmacies: prev.pharmacies.filter(x => x.id !== id) }));
              await sb.from('pharmacies').delete().eq('id', id);
            }}
            onAdd={async (p) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, pharmacies: [...prev.pharmacies, p] }));
              await sb.from('pharmacies').insert({
                id: p.id,
                name: p.name,
                address: p.address,
                zone: p.zone,
                status: p.status,
                risk: p.risk,
                corporate_phone: p.corporatePhone,
                photo: p.photo,
                location: p.location,
                has_security_officer: p.hasSecurityOfficer
              });
            }}
            currentUser={currentUser}
            isTravelMode={isTravelMode}
          />
        )}

        {currentView === 'staff-directory' && !isReadOnly && (
          <StaffDirectory
            pharmacies={visiblePharmacies}
            staffRecords={userData.staffRecords}
            readOnly={isReadOnly}
            onAddStaff={async (s) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, staffRecords: [s, ...prev.staffRecords] }));
              await saveToCloud('staff', s.id, s);
            }}
            onDeleteStaff={async (id) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, staffRecords: prev.staffRecords.filter(x => x.id !== id) }));
              await deleteFromCloud('staff', id);
            }}
          />
        )}

        {currentView === 'support-directory' && !isReadOnly && (
          <SupportDirectory
            pharmacies={visiblePharmacies}
            supportRecords={userData.supportRecords}
            onAddContact={async (c) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, supportRecords: [c, ...prev.supportRecords] }));
              await saveToCloud('support_contacts', c.id, c);
            }}
            onDeleteContact={async (id) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, supportRecords: prev.supportRecords.filter(x => x.id !== id) }));
              await deleteFromCloud('support_contacts', id);
            }}
          />
        )}

        {currentView === 'access-management' && !isReadOnly && (
          <AccessManagement
            users={userData.users}
            onApprove={(email) => handleUpdateUser(email, { isApproved: true, isBlocked: false })}
            onBlock={(email) => handleUpdateUser(email, { isBlocked: true })}
            onDelete={async (email) => {
              if (!checkPermission()) return;
              setUserData(prev => ({ ...prev, users: prev.users.filter(u => u.email !== email) }));
              await sb.from('users').delete().eq('email', email);
            }}
          />
        )}

        {currentView === 'settings' && !isReadOnly && (
          <Settings
            user={currentUser}
            onLogout={() => {
              setCurrentUser(null);
              sessionStorage.removeItem('xana_active_user');
            }}
          />
        )}
      </main>
    </div>
  );
};

export default App;
