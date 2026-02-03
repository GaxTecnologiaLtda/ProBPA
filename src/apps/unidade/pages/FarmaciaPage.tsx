import React, { useState, useEffect } from 'react';
import {
    Pill, Search, Filter, Plus, Package, Calendar, AlertTriangle, ArrowRight, ArrowLeft,
    Clock, RefreshCw, XCircle, CheckCircle2, MoreHorizontal, User, FileText,
    TrendingUp, TrendingDown, Edit2, Archive, Trash2, History, ShieldAlert
} from 'lucide-react';
import { useUnidadeAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type Profile = 'RECEPCIONISTA' | 'COORDENADOR';
type InventoryStatus = 'OK' | 'BAIXO' | 'ZERADO' | 'VENCIDO' | 'VENCENDO';
type MovementType = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'ESTORNO';

interface Medicine {
    id: string;
    name: string;
    presentation: string; // e.g. "comprimido 500mg"
    unit: string; // e.g. "cp"
    minStock?: number;
    active: boolean;
    createdAt: string;
    createdBy: string;
    updatedAt?: string;
    updatedBy?: string;
}

interface Batch {
    id: string;
    medicineId: string;
    code: string;
    expiryDate: string;
    quantity: number;
    createdAt: string;
    createdBy: string;
}

interface Movement {
    id: string;
    date: string; // ISO
    type: MovementType;
    medicineId: string;
    batchId: string;
    quantity: number; // positive or negative
    reason?: string;
    observation?: string;
    userId: string;
    userName: string;
    userRole: string;
    originalMovementId?: string; // If this is a reversal
    isReversed?: boolean; // If this movement has been reversed
}

// --- Mock Data ---
const MOCK_MEDICINES: Medicine[] = [
    { id: '1', name: 'Dipirona Sódica', presentation: '500mg Comprimido', unit: 'cp', minStock: 200, active: true, createdAt: '2025-01-01', createdBy: 'Coordenação' },
    { id: '2', name: 'Paracetamol', presentation: '750mg Comprimido', unit: 'cp', minStock: 150, active: true, createdAt: '2025-01-01', createdBy: 'Coordenação' },
    { id: '3', name: 'Amoxicilina', presentation: '500mg Cápsula', unit: 'cap', minStock: 50, active: true, createdAt: '2025-01-01', createdBy: 'Coordenação' },
    { id: '4', name: 'Ibuprofeno', presentation: 'Suspensão 100mg/5ml', unit: 'frasco', minStock: 20, active: true, createdAt: '2025-01-01', createdBy: 'Coordenação' },
    { id: '5', name: 'Omeprazol', presentation: '20mg Cápsula', unit: 'cap', minStock: 100, active: true, createdAt: '2025-01-02', createdBy: 'Coordenação' },
    { id: '6', name: 'Loratadina', presentation: '10mg Comprimido', unit: 'cp', minStock: 50, active: true, createdAt: '2025-01-02', createdBy: 'Coordenação' },
    { id: '7', name: 'Losartana Potássica', presentation: '50mg Comprimido', unit: 'cp', minStock: 300, active: true, createdAt: '2025-01-05', createdBy: 'Coordenação' },
    { id: '8', name: 'Metformina', presentation: '850mg Comprimido', unit: 'cp', minStock: 300, active: true, createdAt: '2025-01-05', createdBy: 'Coordenação' },
    { id: '9', name: 'Simeticona', presentation: 'Gotas 75mg/ml', unit: 'frasco', minStock: 10, active: false, createdAt: '2025-01-10', createdBy: 'Coordenação' },
    { id: '10', name: 'Soro Fisiológico', presentation: '0,9% 500ml', unit: 'frasco', minStock: 30, active: true, createdAt: '2025-01-12', createdBy: 'Coordenação' },
];

const MOCK_BATCHES: Batch[] = [
    { id: 'b1', medicineId: '1', code: 'L001', expiryDate: '2026-06-01', quantity: 500, createdAt: '2025-01-01', createdBy: 'Coordenação' },
    { id: 'b2', medicineId: '2', code: 'L002', expiryDate: '2026-05-15', quantity: 300, createdAt: '2025-01-01', createdBy: 'Coordenação' },
    { id: 'b3', medicineId: '3', code: 'L999', expiryDate: '2025-01-20', quantity: 15, createdAt: '2025-01-01', createdBy: 'Coordenação' }, // Vencendo
    { id: 'b4', medicineId: '4', code: 'L888', expiryDate: '2023-12-01', quantity: 5, createdAt: '2024-01-01', createdBy: 'Coordenação' }, // Vencido
    { id: 'b5', medicineId: '7', code: 'L777', expiryDate: '2026-10-01', quantity: 100, createdAt: '2025-01-05', createdBy: 'Coordenação' }, // Baixo
    { id: 'b6', medicineId: '8', code: 'L666', expiryDate: '2026-11-01', quantity: 0, createdAt: '2025-01-05', createdBy: 'Coordenação' }, // Zerado
];

// --- Helpers ---
const getInventoryStatus = (batch: Batch, med: Medicine): InventoryStatus => {
    if (batch.quantity === 0) return 'ZERADO';

    const today = new Date();
    const expiry = new Date(batch.expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'VENCIDO';
    if (diffDays <= 30) return 'VENCENDO';

    // Low stock logic implies checking total stock, but here we check per batch for simplicity or strict batch management
    // Realistically low stock is per medicine. Let's keep it simple: Status per batch mostly relies on expiry.
    // However, if we want "Baixo" to appear, we should check minStock. Visual simplification: 
    // If quantity < minStock (approx/heuristic) -> BAIXO. 
    // Since minStock is global, let's just use Expiry status mostly, and Low Stock for the Medicine Total.

    return 'OK';
};

const getStatusBadge = (status: InventoryStatus) => {
    switch (status) {
        case 'OK': return 'bg-green-100 text-green-700 border-green-200';
        case 'BAIXO': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case 'ZERADO': return 'bg-gray-100 text-gray-500 border-gray-200';
        case 'VENCENDO': return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'VENCIDO': return 'bg-red-100 text-red-700 border-red-200';
    }
};

const getMovementBadge = (type: MovementType) => {
    switch (type) {
        case 'ENTRADA': return 'bg-green-50 text-green-700';
        case 'SAIDA': return 'bg-blue-50 text-blue-700';
        case 'AJUSTE': return 'bg-orange-50 text-orange-700';
        case 'ESTORNO': return 'bg-gray-100 text-gray-600 border border-gray-200 line-through decoration-gray-400';
    }
};


// --- Components ---

const FarmaciaPage: React.FC = () => {
    const { user } = useUnidadeAuth();
    const role = user?.role || 'RECEPCIONISTA';
    const isCoordinator = role === 'COORDENADOR';

    const [activeTab, setActiveTab] = useState<'ESTOQUE' | 'MOVIMENTACOES' | 'CATALOGO'>('ESTOQUE');

    // State
    const [medicines, setMedicines] = useState<Medicine[]>(MOCK_MEDICINES);
    const [batches, setBatches] = useState<Batch[]>(MOCK_BATCHES);
    const [movements, setMovements] = useState<Movement[]>([]);

    // Search/Filter
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<InventoryStatus | 'ALL'>('ALL');
    const [showInactive, setShowInactive] = useState(false);

    // Modals
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false);
    const [isBatchDrawerOpen, setIsBatchDrawerOpen] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null); // For editing

    // --- Logic: Derived State ---
    const getStockTotal = (medId: string) => batches.filter(b => b.medicineId === medId).reduce((acc, b) => acc + b.quantity, 0);

    const enrichedBatches = batches.map(b => {
        const med = medicines.find(m => m.id === b.medicineId);
        return { ...b, medicine: med, status: med ? getInventoryStatus(b, med) : 'OK' };
    }).filter(b => {
        if (!showInactive && !b.medicine?.active) return false;
        if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
        if (searchTerm && !b.medicine?.name.toLowerCase().includes(searchTerm.toLowerCase()) && !b.code.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const stats = {
        totalItems: enrichedBatches.reduce((acc, b) => acc + b.quantity, 0),
        expired: enrichedBatches.filter(b => b.status === 'VENCIDO').length,
        expiring: enrichedBatches.filter(b => b.status === 'VENCENDO').length,
        zero: enrichedBatches.filter(b => b.quantity === 0).length,
    };

    // --- Logic: Actions ---

    // Movement Form State
    const [movType, setMovType] = useState<MovementType>('SAIDA');
    const [movMedicineId, setMovMedicineId] = useState('');
    const [movBatchId, setMovBatchId] = useState('');
    const [movQty, setMovQty] = useState<number | ''>('');
    const [movReason, setMovReason] = useState(''); // For Adjust/Estorno
    // New Batch Fields
    const [isNewBatch, setIsNewBatch] = useState(false);
    const [newBatchCode, setNewBatchCode] = useState('');
    const [newBatchExpiry, setNewBatchExpiry] = useState('');

    // Medicine Form State
    const [medName, setMedName] = useState('');
    const [medPresentation, setMedPresentation] = useState('');
    const [medUnit, setMedUnit] = useState('cp');
    const [medMinStock, setMedMinStock] = useState<number | ''>('');

    // Handlers
    const handleOpenMedicineModal = (med?: Medicine) => {
        if (med) {
            setSelectedMedicine(med);
            setMedName(med.name);
            setMedPresentation(med.presentation);
            setMedUnit(med.unit);
            setMedMinStock(med.minStock || '');
        } else {
            setSelectedMedicine(null);
            setMedName('');
            setMedPresentation('');
            setMedUnit('cp');
            setMedMinStock('');
        }
        setIsMedicineModalOpen(true);
    };

    const handleSaveMedicine = () => {
        if (!medName || !medPresentation) return;

        if (selectedMedicine) {
            // Edit
            setMedicines(prev => prev.map(m => m.id === selectedMedicine.id ? {
                ...m,
                name: medName,
                presentation: medPresentation,
                unit: medUnit,
                minStock: Number(medMinStock) || 0,
                updatedAt: new Date().toISOString(),
                updatedBy: user?.name
            } : m));
        } else {
            // Create
            const newMed: Medicine = {
                id: Math.random().toString(36).substr(2, 9),
                name: medName,
                presentation: medPresentation,
                unit: medUnit,
                minStock: Number(medMinStock) || 0,
                active: true,
                createdAt: new Date().toISOString(),
                createdBy: user?.name || 'Sistema'
            };
            setMedicines([newMed, ...medicines]);
        }
        setIsMedicineModalOpen(false);
    };

    const handleToggleActive = (med: Medicine) => {
        if (confirm(`Tem certeza que deseja ${med.active ? 'inativar' : 'ativar'} este medicamento?`)) {
            setMedicines(prev => prev.map(m => m.id === med.id ? { ...m, active: !m.active } : m));
        }
    };

    const handleOpenMovementModal = (preselectedBatch?: Batch, type: MovementType = 'SAIDA') => {
        setMovType(type);
        if (preselectedBatch) {
            setMovMedicineId(preselectedBatch.medicineId);
            setMovBatchId(preselectedBatch.id);
        } else {
            setMovMedicineId('');
            setMovBatchId('');
        }
        setMovQty('');
        setMovReason('');
        setIsNewBatch(false);
        setNewBatchCode('');
        setNewBatchExpiry('');
        setIsMovementModalOpen(true);
    };

    const handleConfirmMovement = () => {
        if (!movMedicineId || !movQty) return;

        const medicine = medicines.find(m => m.id === movMedicineId);
        let targetBatchId = movBatchId;

        // Create New Batch if Entry
        if (movType === 'ENTRADA' && isNewBatch) {
            const newBatchId = Math.random().toString(36).substr(2, 9);
            const newBatch: Batch = {
                id: newBatchId,
                medicineId: movMedicineId,
                code: newBatchCode,
                expiryDate: newBatchExpiry,
                quantity: 0, // Starts at 0, updated by movement
                createdAt: new Date().toISOString(),
                createdBy: user?.name || 'Sistema'
            };
            setBatches([...batches, newBatch]);
            targetBatchId = newBatchId;
        }

        const batch = batches.find(b => b.id === targetBatchId) || (movType === 'ENTRADA' && isNewBatch ? { id: targetBatchId } as Batch : null);
        if (!batch) return;

        // Validation
        if (movType === 'SAIDA' && Number(movQty) > (batch.quantity || 0)) {
            alert('Quantidade insuficiente em estoque.');
            return;
        }

        // Create Movement Record
        const newMovement: Movement = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString(),
            type: movType,
            medicineId: movMedicineId,
            batchId: targetBatchId,
            quantity: movType === 'SAIDA' || (movType === 'AJUSTE' && Number(movQty) < 0) ? -Number(movQty) : Number(movQty),
            reason: movReason,
            userId: user?.id || 'uid',
            userName: user?.name || 'Usuario',
            userRole: user?.role || 'RECEPCIONISTA'
        };

        setMovements([newMovement, ...movements]);

        // Update Batch Quantity
        setBatches(currentBatches => currentBatches.map(b => {
            if (b.id === targetBatchId) {
                const change = movType === 'SAIDA' ? -Number(movQty) : Number(movQty);
                // Assuming Adjustment is positive input for adding, negative logic handled if we wanted. 
                // For now per requirements, "Entrada/Saida" cover most. "Ajuste" acts as positive addition unless logic changed.
                // Let's assume input is magnitude.
                return { ...b, quantity: Math.max(0, b.quantity + change) };
            }
            return b;
        }));

        setIsMovementModalOpen(false);
        setIsBatchDrawerOpen(false); // Close drawer if open
    };

    // Derived for Modal
    const availableBatches = batches.filter(b => b.medicineId === movMedicineId);

    return (
        <div className="flex flex-col h-screen bg-gray-50 text-gray-900">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                            <Pill className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Farmácia (UBS)</h1>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border uppercase tracking-wide ${isCoordinator ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            {isCoordinator ? 'Coordenação' : 'Recepção'}
                        </span>
                    </div>
                    <p className="text-gray-500 text-sm">Controle de estoque por lote e validade, com rastreabilidade completa.</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleOpenMovementModal(undefined, 'SAIDA')}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Nova Movimentação
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-8 mt-6">
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('ESTOQUE')}
                        className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'ESTOQUE' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <Package className="w-4 h-4" /> Estoque (Lotes)
                    </button>
                    <button
                        onClick={() => setActiveTab('MOVIMENTACOES')}
                        className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'MOVIMENTACOES' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <History className="w-4 h-4" /> Movimentações
                    </button>
                    {isCoordinator && (
                        <button
                            onClick={() => setActiveTab('CATALOGO')}
                            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'CATALOGO' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            <FileText className="w-4 h-4" /> Catálogo
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">

                {/* --- TAB ESTOQUE --- */}
                {activeTab === 'ESTOQUE' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Package className="w-6 h-6" /></div>
                                <div><p className="text-2xl font-bold">{stats.totalItems}</p><p className="text-xs text-gray-500 uppercase font-bold">Itens em Estoque</p></div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-red-50 text-red-600 rounded-lg"><XCircle className="w-6 h-6" /></div>
                                <div><p className="text-2xl font-bold">{stats.expired}</p><p className="text-xs text-gray-500 uppercase font-bold">Lotes Vencidos</p></div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><Clock className="w-6 h-6" /></div>
                                <div><p className="text-2xl font-bold">{stats.expiring}</p><p className="text-xs text-gray-500 uppercase font-bold">Vencendo (30d)</p></div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-gray-100 text-gray-500 rounded-lg"><AlertTriangle className="w-6 h-6" /></div>
                                <div><p className="text-2xl font-bold">{stats.zero}</p><p className="text-xs text-gray-500 uppercase font-bold">Lotes Zerados</p></div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex gap-4 items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar medicamento ou lote..."
                                    className="w-full pl-9 pr-4 py-2 text-sm outline-none"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="h-6 w-px bg-gray-200" />
                            <select
                                className="bg-transparent text-sm font-medium text-gray-600 outline-none cursor-pointer"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                            >
                                <option value="ALL">Todos os status</option>
                                <option value="OK">Estoque OK</option>
                                <option value="VENCENDO">Vencendo</option>
                                <option value="VENCIDO">Vencido</option>
                                <option value="ZERADO">Zerado</option>
                            </select>
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                                <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                                Mostrar inativos
                            </label>
                        </div>

                        {/* Table */}
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-xs">
                                    <tr>
                                        <th className="p-4">Medicamento / Apresentação</th>
                                        <th className="p-4">Lote</th>
                                        <th className="p-4">Validade</th>
                                        <th className="p-4 text-center">Qtd.</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {enrichedBatches.map(batch => (
                                        <tr key={batch.id} className="hover:bg-gray-50 group transition-colors">
                                            <td className="p-4">
                                                <p className="font-bold text-gray-900">{batch.medicine?.name}</p>
                                                <p className="text-xs text-gray-500">{batch.medicine?.presentation}</p>
                                            </td>
                                            <td className="p-4 font-mono text-gray-600">{batch.code}</td>
                                            <td className="p-4 text-gray-600">{new Date(batch.expiryDate).toLocaleDateString('pt-BR')}</td>
                                            <td className="p-4 text-center font-bold text-gray-900">{batch.quantity} <span className="text-xs text-gray-400 font-normal">{batch.medicine?.unit}</span></td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${getStatusBadge(batch.status as any)}`}>
                                                    {batch.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenMovementModal(batch, 'SAIDA')}
                                                    className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition"
                                                    title="Registrar Saída"
                                                >
                                                    <TrendingDown className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenMovementModal(batch, 'ENTRADA')}
                                                    className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg transition"
                                                    title="Registrar Entrada"
                                                >
                                                    <TrendingUp className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedBatch(batch); setIsBatchDrawerOpen(true); }}
                                                    className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-700 transition"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {enrichedBatches.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-gray-400">
                                                Nenhum lote encontrado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- TAB MOVIMENTACOES --- */}
                {activeTab === 'MOVIMENTACOES' && (
                    <div className="flex flex-col animate-in fade-in">
                        <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-xs">
                                    <tr>
                                        <th className="p-4">Data / Hora</th>
                                        <th className="p-4">Tipo</th>
                                        <th className="p-4">Item / Lote</th>
                                        <th className="p-4 text-center">Qtd.</th>
                                        <th className="p-4">Responsável</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {movements.map(mov => {
                                        const med = medicines.find(m => m.id === mov.medicineId);
                                        const batch = batches.find(b => b.id === mov.batchId) || { code: 'N/A' };
                                        return (
                                            <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 text-gray-600">{new Date(mov.date).toLocaleString()}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${getMovementBadge(mov.type)}`}>
                                                        {mov.type}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <p className="font-bold text-gray-900">{med?.name}</p>
                                                    <p className="text-xs text-gray-500 font-mono">Lote: {batch.code}</p>
                                                    {mov.reason && <p className="text-xs text-gray-400 italic mt-0.5 max-w-xs truncate">{mov.reason}</p>}
                                                </td>
                                                <td className="p-4 text-center font-bold">
                                                    {mov.quantity > 0 ? '+' : ''}{mov.quantity}
                                                </td>
                                                <td className="p-4 text-sm text-gray-600">
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="w-3 h-3 text-gray-400" /> {mov.userName}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {movements.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-gray-400">
                                                Nenhuma movimentação registrada nesta sessão.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}


                {/* --- TAB CATALOGO --- */}
                {activeTab === 'CATALOGO' && isCoordinator && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="flex items-center justify-between">
                            <div className="flex gap-4 items-center bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex-1 max-w-lg">
                                <Search className="w-4 h-4 text-gray-400 ml-2" />
                                <input
                                    type="text"
                                    placeholder="Buscar medicamento..."
                                    className="w-full text-sm outline-none"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-sm"
                                onClick={() => handleOpenMedicineModal()}
                            >
                                <Plus className="w-4 h-4" /> Novo Medicamento
                            </button>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-xs">
                                    <tr>
                                        <th className="p-4">Medicamento</th>
                                        <th className="p-4">Apresentação</th>
                                        <th className="p-4">Unidade</th>
                                        <th className="p-4 text-center">Estoque Min.</th>
                                        <th className="p-4 text-center">Total Atual</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {medicines.filter(m =>
                                        m.name.toLowerCase().includes(searchTerm.toLowerCase())
                                    ).map(med => {
                                        const currentStock = getStockTotal(med.id);
                                        return (
                                            <tr key={med.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 font-bold text-gray-900">{med.name}</td>
                                                <td className="p-4 text-gray-600">{med.presentation}</td>
                                                <td className="p-4 text-gray-600">{med.unit}</td>
                                                <td className="p-4 text-center text-gray-600">{med.minStock || '-'}</td>
                                                <td className="p-4 text-center font-bold text-gray-900">{currentStock}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${med.active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                        {med.active ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenMedicineModal(med)}
                                                        className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(med)}
                                                        className={`p-1.5 hover:bg-gray-100 rounded-lg transition ${med.active ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                                                        title={med.active ? 'Inativar' : 'Ativar'}
                                                    >
                                                        {med.active ? <Trash2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>

            {/* Drawer Details */}
            <AnimatePresence>
                {isBatchDrawerOpen && selectedBatch && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                            onClick={() => setIsBatchDrawerOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
                        >
                            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                <h2 className="text-lg font-bold text-gray-900">Detalhes do Lote</h2>
                                <button onClick={() => setIsBatchDrawerOpen(false)}><XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
                            </div>
                            <div className="p-6 flex-1 overflow-y-auto">
                                <div className="mb-6">
                                    <h3 className="font-bold text-xl text-gray-900 mb-1">{selectedBatch.medicine?.name}</h3>
                                    <p className="text-gray-500">{selectedBatch.medicine?.presentation}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-xs text-gray-500 uppercase font-bold">Lote</p>
                                        <p className="font-mono font-bold text-gray-800">{selectedBatch.code}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-xs text-gray-500 uppercase font-bold">Validade</p>
                                        <p className="font-bold text-gray-800">{new Date(selectedBatch.expiryDate).toLocaleDateString()}</p>
                                    </div>
                                    <div className="col-span-2 p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-emerald-600 uppercase font-bold">Estoque Atual</p>
                                            <p className="text-2xl font-bold text-emerald-800">{selectedBatch.quantity} <span className="text-sm font-normal">{selectedBatch.medicine?.unit}</span></p>
                                        </div>
                                        <Package className="w-8 h-8 text-emerald-200" />
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-6">
                                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4 text-gray-400" /> Rastreabilidade
                                    </h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Criado em:</span>
                                            <span className="font-medium text-gray-700">{new Date(selectedBatch.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Por:</span>
                                            <span className="font-medium text-gray-700">{selectedBatch.createdBy}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="mt-8 space-y-3">
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Ações Rápidas</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleOpenMovementModal(selectedBatch, 'ENTRADA')}
                                            className="p-3 bg-green-50 text-green-700 rounded-xl font-bold text-sm hover:bg-green-100 transition flex items-center justify-center gap-2 border border-green-200"
                                        >
                                            <TrendingUp className="w-4 h-4" /> Entrada
                                        </button>
                                        <button
                                            onClick={() => handleOpenMovementModal(selectedBatch, 'SAIDA')}
                                            className="p-3 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-100 transition flex items-center justify-center gap-2 border border-blue-200"
                                        >
                                            <TrendingDown className="w-4 h-4" /> Saída
                                        </button>
                                    </div>
                                    {isCoordinator && (
                                        <button
                                            onClick={() => handleOpenMovementModal(selectedBatch, 'AJUSTE')}
                                            className="w-full p-3 bg-gray-50 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-100 transition flex items-center justify-center gap-2 border border-gray-200"
                                        >
                                            <Edit2 className="w-4 h-4" /> Ajuste de Inventário
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Movement Modal */}
            <AnimatePresence>
                {isMovementModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
                        >
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h2 className="text-lg font-bold text-gray-900">Nova Movimentação</h2>
                                <button onClick={() => setIsMovementModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                    <XCircle className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Type Selection */}
                                <div className="grid grid-cols-2 gap-2">
                                    {['ENTRADA', 'SAIDA'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setMovType(type as MovementType)}
                                            className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${movType === type
                                                ? (type === 'ENTRADA' ? 'bg-green-100 border-green-200 text-green-700' : 'bg-blue-100 border-blue-200 text-blue-700')
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {type === 'ENTRADA' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                            {type === 'ENTRADA' ? 'Entrada' : 'Saída'}
                                        </button>
                                    ))}
                                    {isCoordinator && (
                                        <button
                                            onClick={() => setMovType('AJUSTE')}
                                            className={`col-span-2 p-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${movType === 'AJUSTE'
                                                ? 'bg-orange-100 border-orange-200 text-orange-700'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            <Edit2 className="w-4 h-4" /> Ajuste Manual
                                        </button>
                                    )}
                                </div>

                                {/* Form */}
                                <div className="space-y-4 pt-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Medicamento</label>
                                        <select
                                            className="w-full text-base border-gray-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border"
                                            value={movMedicineId}
                                            onChange={e => { setMovMedicineId(e.target.value); setMovBatchId(''); setIsNewBatch(false); }}
                                        >
                                            <option value="">Selecione o medicamento...</option>
                                            {medicines.filter(m => m.active).map(m => (
                                                <option key={m.id} value={m.id}>{m.name} ({m.presentation})</option>
                                            ))}
                                        </select>
                                    </div>

                                    {movMedicineId && (
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-xs font-bold text-gray-500 uppercase">Lote</label>
                                                {movType === 'ENTRADA' && (
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <div className="relative inline-flex items-center">
                                                            <input type="checkbox" checked={isNewBatch} onChange={e => setIsNewBatch(e.target.checked)} className="sr-only peer" />
                                                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                                        </div>
                                                        <span className="text-xs font-medium text-gray-600">Novo Lote?</span>
                                                    </label>
                                                )}
                                            </div>

                                            {isNewBatch && movType === 'ENTRADA' ? (
                                                <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                                                    <input
                                                        type="text"
                                                        placeholder="Código do Lote"
                                                        className="w-full text-sm border-gray-300 rounded-lg p-2 border focus:ring-emerald-500 focus:border-emerald-500"
                                                        value={newBatchCode}
                                                        onChange={e => setNewBatchCode(e.target.value)}
                                                    />
                                                    <input
                                                        type="date"
                                                        className="w-full text-sm border-gray-300 rounded-lg p-2 border focus:ring-emerald-500 focus:border-emerald-500"
                                                        value={newBatchExpiry}
                                                        onChange={e => setNewBatchExpiry(e.target.value)}
                                                    />
                                                </div>
                                            ) : (
                                                <select
                                                    className="w-full text-base border-gray-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border"
                                                    value={movBatchId}
                                                    onChange={e => setMovBatchId(e.target.value)}
                                                >
                                                    <option value="">Selecione o lote...</option>
                                                    {availableBatches.map(b => (
                                                        <option key={b.id} value={b.id}>
                                                            {b.code} - Val: {new Date(b.expiryDate).toLocaleDateString()} ({b.quantity} un)
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quantidade</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full text-xl font-bold border-gray-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border"
                                            placeholder="0"
                                            value={movQty}
                                            onChange={e => setMovQty(e.target.value ? Number(e.target.value) : '')}
                                        />
                                        {movType === 'SAIDA' && movBatchId && !isNewBatch && (
                                            <p className="text-xs text-right mt-1 text-gray-500">
                                                Disponível: <strong>{batches.find(b => b.id === movBatchId)?.quantity || 0}</strong>
                                            </p>
                                        )}
                                    </div>

                                    {(movType === 'AJUSTE' || movType === 'ESTORNO') && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Motivo (Obrigatório)</label>
                                            <textarea
                                                className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border"
                                                rows={2}
                                                value={movReason}
                                                onChange={e => setMovReason(e.target.value)}
                                                placeholder="Justifique a movimentação..."
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={() => setIsMovementModalOpen(false)}
                                        className="flex-1 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleConfirmMovement}
                                        disabled={!movMedicineId || !movQty || (movType === 'ENTRADA' && isNewBatch && (!newBatchCode || !newBatchExpiry))}
                                        className="flex-1 py-3 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Confirmar Movimentação
                                    </button>
                                </div>
                                <p className="text-[10px] text-center text-gray-400 mt-2">
                                    Ação auditável por <span className="font-mono">{user?.name}</span>
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Medicine Modal */}
            <AnimatePresence>
                {isMedicineModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h2 className="text-lg font-bold text-gray-900">{selectedMedicine ? 'Editar Medicamento' : 'Novo Medicamento'}</h2>
                                <button onClick={() => setIsMedicineModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                    <XCircle className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Comercial / Genérico</label>
                                    <input
                                        type="text"
                                        className="w-full text-base border-gray-300 rounded-lg p-2 border focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="Ex: Dipirona Sódica"
                                        value={medName}
                                        onChange={e => setMedName(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Apresentação</label>
                                        <input
                                            type="text"
                                            className="w-full text-sm border-gray-300 rounded-lg p-2 border focus:ring-emerald-500 focus:border-emerald-500"
                                            placeholder="Ex: 500mg CP"
                                            value={medPresentation}
                                            onChange={e => setMedPresentation(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unidade</label>
                                        <select
                                            className="w-full text-sm border-gray-300 rounded-lg p-2 border focus:ring-emerald-500 focus:border-emerald-500"
                                            value={medUnit}
                                            onChange={e => setMedUnit(e.target.value)}
                                        >
                                            <option value="cp">Comprimido (cp)</option>
                                            <option value="cap">Cápsula (cap)</option>
                                            <option value="frasco">Frasco</option>
                                            <option value="ampola">Ampola</option>
                                            <option value="bisnaga">Bisnaga</option>
                                            <option value="ml">Mililitro (ml)</option>
                                            <option value="g">Grama (g)</option>
                                            <option value="un">Unidade (un)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estoque Mínimo (Alerta)</label>
                                    <input
                                        type="number"
                                        className="w-full text-sm border-gray-300 rounded-lg p-2 border focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="0"
                                        value={medMinStock}
                                        onChange={e => setMedMinStock(e.target.value ? Number(e.target.value) : '')}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Quantidade mínima para gerar alerta de estoque baixo.</p>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={() => setIsMedicineModalOpen(false)}
                                        className="flex-1 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveMedicine}
                                        className="flex-1 py-3 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-md"
                                    >
                                        Salvar Medicamento
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );

};

export default FarmaciaPage;
