---
description: Procedures for wrapping up the daily work session, including mandatory database backup and code synchronization.
---

# Daily Wrap Up Routine

Always trigger this skill when the user indicates they are finishing work for the day or asks to "close the session".

## Checklist

### 1. 💾 Database Backup (MANDATORY)
Executes the local backup script to generate a JSON dump of the Firestore database.

1.  **Check Authentication**: Ensure `gcloud` is authenticated.
    ```bash
    gcloud auth application-default login
    ```
    *(Skip if already logged in)*

2.  **Run Backup**:
    ```bash
    npm run backup:local
    ```
    *Note: Script located in `backup_system/backup_firestore.js`*

3.  **Verify**: Check the `backups/` folder to ensure a new JSON file was created.

### 2. 🛡️ Upload Backup (User Action)
Remind the user to upload the generated JSON file to a secure external location (Google Drive, Dropbox, or Private Repo).

### 3. 📦 Git Sync
Ensure all code changes are committed and pushed.

1.  **Status Check**:
    ```bash
    git status
    ```
2.  **Commit & Push** (if changes exist):
    ```bash
    git add .
    git commit -m "chore: daily wrap up"
    git push
    ```

### 4. 📝 Changelog Update
Ensure `CHANGELOG.md` reflects the day's achievements.

---
**Usage:**
- When user says: "Encerrar por hoje", "Finalizar demandas", "Backup do dia".
- Action: Follow the steps above strictly.
