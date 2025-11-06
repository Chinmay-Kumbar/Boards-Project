import React, { useState, useEffect, useRef } from 'react'; //QRcodescanner.jsx
import { Html5QrcodeScanner } from 'html5-qrcode'; // Make sure you installed this library

const QRScannerModal = ({ lockerId, expectedCode, onClose, onSuccess }) => {
  const [scanResult, setScanResult] = useState('');
  const [scanError, setScanError] = useState('');
  const [manualInput, setManualInput] = useState('');
  const scannerRef = useRef(null); // Ref to hold the scanner instance

  useEffect(() => {
    const html5QrcodeScanner = new Html5QrcodeScanner(
      'reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    
    const onScanSuccess = (decodedText) => {
        html5QrcodeScanner.pause(true); // Pause scanner on success
        setScanResult(decodedText);
    };

    const onScanError = (errorMessage) => {
        // console.warn(`QR Scan Error: ${errorMessage}`);
    };

    html5QrcodeScanner.render(onScanSuccess, onScanError);
    scannerRef.current = html5QrcodeScanner; // Store instance in ref

    // Cleanup function
    return () => {
        try {
          // Use the ref to clear the scanner on unmount
            scannerRef.current?.clear().catch(e => console.error("Failed to clear scanner on unmount:", e));
        } catch (e) {
            console.warn("Error during scanner cleanup:", e);
        }
    };
  }, []);

  const handleVerification = (codeToVerify) => {
    setScanError('');
    if (codeToVerify === expectedCode) {
      onSuccess(codeToVerify); // Call the assignment function
    } else {
      setScanError('QR code verification failed. Code does not match the locker.');
      // --- ADDED ---
      // If verification fails, resume the scanner to let them try again.
      scannerRef.current?.resume(); 
    }
  };

  // If a result is available from scanning
  useEffect(() => {
    if (scanResult) {
        handleVerification(scanResult);
    }
  }, [scanResult]);

 // --- THIS IS THE FIX ---

  // This function now handles both cleanup and closing gracefully.

  const handleClose = () => {

    try {

      // 1. Manually stop and clear the scanner

      if (scannerRef.current && typeof scannerRef.current.clear === 'function') {

          scannerRef.current.clear().catch(e => {

            if (!String(e).includes("HTML element with id 'reader' not found")) {

                console.error("Failed to clear scanner on close:", e);

            }

          });

          scannerRef.current = null;

    }

    } catch (e) {

      console.error("Error during scanner clear on close:", e);

    }

    

    // 2. Call onClose() *inside* a setTimeout.

    // This gives the scanner library's cleanup function time to finish

    // before React tries to unmount the component, fixing the "stuck modal" bug.

    setTimeout(() => {

      onClose(); 

    }, 50); // 50ms is a safe, imperceptible delay

  };

  // --- END FIX ---



  return (
    <div style={modalStyles.backdrop}>
      <div style={modalStyles.modal}>
        <h3>Verify Locker {lockerId}</h3>
        <p>Scan the QR code on the locker or enter it manually.</p>
        
        {scanError && <p style={modalStyles.error}>{scanError}</p>}

        {/* QR Scanner Container */}
        <div id="reader" style={modalStyles.scanner}></div>

        {/* Manual Input Fallback */}
        <div style={modalStyles.manualInputGroup}>
            <input
                type="text"
                placeholder="Manual QR Code Input"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                style={modalStyles.input}
            />
            <button onClick={() => handleVerification(manualInput)} style={modalStyles.verifyButton}>
                Verify Manually
            </button>
        </div>

        {/* --- FIX --- */}
        {/* Call the new handleClose function instead of onClose directly */}
        <button onClick={handleClose} style={modalStyles.closeButton}>Close</button>
        {/* --- END FIX --- */}
      </div>
    </div>
  );
};

export default QRScannerModal;

// --- Modal Styles ---
const modalStyles = {
// ... (styles are correct)
    backdrop: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
        backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', 
        justifyContent: 'center', alignItems: 'center', zIndex: 1000
    },
    modal: {
        backgroundColor: 'white', padding: '30px', borderRadius: '8px', 
        maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)', textAlign: 'center'
    },
    scanner: { width: '100%', maxWidth: '300px', margin: '0 auto 20px' },
    manualInputGroup: { display: 'flex', gap: '10px', marginBottom: '20px' },
    input: { flexGrow: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '4px' },
    verifyButton: { padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    closeButton: { padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    error: { color: 'red', marginBottom: '15px' }
};

