# @mufaddalpam/pdf-signature-editor

A modern React component library with signature and PDF editing capabilities.

## 📦 Components

### 1. Signature Component
Simple signature drawing component using canvas.

### 2. PDFSignatureEditor Component
Full-featured PDF signature editor with drag-and-drop, text fields, and undo support.

## 🚀 Installation

```bash
npm install @mufaddalpam/pdf-signature-editor
```

## 📖 Quick Start
### PDFSignatureEditor Component

```tsx
import { PDFSignatureEditor } from '@mufaddalpam/pdf-signature-editor';
import '@mufaddalpam/pdf-signature-editor/dist/styles.css';

function App() {
  return (
    <PDFSignatureEditor
          pdfUrl="/pdf2.pdf"
          documentName="signed-document.pdf"
          signerName="John Doe"
          signerEmail="john@example.com"
          signaturePosition={{ x: 400, y: 10, page: 0 }}
          namePosition={{ x: 100, y: 600, page: 0 }}
          emailPosition={{ x: 100, y: 650, page: 0 }}
          datePosition={{ x: 400, y: 600, page: 0 }}
          onSubmit={handleSubmit}
          onCancel={() => setShowEditor(false)}
          onLoadSuccess={(numPages) => console.log(`PDF loaded, ${numPages} pages`)}
          onLoadError={(error) => console.error('Failed to load PDF:', error)}
          enableCustomText={true}
          enableUndo={true}
          showCancelButton={true}
          submitButtonText="Sign & Download"
          resetButtonText="Start Over"
        />
  );
}
```


## ✨ Features

### PDFSignatureEditor Features

- ✅ PDF viewing and multi-page navigation
- ✅ Draw and place signatures with drag-and-drop
- ✅ Add text fields (name, email, date, custom text)
- ✅ Full undo/redo support
- ✅ Built-in toast notifications
- ✅ TypeScript support
- ✅ API-ready with callback props
- ✅ Tailwind CSS styling

## 📦 Package Exports

```tsx
// Signature Component
import { Signature, SignatureProps } from '@mufaddalpam/pdf-signature-editor';

// PDF Signature Editor Component
import { PDFSignatureEditor, PDFSignatureEditorProps } from '@mufaddalpam/pdf-signature-editor';

// Styles
import '@mufaddalpam/pdf-signature-editor/dist/styles.css';
```

## 🎯 Use Cases

### PDFSignatureEditor Use Cases

1. **Contract Signing** - Digital contract signatures
2. **Document Approval** - Approval workflows
3. **Form Completion** - PDF form filling and signing
4. **Legal Documents** - Legally binding signatures
5. **HR Documents** - Employee onboarding documents


## 🧪 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- IE11 not supported

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please see the documentation for component usage and examples.
