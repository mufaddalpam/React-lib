import './index.css';

// Signature Component
export { Signature } from './Button';
export type { SignatureProps } from './Button';

// PDF Signature Editor Component
export { default as PDFSignatureEditor } from './PDFSignatureEditor';
export { PDFSignatureEditor as PDFSigner } from './PDFSignatureEditor';
export type { PDFSignatureEditorProps } from './PDFSignatureEditor';

// Toast Context (for custom usage)
export { ToastProvider, useToast } from './contexts/ToastContext';
export type { ToastType } from './contexts/ToastContext';

// Default export (Signature component for backward compatibility)
export { Signature as default } from './Button';
