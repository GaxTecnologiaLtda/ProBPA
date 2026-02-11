import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Modal, Input, Select, Table, Skeleton } from '../../components/ui/Components';
import {
   CheckCircle, FileText, Users, Filter, ArrowUpRight,
   Download, BarChart2, PieChart, AlertTriangle, FileCode, Database,
   Calendar, ChevronRight, TrendingUp, Activity, Eye, Target, Building2, DollarSign, FileSignature, Search, X,
   Loader2, Upload, ChevronDown
} from 'lucide-react';
import {
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
   Legend, LineChart, Line, PieChart as RechartsPieChart, Cell, AreaChart, Area, Pie,
   ComposedChart, Scatter
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { fetchProfessionalsByEntity, updateProfessional } from '../../services/professionalsService';
import { municipalityReportService } from '../../services/municipalityReportService';
import { susReportService } from '../../services/susReportService';
import { fetchMunicipalitiesByEntity } from '../../services/municipalitiesService';
import { fetchUnitsByEntity } from '../../services/unitsService';
import { Professional, Municipality, Unit } from '../../types';
import { collection, doc, getDocs, getDoc, query, where, writeBatch, orderBy, limit, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import ConnectorDashboard from './ConnectorDashboard';
// import LediDashboard from './LediDashboard';

import { useDashboardData } from './useDashboardData';

// ... (keep imports)

// --- Mock Data para Gráficos e Relatórios (Mantidos para a aba Relatórios) ---

const EVOLUTION_DATA = [
   { month: 'Jan', real: 12400, meta: 12000, valor: 124000 },
   { month: 'Fev', real: 13100, meta: 12000, valor: 131000 },
   { month: 'Mar', real: 11500, meta: 12500, valor: 115000 },
   { month: 'Abr', real: 14200, meta: 13000, valor: 142000 },
   { month: 'Mai', real: 15800, meta: 13000, valor: 158000 },
   { month: 'Jun', real: 14900, meta: 13500, valor: 149000 },
   { month: 'Jul', real: 16100, meta: 14000, valor: 161000 },
];

const TOP_PROCEDURES = [
   { name: 'Consulta em Atenção Básica', qtd: 4500, val: 45000 },
   { name: 'Aferição de Pressão Arterial', qtd: 3200, val: 0 },
   { name: 'Glicemia Capilar', qtd: 2800, val: 5600 },
   { name: 'Visita Domiciliar (Nível Médio)', qtd: 1200, val: 0 },
   { name: 'Atendimento de Urgência', qtd: 850, val: 12500 },
   { name: 'Curativo Grau II', qtd: 600, val: 3000 },
   { name: 'Admin. de Medicamentos', qtd: 550, val: 1200 },
];

const DEMOGRAPHICS_AGE = [
   { name: '0-12 anos', value: 15 },
   { name: '13-19 anos', value: 10 },
   { name: '20-59 anos', value: 45 },
   { name: '60+ anos', value: 30 },
];

const DEMOGRAPHICS_SEX = [
   { name: 'Feminino', value: 58 },
   { name: 'Masculino', value: 42 },
];

const PROFESSIONAL_RANKING = [
   { id: 1, name: 'Dr. Carlos Silva', role: 'Médico Clínico', unit: 'UBS Central', qtd: 450, meta: 98, val: 4500 },
   { id: 2, name: 'Enf. Maria Souza', role: 'Enfermeira', unit: 'UBS Central', qtd: 320, meta: 110, val: 0 },
   { id: 3, name: 'Dr. Pedro Álvares', role: 'Cirurgião', unit: 'Hosp. Municipal', qtd: 120, meta: 85, val: 12000 },
   { id: 4, name: 'Tec. Ana Lima', role: 'Técnico Enf.', unit: 'PSF Vila Nova', qtd: 890, meta: 100, val: 0 },
   { id: 5, name: 'Dra. Júlia Roberts', role: 'Dentista', unit: 'CEO Municipal', qtd: 210, meta: 92, val: 8500 },
];

const UNIT_COMPARISON = [
   { name: 'UBS Central', producao: 15400, faturamento: 45000 },
   { name: 'Hosp. Municipal', producao: 8200, faturamento: 125000 },
   { name: 'PSF Vila Nova', producao: 5600, faturamento: 12000 },
   { name: 'UPA 24h', producao: 12100, faturamento: 89000 },
   { name: 'CEO Centro', producao: 2100, faturamento: 35000 },
];

const META_VS_REAL_BY_GROUP = [
   { group: 'Atenção Básica', meta: 100, real: 98 },
   { group: 'Média Complexidade', meta: 100, real: 85 },
   { group: 'Cirurgias', meta: 100, real: 60 },
   { group: 'Odontologia', meta: 100, real: 92 },
   { group: 'Vigilância', meta: 100, real: 110 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type TabType = 'dashboard' | 'reports' | 'technical' | 'ledi';

interface ReportType {
   id: string;
   title: string;
   desc: string;
   icon: any;
   color: string;
}

const Production: React.FC = () => {
   const { claims } = useAuth();
   const { production, professionals: dashboardProfessionals, municipalities: dashboardMunicipalities, goals: dashboardGoals, loading: dashboardLoading, rawRecords } = useDashboardData();


   // --- Procedure Breakdown Modal State ---
   const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);
   const [isProcedureModalOpen, setIsProcedureModalOpen] = useState(false);

   const handleProcedureClick = (procName: string) => {
      setSelectedProcedure(procName);
      setIsProcedureModalOpen(true);
   };

   // Helper to get breakdown data for selected procedure
   const getProcedureBreakdown = () => {
      // Safety check: ensure rawRecords is an array and selectedProcedure is valid
      if (!selectedProcedure || !rawRecords || !Array.isArray(rawRecords)) return [];

      const records = rawRecords.filter((r: any) => {
         const rName = r.procedureName || `Código: ${r.procedureCode}`;
         return rName === selectedProcedure;
      });

      // Aggregate by Professional
      const agg: Record<string, { quantity: number, unit: string }> = {};
      records.forEach((r: any) => {
         const profName = r.professionalName || 'Não Identificado';
         const unitName = r.unitId ? (allUnits.find(u => u.cnes === r.unitId || u.id === r.unitId)?.name || r.unitId) : 'N/A';

         if (!agg[profName]) {
            agg[profName] = { quantity: 0, unit: unitName };
         }
         agg[profName].quantity += (Number(r.quantity) || 1);
      });

      return Object.entries(agg)
         .map(([name, data]) => ({ name, ...data }))
         .sort((a, b) => b.quantity - a.quantity);
   };

   const [activeTab, setActiveTab] = useState<TabType>('dashboard');
   // Defaulting to current month dynamically
   const [selectedCompetence, setSelectedCompetence] = useState(() => {
      const now = new Date();
      return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
   });

   // Generate last 12 months + next 12 months for selector
   const generateCompetenceOptions = () => {
      const options = [];
      const today = new Date();
      // Start 6 months back, go 18 months forward to cover 2025 amply
      for (let i = -6; i < 18; i++) {
         const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
         const mm = (d.getMonth() + 1).toString().padStart(2, '0');
         const yyyy = d.getFullYear();
         options.push(`${mm}/${yyyy}`);
      }
      return options.reverse(); // Newest first
   };

   const competenceOptions = generateCompetenceOptions();

   // Estado para Relatórios
   const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
   const [isReportModalOpen, setIsReportModalOpen] = useState(false);

   // Estado Real para Relatório Profissional
   const [professionals, setProfessionals] = useState<Professional[]>([]);
   const [productionStats, setProductionStats] = useState<Record<string, number>>({});
   const [loadingReport, setLoadingReport] = useState(false);

   // States for Filter Options
   const [allMunicipalities, setAllMunicipalities] = useState<Municipality[]>([]);
   const [allUnits, setAllUnits] = useState<Unit[]>([]);

   // Helper for normalizing strings
   const normalize = (str: string) => String(str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

   // --- Filters ---
   const [filterName, setFilterName] = useState('');
   const [filterMunicipality, setFilterMunicipality] = useState('');
   const [filterUnit, setFilterUnit] = useState('');

   // Date Filter State: Input (what user types) vs Applied (what filters data)
   const [inputStartDate, setInputStartDate] = useState('');
   const [inputEndDate, setInputEndDate] = useState('');
   const [appliedStartDate, setAppliedStartDate] = useState('');
   const [appliedEndDate, setAppliedEndDate] = useState('');

   // Data State
   const [fetchedRecords, setFetchedRecords] = useState<any[]>([]); // Store raw fetched records

   // Filtered Professionals
   const filteredProfessionals = React.useMemo(() => {
      return professionals.filter(prof => {
         const matchesName = normalize(prof.name).includes(normalize(filterName));

         // Check if ANY assignment matches the municipality filter
         const matchesMunicipality = filterMunicipality
            ? prof.assignments?.some(a => normalize(a.municipalityName || prof.municipality) === normalize(filterMunicipality))
            : true;

         // Check if ANY assignment matches the unit filter
         const matchesUnit = filterUnit
            ? prof.assignments?.some(a => normalize(a.unitName || prof.unitName) === normalize(filterUnit))
            : true;

         // Check if has production in filtered range (if date filter is applied)
         // Only filter by production presence if a date filter is explicitly applied.
         // This ensures that when browsing the full competence (no date filter), we see all professionals (even those with 0).
         // But when drilling down to a date range, we likely only care about those who produced.
         const matchesProduction = (appliedStartDate && appliedEndDate)
            ? (productionStats[prof.id] || 0) > 0
            : true;

         return matchesName && matchesMunicipality && matchesUnit && matchesProduction;
      });
   }, [professionals, filterName, filterMunicipality, filterUnit, appliedStartDate, appliedEndDate, productionStats]);

   // Derive unique options for Selects - Using Fetched Data
   const uniqueMunicipalities = React.useMemo(() => {
      return allMunicipalities.map(m => m.name).sort();
   }, [allMunicipalities]);

   const uniqueUnits = React.useMemo(() => {
      let filteredUnits = allUnits;
      if (filterMunicipality) {
         // Find ID of selected municipality
         const selectedMuni = allMunicipalities.find(m => m.name === filterMunicipality);
         if (selectedMuni) {
            filteredUnits = allUnits.filter(u => u.municipalityId === selectedMuni.id);
         } else {
            filteredUnits = [];
         }
      }
      return filteredUnits.map(u => u.name).sort();
   }, [allUnits, allMunicipalities, filterMunicipality]);



   // Reset filters when modal closes or changes
   useEffect(() => {
      if (!isReportModalOpen) {
         setFilterName('');
         setFilterMunicipality('');
         setFilterUnit('');
         setInputStartDate('');
         setInputEndDate('');
         setAppliedStartDate('');
         setAppliedEndDate('');
      }
   }, [isReportModalOpen]);

   // Carregar dados quando o modal abrir e for o relatório correto
   useEffect(() => {
      if (isReportModalOpen && selectedReport?.id === 'profissional' && claims?.entityId) {
         loadManagementData();
      }
   }, [isReportModalOpen, selectedReport, selectedCompetence, claims?.entityId]);

   // Re-calculate Production Stats when Applied Filter or Records change
   useEffect(() => {
      if (fetchedRecords.length === 0) {
         setProductionStats({});
         return;
      }

      let filtered = fetchedRecords;

      // Apply Date Filter
      if (appliedStartDate && appliedEndDate) {
         filtered = fetchedRecords.filter(r => {
            const rRaw = r.rawDate;
            if (!rRaw) return false;
            return rRaw >= appliedStartDate && rRaw <= appliedEndDate;
         });
      }

      // Aggregate Stats
      const stats: Record<string, number> = {};
      filtered.forEach((p: any) => {
         const pId = p.professionalId;
         if (pId) {
            stats[pId] = (stats[pId] || 0) + (Number(p.quantity) || 0);
         }
      });
      setProductionStats(stats);

   }, [fetchedRecords, appliedStartDate, appliedEndDate]);

   // Carregar Municípios globalmente (necessário para filtros e LEDI)
   useEffect(() => {
      if (claims?.entityId) {
         fetchMunicipalitiesByEntity(claims.entityId).then(setAllMunicipalities).catch(console.error);
      }
   }, [claims?.entityId]);

   const loadManagementData = async () => {
      if (!claims?.entityId) return;
      setLoadingReport(true);
      try {
         // 1. Fetch Professionals, Municipalities, and Units
         const [profs, munis, units] = await Promise.all([
            fetchProfessionalsByEntity(claims.entityId),
            fetchMunicipalitiesByEntity(claims.entityId),
            fetchUnitsByEntity(claims.entityId)
         ]);

         setProfessionals(profs);
         setAllMunicipalities(munis);
         setAllUnits(units);

         // 2. Fetch Production (using logic similar to Exports.tsx)
         const production = await municipalityReportService.fetchMunicipalityProduction(
            claims.municipalityId || '', // Pass municipalityId if SUBSEDE
            selectedCompetence,
            [],
            claims.entityId,
            profs, // Pass professionals map
            munis  // Pass municipalities list
         );

         setFetchedRecords(production); // Store raw records
         // Stats calculation moved to useEffect

      } catch (error) {
         console.error("Error loading report data:", error);
      } finally {
         setLoadingReport(false);
      }
   };

   // Estado de simulação de geração de arquivo
   const [generatingFile, setGeneratingFile] = useState<string | null>(null);

   const handleGenerate = (fileType: string) => {
      setGeneratingFile(fileType);
      setTimeout(() => {
         setGeneratingFile(null);
         alert(`Arquivo ${fileType} gerado com sucesso para a competência ${selectedCompetence}!`);
      }, 2000);
   };

   const handleOpenReport = (report: ReportType) => {
      setSelectedReport(report);
      setIsReportModalOpen(true);
   };

   // --- Signature Logic ---
   const [uploadingSignatureId, setUploadingSignatureId] = useState<string | null>(null);
   const fileInputRef = React.useRef<HTMLInputElement>(null);
   const [selectedProfForSignature, setSelectedProfForSignature] = useState<Professional | null>(null);

   const [viewingSignatureProf, setViewingSignatureProf] = useState<Professional | null>(null);

   const handleAttachSignature = (prof: Professional) => {
      if (prof.signatureUrl) {
         setViewingSignatureProf(prof);
      } else {
         setSelectedProfForSignature(prof);
         if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset value to ensure onChange triggers even for same file
            fileInputRef.current.click();
         }
      }
   };

   const handleChangeSignature = () => {
      if (viewingSignatureProf) {
         const prof = viewingSignatureProf;
         setViewingSignatureProf(null); // Close view modal
         setSelectedProfForSignature(prof);
         // Small timeout to allow modal to close before opening file picker
         setTimeout(() => {
            if (fileInputRef.current) {
               fileInputRef.current.value = '';
               fileInputRef.current.click();
            }
         }, 100);
      }
   };

   const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !selectedProfForSignature || !claims?.entityId) return;

      setUploadingSignatureId(selectedProfForSignature.id);
      try {
         // 1. Upload to Storage (backup/standard)
         // Upload path: signatures/{entityId}/{professionalId}_{timestamp}
         // Using timestamp to avoid caching issues on update
         const timestamp = Date.now();
         const storageRef = ref(storage, `signatures/${claims.entityId}/${selectedProfForSignature.id}_${timestamp}`);

         await uploadBytes(storageRef, file);
         const url = await getDownloadURL(storageRef);

         // 2. Convert to Base64 (for reliable PDF embedding)
         const reader = new FileReader();
         reader.onload = async () => {
            const base64 = reader.result as string;

            // 3. Update Professional Document in Firestore
            await updateProfessional(selectedProfForSignature.id, {
               signatureUrl: url,
               signatureBase64: base64
            });

            // 4. Update local state
            setProfessionals(prev => prev.map(p =>
               p.id === selectedProfForSignature.id ? { ...p, signatureUrl: url, signatureBase64: base64 } : p
            ));

            alert('Assinatura anexada com sucesso!');
            setUploadingSignatureId(null);
            setSelectedProfForSignature(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
         };
         reader.onerror = () => {
            console.error("Error reading file:", reader.error);
         };
         reader.readAsDataURL(file);

      } catch (error) {
         console.error("Error uploading signature:", error);
         alert("Erro ao enviar assinatura.");
         setUploadingSignatureId(null);
         setSelectedProfForSignature(null);
         if (fileInputRef.current) fileInputRef.current.value = '';
      }
   };
   // --- Export Logic ---
   const [exportingProfId, setExportingProfId] = useState<string | null>(null);
   const [exportDropdownOpen, setExportDropdownOpen] = useState<string | null>(null); // Stores ID of prof with open dropdown

   const handleExportProfessional = async (prof: Professional, layout: 'grouped' | 'sus' = 'grouped') => {
      if (!claims?.entityId) return;
      setExportingProfId(prof.id);
      setExportDropdownOpen(null); // Close dropdown

      try {
         // 1. Fetch Entity Name and Logo
         let entityName = claims.entityName || 'Entidade';
         let entityLogoUrl: string | undefined = undefined;
         let entityLogoBase64: string | undefined = undefined;

         let entityData: any = {};

         const entDoc = await getDoc(doc(db, 'entities', claims.entityId));
         if (entDoc.exists()) {
            const data = entDoc.data();
            entityData = data;
            entityName = data.name || data.fantasyName || entityName;
            entityLogoUrl = data.logoUrl;
            entityLogoBase64 = data.logoBase64;
         }

         // 2. Fetch Production for this Professional
         const records = await municipalityReportService.fetchMunicipalityProduction(
            claims.municipalityId || '',
            selectedCompetence,
            [], // All units
            claims.entityId,
            professionals,
            allMunicipalities
         );

         // Filter in memory for this professional
         let profRecords = records.filter((r: any) => r.professionalId === prof.id);

         // Apply Date Filter if active
         if (appliedStartDate && appliedEndDate) {
            profRecords = profRecords.filter((r: any) => {
               const rRaw = r.rawDate;
               if (!rRaw) return false;
               return rRaw >= appliedStartDate && rRaw <= appliedEndDate;
            });
         }

         if (profRecords.length === 0) {
            alert('Nenhuma produção encontrada para este profissional nesta competência.');
            setExportingProfId(null);
            return;
         }

         // 3. Generate PDF based on Layout
         if (layout === 'sus') {
            await susReportService.generateSusProductionPdf(
               profRecords,
               {
                  competence: selectedCompetence,
                  municipalityName: prof.assignments?.[0]?.municipalityName || 'Município',
                  entityName: entityName,
                  logoUrl: entityLogoUrl,
                  logoBase64: entityLogoBase64,
                  professional: {
                     name: prof.name,
                     cns: prof.cns || '',
                     role: prof.assignments?.[0]?.occupation || prof.occupation || '',
                     cbo: prof.assignments?.[0]?.cbo || prof.cbo || '',
                     unit: prof.assignments?.[0]?.unitName || prof.unitName || '',
                     unitCnes: (() => {
                        const uId = prof.assignments?.[0]?.unitId || prof.unitId;
                        if (!uId) return '';
                        // allUnits is already loaded in component state
                        const unit = allUnits.find(u => u.id === uId || u.cnes === uId);
                        return unit?.cnes || uId;
                     })()
                  },
                  signatureUrl: prof.signatureUrl,
                  signatureBase64: prof.signatureBase64,
                  // Entity Details for Footer
                  entityAddress: entityData.address,
                  entityPhone: entityData.phone,
                  entityCnpj: entityData.cnpj,
                  entityCity: entityData.location || claims.municipalityName, // Fallback
                  entityResponsible: entityData.responsible
               }
            );
         } else {
            // Default Grouped
            await municipalityReportService.generateProfessionalProductionPdf(
               profRecords,
               {
                  competence: selectedCompetence,
                  municipalityName: prof.assignments?.[0]?.municipalityName || 'Município',
                  entityName: entityName,
                  logoUrl: entityLogoUrl,
                  logoBase64: entityLogoBase64,
                  signatureUrl: prof.signatureUrl,
                  signatureBase64: prof.signatureBase64,
                  professional: {
                     name: prof.name,
                     cns: prof.cns || '',
                     role: prof.assignments?.[0]?.occupation || prof.occupation || '',
                     unit: prof.assignments?.[0]?.unitName || prof.unitName || ''
                  }
               }
            );
         }

      } catch (error) {
         console.error("Error exporting professional report:", error);
         alert("Erro ao exportar relatório.");
      } finally {
         setExportingProfId(null);
      }
   };

   // --- Unified Export Logic ---
   const [exportingUnified, setExportingUnified] = useState(false);

   const handleExportUnifiedReport = async () => {
      if (!claims?.entityId) return;
      setExportingUnified(true);

      try {
         // 1. Fetch Entity Name and Logo
         let entityName = claims.entityName || 'Entidade';
         let entityLogoUrl: string | undefined = undefined;
         let entityLogoBase64: string | undefined = undefined;

         const entDoc = await getDoc(doc(db, 'entities', claims.entityId));
         if (entDoc.exists()) {
            const data = entDoc.data();
            entityName = data.name || data.fantasyName || entityName;
            entityLogoUrl = data.logoUrl;
            entityLogoBase64 = data.logoBase64;
         }

         // 2. Fetch All Professionals
         const allProfs = await fetchProfessionalsByEntity(claims.entityId);

         // 3. Fetch All Production for the competence
         const records = await municipalityReportService.fetchMunicipalityProduction(
            claims.municipalityId || '',
            selectedCompetence,
            [], // All units
            claims.entityId,
            allProfs,
            allMunicipalities
         );

         // --- Apply Date Filtering ---
         // --- Apply Date Filtering (Fixed: String Comparison) ---
         let filteredRecords = records;
         // Use Applied Filter for Export, falling back to input if user forgot to click apply?
         // No, simpler to use applied to match what they see.
         // Or better: Use Applied. User explicitly asked for "Apply button".
         if (appliedStartDate && appliedEndDate) {
            filteredRecords = records.filter((r: any) => {
               const rRaw = r.rawDate;
               if (!rRaw) return false;
               return rRaw >= appliedStartDate && rRaw <= appliedEndDate;
            });
         }

         if (filteredRecords.length === 0) {
            alert('Nenhuma produção encontrada para esta competência com os filtros selecionados.');
            setExportingUnified(false);
            return;
         }

         // 4. Generate Unified PDF
         // Only include professionals that are currently in the filtered view
         await municipalityReportService.generateUnifiedProfessionalProductionPdf(
            filteredRecords,
            filteredProfessionals, // Use filtered list instead of allProfs
            {
               competence: selectedCompetence,
               municipalityName: filteredProfessionals[0]?.assignments?.[0]?.municipalityName || 'Município',
               entityName: entityName,
               logoUrl: entityLogoUrl,
               logoBase64: entityLogoBase64
            }
         );

         alert('Relatório unificado gerado com sucesso!');

      } catch (error) {
         console.error("Error exporting unified report:", error);
         alert("Erro ao exportar relatório unificado.");
      } finally {
         setExportingUnified(false);
      }
   };


   // Calculate Date Constraints based on Competence
   const dateConstraints = React.useMemo(() => {
      if (!selectedCompetence) return { min: '', max: '' };
      const [month, year] = selectedCompetence.split('/');
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      return {
         min: `${year}-${month}-01`,
         max: `${year}-${month}-${lastDay}`
      };
   }, [selectedCompetence]);

   // Ensure filters are cleared if competence changes
   useEffect(() => {
      setInputStartDate('');
      setInputEndDate('');
      setAppliedStartDate('');
      setAppliedEndDate('');
   }, [selectedCompetence]);



   // --- Render Signature Modal ---
   const renderSignatureModal = () => {
      if (!viewingSignatureProf) return null;

      return (
         <Modal
            isOpen={!!viewingSignatureProf}
            onClose={() => setViewingSignatureProf(null)}
            title={`Assinatura Digital - ${viewingSignatureProf.name}`}
         >
            <div className="flex flex-col items-center space-y-6">
               <div className="w-full max-w-md p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex justify-center items-center min-h-[150px]">
                  {viewingSignatureProf.signatureUrl ? (
                     <img
                        src={viewingSignatureProf.signatureUrl}
                        alt="Assinatura"
                        className="max-h-40 object-contain"
                     />
                  ) : (
                     <span className="text-gray-400">Imagem indisponível</span>
                  )}
               </div>

               <div className="flex gap-3 w-full justify-end">
                  <Button
                     variant="ghost"
                     onClick={() => setViewingSignatureProf(null)}
                  >
                     Fechar
                  </Button>

                  <a
                     href={viewingSignatureProf.signatureUrl}
                     download={`assinatura_${viewingSignatureProf.cns || 'document'}.png`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                     <Download className="w-4 h-4 mr-2" />
                     Baixar
                  </a>

                  <Button
                     variant="secondary"
                     onClick={handleChangeSignature}
                  >
                     <FileSignature className="w-4 h-4 mr-2" />
                     Alterar Assinatura
                  </Button>
               </div>
            </div>
         </Modal>
      );
   };

   // --- Renders de Conteúdo dos Modais ---

   const renderReportDetail = () => {
      if (!selectedReport) return null;

      switch (selectedReport.id) {
         case 'metas': // Cumprimento de Metas
            return (
               <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Meta Global</p>
                        <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">92%</h3>
                        <p className="text-xs text-blue-600 mt-1">Atingimento médio</p>
                     </Card>
                     <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Grupos na Meta</p>
                        <h3 className="text-2xl font-bold text-green-700 dark:text-green-300">4/5</h3>
                        <p className="text-xs text-green-600 mt-1">Grupos de proc.</p>
                     </Card>
                     <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Ponto de Atenção</p>
                        <h3 className="text-2xl font-bold text-red-700 dark:text-red-300">Cirurgias</h3>
                        <p className="text-xs text-red-600 mt-1">60% do esperado</p>
                     </Card>
                  </div>
                  <div className="h-80 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={META_VS_REAL_BY_GROUP} layout="vertical" margin={{ left: 20 }}>
                           <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#e5e7eb" />
                           <XAxis type="number" domain={[0, 120]} hide />
                           <YAxis dataKey="group" type="category" width={120} tick={{ fontSize: 12 }} />
                           <Tooltip cursor={{ fill: 'transparent' }} />
                           <Legend />
                           <Bar dataKey="real" name="% Realizado" fill="#10b981" barSize={20} radius={[0, 4, 4, 0]}>
                           </Bar>
                           <Bar dataKey="meta" name="Meta (100%)" fill="#e5e7eb" barSize={20} radius={[0, 4, 4, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            );

         case 'profissional': // Produção por Profissional
            return (
               <div className="space-y-6">
                  {/* Filter Toolbar */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                     <div className="flex flex-col md:flex-row gap-3">
                        <div className="md:w-1/4">
                           <label className="text-xs text-gray-500 mb-1 block">Município</label>
                           <select
                              value={filterMunicipality}
                              onChange={(e) => {
                                 setFilterMunicipality(e.target.value);
                                 setFilterUnit(''); // Reset unit when municipality changes
                              }}
                              className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                           >
                              <option value="">Todos os Municípios</option>
                              {uniqueMunicipalities.map(m => (
                                 <option key={m} value={m}>{m}</option>
                              ))}
                           </select>
                        </div>
                        <div className="md:w-1/4">
                           <label className="text-xs text-gray-500 mb-1 block">Unidade</label>
                           <select
                              value={filterUnit}
                              onChange={(e) => setFilterUnit(e.target.value)}
                              className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                           >
                              <option value="">Todas as Unidades</option>
                              {uniqueUnits.map(u => (
                                 <option key={u} value={u}>{u}</option>
                              ))}
                           </select>
                        </div>
                        <div className="flex-1">
                           <label className="text-xs text-gray-500 mb-1 block">Profissional</label>
                           <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                              <input
                                 type="text"
                                 placeholder="Filtrar por nome ou CNS..."
                                 value={filterName}
                                 onChange={(e) => setFilterName(e.target.value)}
                                 className="pl-9 w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700"
                              />
                           </div>
                        </div>
                     </div>
                     <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex-1 flex gap-3 items-end">
                           <div className="flex-1">
                              <label className="text-xs text-gray-500 mb-1 block">Data Inicial</label>
                              <input
                                 type="date"
                                 min={dateConstraints.min}
                                 max={dateConstraints.max}
                                 value={inputStartDate}
                                 onChange={(e) => setInputStartDate(e.target.value)}
                                 className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700"
                              />
                           </div>
                           <div className="flex-1">
                              <label className="text-xs text-gray-500 mb-1 block">Data Final</label>
                              <input
                                 type="date"
                                 min={dateConstraints.min}
                                 max={dateConstraints.max}
                                 value={inputEndDate}
                                 onChange={(e) => setInputEndDate(e.target.value)}
                                 className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700"
                              />
                           </div>

                           {/* Actions */}
                           <Button
                              variant="primary"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => {
                                 setAppliedStartDate(inputStartDate);
                                 setAppliedEndDate(inputEndDate);
                              }}
                              disabled={!inputStartDate || !inputEndDate}
                           >
                              <Filter className="w-4 h-4 mr-1" /> Aplicar
                           </Button>

                           {(filterName || filterUnit || filterMunicipality || inputStartDate || inputEndDate || appliedStartDate) && (
                              <Button
                                 variant="ghost"
                                 className="text-gray-500 hover:text-red-500"
                                 onClick={() => {
                                    setFilterName('');
                                    setFilterMunicipality('');
                                    setFilterUnit('');
                                    setInputStartDate('');
                                    setInputEndDate('');
                                    setAppliedStartDate('');
                                    setAppliedEndDate('');
                                 }}
                              >
                                 <X className="w-4 h-4 mr-1" /> Limpar
                              </Button>
                           )}
                        </div>
                        <div className="flex items-end">
                           <Button
                              variant="secondary"
                              className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white border-none shadow-sm shadow-green-500/30"
                              onClick={handleExportUnifiedReport}
                              disabled={exportingUnified || filteredProfessionals.length === 0}
                           >
                              {exportingUnified ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                              Baixar Agrupado ({Object.keys(productionStats).length})
                           </Button>
                        </div>
                     </div>
                  </div>

                  {loadingReport ? (
                     <div className="flex justify-center items-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                     </div>
                  ) : (
                     <Table headers={['Profissional', 'Lotação (Principal)', 'Procedimentos', 'Ações']}>
                        {filteredProfessionals.map((prof) => (
                           <tr key={prof.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                 <div>
                                    {prof.name}
                                    <span className="block text-xs text-gray-500 font-mono">CNS: {prof.cns}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                 {prof.assignments?.[0]?.unitName || prof.unitName || 'Sem Lotação'}
                                 {prof.assignments?.[0]?.municipalityName && ` (${prof.assignments[0].municipalityName})`}
                              </td>
                              <td className="px-6 py-4 font-mono">
                                 <Badge type="neutral" className="font-mono">
                                    {productionStats[prof.id] || 0}
                                 </Badge>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    <div className="relative">
                                       <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 text-xs gap-1"
                                          onClick={() => setExportDropdownOpen(exportDropdownOpen === prof.id ? null : prof.id)}
                                          disabled={exportingProfId === prof.id}
                                       >
                                          {exportingProfId === prof.id ? (
                                             <Activity className="w-3 h-3 animate-spin" />
                                          ) : (
                                             <Download className="w-3 h-3" />
                                          )}
                                          Exportar
                                          <ChevronDown className="w-3 h-3 ml-1" />
                                       </Button>

                                       {exportDropdownOpen === prof.id && (
                                          <>
                                             <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setExportDropdownOpen(null)}
                                             />
                                             <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 z-20 py-1">
                                                <button
                                                   onClick={() => handleExportProfessional(prof, 'grouped')}
                                                   className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                                >
                                                   <FileText className="w-3 h-3" />
                                                   Relatório Agrupado
                                                </button>
                                                <button
                                                   onClick={() => handleExportProfessional(prof, 'sus')}
                                                   className="w-full text-left px-4 py-2 text-xs text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 font-medium"
                                                >
                                                   <Building2 className="w-3 h-3" />
                                                   Boletim BDPA (SUS)
                                                </button>
                                             </div>
                                          </>
                                       )}
                                    </div>

                                    <Button
                                       size="sm"
                                       variant="outline"
                                       className="h-8 text-xs gap-1 whitespace-nowrap"
                                       onClick={() => handleAttachSignature(prof)}
                                       disabled={uploadingSignatureId === prof.id}
                                       title={prof.signatureUrl ? "Ver/Alterar Assinatura" : "Anexar Assinatura Digitalizada"}
                                    >
                                       {uploadingSignatureId === prof.id ? (
                                          <Activity className="w-3 h-3 animate-spin" />
                                       ) : (
                                          <FileSignature className={`w-3 h-3 ${prof.signatureUrl ? 'text-green-600' : 'text-gray-400'}`} />
                                       )}
                                       {prof.signatureUrl ? 'Ver Assinatura' : 'Anexar Assinatura'}
                                    </Button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                        {filteredProfessionals.length === 0 && (
                           <tr>
                              <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                 Nenhum profissional encontrado com os filtros selecionados.
                              </td>
                           </tr>
                        )}
                     </Table>
                  )}
               </div>
            );

         case 'unidades': // Comparativo de Unidades
            return (
               <div className="space-y-6">
                  <div className="h-96 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={UNIT_COMPARISON}>
                           <CartesianGrid stroke="#f5f5f5" />
                           <XAxis dataKey="name" scale="band" tick={{ fontSize: 10 }} />
                           <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                           <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                           <Tooltip />
                           <Legend />
                           <Bar yAxisId="left" dataKey="producao" name="Volume (Qtd)" barSize={30} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                           <Line yAxisId="right" type="monotone" dataKey="faturamento" name="Faturamento (R$)" stroke="#10b981" strokeWidth={3} />
                        </ComposedChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     {UNIT_COMPARISON.map((u, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded border border-gray-100 dark:border-gray-700">
                           <span className="font-medium text-sm">{u.name}</span>
                           <div className="text-right">
                              <div className="text-xs text-gray-500">Ticket Médio</div>
                              <div className="font-bold text-emerald-600">
                                 {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(u.faturamento / u.producao)}
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            );

         case 'procedimentos': // Top Procedimentos
            return (
               <div className="space-y-4">
                  {TOP_PROCEDURES.map((proc, idx) => (
                     <div key={idx} className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                           <div>
                              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                                 #{idx + 1}
                              </span>
                              <span className="ml-2 font-medium text-sm text-gray-700 dark:text-gray-200">
                                 {proc.name}
                              </span>
                           </div>
                           <div className="text-right">
                              <span className="text-xs font-semibold inline-block text-blue-600">
                                 {proc.qtd} exames
                              </span>
                           </div>
                        </div>
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-100 dark:bg-gray-700">
                           <div style={{ width: `${(proc.qtd / 4500) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
                        </div>
                     </div>
                  ))}
               </div>
            );

         case 'financeiro': // Evolução Financeira
            return (
               <div className="space-y-6">
                  <div className="h-80 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={EVOLUTION_DATA}>
                           <defs>
                              <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                 <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                           <XAxis dataKey="month" />
                           <YAxis tickFormatter={(value) => `R$${value / 1000}k`} />
                           <Tooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                           <Area type="monotone" dataKey="valor" name="Faturamento Aprovado" stroke="#10b981" fillOpacity={1} fill="url(#colorVal)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                     <div>
                        <p className="text-sm text-emerald-800 dark:text-emerald-200">Total Acumulado (Ano)</p>
                        <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">R$ 979.000,00</h3>
                     </div>
                     <div className="h-10 w-10 bg-emerald-200 dark:bg-emerald-800 rounded-full flex items-center justify-center">
                        <DollarSign className="text-emerald-700 dark:text-emerald-200" />
                     </div>
                  </div>
               </div>
            );

         case 'cobertura': // Indicadores de Cobertura
            return (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="flex flex-col items-center">
                     <h4 className="text-sm font-bold mb-4 text-gray-700 dark:text-gray-300">Distribuição por Faixa Etária</h4>
                     <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <RechartsPieChart>
                              <Pie
                                 data={DEMOGRAPHICS_AGE}
                                 cx="50%"
                                 cy="50%"
                                 innerRadius={60}
                                 outerRadius={80}
                                 paddingAngle={5}
                                 dataKey="value"
                                 label
                              >
                                 {DEMOGRAPHICS_AGE.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                 ))}
                              </Pie>
                              <Tooltip />
                              <Legend verticalAlign="bottom" height={36} />
                           </RechartsPieChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
                  <div className="flex flex-col items-center">
                     <h4 className="text-sm font-bold mb-4 text-gray-700 dark:text-gray-300">Distribuição por Sexo</h4>
                     <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <RechartsPieChart>
                              <Pie
                                 data={DEMOGRAPHICS_SEX}
                                 cx="50%"
                                 cy="50%"
                                 outerRadius={80}
                                 dataKey="value"
                                 label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              >
                                 <Cell fill="#ec4899" /> {/* Feminino */}
                                 <Cell fill="#3b82f6" /> {/* Masculino */}
                              </Pie>
                              <Tooltip />
                           </RechartsPieChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
            );

         default:
            return <div className="text-center py-10 text-gray-500">Visualização em desenvolvimento para este relatório.</div>;
      }
   };

   const renderDashboard = () => (
      <div className="space-y-6 animate-in fade-in duration-500">
         {/* KPI Cards */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-5 border-l-4 border-blue-500">
               <div className="text-sm text-gray-500 font-medium">Produção Total (Qtd)</div>
               <div className="mt-2">
                  {dashboardLoading ? (
                     <Skeleton className="h-8 w-24" />
                  ) : (
                     <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {production.total.toLocaleString('pt-BR')}
                     </div>
                  )}
               </div>
               <div className="flex items-center mt-2 text-sm text-blue-600 font-medium">
                  {production.trendUp ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <Activity className="w-4 h-4 mr-1" />}
                  {production.trend}% vs anterior
               </div>
            </Card>

            <Card className="p-5 border-l-4 border-emerald-500">
               <div className="text-sm text-gray-500 font-medium">Eficiência de Metas</div>
               <div className="mt-2">
                  {dashboardLoading ? (
                     <Skeleton className="h-8 w-16" />
                  ) : (
                     <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {dashboardGoals.value}
                     </div>
                  )}
               </div>
               <div className="text-xs text-gray-500 mt-2">Média geral das unidades</div>
            </Card>

            <Card className="p-5 border-l-4 border-orange-500">
               <div className="text-sm text-gray-500 font-medium">Municípios Ativos</div>
               <div className="mt-2">
                  {dashboardLoading ? (
                     <Skeleton className="h-8 w-12" />
                  ) : (
                     <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {dashboardMunicipalities.value}
                     </div>
                  )}
               </div>
               <div className="flex items-center mt-2 text-sm text-orange-600 font-medium">
                  <Building2 className="w-4 h-4 mr-1" /> Monitorados
               </div>
            </Card>

            <Card className="p-5 border-l-4 border-purple-500">
               <div className="text-sm text-gray-500 font-medium">Profissionais Ativos</div>
               <div className="mt-2">
                  {dashboardLoading ? (
                     <Skeleton className="h-8 w-12" />
                  ) : (
                     <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {dashboardProfessionals.value}
                     </div>
                  )}
               </div>
               <div className="flex items-center mt-2 text-sm text-purple-600 font-medium">
                  <Users className="w-4 h-4 mr-1" /> Na competência
               </div>
            </Card>
         </div>

         {/* Gráficos Principais */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Evolução Temporal */}
            <Card className="lg:col-span-2 p-6">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                     <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                     Evolução Temporal da Produção
                  </h3>
                  <div className="flex gap-2">
                     <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Manual</span>
                     <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">Conector</span>
                  </div>
               </div>
               <div className="h-80">
                  {dashboardLoading ? (
                     <Skeleton className="w-full h-full rounded-lg" />
                  ) : (
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={production.chartData}>
                           <defs>
                              <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                 <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                           <XAxis dataKey="month" axisLine={false} tickLine={false} />
                           <YAxis axisLine={false} tickLine={false} />
                           <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                           <Legend />
                           <Area type="monotone" dataKey="procedures" name="Produção Total" stroke="#3b82f6" fillOpacity={1} fill="url(#colorProd)" strokeWidth={3} />
                        </AreaChart>
                     </ResponsiveContainer>
                  )}
               </div>
            </Card>

            {/* Top Procedimentos */}
            <Card className="p-6">
               <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Procedimentos</h3>
               <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                  {dashboardLoading ? (
                     Array(5).fill(0).map((_, i) => (
                        <div key={i} className="flex flex-col gap-2">
                           <div className="flex justify-between">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-4 w-8" />
                           </div>
                           <Skeleton className="h-1.5 w-full" />
                        </div>
                     ))
                  ) : (
                     <>
                        {production.topProcedures?.map((proc, idx) => (
                           <div
                              key={idx}
                              className="relative pt-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-1 transition-colors group"
                              onClick={() => handleProcedureClick(proc.name)}
                              title="Clique para ver detalhamento"
                           >
                              <div className="flex mb-1 items-center justify-between">
                                 <div className="flex items-center overflow-hidden">
                                    <span className="text-xs font-semibold inline-block py-0.5 px-2 uppercase rounded-full text-blue-600 bg-blue-100 mr-2 flex-shrink-0 group-hover:bg-blue-200">
                                       #{idx + 1}
                                    </span>
                                    <span className="font-medium text-sm text-gray-700 dark:text-gray-200 truncate" title={proc.name}>
                                       {proc.name}
                                    </span>
                                 </div>
                                 <span className="text-xs font-bold text-gray-900 dark:text-white ml-2">
                                    {proc.value}
                                 </span>
                              </div>
                              <div className="overflow-hidden h-1.5 mb-2 text-xs flex rounded bg-gray-100 dark:bg-gray-700">
                                 <div style={{ width: `${(proc.value / (production.topProcedures[0]?.value || 1)) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
                              </div>
                           </div>
                        ))}
                        {(!production.topProcedures || production.topProcedures.length === 0) && (
                           <div className="text-center py-8 text-gray-400 text-sm">
                              Nenhum dado de procedimento disponível.
                           </div>
                        )}
                     </>
                  )}
               </div>
            </Card>
         </div>

         {/* Performance por Profissional (Simplificado/Inteligente) */}
         {(dashboardProfessionals.value > 0 || dashboardLoading) && (
            <Card className="overflow-hidden">
               <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                     <Users className="w-5 h-5 text-purple-600" />
                     Performance por Profissional
                  </h3>
                  <Button variant="outline" className="text-xs" onClick={() => setActiveTab('reports')}>
                     Ver Relatório Completo <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
               </div>
               <div className="p-6 bg-gray-50 dark:bg-gray-800/50 text-center">
                  {dashboardLoading ? (
                     <div className="flex flex-col items-center justify-center py-4">
                        <Skeleton className="h-4 w-1/2 mb-4" />
                        <Skeleton className="h-10 w-40" />
                     </div>
                  ) : (
                     <>
                        <p className="text-sm text-gray-500 mb-4">
                           A análise detalhada de performance individual, incluindo cumprimento de metas e faturamento, está disponível na aba <strong>Relatórios Gerenciais</strong>.
                        </p>
                        <Button onClick={() => handleOpenReport({ id: 'profissional', title: 'Produção por Profissional', desc: '', icon: Users, color: '' })} variant="secondary">
                           Abrir Análise Detalhada
                        </Button>
                     </>
                  )}
               </div>
            </Card>
         )}
      </div>
   );

   const renderReports = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
         {[
            { id: 'metas', title: 'Cumprimento de Metas', desc: 'Evolução da produção vs. meta definida por unidade e procedimento.', icon: Target, color: 'text-blue-600' },
            { id: 'profissional', title: 'Produção por Profissional', desc: 'Detalhamento de volume, valores e ranking de produtividade.', icon: Users, color: 'text-emerald-600' },
            { id: 'unidades', title: 'Comparativo de Unidades', desc: 'Análise de desempenho entre postos de saúde do município.', icon: Building2, color: 'text-purple-600' },
            { id: 'procedimentos', title: 'Procedimentos Mais Realizados', desc: 'Curva ABC de procedimentos por volume e valor faturado.', icon: BarChart2, color: 'text-amber-600' },
            { id: 'meta_realizada', title: 'Meta Física vs Realizada', desc: 'Indicador de eficiência global e por grupos de procedimentos.', icon: Activity, color: 'text-red-600' },
            { id: 'cobertura', title: 'Indicadores de Cobertura', desc: 'Análise populacional, faixa etária e sexo dos pacientes atendidos.', icon: PieChart, color: 'text-indigo-600' },
            { id: 'pacientes', title: 'Pacientes por Unidade', desc: 'Listagem nominal ou quantitativa de pacientes atendidos.', icon: Users, color: 'text-cyan-600' },
            { id: 'financeiro', title: 'Evolução Financeira', desc: 'Série histórica de faturamento aprovado e glosado.', icon: TrendingUp, color: 'text-green-600' },
         ].map((rep, idx) => {
            const Icon = rep.icon;
            return (
               <Card key={idx} className="p-6 flex flex-col justify-between hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700">
                  <div>
                     <div className={`p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 w-fit mb-4 ${rep.color}`}>
                        <Icon className="w-6 h-6" />
                     </div>
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{rep.title}</h3>
                     <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{rep.desc}</p>
                  </div>
                  <div className="flex gap-2 mt-auto">
                     <Button
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => handleOpenReport(rep)}
                     >
                        <Eye className="w-3 h-3 mr-2" /> Visualizar
                     </Button>
                     <Button
                        variant="secondary"
                        className="flex-1 text-xs"
                        onClick={() => {
                           if (rep.id === 'profissional') {
                              handleExportUnifiedReport();
                           } else {
                              // Simulation for others
                              handleGenerate('PDF');
                           }
                        }}
                        disabled={rep.id === 'profissional' ? exportingUnified : false}
                     >
                        {rep.id === 'profissional' && exportingUnified ? (
                           <Activity className="w-3 h-3 mr-2 animate-spin" />
                        ) : (
                           <Download className="w-3 h-3 mr-2" />
                        )}
                        PDF
                     </Button>
                  </div>
               </Card>
            )
         })}
      </div>
   );

   const renderTechnical = () => (
      <div className="space-y-8 animate-in fade-in duration-500">

         {/* Cabeçalho de Validação */}
         <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
               <Database className="w-48 h-48" />
            </div>
            <div className="relative z-10 max-w-2xl">
               <h2 className="text-2xl font-bold mb-2">Central de Exportação SIA/SUS</h2>
               <p className="text-gray-300 mb-6">
                  Geração oficial dos arquivos de produção ambulatorial para importação no sistema do DATASUS.
                  Certifique-se de que todas as críticas foram resolvidas antes de gerar o arquivo final.
               </p>
               <div className="flex flex-wrap gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                     <span className="block text-xs text-gray-400 uppercase">Competência Selecionada</span>
                     <span className="font-bold text-lg">{selectedCompetence}</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                     <span className="block text-xs text-gray-400 uppercase">Status do Fechamento</span>
                     <span className="font-bold text-lg text-emerald-400 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" /> Aberto
                     </span>
                  </div>
               </div>
            </div>
         </div>

         {/* Fluxo de Geração */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coluna 1: Relatórios Pré-Envio */}
            <div className="space-y-6">
               <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" /> Relatórios de Conferência (Espelhos)
               </h3>

               <Card className="p-5 flex items-center justify-between border-l-4 border-blue-500">
                  <div>
                     <h4 className="font-bold text-gray-900 dark:text-white">BPA-I (Individualizado)</h4>
                     <p className="text-sm text-gray-500 mt-1">Detalhamento por paciente (CBO, CID, CNS).</p>
                     <Badge type="neutral" className="mt-2">23,270 Registros</Badge>
                  </div>
                  <Button onClick={() => handleGenerate('BPA-I')} disabled={!!generatingFile} variant="outline">
                     {generatingFile === 'BPA-I' ? 'Gerando...' : <Download className="w-4 h-4" />}
                  </Button>
               </Card>

               <Card className="p-5 flex items-center justify-between border-l-4 border-indigo-500">
                  <div>
                     <h4 className="font-bold text-gray-900 dark:text-white">BPA-C (Consolidado)</h4>
                     <p className="text-sm text-gray-500 mt-1">Produção agregada por procedimento e CBO.</p>
                     <Badge type="neutral" className="mt-2">48,630 Registros</Badge>
                  </div>
                  <Button onClick={() => handleGenerate('BPA-C')} disabled={!!generatingFile} variant="outline">
                     {generatingFile === 'BPA-C' ? 'Gerando...' : <Download className="w-4 h-4" />}
                  </Button>
               </Card>

               <Card className="p-5 flex items-center justify-between border-l-4 border-red-500 bg-red-50/50 dark:bg-red-900/10">
                  <div>
                     <h4 className="font-bold text-gray-900 dark:text-white flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2 text-red-500" /> Relatório de Críticas/Erros
                     </h4>
                     <p className="text-sm text-gray-500 mt-1">Inconsistências que impedem a exportação.</p>
                     <Badge type="error" className="mt-2">12 Erros Encontrados</Badge>
                  </div>
                  <Button onClick={() => handleGenerate('ERROS')} disabled={!!generatingFile} variant="danger" className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                     Ver Erros
                  </Button>
               </Card>
            </div>

            {/* Coluna 2: Arquivo Final */}
            <div className="space-y-6">
               <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <FileCode className="w-5 h-5 mr-2 text-emerald-600" /> Arquivo Final (Integração)
               </h3>

               <Card className="p-6 bg-gray-50 dark:bg-gray-800 border-dashed border-2 border-gray-300 dark:border-gray-700 text-center">
                  <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">Exportação BPA-SIA</h4>
                  <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6 max-w-md mx-auto">
                     Gera o arquivo <strong>.TXT</strong> no layout oficial do Ministério da Saúde para importação no SIA/SUS.
                  </p>

                  <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-left mb-6 max-w-sm mx-auto">
                     <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500">Competência:</span>
                        <span className="font-mono font-bold">{selectedCompetence}</span>
                     </div>
                     <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500">Linhas Totais:</span>
                        <span className="font-mono font-bold">71,900</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Hash MD5:</span>
                        <span className="font-mono text-xs text-gray-400">...a1b2c3d4</span>
                     </div>
                  </div>

                  <Button
                     onClick={() => handleGenerate('BPA-MAG')}
                     disabled={!!generatingFile}
                     variant="secondary"
                     className="w-full max-w-sm mx-auto py-3 text-lg shadow-lg shadow-emerald-500/20"
                  >
                     {generatingFile === 'BPA-MAG' ? (
                        <span className="flex items-center"><Activity className="animate-spin mr-2" /> Processando...</span>
                     ) : (
                        <span className="flex items-center"><Download className="mr-2" /> Baixar Arquivo .TXT</span>
                     )}
                  </Button>
                  <p className="text-xs text-gray-400 mt-4">
                     * O arquivo será validado automaticamente antes do download.
                  </p>
               </Card>
            </div>
         </div>
      </div>
   );



   // --- Procedure Breakdown Modal State ---



   // --- Renderers ---

   const renderProcedureModal = () => {
      const data = getProcedureBreakdown() || [];
      console.log('Rendering Procedure Modal:', { selectedProcedure, dataCount: data.length });


      return (
         <Modal
            isOpen={isProcedureModalOpen}
            onClose={() => setIsProcedureModalOpen(false)}
            title={`Detalhamento: ${selectedProcedure}`}
         >
            <div className="max-h-[60vh] overflow-y-auto">
               <Table>
                  <thead className="bg-gray-50 dark:bg-gray-800">
                     <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profissional</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidade</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd</th>
                     </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                     {Array.isArray(data) && data.map((row, idx) => (
                        <tr key={idx}>
                           <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{row.name}</td>
                           <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{row.unit}</td>
                           <td className="px-4 py-2 text-sm text-center font-bold text-gray-900 dark:text-white">{row.quantity}</td>
                        </tr>
                     ))}
                     {data.length === 0 && (
                        <tr>
                           <td colSpan={3} className="px-4 py-4 text-center text-gray-500 text-sm">Nenhum registro encontrado.</td>
                        </tr>
                     )}
                  </tbody>
               </Table>
            </div>
            <div className="mt-4 flex justify-end">
               <Button variant="outline" onClick={() => setIsProcedureModalOpen(false)}>Fechar</Button>
            </div>
         </Modal>
      );
   };

   // ... (Rest of renders)

   return (
      <div className="space-y-6">
         {/* Header Principal */}
         <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
               <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Produção Global</h1>
               <p className="text-gray-500 dark:text-gray-400 mt-1">Monitoramento, Auditoria e Exportação do BPA.</p>

            </div>
         </div>

         <div className="flex flex-col sm:flex-row gap-3">
            {/* Seletor de Competência */}
            <div className="relative">
               <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
               <select
                  value={selectedCompetence}
                  onChange={(e) => setSelectedCompetence(e.target.value)}
                  className="pl-10 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer hover:bg-gray-50"
               >
                  {competenceOptions.map(comp => (
                     <option key={comp} value={comp}>{comp}</option>
                  ))}
               </select>
               <ChevronRight className="absolute right-3 top-3 w-3 h-3 text-gray-500 transform rotate-90" />
            </div>

            <Button variant="outline" className="flex items-center gap-2">
               <Filter className="w-4 h-4" /> Filtros Avançados
            </Button>
         </div>


         {/* Navegação por Abas */}
         <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 overflow-x-auto">
               {[
                  { id: 'dashboard', label: 'Dashboard & Monitoramento', icon: BarChart2 },
                  { id: 'reports', label: 'Relatórios Gerenciais', icon: FileText },
                  { id: 'technical', label: 'Arquivos Técnicos (SIA)', icon: Database },
                  { id: 'connector', label: 'Conector', icon: Activity },
               ].map(tab => (
                  <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id as TabType)}
                     className={`
                     py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                     ${activeTab === tab.id
                           ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                           : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                  `}
                  >
                     <tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}`} />
                     {tab.label}
                  </button>
               ))}

            </nav>
         </div>

         {/* Conteúdo das Abas */}
         <div className="min-h-[500px]">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'technical' && renderTechnical()}
            {activeTab === 'connector' && (
               <ConnectorDashboard
                  entityId={claims?.entityId || ''}
                  municipalities={allMunicipalities.filter(m => m.lediConfig?.integrationStatus === 'ACTIVE')}
                  competence={selectedCompetence}
               />
            )}
         </div>

         {/* Modal de Visualização de Relatório */}
         <Modal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            title={selectedReport?.title || 'Detalhes do Relatório'}
         >
            <div className="mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
               <p className="text-gray-500 dark:text-gray-400">{selectedReport?.desc}</p>
               <div className="mt-2 flex items-center gap-2">
                  <Badge type="neutral">Competência: {selectedCompetence}</Badge>
                  <Badge type="success">Dados Consolidados</Badge>
               </div>
            </div>

            {renderReportDetail()}

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
               <Button variant="outline" onClick={() => setIsReportModalOpen(false)}>Fechar</Button>
            </div>
         </Modal>

         {/* Procedure Breakdown Modal */}
         {renderProcedureModal()}

         {/* Hidden File Input for Signature Upload - Moved to root to persist across tabs */}
         <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
         />
         {renderSignatureModal()}
      </div >
   );
};

export default Production;