import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '../../../components/ui/Components';
import { Upload, FileText, AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react';
import { Unit, Professional, Municipality } from '../../../types';
import { createProfessional, fetchProfessionalsByEntity, updateProfessional } from '../../../services/professionalsService';
import { UniversalExtractor } from '../../../utils/universalExtractor';
import { CBO_LIST } from '../../../constants';

// Version: Fixed Root Occupation Sync - 2026-01-22

interface ImportProfessionalsModalProps {
    isOpen: boolean;
    onClose: () => void;
    units: Unit[];
    municipalities: Municipality[];
    entityId: string;
    entityName: string;
    onSuccess: () => void;
}

interface ImportedRecord {
    nome: string;
    email: string;
    cpf: string;
    cns: string;
    funcao?: string; // or occupation
    cbo?: string;
    numero_conselho?: string;
    unidade: string;
    status?: 'valid' | 'error';
    message?: string;
    matchedUnitId?: string;
    matchedMunicipalityId?: string;
}

// Helper to find best CBO match
const findBestCBOMatch = (input: string): string | undefined => {
    if (!input) return undefined;

    // Normalize: remove accents, lowercase, remove special chars (keep letters/numbers/spaces)
    const normalize = (s: string) => s
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "");

    let normInput = normalize(input);

    // Common Gender/Term Replacements
    normInput = normInput
        .replace(/\btecnica\b/g, 'tecnico')
        .replace(/\benfermeira\b/g, 'enfermeiro')
        .replace(/\bmedica\b/g, 'medico')
        .replace(/\bcirurgia\b/g, 'cirurgiao')
        .replace(/\bodontologa\b/g, 'cirurgiao dentista') // Better mapping
        .replace(/\bodontologo\b/g, 'cirurgiao dentista')
        .replace(/\baux\b/g, 'auxiliar')
        .replace(/\badm\b/g, 'administrativo')
        .replace(/\bpsicologa\b/g, 'psicologo')
        .replace(/\bfarmaceutica\b/g, 'farmaceutico')
        .replace(/\bfonoaudiologa\b/g, 'fonoaudiologo')
        .replace(/\btec\b/g, 'tecnico');

    // Remove prepositions for comparison (de, da, do, em, e)
    const stripPrepositions = (s: string) => s.replace(/\b(de|da|do|em|e)\b/g, "").replace(/\s+/g, " ").trim();

    const cleanInput = stripPrepositions(normInput);

    // Flatten options
    const allOptions = CBO_LIST.flatMap(g => g.options);

    // 1. Exact match on CBO Code
    const inputNumbers = input.replace(/\D/g, '');
    if (inputNumbers.length >= 4) {
        const codeMatch = allOptions.find(o => o.value === inputNumbers);
        if (codeMatch) return codeMatch.label;
    }

    // 2. Text Match Strategies
    const match = allOptions.find(o => {
        const normLabel = normalize(o.label);
        const cleanLabel = stripPrepositions(normLabel);

        // A. Exact Normalized Match (ignoring prepositions)
        if (cleanLabel === cleanInput) return true;

        // B. Contains Match (Label contains Input)
        if (cleanLabel.includes(cleanInput)) return true;

        // C. Input contains Label (less likely but good backup)
        if (cleanInput.includes(cleanLabel)) return true;

        return false;
    });

    if (match) return match.label;

    return undefined;
};

export const ImportProfessionalsModal: React.FC<ImportProfessionalsModalProps> = ({
    isOpen,
    onClose,
    units,
    municipalities,
    entityId,
    entityName,
    onSuccess
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ImportedRecord[]>([]);
    const [rawText, setRawText] = useState<string | null>(null); // For PDF/DOCX preview
    const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, errors: 0 });
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const [existingProfessionals, setExistingProfessionals] = useState<Professional[]>([]);

    useEffect(() => {
        if (isOpen && entityId) {
            fetchProfessionalsByEntity(entityId).then(setExistingProfessionals).catch(console.error);
        }
    }, [isOpen, entityId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setErrorMsg(null);
            setRawText(null);
            setParsedData([]);
        }
    };

    const parseFile = async () => {
        if (!file) return;
        setIsProcessing(true);
        setErrorMsg(null);

        try {
            const extractor = new UniversalExtractor();
            const result = await extractor.extract(file);

            if (!result.success) {
                setErrorMsg(result.error || "Erro ao processar arquivo");
                setIsProcessing(false);
                return;
            }

            if (result.type === 'text') {
                // PDF or DOCX - Unstructured
                setRawText(result.text || "Nenhum texto extraído.");
                setStep('preview');
            } else if (result.type === 'structured' && result.data) {
                // Excel or JSON - Structured
                processStructuredData(result.data);
                setStep('preview');
            } else {
                setErrorMsg("Formato de dados desconhecido.");
            }

        } catch (err) {
            console.error(err);
            setErrorMsg("Erro desconhecido ao processar arquivo.");
        } finally {
            setIsProcessing(false);
        }
    };

    const processStructuredData = (data: any[]) => {
        if (!Array.isArray(data)) {
            setErrorMsg("Os dados extraídos não são uma lista tabular válida.");
            return;
        }

        const processed: ImportedRecord[] = data.map((item: any) => {
            // Helper: Clean string for key matching (remove numbers, punctuation, lowercase, ACCENTS)
            const cleanKey = (k: string) => k
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
                .replace(/[^a-zA-Z0-9]/g, '') // Remove non-alphanumeric
                .toLowerCase();

            const getField = (targetKeys: string[]) => {
                // First pass: direct match
                for (const key of targetKeys) {
                    if (item[key] !== undefined) return item[key];
                }
                // Second pass: clean match
                const itemKeys = Object.keys(item);
                for (const tKey of targetKeys) {
                    const cleanTKey = cleanKey(tKey);
                    const foundKey = itemKeys.find(k => cleanKey(k) === cleanTKey || cleanKey(k).includes(cleanTKey));
                    if (foundKey) return item[foundKey];
                }
                return '';
            };

            const unitName = getField(['unidade', 'unitName', 'unidadeemqueatua', 'local']);
            const nome = getField(['nome', 'name', 'nomecompleto', 'profissional', 'professional']);
            const cns = getField(['cns', 'cartaosus', 'sus']);
            const email = getField(['email', 'e-mail']);
            const cpf = getField(['cpf', 'numerocpf']);
            const funcaoRaw = getField(['funcao', 'ocupacao', 'cargo', 'occupation', 'cbo']);
            const conselho = getField(['numero_conselho', 'conselho', 'registro', 'crm', 'coren', 'ndoconselho']);

            // Detect CBO / Occupation
            const matchedCBO = findBestCBOMatch(String(funcaoRaw || ''));
            const finalOccupation = matchedCBO || String(funcaoRaw || '');

            // --- Unit Matching Logic ---
            let finalUnit: Unit | undefined;
            const unitVal = String(unitName || '').trim();

            if (unitVal) {
                // Strategy 1: Try to extract CNES number (e.g. "CNES 2407469 - ...")
                const cnesMatch = unitVal.match(/Current CNES[:\s]*(\d+)/i) || unitVal.match(/CNES[:\s]*(\d+)/i);
                if (cnesMatch && cnesMatch[1]) {
                    const extractedCnes = cnesMatch[1];
                    finalUnit = units.find(u => u.cnes === extractedCnes);
                }

                // Strategy 2: If no CNES match, try fuzzy name match
                if (!finalUnit) {
                    // Remove "CNES 12345 -" prefix if present to match name
                    const namePart = unitVal.replace(/^CNES\s*\d+\s*[-–]\s*/i, '').trim();
                    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const target = normalize(namePart);

                    finalUnit = units.find(u => normalize(u.name) === target);
                }
            }

            let status: 'valid' | 'error' = 'valid';
            let message = '';

            if (!finalUnit) {
                status = 'error';
                message = `Unidade "${unitName}" não encontrada no sistema.`;
            }

            // Allow ignoring missing CNS if CPF is present? 
            if (!nome) {
                status = 'error';
                message += (message ? ' ' : '') + 'Nome obrigatório.';
            }
            if (!cns && !cpf) {
                status = 'error';
                message += (message ? ' ' : '') + 'CNS ou CPF deve ser informado.';
            }

            return {
                nome: String(nome || ''),
                email: String(email || ''),
                cpf: String(cpf || ''),
                cns: String(cns || ''),
                funcao: finalOccupation,
                numero_conselho: String(conselho || ''),
                unidade: String(unitName || ''),
                status,
                message,
                matchedUnitId: finalUnit?.id,
                matchedMunicipalityId: finalUnit?.municipalityId
            };
        });

        setParsedData(processed);
    };

    const handleUnitSelect = (index: number, unitId: string) => {
        const newData = [...parsedData];
        const unit = units.find(u => u.id === unitId);

        if (unit) {
            newData[index].matchedUnitId = unit.id;
            newData[index].matchedMunicipalityId = unit.municipalityId;
            newData[index].status = (newData[index].nome && (newData[index].cns || newData[index].cpf)) ? 'valid' : 'error';
            // Re-check other errors
            let message = '';
            if (!newData[index].nome) {
                message += 'Nome obrigatório.';
                newData[index].status = 'error';
            }
            if (!newData[index].cns && !newData[index].cpf) {
                message += (message ? ' ' : '') + 'CNS ou CPF deve ser informado.';
                newData[index].status = 'error';
            }
            newData[index].message = message;
        } else {
            // Reset/Clear
            newData[index].matchedUnitId = undefined;
            newData[index].status = 'error';
            newData[index].message = `Unidade não encontrada.`;
        }
        setParsedData(newData);
    };

    const handleRemoveRecord = (index: number) => {
        const newData = [...parsedData];
        newData.splice(index, 1);
        setParsedData(newData);
    };

    const handleImport = async () => {
        setStep('importing');
        setImportProgress({ current: 0, total: parsedData.length, errors: 0 });

        let errorsCount = 0;

        for (let i = 0; i < parsedData.length; i++) {
            const record = parsedData[i];
            setImportProgress(prev => ({ ...prev, current: i + 1 }));

            if (record.status === 'error' || !record.matchedUnitId) {
                errorsCount++;
                setImportProgress(prev => ({ ...prev, errors: prev.errors + 1 }));
                continue;
            }

            try {
                const matchedUnit = units.find(u => u.id === record.matchedUnitId);
                const matchedMuni = municipalities.find(m => m.id === matchedUnit?.municipalityId);

                // Prepare Payload
                const newAssignment = {
                    unitId: record.matchedUnitId!,
                    unitName: matchedUnit?.name || record.unidade,
                    municipalityId: matchedUnit?.municipalityId || '',
                    municipalityName: matchedMuni?.name || 'Não Identificado',
                    occupation: record.funcao || 'Não Informado',
                    registerClass: record.numero_conselho || '',
                    active: true
                };

                // Check if professional exists
                const existing = existingProfessionals.find(p => {
                    // Match by CPF (best) or CNS
                    if (record.cpf && p.cpf && record.cpf.replace(/\D/g, '') === p.cpf.replace(/\D/g, '')) return true;
                    if (record.cnes && p.cns && record.cnes.replace(/\D/g, '') === p.cns.replace(/\D/g, '')) return true;
                    return false;
                });

                if (existing) {
                    // Update Logic
                    const updatedAssignments = [...(existing.assignments || [])];
                    const assignIndex = updatedAssignments.findIndex(a => a.unitId === newAssignment.unitId);

                    if (assignIndex >= 0) {
                        updatedAssignments[assignIndex] = {
                            ...updatedAssignments[assignIndex],
                            ...newAssignment
                        };
                    } else {
                        updatedAssignments.push(newAssignment);
                    }

                    const updatePayload: Partial<Professional> = {
                        assignments: updatedAssignments,
                        name: record.nome || existing.name,
                        email: record.email || existing.email,
                        occupation: newAssignment.occupation, // Ensure root occupation is updated
                        ...(record.cns ? { cns: record.cns } : {}),
                        ...(record.cpf ? { cpf: record.cpf } : {}),
                    };

                    await updateProfessional(existing.id, updatePayload);

                } else {
                    // Create Logic
                    const newProfessional: any = {
                        entityId,
                        entityName,
                        name: record.nome,
                        cns: String(record.cns),
                        cpf: record.cpf ? String(record.cpf) : '',
                        email: record.email || '',
                        occupation: newAssignment.occupation, // Ensure root occupation is set
                        phone: '',
                        active: true,
                        assignments: [newAssignment]
                    };

                    const legacyPayload = {
                        ...newProfessional,
                        unitId: newAssignment.unitId,
                        unitName: newAssignment.unitName,
                        municipalityId: newAssignment.municipalityId,
                        municipalityName: newAssignment.municipalityName,
                        occupation: newAssignment.occupation,
                        registerClass: newAssignment.registerClass,
                        entityType: 'private'
                    };

                    await createProfessional(legacyPayload);
                }

            } catch (error) {
                console.error("Failed to import record", record, error);
                errorsCount++;
                setImportProgress(prev => ({ ...prev, errors: prev.errors + 1 }));
            }
        }

        setTimeout(() => {
            onSuccess();
            onClose();
            alert(`Importação concluída! ${parsedData.length - errorsCount} sucessos, ${errorsCount} erros.`);
            setStep('upload');
            setFile(null);
            setParsedData([]);
            setRawText(null);
        }, 500);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Importar Profissionais"
            className="max-w-[90vw]"
        >
            <div className="space-y-6">

                {step === 'upload' && (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 bg-gray-50 dark:bg-gray-800/50">
                        <Upload className="w-12 h-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Carregar Arquivo</h3>
                        <p className="text-sm text-gray-500 mb-6 text-center max-w-xs">
                            Suportado: <strong>.xlsx, .pdf, .docx, .json</strong>
                            <br />
                            <span className="text-xs text-emerald-600">Recomendado: Excel (.xlsx) com colunas: Nome, CNS, Unidade, Função.</span>
                        </p>

                        <input
                            type="file"
                            accept=".json, .xlsx, .xls, .pdf, .docx"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                        />
                        <label
                            htmlFor="file-upload"
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer transition-colors font-medium"
                        >
                            Selecionar Arquivo
                        </label>
                        {file && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700">
                                <FileText className="w-4 h-4" />
                                {file.name}
                                <button onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500 ml-2"><X className="w-4 h-4" /></button>
                            </div>
                        )}

                        {errorMsg && (
                            <p className="mt-4 text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" /> {errorMsg}
                            </p>
                        )}

                        <div className="mt-6 w-full flex justify-end">
                            <Button
                                disabled={!file || isProcessing}
                                onClick={parseFile}
                                variant="primary"
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {isProcessing ? 'Processando...' : 'Continuar'}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'preview' && rawText && (
                    <div className="flex flex-col h-[500px]">
                        <div className="mb-4">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-yellow-500" />
                                Texto Extraído (Não Estruturado)
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                                <strong>Atenção:</strong> Arquivos PDF/DOCX fornecem apenas o texto bruto.
                                O sistema <strong>não pode importar automaticamente</strong> pois os dados não estão em tabela estruturada.
                                <br />
                                Abaixo está o texto extraído para sua conferência ou cópia manual.
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                                {rawText}
                            </pre>
                        </div>

                        <div className="mt-4 flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button variant="outline" onClick={() => { setStep('upload'); setRawText(null); }}>
                                Voltar
                            </Button>
                            <Button variant="secondary" onClick={() => { setStep('upload'); setRawText(null); }}>
                                Ok, entendi
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'preview' && !rawText && (
                    <div className="flex flex-col h-[500px]">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Pré-visualização</h3>
                                <p className="text-sm text-gray-500">Verifique os dados antes de importar.</p>
                            </div>
                            <div className="flex gap-2">
                                <Badge type="neutral">{parsedData.length} Registros</Badge>
                                <Badge type="success">{parsedData.filter(r => r.status === 'valid').length} Válidos</Badge>
                                {parsedData.some(r => r.status === 'error') && (
                                    <Badge type="error">{parsedData.filter(r => r.status === 'error').length} Erros</Badge>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-medium sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 w-8"></th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3">Nome</th>
                                        <th className="p-3">CNS / CPF</th>
                                        <th className="p-3">Função (Detectada)</th>
                                        <th className="p-3 w-64 text-center">Unidade (Vínculo)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 min-h-[300px]">
                                    {parsedData.map((row, idx) => (
                                        <tr key={idx} className={row.status === 'error' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                            <td className="p-3">
                                                <button
                                                    onClick={() => handleRemoveRecord(idx)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Remover linha"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </td>
                                            <td className="p-3">
                                                {row.status === 'valid' ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <div className="group relative">
                                                        <AlertCircle className="w-4 h-4 text-red-500 cursor-help" />
                                                        <span className="absolute left-6 top-0 w-48 p-2 bg-black text-white text-xs rounded hidden group-hover:block z-50">
                                                            {row.message}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 max-w-[150px] truncate" title={row.nome}>{row.nome}</td>
                                            <td className="p-3">
                                                <div className="flex flex-col text-xs text-gray-500">
                                                    <span>{row.cns || '-'}</span>
                                                    <span className="scale-90 origin-left">{row.cpf}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                {/* Select for CBO */}
                                                <select
                                                    className={`w-full text-xs p-1 rounded border ${!row.funcao ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300 dark:border-gray-600 dark:bg-gray-800'} focus:ring-2 focus:ring-emerald-500 focus:outline-none`}
                                                    value={row.funcao || ''}
                                                    onChange={e => {
                                                        const newData = [...parsedData];
                                                        newData[idx].funcao = e.target.value;
                                                        setParsedData(newData);
                                                    }}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {/* If the current value is not in list (legacy/raw import), show it so it's not hidden, unless we force correction */}
                                                    {row.funcao && !CBO_LIST.some(g => g.options.some(o => o.label === row.funcao)) && (
                                                        <option value={row.funcao} disabled className="bg-red-100 text-red-800">
                                                            ⚠️ {row.funcao} (Inválido)
                                                        </option>
                                                    )}

                                                    {CBO_LIST.map(g => (
                                                        <optgroup key={g.group} label={g.group}>
                                                            {g.options.map(opt => (
                                                                <option key={opt.value} value={opt.label}>{opt.label}</option>
                                                            ))}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-3 text-center">
                                                <select
                                                    className={`w-full text-xs p-1 rounded border ${!row.matchedUnitId ? 'border-red-300 bg-red-50 text-red-700' : 'border-emerald-300 bg-emerald-50 text-emerald-700'}`}
                                                    value={row.matchedUnitId || ''}
                                                    onChange={(e) => handleUnitSelect(idx, e.target.value)}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {units.sort((a, b) => a.name.localeCompare(b.name)).map(u => (
                                                        <option key={u.id} value={u.id}>{u.name}</option>
                                                    ))}
                                                </select>
                                                <div className="text-[10px] text-gray-400 mt-1 truncate" title={row.unidade}>
                                                    Arquivo: {row.unidade}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button variant="outline" onClick={() => { setStep('upload'); setParsedData([]); }}>
                                Voltar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleImport}
                                disabled={parsedData.filter(r => r.status === 'valid').length === 0}
                            >
                                Importar {parsedData.filter(r => r.status === 'valid').length} Profissionais
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'importing' && (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Importando...</h3>
                        <p className="text-gray-500 mb-6">
                            Processando registro {importProgress.current} de {importProgress.total}
                        </p>

                        <div className="w-full max-w-md bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2 overflow-hidden">
                            <div
                                className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                            ></div>
                        </div>
                        {importProgress.errors > 0 && (
                            <p className="text-sm text-red-500 mt-2">{importProgress.errors} erros encontrados até agora</p>
                        )}
                    </div>
                )}

            </div>
        </Modal>
    );
};
