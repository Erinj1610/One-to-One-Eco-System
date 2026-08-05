import React from 'react';
import DesignFeeBuilder from './projects/DesignFeeBuilder';
import { useStore } from '../context/StoreContext';

export default function DesignFeePage() {
  const { projects, updateProject } = useStore();
  const firstProjectKey = Object.keys(projects || {})[0];

  const handleUpdateFee = (feeData) => {
    if (!firstProjectKey) {
      alert("No active projects found to link this fee to.");
      return;
    }
    updateProject(firstProjectKey, 'designFees', [
      {
        id: `DF-${Date.now().toString().slice(-6)}`,
        name: 'Design Fee Proposal',
        feeValue: feeData.feeValue || 0,
        sqm: feeData.livingArea || 0,
        paid: 0,
        outstanding: feeData.feeValue || 0,
        margin: 20,
        status: 'In Review'
      }
    ]);
    alert("Design fee saved and synced to project financials successfully!");
  };

  return (
    <div className="animation-fade-in">
      <div className="section-label">Design Fee Calculator</div>
      <DesignFeeBuilder isLocked={false} updateFee={handleUpdateFee} />
    </div>
  );
}

