import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Modal, Input, Select } from '../../components/ui/Components';
import { MOCK_UNITS, MOCK_PROFESSIONALS, BRAZILIAN_STATES } from '../../constants'; // Keep stats mocks for now
import { Municipality, MunicipalityInput, LicenseStatus } from '../../types';
import { Users, Edit2, Trash2, MapPin, Phone, Plus, Building2, Stethoscope, RefreshCw, Activity, Crown, Briefcase, Eye, AlertTriangle, ShieldCheck, Search, LayoutTemplate, Key, Upload, Info, CalendarClock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEntityData } from '../../hooks/useEntityData';
import { fetchMunicipalitiesByEntity, createMunicipality, updateMunicipality, deleteMunicipality } from '../../services/municipalitiesService';
import { fetchUnitsByEntity } from '../../services/unitsService';
import { fetchProfessionalsByEntity } from '../../services/professionalsService';
import { goalService } from '../../services/goalService';
import { connectorService } from '../../services/connectorService';
import { statsCache } from '../../services/statsCache';
import { Unit, Professional } from '../../types';
import { UserData, subscribeToEntityUsers, createUser, resetUserPassword, toggleUserStatus, deleteUser } from '../../services/usersService';
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import { logAction } from '../../services/logsService';

const Municipalities: React.FC = () => {
  const { user, claims, logout } = useAuth();
  const isCoordenacao = !!claims?.coordenation;
  const { entity, loading: loadingEntity } = useEntityData(claims?.entityId || '');

  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [productionStats, setProductionStats] = useState<Record<string, number>>({});
  const [allUsers, setAllUsers] = useState<UserData[]>([]);

  const [loading, setLoading] = useState(true); // Structure loading
  const [loadingStats, setLoadingStats] = useState(false); // Stats loading (background)

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubsedeModalOpen, setIsSubsedeModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [isToleranceModalOpen, setIsToleranceModalOpen] = useState(false);
  const [selectedMunForTolerance, setSelectedMunForTolerance] = useState<Municipality | null>(null);
  const [toleranceDaysInput, setToleranceDaysInput] = useState<number>(0);
  const [savingTolerance, setSavingTolerance] = useState(false);

  // Patient Modal State
  const [isPatientsModalOpen, setIsPatientsModalOpen] = useState(false);
  const [selectedMunForPatients, setSelectedMunForPatients] = useState<Municipality | null>(null);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  
  const [debouncedPatientSearchTerm, setDebouncedPatientSearchTerm] = useState('');
  const [hasMorePatients, setHasMorePatients] = useState(false);
  const [loadingMorePatients, setLoadingMorePatients] = useState(false);
  const [totalPatientsCount, setTotalPatientsCount] = useState(0);
  
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any | null>(null);
  const [editingPatientLoading, setEditingPatientLoading] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{current: number, total: number, files: number} | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const filteredMunicipalities = municipalities.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.codeIbge.includes(searchTerm)
  );

  // Form State
  const [formData, setFormData] = useState<Partial<MunicipalityInput>>({});
  const [subsedeEmail, setSubsedeEmail] = useState('');
  const [subsedeName, setSubsedeName] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Security Check
  useEffect(() => {
    // Access control is handled by Layout/AuthContext
  }, [claims]);

  // 1. Load Structure (Blocking - Fast)
  const loadStructure = async () => {
    if (!claims?.entityId) return;
    setLoading(true);
    try {
      const [municipalitiesData, unitsData, professionalsData] = await Promise.all([
        fetchMunicipalitiesByEntity(claims.entityId),
        fetchUnitsByEntity(claims.entityId),
        fetchProfessionalsByEntity(claims.entityId)
      ]);
      setMunicipalities(municipalitiesData);
      setUnits(unitsData);
      setProfessionals(professionalsData);
    } catch (error) {
      console.error("Error loading municipalities structure:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Load Production (Non-Blocking - Heavy)
  const loadProduction = async () => {
    if (!claims?.entityId || municipalities.length === 0) return;

    const currentYear = new Date().getFullYear().toString();

    setLoadingStats(true);
    try {
      const getMunicipalitiesStatsFn = httpsCallable(functions, 'getMunicipalitiesStats');
      const response = await getMunicipalitiesStatsFn({ year: currentYear });
      const data = response.data as any;

      setProductionStats(data.statsByMun || {});

    } catch (error) {
      console.error("Error loading production stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Initial Load (Structure)
  useEffect(() => {
    loadStructure();
  }, [claims?.entityId]);

  // Secondary Load (Production) - Depends on Structure
  useEffect(() => {
    if (!loading && municipalities.length > 0) {
      loadProduction();
    }
  }, [loading, municipalities]); // Triggered after structure loads

  // Load Users
  useEffect(() => {
    if (!claims?.entityId) return;
    const unsubscribe = subscribeToEntityUsers(claims.entityId, (fetchedUsers) => {
      setAllUsers(fetchedUsers);
    });
    return () => unsubscribe();
  }, [claims?.entityId]);

  const handleOpenModal = (municipality?: Municipality, viewMode: boolean = false) => {
    setIsViewMode(viewMode);
    if (municipality) {
      setEditingId(municipality.id);
      setFormData({
        ...municipality,
        // Ensure fields are mapped correctly if needed
      });
    } else {
      setEditingId(null);
      // Preenchimento automático com dados da Entidade Logada
      setFormData({
        name: '',
        state: 'SP', // Default
        uf: 'SP',
        codeIbge: '',

        // Dados Contratuais Automáticos
        managerEntityType: (entity?.entityKind as any) || 'Prefeitura',
        responsibleEntity: entity?.name || '',
        cnpj: entity?.cnpj || '',
        linkedEntityId: claims?.entityId || '',
        linkedEntityName: entity?.name || '',

        secretaryName: '',
        mayorName: '',
        email: '',
        phone: '',
        address: '',
        population: 0,
        active: true,
        status: LicenseStatus.ACTIVE,
        interfaceType: 'SIMPLIFIED',
        productionToleranceDays: 0
      });
    }

    // Reset subsede form fields
    setSubsedeEmail('');
    setSubsedeName('');
    setGeneratedPassword(null);
    setIsModalOpen(true);
  };

  const handleOpenSubsedeModal = (municipality: Municipality) => {
    setEditingId(municipality.id);
    setSubsedeEmail('');
    setSubsedeName('');
    setGeneratedPassword(null);
    setIsSubsedeModalOpen(true);
  };

  const handleOpenToleranceModal = (mun: Municipality) => {
    setSelectedMunForTolerance(mun);
    setToleranceDaysInput(mun.productionToleranceDays || 0);
    setIsToleranceModalOpen(true);
  };

  const handleSaveTolerance = async () => {
    if (!selectedMunForTolerance || !claims?.entityId) return;
    setSavingTolerance(true);
    try {
      await updateMunicipality(selectedMunForTolerance.id, { productionToleranceDays: toleranceDaysInput }, { linkedEntityId: claims.entityId });
      
      await logAction({
        action: 'CONFIG',
        target: 'MUNICIPALITY',
        description: `Configurou a tolerância de produção para ${toleranceDaysInput} dia(s) retroativos.`,
        entityId: claims.entityId,
        municipalityId: selectedMunForTolerance.id
      });

      setMunicipalities(prev => prev.map(m => m.id === selectedMunForTolerance.id ? { ...m, productionToleranceDays: toleranceDaysInput } : m));
      setIsToleranceModalOpen(false);
      setSelectedMunForTolerance(null);
    } catch (err: any) {
      alert("Erro ao salvar tolerância: " + err);
    } finally {
      setSavingTolerance(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este vínculo?')) {
      try {
        // We know the entityId from claims
        await deleteMunicipality(id, { linkedEntityId: claims?.entityId || '' });
        setMunicipalities(prev => prev.filter(m => m.id !== id));
      } catch (error) {
        alert("Erro ao excluir: " + error);
      }
    }
  };

  const toggleStatus = async (id: string) => {
    const muni = municipalities.find(m => m.id === id);
    if (!muni) return;

    const newStatus = !muni.active;

    if (!newStatus) {
      alert("Suspender o município não diminui automaticamente o valor da licença. Para alterações no valor da licença, exclua o município da sua base ou entre em contato com o suporte.");
    }

    try {
      await updateMunicipality(id, { active: newStatus }, { linkedEntityId: claims?.entityId || '' });
      setMunicipalities(prev => prev.map(m =>
        m.id === id ? { ...m, active: newStatus, status: newStatus ? LicenseStatus.ACTIVE : LicenseStatus.SUSPENDED } : m
      ));
    } catch (error) {
      alert("Erro ao atualizar status: " + error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;

    if (!claims?.entityId) {
      alert("Erro de autenticação: Entity ID não encontrado.");
      return;
    }

    const dataToSave: MunicipalityInput = {
      ...formData as MunicipalityInput,
      linkedEntityId: claims.entityId, // Enforce linkage
      linkedEntityName: entity?.name || formData.linkedEntityName || '',
      uf: formData.state || formData.uf || 'SP', // Sync
      state: formData.uf || formData.state || 'SP', // Sync

      active: formData.active !== undefined ? formData.active : true,
      status: formData.active ? LicenseStatus.ACTIVE : LicenseStatus.SUSPENDED,
      interfaceType: 'SIMPLIFIED',
      productionToleranceDays: formData.productionToleranceDays !== undefined ? Number(formData.productionToleranceDays) : 0
    };

    try {
      if (editingId) {
        await updateMunicipality(editingId, dataToSave, {
          linkedEntityId: claims.entityId
        });
        setMunicipalities(prev => prev.map(m => m.id === editingId ? { ...m, ...dataToSave, id: editingId } as Municipality : m));
      } else {
        const newId = await createMunicipality(dataToSave);
        setMunicipalities(prev => [...prev, { ...dataToSave, id: newId } as Municipality]);
      }
      setIsModalOpen(false);
    } catch (error) {
      alert("Erro ao salvar: " + error);
    }
  };

  // Helper para contar dados vinculados
  const getStats = (municipalityId: string) => {
    const municipality = municipalities.find(m => m.id === municipalityId);
    const munUnits = units.filter(u => u.municipalityId === municipalityId);

    const unitsCount = municipality?.unitsCount || munUnits.length;

    // Count unique professionals linked to this municipality via assignments
    const prosCount = professionals.filter(p => {
      // Check assignments
      if (p.assignments && p.assignments.length > 0) {
        return p.assignments.some(a => a.municipalityId === municipalityId);
      }
      // Fallback for legacy data
      return p.municipalityId === municipalityId;
    }).length;

    // Real Production Count (Manual + Extracted)
    const productionCount = productionStats[municipalityId] || 0;

    return { unitsCount, prosCount, productionCount };
  };

  // Funções de Gestão SUBSEDE
  const currentSubsedeUsers = editingId ? allUsers.filter(u => u.organizationId === editingId && u.role === 'SUBSEDE') : [];

  const handleCreateSubsedeAccess = async () => {
    if (!subsedeEmail || !subsedeName || !editingId || !claims?.entityId) return;
    setActionLoading(true);
    setGeneratedPassword(null);
    try {
      const muni = municipalities.find(m => m.id === editingId);
      const orgName = muni ? `Filial: ${muni.name} (${muni.uf})` : 'Desconhecido';

      const dataToSave: Partial<UserData> = {
        name: subsedeName,
        email: subsedeEmail,
        cpf: '000.000.000-00', // Mock CPF since it's required by schema but not relevant here
        phone: '',
        role: 'SUBSEDE', // Use the SUBSEDE role
        organizationId: editingId,
        organizationName: orgName,
        entityType: claims?.entityType || 'PRIVATE',
        status: 'active'
      };

      const result = await createUser(dataToSave);
      if (result.password) {
        setGeneratedPassword(result.password);
      } else {
        alert('Usuário criado. Peça para o usuário verificar o e-mail para definir a senha.');
      }
    } catch (error: any) {
      alert(`Erro ao criar acesso: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetSubsedeAccess = async (user: UserData) => {
    if (confirm(`Deseja redefinir a senha para ${user.email}?`)) {
      setActionLoading(true);
      try {
        const result = await resetUserPassword(user.id);
        if (result.password) {
          setGeneratedPassword(result.password);
        } else {
          alert('Senha redefinida com sucesso! E-mail de recuperação enviado.');
        }
      } catch (error: any) {
        alert(`Erro ao redefinir senha: ${error.message}`);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleToggleSubsedeStatus = async (user: UserData) => {
    setActionLoading(true);
    try {
      const newStatus = user.status === 'active' ? 'suspended' : 'active';
      await toggleUserStatus(user.id, newStatus);
    } catch (error: any) {
      alert(`Erro ao alterar status: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubsedeAccess = async (user: UserData) => {
    if (confirm(`Deseja realmente excluir o acesso de ${user.email}? Esta ação não pode ser desfeita.`)) {
      setActionLoading(true);
      try {
        await deleteUser(user.id);
        // The user will automatically disappear due to the snapshot subscription
      } catch (error: any) {
        alert(`Erro ao excluir acesso: ${error.message}`);
      } finally {
        setActionLoading(false);
      }
    }
  };


  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPatientSearchTerm(patientSearchTerm);
    }, 600);
    return () => clearTimeout(handler);
  }, [patientSearchTerm]);

  const fetchPatients = async (mun: Municipality, reset: boolean = true) => {
    if (reset) {
        setLoadingPatients(true);
        // setPatientsList([]); // Optional flash, better to keep old data until new arrives
    } else {
        setLoadingMorePatients(true);
    }
    try {
      const getPatientsFn = httpsCallable(functions, 'getMunicipalityPatients');
      const payload: any = { 
          municipalityId: mun.id, 
          entityType: claims?.entityType || 'PRIVATE',
          searchTerm: debouncedPatientSearchTerm
      };
      
      if (!reset && patientsList.length > 0) {
          payload.lastDocId = patientsList[patientsList.length - 1].id;
      }

      const response = await getPatientsFn(payload);
      const data = response.data as any;
      
      if (reset) {
        setPatientsList(data.patients || []);
      } else {
        setPatientsList(prev => [...prev, ...(data.patients || [])]);
      }
      setTotalPatientsCount(data.totalCount || 0);
      setHasMorePatients(data.hasMore || false);
    } catch (error) {
       console.error(error);
       alert("Erro ao buscar pacientes.");
    } finally {
       setLoadingPatients(false);
       setLoadingMorePatients(false);
    }
  };

  const handleOpenPatientsModal = async (mun: Municipality) => {
    setSelectedMunForPatients(mun);
    setPatientSearchTerm('');
    setDebouncedPatientSearchTerm('');
    setIsPatientsModalOpen(true);
  };

  useEffect(() => {
    if (isPatientsModalOpen && selectedMunForPatients) {
       fetchPatients(selectedMunForPatients, true);
    }
  }, [debouncedPatientSearchTerm, isPatientsModalOpen, selectedMunForPatients?.id]);

  const handleEditPatient = (patient: any) => {
     setEditingPatient({ ...patient });
     setIsEditPatientModalOpen(true);
  };

  const handleDeletePatient = async (patientId: string) => {
    if (confirm('Tem certeza que deseja excluir permanentemente este paciente da base do município?')) {
        try {
            const deleteFn = httpsCallable(functions, 'deletePatientRecord');
            await deleteFn({
                 municipalityId: selectedMunForPatients!.id,
                 patientId: patientId,
                 entityType: claims?.entityType || 'PRIVATE'
            });
            setPatientsList(prev => prev.filter(p => p.id !== patientId));
        } catch(error) {
            console.error(error);
            alert("Erro ao deletar paciente.");
        }
    }
  };

  const handleSavePatientEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingPatient) return;
      setEditingPatientLoading(true);
      try {
          const updateFn = httpsCallable(functions, 'updatePatientRecord');
          await updateFn({
               municipalityId: selectedMunForPatients!.id,
               patientId: editingPatient.id,
               patientData: editingPatient,
               entityType: claims?.entityType || 'PRIVATE'
          });
          setPatientsList(prev => prev.map(p => p.id === editingPatient.id ? editingPatient : p));
          setIsEditPatientModalOpen(false);
      } catch (error) {
          console.error(error);
          alert("Erro ao atualizar paciente.");
      } finally {
          setEditingPatientLoading(false);
      }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedMunForPatients) return;

    setImporting(true);
    try {
      const patientsData: any[] = [];
      const seenIds = new Set<string>();
      let emptyIgnored = 0;
      let localDuplicatesIgnored = 0;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();
        let jsonObj;
        try {
           jsonObj = JSON.parse(text);
        } catch (e) {
           console.warn(`Arquivo ignorado (JSON inválido): ${file.name}`);
           continue;
        }
        
        const keys = Object.keys(jsonObj);
        
        for (const key of keys) {
          const row = jsonObj[key];
          if (!row || typeof row !== 'object') continue;
          
          const col1 = (row.col_1 || '').toString().replace(/\D/g, ''); // CNS or CPF
          if (!col1) {
              emptyIgnored++;
              continue; // Ignorar sem CNS/CPF
          }

          if (seenIds.has(col1)) {
              localDuplicatesIgnored++;
              continue; // Duplicado no próprio lote do cliente
          }
          seenIds.add(col1);

          const col2 = (row.col_2 || '').toString().trim(); // Name
          const col3 = (row.col_3 || '').toString().trim(); // DOB DD/MM/YYYY
          
          let cns = '';
          let cpf = '';
          if (col1.length === 11) cpf = col1;
          else if (col1.length === 15) cns = col1;
          
          let dob = '';
          let ageStr = '';
          if (col3) {
             const parts = col3.split('/');
             if (parts.length === 3) {
                dob = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
                const birthDate = new Date(dob);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                ageStr = age >= 0 ? age.toString() : '';
             }
          }
          
          if (!col2) continue; // Skip empty rows

          patientsData.push({
             cns,
             cpf,
             name: col2,
             dob,
             age: ageStr,
             isHomeless: false,
             nationality: "010",
             sex: "",
             unitId: ""
          });
        }
      }
      
      const chunkArray = (arr: any[], size: number) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
           chunks.push(arr.slice(i, i + size));
        }
        return chunks;
      };

      const chunks = chunkArray(patientsData, 500);
      const importFn = httpsCallable(functions, 'importPatientsBatch');
      
      let totalImported = 0;
      let totalDuplicates = localDuplicatesIgnored;

      if (chunks.length > 0) {
         setImportProgress({ current: 0, total: chunks.length, files: files.length });
      }
      
      for (let i = 0; i < chunks.length; i++) {
         const chunk = chunks[i];
         const res = await importFn({
             municipalityId: selectedMunForPatients.id,
             entityType: claims?.entityType || 'PRIVATE',
             patientsData: chunk
         });
         
         const data = res.data as any;
         totalImported += data.count || 0;
         totalDuplicates += data.duplicates || 0;
         
         setImportProgress(prev => prev ? { ...prev, current: i + 1 } : null);
      }
      
      alert(
          `Processamento de ${files.length} arquivo(s) concluído!\n\n` +
          `• Adicionados com sucesso: ${totalImported}\n` +
          `• Ignorados (Sem CPF/CNS definidos): ${emptyIgnored}\n` +
          `• Ignorados (Já existiam/Duplicados): ${totalDuplicates}`
      );
      
      // Auto-refresh list
      handleOpenPatientsModal(selectedMunForPatients);
    } catch (error: any) {
      console.error(error);
      alert("Erro ao importar pacientes: Verifique se os objetos JSON contêm a estrutura de col_1, col_2, etc válidas. " + error.message);
    } finally {
      setImporting(false);
      setImportProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // O Backend Filter substitui o filtro local
  const filteredPatients = patientsList;


  if (loading || loadingEntity) {
    return <div className="p-8 text-center text-gray-500">Carregando municípios...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Municípios Gerenciados</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Visão geral das cidades parceiras.</p>
        </div>
        {!isCoordenacao && (
          <Button variant="secondary" className="flex items-center gap-2" onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" /> Vincular Município
          </Button>
        )}
      </div>

      <Card className="!p-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Buscar por nome ou código IBGE..."
            className="pl-9 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMunicipalities.map((mun) => {
          const { unitsCount, prosCount, productionCount } = getStats(mun.id);

          return (
            <Card key={mun.id} className="p-0 overflow-hidden hover:shadow-md transition-shadow group">
              <div className="h-24 bg-gradient-to-r from-emerald-500 to-teal-600 relative">
                <div className="absolute top-4 right-4 flex gap-2">
                  <button onClick={() => handleOpenModal(mun, true)} className="bg-white/20 backdrop-blur-sm p-1.5 rounded-lg text-white cursor-pointer hover:bg-white/30 transition-colors" title="Visualizar Detalhes">
                    <Eye className="w-4 h-4" />
                  </button>
                  {!isCoordenacao && (
                    <>
                      <button onClick={() => handleOpenPatientsModal(mun)} className="bg-blue-500/80 backdrop-blur-sm p-1.5 rounded-lg text-white cursor-pointer hover:bg-blue-500 transition-colors shadow-sm" title="Pacientes da Base">
                        <Users className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleOpenSubsedeModal(mun)} className="bg-orange-500/80 backdrop-blur-sm p-1.5 rounded-lg text-white cursor-pointer hover:bg-orange-500 transition-colors shadow-sm" title="Gerenciar Acesso Subsede">
                        <Key className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleOpenToleranceModal(mun)} className="bg-emerald-500/80 backdrop-blur-sm p-1.5 rounded-lg text-white cursor-pointer hover:bg-emerald-500 transition-colors shadow-sm" title="Configurar Tolerância Retroativa">
                        <CalendarClock className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleOpenModal(mun)} className="bg-white/20 backdrop-blur-sm p-1.5 rounded-lg text-white cursor-pointer hover:bg-white/30 transition-colors" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(mun.id)} className="bg-white/20 backdrop-blur-sm p-1.5 rounded-lg text-white cursor-pointer hover:bg-red-500/50 transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
                <div className="absolute -bottom-8 left-6">
                  <div className="h-16 w-16 rounded-xl bg-white dark:bg-gray-800 shadow-md flex items-center justify-center border-2 border-white dark:border-gray-700 text-2xl font-bold text-emerald-600">
                    {mun.uf || mun.state}
                  </div>
                </div>
              </div>
              <div className="pt-10 px-6 pb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-none">{mun.name}</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center font-medium">
                  <Crown className="w-3 h-3 mr-1" /> Pref. {mun.mayorName}
                </p>

                <div className="space-y-3 mt-4">
                  {/* População */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" /> População Est.
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{mun.population?.toLocaleString()}</span>
                  </div>

                  {/* Novos Contadores */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" /> Quant. Unidades
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{unitsCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-gray-400" /> Quant. Profissionais
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{prosCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-400" /> Produção Realizada
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      {loadingStats && productionStats[mun.id] === undefined ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
                      ) : (
                        productionCount.toLocaleString()
                      )}
                    </span>
                  </div>

                  {/* Endereço e Contato */}
                  <div className="text-sm space-y-1 pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                    <div className="flex items-center gap-2 text-gray-500">
                      <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{mun.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <Phone className="w-3 h-3 shrink-0" /> <span>{mun.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Footer com Status Clicável */}
                {mun.lediConfig?.integrationStatus === 'ACTIVE' && (
                  <div className="text-xs flex items-center justify-between p-2 rounded border mt-2 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50">
                    <span className="font-semibold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <LayoutTemplate className="w-3.5 h-3.5" />
                      Conector PEC
                    </span>
                    <Badge type="success" className="text-[10px]">
                      ATIVO
                    </Badge>
                  </div>
                )}

                {/* Footer com Status Clicável */}
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <button
                    onClick={() => toggleStatus(mun.id)}
                    className="group/btn flex items-center gap-2 focus:outline-none"
                    title="Clique para alterar o status"
                  >
                    <Badge type={mun.active ? 'success' : 'error'} className="transition-transform group-hover/btn:scale-105 cursor-pointer">
                      {mun.active ? 'Contrato Ativo' : 'Inativo'}
                    </Badge>
                    <RefreshCw className="w-3 h-3 text-gray-400 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal de Cadastro/Edição/Visualização */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isViewMode ? "Detalhes do Município" : (editingId ? "Editar Município" : "Vincular Novo Município")}
      >
        {/* Alerta de Licenciamento - Apenas na Criação */}
        {!editingId && !isViewMode && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 mb-6 rounded-r-lg dark:bg-emerald-900/20 dark:border-emerald-500">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-emerald-600 dark:text-emerald-500" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-emerald-700 dark:text-emerald-200">
                  Adicionar um município aumenta proporcionalmente o valor da licença por município desta entidade.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Seção 1: Dados Territoriais */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-emerald-600" /> Dados Territoriais
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do Município"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                disabled={isViewMode}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="UF"
                  value={formData.uf || 'SP'}
                  onChange={e => setFormData({ ...formData, uf: e.target.value, state: e.target.value })}
                  disabled={isViewMode}
                >
                  {BRAZILIAN_STATES.map(state => (
                    <option key={state.value} value={state.value}>{state.value}</option>
                  ))}
                </Select>
                <Input
                  label="Cód. IBGE"
                  value={formData.codeIbge || ''}
                  onChange={e => setFormData({ ...formData, codeIbge: e.target.value })}
                  disabled={isViewMode}
                  required
                />
              </div>
              <Input
                label="População Estimada"
                type="number"
                value={formData.population || ''}
                onChange={e => setFormData({ ...formData, population: Number(e.target.value) })}
                disabled={isViewMode}
                required
              />
            </div>
          </div>

          {/* Seção 2: Vínculo Contratual (Preenchido Automaticamente) */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center">
                <Briefcase className="w-4 h-4 mr-2 text-emerald-600" /> Vínculo Contratual
              </h4>
              {!editingId && !isViewMode && (
                <Badge type="neutral" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Auto-preenchido
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Tipo de Entidade Gestora"
                value={formData.managerEntityType || 'Prefeitura'}
                onChange={e => setFormData({ ...formData, managerEntityType: e.target.value as any })}
                disabled={true} // Locked
              >
                <option value="Prefeitura">Prefeitura Municipal</option>
                <option value="Consórcio">Consórcio Intermunicipal</option>
                <option value="Fundação">Fundação Pública</option>
                <option value="OS">Organização Social (OS)</option>
              </Select>
              <Input
                label="Entidade Responsável (Jurídica)"
                value={formData.responsibleEntity || ''}
                onChange={e => setFormData({ ...formData, responsibleEntity: e.target.value })}
                placeholder="Ex: Fundação..."
                disabled={true} // Locked
                required
              />
              <Input
                label="CNPJ da Entidade"
                value={formData.cnpj || ''}
                onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                placeholder="00.000.000/0001-00"
                disabled={true} // Locked
                required
              />
              <div className="flex items-end mb-4">
                <label className={`flex items-center space-x-2 p-2 rounded-lg transition-colors w-full border border-transparent ${isViewMode ? 'opacity-70' : 'hover:bg-white dark:hover:bg-gray-600 hover:border-gray-200 dark:hover:border-gray-500 cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={formData.active || false}
                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
                    disabled={isViewMode}
                    className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Contrato Ativo e Vigente</span>
                </label>
              </div>
            </div>
          </div>

          {/* Seção 3: Gestão e Contato */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <Users className="w-4 h-4 mr-2 text-emerald-600" /> Gestão e Contato
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do Prefeito(a)"
                value={formData.mayorName || ''}
                onChange={e => setFormData({ ...formData, mayorName: e.target.value })}
                disabled={isViewMode}
                required
              />
              <Input
                label="Nome do Secretário(a) de Saúde"
                value={formData.secretaryName || ''}
                onChange={e => setFormData({ ...formData, secretaryName: e.target.value })}
                disabled={isViewMode}
                required
              />
              <Input
                label="Email Oficial"
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                disabled={isViewMode}
                required
              />
              <Input
                label="Telefone de Contato"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                disabled={isViewMode}
                required
              />
              <Input
                label="Endereço da Secretaria"
                className="md:col-span-2"
                value={formData.address || ''}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                disabled={isViewMode}
                required
              />
            </div>
          </div>

          {/* The SUBSEDE Access section has been moved to its own quick-access Modal for better UX. */}

          <div className="mt-6 flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              {isViewMode ? 'Fechar' : 'Cancelar'}
            </Button>
            {!isViewMode && (
              <Button type="submit" variant="secondary">{editingId ? 'Salvar Alterações' : 'Vincular Município'}</Button>
            )}
          </div>
        </form>
      </Modal>

      {/* Modal Dedicado para Gestão de Acesso SUBSEDE */}
      <Modal
        isOpen={isSubsedeModalOpen}
        onClose={() => setIsSubsedeModalOpen(false)}
        title="Gestão de Acesso - SUBSEDE"
      >
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-100 dark:border-orange-800">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
            <Key className="w-4 h-4 mr-2 text-orange-600" /> Acesso Painel de Coordenação Local (Subsede)
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-6">
            Crie ou gerencie as credenciais exclusivas para que o Coordenador Local deste município possa acompanhar a produção, as metas e consultar o corpo clínico de forma independente (Read-Only).
          </p>

          {currentSubsedeUsers.length > 0 && (
            <div className="mb-6 space-y-4">
              <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Coordenadores Vinculados</h5>
              {currentSubsedeUsers.map(user => (
                <div key={user.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 font-bold text-lg border border-orange-200 dark:border-orange-800">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{user.email}</p>
                      </div>
                    </div>
                    <Badge type={user.status === 'active' ? 'success' : 'error'}>
                      {user.status === 'active' ? 'Ativo' : 'Suspenso'}
                    </Badge>
                  </div>
                  <div className="flex gap-2 justify-end pt-3 border-t border-gray-100 dark:border-gray-700/60 mt-3">
                    <Button type="button" variant="outline" size="sm" onClick={() => handleResetSubsedeAccess(user)} disabled={actionLoading}>
                      Zerar Senha
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleToggleSubsedeStatus(user)} disabled={actionLoading} className={user.status === 'active' ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}>
                      {user.status === 'active' ? 'Suspender' : 'Reativar'}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteSubsedeAccess(user)} disabled={actionLoading} className="text-gray-500 hover:text-red-600 hover:bg-red-50">
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4 pt-4 border-t border-orange-200 dark:border-orange-800/50">
            <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Novo Coordenador</h5>
            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Nome do Coordenador Local"
                value={subsedeName}
                onChange={e => setSubsedeName(e.target.value)}
                disabled={actionLoading}
                placeholder="Ex: João da Silva"
              />
              <Input
                label="E-mail de Acesso (Login)"
                type="email"
                value={subsedeEmail}
                onChange={e => setSubsedeEmail(e.target.value)}
                disabled={actionLoading}
                placeholder="coordenador@municipio.gov.br"
              />
            </div>

            {generatedPassword && (
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 font-mono text-center mt-4">
                <p className="text-xs text-orange-600 dark:text-orange-400 mb-1">Senha Gerada com Sucesso:</p>
                <span className="font-bold text-xl text-orange-700 dark:text-orange-300">{generatedPassword}</span>
                <p className="text-[10px] text-gray-400 mt-2">Copie e envie ao usuário novo. Ele poderá logar na aba Acesso Subsede.</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="button" variant="secondary" className="bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-500/20 w-full" onClick={handleCreateSubsedeAccess} disabled={!subsedeEmail || !subsedeName || actionLoading}>
                {actionLoading ? 'Gerando Acesso...' : 'Gerar Acesso Subsede'}
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="outline" onClick={() => setIsSubsedeModalOpen(false)}>
            Fechar
          </Button>
        </div>
      </Modal>

      {/* Modal de Listagem de Pacientes */}
      <Modal
        isOpen={isPatientsModalOpen}
        onClose={() => setIsPatientsModalOpen(false)}
        title={`Pacientes da Base - ${selectedMunForPatients?.name || ''}`}
        className="max-w-5xl w-full"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
             <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex-1">
               <Search className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
               <input
                 placeholder="Buscar por Nome, CNS ou CPF..."
                 className="pl-9 w-full rounded-lg bg-gray-50 dark:bg-gray-800 p-2.5 text-sm dark:text-white outline-none"
                 value={patientSearchTerm}
                 onChange={(e) => setPatientSearchTerm(e.target.value)}
               />
             </div>
             
             <button
               onClick={handleImportClick}
               disabled={importing}
               className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 whitespace-nowrap"
             >
               {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
               {importing 
                  ? (importProgress ? `Importando ${importProgress.current}/${importProgress.total}...` : 'Processando JSON...') 
                  : 'Importar Lotes'}
             </button>
             <input
               type="file"
               accept=".json"
               multiple
               className="hidden"
               ref={fileInputRef}
               onChange={handleFileChange}
             />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
             {loadingPatients ? (
                <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                   <RefreshCw className="w-6 h-6 animate-spin text-emerald-500 mb-2" />
                   Buscando pacientes no servidor...
                </div>
             ) : (
                <div className="overflow-x-auto max-h-[60vh]">
                   <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                      <thead className="bg-emerald-50 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-100 border-b border-emerald-100 dark:border-emerald-800/60 sticky top-0 z-10">
                         <tr>
                            <th className="px-4 py-3 font-semibold dark:text-gray-200">Nome do Paciente</th>
                            <th className="px-4 py-3 font-semibold dark:text-gray-200">CNS</th>
                            <th className="px-4 py-3 font-semibold dark:text-gray-200">CPF</th>
                            <th className="px-4 py-3 font-semibold dark:text-gray-200 text-right">Ações</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                         {filteredPatients.length === 0 ? (
                           <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">Nenhum paciente encontrado ou a busca não retornou resultados.</td>
                           </tr>
                         ) : (
                           filteredPatients.map(patient => (
                              <tr key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                 <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                    {patient.name || patient.patientName || '-'}
                                    {(patient.dob || patient.patientDob) && <span className="block text-xs text-gray-400 font-normal mt-0.5">Nasc: {new Date(patient.dob || patient.patientDob).toLocaleDateString()}</span>}
                                 </td>
                                 <td className="px-4 py-3 font-mono text-xs pt-4">{patient.cns || '-'}</td>
                                 <td className="px-4 py-3 font-mono text-xs pt-4">{patient.cpf || '-'}</td>
                                 <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2 isolate pt-1.5">
                                      <button onClick={() => handleEditPatient(patient)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-1.5 rounded-md transition-colors" title="Editar paciente">
                                         <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleDeletePatient(patient.id)} className="bg-red-50 text-red-500 hover:bg-red-100 p-1.5 rounded-md transition-colors" title="Excluir paciente">
                                         <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                 </td>
                              </tr>
                           ))
                         )}
                      </tbody>
                   </table>
                </div>
             )}
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500 px-1">
             <span>Mostrando {patientsList.length} de {totalPatientsCount} pacientes reais na base.</span>
             {hasMorePatients && (
                 <button 
                     type="button" 
                     onClick={() => fetchPatients(selectedMunForPatients!, false)} 
                     disabled={loadingMorePatients}
                     className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-md font-medium flex items-center transition-colors"
                 >
                     {loadingMorePatients ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                     {loadingMorePatients ? 'Carregando lote...' : '▼ Carregar mais 500 pacientes'}
                 </button>
             )}
          </div>
          <div className="flex justify-end pt-2">
             <Button type="button" variant="outline" onClick={() => setIsPatientsModalOpen(false)}>
                Fechar
             </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Secundário de Edição de Paciente */}
      <Modal
         isOpen={isEditPatientModalOpen}
         onClose={() => setIsEditPatientModalOpen(false)}
         title="Editar Dados Demográficos"
         className="max-w-lg"
      >
         <form onSubmit={handleSavePatientEdit} className="space-y-4">
            <Input
               label="Nome Completo"
               value={editingPatient?.name || editingPatient?.patientName || ''}
               onChange={e => setEditingPatient({...editingPatient, name: e.target.value})}
               required
            />
            <div className="grid grid-cols-2 gap-4">
               <Input
                  label="CNS"
                  value={editingPatient?.cns || ''}
                  onChange={e => setEditingPatient({...editingPatient, cns: e.target.value.replace(/\D/g, '')})}
               />
               <Input
                  label="CPF"
                  value={editingPatient?.cpf || ''}
                  onChange={e => setEditingPatient({...editingPatient, cpf: e.target.value.replace(/\D/g, '')})}
               />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <Input
                  label="Data Nasc (AAAA-MM-DD)"
                  type="date"
                  value={editingPatient?.dob?.split('T')[0] || editingPatient?.patientDob?.split('T')[0] || ''}
                  onChange={e => setEditingPatient({...editingPatient, dob: e.target.value})}
               />
               <Select
                  label="Sexo"
                  value={editingPatient?.sex || editingPatient?.patientSex || ''}
                  onChange={e => setEditingPatient({...editingPatient, sex: e.target.value})}
               >
                  <option value="">Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
               </Select>
            </div>
            <Input
               label="Telefone"
               value={editingPatient?.phone || editingPatient?.patientPhone || ''}
               onChange={e => setEditingPatient({...editingPatient, phone: e.target.value})}
            />
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
               <Button type="button" variant="outline" onClick={() => setIsEditPatientModalOpen(false)}>
                  Cancelar
               </Button>
               <Button type="submit" variant="secondary" disabled={editingPatientLoading}>
                  {editingPatientLoading ? 'Salvando...' : 'Salvar Alterações'}
               </Button>
            </div>
        </form>
      </Modal>

      {/* Modal de Tolerância Retroativa */}
      <Modal
        isOpen={isToleranceModalOpen}
        onClose={() => setIsToleranceModalOpen(false)}
        title="Controle de Produção Retroativa"
        className="max-w-md w-full"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure o prazo para digitação retroativa do município <strong>{selectedMunForTolerance?.name}</strong>.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Dias de Tolerância no Mês Seguinte"
              type="number"
              min="0"
              max="31"
              value={toleranceDaysInput}
              onChange={e => setToleranceDaysInput(Number(e.target.value))}
              disabled={savingTolerance}
              className="bg-white dark:bg-gray-800"
              placeholder="Ex: 5"
            />
            <div className="flex items-start text-xs text-gray-500 dark:text-gray-400 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-md border border-emerald-100 dark:border-emerald-800/30">
              <Info className="w-5 h-5 mr-3 text-emerald-500 shrink-0 mt-0.5" />
              <p>Se você definir <strong>5</strong>, os profissionais terão até o dia 05 do mês seguinte para registrar atendimentos retroativos do mês anterior. Um valor <strong>0</strong> desabilita a restrição (libera digitação retroativa ilimitada).</p>
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700 gap-3">
            <Button type="button" variant="outline" onClick={() => setIsToleranceModalOpen(false)} disabled={savingTolerance}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveTolerance} disabled={savingTolerance} className="bg-emerald-600 hover:bg-emerald-700">
              {savingTolerance ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Municipalities;