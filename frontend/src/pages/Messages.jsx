export default function Messages() {
  return (
    <div className="empty-state" style={{ paddingTop: 80 }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
      <h3>Messages</h3>
      <p>Direct messaging coming soon.</p>
    </div>
  );
}
