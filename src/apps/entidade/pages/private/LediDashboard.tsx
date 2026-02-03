import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button } from '../../components/ui/Components';
import { Activity, RefreshCw } from 'lucide-react';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Municipality } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface LediDashboardProps {
    selectedCompetence: string;
    allMunicipalities: Municipality[];
}

const LediDashboard: React.FC<LediDashboardProps> = ({ selectedCompetence, allMunicipalities }) => {
    const { user, claims, loading: authLoading } = useAuth();
    const [lediRecords, setLediRecords] = useState<any[]>([]);
    const [lediStats, setLediStats] = useState({ pending: 0, sent: 0, error: 0 });
    const [loadingLedi, setLoadingLedi] = useState(false);

    useEffect(() => {
        if (!authLoading) {
            loadLediData();
        }
    }, [selectedCompetence, authLoading]);

    const loadLediData = async () => {
        setLoadingLedi(true);
        try {
            // Fetch procedures targeted for LEDI
            const proceduresRef = collectionGroup(db, 'procedures');

            // Build Query
            const monthStr = selectedCompetence.replace('/', '-').split('-').reverse().join('-'); // MM/YYYY -> YYYY-MM

            // Base constraints
            const constraints: any[] = [
                where('careContext.system', '==', 'LEDI'),
                where('competenceMonth', '==', monthStr)
            ];

            // Security Filters (Must match Firestore Rules)
            if (claims?.entityId) {
                constraints.push(where('entityId', '==', claims.entityId));
            } else if (user?.entityId) {
                constraints.push(where('entityId', '==', user.entityId));
            }

            // Role specific constraints
            if (claims?.role === 'SUBSEDE' && claims?.municipalityId) {
                constraints.push(where('municipalityId', '==', claims.municipalityId));
            } else if (user?.role === 'SUBSEDE' && user?.municipalityId) {
                constraints.push(where('municipalityId', '==', user.municipalityId));
            }

            const q = query(proceduresRef, ...constraints);

            const snapshot = await getDocs(q);

            // Filter by Entity (Client-side for now to avoid explosive index requirements)
            // We assume 'allMunicipalities' has the list of municipalities linked to this entity
            const entityMuniIds = allMunicipalities.map(m => m.id);

            const records = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .filter(r => entityMuniIds.includes(r.municipalityId));

            // Deduplicate by ID (Handle dual-write scenario)
            const uniqueRecords = Array.from(new Map(records.map(item => [item.id, item])).values());

            // Calculate Stats based on Unique Records
            const stats = {
                pending: uniqueRecords.filter(r => ['PENDENTE_ENVIO', 'AGUARDANDO_PROCESSAMENTO'].includes(r.integration?.status || '')).length,
                sent: uniqueRecords.filter(r => r.integration?.status === 'ENVIADO_PEC').length,
                error: uniqueRecords.filter(r => ['ERRO_ENVIO', 'ERRO_INTERNO'].includes(r.integration?.status || '')).length
            };

            setLediRecords(uniqueRecords.sort((a: any, b: any) => new Date(b.attendanceDate).getTime() - new Date(a.attendanceDate).getTime()).slice(0, 10)); // Top 10 recent
            setLediStats(stats);

        } catch (error) {
            console.error("Error loading LEDI data:", error);
        } finally {
            setLoadingLedi(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-gradient-to-r from-teal-800 to-teal-900 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Activity className="w-48 h-48" />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-2xl font-bold mb-2">Monitoramento e-SUS APS (LEDI)</h2>
                    <p className="text-teal-100 mb-6">
                        Acompanhe o status de transmissão dos registros para o Prontuário Eletrônico do Cidadão (PEC).
                        A sincronização ocorre automaticamente todas as noites.
                    </p>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={RefreshCw}
                        onClick={loadLediData}
                        isLoading={loadingLedi}
                        className="bg-teal-700 text-white border-none hover:bg-teal-600"
                    >
                        Atualizar Dados
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-5 border-l-4 border-yellow-500">
                    <div className="text-sm text-gray-500 font-medium">Pendente de Envio</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{lediStats.pending}</div>
                    <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded inline-block">
                        Aguardando processamento noturno
                    </div>
                </Card>
                <Card className="p-5 border-l-4 border-green-500">
                    <div className="text-sm text-gray-500 font-medium">Enviados com Sucesso</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{lediStats.sent}</div>
                    <div className="mt-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded inline-block">
                        Sincronizados com PEC
                    </div>
                </Card>
                <Card className="p-5 border-l-4 border-red-500">
                    <div className="text-sm text-gray-500 font-medium">Erros de Transmissão</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{lediStats.error}</div>
                    <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded inline-block">
                        Requer atenção
                    </div>
                </Card>
            </div>

            <Card>
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Últimas Transmissões (Top 10)</h3>
                    {loadingLedi && <Activity className="w-4 h-4 animate-spin text-teal-600" />}
                </div>
                <Table headers={['Data', 'Profissional', 'Paciente', 'Ficha', 'Status', 'Detalhes']}>
                    {lediRecords.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                {loadingLedi ? 'Carregando...' : 'Nenhum registro LEDI encontrado para esta competência.'}
                            </td>
                        </tr>
                    ) : (
                        lediRecords.map((rec) => (
                            <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {rec.attendanceDate ? new Date(rec.attendanceDate).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {rec.professionalName}
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                    {rec.patientName}
                                </td>
                                <td className="px-6 py-4 text-xs font-mono text-gray-500">
                                    {rec.originFicha || 'GENÉRICO'}
                                </td>
                                <td className="px-6 py-4">
                                    {rec.integration?.status === 'ENVIADO_PEC' && <Badge type="success">Enviado</Badge>}
                                    {(rec.integration?.status === 'PENDENTE_ENVIO' || !rec.integration?.status) && <Badge type="warning">Pendente</Badge>}
                                    {rec.integration?.status === 'ERRO_ENVIO' && <Badge type="error">Erro</Badge>}
                                    {rec.integration?.status === 'ERRO_INTERNO' && <Badge type="error">Erro Interno</Badge>}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={rec.integration?.lastError || rec.integration?.pecResponse?.message}>
                                    {rec.integration?.lastError || rec.integration?.pecResponse?.message || '-'}
                                </td>
                            </tr>
                        ))
                    )}
                </Table>
            </Card>
        </div>
    );
};

export default LediDashboard;
