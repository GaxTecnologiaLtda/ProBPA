import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select } from '../../components/ui/Components';
import { User, Mail, Phone, Building2, MapPin, FileSignature, CheckCircle, AlertTriangle, Upload, X, Plus, Trash2 } from 'lucide-react';
import { CBO_LIST } from '../../constants';
import { fetchUnitsByEntity } from '../../services/unitsService';
import { createProfessional } from '../../services/professionalsService';
import { getDoc, doc, collection, addDoc, serverTimestamp, setDoc as firebaseSetDoc } from 'firebase/firestore';
import { db, storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Unit, Professional } from '../../types';

const ProfessionalRegistration: React.FC = () => {
    const { entityId, municipalityId } = useParams<{ entityId: string; municipalityId: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [units, setUnits] = useState<Unit[]>([]);
    const [municipalityName, setMunicipalityName] = useState('');
    const [entityName, setEntityName] = useState('');
    const [success, setSuccess] = useState(false);
    const [errorHeader, setErrorHeader] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        cpf: '',
        cns: '',
        email: '',
        phone: '',
        // Assignments (Temporary single holder for new input)
        unitId: '',
        occupation: '',
        registerClass: ''
    });

    // Multiple Assignments State
    const [assignments, setAssignments] = useState<{ unitId: string; occupation: string; registerClass: string }[]>([]);

    const handleAddAssignment = () => {
        if (!formData.unitId || !formData.occupation) {
            alert("Selecione a Unidade e a Ocupação antes de adicionar.");
            return;
        }

        // Check duplicate
        const exists = assignments.some(a => a.unitId === formData.unitId && a.occupation === formData.occupation);
        if (exists) {
            alert("Este vínculo já foi adicionado.");
            return;
        }

        setAssignments([...assignments, {
            unitId: formData.unitId,
            occupation: formData.occupation,
            registerClass: formData.registerClass
        }]);

        // Clear inputs
        setFormData(prev => ({ ...prev, unitId: '', occupation: '', registerClass: '' }));
    };

    const handleRemoveAssignment = (index: number) => {
        const newArr = [...assignments];
        newArr.splice(index, 1);
        setAssignments(newArr);
    };

    // Signature File
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!entityId || !municipalityId) {
            setErrorHeader("Link incompleto ou inválido.");
            setLoading(false);
            return;
        }
        loadData();
    }, [entityId, municipalityId]);

    const loadData = async () => {
        if (!entityId || !municipalityId) return;
        try {
            // 1. Fetch Entity Info (to get name)
            const entDoc = await getDoc(doc(db, 'entities', entityId));
            if (entDoc.exists()) {
                const d = entDoc.data();
                setEntityName(d.name || d.fantasyName || 'Entidade');
            } else {
                setErrorHeader("Entidade não encontrada.");
                setLoading(false);
                return;
            }

            // 2. Fetch Units and Filter by Municipality
            const allUnits = await fetchUnitsByEntity(entityId);
            const filtered = allUnits.filter(u => u.municipalityId === municipalityId && u.active);

            if (filtered.length === 0) {
                setErrorHeader("Nenhuma unidade encontrada para este município.");
            } else {
                setUnits(filtered);
                // Try to get municipality name from the first unit reference? 
                // Or fetching municipality specifically? 
                // For public access we might not have permission to read generic municipalities, 
                // but units are often public-read or we use the linked ones.
                // Let's rely on unit details if available, or fetch municipality if permissions allow.

                // Let's assume we can lookup the unit to get municipalityName if it's there? 
                // Actually, units don't have it. 
                // We'll try to fetch municipality doc if possible.
                // If it fails due to permissions, we'll just show "Município da URL" or blank.
                try {
                    // We need to guess the type (PUBLIC/PRIVATE) to find the path...
                    // But we can check context from entity.
                    const type = (entDoc.data().type?.includes('Priv') ? 'PRIVATE' : 'PUBLIC');
                    const munDoc = await getDoc(doc(db, 'municipalities', type, entityId, municipalityId));
                    if (munDoc.exists()) {
                        setMunicipalityName(munDoc.data().name);
                    }
                } catch (e) {
                    console.warn("Could not fetch municipality details", e);
                }
            }
        } catch (err) {
            console.error(err);
            setErrorHeader("Erro ao carregar dados do formulário.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) {
                alert("O arquivo deve ter no máximo 2MB.");
                return;
            }
            setSignatureFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (assignments.length === 0) {
            alert("Adicione pelo menos um vínculo (Unidade/CBO).");
            return;
        }
        if (!signatureFile) {
            alert("É obrigatório anexar a assinatura.");
            return;
        }

        const cpfSanitized = formData.cpf.replace(/\D/g, '');
        if (cpfSanitized.length !== 11) {
            alert("CPF inválido.");
            return;
        }

        setSubmitting(true);
        try {
            // GENERATE DETERMINISTIC ID
            // Format: entityId_CPF
            // This prevents duplicates because setDoc/create will detect if ID exists
            const customId = `${entityId}_${cpfSanitized}`;

            // Check existence logic handled by firestore.rules (allow create only) or try/catch here if we use setDoc
            // Since we upgraded rules to 'allow create: if true', we should use setDoc carefully.
            // Actually, setDoc overwrites if no rules block it. 
            // We want to BLOCK if exists.
            // But public only has 'create' permission. Does 'setDoc' on existing doc count as 'update'? Yes.
            // So if doc exists, setDoc attempts UPDATE, which fails (no permission).
            // So this IS the deduplication check!

            // 1. Upload Signature
            const timestamp = Date.now();
            const fileRef = ref(storage, `signatures/temp/${entityId}_${timestamp}_${signatureFile.name}`);
            await uploadBytes(fileRef, signatureFile);
            const signatureUrl = await getDownloadURL(fileRef);

            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(signatureFile);
            });

            // 2. Prepare Assignments
            const assignmentsData = assignments.map(a => {
                const u = units.find(unit => unit.id === a.unitId);
                return {
                    unitId: a.unitId,
                    unitName: u?.name || '',
                    municipalityId,
                    municipalityName: municipalityName || 'Município',
                    occupation: a.occupation,
                    registerClass: a.registerClass,
                    active: true
                };
            });

            // Primary Assignment (for legacy/root fields) - Use first one
            const primary = assignmentsData[0];

            const newProf = {
                entityId,
                entityName,
                name: formData.name,
                cpf: formData.cpf, // Keep formatted or sanitize? Usually keep formatting or raw. Let's keep input value.
                cns: formData.cns,
                email: formData.email,
                phone: formData.phone,

                // Full Assignments List
                assignments: assignmentsData,

                // Legacy fields (from primary)
                unitId: primary.unitId,
                unitName: primary.unitName,
                municipalityId: primary.municipalityId,
                municipalityName: primary.municipalityName,
                occupation: primary.occupation,
                registerClass: primary.registerClass,
                active: true,

                // Signature
                signatureUrl,
                signatureBase64: base64,

                accessGranted: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // 3. Create Document with Deterministic ID in Root
            // Using setDoc on a NEW ID counts as CREATE.
            // Using setDoc on EXISTING ID counts as UPDATE.
            // Public Rules: allow create (true), allow update (false).
            // So duplicates will throw permission-denied!
            await firebaseSetDoc(doc(db, 'professionals', customId), newProf);

            // 4. Sync to Context
            try {
                // Fetch entity type
                const entSnap = await getDoc(doc(db, 'entities', entityId));
                const entData = entSnap.data();
                const isPrivate = entData?.type?.toString().toUpperCase().includes('PRIV');
                const pathType = isPrivate ? 'PRIVATE' : 'PUBLIC';

                const contextPath = `municipalities/${pathType}/${entityId}/${municipalityId}/professionals/${customId}`;
                await firebaseSetDoc(doc(db, contextPath), {
                    ...newProf,
                    id: customId,
                    updatedAt: serverTimestamp()
                });
            } catch (syncErr) {
                console.warn("Sync failed", syncErr);
            }

            // 5. Log
            try {
                // @ts-ignore
                const { logAction } = await import('../../services/logsService');
                await logAction({
                    action: 'CREATE',
                    target: 'PROFESSIONAL',
                    description: `Auto-cadastro do profissional ${formData.name}`,
                    entityId: entityId,
                    municipalityId: municipalityId
                });
            } catch (e) { }

            setSuccess(true);
        } catch (err: any) {
            console.error("Erro ao enviar cadastro:", err);
            if (err.code === 'permission-denied') {
                alert("Este CPF já possui um cadastro pendente ou ativo nesta entidade. Entre em contato com a administração.");
            } else {
                alert("Erro ao enviar cadastro. Tente novamente.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Carregando formulário...</div>;
    }

    if (errorHeader) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border-t-4 border-red-500">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Formulário Indisponível</h1>
                    <p className="text-gray-600 mb-6">{errorHeader}</p>
                    <p className="text-sm text-gray-400">Verifique o link ou entre em contato com o suporte.</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border-t-4 border-emerald-500">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Cadastro Realizado!</h1>
                    <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 mb-6">
                        <p className="text-emerald-800 font-medium">
                            Seus dados foram enviados com sucesso.
                        </p>
                    </div>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        A equipe de coordenação irá analisar seu cadastro. <br />
                        Você receberá acesso ao sistema assim que a validação for concluída.
                    </p>
                    <Button onClick={() => window.location.reload()} variant="outline" className="w-full h-12">
                        Realizar Novo Cadastro
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-gray-900">{entityName}</h2>
                    <p className="mt-2 text-lg text-gray-600">
                        Cadastro de Profissional - <span className="font-semibold text-emerald-600">{municipalityName || 'Carregando...'}</span>
                    </p>
                </div>

                <Card className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
                    <div className="bg-emerald-600 p-4">
                        <p className="text-white text-sm font-medium flex items-center gap-2">
                            <User className="w-4 h-4" /> Preencha seus dados corretamente
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">

                        {/* Vínculo (Múltiplos) */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center justify-between">
                                <span className="flex items-center"><Building2 className="w-4 h-4 mr-2" /> Vínculos (Lotação)</span>
                            </h3>
                            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                                Adicione <strong>todas</strong> as unidades em que você possui vínculo de atuação e atende por esta entidade no município.
                            </p>

                            {/* List Added Assignments */}
                            <div className="space-y-2 mb-4">
                                {assignments.map((assign, idx) => {
                                    const uName = units.find(u => u.id === assign.unitId)?.name || 'Unidade Desconhecida';
                                    return (
                                        <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border border-emerald-100 shadow-sm">
                                            <div>
                                                <p className="font-bold text-sm text-gray-800">{uName}</p>
                                                <p className="text-xs text-gray-500">{assign.occupation} {assign.registerClass ? `(${assign.registerClass})` : ''}</p>
                                            </div>
                                            <button type="button" onClick={() => handleRemoveAssignment(idx)} className="text-red-500 hover:text-red-700 p-1">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                                {assignments.length === 0 && (
                                    <p className="text-xs text-gray-400 italic text-center py-2">Nenhum vínculo adicionado ainda.</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 p-3 bg-gray-100/50 rounded-lg border border-dashed border-gray-300">
                                <p className="text-xs font-semibold text-gray-500 uppercase">Novo Vínculo</p>
                                <Select
                                    label="Unidade de Saúde"
                                    value={formData.unitId}
                                    onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                                >
                                    <option value="">Selecione...</option>
                                    {units.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} (CNES: {u.cnes})</option>
                                    ))}
                                </Select>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Ocupação (CBO)
                                    </label>
                                    <input
                                        list="cbo-list-public"
                                        value={formData.occupation}
                                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                                        placeholder="Busque pelo cargo ou CBO..."
                                    />
                                    <datalist id="cbo-list-public">
                                        {CBO_LIST.map((group) => (
                                            group.options.map(opt => (
                                                <option key={opt.value} value={opt.label} />
                                            ))
                                        ))}
                                    </datalist>
                                </div>

                                <Input
                                    label="Registro de Classe (CRM, COREN...)"
                                    value={formData.registerClass}
                                    onChange={(e) => setFormData({ ...formData, registerClass: e.target.value })}
                                    placeholder="Opcional"
                                />

                                <Button type="button" variant="secondary" onClick={handleAddAssignment} className="w-full flex items-center justify-center gap-2">
                                    <Plus className="w-4 h-4" /> Adicionar Vínculo
                                </Button>
                            </div>
                        </div>

                        {/* Dados Pessoais */}
                        <div className="space-y-4">
                            <Input
                                label="Nome Completo"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Seu nome completo"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="CPF"
                                    value={formData.cpf}
                                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                    required
                                    placeholder="000.000.000-00"
                                />
                                <Input
                                    label="CNS (Cartão Nacional de Saúde)"
                                    value={formData.cns}
                                    onChange={(e) => setFormData({ ...formData, cns: e.target.value })}
                                    placeholder="700 0000 0000 0000"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    type="email"
                                    label="E-mail"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    icon={<Mail className="w-4 h-4" />}
                                />
                                <Input
                                    label="Whatsapp / Celular"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                    icon={<Phone className="w-4 h-4" />}
                                />
                            </div>

                            <Input
                                label="Registro de Classe (CRM, COREN, CRO...)"
                                value={formData.registerClass}
                                onChange={(e) => setFormData({ ...formData, registerClass: e.target.value })}
                                placeholder="Opcional se não aplicável"
                            />
                        </div>

                        {/* Assinatura */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center">
                                <FileSignature className="w-4 h-4 mr-2" /> Assinatura Digitalizada
                            </h3>
                            <p className="text-xs text-blue-600 mb-4">
                                Anexe uma foto ou escaneamento da sua assinatura em papel branco.
                                Isso será usado para gerar os relatórios de produção.
                            </p>

                            <div className="flex items-center gap-4">
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-white"
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Escolher Arquivo
                                </Button>

                                {signatureFile && (
                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-gray-200">
                                        <span className="text-xs font-medium truncate max-w-[150px]">{signatureFile.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => { setSignatureFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                            >
                                {submitting ? 'Enviando Cadastro...' : 'Enviar Cadastro'}
                            </Button>
                            <p className="text-center text-xs text-gray-400 mt-4">
                                Seus dados estão seguros e serão utilizados apenas para fins de gestão de produtividade.
                            </p>
                        </div>

                    </form>
                </Card>
            </div>
        </div>
    );
};

export default ProfessionalRegistration;
