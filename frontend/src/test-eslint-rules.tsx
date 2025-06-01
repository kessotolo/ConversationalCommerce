import React from 'react';
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
