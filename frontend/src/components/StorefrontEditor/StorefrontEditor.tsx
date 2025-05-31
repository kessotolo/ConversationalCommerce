import { StorefrontEditorProps } from '@/components/StorefrontEditor/StorefrontEditor';
import { FC } from 'react';
import { List } from '@mui/material';import * as React from 'react';
import { useState } from 'react';
import { Tab } from '@headlessui/react';
import DraftManagement from './DraftManagement/DraftManagement';
import VersionHistory from './VersionHistory/VersionHistory';
import Permissions from './Permissions/Permissions';
import AssetManagement from './AssetManagement/AssetManagement';
import BannerLogoManagement from './BannerLogoManagement/BannerLogoManagement';
import { UUID } from '../../types/StorefrontEditor';

interface StorefrontEditorProps {
  tenantId: UUID;
}

const StorefrontEditor: React.FC<StorefrontEditorProps> = ({ tenantId }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Tab categories
  const categories = [
    { name: 'Drafts', component: <DraftManagement tenantId={tenantId} /> },
    { name: 'Versions', component: <VersionHistory tenantId={tenantId} /> },
    { name: 'Permissions', component: <Permissions tenantId={tenantId} /> },
    { name: 'Assets', component: <AssetManagement tenantId={tenantId} /> },
    { name: 'Banners & Logos', component: <BannerLogoManagement tenantId={tenantId} /> },
  ];

  return (
    <div className="w-full px-2 py-4">
      <div className="w-full max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Storefront Editor</h1>
        
        <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <Tab.List className="flex p-1 space-x-1 bg-blue-900/20 rounded-xl">
            {categories.map((category) => (
              <Tab
                key={category.name}
                className={({ selected }) =>
                  `w-full py-2.5 text-sm font-medium leading-5 text-blue-700 rounded-lg
                  focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60
                  ${
                    selected
                      ? 'bg-white shadow'
                      : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                  }`
                }
              >
                {category.name}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className="mt-2">
            {categories.map((category, idx) => (
              <Tab.Panel
                key={idx}
                className={`bg-white rounded-xl p-3
                  focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60`}
              >
                {category.component}
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

export default StorefrontEditor;
