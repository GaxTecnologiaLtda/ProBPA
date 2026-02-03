
import * as admin from 'firebase-admin';
import { EntityType, LicenseStatus } from './types';

// REMOVE initializeApp from here — it must not run twice

const db = admin.firestore();
const auth = admin.auth();

export const seedDatabase = async () => {
    console.log('Starting database seed...');

    // 1. Create Admin User
    const adminEmail = 'santosgabriel.s@icloud.com';
    const adminPassword = 'gabs25@@#';

    try {
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(adminEmail);
            console.log('Admin user already exists:', userRecord.uid);
        } catch (e) {
            userRecord = await auth.createUser({
                email: adminEmail,
                password: adminPassword,
                displayName: 'Super Admin',
            });
            console.log('Created admin user:', userRecord.uid);
        }

        // Set Custom Claims
        await auth.setCustomUserClaims(userRecord.uid, { admin: true });
        console.log('Set admin claims for user');

        // Create User Profile in Firestore
        await db.collection('users').doc(userRecord.uid).set({
            name: 'Super Admin',
            email: adminEmail,
            role: 'admin',
            active: true,
            createdAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error creating admin user:', error);
    }

    // Sample Entities
    const entities = [
        {
            id: 'ent1',
            name: 'Pref. Mun. de Salvador',
            cnpj: '12.345.678/0001-90',
            type: EntityType.PUBLIC,
            location: 'Salvador - BA',
            status: LicenseStatus.ACTIVE,
            createdAt: new Date().toISOString(),
            healthUnits: 45,
            responsible: 'João Silva',
            email: 'contato@salvador.ba.gov.br'
        },
        {
            id: 'ent2',
            name: 'Instituto Saúde Total',
            cnpj: '45.678.901/0001-23',
            type: EntityType.PRIVATE,
            location: 'São Paulo - SP',
            status: LicenseStatus.ACTIVE,
            createdAt: new Date().toISOString(),
            privateType: 'OS',
            municipalityCount: 3,
            responsible: 'Dr. Roberto',
            email: 'roberto@saudetotal.org'
        }
    ];

    for (const entity of entities) {
        await db.collection('entities').doc(entity.id).set(entity);
    }
    console.log('Seeded entities');

    // Sample Municipalities
    const municipalities = [
        {
            id: 'mun1',
            name: 'Salvador',
            state: 'BA',
            linkedEntityId: 'ent1',
            linkedEntityName: 'Pref. Mun. de Salvador',
            usersCount: 120,
            status: LicenseStatus.ACTIVE
        },
        {
            id: 'mun2',
            name: 'Petrolina',
            state: 'PE',
            linkedEntityId: 'ent2',
            linkedEntityName: 'Instituto Saúde Total',
            usersCount: 30,
            status: LicenseStatus.ACTIVE
        }
    ];

    for (const mun of municipalities) {
        await db.collection('municipalities').doc(mun.id).set(mun);
    }

    console.log('Seeded municipalities');
    console.log('Database seed completed successfully.');
};