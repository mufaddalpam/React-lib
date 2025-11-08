# PDFSignatureEditor Component Documentation

A comprehensive, reusable React component for PDF signing with drag-and-drop signature placement, text field insertion, and full undo support.

## Table of Contents

- [Installation](#installation)
- [Features](#features)
- [Basic Usage](#basic-usage)
- [Props API](#props-api)
- [Advanced Examples](#advanced-examples)
- [API Integration Guide](#api-integration-guide)
- [Styling](#styling)
- [TypeScript Support](#typescript-support)

---

## Installation

First, install the library and its peer dependencies:

```bash
npm install react-lib react react-dom
```

The component automatically includes all required dependencies:
- `react-pdf` - PDF viewing
- `pdf-lib` - PDF manipulation
- `react-draggable` - Drag and drop functionality
- `react-signature-canvas` - Signature drawing
- `dayjs` - Date formatting

---

## Features

✅ **PDF Viewing** - Load PDFs from base64 data or URLs
✅ **Signature Drawing** - Draw signatures with canvas
✅ **Drag & Drop** - Position signatures and text fields anywhere on the PDF
✅ **Text Fields** - Add name, email, date, and custom text
✅ **Multi-page Support** - Navigate through multi-page documents
✅ **Undo/Redo** - Full history management
✅ **Built-in Toast Notifications** - User feedback for all actions
✅ **TypeScript Support** - Full type definitions included
✅ **Customizable** - Extensive props for customization
✅ **API Ready** - Callback props for backend integration

---

## Basic Usage

### 1. Import the Component

```tsx
import { PDFSignatureEditor } from 'react-lib';
import 'react-lib/dist/style.css';
```

### 2. Simple Example

```tsx
import { PDFSignatureEditor } from 'react-lib';
import 'react-lib/dist/style.css';

function App() {
  const handleSubmit = (signedPdfBlob, documentName) => {
    console.log('Signed PDF received:', signedPdfBlob);
    console.log('Document name:', documentName);

    // You can now upload the blob to your backend
    // or download it locally
  };

  return (
    <PDFSignatureEditor
      pdfUrl="/path/to/your/document.pdf"
      documentName="Contract Agreement"
      signerName="John Doe"
      signerEmail="john@example.com"
      onSubmit={handleSubmit}
    />
  );
}
```

### 3. Using Base64 PDF Data

```tsx
import { PDFSignatureEditor } from 'react-lib';
import 'react-lib/dist/style.css';

function App() {
  const base64PdfData = "JVBERi0xLjQKJeLjz9MKM..."; // Your base64 PDF data

  return (
    <PDFSignatureEditor
      pdfData={base64PdfData}
      documentName="Employment Contract"
      onSubmit={(blob) => console.log('Signed!', blob)}
    />
  );
}
```

---

## Props API

### Required Props

None! The component works with minimal configuration.

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pdfData` | `string` | `undefined` | Base64 encoded PDF data (takes precedence over `pdfUrl`) |
| `pdfUrl` | `string` | `undefined` | URL to load PDF from |
| `documentName` | `string` | `"document"` | Name of the document for display and download |
| `signerName` | `string` | `""` | Pre-filled signer name |
| `signerEmail` | `string` | `""` | Pre-filled signer email |
| `onSubmit` | `(blob: Blob, name: string) => void \| Promise<void>` | `undefined` | Callback when user submits the signed PDF |
| `onCancel` | `() => void` | `undefined` | Callback when user cancels or exits |
| `onLoadSuccess` | `(numPages: number) => void` | `undefined` | Callback when PDF is loaded successfully |
| `onLoadError` | `(error: Error) => void` | `undefined` | Callback when PDF load fails |
| `className` | `string` | `""` | Custom class name for the root container |
| `enableCustomText` | `boolean` | `true` | Enable/disable custom text field feature |
| `enableUndo` | `boolean` | `true` | Enable/disable undo functionality |
| `submitButtonText` | `string` | `"Submit Document"` | Custom submit button text |
| `resetButtonText` | `string` | `"Reset Document"` | Custom reset button text |
| `showCancelButton` | `boolean` | `false` | Show/hide the cancel button |

---

## Advanced Examples

### Example 1: Full-Featured Implementation

```tsx
import { PDFSignatureEditor } from 'react-lib';
import 'react-lib/dist/style.css';
import { useState } from 'react';

function DocumentSigningApp() {
  const [isLoading, setIsLoading] = useState(true);

  const handleSubmit = async (signedPdfBlob, documentName) => {
    // Create FormData for API upload
    const formData = new FormData();
    formData.append('file', signedPdfBlob, `${documentName}_signed.pdf`);
    formData.append('documentName', documentName);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        alert('Document submitted successfully!');
        window.location.href = '/dashboard';
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit document');
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? All changes will be lost.')) {
      window.location.href = '/documents';
    }
  };

  const handleLoadSuccess = (numPages) => {
    console.log(`PDF loaded with ${numPages} pages`);
    setIsLoading(false);
  };

  const handleLoadError = (error) => {
    console.error('Failed to load PDF:', error);
    alert('Could not load the document. Please try again.');
  };

  return (
    <div>
      {isLoading && <div>Loading document...</div>}

      <PDFSignatureEditor
        pdfUrl="/api/documents/123/view"
        documentName="Employment Contract 2025"
        signerName="Jane Smith"
        signerEmail="jane.smith@company.com"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onLoadSuccess={handleLoadSuccess}
        onLoadError={handleLoadError}
        showCancelButton={true}
        enableCustomText={true}
        enableUndo={true}
        submitButtonText="Sign & Submit Contract"
        resetButtonText="Clear All Changes"
        className="my-custom-class"
      />
    </div>
  );
}
```

### Example 2: Download Signed PDF Locally

```tsx
import { PDFSignatureEditor } from 'react-lib';
import 'react-lib/dist/style.css';

function OfflineSigningApp() {
  const handleSubmit = (signedPdfBlob, documentName) => {
    // Create a download link
    const url = URL.createObjectURL(signedPdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentName}_signed.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert('Signed document downloaded successfully!');
  };

  return (
    <PDFSignatureEditor
      pdfUrl="/documents/contract.pdf"
      documentName="Contract"
      onSubmit={handleSubmit}
      submitButtonText="Download Signed PDF"
    />
  );
}
```

### Example 3: With Custom Toast Notifications

```tsx
import { PDFSignatureEditor, ToastProvider } from 'react-lib';
import 'react-lib/dist/style.css';

// The component already includes ToastProvider internally,
// but you can wrap your entire app if you want to use toasts elsewhere

function App() {
  return (
    <ToastProvider>
      <div className="app">
        <header>My Document Signing App</header>

        <PDFSignatureEditor
          pdfUrl="/documents/agreement.pdf"
          documentName="User Agreement"
          onSubmit={(blob) => console.log('Signed:', blob)}
        />
      </div>
    </ToastProvider>
  );
}
```

### Example 4: Loading PDF from API with Authentication

```tsx
import { PDFSignatureEditor } from 'react-lib';
import 'react-lib/dist/style.css';
import { useEffect, useState } from 'react';

function SecureDocumentViewer({ documentId }) {
  const [pdfData, setPdfData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch PDF from secure API
    const loadPDF = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) throw new Error('Failed to load document');

        const data = await response.json();
        setPdfData(data.base64); // Assuming API returns { base64: "..." }
        setLoading(false);
      } catch (error) {
        console.error(error);
        alert('Failed to load document');
      }
    };

    loadPDF();
  }, [documentId]);

  if (loading) return <div>Loading secure document...</div>;

  return (
    <PDFSignatureEditor
      pdfData={pdfData}
      documentName={`Document-${documentId}`}
      onSubmit={async (blob) => {
        // Upload signed document back to server
        const formData = new FormData();
        formData.append('signedPdf', blob);

        await fetch(`/api/documents/${documentId}/sign`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        });
      }}
    />
  );
}
```

---

## API Integration Guide

The component is designed to work with any backend. Here's how to integrate it:

### Step 1: Loading PDF from Backend

```tsx
// Option A: Provide PDF URL directly (component will fetch)
<PDFSignatureEditor pdfUrl="https://api.example.com/documents/123/view" />

// Option B: Fetch yourself and provide base64 data
const [pdfData, setPdfData] = useState(null);

useEffect(() => {
  fetch('https://api.example.com/documents/123')
    .then(res => res.json())
    .then(data => setPdfData(data.base64));
}, []);

<PDFSignatureEditor pdfData={pdfData} />
```

### Step 2: Handling Submission

```tsx
const handleSubmit = async (signedPdfBlob, documentName) => {
  // Create FormData
  const formData = new FormData();
  formData.append('signedPdf', signedPdfBlob, `${documentName}_signed.pdf`);
  formData.append('documentId', '123');
  formData.append('signerEmail', 'user@example.com');
  formData.append('timestamp', new Date().toISOString());

  // Upload to your backend
  const response = await fetch('https://api.example.com/documents/sign', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${yourAuthToken}`,
      // Don't set Content-Type - browser will set it with boundary for FormData
    },
    body: formData,
  });

  const result = await response.json();

  if (result.success) {
    console.log('Document signed successfully!');
    // Redirect or show success message
  } else {
    console.error('Signing failed:', result.error);
  }
};

<PDFSignatureEditor
  pdfUrl="https://api.example.com/documents/123/view"
  onSubmit={handleSubmit}
/>
```

### Step 3: Backend API Example (Node.js/Express)

```javascript
// Example backend endpoint
app.post('/api/documents/sign', upload.single('signedPdf'), async (req, res) => {
  try {
    const { file } = req;
    const { documentId, signerEmail, timestamp } = req.body;

    // Save file to storage (S3, local disk, etc.)
    const fileUrl = await saveToStorage(file.buffer, file.originalname);

    // Update database
    await database.documents.update({
      where: { id: documentId },
      data: {
        signedPdfUrl: fileUrl,
        signedBy: signerEmail,
        signedAt: timestamp,
        status: 'signed',
      },
    });

    res.json({ success: true, fileUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## Styling

The component uses **Tailwind CSS** for styling. Make sure to:

1. **Include the CSS file:**
   ```tsx
   import 'react-lib/dist/style.css';
   ```

2. **If using Tailwind in your project**, the component's styles will automatically integrate.

3. **Custom styling via className prop:**
   ```tsx
   <PDFSignatureEditor
     className="my-custom-wrapper"
     pdfUrl="/document.pdf"
   />
   ```

4. **Override styles with CSS:**
   ```css
   .my-custom-wrapper {
     /* Your custom styles */
   }
   ```

---

## TypeScript Support

Full TypeScript support is included:

```tsx
import { PDFSignatureEditor, PDFSignatureEditorProps } from 'react-lib';

const props: PDFSignatureEditorProps = {
  pdfUrl: '/document.pdf',
  documentName: 'Contract',
  onSubmit: (blob: Blob, name: string) => {
    console.log('Signed:', blob, name);
  },
};

<PDFSignatureEditor {...props} />
```

### Type Exports

```tsx
import type {
  PDFSignatureEditorProps,
  ToastType,
} from 'react-lib';
```

---

## Component Behavior

### PDF Loading Priority

1. If `pdfData` prop is provided → uses it
2. Else if `pdfUrl` prop is provided → uses it
3. Else → shows error

### Signature Workflow

1. User clicks "Add Your Signature"
2. Signature canvas dialog opens
3. User draws signature
4. User clicks "Confirm"
5. Signature appears as draggable element on PDF
6. User positions signature
7. User clicks ✓ (checkmark) to embed
8. Signature is permanently added to PDF

### Text Field Workflow

1. User enters name/email in input fields
2. User clicks "Name" / "Email" / "Date" / "Text" button
3. Text appears as draggable element on PDF
4. User positions text
5. User clicks ✓ (checkmark) to embed
6. Text is permanently added to PDF

### Undo Functionality

- Each action (signature, text field) is saved to history
- User can undo last action with "Undo Last Action" button
- History is cleared on reset

---

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ⚠️ IE11 (not supported)

---

## Troubleshooting

### Issue: PDF Worker Error

**Error:** `Setting up fake worker failed`

**Solution:** The component automatically configures the PDF.js worker using jsdelivr CDN. If you have CSP (Content Security Policy) restrictions:

```tsx
import { pdfjs } from 'react-pdf';

// Set custom worker
pdfjs.GlobalWorkerOptions.workerSrc = '/path/to/pdf.worker.min.mjs';
```

### Issue: PDF Not Loading

**Check:**
1. Is the PDF URL accessible?
2. Is the base64 data valid?
3. Check browser console for errors
4. Use `onLoadError` callback to debug

### Issue: Signature Not Appearing

**Check:**
1. Did you draw on the canvas?
2. Did you click "Confirm"?
3. Is the signature placed within PDF bounds?

---

## Examples Repository

For more examples, check out the examples in the repository:

- Basic usage
- API integration
- Custom styling
- Multi-document workflow

---

## License

MIT

---

## Support

For issues, questions, or contributions, please visit the GitHub repository.
