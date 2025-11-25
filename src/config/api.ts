/**
 * Centralized API configuration used by the PDF signature components.
 * Adjust `API_BASE_URL` if you need to point the library at a different backend.
 */

export const API_BASE_URL = "https://docu-sign.onrender.com"; // process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  SEND_OTP: `${API_BASE_URL}/api/auth/send-otp`,
  VERIFY_OTP: `${API_BASE_URL}/api/auth/verify-otp`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,
  ME: `${API_BASE_URL}/api/auth/me`,

  // Documents
  DOCUMENT_VIEW: (id: string) => `${API_BASE_URL}/api/documents/${id}/view`,
  DOCUMENT_SIGN: (id: string) => `${API_BASE_URL}/api/documents/${id}/sign`,
  DOCUMENTS: `${API_BASE_URL}/api/documents`,
  DOCUMENTS_CREATE: `${API_BASE_URL}/api/documents`, //POST
  DOCUMENTS_VIEW: (id: string) => `${API_BASE_URL}/api/documents/${id}`,
  DOCUMENTS_UPDATE_STATUS: (id: string) => `${API_BASE_URL}/api/documents/${id}/status`,

  // Templates
  TEMPLATES: `${API_BASE_URL}/api/templates`,
  TEMPLATES_UPLOAD: `${API_BASE_URL}/api/templates`,
  TEMPLATE_VIEW: (id: string) => `${API_BASE_URL}/api/templates/${id}`,
  TEMPLATES_STATS: `${API_BASE_URL}/api/templates/data`,

  // Sessions
  SESSIONS_CREATE: `${API_BASE_URL}/api/sessions`,
  SESSIONS_PUBLIC_GET: (token: string) => `${API_BASE_URL}/api/sessions/public/${token}`,
  SESSIONS_PUBLIC_SIGN: (token: string) => `${API_BASE_URL}/api/sessions/public/${token}/sign`,

  //cordinates
  ALL_COORDINATES: (templateId: string) => `${API_BASE_URL}/api/coordinates/all/${templateId}`, //GET ALL COORDINATES FOR A TEMPLATEID
};

export default API_BASE_URL;
