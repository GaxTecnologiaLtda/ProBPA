import React, { useState } from 'react';
import { X, FileText, User, Info, AlertCircle, CheckCircle, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../../../components/ui/Components'; // Entidade UI

interface ProcedureDetailModalProps {
    procedure: any;
    onClose: () => void;
}

export const ProcedureDetailModal: React.FC<ProcedureDetailModalProps> = ({ procedure, onClose }) => {
    const [activeTab, setActiveTab] = useState('general');

    if (!procedure) return null;

    const tabs = [
        { id: 'general', label: 'Geral', icon: Info },
        { id: 'cids', label: `CIDs (${procedure.cids?.length || 0})`, icon: FileText },
        { id: 'cbos', label: `CBOs (${procedure.ocupacoes?.length || 0})`, icon: User },
        { id: 'services', label: `Serviços (${procedure.servicos?.length || 0})`, icon: Database },
        { id: 'rules', label: `Regras`, icon: AlertCircle },
        { id: 'compat', label: `Compatib.`, icon: CheckCircle },
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans text-slate-800 dark:text-slate-100">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start bg-gray-50 dark:bg-gray-800/80">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono">{procedure.code}</Badge>
                            <span className="text-xs text-gray-500 font-medium">Competência: {procedure.competencia || 'Atual'}</span>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{procedure.name}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-full transition-colors">
                        <X size={24} className="text-gray-400 hover:text-red-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id
                                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-black/20">
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'general' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-gray-900 dark:text-white border-b pb-2 border-gray-100 dark:border-gray-700">Atributos Principais</h4>
                                        <ul className="space-y-3 text-sm">
                                            <li className="flex justify-between">
                                                <span className="text-gray-500">Sexo:</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{procedure.sex === 'I' ? 'Indiferente/Ambos' : procedure.sex === 'M' ? 'Masculino' : 'Feminino'}</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <span className="text-gray-500">Idade Mínima:</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{(procedure.ageMin / 12).toFixed(0)} anos ({procedure.ageMin} meses)</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <span className="text-gray-500">Idade Máxima:</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{procedure.ageMax === 9999 ? 'Sem limite' : `${(procedure.ageMax / 12).toFixed(0)} anos`}</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <span className="text-gray-500">Complexidade:</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{procedure.complexity === '1' ? 'Atenção Básica' : procedure.complexity === '2' ? 'Média' : 'Alta'} ({procedure.complexity})</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <span className="text-gray-500">Permanência:</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{procedure.daysStay === 9999 ? 'Não se aplica' : `${procedure.daysStay} dias`}</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <span className="text-gray-500">Pontos (SIA/SIH):</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{procedure.points}</span>
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-gray-900 dark:text-white border-b pb-2 border-gray-100 dark:border-gray-700">Instrumentos de Registro</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {procedure.registros?.map((r: any) => (
                                                <Badge key={r.code} variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                    {r.code} - {r.name}
                                                </Badge>
                                            )) || <span className="text-sm text-gray-400">Nenhum</span>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'cids' && (
                                <div className="space-y-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 font-medium">
                                                <tr>
                                                    <th className="px-4 py-3">Código</th>
                                                    <th className="px-4 py-3">Descrição</th>
                                                    <th className="px-4 py-3">Tipo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {procedure.cids?.map((c: any) => (
                                                    <tr key={c.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                        <td className="px-4 py-3 font-mono font-bold text-gray-700 dark:text-gray-300">{c.code}</td>
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.name}</td>
                                                        <td className="px-4 py-3">
                                                            {c.principal === 'S'
                                                                ? <span className="text-green-600 font-bold text-xs">Principal</span>
                                                                : <span className="text-gray-400 text-xs">Secundário</span>
                                                            }
                                                        </td>
                                                    </tr>
                                                )) || <tr><td colSpan={3} className="p-8 text-center text-gray-400">Nenhum CID vinculado.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'cbos' && (
                                <div className="space-y-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 font-medium">
                                                <tr>
                                                    <th className="px-4 py-3 w-24">CBO</th>
                                                    <th className="px-4 py-3">Ocupação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {procedure.ocupacoes?.map((c: any) => (
                                                    <tr key={c.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                        <td className="px-4 py-3 font-mono font-bold text-gray-700 dark:text-gray-300">{c.code}</td>
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.name}</td>
                                                    </tr>
                                                )) || <tr><td colSpan={2} className="p-8 text-center text-gray-400">Nenhuma ocupação vinculada.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'services' && (
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                                            <Database size={18} className="text-blue-500" /> Serviços
                                        </h4>
                                        <ul className="space-y-2">
                                            {procedure.servicos?.map((s: any) => (
                                                <li key={s.code} className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-sm flex gap-2">
                                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{s.code}</span>
                                                    <span className="text-gray-600 dark:text-gray-300">{s.name}</span>
                                                </li>
                                            )) || <p className="text-gray-400 text-sm">Nenhum serviço.</p>}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                                            <Info size={18} className="text-purple-500" /> Modalidades
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {procedure.modalidades?.map((m: any) => (
                                                <span key={m.code} className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs border border-purple-100 dark:border-purple-800">
                                                    {m.code} - {m.name}
                                                </span>
                                            )) || <p className="text-gray-400 text-sm">Nenhuma modalidade.</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'rules' && (
                                <div className="space-y-4">
                                    {procedure.regrasCondicionadas?.length > 0 ? (
                                        <div className="space-y-3">
                                            {procedure.regrasCondicionadas.map((r: any, idx: number) => (
                                                <div key={idx} className="p-4 bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-400 rounded-r text-sm">
                                                    <div className="font-bold text-orange-800 dark:text-orange-200 mb-1">{r.id}: {r.description}</div>
                                                    <div className="text-orange-600 dark:text-orange-300/80">{r.details}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center py-10 text-gray-400">Nenhuma regra condicionada.</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'compat' && (
                                <div className="space-y-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 font-medium">
                                                <tr>
                                                    <th className="px-4 py-3">Código</th>
                                                    <th className="px-4 py-3">Nome</th>
                                                    <th className="px-4 py-3">Tipo Compatibilidade</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {procedure.compatibilidades?.slice(0, 100).map((c: any, i: number) => (
                                                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                        <td className="px-4 py-3 font-mono font-bold text-gray-700 dark:text-gray-300">{c.code}</td>
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.name}</td>
                                                        <td className="px-4 py-3">
                                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{c.type}</span>
                                                        </td>
                                                    </tr>
                                                )) || <tr><td colSpan={3} className="p-8 text-center text-gray-400">Nenhuma compatibilidade registrada.</td></tr>}
                                            </tbody>
                                        </table>
                                        {procedure.compatibilidades?.length > 100 && (
                                            <div className="text-center py-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-900">
                                                Exibindo primeiros 100 registros.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};
