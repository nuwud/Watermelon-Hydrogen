/**
 * CheckoutPanelSkeleton Component
 * Loading placeholder for checkout panel
 */
export function CheckoutPanelSkeleton() {
  return (
    <div style={styles.container}>
      <div style={{...styles.item, ...styles.title}}></div>
      <div style={{...styles.item, ...styles.form}}></div>
      <div style={{...styles.item, ...styles.form}}></div>
      <div style={{...styles.item, ...styles.form}}></div>
      <div style={{...styles.item, ...styles.button}}></div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  item: {
    background: 'linear-gradient(90deg, rgba(230, 230, 230, 0.5) 0%, rgba(240, 240, 240, 0.8) 50%, rgba(230, 230, 230, 0.5) 100%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 2s ease-in-out infinite',
    borderRadius: '4px',
  },
  title: {
    height: '32px',
    width: '60%',
  },
  form: {
    height: '48px',
    width: '100%',
  },
  button: {
    height: '56px',
    width: '100%',
    marginTop: '16px',
  },
};
