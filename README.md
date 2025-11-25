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
  async function getToken() {
    // throw new Error('Function not implemented.');
    return 'token';
  }
  return (
    <PDFSignatureEditor
							templateId="691f1720147e4400ca6f9b0b"
							documentName="Employment Agreement 202"
							signerName="mufaddal C"
							signerEmail="mufaddal12@example.com"
							showSignerName
							showSignerEmail
							showSigningDate
							onSuccess={handleSuccess}
							onAllPagesRendered={() => {
								const el = scrollRef.current;
								if (!el) return;

								// Scroll to bottom when all pages are rendered
								el.scrollTo({
									top: el.scrollHeight * 0.9,
									behavior: 'smooth',
								});
							}}
		/>
);}
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
