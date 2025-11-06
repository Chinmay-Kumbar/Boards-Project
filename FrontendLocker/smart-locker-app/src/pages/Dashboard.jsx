import React, { useState, useEffect } from 'react';
import { ref, onValue, off, update } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import LockerCard from '../components/LockerCard';

const Dashboard = () => {
  const { currentUser, logout, loading: authLoading } = useAuth();
  const [lockers, setLockers] = useState({});
  const [dataLoading, setDataLoading] = useState(true);

  // 1. Real-time Locker Data Fetching
  useEffect(() => {
    if (authLoading || !currentUser) return;

    const lockersRef = ref(db, 'lockers');
    setDataLoading(true);

    const unsubscribe = onValue(lockersRef, (snapshot) => {
      const data = snapshot.val() || {};
      setLockers(data);
      setDataLoading(false);
    }, (error) => {
      console.error("Error fetching lockers:", error);
      setDataLoading(false);
    });

    // Clean up the listener when the component unmounts
    return () => off(lockersRef, 'value', unsubscribe);
  }, [authLoading, currentUser]);

  // Handle User Locker Release
  const handleReleaseLocker = async (lockerId) => {
      if (!window.confirm(`Are you sure you want to release locker ${lockerId}?`)) return;

      const userUID = currentUser.uid;
      const timestamp = Date.now();
      const logId = Date.now();

      // Multi-path update for atomic release
      const updates = {
          [`lockers/${lockerId}/assignedUserUID`]: "",
          [`lockers/${lockerId}/isAvailable`]: true,
          [`lockers/${lockerId}/lockCommand`]: "LOCK", // Ensures the locker is locked
          [`users/${userUID}/assignedLocker`]: "",
          [`logs/${logId}`]: {
              userUID,
              lockerID: lockerId,
              action: "RELEASED",
              timestamp,
              success: true
          }
      };

      try {
          await update(ref(db), updates);
          alert(`Locker ${lockerId} released successfully!`);
      } catch (error) {
          console.error("Error releasing locker:", error);
          alert("Failed to release locker. Check console for details.");
      }
  };


  if (authLoading || dataLoading) {
    return <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Loading Dashboard...</div>;
  }
  
  const lockerKeys = Object.keys(lockers).sort();
  const assignedLockerId = currentUser.assignedLocker;

  return (
    <div style={styles.dashboardContainer}>
      <header style={styles.header}>
        {/* This will now be fixed because your rules are correct */}
        <h1 style={{color: 'white'}}>Welcome, {currentUser.displayName}</h1>
        <button onClick={logout} style={styles.logoutButton}>Logout</button>
      </header>
      
      {/* User Control Bar (Conditionally Rendered) */}
      {assignedLockerId && (
          <div style={styles.controlBar}>
              <h2>Your Locker: {assignedLockerId}</h2>
              <LockerCard
                  lockerId={assignedLockerId}
                  lockerData={lockers[assignedLockerId]}
                  currentUser={currentUser}
                  onRelease={handleReleaseLocker}
                  isControlPanel={true}
              />
          </div>
      )}

      <h2 style={{color: 'white'}}>Locker Availability Grid</h2>
      <p style={{color: 'gray'}}>Click an available (green) locker to reserve it.</p>
      
      <div style={styles.gridContainer}>
        {lockerKeys.map((id) => (
            <LockerCard
                key={id}
                lockerId={id}
                lockerData={lockers[id]}
                currentUser={currentUser}
                onRelease={handleReleaseLocker}
                isControlPanel={false}
            />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;

// --- Styles (Adapted for Dark Mode) ---
const styles = {
    dashboardContainer: { padding: '20px', maxWidth: '1200px', margin: '0 auto', color: 'white' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
    logoutButton: { padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    // This is the dark mode fix for the control panel
    controlBar: { border: '2px solid #007bff', padding: '15px', margin: '20px 0', borderRadius: '8px', backgroundColor: '#333' }, 
    gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' },
};
