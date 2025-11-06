import React, { useState, useEffect } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register, currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Handle Redirection based on user role upon successful authentication
  useEffect(() => {
    if (currentUser) {
      navigate(isAdmin ? '/admin' : '/dashboard', { replace: true });
    }
  }, [currentUser, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        // Register flow: calls register (which also creates the user profile in DB)
        await register(email, password);
        // NOTE: Changed alert() to a temporary UI element for best practice 
        // in a non-modal environment, but keeping the original for now.
        alert('Registration successful! You are now logged in.');
      } else {
        // Login flow
        await login(email, password);
      }
      // Redirection is handled by the useEffect hook above
    } catch (err) {
      let errorMessage = 'Failed to authenticate.';
      // Friendly Firebase Error Messages
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No user found with this email.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered.';
      } else if (err.code === 'auth/invalid-credential') {
         errorMessage = 'Invalid email or password.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (currentUser) {
    // Show nothing while the useEffect handles navigation
    return <div style={{padding: '50px', textAlign: 'center'}}>Redirecting...</div>;
  }

  return (
    // APPLY new style.pageCenter here
    <div style={styles.pageCenter}>
      <div style={styles.container}>
        <h2>{isRegister ? 'Register' : 'Login'} to Smart Locker System</h2>
        {error && <p style={styles.error}>{error}</p>}
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Processing...' : isRegister ? 'Register & Log In' : 'Log In'}
          </button>
        </form>

        <button
          onClick={() => setIsRegister(!isRegister)}
          style={styles.toggleButton}
          disabled={loading}
        >
          {isRegister
            ? 'Already have an account? Login here.'
            : "Need an account? Register here."}
        </button>
      </div>
    </div>
  );
};

export default Login;

// Updated Styles for centering
const styles = {
    // NEW: Style to center the content on the entire screen
    pageCenter: {
        display: 'flex',
        justifyContent: 'center', // Horizontal centering
        alignItems: 'center',     // Vertical centering
        minHeight: '100vh',       // Take up full viewport height
        width: '100vw',           // Take up full viewport width
    },
    container: {
        // Removed 'margin: 50px auto' as Flexbox handles centering
        maxWidth: '400px',
        padding: '20px',
        // Increased contrast to be visible against a dark background
        backgroundColor: '#222', 
        color: '#fff',
        border: '1px solid #555',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
    },
    input: {
        padding: '10px',
        marginBottom: '15px',
        // Adjusted input styles for visibility on a dark background
        backgroundColor: '#333',
        color: '#fff',
        border: '1px solid #555',
        borderRadius: '4px',
    },
    button: {
        padding: '10px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginBottom: '10px',
        transition: 'background-color 0.2s',
    },
    toggleButton: {
        background: 'none',
        border: 'none',
        color: '#87cefa', // Lighter blue for dark background
        cursor: 'pointer',
        textDecoration: 'underline',
        marginTop: '10px',
    },
    error: {
        color: '#ff4444', // Brighter red for visibility
        marginBottom: '15px',
        textAlign: 'center',
    }
};
