"use client";

import { useRef, useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { PDFDocument, rgb } from "pdf-lib";
import SignatureCanvas from "react-signature-canvas";
import dayjs from "dayjs";
import { ToastProvider, useToast } from "./contexts/ToastContext";
import "./PDFSignatureEditor.css";

// Configure PDF.js worker - use jsdelivr CDN (has proper CORS headers)
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

// Helper functions
function blobToURL(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function () {
      resolve(reader.result as string);
    };
  });
}

/** Position configuration for elements on PDF */
export interface ElementPosition {
  x: number;      // X coordinate in PDF points
  y: number;      // Y coordinate in PDF points
  page: number;   // Page number (0-indexed)
}

export interface PDFSignatureEditorProps {
  /** Base64 encoded PDF data (takes precedence over pdfUrl) */
  pdfData?: string;

  /** URL to load PDF from */
  pdfUrl?: string;

  /** Name of the document for display and download */
  documentName?: string;

  /** Pre-filled signer name */
  signerName?: string;

  /** Pre-filled signer email */
  signerEmail?: string;

  /** Fixed position for signature. If not provided, signature button will be disabled */
  signaturePosition?: ElementPosition;

  /** Fixed position for name field. If not provided, name button will be disabled */
  namePosition?: ElementPosition;

  /** Fixed position for email field. If not provided, email button will be disabled */
  emailPosition?: ElementPosition;

  /** Fixed position for date field. If not provided, date button will be disabled */
  datePosition?: ElementPosition;

  /** Fixed position for custom text field. If not provided, custom text button will be disabled */
  customTextPosition?: ElementPosition;

  /** Callback when user submits the signed PDF */
  onSubmit?: (signedPdfBlob: Blob, documentName: string) => void | Promise<void>;

  /** Enable drag-and-drop mode (alternative to fixed positions) */
  enableDragDrop?: boolean;

  /** Callback when user cancels or exits */
  onCancel?: () => void;

  /** Callback when PDF is loaded successfully */
  onLoadSuccess?: (numPages: number) => void;

  /** Callback when PDF load fails */
  onLoadError?: (error: Error) => void;

  /** Custom class name for the root container */
  className?: string;

  /** Enable/disable custom text field feature */
  enableCustomText?: boolean;

  /** Enable/disable undo functionality */
  enableUndo?: boolean;

  /** Custom submit button text */
  submitButtonText?: string;

  /** Custom reset button text */
  resetButtonText?: string;

  /** Show/hide the cancel button */
  showCancelButton?: boolean;
}

function PDFSignatureEditorInner({
  pdfData,
  pdfUrl,
  documentName = "document",
  signerName: initialSignerName = "",
  signerEmail: initialSignerEmail = "",
  signaturePosition,
  namePosition,
  emailPosition,
  datePosition,
  customTextPosition: customTextPositionProp,
  onSubmit,
  onCancel,
  onLoadSuccess,
  onLoadError,
  className = "",
  enableCustomText = true,
  enableUndo = true,
  submitButtonText = "Submit Document",
  resetButtonText = "Reset Document",
  showCancelButton = false,
  enableDragDrop = false,
}: PDFSignatureEditorProps) {
  const { showToast } = useToast();
  const [pdf, setPdf] = useState<string | null>(null);
  const [signatureDialogVisible, setSignatureDialogVisible] = useState(false);
  const [pageNum, setPageNum] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageDetails, setPageDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modifiedPdfBlob, setModifiedPdfBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History management for undo functionality
  const [pdfHistory, setPdfHistory] = useState<Array<{ pdf: string; blob: Blob | null }>>([]);
  const [originalPdf, setOriginalPdf] = useState<string | null>(null);

  // Text fields
  const [signerName, setSignerName] = useState(initialSignerName);
  const [signerEmail, setSignerEmail] = useState(initialSignerEmail);
  const [signingDate] = useState(dayjs().format("MM/DD/YYYY"));

  // Custom text field
  const [customTextDialogVisible, setCustomTextDialogVisible] = useState(false);
  const [customTextInput, setCustomTextInput] = useState("");

  const sigRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    console.log("PDFSignatureEditor mounted with props:", {
      pdfDataProvided: !!pdfData,
      pdfUrl,
      documentName,
      initialSignerName,
      initialSignerEmail,
      signaturePosition,
      namePosition,
      emailPosition,
      datePosition,
      customTextPosition: customTextPositionProp,
      enableDragDrop,
      enableCustomText,
      enableUndo,
    });
  }, []);

  // Helper to get current PDF as ArrayBuffer for modification
  const getCurrentPdfBuffer = async (): Promise<ArrayBuffer> => {
    if (!pdf) {
      throw new Error("PDF not loaded");
    }
    console.log("Fetching current PDF buffer for modification...");
    let pdfBuffer: ArrayBuffer;
    if (pdf.startsWith("data:")) {
      const base64 = pdf.split(",")[1];
      pdfBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;
      console.log("Converted data URL to buffer");
    } else {
      const response = await fetch(pdf);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF for modification: ${response.status}`);
      }
      pdfBuffer = await response.arrayBuffer();
      console.log("Fetched blob URL as buffer");
    }
    return pdfBuffer;
  };

  // Load PDF on mount
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        // Priority: pdfData > pdfUrl
        if (pdfData) {
          console.log("📥 Loading PDF from pdfData prop (base64)...");
          let dataUrl: string;
          if (pdfData.startsWith("data:")) {
            dataUrl = pdfData;
          } else {
            dataUrl = `data:application/pdf;base64,${pdfData}`;
          }
          setPdf(dataUrl);
          setOriginalPdf(dataUrl);
          console.log("✅ PDF loaded from pdfData");
        } else if (pdfUrl) {
          console.log("📥 Loading PDF from pdfUrl prop...");
          let url: string;
          if (pdfUrl.startsWith("blob:")) {
            url = pdfUrl;
          } else {
            const response = await fetch(pdfUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch PDF: ${response.status}`);
            }
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();

            // Validate PDF header
            const header = new Uint8Array(arrayBuffer.slice(0, 8));
            const headerText = new TextDecoder().decode(header);
            if (!headerText.startsWith("%PDF-")) {
              throw new Error("Invalid PDF format: Missing PDF header");
            }

            url = URL.createObjectURL(blob);
          }
          setPdf(url);
          setOriginalPdf(url);
          console.log("✅ PDF loaded and validated from pdfUrl");
        } else {
          throw new Error("No PDF data provided. Please provide either pdfData or pdfUrl prop.");
        }

        setLoading(false);
      } catch (err: any) {
        console.error("❌ Failed to load PDF:", err);
        setError(err.message || "Failed to load PDF");
        setLoading(false);
        onLoadError?.(err);
      }
    };

    loadPDF();
  }, [pdfData, pdfUrl, onLoadError]);

  // Save current state to history before making changes
  const saveToHistory = () => {
    if (pdf && enableUndo) {
      console.log("Saving current PDF state to history");
      setPdfHistory((prev) => [...prev, { pdf, blob: modifiedPdfBlob }]);
    }
  };

  // Undo last action
  const handleUndo = () => {
    if (pdfHistory.length === 0) {
      showToast("Nothing to undo", "info");
      return;
    }

    const lastState = pdfHistory[pdfHistory.length - 1];
    console.log("Undoing last action, restoring previous state");
    setPdf(lastState.pdf);
    setModifiedPdfBlob(lastState.blob);
    setPdfHistory((prev) => prev.slice(0, -1));
    showToast("Last action undone", "success");
  };

  const handleAddSignature = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      showToast("Please draw your signature", "warning");
      return;
    }

    if (!signaturePosition && !enableDragDrop) {
      showToast("Signature position not configured", "error");
      setSignatureDialogVisible(false);
      return;
    }

    const sigURL = sigRef.current.toDataURL();
    setSignatureDialogVisible(false);

    if (!pdf) {
      showToast("Please wait for PDF to load", "warning");
      return;
    }

    try {
      console.log("🖊️ Embedding signature at position:", signaturePosition);
      console.log("Signature data URL:", sigURL);

      const pdfBuffer = await getCurrentPdfBuffer();
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();

      const pageIndex = signaturePosition ? signaturePosition.page : 0;
      const targetPage = pages[pageIndex];
      if (!targetPage) {
        throw new Error(`Page ${pageIndex + 1} not found`);
      }

      // Convert signature data URL to PNG bytes
      const sigData = sigURL.split(",")[1];
      const sigBytes = Uint8Array.from(atob(sigData), (c) => c.charCodeAt(0));
      const pngImage = await pdfDoc.embedPng(sigBytes);

      // Fixed signature size
      // === SMART SIGNATURE + TEXT BLOCK WITH AUTO-POSITIONING ===
      const sigWidth = 130;
      const sigHeight = 65;
      const lineHeight = 10; // Space between lines
      const fontSize = 11.5;
      const leftPadding = 3; // Slight indent for text under signature

      const x = signaturePosition ? signaturePosition.x : 50;
      const y = signaturePosition ? signaturePosition.y : targetPage.getHeight() - 150;

      // Draw signature image
      targetPage.drawImage(pngImage, {
        x,
        y,
        width: sigWidth,
        height: sigHeight,
      });
      console.log("✅ Signature image drawn at", { x, y: y, bottomAt: y + sigHeight, page: pageIndex + 1 });

      // Start drawing text BELOW the signature → subtract from Y
      let currentY = y - sigHeight;  // Bottom of signature
      let linesAdded = 0;

      // 1. Email (if exists)
      if (signerEmail?.trim()) {
        targetPage.drawText(signerEmail.trim(), {
          x: x + leftPadding,
          y: currentY - lineHeight * (linesAdded + 1),  // ← GO DOWN
          size: fontSize,
          color: rgb(0.05, 0.05, 0.05),
        });
        console.log("✅ Email drawn at y:", currentY - lineHeight * (linesAdded + 1));
        linesAdded++;
      }

      // 2. Name (if exists)
      if (signerName?.trim()) {
        targetPage.drawText(signerName.trim(), {
          x: x + leftPadding,
          y: currentY - lineHeight * (linesAdded + 1),
          size: fontSize,
          color: rgb(0.05, 0.05, 0.05),
        });
        console.log("✅ Name drawn at y:", currentY - lineHeight * (linesAdded + 1));
        linesAdded++;
      }
      // 3. Date & Time (always)
      const fullDate = `Signed: ${dayjs().format("MMMM D, YYYY [at] h:mm A")}`;
      targetPage.drawText(fullDate, {
        x: x + leftPadding,
        y: currentY - lineHeight * (linesAdded + 1),
        size: fontSize - 0.5,
        color: rgb(0.35, 0.35, 0.35),
      });
      console.log("✅ Date drawn at y:", currentY - lineHeight * (linesAdded + 1));
      linesAdded++;

      console.log(`✅ Signature block complete: ${linesAdded} line(s) below signature`);

      const savedPdfBytes = await pdfDoc.save();
      const blob = new Blob([savedPdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = await blobToURL(blob);

      saveToHistory();
      setPdf(url);
      setModifiedPdfBlob(blob);

      console.log("✅ Signature embedded successfully");
      showToast("Signature added successfully!", "success");
    } catch (err: any) {
      console.error("❌ Failed to embed signature:", err);
      showToast("Failed to add signature", "error");
    }
  };

  // Handle text field embedding (Name, Email, Date) with fixed coordinates
  // const handleSetTextField = async (fieldType: "name" | "email" | "date") => {
  //   if (!pdf) {
  //     showToast("Please wait for PDF to load", "warning");
  //     return;
  //   }

  //   let position: ElementPosition | undefined;
  //   let fieldText: string;

  //   switch (fieldType) {
  //     case "name":
  //       if (!signerName) {
  //         showToast("Please enter your name", "warning");
  //         return;
  //       }
  //       if (!namePosition && !enableDragDrop) {
  //         showToast("Name position not configured", "error");
  //         return;
  //       }
  //       position = namePosition;
  //       fieldText = signerName;
  //       break;
  //     case "email":
  //       if (!signerEmail) {
  //         showToast("Please enter your email", "warning");
  //         return;
  //       }
  //       if (!emailPosition && !enableDragDrop) {
  //         showToast("Email position not configured", "error");
  //         return;
  //       }
  //       position = emailPosition;
  //       fieldText = signerEmail;
  //       break;
  //     case "date":
  //       if (!datePosition && !enableDragDrop) {
  //         showToast("Date position not configured", "error");
  //         return;
  //       }
  //       position = datePosition;
  //       fieldText = signingDate;
  //       break;
  //   }

  //   try {
  //     console.log(`🖊️ Embedding ${fieldType} field at position:`, position);

  //     const pdfBuffer = await getCurrentPdfBuffer();
  //     const pdfDoc = await PDFDocument.load(pdfBuffer);
  //     const pages = pdfDoc.getPages();

  //     const pageIndex = position ? position.page : 0;
  //     const targetPage = pages[pageIndex];
  //     if (!targetPage) {
  //       throw new Error(`Page ${pageIndex + 1} not found`);
  //     }

  //     const x = position ? position.x : 50;
  //     const y = position
  //       ? position.y
  //       : targetPage.getHeight() - 100 - (fieldType === "name" ? 0 : fieldType === "email" ? 20 : 40);

  //     console.log(`Embedding text "${fieldText}" at page ${pageIndex + 1}, x: ${x}, y: ${y}`);

  //     targetPage.drawText(fieldText, {
  //       x,
  //       y,
  //       size: 12,
  //       color: rgb(0, 0, 0),
  //     });

  //     const savedPdfBytes = await pdfDoc.save();
  //     const blob = new Blob([savedPdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  //     const url = await blobToURL(blob);

  //     saveToHistory();
  //     setPdf(url);
  //     setModifiedPdfBlob(blob);

  //     console.log(`✅ ${fieldType} field embedded successfully`);
  //     showToast(`${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} added successfully`, "success");
  //   } catch (err: any) {
  //     console.error(`❌ Failed to embed ${fieldType} field:`, err);
  //     showToast(`Failed to add ${fieldType} field`, "error");
  //   }
  // };

  // Handle custom text field embedding with fixed coordinates
  // const handleAddCustomText = async () => {
  //   if (!customTextInput.trim()) {
  //     showToast("Please enter some text", "warning");
  //     return;
  //   }

  //   if (!customTextPositionProp && !enableDragDrop) {
  //     showToast("Custom text position not configured", "error");
  //     return;
  //   }

  //   if (!pdf) {
  //     showToast("Please wait for PDF to load", "warning");
  //     return;
  //   }

  //   try {
  //     console.log("🖊️ Embedding custom text at position:", customTextPositionProp);

  //     const pdfBuffer = await getCurrentPdfBuffer();
  //     const pdfDoc = await PDFDocument.load(pdfBuffer);
  //     const pages = pdfDoc.getPages();

  //     const pageIndex = customTextPositionProp ? customTextPositionProp.page : 0;
  //     const targetPage = pages[pageIndex];
  //     if (!targetPage) {
  //       throw new Error(`Page ${pageIndex + 1} not found`);
  //     }

  //     const x = customTextPositionProp ? customTextPositionProp.x : 50;
  //     const y = customTextPositionProp ? customTextPositionProp.y : targetPage.getHeight() - 200;

  //     console.log(`Embedding custom text "${customTextInput}" at page ${pageIndex + 1}, x: ${x}, y: ${y}`);

  //     targetPage.drawText(customTextInput, {
  //       x,
  //       y,
  //       size: 12,
  //       color: rgb(0, 0, 0),
  //     });

  //     const savedPdfBytes = await pdfDoc.save();
  //     const blob = new Blob([savedPdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  //     const url = await blobToURL(blob);

  //     saveToHistory();
  //     setPdf(url);
  //     setModifiedPdfBlob(blob);
  //     setCustomTextInput("");
  //     setCustomTextDialogVisible(false);

  //     console.log("✅ Custom text embedded successfully");
  //     showToast("Custom text added successfully", "success");
  //   } catch (err: any) {
  //     console.error("❌ Failed to embed custom text:", err);
  //     showToast("Failed to add custom text", "error");
  //   }
  // };

  const handleSubmitSignedDocument = async () => {
    if (!modifiedPdfBlob) {
      showToast("Please add your signature first", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      console.log("📤 Submitting signed PDF to server...");

      if (onSubmit) {
        await onSubmit(modifiedPdfBlob, documentName);
      }
      else {
        // === DEFAULT: Send to your API ===
        const formData = new FormData();
        const filename = `${documentName}_signed_${dayjs().format("YYYYMMDD_HHmm")}.pdf`;
        formData.append("file", modifiedPdfBlob, filename);
        formData.append("documentName", documentName);
        formData.append("signerName", signerName);
        formData.append("signerEmail", signerEmail);
        const documentId = "f05f10ee-a9db-40a7-a63d-bfd7e65409ec";
        const backendURL = `http://localhost:5000/api/documents/${documentId}/sign`;
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZmI3ZDU0Yi01YzRlLTQyMmUtYmI1ZS1lOTFiODI5ZmMyNDIiLCJyb2xlIjoiU0lHTkVSIiwiaWF0IjoxNzYyNTk1NTAyLCJleHAiOjE3NjMyMDAzMDJ9.hL6EQmXwRxtS4JOc3S9-g2geCaO4EDrnYt-AYpj6P8I';
        const response = await fetch(backendURL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // Don't set Content-Type - let browser set it with boundary for FormData
          },
          body: formData,
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server error: ${response.status} ${errorText}`);
        }
        const result = await response.json();
        console.log("✅ PDF saved successfully:", result);
        showToast("Document saved successfully!", "success");

        console.log("✅ Document submission complete!");
        showToast("Document submitted successfully!", "success");
      }
    } catch (error: any) {
      console.error("❌ Failed to submit document:", error);
      showToast(`Failed to submit: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (originalPdf) {
      console.log("Resetting document to original state");
      setPdf(originalPdf);
      setModifiedPdfBlob(null);
      setPdfHistory([]);
      setPageNum(0);
      showToast("Document reset to original state", "info");
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-20 ${className}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-700 font-medium">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border-2 border-red-200 rounded-lg p-6 ${className}`}>
        <h3 className="text-red-800 font-semibold mb-2">Error Loading PDF</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className={`pdf-editor-container ${className}`}>
      {/* Signature Dialog */}
      {signatureDialogVisible && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setSignatureDialogVisible(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Add Signature</h2>
            <div className="border-2 border-blue-500 rounded-lg inline-block">
              <SignatureCanvas
                ref={sigRef}
                velocityFilterWeight={1}
                canvasProps={{
                  width: 600,
                  height: 200,
                  className: "sigCanvas",
                }}
              />
            </div>
            <div className="text-center text-blue-600 mt-2 text-sm">
              Draw your signature above
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => sigRef.current?.clear()} className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors">
                Clear
              </button>
              <button
                onClick={() => setSignatureDialogVisible(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button onClick={handleAddSignature} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Text Dialog */}
      {/* {customTextDialogVisible && enableCustomText && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setCustomTextDialogVisible(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Add Custom Text</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter your text:
              </label>
              <input
                type="text"
                value={customTextInput}
                onChange={(e) => setCustomTextInput(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type your text here..."
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCustomTextDialogVisible(false);
                  setCustomTextInput("");
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button onClick={handleAddCustomText} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                Add to Document
              </button>
            </div>
          </div>
        </div>
      )} */}

      {/* Two Column Layout: PDF Viewer (Left) + Controls Sidebar (Right) */}
      {pdf && (
        <div className="fixed inset-0 top-16">
          {/* Left Column - PDF Viewer */}
          <div className="pdf-viewer">
            <div className="h-full max-w-7xl mx-auto px-4 py-6">
              {/* Scrollable PDF area */}
              <div className="h-full overflow-y-auto overflow-x-hidden">
                <div
                  className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-white mx-auto shadow-lg"
                  style={{ maxWidth: 800 }}
                >
                  <Document
                    file={pdf}
                    onLoadSuccess={(data) => {
                      setTotalPages(data.numPages);
                      onLoadSuccess?.(data.numPages);
                      console.log("PDF loaded successfully with", data.numPages, "pages");
                    }}
                    onLoadError={(err) => {
                      console.error("PDF load error:", err);
                      onLoadError?.(err);
                    }}
                  >
                    <Page
                      pageNumber={pageNum + 1}
                      width={800}
                      onLoadSuccess={(data) => setPageDetails(data)}
                    />
                  </Document>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-6 pb-4">
                    <button
                      onClick={() => setPageNum(Math.max(0, pageNum - 1))}
                      disabled={pageNum === 0}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-gray-700">
                      Page {pageNum + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPageNum(Math.min(totalPages - 1, pageNum + 1))}
                      disabled={pageNum === totalPages - 1}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Controls Sidebar */}
          <div className="controls-sidebar">
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Document Tools</h3>
              </div>

              {/* Name and Email Input Fields */}
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Email
                  </label>
                  <input
                    type="email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Signature Button - Always show if enabled */}
              <button
                onClick={() => setSignatureDialogVisible(true)}
                disabled={!signaturePosition && !enableDragDrop}
                className="w-full flex items-center justify-center gap-3 py-4 px-4 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 rounded-lg transition-all shadow-sm mb-4 group disabled:opacity-50 disabled:cursor-not-allowed"
                title={(signaturePosition || enableDragDrop) ? "Add Signature" : "Signature position not configured"}
              >
                <svg className="w-12 h-12 flex-shrink-0 text-gray-700" viewBox="0 0 120 100" fill="none">
                  <path d="M15 55 Q25 45, 35 52 T55 48 Q65 45, 75 52 L85 58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
                  <g transform="translate(85, 30) rotate(45)">
                    <rect x="0" y="0" width="8" height="32" rx="1" fill="currentColor" opacity="0.95" />
                    <rect x="0" y="8" width="8" height="2" fill="currentColor" opacity="0.6" />
                    <path d="M 2 32 L 4 38 L 6 32 Z" fill="currentColor" opacity="0.95" />
                    <line x1="4" y1="38" x2="4" y2="42" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
                    <line x1="4" y1="38" x2="4" y2="32" stroke="white" strokeWidth="0.5" opacity="0.5" />
                  </g>
                </svg>
                <span className="text-base font-semibold text-gray-800 tracking-wide">Add Signature</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                {/* Text Field Buttons - Direct embedding with fixed coordinates */}
                {/* <button
                  onClick={() => handleSetTextField("name")}
                  disabled={!namePosition && !enableDragDrop}
                  className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                  title={(namePosition || enableDragDrop) ? "Add Name" : "Name position not configured"}
                >
                  <svg className="w-8 h-8 text-gray-600 group-hover:text-gray-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-xs font-medium text-gray-700">Name</span>
                </button>
                <button
                  onClick={() => handleSetTextField("email")}
                  disabled={!emailPosition && !enableDragDrop}
                  className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                  title={(emailPosition || enableDragDrop) ? "Add Email" : "Email position not configured"}
                >
                  <svg className="w-8 h-8 text-gray-600 group-hover:text-gray-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs font-medium text-gray-700">Email</span>
                </button>
                <button
                  onClick={() => handleSetTextField("date")}
                  disabled={!datePosition && !enableDragDrop}
                  className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                  title={(datePosition || enableDragDrop) ? "Add Date" : "Date position not configured"}
                >
                  <svg className="w-8 h-8 text-gray-600 group-hover:text-gray-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs font-medium text-gray-700">Date</span>
                </button>
                {enableCustomText && (
                  <button
                    onClick={() => setCustomTextDialogVisible(true)}
                    disabled={!customTextPositionProp && !enableDragDrop}
                    className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                    title={(customTextPositionProp || enableDragDrop) ? "Add Custom Text" : "Custom text position not configured"}
                  >
                    <svg className="w-8 h-8 text-gray-600 group-hover:text-gray-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="text-xs font-medium text-gray-700">Text</span>
                  </button>
                )} */}

                {/* Undo Button */}
                {enableUndo && pdfHistory.length > 0 && (
                  <button onClick={handleUndo} className="col-span-2 flex items-center justify-center gap-2 p-3 bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 rounded-lg transition-colors" title="Undo last action">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    <span className="text-sm font-medium text-amber-700">Undo Last Action</span>
                  </button>
                )}
              </div>
            </div>

            {/* Fixed Bottom Action Buttons */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-2">
              {/* Submit Button */}
              <button
                onClick={handleSubmitSignedDocument}
                disabled={isSubmitting || !modifiedPdfBlob}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{isSubmitting ? "Submitting..." : submitButtonText}</span>
              </button>

              {/* Cancel Button */}
              {showCancelButton && onCancel && (
                <button onClick={onCancel} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="font-medium">Cancel</span>
                </button>
              )}

              {/* Reset Button - Only show if there's something to reset */}
              {(modifiedPdfBlob || pdfHistory.length > 0) && (
                <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="font-medium">{resetButtonText}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper component with ToastProvider
export default function PDFSignatureEditor(props: PDFSignatureEditorProps) {
  return (
    <ToastProvider>
      <PDFSignatureEditorInner {...props} />
    </ToastProvider>
  );
}

// Named export
export { PDFSignatureEditor };