import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { resolveSigtapCode } from '../utils/sigtapNormalization';

export const getProfessionalProductionDetailed = functions
    .region('southamerica-east1')
    .runWith({
        timeoutSeconds: 540,
        memory: '2GB',
    })
    .https.onCall(async (data, context) => {
        if (!context.auth || !context.auth.token.entityId) {
            throw new functions.https.HttpsError('unauthenticated', 'Requer autenticação e vínculo de entidade.');
        }

        const entityId: string = context.auth.token.entityId;
        const { municipalityId, unitId, competence, startDate, endDate, professionalId, professionalCns, professionalCpf, professionalName, professionals, day: pDay, year: pYear, goalFilter, goalProcedureCodes } = data;

        if (!entityId || (!competence && !pYear) || (!professionalId && !professionalCns)) {
            throw new functions.https.HttpsError('invalid-argument', 'entityId, competence (ou year), e (professionalId ou professionalCns) são obrigatórios');
        }

        const db = admin.firestore();
        let records: any[] = [];

        // --- Format Competence ---
        const competencesToSearchManual: string[] = [];
        const competencesToSearchConnector: string[] = [];

        const getYYYYMMDD = (dateStr: any): string => {
            if (!dateStr || typeof dateStr !== 'string') return '';
            let d = dateStr.split(' ')[0];
            if (d.includes('/')) {
                const parts = d.split('/');
                if (parts[0].length === 2 && parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else if (d.includes('-')) {
                const parts = d.split('-');
                if (parts[0].length === 2 && parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            return d;
        };

        if (competence && competence.includes('/')) {
            const [mm, yyyy] = competence.split('/');
            competencesToSearchManual.push(`${yyyy}-${mm}`);
            competencesToSearchConnector.push(`${mm}-${yyyy}`);
        } else if (competence && competence.length === 7 && competence.includes('-')) {
            competencesToSearchManual.push(competence);
            const [y, m] = competence.split('-');
            competencesToSearchConnector.push(`${m}-${y}`);
        } else if (startDate && endDate) {
            const startStr = getYYYYMMDD(startDate);
            const endStr = getYYYYMMDD(endDate);
            if (startStr && endStr) {
                const startD = new Date(Number(startStr.split('-')[0]), Number(startStr.split('-')[1]) - 1, Number(startStr.split('-')[2]));
                const endD = new Date(Number(endStr.split('-')[0]), Number(endStr.split('-')[1]) - 1, Number(endStr.split('-')[2]));
                
                let currentMonth = new Date(startD);
                currentMonth.setDate(1);

                let loopCount = 0;
                while (currentMonth <= endD && loopCount < 13) {
                    const y = currentMonth.getFullYear();
                    const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
                    competencesToSearchManual.push(`${y}-${m}`);
                    competencesToSearchConnector.push(`${m}-${y}`);
                    currentMonth.setMonth(currentMonth.getMonth() + 1);
                    loopCount++;
                }

                const lastY = endD.getFullYear();
                const lastM = String(endD.getMonth() + 1).padStart(2, '0');
                if (!competencesToSearchManual.includes(`${lastY}-${lastM}`)) {
                    competencesToSearchManual.push(`${lastY}-${lastM}`);
                    competencesToSearchConnector.push(`${lastM}-${lastY}`);
                }
            }
        }
        
        // Fallback to pYear or current year for 12 months array if nothing else caught it
        if (competencesToSearchManual.length === 0) {
            const fallbackYear = pYear || new Date().getFullYear().toString();
            competencesToSearchManual.push(...Array.from({length: 12}, (_, i) => `${fallbackYear}-${String(i + 1).padStart(2, '0')}`));
            competencesToSearchConnector.push(...Array.from({length: 12}, (_, i) => `${String(i + 1).padStart(2, '0')}-${fallbackYear}`));
        }

        // --- Build Professional Lookups ---
        const cnsMap = new Map<string, string>();
        const cpfMap = new Map<string, string>();
        const nameMap = new Map<string, string>();

        const normalize = (str: string) => String(str || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const onlyNumbers = (text: string) => String(text || '').replace(/\D/g, '');

        if (professionals && Array.isArray(professionals)) {
            professionals.forEach((p: any) => {
                if (p.cns) cnsMap.set(onlyNumbers(p.cns), p.id);
                if (p.cpf) cpfMap.set(onlyNumbers(p.cpf), p.id);
                if (p.name) nameMap.set(normalize(p.name), p.id);
            });
        }

        const reqExtCns = professionalCns ? `ext_${onlyNumbers(professionalCns)}` : null;
        const reqExtCpf = professionalCpf ? `ext_${onlyNumbers(professionalCpf)}` : null;
        const reqExtName = professionalName ? `ext_name_${normalize(professionalName).replace(/\s/g, '')}` : null;

        // 1. Fetch Manual Records
        const manualPromises = competencesToSearchManual.map(async (compM) => {
            let manualQ = db.collectionGroup('procedures')
                .where('entityId', '==', entityId)
                .where('competenceMonth', '==', compM);

            if (professionalId) {
                manualQ = manualQ.where('professionalId', '==', professionalId);
            }

            const manualSnap = await manualQ.select('status', 'municipalityId', 'unitId', 'rawDate', 'attendanceDate', 'productionDate', 'professionalId', 'professionalCns', 'professionalName', 'cbo', 'procedureCode', 'procedure', 'procedureName', 'patient', 'patientName', 'patientCns', 'patientCpf', 'patientBirthDate', 'patientAge', 'quantity', 'type', 'code', 'name').get();

            manualSnap.docs.forEach(doc => {
                // Ignora produções vinculadas à coleção root antiga "bpa_records" para não contar em dobro
                if (!doc.ref.path.startsWith('municipalities/')) return;

                const row = doc.data();
                if (municipalityId && row.municipalityId !== municipalityId) return;
                if (unitId && row.unitId !== unitId) return;

                if (startDate || endDate) {
                    const rRaw = getYYYYMMDD(row.rawDate || row.attendanceDate || row.productionDate || '');
                    if (!rRaw) return;
                    if (startDate && rRaw < startDate) return;
                    if (endDate && rRaw > endDate) return;
                }

                if (pDay) {
                    const dateVal = row.rawDate || row.attendanceDate || row.productionDate || '';
                    if (dateVal) {
                        const ymd = getYYYYMMDD(dateVal);
                        if (ymd) {
                            const recDay = ymd.split('-')[2];
                            if (recDay !== pDay) return;
                        }
                    }
                }

                if (goalFilter && goalFilter !== 'all') {
                    const code = String(row.procedureCode || '').replace(/\D/g, '');
                    const isPactuado = Array.isArray(goalProcedureCodes) && goalProcedureCodes.some((gCode: string) => gCode.length > 0 && code.startsWith(gCode));
                    if (goalFilter === 'pactuados' && !isPactuado) return;
                    if (goalFilter === 'nao_pactuados' && isPactuado) return;
                }

                records.push({ ...row, id: doc.id, source: 'manual' });
            });
        });
        await Promise.all(manualPromises);

        // 2. Fetch Connector Records
        let targetMunis = data.municipalities || [];
        if (!targetMunis || targetMunis.length === 0) {
            const munisSnap = await db.collection('municipalities').where('entityId', '==', entityId).get();
            targetMunis = munisSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        if (municipalityId) {
            targetMunis = targetMunis.filter((m: any) => m.id === municipalityId);
        }

        const compPromises = targetMunis.flatMap((mun: any) => {
            let mEntityType = 'PUBLIC';
            const ctx = mun._pathContext || {};
            if (ctx.entityType) mEntityType = ctx.entityType;
            if (mun.entityType) mEntityType = mun.entityType;
            mEntityType = (mEntityType.toUpperCase() === 'PRIVATE' || mEntityType === 'private_entities') ? 'PRIVATE' : 'PUBLIC';

            const mEntityId = mun.entityId || ctx.entityId || entityId;

            return competencesToSearchConnector.map(async (comp) => {
                try {
                    const cYear = comp.split('-')[1]; // Extracts YYYY from MM-YYYY
                    const path = `municipalities/${mEntityType}/${mEntityId}/${mun.id}/extractions/${cYear}/competences/${comp}/extraction_records`;

                    const recSnap = await db.collection(path)
                        .select('unit', 'unitCnes', 'date', 'productionDate', 'attendanceDate', 'procedureCode', 'procedure', 'procedureName', 'patient', 'patientName', 'patientCns', 'patientCpf', 'patientBirthDate', 'patientAge', 'professional', 'cbo', 'professionalCns', 'professionalName', 'professionalId', 'quantity', 'status', 'type', 'code', 'name')
                        .get();
                    if (recSnap.empty) return;

                    recSnap.docs.forEach(d => {
                        try {
                            const row = d.data();

                            let rUnitCnes = row.unit?.cnes || row.unitCnes;
                            if (!rUnitCnes && d.id) {
                                const parts = d.id.split('-');
                                if (parts.length > 0 && parts[0].length === 7 && !isNaN(Number(parts[0]))) {
                                    rUnitCnes = parts[0];
                                }
                            }
                            if (unitId && rUnitCnes !== unitId) return;

                            if (startDate || endDate) {
                                const reqDate = getYYYYMMDD(row.date || row.productionDate || row.attendanceDate || '');
                                if (!reqDate) return;
                                if (startDate && reqDate < startDate) return;
                                if (endDate && reqDate > endDate) return;
                            }

                            if (pDay) {
                                const dateVal = row.date || row.productionDate || row.attendanceDate || '';
                                if (dateVal) {
                                    const ymd = getYYYYMMDD(dateVal);
                                    if (ymd) {
                                        const recDay = ymd.split('-')[2];
                                        if (recDay !== pDay) return;
                                    }
                                }
                            }

                        let rawCode = String(row.procedureCode || row.procedure?.code || '').toUpperCase();
                        let rawName = String(row.procedureName || row.procedure?.name || '').toUpperCase();

                        if (goalFilter && goalFilter !== 'all') {
                            const code = String(rawCode || '').replace(/\D/g, '');
                            const isPactuado = Array.isArray(goalProcedureCodes) && goalProcedureCodes.some((gCode: string) => gCode.length > 0 && code.startsWith(gCode));
                            if (goalFilter === 'pactuados' && !isPactuado) return;
                            if (goalFilter === 'nao_pactuados' && isPactuado) return;
                        }

                        // Glosa: Procedimento inválido
                        if (!rawCode || rawCode === '-' || rawCode === 'NULL' || rawName.includes('NÃO ENCONTRADO')) return;

                        // Glosa: Paciente não identificado
                        const pName = String(row.patient?.name || row.patientName || '').trim().toUpperCase();
                        if (!pName || pName === 'NÃO IDENTIFICADO' || pName === 'NULL' || pName === '-') return;

                        const cbo = String(row.professional?.cbo || row.cbo || '').trim();

                        if (cbo === '251605' && rawCode === 'CONSULTA' && rawName.includes('ATENDIMENTO INDIVIDUAL')) {
                            rawCode = '0301010030';
                            rawName = 'CONSULTA DE PROFISSIONAIS DE NÍVEL SUPERIOR NA ATENÇÃO PRIMÁRIA (EXCETO MÉDICO)';
                            row.procedureCode = rawCode;
                            row.procedureName = rawName;
                            if (row.procedure) {
                                row.procedure.code = rawCode;
                                row.procedure.name = rawName;
                            }
                        } else if (rawCode === 'CONSULTA' && rawName.includes('ATENDIMENTO INDIVIDUAL')) {
                            return; // Filter duplicate
                        }

                        let pId = row.professionalId;
                        if (!pId) {
                            const pData = row.professional || {};
                            const cns = onlyNumbers(pData.cns || row.professionalCns);
                            const cpf = onlyNumbers(pData.cpf);
                            const name = normalize(pData.name || row.professionalName);

                            if (cns) pId = cnsMap.get(cns);
                            if (!pId && cpf) pId = cpfMap.get(cpf);
                            if (!pId && cns && cns.length === 11) pId = cpfMap.get(cns);
                            if (!pId && name) pId = nameMap.get(name);

                            if (!pId) {
                                if (cns) pId = `ext_${cns}`;
                                else if (cpf) pId = `ext_${cpf}`;
                                else if (name) pId = `ext_name_${name.replace(/\s/g, '')}`;
                                else pId = `ext_unknown_${d.id}`;
                            }
                        }

                        const finalId = pId || row.professionalCns || row.professionalId;

                        // Filter: Only add record if it belongs to the requested professional
                        if (professionalId && finalId !== professionalId) {
                            const isFallbackMatch =
                                (reqExtCns && pId === reqExtCns) ||
                                (reqExtCpf && pId === reqExtCpf) ||
                                (reqExtName && pId === reqExtName) ||
                                (professionalCns && (row.professionalCns === professionalCns || pId === professionalCns));

                            if (!isFallbackMatch) return;
                        } else if (!professionalId && professionalCns) {
                            if (row.professionalCns !== professionalCns && pId !== professionalCns && pId !== reqExtCns) return;
                        }

                        records.push({ ...row, id: d.id, source: 'connector', professionalId: finalId });
                    } catch (errInner) {
                        console.error("Error processing connector row", d.id, errInner);
                    }
                });
            } catch (e) {
                // Ignore missing collections
            }
        });
        });

        await Promise.all(compPromises);

        // 3. Normalize records exactly as expected by the frontend PDF generators
        const normalizedRecords = records.map(r => {
            // Resolve Sigtap
            const { code, name } = resolveSigtapCode(r);

            // Flatten nested patient data
            const patientName = r.patient?.name || r.patientName || 'NÃO IDENTIFICADO';
            const patientCns = r.patient?.cns || r.patientCns || '';
            const patientCpf = r.patient?.cpf || r.patientCpf || '';
            const patientBirthDate = r.patient?.birthDate || r.patientBirthDate || '';
            let age = r.patientAge;
            if (age === undefined && patientBirthDate && r.date) {
                const birth = new Date(patientBirthDate);
                const prod = new Date(r.date);
                age = prod.getFullYear() - birth.getFullYear();
            }

            // Flatten professional data
            const profName = r.professional?.name || r.professionalName || professionalName || 'Não Identificado';
            const profCns = r.professional?.cns || r.professionalCns || professionalCns || '';

            // Format Date
            let attDate = r.attendanceDate || r.productionDate || r.date || '';
            if (attDate && attDate.includes('-') && !attDate.includes('/')) {
                const d = attDate.split(' ')[0];
                const parts = d.split('-');
                if (parts[0].length === 4) { // YYYY-MM-DD to DD/MM/YYYY
                    attDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            } else if (r.productionDate && r.productionDate.includes('-')) {
                attDate = r.productionDate.split(' ')[0].split('-').reverse().join('/');
            }

            return {
                ...r,
                patientName,
                patientCns,
                patientCpf,
                patientBirthDate,
                patientAge: age,
                procedureCode: code || r.procedureCode || '',
                procedureName: name || r.procedureName || '',
                professionalName: profName,
                professionalCns: profCns,
                attendanceDate: attDate,
                cbo: r.professional?.cbo || r.cbo || '',
                status: r.status || 'active'
            };
        });

        return normalizedRecords;
    });
