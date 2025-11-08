# PDFSignatureEditor - Fixed Coordinates Usage

## Overview

The PDFSignatureEditor component has been updated to use **fixed coordinates** instead of drag-and-drop positioning. This means signatures and text fields are placed at predetermined positions specified via props.

## Key Changes from Previous Version

### ✅ What Changed
- ❌ **Removed**: Drag-and-drop functionality
- ❌ **Removed**: `react-draggable` dependency
- ✅ **Added**: Fixed position props for all elements
- ✅ **Added**: `ElementPosition` interface for coordinate specification
- ✅ **Improved**: Automatic embedding on button click

### How It Works Now
1. Specify coordinates via props
2. Click the button (Name, Email, Date, Signature, Custom Text)
3. Element is **immediately embedded** at the fixed position
4. No dragging required!

---

## New Props Interface

### ElementPosition Type

```typescript
interface ElementPosition {
  x: number;      // X coordinate in PDF points
  y: number;      // Y coordinate in PDF points
  page: number;   // Page number (0-indexed)
}
```

### Position Props

```typescript
interface PDFSignatureEditorProps {
  // ... other props ...

  /** Fixed position for signature */
  signaturePosition?: ElementPosition;

  /** Fixed position for name field */
  namePosition?: ElementPosition;

  /** Fixed position for email field */
  emailPosition?: ElementPosition;

  /** Fixed position for date field */
  datePosition?: ElementPosition;

  /** Fixed position for custom text field */
  customTextPosition?: ElementPosition;
}
```

---

## Usage Examples

### Example 1: Basic Usage with Fixed Positions

```tsx
import { PDFSignatureEditor } from 'react-lib';
import 'react-lib/dist/style.css';

function App() {
  return (
    <PDFSignatureEditor
      pdfUrl="/documents/contract.pdf"
      documentName="Employment Contract"
      signerName="John Doe"
      signerEmail="john@example.com"

      // Fixed positions (PDF coordinates)
      signaturePosition={{ x: 100, y: 200, page: 0 }}
      namePosition={{ x: 100, y: 300, page: 0 }}
      emailPosition={{ x: 100, y: 350, page: 0 }}
      datePosition={{ x: 400, y: 350, page: 0 }}

      onSubmit={(blob, name) => {
        console.log('Signed PDF:', blob);
      }}
    />
  );
}
```

### Example 2: Multi-Page Document

```tsx
<PDFSignatureEditor
  pdfUrl="/documents/multi-page-contract.pdf"
  documentName="Multi-Page Agreement"

  // Signature on first page
  signaturePosition={{ x: 150, y: 100, page: 0 }}

  // Name on second page
  namePosition={{ x: 200, y: 500, page: 1 }}

  // Date on last page
  datePosition={{ x: 400, y: 100, page: 2 }}

  onSubmit={(blob) => console.log('Signed', blob)}
/>
```

### Example 3: Conditional Fields

```tsx
<PDFSignatureEditor
  pdfUrl="/documents/form.pdf"
  documentName="Application Form"

  // Only enable signature and name (email and date disabled)
  signaturePosition={{ x: 100, y: 200, page: 0 }}
  namePosition={{ x: 100, y: 300, page: 0 }}
  // emailPosition and datePosition not provided = buttons disabled

  onSubmit={(blob) => console.log('Signed', blob)}
/>
```

### Example 4: Custom Text Placement

```tsx
<PDFSignatureEditor
  pdfUrl="/documents/form.pdf"
  documentName="Custom Form"

  signaturePosition={{ x: 100, y: 150, page: 0 }}
  customTextPosition={{ x: 300, y: 400, page: 0 }}
  enableCustomText={true}

  onSubmit={(blob) => console.log('Signed', blob)}
/>
```

---

## Understanding PDF Coordinates

### Coordinate System
- **Origin**: Bottom-left corner of the page
- **X-axis**: Increases from left to right
- **Y-axis**: Increases from bottom to top
- **Units**: PDF points (1 point = 1/72 inch)

### Common PDF Page Sizes

| Size | Width (points) | Height (points) |
|------|----------------|-----------------|
| Letter (US) | 612 | 792 |
| A4 | 595 | 842 |
| Legal | 612 | 1008 |

### Example Positions on Letter-Size Page

```typescript
// Top-left area
{ x: 50, y: 750, page: 0 }

// Top-right area
{ x: 450, y: 750, page: 0 }

// Middle-center
{ x: 306, y: 396, page: 0 }

// Bottom-left (signature area)
{ x: 50, y: 100, page: 0 }

// Bottom-right (date area)
{ x: 450, y: 100, page: 0 }
```

---

## How to Find the Right Coordinates

### Method 1: PDF Editing Software
1. Open your PDF in Adobe Acrobat or similar
2. Use the ruler/measurement tool
3. Note the coordinates where you want elements
4. Remember: PDF coordinates start from bottom-left!

### Method 2: Trial and Error
1. Start with estimated coordinates
2. Test the component
3. Adjust coordinates based on where elements appear
4. Repeat until positioned correctly

### Method 3: Use a PDF Coordinate Tool
```typescript
// Quick helper to convert from top-left to PDF coordinates
function topLeftToPDF(x: number, y: number, pageHeight: number) {
  return {
    x: x,
    y: pageHeight - y,  // Flip Y axis
  };
}

// Example: For element at (100, 50) from top-left on Letter page
const pdfCoords = topLeftToPDF(100, 50, 792);
// Result: { x: 100, y: 742 }
```

---

## Button Behavior

### Enabled/Disabled State
- **Enabled**: When position prop is provided
- **Disabled**: When position prop is `undefined`
- Disabled buttons show tooltip: "Position not configured"

### What Happens on Click

1. **Signature Button**:
   - Opens drawing dialog
   - User draws signature
   - Clicks "Confirm"
   - Signature **immediately embedded** at `signaturePosition`

2. **Name/Email/Date Buttons**:
   - Directly embed text at specified position
   - No intermediate step
   - Instant feedback via toast

3. **Custom Text Button**:
   - Opens text input dialog
   - User enters text
   - Clicks "Add to Document"
   - Text **immediately embedded** at `customTextPosition`

---

## Complete Example with API Integration

```tsx
import { PDFSignatureEditor, ElementPosition } from 'react-lib';
import 'react-lib/dist/style.css';
import { useState, useEffect } from 'react';

function ContractSigning({ contractId }: { contractId: string }) {
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Define fixed positions for this contract type
  const positions = {
    signature: { x: 100, y: 150, page: 2 } as ElementPosition,
    name: { x: 100, y: 250, page: 2 } as ElementPosition,
    email: { x: 350, y: 250, page: 2 } as ElementPosition,
    date: { x: 100, y: 200, page: 2 } as ElementPosition,
  };

  useEffect(() => {
    // Load PDF from your backend
    const loadPDF = async () => {
      const response = await fetch(`/api/contracts/${contractId}`);
      const data = await response.json();
      setPdfData(data.base64Pdf);
      setLoading(false);
    };
    loadPDF();
  }, [contractId]);

  const handleSubmit = async (signedPdfBlob: Blob, documentName: string) => {
    const formData = new FormData();
    formData.append('file', signedPdfBlob, `${documentName}_signed.pdf`);
    formData.append('contractId', contractId);

    const response = await fetch('/api/contracts/sign', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });

    if (response.ok) {
      alert('Contract signed successfully!');
      window.location.href = '/dashboard';
    }
  };

  if (loading) return <div>Loading contract...</div>;

  return (
    <PDFSignatureEditor
      pdfData={pdfData!}
      documentName={`Contract-${contractId}`}
      signerName="John Doe"
      signerEmail="john@company.com"

      // Use predefined positions
      signaturePosition={positions.signature}
      namePosition={positions.name}
      emailPosition={positions.email}
      datePosition={positions.date}

      onSubmit={handleSubmit}
      submitButtonText="Sign Contract"
    />
  );
}
```

---

## Migration from Drag-and-Drop Version

If you were using the previous version with drag-and-drop:

### Before (Drag & Drop)
```tsx
<PDFSignatureEditor
  pdfUrl="/document.pdf"
  // No position props - users dragged elements
  onSubmit={(blob) => console.log(blob)}
/>
```

### After (Fixed Coordinates)
```tsx
<PDFSignatureEditor
  pdfUrl="/document.pdf"

  // Now you MUST specify positions
  signaturePosition={{ x: 100, y: 200, page: 0 }}
  namePosition={{ x: 100, y: 300, page: 0 }}
  emailPosition={{ x: 350, y: 300, page: 0 }}
  datePosition={{ x: 100, y: 250, page: 0 }}

  onSubmit={(blob) => console.log(blob)}
/>
```

---

## Tips & Best Practices

### 1. **Test Coordinates First**
Always test your coordinates with a sample PDF before going to production.

### 2. **Consider Page Size**
Different PDFs may have different page sizes. Make sure your coordinates work for the specific PDF size.

### 3. **Leave Space for Signature**
Signatures are 120x60 points by default. Make sure there's enough space.

### 4. **Group Related Fields**
Place name, email, and date close to each other for a professional look.

### 5. **Use Consistent Positioning**
If you have multiple similar documents, use the same coordinate scheme for consistency.

### 6. **Account for Margins**
Don't place elements too close to page edges (keep at least 50 points margin).

---

## Troubleshooting

### Elements Not Visible
- Check if coordinates are within page bounds
- Verify page number (0-indexed!)
- Ensure Y coordinate accounts for bottom-left origin

### Elements in Wrong Position
- PDF coordinates start from bottom-left, not top-left
- Use the conversion formula if thinking in top-left coordinates
- Double-check page height for your PDF size

### Buttons Disabled
- Ensure position props are provided
- Check that position object has all required fields (`x`, `y`, `page`)
- Verify positions aren't `undefined` or `null`

---

## Console Logging

The component logs all embedding operations:

```
🖊️ Embedding signature at fixed position: { x: 100, y: 200, page: 0 }
✅ Signature embedded at page 0, x:100, y:200

🖊️ Embedding name at fixed position: { x: 100, y: 300, page: 0 }
✅ name field embedded at page 0, x:100, y:300
```

Use these logs to verify coordinates are correct!

---

## Summary

✅ **No more dragging** - just configure positions via props
✅ **Immediate embedding** - elements placed instantly on button click
✅ **Full control** - specify exact coordinates for every element
✅ **Multi-page support** - place elements on any page
✅ **Conditional fields** - enable only the fields you need

🎯 **Result**: More predictable, faster, and easier to automate!
