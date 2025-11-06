import React, { useState } from 'react';
import { ref, update } from 'firebase/database'; // Removed 'set' and 'get' as they are not used stand-alone
import { db } from '../firebase';
import QRScannerModal from './QRScannerModal';

const LockerCard = ({ lockerId, lockerData, currentUser, onRelease, isControlPanel }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [controlLoading, setControlLoading] = useState(false);

  if (!lockerData) return null;

  const isAvailable = lockerData.isAvailable;
  const isMine = lockerData.assignedUserUID === currentUser.uid;
  const currentState = lockerData.currentState || 'UNKNOWN'; // State from ESP32
  const lockCommand = lockerData.lockCommand; // Command written by frontend

  // Determine the card's visual state
  const cardColor = isAvailable ? '#28a745' : isMine ? '#ffc107' : '#dc3545';
  const cardStatus = isAvailable ? 'Available' : isMine ? 'Your Locker' : 'Occupied';
  
  // NOTE: alert() should be replaced with a UI modal in a non-iframe environment
  const handleCardClick = () => {
    if (isAvailable) {
      setIsModalOpen(true);
    } else if (isMine) {
      alert("Manage this locker using the Control Panel above.");
    } else {
      alert("This locker is occupied by another user.");
    }
  };

  // 1. Lock/Unlock command handler (Optimized for single atomic update)
  const handleLockCommand = async (command) => {
    setControlLoading(true);
    const timestamp = Date.now();
    
    // Combined update object for atomic write
    const updates = {
        [`lockers/${lockerId}/lockCommand`]: command, // Write the command
        [`logs/${Date.now()}`]: { // Write the log entry
            userUID: currentUser.uid,
            lockerID: lockerId,
            action: command, 
            timestamp,
            success: true
        }
    };

    try {
        await update(ref(db), updates); // Use update for atomic execution
    } catch (error) {
        console.error(`Error sending ${command} command:`, error);
        alert(`Failed to send ${command} command.`);
    } finally {
        setControlLoading(false);
    }
  };
  
  // 2. Assignment handler (called from QRScannerModal on success)
  const handleAssignmentSuccess = async (scannedCode) => {
      const userUID = currentUser.uid;
      const timestamp = Date.now();
      const logId = Date.now();
      
      const updates = {
          [`lockers/${lockerId}/assignedUserUID`]: userUID,
          [`lockers/${lockerId}/isAvailable`]: false,
          [`lockers/${lockerId}/lockCommand`]: "LOCK", 
          [`lockers/${lockerId}/lastAccessTime`]: timestamp,
          [`users/${userUID}/assignedLocker`]: lockerId,
          [`logs/${logId}`]: {
              userUID,
              lockerID: lockerId,
              action: "ASSIGNED",
              timestamp,
              success: true
          }
      };

      try {
          await update(ref(db), updates);
          alert(`Successfully reserved locker ${lockerId}!`);
          setIsModalOpen(false);
      } catch (error) {
          console.error("Error assigning locker:", error);
          alert("Failed to reserve locker. Please try again.");
      }
  }


  // --- Render Control Panel vs. Grid Card ---
  if (isControlPanel) {
    return (
        <div style={styles.controlPanel}>
            <p>State (ESP32): <strong>{currentState}</strong></p>
            <p>Command Sent: <strong>{lockCommand}</strong></p>
            <div style={styles.buttonGroup}>
                <button onClick={() => handleLockCommand('UNLOCK')} disabled={controlLoading} style={styles.controlButton}>
                    {controlLoading && lockCommand === 'UNLOCK' ? 'Sending...' : 'Unlock'}
                </button>
                <button onClick={() => handleLockCommand('LOCK')} disabled={controlLoading} style={styles.controlButton}>
                    {controlLoading && lockCommand === 'LOCK' ? 'Sending...' : 'Lock'}
                </button>
                <button onClick={() => onRelease(lockerId)} style={styles.releaseButton} disabled={controlLoading}>
                    Release Locker
                </button>
            </div>
        </div>
    );
  }

  // Render Grid Card
  return (
    <div style={{ ...styles.card, backgroundColor: cardColor }} onClick={handleCardClick}>
      <h3>Locker {lockerId}</h3>
      <p>{cardStatus}</p>
      {!isAvailable && !isMine && <p style={{fontSize: '0.8em'}}>Not yours</p>}

      {isModalOpen && (
        <QRScannerModal
            lockerId={lockerId}
            expectedCode={lockerData.qrCode}
            onClose={() => setIsModalOpen(false)}
            onSuccess={handleAssignmentSuccess}
        />
      )}
    </div>
  );
};

export default LockerCard;

// --- Styles (Basic) ---
const styles = {
    card: {
        padding: '15px',
        borderRadius: '8px',
        color: 'white',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'background-color 0.3s',
        minHeight: '100px'
    },
    controlPanel: {
        marginTop: '10px',
        padding: '15px',
        border: '1px solid #555',
        borderRadius: '4px',
        backgroundColor: '#333'
    },
    buttonGroup: {
        display: 'flex',
        gap: '10px',
        marginTop: '10px'
    },
    controlButton: {
        padding: '10px 15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    releaseButton: {
        padding: '10px 15px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    }
};
