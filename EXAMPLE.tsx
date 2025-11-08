/**
 * PDFSignatureEditor - Usage Examples
 *
 * This file contains practical examples of how to use the PDFSignatureEditor component
 * in different scenarios.
 */

import { PDFSignatureEditor } from 'react-lib';
import 'react-lib/dist/style.css';

// ========================================
// Example 1: Basic Usage
// ========================================

export function BasicExample() {
  return (
    <PDFSignatureEditor
      pdfUrl="/documents/contract.pdf"
      documentName="Employment Contract"
      onSubmit={(blob, name) => {
        console.log('Signed PDF received:', blob);
        console.log('Document name:', name);
      }}
    />
  );
}

// ========================================
// Example 2: With Pre-filled User Data
// ========================================

export function PrefilledExample() {
  return (
    <PDFSignatureEditor
      pdfUrl="/documents/agreement.pdf"
      documentName="User Agreement"
      signerName="John Doe"
      signerEmail="john.doe@example.com"
      onSubmit={(blob) => {
        console.log('User signed the agreement:', blob);
      }}
    />
  );
}

// ========================================
// Example 3: Download Signed PDF Locally
// ========================================

export function DownloadExample() {
  const handleSubmit = (signedPdfBlob: Blob, documentName: string) => {
    // Create download link
    const url = URL.createObjectURL(signedPdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentName}_signed.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert('Signed document downloaded!');
  };

  return (
    <PDFSignatureEditor
      pdfUrl="/documents/form.pdf"
      documentName="Application Form"
      onSubmit={handleSubmit}
      submitButtonText="Download Signed PDF"
    />
  );
}

// ========================================
// Example 4: Upload to Backend API
// ========================================

export function ApiUploadExample() {
  const handleSubmit = async (signedPdfBlob: Blob, documentName: string) => {
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', signedPdfBlob, `${documentName}_signed.pdf`);
      formData.append('documentName', documentName);
      formData.append('timestamp', new Date().toISOString());

      // Upload to backend
      const response = await fetch('https://api.example.com/documents/sign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        alert('Document submitted successfully!');
        window.location.href = '/dashboard';
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit document. Please try again.');
    }
  };

  return (
    <PDFSignatureEditor
      pdfUrl="https://api.example.com/documents/123/view"
      documentName="Contract 2025"
      onSubmit={handleSubmit}
      submitButtonText="Sign & Submit"
    />
  );
}

// ========================================
// Example 5: With Cancel Handler
// ========================================

export function WithCancelExample() {
  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? All changes will be lost.')) {
      window.location.href = '/documents';
    }
  };

  const handleSubmit = (blob: Blob) => {
    console.log('Document signed:', blob);
  };

  return (
    <PDFSignatureEditor
      pdfUrl="/documents/important.pdf"
      documentName="Important Document"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      showCancelButton={true}
    />
  );
}

// ========================================
// Example 6: Loading PDF from Base64
// ========================================

export function Base64Example() {
  const base64Data = "JVBERi0xLjQKJeLjz9MK..."; // Your base64 PDF string

  return (
    <PDFSignatureEditor
      pdfData={base64Data}
      documentName="Base64 Document"
      onSubmit={(blob) => {
        console.log('Signed PDF from base64:', blob);
      }}
    />
  );
}

// ========================================
// Example 7: With Load Callbacks
// ========================================

export function WithCallbacksExample() {
  const handleLoadSuccess = (numPages: number) => {
    console.log(`PDF loaded successfully with ${numPages} pages`);
  };

  const handleLoadError = (error: Error) => {
    console.error('Failed to load PDF:', error);
    alert('Could not load the document. Please try again.');
  };

  const handleSubmit = (blob: Blob) => {
    console.log('Document signed successfully');
  };

  return (
    <PDFSignatureEditor
      pdfUrl="/documents/contract.pdf"
      documentName="Contract"
      onLoadSuccess={handleLoadSuccess}
      onLoadError={handleLoadError}
      onSubmit={handleSubmit}
    />
  );
}

// ========================================
// Example 8: Custom Button Text & Configuration
// ========================================

export function CustomizedExample() {
  return (
    <PDFSignatureEditor
      pdfUrl="/documents/proposal.pdf"
      documentName="Project Proposal"
      signerName="Jane Smith"
      signerEmail="jane@company.com"
      submitButtonText="Approve & Sign Proposal"
      resetButtonText="Clear All Signatures"
      enableCustomText={true}
      enableUndo={true}
      showCancelButton={true}
      className="my-custom-pdf-editor"
      onSubmit={(blob) => console.log('Proposal signed:', blob)}
      onCancel={() => console.log('User cancelled')}
    />
  );
}

// ========================================
// Example 9: Secure Document Workflow
// ========================================

import { useEffect, useState } from 'react';

export function SecureWorkflowExample({ documentId }: { documentId: string }) {
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSecureDocument = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`https://api.example.com/documents/${documentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load document');
        }

        const data = await response.json();
        setPdfData(data.base64Pdf);
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadSecureDocument();
  }, [documentId]);

  const handleSubmit = async (signedPdfBlob: Blob) => {
    const formData = new FormData();
    formData.append('signedPdf', signedPdfBlob);

    const token = localStorage.getItem('authToken');

    const response = await fetch(`https://api.example.com/documents/${documentId}/sign`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (response.ok) {
      alert('Document signed and submitted successfully!');
      window.location.href = '/documents';
    } else {
      alert('Failed to submit signed document');
    }
  };

  if (loading) return <div>Loading secure document...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!pdfData) return <div>No document found</div>;

  return (
    <PDFSignatureEditor
      pdfData={pdfData}
      documentName={`Document-${documentId}`}
      onSubmit={handleSubmit}
      submitButtonText="Sign & Submit Securely"
    />
  );
}

// ========================================
// Example 10: Multi-Document Signing Flow
// ========================================

export function MultiDocumentExample() {
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [signedDocuments, setSignedDocuments] = useState<Blob[]>([]);

  const documents = [
    { id: 1, url: '/docs/contract-part-1.pdf', name: 'Contract Part 1' },
    { id: 2, url: '/docs/contract-part-2.pdf', name: 'Contract Part 2' },
    { id: 3, url: '/docs/contract-part-3.pdf', name: 'Contract Part 3' },
  ];

  const currentDoc = documents[currentDocIndex];

  const handleSubmit = (blob: Blob) => {
    // Save signed document
    const newSigned = [...signedDocuments, blob];
    setSignedDocuments(newSigned);

    // Move to next document or finish
    if (currentDocIndex < documents.length - 1) {
      setCurrentDocIndex(currentDocIndex + 1);
      alert(`Document ${currentDocIndex + 1} signed! Moving to next document...`);
    } else {
      alert('All documents signed successfully!');
      console.log('All signed PDFs:', newSigned);
      // Upload all signed documents
    }
  };

  return (
    <div>
      <div style={{ padding: '20px', background: '#f0f0f0' }}>
        <h2>Signing Progress: {currentDocIndex + 1} of {documents.length}</h2>
        <progress value={currentDocIndex + 1} max={documents.length} />
      </div>

      <PDFSignatureEditor
        key={currentDoc.id}
        pdfUrl={currentDoc.url}
        documentName={currentDoc.name}
        onSubmit={handleSubmit}
        submitButtonText={
          currentDocIndex < documents.length - 1
            ? 'Sign & Continue to Next'
            : 'Sign & Finish'
        }
      />
    </div>
  );
}

// ========================================
// How to use these examples in your app
// ========================================

/**
 * In your main app file:
 *
 * import { BasicExample, ApiUploadExample } from './examples/PDFSignatureExamples';
 *
 * function App() {
 *   return (
 *     <div>
 *       <h1>PDF Signing App</h1>
 *       <BasicExample />
 *       // or
 *       <ApiUploadExample />
 *       // or any other example
 *     </div>
 *   );
 * }
 */
