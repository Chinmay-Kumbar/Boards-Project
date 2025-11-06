import React, { useState, useEffect } from 'react';
import { ref, onValue, off, update, query, limitToLast } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { logout, currentUser } = useAuth(); // Use currentUser to log admin actions
  const [lockers, setLockers] = useState({});
  const [users, setUsers] = useState({});
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);

  // 1. Fetch Real-time Data (Lockers, Users, Logs)
  useEffect(() => {
    if (!currentUser) return; // Wait for user to be available

    const logsQuery = query(ref(db, 'logs'), limitToLast(30)); 

    const dataLoaded = { lockers: false, users: false, logs: false };
    const checkComplete = () => {
        // Only set loading to false when all 3 data sources have loaded
        if (dataLoaded.lockers && dataLoaded.users && dataLoaded.logs) {
            setLoading(false);
        }
    };
    
    // Listener 1: Lockers
    const unsubscribeLockers = onValue(ref(db, 'lockers'), (snapshot) => {
        setLockers(snapshot.val() || {});
        dataLoaded.lockers = true;
        checkComplete();
    });

    // Listener 2: Users
    const unsubscribeUsers = onValue(ref(db, 'users'), (snapshot) => {
        setUsers(snapshot.val() || {});
        dataLoaded.users = true;
        checkComplete();
    });

    // Listener 3: Logs (using query)
    const unsubscribeLogs = onValue(logsQuery, (snapshot) => {
        setLogs(snapshot.val() || {});
        dataLoaded.logs = true;
        checkComplete();
    });

    // Cleanup all listeners when component unmounts
    return () => {
        off(ref(db, 'lockers'), 'value', unsubscribeLockers);
        off(ref(db, 'users'), 'value', unsubscribeUsers);
        off(logsQuery, 'value', unsubscribeLogs);
    };
  }, [currentUser]); // Dependency on currentUser

  // 2. Admin Action: Force Unlock
  const handleForceUnlock = async (lockerId) => {
    if (!window.confirm(`Are you sure you want to FORCE UNLOCK Locker ${lockerId}?`)) return;
    try {
        const updates = {
            [`lockers/${lockerId}/lockCommand`]: "UNLOCK",
            [`logs/${Date.now()}`]: {
                userUID: currentUser.uid, // Log which admin did it
                lockerID: lockerId,
                action: "ADMIN_FORCE_UNLOCK",
                timestamp: Date.now(),
                success: true
            }
        };
        await update(ref(db), updates);
        alert(`Locker ${lockerId} command set to UNLOCK.`);
    } catch (error) {
        console.error("Error forcing unlock:", error);
        alert("Failed to force unlock locker.");
    }
  };
  
  // 3. Admin Action: Force Lock
  const handleForceLock = async (lockerId) => {
    if (!window.confirm(`Are you sure you want to FORCE LOCK Locker ${lockerId}?`)) return;
    try {
        const updates = {
            [`lockers/${lockerId}/lockCommand`]: "LOCK",
            [`logs/${Date.now()}`]: {
                userUID: currentUser.uid,
                lockerID: lockerId,
                action: "ADMIN_FORCE_LOCK",
                timestamp: Date.now(),
                success: true
            }
        };
        await update(ref(db), updates);
        alert(`Locker ${lockerId} command set to LOCK.`);
    } catch (error) {
        console.error("Error forcing lock:", error);
        alert("Failed to force lock locker.");
    }
  };


  // 4. Admin Action: Force Release (Leave/Unassign)
  const handleForceRelease = async (lockerId, assignedUserUID) => {
    if (!window.confirm(`Are you sure you want to FORCE RELEASE Locker ${lockerId}? This will unassign the current user.`)) return;

    try {
        const updates = {};
        // Clear locker
        updates[`lockers/${lockerId}/assignedUserUID`] = "";
        updates[`lockers/${lockerId}/isAvailable`] = true;
        updates[`lockers/${lockerId}/lockCommand`] = "LOCK"; // Lock it after release
        
        // Clear user's record (if they are assigned)
        if (assignedUserUID) {
            updates[`users/${assignedUserUID}/assignedLocker`] = "";
        }
        
        // Add log
        updates[`logs/${Date.now()}`] = {
            userUID: currentUser.uid,
            lockerID: lockerId,
            action: "ADMIN_FORCE_RELEASE",
            timestamp: Date.now(),
            success: true
        };
        
        await update(ref(db), updates);
        alert(`Locker ${lockerId} has been released and is now available.`);
    } catch (error) {
        console.error("Error forcing release:", error);
        alert("Failed to release locker.");
    }
  };


  // --- Helper functions and Data Calculation ---
  const lockerList = Object.keys(lockers).map(id => ({ id, ...lockers[id] }));
  const totalLockers = lockerList.length;
  const availableLockers = lockerList.filter(l => l.isAvailable).length;
  const occupiedLockers = totalLockers - availableLockers;

  const getUserEmail = (uid) => {
    if (!users[uid]) return uid; // Return ID if user is somehow missing
    if (currentUser && uid === currentUser.uid) return `${users[uid].email} (You)`;
    return users[uid].email;
  };

  const logEntries = Object.keys(logs)
    .map(key => ({ id: key, ...logs[key] }))
    .sort((a, b) => b.timestamp - a.timestamp); // Newest first


  if (loading) {
    return <div style={{...styles.container, textAlign: 'center', paddingTop: '50px'}}>Loading Admin Dashboard Data...</div>;
  }
  
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={{color: 'white'}}>🔐 Admin Dashboard</h1>
        <button onClick={logout} style={styles.logoutButton}>Logout</button>
      </header>
      
      {/* STATS OVERVIEW */}
      <div style={styles.statsGrid}>
          <div style={styles.statCard}>Total Lockers: <strong>{totalLockers}</strong></div>
          <div style={{...styles.statCard, backgroundColor: '#28a745'}}>Available: <strong>{availableLockers}</strong></div>
          <div style={{...styles.statCard, backgroundColor: '#ffc107', color: '#333'}}>Occupied: <strong>{occupiedLockers}</strong></div>
          <div style={styles.statCard}>Total Users: <strong>{Object.keys(users).length}</strong></div>
      </div>

      {/* LOCKER LIST */}
      <h2 style={{color: 'white'}}>Locker Status Overview</h2>
      <div style={{overflowX: 'auto'}}>
        <table style={styles.table}>
            <thead>
                <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Status (In Use?)</th>
                    <th style={styles.th}>Assigned User</th>
                    <th style={styles.th}>HW State</th>
                    <th style={styles.th}>Last Command</th>
                    <th style={styles.th}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {lockerList.map(locker => (
                    <tr key={locker.id}>
                        <td style={styles.td}>{locker.id}</td>
                        {/* This shows if it is "In Use" (Occupied) or "Available" */}
                        <td style={{...styles.td, color: locker.isAvailable ? 'lightgreen' : '#ff7777'}}>
                          {locker.isAvailable ? 'Available' : 'In Use'}
                        </td>
                        <td style={styles.td}>{locker.assignedUserUID ? getUserEmail(locker.assignedUserUID) : '-'}</td>
                        <td style={styles.td}>{locker.currentState || 'N/A'}</td>
                        <td style={styles.td}>{locker.lockCommand || 'N/A'}</td>
                        <td style={styles.td}>
                            {/* Force Unlock Button */}
                            <button 
                                onClick={() => handleForceUnlock(locker.id)} 
                                style={{...styles.actionButton, backgroundColor: '#007bff'}}>
                                Force Unlock
                            </button>
                            {/* Force Lock Button */}
                             <button 
                                onClick={() => handleForceLock(locker.id)} 
                                style={{...styles.actionButton, backgroundColor: '#ffc107', color: '#333'}}>
                                Force Lock
                            </button>
                            {/* Force Release (Leave) Button */}
                            <button 
                                onClick={() => handleForceRelease(locker.id, locker.assignedUserUID)} 
                                style={{...styles.actionButton, backgroundColor: '#6c757d'}}
                                disabled={locker.isAvailable}>
                                Force Release
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* RECENT LOGS */}
      <h2 style={{color: 'white'}}>Recent Logs (Last 30)</h2>
      <ul style={styles.logList}>
        {logEntries.map(log => (
            <li key={log.id} style={styles.logItem}>
                <span style={styles.logTime}>{new Date(log.timestamp).toLocaleString()}</span>
                Locker **{log.lockerID}** - <strong style={{color: '#ffc107'}}>{log.action}</strong> by {getUserEmail(log.userUID)}
            </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminDashboard;


// --- Styles (Adapted for Dark Mode) ---
const styles = {
    container: { padding: '20px', maxWidth: '1200px', margin: '0 auto', color: 'white' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
    logoutButton: { padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' },
    statCard: { padding: '20px', backgroundColor: '#007bff', color: 'white', borderRadius: '8px', textAlign: 'center' },
    table: { width: '100%', borderCollapse: 'collapse', marginBottom: '40px', backgroundColor: '#333', color: 'white' },
    th: { border: '1px solid #555', padding: '10px', backgroundColor: '#444', textAlign: 'left', color: 'white' },
    td: { border: '1px solid #555', padding: '10px', verticalAlign: 'middle' },
    actionButton: { 
        padding: '5px 10px', 
        color: 'white', 
        border: 'none', 
        borderRadius: '4px', 
        cursor: 'pointer', 
        fontSize: '0.85em',
        marginRight: '5px',
        marginBottom: '5px', // Added for stacking on small screens
    },
    logList: { listStyle: 'none', padding: 0, maxHeight: '400px', overflowY: 'auto', backgroundColor: '#333', borderRadius: '8px' },
    logItem: { borderBottom: '1px solid #555', padding: '10px' },
    logTime: { color: '#aaa', marginRight: '15px' }
};

