/**
 * Admin Route - Renders the WatermelonAdminPanel for direct access
 * Access via: /admin or /admin?admin=true
 */
import {AdminPanelMount} from '../components/admin/WatermelonAdminPanel';

export const meta = () => {
  return [{title: 'Watermelon Admin'}];
};

export default function AdminRoute() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      color: '#00ff00',
    }}>
      <h1 style={{ marginBottom: '20px', fontSize: '24px' }}>🍉 Watermelon Admin</h1>
      <p style={{ marginBottom: '20px', opacity: 0.7, fontSize: '14px' }}>
        For in-context admin panel, use <kbd style={{ 
          background: '#333', 
          padding: '2px 6px', 
          borderRadius: '4px',
          border: '1px solid #555'
        }}>Ctrl+Shift+A</kbd> on the main page
      </p>
      <div style={{
        background: 'rgba(0,0,0,0.5)',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #00ff00',
        maxWidth: '400px',
        textAlign: 'center',
      }}>
        <p style={{ marginBottom: '16px' }}>
          The admin panel is designed to overlay the 3D carousel for live editing.
        </p>
        <a 
          href="/?admin=true" 
          style={{
            display: 'inline-block',
            background: '#00ff00',
            color: '#000',
            padding: '10px 20px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 'bold',
          }}
        >
          Go to Main Page with Admin
        </a>
      </div>
      
      {/* Still mount the admin panel component for testing */}
      <AdminPanelMount />
    </div>
  );
}
