import React from 'react';
import DesignFeeBuilder from './projects/DesignFeeBuilder';

export default function DesignFeePage() {
  return (
    <div className="animation-fade-in">
      <div className="section-label">Design Fee Calculator</div>
      <DesignFeeBuilder isLocked={false} updateFee={() => {}} />
    </div>
  );
}
