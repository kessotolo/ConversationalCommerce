import React from 'react';
// Updated to use direct module import instead of bridge file
import { Status } from '@/modules/core/models/base';

const TestComponent: React.FC = () => {
  return (
    <div>
      <h1>Test ESLint Rules</h1>
      <p>Draft Status: {Status.DRAFT}</p>
    </div>
  );
};

export default TestComponent;
