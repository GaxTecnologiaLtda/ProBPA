const { google } = require('googleapis');
const admin = require('firebase-admin');

async function test() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const client = await auth.getClient();
  console.log("Auth works");
}
test().catch(console.error);
