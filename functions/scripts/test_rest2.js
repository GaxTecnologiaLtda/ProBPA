const https = require('https');
const { execSync } = require('child_process');

try {
    const rawOut = execSync('gcloud auth print-access-token', { encoding: 'utf8' });
    const token = rawOut.split('\n')[0].trim(); // Just get the first line!
    
    const projectId = 'probpa-025';
    // Let's get the document list from competences!
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
            console.log("REST Response Size:", data.length);
            const parsed = JSON.parse(data);
            if (parsed.documents) {
               console.log("Got documents:", parsed.documents.length);
               console.log(parsed.documents.map(d => d.name));
            } else {
               console.log(parsed);
            }
        });
    }).on('error', e => console.error(e));

} catch (e) {
    console.error("Error getting token:", e.message);
}
