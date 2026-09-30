import React from 'react';

/** COGS — deferred per Feedback 26 (“Will be done in update”). */
export const CogsPanel: React.FC = () => (
  <div className="space-y-4">
    <div>
      <h2 className="text-xl font-bold text-[var(--text-main)]">COGS</h2>
      <p className="text-sm text-[var(--text-muted)]">
        Cost of Goods Sold — scheduled for a later update (Feedback 26).
      </p>
    </div>
    <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-panel)] p-8 text-center text-sm text-[var(--text-muted)]">
      COGS subsection is registered. Detailed workflow will ship in the next feedback update.
    </div>
  </div>
);
