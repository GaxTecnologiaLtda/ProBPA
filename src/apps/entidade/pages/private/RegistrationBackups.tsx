import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Modal, Input } from '../../components/ui/Components';
import { Search, History, RefreshCw, FileSignature, AlertTriangle, Info, User, Mail, Phone, Building2, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Professional } from '../../types';
import { fetchMunicipalitiesByEntity } from '../../services/municipalitiesService';
import { fetchRegistrationBackups, restoreProfessional } from '../../services/professionalsService';

const RegistrationBackups: React.FC = () => {
    const { claims } = useAuth();

    // Protection: only MASTER
    if (claims?.role !== 'MASTER') {
        return (
            <div className="p-8 text-center text-red-500 font-medium">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                Acesso negado. Apenas o perfil MASTER pode visualizar backups de sistema.
            </div>
        );
    }

    const [backups, setBackups] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal States
    const [selectedBackup, setSelectedBackup] = useState<Professional | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [restoring, setRestoring] = useState(false);

    const loadData = async () => {
        if (!claims?.entityId) return;
        setLoading(true);
        try {
            // First fetch all municipalities for this entity
            const municipalities = await fetchMunicipalitiesByEntity(claims.entityId);

            // Then fetch backups from all municipalities
            const allBackups: Professional[] = [];
            const promises = municipalities.map(async (mun) => {
                const munBackups = await fetchRegistrationBackups(claims.entityId, mun.id);
                allBackups.push(...munBackups);
            });

            await Promise.all(promises);

            // Sort by backupCreatedAt falling back to createdAt or arbitrary
            allBackups.sort((a: any, b: any) => {
                const timeA = a.backupCreatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
                const timeB = b.backupCreatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
                return timeB - timeA; // Newest first
            });

            setBackups(allBackups);
        } catch (error) {
            console.error("Erro ao carregar backups:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [claims?.entityId]);

    const handleRestore = async (backup: Professional) => {
        if (!confirm(`Tem certeza que deseja restaurar o cadastro de ${backup.name}? Isso irá recriar o profissional no sistema caso tenha sido excluído.`)) {
            return;
        }

        setRestoring(true);
        try {
            await restoreProfessional(backup);
            alert("Profissional restaurado com sucesso!");
            setIsViewModalOpen(false);
            // Optionally reload to update UI flags if we added some, but for now just close modal
        } catch (error) {
            console.error(error);
            alert("Erro ao restaurar profissional.");
        } finally {
            setRestoring(false);
        }
    };

    const handleView = (backup: Professional) => {
        setSelectedBackup(backup);
        setIsViewModalOpen(true);
    };

    const filteredBackups = backups.filter(b => {
        if (!searchTerm) return true;
        
        const lowerTerm = searchTerm.toLowerCase();
        const numericTerm = searchTerm.replace(/\D/g, '');

        const matchName = (b.name || '').toLowerCase().includes(lowerTerm);
        const matchCpf = numericTerm ? (b.cpf || '').replace(/\D/g, '').includes(numericTerm) : false;
        const matchCns = numericTerm ? (b.cns || '').replace(/\D/g, '').includes(numericTerm) : false;

        return matchName || matchCpf || matchCns;
    });

    if (loading) {
        return <div className="p-8 text-center text-gray-500 flex flex-col items-center">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
            Carregando espelho de segurança...
        </div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <History className="w-6 h-6 text-indigo-600" /> Backups de Cadastros
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-3xl">
                        Espelho de segurança de todos os formulários públicos enviados. Use esta área APENAS para recuperar profissionais deletados indevidamente ou auditar assinaturas originais.
                    </p>
                </div>
                <Button variant="outline" onClick={loadData} className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Atualizar
                </Button>
            </div>

            <Card className="p-4 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por Nome, CPF ou CNS..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100"
                    />
                </div>
            </Card>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-900/50 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-4">Profissional / Contato</th>
                                <th className="px-6 py-4">Documentos</th>
                                <th className="px-6 py-4">Vínculos Principais</th>
                                <th className="px-6 py-4">Data do Backup</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredBackups.map((backup) => (
                                <tr key={backup.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900 dark:text-white text-base">
                                            {backup.name}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {backup.email}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {backup.phone}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs space-y-1">
                                        <div>CPF: {backup.cpf}</div>
                                        <div>CNS: {backup.cns}</div>
                                        <div>Reg: {backup.registerClass}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {backup.assignments && backup.assignments.length > 0 ? (
                                            <div className="space-y-1">
                                                {backup.assignments.map((a, i) => (
                                                    <div key={i} className="text-xs">
                                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{a.occupation}</span> em {a.unitName}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-xs">
                                                <span className="font-semibold text-gray-700 dark:text-gray-300">{backup.occupation}</span> em {backup.unitName}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium">
                                        {/* @ts-ignore */}
                                        {backup.backupCreatedAt && backup.backupCreatedAt.toDate ? backup.backupCreatedAt.toDate().toLocaleString('pt-BR') : 'Data Indisponível'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Button size="sm" variant="outline" onClick={() => handleView(backup)} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:hover:bg-indigo-900/30">
                                            <FileSignature className="w-4 h-4 mr-2" /> Auditar / Restaurar
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredBackups.length === 0 && (
                        <div className="py-12 text-center text-gray-500 flex flex-col items-center">
                            <Info className="w-12 h-12 text-gray-300 mb-3" />
                            <p className="text-lg">Nenhum backup encontrado.</p>
                            <p className="text-sm mt-1">Os cadastros enviados pelo formulário público aparecerão aqui.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Detalhes e Restauração */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title="Auditoria de Cadastro (Backup)"
                size="lg"
            >
                {selectedBackup && (
                    <div className="space-y-6">
                        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r text-sm text-amber-800 dark:text-amber-200">
                            <strong>Atenção:</strong> Você está visualizando um "fantasma" do formulário original submetido pelo profissional. Se o profissional foi excluído do sistema por engano, você pode usar o botão de restauração abaixo.
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-bold border-b pb-2 text-gray-800 dark:text-gray-200 flex items-center gap-2"><User className="w-4 h-4" /> Dados Pessoais</h3>
                                <div className="text-sm space-y-2">
                                    <p><span className="text-gray-500">Nome:</span> <span className="font-semibold text-gray-900 dark:text-white">{selectedBackup.name}</span></p>
                                    <p><span className="text-gray-500">CPF:</span> <span className="font-mono">{selectedBackup.cpf}</span></p>
                                    <p><span className="text-gray-500">CNS:</span> <span className="font-mono">{selectedBackup.cns}</span></p>
                                    <p><span className="text-gray-500">Email:</span> {selectedBackup.email}</p>
                                    <p><span className="text-gray-500">Telefone:</span> {selectedBackup.phone}</p>
                                    <p><span className="text-gray-500">Registro de Classe:</span> {selectedBackup.registerClass}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold border-b pb-2 text-gray-800 dark:text-gray-200 flex items-center gap-2"><Building2 className="w-4 h-4" /> Atuação</h3>
                                <div className="text-sm space-y-3">
                                    {selectedBackup.assignments?.map((a, i) => (
                                        <div key={i} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded border border-gray-100 dark:border-gray-700">
                                            <p className="font-bold text-gray-900 dark:text-white">{a.unitName}</p>
                                            <p className="text-gray-600 dark:text-gray-300">{a.occupation}</p>
                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {a.municipalityName}</p>
                                        </div>
                                    ))}
                                    {(!selectedBackup.assignments || selectedBackup.assignments.length === 0) && (
                                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded border border-gray-100 dark:border-gray-700">
                                            <p className="font-bold text-gray-900 dark:text-white">{selectedBackup.unitName}</p>
                                            <p className="text-gray-600 dark:text-gray-300">{selectedBackup.occupation}</p>
                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {selectedBackup.municipalityName}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-bold border-b pb-2 text-gray-800 dark:text-gray-200 flex items-center gap-2"><FileSignature className="w-4 h-4" /> Documento / Assinatura Anexada</h3>
                            <div className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-2 flex justify-center items-center min-h-[150px]">
                                {selectedBackup.signatureBase64 ? (
                                    <img src={selectedBackup.signatureBase64} alt="Assinatura" className="max-w-full max-h-[250px] object-contain bg-white rounded shadow-sm" />
                                ) : selectedBackup.signatureUrl ? (
                                    <img src={selectedBackup.signatureUrl} alt="Assinatura da Nuvem" className="max-w-full max-h-[250px] object-contain bg-white rounded shadow-sm" />
                                ) : (
                                    <span className="text-gray-400 italic text-sm">Nenhuma assinatura anexada no backup.</span>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                                Fechar
                            </Button>
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center gap-2"
                                onClick={() => handleRestore(selectedBackup)}
                                disabled={restoring}
                            >
                                <History className="w-4 h-4" />
                                {restoring ? 'Restaurando...' : 'Restaurar Profissional no Sistema'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default RegistrationBackups;
