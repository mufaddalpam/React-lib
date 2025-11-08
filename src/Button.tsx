import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export type SignatureProps = {
    /** Text to display inside the button */
    label: string;

    /** Click event handler */
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;

    /** Whether the button is disabled */
    disabled?: boolean;

    /** Optional CSS class for styling */
    className?: string;

    /** Optional inline styles to override defaults */
    style?: React.CSSProperties;

    /** Button type: 'button', 'submit', or 'reset' */
    type?: 'button' | 'submit' | 'reset';
};

export const Signature: React.FC<SignatureProps> = ({
    label,
    onClick,
    disabled = false,
    className = '',
    style,
    type = 'button',
}) => {
    const [showSignature, setShowSignature] = useState(false);
    const sigCanvasRef = useRef<SignatureCanvas | null>(null);

    const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (onClick) onClick(e);
        setShowSignature((prev) => !prev);
    };

    const handleClear = () => {
        sigCanvasRef.current?.clear();
    };

    //   const handleSave = async () => {
    //   const dataUrl = sigCanvasRef.current?.toDataURL();
    //   if (dataUrl) {
    //     await fetch('https://your-api.com/save-signature', {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({ signature: dataUrl }),
    //     });
    //   }
    // };

    const handleSave = () => {
        const dataUrl = sigCanvasRef.current?.toDataURL();
        if (dataUrl) {
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'signature.png';
            a.click();
        }
    };

    return (
        <div>
            <button
                type={type}
                onClick={disabled ? undefined : handleButtonClick}
                disabled={disabled}
                className={`px-3 py-2 rounded border-none text-black transition-colors duration-200 mb-2.5 ${disabled
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                    } ${className}`}
                style={style}
            >
                {label}
            </button>

            {showSignature && (
                <div className="border-2 border-gray-200 p-4 w-100">
                    <SignatureCanvas
                        ref={sigCanvasRef}
                        penColor="white"
                        canvasProps={{
                            width: 300,
                            height: 150,
                            className: 'border border-black bg-[#413d3d]',
                        }}
                    />
                    <div className="mt-2 flex gap-2.5">
                        <button
                            onClick={handleClear}
                            className="px-3 py-1.5 bg-gray-300 hover:bg-gray-300 rounded text-gray-800 transition-colors"
                        >
                            Clear
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-gray-800 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
