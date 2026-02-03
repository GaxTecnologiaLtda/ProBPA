import React, { useState, useEffect } from 'react';
import {
    UploadCloud, FileText, CheckCircle, AlertTriangle, Trash2,
    Database, Activity, Folder, RefreshCw
} from 'lucide-react';
import { sigtapService } from '../services/sigtapService';
import { SigtapParser } from '../services/sigtapParser';
import { SiaSusHistory, SigtapDomainTree } from '../types';

// Simple types for local UI
interface FileImportState {
    file: File | null;
    isProcessing: boolean;
    progress: number;
    logs: string[];
    error: string | null;
    success: string | null;
}

const ProcedureDetailModal: React.FC<{ procedure: any; onClose: () => void }> = ({ procedure, onClose }) => {
    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: 'Geral' },
        { id: 'cids', label: `CIDs (${procedure.cids.length})` },
        { id: 'cbos', label: `CBOs (${procedure.ocupacoes.length})` },
        { id: 'services', label: `Serviços` },
        { id: 'rules', label: `Regras (${procedure.regrasCondicionadas.length})` },
        { id: 'compat', label: `Compatib. (${procedure.compatibilidades.length})` },
    ];

    if (!procedure) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', width: '900px', height: '80vh', borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                {/* Header */}
                <div style={{ padding: '16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{procedure.code} - {procedure.name}</h2>
                        <span style={{ fontSize: '12px', color: '#666' }}>Competência: {procedure.competencia}</span>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #eee', padding: '0 16px' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '12px 16px',
                                border: 'none',
                                background: 'none',
                                borderBottom: activeTab === tab.id ? '2px solid #007bff' : 'none',
                                color: activeTab === tab.id ? '#007bff' : '#666',
                                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                                cursor: 'pointer'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    {activeTab === 'general' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div>
                                <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Atributos</h4>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    <li style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                                        <strong>Sexo:</strong> {procedure.sex === 'I' ? 'Indiferente/Ambos' : procedure.sex === 'M' ? 'Masculino' : procedure.sex === 'F' ? 'Feminino' : procedure.sex}
                                    </li>
                                    <li style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                                        <strong>Idade Mínima:</strong> {procedure.ageMin === 9999 ? 'Sem limite' : (procedure.ageMin / 12).toFixed(1).replace('.0', '') + ' anos'} ({procedure.ageMin} meses)
                                    </li>
                                    <li style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                                        <strong>Idade Máxima:</strong> {procedure.ageMax === 9999 ? 'Sem limite/Vitalício' : (procedure.ageMax / 12).toFixed(1).replace('.0', '') + ' anos'} ({procedure.ageMax} meses)
                                    </li>
                                    <li style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                                        <strong>Complexidade:</strong> {
                                            procedure.complexity === '0' ? 'Não se aplica' :
                                                procedure.complexity === '1' ? 'Atenção Básica' :
                                                    procedure.complexity === '2' ? 'Média Complexidade' :
                                                        procedure.complexity === '3' ? 'Alta Complexidade' :
                                                            procedure.complexity
                                        } ({procedure.complexity})
                                    </li>
                                    <li style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                                        <strong>Permanência:</strong> {procedure.daysStay === 9999 ? 'Não se aplica/Internação' : `${procedure.daysStay} dias`}
                                    </li>
                                    <li style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Pontos:</strong> {procedure.points}</li>
                                </ul>
                            </div>
                            <div>
                                <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Instrumentos de Registro</h4>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {procedure.registros.map((r: any) => (
                                        <span key={r.code} style={{ padding: '4px 8px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '12px' }}>
                                            {r.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'cids' && (
                        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                                    <th style={{ padding: '8px' }}>Código</th>
                                    <th style={{ padding: '8px' }}>Descrição</th>
                                    <th style={{ padding: '8px' }}>Tipo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {procedure.cids.map((c: any) => (
                                    <tr key={c.code} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{c.code}</td>
                                        <td style={{ padding: '8px' }}>{c.name}</td>
                                        <td style={{ padding: '8px' }}>
                                            {c.principal === 'S' ? <span style={{ color: 'green', fontWeight: 'bold' }}>Principal</span> : <span style={{ color: '#666' }}>Secundário</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'cbos' && (
                        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}><th style={{ padding: '8px' }}>CBO</th><th style={{ padding: '8px' }}>Ocupação</th></tr></thead>
                            <tbody>
                                {procedure.ocupacoes.map((c: any) => (
                                    <tr key={c.code} style={{ borderBottom: '1px solid #f9f9f9' }}><td style={{ padding: '8px', width: '80px' }}>{c.code}</td><td style={{ padding: '8px' }}>{c.name}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'rules' && (
                        <div>
                            {procedure.regrasCondicionadas.length === 0 ? <p style={{ color: '#999' }}>Nenhuma regra condicionada.</p> : (
                                <ul style={{ paddingLeft: '20px' }}>
                                    {procedure.regrasCondicionadas.map((r: any, idx: number) => (
                                        <li key={idx} style={{ marginBottom: '8px' }}>
                                            <strong>{r.id}:</strong> {r.description} <br />
                                            <span style={{ fontSize: '12px', color: '#666' }}>Detalhe: {r.details}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {activeTab === 'services' && (
                        <div>
                            <h5 style={{ fontWeight: 'bold', margin: '0 0 8px 0' }}>Serviços e Classificações</h5>
                            {procedure.servicos.length === 0 && <p style={{ color: '#999' }}>Nenhum serviço vinculado.</p>}
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {procedure.servicos.map((s: any) => (
                                    <li key={s.code} style={{ padding: '4px 0', borderBottom: '1px solid #eee' }}>{s.code} - {s.name}</li>
                                ))}
                            </ul>

                            <h5 style={{ fontWeight: 'bold', margin: '16px 0 8px 0' }}>Modalidades</h5>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {procedure.modalidades.map((m: any) => (
                                    <span key={m.code} style={{ padding: '4px 8px', backgroundColor: '#f3f4f6', borderRadius: '4px', fontSize: '12px' }}>{m.code} - {m.name}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'compat' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                            {procedure.compatibilidades.length === 0 && <p style={{ color: '#999' }}>Nenhuma compatibilidade registrada.</p>}
                            <table style={{ width: '100%', fontSize: '13px' }}>
                                <tbody>
                                    {procedure.compatibilidades.slice(0, 50).map((c: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ padding: '4px' }}><strong>{c.code}</strong></td>
                                            <td style={{ padding: '4px' }}>{c.name}</td>
                                            <td style={{ padding: '4px' }}>{c.type}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// EXPLORER COMPONENT (Hybrid: Local Domain or Remote Firestore)
// ============================================================================

const SigtapTreeExplorer: React.FC<{ domain?: SigtapDomainTree; competence?: string; onClose?: () => void }> = ({ domain, competence, onClose }) => {
    // Selection State
    const [selectedGroup, setSelectedGroup] = useState<string>('');
    const [selectedSubGroup, setSelectedSubGroup] = useState<string>('');
    const [selectedForm, setSelectedForm] = useState<string>('');
    const [viewProcedure, setViewProcedure] = useState<any | null>(null);

    // Data State (for Remote Mode)
    const [groups, setGroups] = useState<any[]>(domain?.grupos || []);
    const [subGroups, setSubGroups] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [procedures, setProcedures] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Initial Load (Remote Groups)
    useEffect(() => {
        if (competence && !domain) {
            setLoading(true);
            sigtapService.getGroups(competence).then(res => {
                setGroups(res);
                setLoading(false);
            });
        }
    }, [competence, domain]);

    // Derived Lists (Local Mode)
    useEffect(() => {
        if (domain) {
            if (selectedGroup) {
                const g = domain.grupos.find(g => g.code === selectedGroup);
                setSubGroups(g?.subgrupos || []);
            } else setSubGroups([]);

            if (selectedGroup && selectedSubGroup) {
                const g = domain.grupos.find(g => g.code === selectedGroup);
                const s = g?.subgrupos.find(s => s.code === selectedSubGroup);
                setForms(s?.formas || []);
            } else setForms([]);

            if (selectedGroup && selectedSubGroup && selectedForm) {
                const g = domain.grupos.find(g => g.code === selectedGroup);
                const s = g?.subgrupos.find(s => s.code === selectedSubGroup);
                const f = s?.formas.find(f => f.code === selectedForm);
                setProcedures(f?.procedimentos || []);
            } else setProcedures([]);
        }
    }, [domain, selectedGroup, selectedSubGroup, selectedForm]);

    // Fetch SubGroups (Remote Mode)
    useEffect(() => {
        if (competence && selectedGroup) {
            setLoading(true);
            sigtapService.getSubGroups(competence, selectedGroup).then(res => {
                setSubGroups(res);
                setLoading(false);
            });
        } else if (competence) {
            setSubGroups([]);
        }
    }, [competence, selectedGroup]);

    // Fetch Forms (Remote Mode)
    useEffect(() => {
        if (competence && selectedGroup && selectedSubGroup) {
            setLoading(true);
            sigtapService.getForms(competence, selectedGroup, selectedSubGroup).then(res => {
                setForms(res);
                setLoading(false);
            });
        } else if (competence) {
            setForms([]);
        }
    }, [competence, selectedGroup, selectedSubGroup]);

    // Fetch Procedures (Remote Mode)
    useEffect(() => {
        if (competence && selectedGroup && selectedSubGroup && selectedForm) {
            setLoading(true);
            sigtapService.getProcedures(competence, selectedGroup, selectedSubGroup, selectedForm).then(res => {
                setProcedures(res);
                setLoading(false);
            });
        } else if (competence) {
            setProcedures([]);
        }
    }, [competence, selectedGroup, selectedSubGroup, selectedForm]);

    // Handlers
    const handleGroupChange = (val: string) => {
        setSelectedGroup(val);
        setSelectedSubGroup('');
        setSelectedForm('');
        setProcedures([]);
    };

    const handleSubGroupChange = (val: string) => {
        setSelectedSubGroup(val);
        setSelectedForm('');
        setProcedures([]);
    };

    return (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#fff', position: 'relative' }}>
            {viewProcedure && <ProcedureDetailModal procedure={viewProcedure} onClose={() => setViewProcedure(null)} />}

            {loading && (
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <RefreshCw className="spin" size={16} color="#007bff" />
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={16} /> Explorar Dados {competence && `(Remoto: ${competence})`}
                </h4>
                {onClose && (
                    <button onClick={onClose} style={{ border: 'none', background: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}>
                        Fechar Visualização
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                {/* 1. Group Select */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Grupo</label>
                    <select
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        value={selectedGroup}
                        onChange={e => handleGroupChange(e.target.value)}
                    >
                        <option value="">Selecione...</option>
                        {groups.map(g => (
                            <option key={g.code} value={g.code}>{g.code} - {g.name}</option>
                        ))}
                    </select>
                </div>

                {/* 2. SubGroup Select */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Subgrupo</label>
                    <select
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        value={selectedSubGroup}
                        onChange={e => handleSubGroupChange(e.target.value)}
                        disabled={!selectedGroup}
                    >
                        <option value="">Selecione...</option>
                        {subGroups.map(s => (
                            <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                        ))}
                    </select>
                </div>

                {/* 3. Form Select */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Forma</label>
                    <select
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        value={selectedForm}
                        onChange={e => setSelectedForm(e.target.value)}
                        disabled={!selectedSubGroup}
                    >
                        <option value="">Selecione...</option>
                        {forms.map(f => (
                            <option key={f.code} value={f.code}>{f.code} - {f.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 4. Procedure Table */}
            {selectedForm && (
                <div style={{ marginTop: '16px' }}>
                    <div style={{ padding: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Procedimentos encontrados: {procedures.length}</span>
                        {loading && <span style={{ color: '#007bff' }}>Carregando...</span>}
                    </div>
                    <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb', zIndex: 10 }}>
                                <tr style={{ textAlign: 'left', color: '#666' }}>
                                    <th style={{ padding: '8px' }}>Código</th>
                                    <th style={{ padding: '8px' }}>Nome</th>
                                    <th style={{ padding: '8px' }}>Idade</th>
                                    <th style={{ padding: '8px' }}>Complex.</th>
                                    <th style={{ padding: '8px', textAlign: 'center' }}>Detalhes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {procedures.slice(0, 100).map(p => (
                                    <tr key={p.code} style={{ borderTop: '1px solid #eee' }}>
                                        <td style={{ padding: '8px', fontFamily: 'monospace', color: '#0056b3' }}>{p.code}</td>
                                        <td style={{ padding: '8px' }}>{p.name}</td>
                                        <td style={{ padding: '8px' }}>{(p.ageMin / 12).toFixed(0)}a - {(p.ageMax / 12).toFixed(0)}a</td>
                                        <td style={{ padding: '8px' }}>{p.complexity}</td>
                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => setViewProcedure(p)}
                                                style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', background: 'white' }}
                                                title="Ver Detalhes"
                                            >
                                                👁️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {procedures.length === 0 && !loading && (
                                    <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#999' }}>Nenhum procedimento encontrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export const SigtapTables: React.FC = () => {

    // History State
    const [history, setHistory] = useState<SiaSusHistory[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Import State
    const [importState, setImportState] = useState<FileImportState>({
        file: null,
        isProcessing: false,
        progress: 0,
        logs: [],
        error: null,
        success: null
    });

    // Preview / View State
    const [domainTree, setDomainTree] = useState<SigtapDomainTree | null>(null);
    const [viewingHistoryParams, setViewingHistoryParams] = useState<string | null>(null); // Competence being viewed remotely

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const data = await sigtapService.getCompetenceHistory();
            setHistory(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImportState({
                ...importState,
                file: e.target.files[0],
                error: null,
                success: null,
                logs: []
            });
            setDomainTree(null);
            setViewingHistoryParams(null);
        }
    };

    const log = (msg: string) => {
        console.log(msg);
        setImportState(prev => ({ ...prev, logs: [...prev.logs, msg] }));
    };

    // STEP 1: PARSE (Client Side)
    const handleParse = async () => {
        if (!importState.file) return;

        setImportState(prev => ({ ...prev, isProcessing: true, progress: 0, logs: [], error: null, success: null }));
        setDomainTree(null);
        setViewingHistoryParams(null);

        try {
            log(`Lendo arquivo: ${importState.file.name}...`);
            const parser = new SigtapParser(log);
            const domain = await parser.processZip(importState.file);

            log(`Árvore gerada com sucesso!`);
            log(`Competência identificada: ${domain.competence}`);
            log(`Aguardando confirmação do usuário...`);

            setDomainTree(domain);
            setImportState(prev => ({ ...prev, isProcessing: false }));

        } catch (error: any) {
            console.error(error);
            setImportState(prev => ({
                ...prev,
                isProcessing: false,
                error: error.message || 'Erro durante a leitura do arquivo.'
            }));
            log(`ERRO: ${error.message}`);
        }
    };

    // STEP 2: SAVE (Firestore)
    const handleSave = async () => {
        if (!domainTree || !importState.file) return;

        setImportState(prev => ({ ...prev, isProcessing: true, error: null }));
        log(`Iniciando gravação no banco de dados para ${domainTree.competence}...`);

        try {
            await sigtapService.saveDomainImport(domainTree, {
                sourceFileName: importState.file.name,
                importedBy: 'Admin'
            });

            log('Gravação finalizada com sucesso!');
            setImportState(prev => ({
                ...prev,
                isProcessing: false,
                progress: 100,
                success: `Importação ${domainTree.competence} concluída!`
            }));

            loadHistory();
            setDomainTree(null);

        } catch (error: any) {
            console.error(error);
            setImportState(prev => ({
                ...prev,
                isProcessing: false,
                error: error.message || 'Erro ao salvar no banco.'
            }));
            log(`ERRO GRAVACAO: ${error.message}`);
        }
    };

    const handleDelete = async (id: string, competence: string) => {
        if (!window.confirm(`Excluir importação ${competence}?`)) return;
        try {
            await sigtapService.deleteImport(id, competence);
            loadHistory();
            if (viewingHistoryParams === competence) setViewingHistoryParams(null);
        } catch (err) {
            alert('Erro ao excluir');
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>

            <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Database size={32} color="#007bff" />
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Importação SIGTAP</h1>
                    <p style={{ color: '#666', margin: '4px 0 0 0' }}>Gerenciamento da Tabela Unificada via arquivo oficial</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '24px' }}>

                {/* LEFT: IMPORT & PREVIEW CARD */}
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UploadCloud size={20} /> Nova Importação
                    </h2>

                    {/* HISTORY EXPLORER MODAL */}
                    {viewingHistoryParams && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
                        }}>
                            <div style={{
                                backgroundColor: 'white', width: '90%', height: '90%', maxWidth: '1200px', borderRadius: '8px',
                                display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.25)', overflow: 'hidden'
                            }}>
                                <div style={{ padding: '16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Database size={20} color="#007bff" />
                                        Explorador SIGTAP: <span style={{ fontWeight: 'bold' }}>{viewingHistoryParams}</span>
                                    </h3>
                                    <button onClick={() => setViewingHistoryParams(null)} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}>&times;</button>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: 'white' }}>
                                    <SigtapTreeExplorer
                                        competence={viewingHistoryParams}
                                        onClose={() => setViewingHistoryParams(null)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* NEW IMPORT FLOW (Always Visible) */}
                    <>
                        {/* STEP 1: UPLOAD & PARSE */}
                        {!importState.success && !domainTree && (
                            <>
                                <div style={{
                                    border: '2px dashed #ccc',
                                    borderRadius: '8px',
                                    padding: '24px',
                                    textAlign: 'center',
                                    backgroundColor: '#f9fafb',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="file"
                                        accept=".zip"
                                        onChange={handleFileSelect}
                                        disabled={importState.isProcessing}
                                        style={{ display: 'none' }}
                                        id="file-upload"
                                    />
                                    <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                                        <Folder size={48} color="#9ca3af" style={{ margin: '0 auto 12px' }} />
                                        {importState.file ? (
                                            <div>
                                                <p style={{ fontWeight: 'bold', color: '#333' }}>{importState.file.name}</p>
                                                <p style={{ fontSize: '12px', color: '#666' }}>{(importState.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        ) : (
                                            <p style={{ color: '#666' }}>Clique para selecionar o <strong>TabelaUnificada.zip</strong></p>
                                        )}
                                    </label>
                                </div>

                                <button
                                    onClick={handleParse}
                                    disabled={!importState.file || importState.isProcessing}
                                    style={{
                                        width: '100%',
                                        marginTop: '24px',
                                        padding: '12px',
                                        backgroundColor: importState.isProcessing ? '#9ca3af' : '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: 'bold',
                                        cursor: importState.isProcessing ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    {importState.isProcessing ? <RefreshCw className="spin" size={20} /> : <UploadCloud size={20} />}
                                    {importState.isProcessing ? 'Processando Arquivo...' : 'Ler Arquivo ZIP'}
                                </button>
                            </>
                        )}

                        {/* STEP 2: PREVIEW & CONFIRM */}
                        {domainTree && !importState.success && (
                            <div style={{ marginTop: '24px' }}>
                                {/* Summary Card */}
                                <div style={{ backgroundColor: '#f0f9ff', padding: '16px', borderRadius: '8px', border: '1px solid #bae6fd', marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0369a1', marginBottom: '12px' }}>
                                        Prévia da Importação
                                    </h3>
                                    <p style={{ fontSize: '14px', marginBottom: '8px' }}>
                                        <strong>Competência:</strong> {domainTree.competence}
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', color: '#334155' }}>
                                        <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '4px' }}>
                                            <strong>Grupos:</strong> {domainTree.stats.totalGroups}
                                        </div>
                                        <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '4px' }}>
                                            <strong>Total Proc.:</strong> {domainTree.stats.totalProcedures.toLocaleString('pt-BR')}
                                        </div>
                                    </div>
                                </div>

                                {/* TREE EXPLORER (Local) */}
                                <SigtapTreeExplorer domain={domainTree} />

                                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                    <button
                                        onClick={() => {
                                            setDomainTree(null);
                                            setImportState(prev => ({ ...prev, logs: [], error: null, success: null }));
                                        }}
                                        style={{
                                            flex: 1, padding: '12px', backgroundColor: 'white', border: '1px solid #cbd5e1',
                                            borderRadius: '6px', color: '#64748b', cursor: 'pointer', fontWeight: 'bold'
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={importState.isProcessing}
                                        style={{
                                            flex: 2, padding: '12px', backgroundColor: '#16a34a', border: 'none',
                                            borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        {importState.isProcessing ? <RefreshCw className="spin" size={18} /> : <Database size={18} />}
                                        {importState.isProcessing ? 'Salvando...' : 'Confirmar e Salvar'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {importState.error && (
                            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '14px', display: 'flex', gap: '8px' }}>
                                <AlertTriangle size={16} /> {importState.error}
                            </div>
                        )}

                        {importState.success && (
                            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '6px', fontSize: '14px', display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <CheckCircle size={16} /> {importState.success}
                                </div>
                                <button
                                    onClick={() => { setImportState({ ...importState, success: null, file: null, logs: [] }); setDomainTree(null); }}
                                    style={{ alignSelf: 'flex-end', fontSize: '12px', textDecoration: 'underline', backgroundColor: 'transparent', border: 'none', color: '#15803d', cursor: 'pointer' }}
                                >
                                    Nova Importação
                                </button>
                            </div>
                        )}

                        {/* Logs console */}
                        {importState.logs.length > 0 && (
                            <div style={{
                                marginTop: '24px',
                                padding: '12px',
                                backgroundColor: '#1f2937',
                                color: '#10b981',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                                height: '200px',
                                overflowY: 'auto'
                            }}>
                                {importState.logs.map((L, i) => <div key={i}>&gt; {L}</div>)}
                            </div>
                        )}
                    </>
                </div>

                {/* RIGHT: HISTORY */}
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={20} /> Histórico
                    </h2>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                                <th style={{ padding: '12px' }}>Competência</th>
                                <th style={{ padding: '12px' }}>Data/Status</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoadingHistory ? (
                                <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#666' }}>Carregando...</td></tr>
                            ) : history.length === 0 ? (
                                <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#666' }}>Nenhuma importação encontrada.</td></tr>
                            ) : (
                                history.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                backgroundColor: '#dbeafe', color: '#1e40af',
                                                padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold'
                                            }}>
                                                {item.competence}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ fontSize: '12px', color: '#666' }}>
                                                {new Date(item.importedAt).toLocaleString('pt-BR')}
                                            </div>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px',
                                                color: item.status === 'success' ? '#15803d' : '#b91c1c'
                                            }}>
                                                {item.status === 'success' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                                                {item.status === 'success' ? 'Sucesso' : 'Erro'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => setViewingHistoryParams(item.competence)}
                                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#007bff' }}
                                                    title="Visualizar Árvore"
                                                >
                                                    👁️
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id, item.competence)}
                                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}
                                                    title="Excluir Importação"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default SigtapTables;