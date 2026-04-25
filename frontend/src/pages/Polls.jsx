import React from 'react';
import Feed from '../components/Feed';

export default function Polls() {
  return (
    <div>
      <Feed
        filters={{ has_poll: 'true' }}
        emptyState={
          <div className="empty-state" style={{ paddingTop: 60 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <h3>No polls yet</h3>
            <p>Be the first to post a poll with your review.</p>
          </div>
        }
      />
    </div>
  );
}
