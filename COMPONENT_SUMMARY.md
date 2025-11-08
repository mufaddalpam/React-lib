# PDFSignatureEditor Component - Quick Reference

## 🎯 What Was Created

A fully independent, reusable PDF signature component extracted from `PDFSigningApp.tsx` that can be used in any React project.

## 📦 Files Created

1. **`src/PDFSignatureEditor.tsx`** - Main component (independent, library-ready)
2. **`src/contexts/ToastContext.tsx`** - Built-in toast notification system
3. **`PDF_SIGNATURE_EDITOR_USAGE.md`** - Complete documentation
4. **Updated `src/index.ts`** - Library exports
5. **Updated `package.json`** - Added dependencies

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Import and Use

```tsx
import { PDFSignatureEditor } from 'react-lib';
import 'react-lib/dist/style.css';

function App() {
  return (
    <PDFSignatureEditor
      pdfUrl="/path/to/document.pdf"
      documentName="Contract"
      onSubmit={(blob, name) => {
        console.log('Signed PDF:', blob);
        // Upload to your backend or download
      }}
    />
  );
}
```

## 🎨 Key Features

✅ **Fully Independent** - No external dependencies on your app's API or context
✅ **UI Only** - All backend calls are commented out with examples
✅ **Built-in Toast** - Simple notification system included
✅ **Callback Props** - `onSubmit`, `onCancel`, `onLoadSuccess`, `onLoadError`
✅ **Tailwind Styled** - Uses Tailwind CSS classes
✅ **TypeScript** - Full type definitions included
✅ **Drag & Drop** - Position signatures and text anywhere
✅ **Multi-page Support** - Navigate through PDF pages
✅ **Undo/Redo** - Full history management

## 📋 Props Overview

```tsx
interface PDFSignatureEditorProps {
  // Data sources
  pdfData?: string;              // Base64 PDF (priority over pdfUrl)
  pdfUrl?: string;               // URL to PDF

  // Pre-fill data
  documentName?: string;         // Default: "document"
  signerName?: string;           // Default: ""
  signerEmail?: string;          // Default: ""

  // Callbacks
  onSubmit?: (blob: Blob, name: string) => void | Promise<void>;
  onCancel?: () => void;
  onLoadSuccess?: (numPages: number) => void;
  onLoadError?: (error: Error) => void;

  // Customization
  className?: string;
  enableCustomText?: boolean;    // Default: true
  enableUndo?: boolean;          // Default: true
  submitButtonText?: string;     // Default: "Submit Document"
  resetButtonText?: string;      // Default: "Reset Document"
  showCancelButton?: boolean;    // Default: false
}
```

## 🔧 Backend Integration

### Loading PDF

```tsx
// Option 1: Direct URL
<PDFSignatureEditor pdfUrl="/api/documents/123/view" />

// Option 2: Base64 data
<PDFSignatureEditor pdfData={base64String} />
```

### Submitting Signed PDF

```tsx
const handleSubmit = async (signedPdfBlob, documentName) => {
  const formData = new FormData();
  formData.append('file', signedPdfBlob, `${documentName}_signed.pdf`);

  await fetch('/api/documents/sign', {
    method: 'POST',
    body: formData,
  });
};

<PDFSignatureEditor onSubmit={handleSubmit} />
```

## 📚 API Call Examples (Commented in Code)

The component includes commented-out API call examples:

### 1. Loading PDF from Backend
Located in: `PDFSignatureEditor.tsx:148-167`

```tsx
/* COMMENTED OUT - API CALL
const response = await fetch(pdfUrl, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
*/
```

### 2. Submitting Signed Document
Located in: `PDFSignatureEditor.tsx:437-471`

```tsx
/* COMMENTED OUT - API CALL EXAMPLE
const formData = new FormData();
formData.append("signedPdf", signedPdfBlob, `${documentName}_signed.pdf`);

const response = await fetch('/api/documents/sign', {
  method: "POST",
  body: formData,
});
*/
```

## 📤 Export Methods

```tsx
// Method 1: Named export (recommended)
import { PDFSignatureEditor } from 'react-lib';

// Method 2: Alternative name
import { PDFSigner } from 'react-lib';

// Method 3: Default import
import PDFSignatureEditor from 'react-lib/PDFSignatureEditor';

// Types
import type { PDFSignatureEditorProps } from 'react-lib';
```

## 🎯 Next Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the library:**
   ```bash
   npm run build
   ```

3. **Test in another project:**
   ```bash
   # In another project
   npm install /path/to/react-lib
   ```

4. **Implement backend callbacks:**
   - Add your API logic in `onSubmit`
   - Handle PDF loading with `pdfUrl` or `pdfData`

5. **Customize as needed:**
   - Modify props for your use case
   - Style with Tailwind classes
   - Add custom validation

## 🔍 Differences from Original

| Original (`PDFSigningApp.tsx`) | New (`PDFSignatureEditor.tsx`) |
|-------------------------------|--------------------------------|
| Hardcoded API endpoints | Callback props |
| External context dependencies | Built-in toast context |
| LocalStorage for user data | Props for user data |
| App-specific routing | Generic callbacks |
| Fixed document ID | Flexible data sources |

## 🐛 Debugging

### Console Logs Included

The component includes helpful console.logs:
- `📥 Loading PDF from...` - PDF loading
- `🖊️ Embedding signature at...` - Signature placement
- `📏 Coordinates:` - Position calculations
- `✅ Signature embedded!` - Success messages
- `❌ Failed to...` - Error messages

### Enable verbose logging:

Check browser console for detailed logs during development.

## 📖 Full Documentation

See [PDF_SIGNATURE_EDITOR_USAGE.md](./PDF_SIGNATURE_EDITOR_USAGE.md) for:
- Detailed prop explanations
- Advanced examples
- API integration guide
- TypeScript usage
- Troubleshooting

## 🎉 Done!

Your component is ready to be used as a library component in other projects!
