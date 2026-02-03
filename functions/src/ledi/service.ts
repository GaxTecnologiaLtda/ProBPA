import { LediConfig, PecLoginResponse, PecSendResponse } from "./types";
import JSZip = require("jszip");

/**
 * Service class for handling API communications with the e-SUS PEC.
 */
export class LediService {
    private config: LediConfig;
    private jsessionid: string | null = null;

    constructor(config: LediConfig) {
        this.config = config;
    }

    /**
     * Authenticates with the PEC and retrieves the JSESSIONID.
     * Endpoint: /api/recebimento/login
     */
    async login(): Promise<PecLoginResponse> {
        const loginUrl = `${this.config.pecUrl.replace(/\/$/, "")}/api/recebimento/login`;

        // Official LEDI Doc requires Multipart for Login
        const formData = new FormData();
        formData.append("usuario", this.config.pecUser || "");
        formData.append("senha", this.config.pecPassword || "");

        const response = await fetch(loginUrl, {
            method: "POST",
            // Headers: fetch automatically sets Content-Type to multipart/form-data with boundary
            body: formData,
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Login failed: ${response.status} ${response.statusText} - ${text}`);
        }

        // Capture JSESSIONID from Set-Cookie header
        const setCookie = response.headers.get("set-cookie");
        if (setCookie) {
            const match = setCookie.match(/JSESSIONID=([^;]+)/);
            if (match) {
                this.jsessionid = match[1];
                return { jsessionid: this.jsessionid };
            }
        }

        // Fallback: sometimes it's in the body or simply the cookie is enough for subsequent requests
        // but the Manual usually relies on Cookie.
        return { jsessionid: "SESSION_ESTABLISHED" };
    }

    /**
     * Sends a serialized batch (Ficha or Transport XML) to the PEC.
     * Endpoint: /api/v1/recebimento/ficha
     */
    async sendBatch(binContent: Buffer, uuidFicha: string): Promise<PecSendResponse> {
        if (!this.jsessionid) {
            await this.login();
        }

        // PEC requires a ZIP file containing the Thrift (.esus) files.
        const zip = new JSZip();
        zip.file(`${uuidFicha}.esus`, binContent);

        const zipBuffer = await zip.generateAsync({
            type: "nodebuffer",
            compression: "DEFLATE",
            compressionOptions: { level: 6 }
        });

        const url = `${this.config.pecUrl.replace(/\/$/, "")}/api/v1/recebimento/ficha`;

        const formData = new FormData();
        const blob = new Blob([zipBuffer as any], { type: "application/zip" });
        formData.append("ficha", blob, `${uuidFicha}.zip`);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Cookie": `JSESSIONID=${this.jsessionid}`
            },
            body: formData
        });

        if (!response.ok) {
            const text = await response.text();
            return {
                success: false,
                statusCode: response.status,
                message: text
            };
        }

        const data = await response.json();
        return {
            success: true,
            statusCode: 200,
            data: data
        };
    }
}
