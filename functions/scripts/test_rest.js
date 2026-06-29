const https = require('https');
const { execSync } = require('child_process');

try {
    const token = execSync('gcloud auth print-access-token').toString().trim();
    const projectId = 'probpa-025';
    
    // Path: municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/W1Tle7q1NUKkQiIgvEFI/extractions/2024/competences
    // REST URL: https://firestore.googleapis.com/v1/projects/{projectId}/databases/(default)/documents/{document_path}
    const path = 'municipalities/PRIVATE/wfgKMoGlzgf5OKzCK3PJ/W1Tle7q1NUKkQiIgvEFI/extractions/2024/competences';
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`;

    const options = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    };

    https.get(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log("REST Response:", data);
        });
    }).on('error', e => console.error(e));

} catch (e) {
    console.error("Error getting token:", e.message);
}
