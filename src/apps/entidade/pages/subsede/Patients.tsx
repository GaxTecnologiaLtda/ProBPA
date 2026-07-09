import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Modal } from '../../components/ui/Components';
import { Search, RefreshCw, Upload, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import { logAction } from '../../services/logsService';

const Patients: React.FC = () => {
  const { user, claims } = useAuth();
  
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [debouncedPatientSearchTerm, setDebouncedPatientSearchTerm] = useState('');
  const [hasMorePatients, setHasMorePatients] = useState(false);
  const [loadingMorePatients, setLoadingMorePatients] = useState(false);
  const [totalPatientsCount, setTotalPatientsCount] = useState(0);

  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any | null>(null);
  const [editingPatientLoading, setEditingPatientLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{current: number, total: number} | null>(null);

  const municipalityId = claims?.municipalityId || claims?.organizationId;
  const entityId = claims?.entityId;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPatientSearchTerm(patientSearchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [patientSearchTerm]);

  useEffect(() => {
    if (municipalityId && entityId) {
      fetchPatients(true);
    }
  }, [debouncedPatientSearchTerm, municipalityId, entityId]);

  const fetchPatients = async (reset: boolean = true) => {
    if (!municipalityId || !entityId) return;

    try {
      if (reset) {
        setLoadingPatients(true);
      } else {
        setLoadingMorePatients(true);
      }

      const getPatientsFn = httpsCallable(functions, 'getMunicipalityPatients');
      const payload: any = {
        entityId,
        municipalityId,
        limit: 500
      };

      if (debouncedPatientSearchTerm.trim()) {
        payload.search = debouncedPatientSearchTerm.trim();
      }

      if (!reset && patientsList.length > 0) {
        const lastPatient = patientsList[patientsList.length - 1];
        payload.startAfterId = lastPatient.id;
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
      console.error("Error fetching patients:", error);
    } finally {
       setLoadingPatients(false);
       setLoadingMorePatients(false);
    }
  };

  const handleEditPatient = (patient: any) => {
    setEditingPatient({ ...patient });
    setIsEditPatientModalOpen(true);
  };

  const handleDeletePatient = async (patientId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir permanentemente este paciente da base do município?")) return;
    try {
      const deleteFn = httpsCallable(functions, 'deletePatientRecord');
      await deleteFn({ entityId, municipalityId, patientId });
      setPatientsList(prev => prev.filter(p => p.id !== patientId));
      logAction({
        entityId,
        municipalityId,
        action: 'DELETE',
        target: 'SYSTEM',
        description: `Paciente ${patientId} excluído.`
      });
    } catch (e: any) {
      console.error(e);
      alert("Erro ao excluir paciente.");
    }
  };

  const handleSavePatientEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient || !municipalityId || !entityId) return;
    setEditingPatientLoading(true);
    try {
      const updateFn = httpsCallable(functions, 'updatePatientRecord');
      await updateFn({
         entityId,
         municipalityId,
         patientId: editingPatient.id,
         data: editingPatient
      });
      setPatientsList(prev => prev.map(p => p.id === editingPatient.id ? editingPatient : p));
      setIsEditPatientModalOpen(false);
      logAction({
        entityId,
        municipalityId,
        action: 'UPDATE',
        target: 'SYSTEM',
        description: `Dados do paciente ${editingPatient.cns || editingPatient.cpf || editingPatient.id} editados via painel.`
      });
    } catch (error: any) {
      console.error(error);
      alert("Erro ao atualizar paciente. " + error.message);
    } finally {
      setEditingPatientLoading(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !municipalityId || !entityId) return;

    setImporting(true);
    setImportProgress({ current: 0, total: files.length });

    try {
      const BATCH_SIZE = 500;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();
        const jsonContent = JSON.parse(text);
        let items = Array.isArray(jsonContent) ? jsonContent : [jsonContent];
        
        items = items.filter(item => item && typeof item === 'object');

        const importFn = httpsCallable(functions, 'importPatientsBatch');

        for (let j = 0; j < items.length; j += BATCH_SIZE) {
          const chunk = items.slice(j, j + BATCH_SIZE);
          await importFn({
             entityId,
             municipalityId,
             patients: chunk
          });
        }
        
        setImportProgress({ current: i + 1, total: files.length });
      }

      alert(`Importação concluída: ${files.length} arquivo(s) processado(s).`);
      
      setPatientSearchTerm('');
      setDebouncedPatientSearchTerm('');
      fetchPatients(true);

    } catch (error: any) {
      console.error(error);
      alert("Erro ao importar pacientes: Verifique se os objetos JSON contêm a estrutura de col_1, col_2, etc válidas. " + error.message);
    } finally {
      setImporting(false);
      setImportProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pacientes do Município</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Acesse e gerencie os pacientes vinculados ao seu município.</p>
      </div>

      <Card className="!p-6 border-emerald-100 dark:border-emerald-900/50 shadow-md">
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
                         {patientsList.length === 0 ? (
                           <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">Nenhum paciente encontrado ou a busca não retornou resultados.</td>
                           </tr>
                         ) : (
                           patientsList.map(patient => (
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
                     onClick={() => fetchPatients(false)} 
                     disabled={loadingMorePatients}
                     className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-md font-medium flex items-center transition-colors"
                 >
                     {loadingMorePatients ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                     {loadingMorePatients ? 'Carregando lote...' : '▼ Carregar mais 500 pacientes'}
                 </button>
             )}
          </div>
        </div>
      </Card>

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
               onChange={e => setEditingPatient({...editingPatient, name: e.target.value, patientName: e.target.value})}
               disabled={editingPatientLoading}
            />
            <div className="grid grid-cols-2 gap-4">
               <Input
                  label="CNS"
                  value={editingPatient?.cns || ''}
                  onChange={e => setEditingPatient({...editingPatient, cns: e.target.value})}
                  disabled={editingPatientLoading}
               />
               <Input
                  label="CPF"
                  value={editingPatient?.cpf || ''}
                  onChange={e => setEditingPatient({...editingPatient, cpf: e.target.value})}
                  disabled={editingPatientLoading}
               />
            </div>
            <Input
               label="Data de Nascimento"
               type="date"
               value={editingPatient?.dob || editingPatient?.patientDob ? new Date(editingPatient.dob || editingPatient.patientDob).toISOString().split('T')[0] : ''}
               onChange={e => setEditingPatient({...editingPatient, dob: new Date(e.target.value).getTime(), patientDob: new Date(e.target.value).getTime()})}
               disabled={editingPatientLoading}
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
    </div>
  );
};

export default Patients;
