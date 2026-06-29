const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json' || './keys/serviceAccountKey.json'); // I'll load from env
admin.initializeApp({
  projectId: 'probpa-025' // Just need project ID if using application default credentials?
});
// Need to find service account key first.
