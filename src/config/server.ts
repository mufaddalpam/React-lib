import { PDFPage, rgb } from "pdf-lib";
import API_BASE_URL, { API_ENDPOINTS } from "./api";

const SIGNATURE_DEFAULT_HEIGHT = 65;
const TEXT_PRIMARY = rgb(0.05, 0.05, 0.05);
const TEXT_SECONDARY = rgb(0.35, 0.35, 0.35);
// Backend returns normalized percentages captured from a 600px-wide viewport.
const COORDINATE_REFERENCE_WIDTH = 600;
// Assume a letter-sized aspect ratio to derive the matching height for the normalized viewport.
const LETTER_ASPECT_RATIO = 11 / 8.5;
const COORDINATE_REFERENCE_HEIGHT = COORDINATE_REFERENCE_WIDTH * LETTER_ASPECT_RATIO;
// console.log("COORDINATE_REFERENCE_HEIGHT: ", COORDINATE_REFERENCE_HEIGHT)

type HeaderMap = Record<string, string>;

type CoordinatesApiResponse = {
    success?: boolean;
    error?: string;
    data?: Array<{
        id?: string;
        x: number;
        y: number;
        width?: number;
        height?: number;
        pageNumber?: number;
        type?: ElementPosition["type"];
    }>;
};
interface CreateDocumentPayload {
    templateId: string;
    signerEmail: string;
    signerName: string;
    meta?: Record<string, any>;
}

export interface ElementPosition {
    x: number;
    y: number;
    page: number;
    width?: number;
    height?: number;
    type?: "SIGNATURE" | "NAME" | "EMAIL" | "DATE";
}

export interface FetchConfig {
    baseURL?: string;
    headers?: HeadersInit;
    getAuthHeaders?: () => Promise<HeadersInit>;
}

export interface SignConfig {
    endpoint?: string;
    method?: "POST" | "PUT";
    contentType?: "json" | "form-data";
}

export interface SubmissionMetadata {
    documentName?: string;
    documentId?: string;
    signerName?: string;
    signerEmail?: string;
    // customText?: string;
}
export function makeObjectUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
}

function resolveEndpoint(endpoint: string, override?: string): string {
    if (!override) return endpoint;
    const normalizedOverride = override.replace(/\/$/, "");
    if (endpoint.startsWith("http")) {
        const normalizedDefault = API_BASE_URL.replace(/\/$/, "");
        return endpoint.startsWith(normalizedDefault)
            ? `${normalizedOverride}${endpoint.slice(normalizedDefault.length)}`
            : endpoint;
    }
    const normalizedPath = endpoint.replace(/^\//, "");
    return `${normalizedOverride}/${normalizedPath}`;
}

function isHeadersInstance(init: HeadersInit): init is Headers {
    return typeof Headers !== "undefined" && init instanceof Headers;
}

function normalizeHeaders(init?: HeadersInit): HeaderMap {
    if (!init) return {};
    if (isHeadersInstance(init)) {
        const map: HeaderMap = {};
        init.forEach((value, key) => {
            map[key] = value;
        });
        return map;
    }
    if (Array.isArray(init)) {
        return init.reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {} as HeaderMap);
    }
    return { ...(init as Record<string, string>) };
}

function mergeHeaders(...inits: Array<HeadersInit | undefined>): HeaderMap {
    return inits.reduce<HeaderMap>((acc, init) => {
        if (!init) return acc;
        return { ...acc, ...normalizeHeaders(init) };
    }, {});
}


function removeHeaderCaseInsensitive(headers: HeaderMap, name: string) {
    const target = name.toLowerCase();
    Object.keys(headers).forEach((key) => {
        if (key.toLowerCase() === target) {
            delete headers[key];
        }
    });
}

function percentToPoint(value: number | undefined, span: number): number {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return 0;
    }
    const normalized = Math.min(Math.max(value, 0), 100);
    // console.log("normalized: ", normalized, span)
    return (normalized / 100) * span;
}

async function authedFetch(endpoint: string, fetchConfig?: FetchConfig, init: RequestInit = {}): Promise<Response> {
    const resolvedUrl = resolveEndpoint(endpoint, fetchConfig?.baseURL);
    const authHeaders = fetchConfig?.getAuthHeaders ? await fetchConfig.getAuthHeaders() : fetchConfig?.headers;
    const headers = mergeHeaders(authHeaders, init.headers);
    if (init.body instanceof FormData) {
        removeHeaderCaseInsensitive(headers, "Content-Type");
    }
    // console.log(resolvedUrl)
    return fetch(resolvedUrl, { ...init, headers });
}

export function base64ToBlob(data: string, mimeType = "application/pdf"): Blob {
    const cleaned = data.includes("base64,") ? data.split("base64,")[1] : data;
    const byteCharacters = atob(cleaned);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Unable to read PDF data"));
        reader.onloadend = () => {
            const result = reader.result;
            if (typeof result === "string") {
                resolve(result.includes(",") ? result.split(",")[1] : result);
            } else {
                reject(new Error("Unexpected reader result"));
            }
        };
        reader.readAsDataURL(blob);
    });
}

async function readJson(response: Response): Promise<any> {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return { raw: text };
    }
}

async function extractPdfBlob(response: Response): Promise<Blob> {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/pdf") || contentType.includes("application/octet-stream")) {
        return response.blob();
    }
    const payload = await response.json();
    const candidate =
        payload?.data?.fileBase64 ??
        payload?.data?.file ??
        payload?.data?.content ??
        payload?.data ??
        payload?.file ??
        payload?.fileUrl ??
        payload?.url;
    if (typeof candidate === "string" && candidate.startsWith("http")) {
        const remote = await fetch(candidate);
        if (!remote.ok) throw new Error("Unable to download PDF asset");
        return remote.blob();
    }
    if (typeof candidate === "string") {
        return base64ToBlob(candidate, payload?.mimeType || "application/pdf");
    }
    if (payload?.data?.fileUrl) {
        const remote = await fetch(payload.data.fileUrl);
        if (!remote.ok) throw new Error("Unable to download PDF asset");
        return remote.blob();
    }
    throw new Error("Document payload missing a PDF resource");
}

export function drawTextAtPosition(
    pages: PDFPage[],
    text: string | undefined,
    position?: ElementPosition,
    size = 11.5,
    color = TEXT_PRIMARY
) {
    // console.log("here drawTextAtPosition:", text, position, size, color)
    if (!text || !position) return;
    // Accept 1-based page numbers (from ElementPosition) while keeping 0-based refs internally
    const desiredIndex = position.page >= 1 ? position.page - 1 : position.page;
    const page = pages[desiredIndex];
    if (!page) {
        throw new Error(`Invalid page index ${position.page} for text placement`);
    }
    page.drawText(text, {
        x: position.x,
        y: position.y,
        size,
        color,
    });
}

export function drawFallbackMetadataBlock(
    page: PDFPage,
    signaturePosition: ElementPosition,
    meta: { signerName?: string; signerEmail?: string; dateLabel?: string }
) {
    const blockHeight = 10 //signaturePosition.height ?? SIGNATURE_DEFAULT_HEIGHT;
    // console.log(blockHeight, signaturePosition.height, SIGNATURE_DEFAULT_HEIGHT)
    const x = signaturePosition.x; //removed + 3
    let currentY = signaturePosition.y - blockHeight - 1;
    const fontSize = 11.5;
    const lineHeight = 10;

    if (meta.signerName) {
        page.drawText(meta.signerName, { x, y: currentY, size: fontSize, color: TEXT_PRIMARY });
        currentY -= lineHeight;
    }
    if (meta.signerEmail) {
        page.drawText(meta.signerEmail, { x, y: currentY, size: fontSize, color: TEXT_PRIMARY });
        currentY -= lineHeight;
    }
    if (meta.dateLabel) {
        page.drawText(meta.dateLabel, {
            x,
            y: currentY,
            size: fontSize - 0.5,
            color: TEXT_SECONDARY,
        });
    }
}

export async function apiCreateDocument(fetchConfig: FetchConfig | undefined, body: CreateDocumentPayload) {
    const response = await authedFetch(API_ENDPOINTS.DOCUMENTS_CREATE, fetchConfig, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok || json?.success === false) {
        throw new Error(json?.error || "Failed to create document");
    }
    const id = json?.data?.id ?? json?.id;
    if (!id) throw new Error("No document id returned");
    return { id, raw: json };
}

export async function apiCreateSession(fetchConfig: FetchConfig | undefined, documentId: string) {
    const response = await authedFetch(API_ENDPOINTS.SESSIONS_CREATE, fetchConfig, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
    });
    const json = await response.json();
    if (!response.ok || json?.success === false) {
        throw new Error(json?.error || "Failed to create session");
    }
    const tokenPublic = json?.sessionToken ?? json?.token ?? json?.data?.sessionToken;
    if (!tokenPublic) throw new Error("No session token returned");
    return { tokenPublic, raw: json };
}

export async function apiFetchDocumentView(fetchConfig: FetchConfig | undefined, documentId: string): Promise<Blob> {
    const response = await authedFetch(API_ENDPOINTS.DOCUMENTS_VIEW(documentId), fetchConfig);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to fetch document");
    }
    return extractPdfBlob(response);
}

export async function submitSignedPdfToSession(options: {
    sessionToken: string;
    signedPdfBase64: string;
    fetchConfig?: FetchConfig;
    signConfig?: SignConfig;
    metadata?: SubmissionMetadata;
}) {
    const { sessionToken, signedPdfBase64, fetchConfig, signConfig, metadata } = options;
    const endpoint = signConfig?.endpoint || API_ENDPOINTS.SESSIONS_PUBLIC_SIGN(sessionToken);
    // console.log(`Submitting signed PDF to session: ${signConfig?.method || "POST"} ${endpoint}`);
    const response = await authedFetch(endpoint, fetchConfig, {
        method: signConfig?.method || "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sessionToken,
            signedPdfBase64,
            signerName: metadata?.signerName,
            signerEmail: metadata?.signerEmail,
            // customText: metadata?.customText,
        }),
    });
    const json = await readJson(response);
    if (!response.ok || json?.success === false) {
        throw new Error(json?.error || "Submit failed");
    }
    return json;
}

export async function submitSignedPdfToDocument(options: {
    documentId?: string;
    blob: Blob;
    fetchConfig?: FetchConfig;
    signConfig?: SignConfig;
    metadata?: SubmissionMetadata;
}) {
    const { documentId, blob, fetchConfig, signConfig, metadata } = options;
    const endpoint = signConfig?.endpoint || (documentId ? API_ENDPOINTS.DOCUMENT_SIGN(documentId) : null);
    if (!endpoint) {
        throw new Error("Document id or custom sign endpoint is required for submission");
    }
    const method = signConfig?.method || "POST";
    // console.log(`Submitting signed PDF to document: ${method} ${endpoint}`);
    if (signConfig?.contentType === "json") {
        const payload = {
            documentId,
            documentName: metadata?.documentName,
            signerName: metadata?.signerName,
            signerEmail: metadata?.signerEmail,
            // customText: metadata?.customText,
            signedPdfBase64: await blobToBase64(blob),
        };
        const response = await authedFetch(endpoint, fetchConfig, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const json = await readJson(response);
        if (!response.ok || json?.success === false) {
            throw new Error(json?.error || "Submit failed");
        }
        return json;
    }

    const formData = new FormData();
    const fileName = `${metadata?.documentName || "document"}_signed.pdf`;
    formData.append("signedPdf", blob, fileName);
    if (documentId) formData.append("documentId", documentId);
    if (metadata?.signerName) formData.append("signerName", metadata.signerName);
    if (metadata?.signerEmail) formData.append("signerEmail", metadata.signerEmail);
    // if (metadata?.customText) formData.append("customText", metadata.customText);
    const response = await authedFetch(endpoint, fetchConfig, {
        method,
        body: formData,
    });
    const json = await readJson(response);
    if (!response.ok || json?.success === false) {
        throw new Error(json?.error || "Submit failed");
    }
    return json;
}

type PageMetrics = {
    width: number;
    height: number;
};


export async function fetchSignaturePositions(
    fetchConfig: FetchConfig | undefined,
    templateId: string,
    pageMetrics: PageMetrics[]
): Promise<ElementPosition[]> {

    const response = await authedFetch(API_ENDPOINTS.ALL_COORDINATES(templateId), fetchConfig, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    const payload = await readJson(response);
    if (!response.ok) {
        throw new Error(payload?.error || "Failed to fetch coordinates");
    }

    const entries = payload?.data ?? [];

    // Percent → points conversion helper
    const percentToPoint = (percent: number, total: number) => (percent / 100) * total;

    // Height/width normalization
    const normalizeDimension = (value: number | undefined, max: number) => {
        if (typeof value !== "number") return undefined;

        // Legacy % dimension
        if (value <= 100) {
            return percentToPoint(value, max);
        }

        // Already in points
        return value;
    };

    return entries.map((entry: {
        x?: number,
        y?: number,
        width?: number,
        height?: number,
        pageNumber?: number,
        type?: string,
    }) => {
        const { x = 0, y = 0, width, height, pageNumber, type } = entry;

        const page = pageNumber ?? 1;
        const pageIndex = page - 1;

        const pdfWidth = pageMetrics[pageIndex]?.width;
        const pdfHeight = pageMetrics[pageIndex]?.height;

        if (!pdfWidth || !pdfHeight) {
            throw new Error(`Missing page metrics for page ${page}`);
        }

        const isPercent = x <= 100 && y <= 100;

        let absX: number;
        let absY: number;
        let absWidth: number | undefined;
        let absHeight: number | undefined;

        if (isPercent) {
            // ---- Legacy percentages ----
            absX = percentToPoint(x, pdfWidth);

            // Convert top-left % → PDF bottom-left points
            const topPx = percentToPoint(y, pdfHeight);
            absHeight = normalizeDimension(height, pdfHeight);
            const h = absHeight ?? 0;

            absY = pdfHeight - topPx - h;

        } else {
            // ---- Already normalized points (0–1 normalized or real points) ----
            absX = x * pdfWidth;
            absY = y * pdfHeight;

            absWidth = normalizeDimension(width, pdfWidth);
            absHeight = normalizeDimension(height, pdfHeight);
        }

        // Ensure width/height are always normalized
        absWidth = absWidth ?? normalizeDimension(width, pdfWidth);
        absHeight = absHeight ?? normalizeDimension(height, pdfHeight);

        return {
            x: absX,
            y: absY,
            width: absWidth,
            height: absHeight,
            page,
            type,
        };
    });
}
