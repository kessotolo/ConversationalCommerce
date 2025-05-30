import { BannerLogoManagement } from '@/components/StorefrontEditor/BannerLogoManagement/BannerLogoManagement';import * as React from 'react';
import { List } from '@mui/material';import { BannerLogoManagementProps } from '@/components/StorefrontEditor/BannerLogoManagement/BannerLogoManagement';import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import { UUID } from '../../../types/storefrontEditor';
import BannerManagement from './BannerManagement';
import LogoManagement from './LogoManagement';

interface BannerLogoManagementProps {
  tenantId: UUID;
}

const BannerLogoManagement: React.FC<BannerLogoManagementProps> = ({ tenantId }) => {
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-2xl font-semibold mb-4">Banner & Logo Management</h2>

      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
        <Tab.List className="flex space-x-1 bg-gray-100 p-1 rounded-t-lg">
          <Tab
            className={({ selected }: { selected: boolean }) =>
              `w-full py-2.5 text-sm font-medium leading-5 rounded-md
              ${selected
                ? 'bg-white text-blue-700 shadow'
                : 'text-gray-700 hover:bg-white/[0.12] hover:text-blue-600'}`
            }
          >
            Banners
          </Tab>
          <Tab
            className={({ selected }: { selected: boolean }) =>
              `w-full py-2.5 text-sm font-medium leading-5 rounded-md
              ${selected
                ? 'bg-white text-blue-700 shadow'
                : 'text-gray-700 hover:bg-white/[0.12] hover:text-blue-600'}`
            }
          >
            Logos
          </Tab>
        </Tab.List>
        <Tab.Panels className="flex-1 bg-white rounded-b-lg border-t overflow-hidden">
          <Tab.Panel className="h-full">
            <BannerManagement tenantId={tenantId} />
          </Tab.Panel>
          <Tab.Panel className="h-full">
            <LogoManagement tenantId={tenantId} />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default BannerLogoManagement;
