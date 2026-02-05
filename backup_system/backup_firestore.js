const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
// STARTUP INSTRUCTION:
// 1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account key path
// OR run `gcloud auth application-default login` before running this script.
try {
    admin.initializeApp({
        projectId: 'probpa-025' // Força o projeto correto
    });
} catch (e) {
    console.error("Erro ao inicializar Firebase Admin. Certifique-se de estar autenticado.");
    console.error("Rode: gcloud auth application-default login");
    console.error("Ou defina GOOGLE_APPLICATION_CREDENTIALS pointing to service-account.json");
    process.exit(1);
}

const db = admin.firestore();

// Configuration
const BACKUP_DIR = path.join(__dirname, '../backups');
const DATE_STR = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const BACKUP_FILE = path.join(BACKUP_DIR, `backup_${DATE_STR}.json`);

// Ensure directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

console.log(`🚀 Iniciando Backup Local em: ${BACKUP_FILE}`);
console.log(`⚠️  ATENÇÃO: Este processo consome cotas de leitura do Firestore.`);

const fullBackup = {};

async function backupCollection(collectionRef, pathPrefix = '') {
    const snapshot = await collectionRef.get();
    const collectionName = collectionRef.id;
    const currentPath = pathPrefix ? `${pathPrefix}/${collectionName}` : collectionName;

    console.log(`📂 Lendo coleção: ${currentPath} (${snapshot.size} documentos)`);

    const docsData = {};

    for (const doc of snapshot.docs) {
        const data = doc.data();

        // Handle Datestamps and References manually if needed, 
        // but JSON.stringify handles basic types automatically.
        // Timestamps usually convert to ISO strings or objects.

        docsData[doc.id] = data;

        // Check for subcollections
        const subcollections = await doc.ref.listCollections();
        for (const subcol of subcollections) {
            const subData = await backupCollection(subcol, `${currentPath}/${doc.id}`);
            if (!docsData[doc.id].__subcollections__) {
                docsData[doc.id].__subcollections__ = {};
            }
            docsData[doc.id].__subcollections__[subcol.id] = subData;
        }
    }

    return docsData;
}

async function startBackup() {
    try {
        const collections = await db.listCollections();

        for (const col of collections) {
            fullBackup[col.id] = await backupCollection(col);
        }

        console.log(`💾 Salvando arquivo...`);
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(fullBackup, null, 2));

        const stats = fs.statSync(BACKUP_FILE);
        const sizeMb = (stats.size / 1024 / 1024).toFixed(2);

        console.log(`✅ Backup Concluído com Sucesso!`);
        console.log(`📦 Tamanho: ${sizeMb} MB`);
        console.log(`📍 Arquivo: ${BACKUP_FILE}`);

    } catch (error) {
        console.error("❌ Erro durante o backup:", error);
    }
}

startBackup();
