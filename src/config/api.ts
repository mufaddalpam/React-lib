/**
 * API Configuration
 * This file is for the original PDFSigningApp.tsx compatibility
 */

export const API_ENDPOINTS = {
  DOCUMENT_VIEW: (documentId: string) => `/api/documents/${documentId}/view`,
  DOCUMENT_SIGN: (documentId: string) => `/api/documents/${documentId}/sign`,
};
