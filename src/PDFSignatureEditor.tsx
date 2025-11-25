"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
// import "react-pdf/dist/Page/AnnotationLayer.css";
// import "react-pdf/dist/Page/TextLayer.css";
import { PDFDocument } from "pdf-lib";
import SignatureCanvas from "react-signature-canvas";
import dayjs from "dayjs";
import { ToastProvider, useToast } from "./contexts/ToastContext";
import "./PDFSignatureEditor.css";
import {
  apiCreateDocument,
  apiCreateSession,
  apiFetchDocumentView,
  blobToBase64,
  drawFallbackMetadataBlock,
  drawTextAtPosition,
  makeObjectUrl,
  submitSignedPdfToDocument,
  submitSignedPdfToSession,
  fetchSignaturePositions
} from "./config/server";
import type { ElementPosition, FetchConfig, SignConfig, SubmissionMetadata } from "./config/server";

export type { ElementPosition, FetchConfig, SignConfig } from "./config/server";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

const PDF_BASE_WIDTH = 600;
const SIGNATURE_DEFAULT_WIDTH = 130;
const SIGNATURE_DEFAULT_HEIGHT = 65;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;

type MetadataFieldType = "NAME" | "EMAIL" | "DATE";
type MetadataTargetMap = Record<MetadataFieldType, ElementPosition[]>;

const createEmptyMetadataTargets = (): MetadataTargetMap => ({
  NAME: [],
  EMAIL: [],
  DATE: [],
});

const isMetadataFieldType = (value?: ElementPosition["type"]): value is MetadataFieldType =>
  value === "NAME" || value === "EMAIL" || value === "DATE";

const bucketizeMetadataTargets = (positions: ElementPosition[]): MetadataTargetMap => {
  const buckets = createEmptyMetadataTargets();
  positions.forEach((position) => {
    if (isMetadataFieldType(position.type)) {
      buckets[position.type].push(position);
    }
  });
  return buckets;
};

type ToastVariant = "success" | "error" | "warning" | "info";

export interface PDFSignatureEditorProps {
  documentId?: string;
  templateId?: string;
  sessionToken?: string;
  documentMeta?: Record<string, any>;
  fetchConfig?: FetchConfig;
  signConfig?: SignConfig;
  pdfData?: string;
  pdfUrl?: string;
  documentName?: string;
  signerName?: string;
  signerEmail?: string;
  signaturePosition?: ElementPosition;
  // signaturePos?: ElementPosition[];
  showSignerName?: boolean;
  showSignerEmail?: boolean;
  showSigningDate?: boolean;
  onSuccess?: (response: any) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  onLoadSuccess?: (numPages: number) => void;
  onLoadError?: (error: Error) => void;
  // enableCustomText?: boolean;
  enableUndo?: boolean;
  submitButtonText?: string;
  resetButtonText?: string;
  showCancelButton?: boolean;
  className?: string;
  onComplete?: (d: any) => void;
  onLoad?: (numPages: number) => void;
  onAllPagesRendered?: (numPages: number) => void;
}

function PDFSignatureEditorInner({
  documentId,
  templateId,
  sessionToken: sessionTokenProp,
  documentMeta,
  fetchConfig,
  signConfig,
  pdfData,
  pdfUrl: propPdfUrl,
  documentName = "document",
  signerName: initialSignerName = "",
  signerEmail: initialSignerEmail = "",
  signaturePosition,
  // signaturePos,
  showSignerName = false,
  showSignerEmail = false,
  showSigningDate = false,
  onSuccess,
  onError,
  onCancel,
  onLoadSuccess,
  onLoadError,
  className = "",
  // enableCustomText = true,
  enableUndo = true,
  submitButtonText = "Submit Document",
  resetButtonText = "Reset Document",
  showCancelButton = false,
  onComplete,
  onLoad,
  onAllPagesRendered,
}: PDFSignatureEditorProps) {


  const { showToast } = useToast();
  const stableShowToast = useCallback(
    (message: string, type: ToastVariant = "info") => {
      showToast(message, type);
    },
    [showToast]
  );

  const sigRef = useRef<SignatureCanvas>(null);
  const objectUrlRef = useRef<string | null>(null);
  const documentIdRef = useRef<string | undefined>(documentId);
  const sessionTokenRef = useRef<string | undefined>(sessionTokenProp);
  const pagesRenderedRef = useRef(0);
  const pagesReadyNotifiedRef = useRef(false);

  const [activeDocumentId, setActiveDocumentId] = useState<string | undefined>(documentId || undefined);
  const [sessionTokenState, setSessionTokenState] = useState<string | undefined>(sessionTokenProp || undefined);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [currentPdfBlob, setCurrentPdfBlob] = useState<Blob | null>(null);
  const [originalPdfBlob, setOriginalPdfBlob] = useState<Blob | null>(null);
  const [modifiedPdfBlob, setModifiedPdfBlob] = useState<Blob | null>(null);
  const [pdfHistory, setPdfHistory] = useState<Blob[]>([]);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureTargets, setSignatureTargets] = useState<ElementPosition[]>(() =>
    signaturePosition ? [{ ...signaturePosition, type: signaturePosition.type ?? "SIGNATURE" }] : []
  );
  const [metadataTargets, setMetadataTargets] = useState<MetadataTargetMap>(() => createEmptyMetadataTargets());
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const fallbackTargets = () =>
      signaturePosition ? [{ ...signaturePosition, type: signaturePosition.type ?? "SIGNATURE" }] : [];

    if (!templateId) {
      setSignatureTargets(fallbackTargets());
      setMetadataTargets(createEmptyMetadataTargets());
      return;
    }

    let isCancelled = false;

    const hydrateSignatureTargets = async () => {
      try {
        const remoteTargets = await fetchSignaturePositions(fetchConfig, templateId);
        if (isCancelled) return;
        setMetadataTargets(bucketizeMetadataTargets(remoteTargets));
        const remoteSignatureTargets = remoteTargets.filter(
          (target) => !target.type || target.type === "SIGNATURE"
        );
        if (remoteSignatureTargets.length > 0) {
          setSignatureTargets(remoteSignatureTargets);
        } else {
          setSignatureTargets(fallbackTargets());
        }
      } catch (err: any) {
        if (isCancelled) return;
        console.error("Failed to fetch signature positions", err);
        setSignatureTargets(fallbackTargets());
        setMetadataTargets(createEmptyMetadataTargets());
        stableShowToast(err?.message || "Failed to fetch signature positions", "error");
      }
    };

    hydrateSignatureTargets();

    return () => {
      isCancelled = true;
    };
  }, [
    templateId,
    signaturePosition,
    fetchConfig?.baseURL,
    fetchConfig?.headers,
    fetchConfig?.getAuthHeaders,
    stableShowToast,
  ]);

  const hasSignatureTargets = signatureTargets.length > 0;
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderNonce, setRenderNonce] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signerName, setSignerName] = useState(initialSignerName);
  const [signerEmail, setSignerEmail] = useState(initialSignerEmail);
  // const [customText, setCustomText] = useState("");

  const updateDocumentId = useCallback((value?: string) => {
    documentIdRef.current = value;
    setActiveDocumentId(value);
  }, []);

  const updateSessionToken = useCallback((value?: string) => {
    sessionTokenRef.current = value;
    setSessionTokenState(value);
  }, []);

  useEffect(() => {
    updateDocumentId(documentId);
  }, [documentId, updateDocumentId]);

  useEffect(() => {
    updateSessionToken(sessionTokenProp);
  }, [sessionTokenProp, updateSessionToken]);

  const applyBlob = useCallback(
    (blob: Blob, options: { isOriginal?: boolean; markModified?: boolean } = {}) => {
      const url = makeObjectUrl(blob);
      objectUrlRef.current = url;
      setPdfUrl(url);
      setRenderNonce((value) => value + 1);
      setCurrentPdfBlob(blob);
      if (options.isOriginal) {
        setOriginalPdfBlob(blob);
        setModifiedPdfBlob(null);
        setPdfHistory([]);
        setHasSignature(false);
      } else if (options.markModified !== false) {
        setModifiedPdfBlob(blob);
      }
    },
    [setHasSignature]
  );

  const saveToHistory = useCallback(() => {
    if (!currentPdfBlob || !enableUndo) return;
    try {
      const clone = currentPdfBlob.slice(0, currentPdfBlob.size, currentPdfBlob.type);
      setPdfHistory((prev) => [...prev, clone]);
    } catch {
      setPdfHistory((prev) => [...prev, currentPdfBlob]);
    }
  }, [currentPdfBlob, enableUndo]);

  const handleUndo = useCallback(() => {
    if (pdfHistory.length === 0) {
      stableShowToast("Nothing to undo", "info");
      return;
    }
    const previous = pdfHistory[pdfHistory.length - 1];
    setPdfHistory((prev) => prev.slice(0, -1));
    applyBlob(previous, { markModified: previous !== originalPdfBlob });
    if (previous === originalPdfBlob) {
      setModifiedPdfBlob(null);
    }
    stableShowToast("Undone", "success");
    setHasSignature(false);
  }, [pdfHistory, originalPdfBlob, applyBlob, stableShowToast, setHasSignature]);

  const hydrateFromLegacySource = useCallback(async () => {
    const source = pdfData
      ? pdfData.startsWith("data:")
        ? pdfData
        : `data:application/pdf;base64,${pdfData}`
      : propPdfUrl!;
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Failed to load provided PDF (${response.status})`);
    const blob = await response.blob();
    applyBlob(blob, { isOriginal: true });
  }, [pdfData, propPdfUrl, applyBlob]);


  //create document using templateId
  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      if (pdfData || propPdfUrl) {
        try {
          await hydrateFromLegacySource();
          if (isMounted) {
            setError(null);
          }
        } catch (err: any) {
          if (!isMounted) return;
          const message = err?.message || "Failed to load provided PDF";
          setError(message);
          onError?.(err);
          stableShowToast(message, "error");
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
        return;
      }

      if (!documentId && !templateId) {
        setLoading(false);
        setError("Provide a documentId, templateId, pdfData, or pdfUrl to load a document.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let workingDocumentId = documentIdRef.current || documentId || undefined;

        if (!workingDocumentId && templateId) {
          const created = await apiCreateDocument(fetchConfig, {
            templateId,
            signerEmail: initialSignerEmail,
            signerName: initialSignerName,
            meta: documentMeta,
          });
          workingDocumentId = created.id;
          updateDocumentId(created.id);
          // stableShowToast("Document created from template", "success");
        }

        if (!workingDocumentId) {
          throw new Error("Document id is not available yet.");
        }

        if (!sessionTokenRef.current) {
          const session = await apiCreateSession(fetchConfig, workingDocumentId);
          updateSessionToken(session.tokenPublic);
        }

        const blob = await apiFetchDocumentView(fetchConfig, workingDocumentId);
        applyBlob(blob, { isOriginal: true });
        if (isMounted) {
          setError(null);
        }
        // stableShowToast("Document loaded successfully", "success");
      } catch (err: any) {
        if (!isMounted) return;
        const message = err?.message || "Failed to load document";
        setError(message);
        onError?.(err);
        stableShowToast(`Load failed: ${message}`, "error");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [
    pdfData,
    propPdfUrl,
    hydrateFromLegacySource,
    documentId,
    templateId,
    fetchConfig?.baseURL,
    fetchConfig?.headers,
    fetchConfig?.getAuthHeaders,
    initialSignerEmail,
    initialSignerName,
    documentMeta,
    updateDocumentId,
    updateSessionToken,
    applyBlob,
    stableShowToast,
    onError,
  ]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current && objectUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [availableWidth, setAvailableWidth] = useState(PDF_BASE_WIDTH);

  const updateAvailableWidth = useCallback(() => {
    const width =
      containerRef.current?.clientWidth ??
      (typeof window !== "undefined" ? window.innerWidth : PDF_BASE_WIDTH);
    const inner = width > 40 ? width - 40 : width;
    setAvailableWidth(Math.max(0, inner));
  }, []);

  useEffect(() => {
    updateAvailableWidth();
    if (typeof window === "undefined") return;
    const handleResize = () => updateAvailableWidth();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateAvailableWidth]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, Math.round((prev + ZOOM_STEP) * 100) / 100));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(MIN_ZOOM, Math.round((prev - ZOOM_STEP) * 100) / 100));
  }, []);

  const handleZoomReset = useCallback(() => setZoom(1), []);

  const handleDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setTotalPages(numPages);
      pagesRenderedRef.current = 0;
      pagesReadyNotifiedRef.current = false;
      onLoadSuccess?.(numPages);
      onLoad?.(numPages);
    },
    [onLoadSuccess, onLoad]
  );

  const handlePageRenderSuccess = useCallback(() => {
    if (totalPages === 0) return;
    pagesRenderedRef.current += 1;
    if (!pagesReadyNotifiedRef.current && pagesRenderedRef.current >= totalPages) {
      pagesReadyNotifiedRef.current = true;
      onAllPagesRendered?.(totalPages);
    }
  }, [totalPages, onAllPagesRendered]);

  const pageWidth = Math.min(PDF_BASE_WIDTH * zoom, availableWidth);

  const handleAddSignature = useCallback(async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      stableShowToast("Please draw your signature", "warning");
      return;
    }
    if (!hasSignatureTargets) {
      stableShowToast("Signature positions not set", "error");
      return;
    }
    if (!currentPdfBlob) {
      stableShowToast("PDF not loaded yet", "error");
      return;
    }

    // console.groupCollapsed("[handleAddSignature] Placement inputs");
    // console.table(
    //   signatureTargets.map((target, index) => ({
    //     index,
    //     type: target.type ?? "SIGNATURE",
    //     page: target.page,
    //     x: target.x,
    //     y: target.y,
    //     width: target.width,
    //     height: target.height,
    //   }))
    // );
    const metadataRows = (Object.keys(metadataTargets) as MetadataFieldType[]).flatMap((key) =>
      metadataTargets[key].map((target, index) => ({
        field: key,
        index,
        page: target.page,
        x: target.x,
        y: target.y,
        width: target.width,
        height: target.height,
      }))
    );
    if (metadataRows.length > 0) {
      console.table(metadataRows);
    } else {
      console.log("[handleAddSignature] No metadata coordinate targets available");
    }
    console.groupEnd();

    try {
      saveToHistory();
      const pdfBytes = await currentPdfBlob.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const signaturePages = signatureTargets.map((target) => {
        const desiredIndex = target.page >= 1 ? target.page - 1 : target.page;
        const page = pages[desiredIndex];
        if (!page) {
          throw new Error(`Invalid signature page index ${target.page}`);
        }
        return { target, page };
      });
      const signatureData = sigRef.current.toDataURL("image/png");
      const embeddedImage = await pdfDoc.embedPng(signatureData);
      const signatureDrawLog: Array<{
        type: ElementPosition["type"];
        page: number;
        x: number;
        y: number;
        width?: number;
        height?: number;
        renderedWidth: number;
        renderedHeight: number;
      }> = [];
      signaturePages.forEach(({ target, page }) => {
        const scaled = embeddedImage.scaleToFit(
          target.width ?? SIGNATURE_DEFAULT_WIDTH,
          target.height ?? SIGNATURE_DEFAULT_HEIGHT
        );

        page.drawImage(embeddedImage, {
          x: target.x,
          y: target.y,
          width: scaled.width,
          height: scaled.height,
        });
        signatureDrawLog.push({
          type: target.type ?? "SIGNATURE",
          page: target.page,
          x: target.x,
          y: target.y,
          width: target.width,
          height: target.height,
          renderedWidth: scaled.width,
          renderedHeight: scaled.height,
        });
      });
      // console.groupCollapsed("[handleAddSignature] Signature draw details");
      // console.table(signatureDrawLog);
      // console.groupEnd();

      const dateLabel = dayjs().format("MM/DD/YYYY");
      const trimmedName = signerName?.trim();
      const trimmedEmail = signerEmail?.trim();
      const shouldAutoName = showSignerName && !!trimmedName;
      const shouldAutoEmail = showSignerEmail && !!trimmedEmail;
      const shouldAutoDate = showSigningDate;
      const shouldRenderAutoMetadata =
        hasSignatureTargets && (shouldAutoName || shouldAutoEmail || shouldAutoDate);
      const dateLine = shouldAutoDate ? dateLabel : undefined;

      let placedMetadataViaCoordinates = false;
      if (shouldRenderAutoMetadata) {
        const placements: Array<{ type: MetadataFieldType; enabled: boolean; text?: string }> = [
          { type: "NAME", enabled: shouldAutoName, text: trimmedName },
          { type: "EMAIL", enabled: shouldAutoEmail, text: trimmedEmail },
          { type: "DATE", enabled: shouldAutoDate, text: dateLine },
        ];
        const metadataDrawLog: Array<{
          field: MetadataFieldType;
          targetIndex: number;
          page: number;
          x: number;
          y: number;
          width?: number;
          height?: number;
          text?: string;
        }> = [];
        placements.forEach(({ type, enabled, text }) => {
          if (!enabled || !text) return;
          const targets = metadataTargets[type];
          if (!targets || targets.length === 0) return;
          targets.forEach((target, index) => {
            drawTextAtPosition(pages, text, target);
            metadataDrawLog.push({
              field: type,
              targetIndex: index,
              page: target.page,
              x: target.x,
              y: target.y,
              width: target.width,
              height: target.height,
              text,
            });
          });
          placedMetadataViaCoordinates = true;
        });
        // if (metadataDrawLog.length > 0) {
        //   console.groupCollapsed("[handleAddSignature] Metadata draw details");
        //   console.table(metadataDrawLog);
        //   console.groupEnd();
        // }
      }

      if (shouldRenderAutoMetadata && !placedMetadataViaCoordinates) {
        console.log(
          "[handleAddSignature] Falling back to metadata block drawing under signature targets"
        );
        signaturePages.forEach(({ target, page }) => {
          drawFallbackMetadataBlock(page, target, {
            signerName: shouldAutoName ? trimmedName : undefined,
            signerEmail: shouldAutoEmail ? trimmedEmail : undefined,
            dateLabel: dateLine,
          });
        });
      }

      const updatedBytes = await pdfDoc.save();
      const updatedBlob = new Blob([updatedBytes as BlobPart], { type: "application/pdf" });
      applyBlob(updatedBlob);
      sigRef.current.clear();
      setHasSignature(true);
      stableShowToast("Signature added!", "success");
    } catch (err: any) {
      stableShowToast(err?.message || "Failed to add signature", "error");
      console.error(err);
    }
  }, [
    currentPdfBlob,
    signatureTargets,
    hasSignatureTargets,
    signerName,
    signerEmail,
    showSignerName,
    showSignerEmail,
    showSigningDate,
    metadataTargets,
    applyBlob,
    saveToHistory,
    stableShowToast,
  ]);

  const handleSubmit = useCallback(async () => {
    if (!modifiedPdfBlob) {
      stableShowToast("Please add your signature before submitting", "warning");
      return;
    }

    if (!signConfig?.endpoint && !sessionTokenRef.current && !activeDocumentId) {
      stableShowToast("No submission endpoint configured", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const metadata: SubmissionMetadata = {
        documentId: activeDocumentId,
        documentName,
        signerName,
        signerEmail,
        // customText: customText?.trim() || undefined,
      };

      let response: any;
      if (!signConfig?.endpoint && sessionTokenRef.current) {
        const signedPdfBase64 = await blobToBase64(modifiedPdfBlob);
        response = await submitSignedPdfToSession({
          sessionToken: sessionTokenRef.current,
          signedPdfBase64,
          fetchConfig,
          signConfig,
          metadata,
        });
      } else { // NEVER REACHES.
        response = await submitSignedPdfToDocument({
          documentId: activeDocumentId,
          blob: modifiedPdfBlob,
          fetchConfig,
          signConfig,
          metadata,
        });
      }

      onSuccess?.(response);
      stableShowToast("Document signed successfully", "success");
    } catch (err: any) {
      const message = err?.message || "Submit failed";
      onError?.(err);
      stableShowToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    modifiedPdfBlob,
    documentName,
    signerName,
    signerEmail,
    // customText,
    signConfig,
    fetchConfig,
    activeDocumentId,
    onSuccess,
    onError,
    stableShowToast,
  ]);

  const handleReset = useCallback(() => {
    if (!originalPdfBlob) return;
    applyBlob(originalPdfBlob, { isOriginal: true });
    sigRef.current?.clear();
    stableShowToast("Document reset", "info");
    setHasSignature(false);
  }, [originalPdfBlob, applyBlob, stableShowToast, setHasSignature]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-20 ${className}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-700 font-medium">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border-2 border-red-200 rounded-lg p-6 ${className}`}>
        <h3 className="text-red-800 font-semibold mb-2">Error</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }
  return (
    <div className={`pdf-editor-container ${className}`}>
      {pdfUrl && (
        <div ref={containerRef} className="space-y-6 px-4 pb-6 sm:px-6 lg:px-8">
          <div className="space-y-6" style={{ touchAction: "pan-y pinch-zoom" }}>
            <Document
              key={`${pdfUrl}-${renderNonce}`}
              file={pdfUrl}
              onLoadSuccess={handleDocumentLoadSuccess}
              onLoadError={onLoadError}
            >
              {Array.from({ length: totalPages }, (_, index) => (
                <div
                  key={`page_${index + 1}`}
                  className="flex justify-center px-1 sm:px-3 lg:px-6 "
                >
                  <div className="mb-6 w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
                    <Page
                      pageNumber={index + 1}
                      width={pageWidth}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                      onRenderSuccess={handlePageRenderSuccess}
                    />
                  </div>
                </div>
              ))}
            </Document>
          </div>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-slate-900">Signature Pad</h3>
                <p className="text-sm text-slate-500">Draw inside the box.</p>
              </div>
              {hasSignature && <span className="text-xs font-semibold uppercase text-emerald-600">Signature placed</span>}
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 sm:p-4">
              <SignatureCanvas ref={sigRef} canvasProps={{ className: "h-40 w-full bg-transparent sm:h-48" }} clearOnResize={false} />
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => sigRef.current?.clear()}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Clear Pad
              </button>
              <button
                type="button"
                onClick={handleAddSignature}
                disabled={!hasSignatureTargets || !!hasSignature}
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
                title={hasSignature ? "Undo the existing signature to add a new one." : undefined}
              >
                Place Signature
              </button>
            </div>
          </section>

          <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            {!hasSignatureTargets && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                ERROR.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {(modifiedPdfBlob || pdfHistory.length > 0) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                >
                  {resetButtonText}
                </button>
              )}
              {showCancelButton && onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !modifiedPdfBlob}
                className="ml-auto rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : submitButtonText}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
export default function PDFSignatureEditor(props: PDFSignatureEditorProps) {
  // console.log("component Loaded")
  return (
    <ToastProvider>
      <PDFSignatureEditorInner {...props} />
    </ToastProvider>
  );
}

export { PDFSignatureEditor };
