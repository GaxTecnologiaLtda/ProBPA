---
name: connector_maintenance
description: Master procedures for developing, building, and releasing the ProBPA Desktop Connector.
---

# Connector Maintenance Skill 📘

This skill provides the definitive procedures for maintaining the **ProBPA Connector (Desktop App)**.
It is based on the **Connector Master Guide** and covers the entire lifecycle from development to automated release.

## 1. Context & Architecture

The Connector is a **Python/CustomTkinter** app that runs on Windows options:
-   **Bridge (ETL):** Extracts data from local PostgreSQL (e-SUS PEC).
-   **Upload:** Sends JSON payloads to Firebase Functions (`ingestPecData`).
-   **Auto-Update:** Self-updates via GitHub Releases.

**Key Directories:**
-   `/connector_app`: Source code.
-   `/connector_app/core`: Logic (Engine, Updater).
-   `/connector_app/ui`: GUI (Dashboard, Tray).
-   `/.github/workflows`: CI/CD Pipelines.

---

## 2. Development Workflow 🔄

### Step 1: Logic Changes
Always work on the `test/auto-update` branch for features, or `main` for critical hotfixes.
1.  Edit Python files in `connector_app/`.
2.  Test locally: `python connector_app/launcher.py`.

### Step 2: Versioning (CRITICAL)
Before any release, you **MUST** increment the version:
1.  Edit `connector_app/version.py`.
2.  Update `__version__ = "3.x.x"`.
3.  Commit: `chore: bump version to 3.x.x`.

---

## 3. Release Ritual (Zero-Touch) 🚀

We use **GitHub Actions** to build and release reliably. Do NOT build `.exe` manually unless debugging.

### How to Release:
1.  **Tag the Commit:**
    Create a git tag matching the version you just set.
    ```bash
    git tag -a v3.4.2 -m "Release v3.4.2"
    ```

2.  **Push the Tag:**
    ```bash
    git push origin v3.4.2
    ```

3.  **Wait & Watch:**
    -   GitHub Action `Build and Release Connector` will start automatically.
    -   It spins up a Windows VM.
    -   Compiles the `.exe` (PyInstaller + Inno Setup).
    -   Creates a GitHub Release.
    -   Updates `connector_version.json` on Firebase Hosting.

**That's it.** The clients will auto-update within minutes/hours.

---

## 4. Manual Operations (Fallback) 🛠️

If CI/CD fails, use these local scripts (Requires Windows environment):

*   **Build Local:** `build_exe.bat`
*   **Generate Release Metadata:** `python connector_app/tools/release.py`
*   **Deep Scan (Schema Fix):** `python scripts-extracao-esus/deep_map_esus.py` (Use this if "Column not found" errors appear).

---

## 5. Data Schema & Idempotency 📦

**API Destination:** `ingestPecData` Cloud Function.
**Firestore Path:** `municipalities/{TYPE}/{ENTITY_ID}/{MUN_ID}/extractions/{externalId}`

**JSON Payload (`record`):**
```json
{
  "externalId": "UUID_CODE", // Deterministic ID (Prevent Duplicates)
  "professional": { ... },
  "patient": { ... },
  "procedure": {
     "type": "CONSULTATION", // Enum: PROCEDURE, ODONTO, VACCINATION...
     ...
  },
  "productionDate": "YYYY-MM-DD"
}
```

---

## 6. Agent Commands 🤖

Use these commands to navigate the project efficiently:

*   **Test Run:** `python connector_app/launcher.py`
*   **Check Schema:** `python scripts-extracao-esus/deep_map_esus.py`
*   **Build (Manual):** `cmd.exe /c build_exe.bat`
*   **Verify CI/CD:** Read `.github/workflows/build_and_release.yml`

**End of Skill.**
