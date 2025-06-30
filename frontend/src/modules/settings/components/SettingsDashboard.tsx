import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  Stack,
  Text,
  useColorModeValue,
  IconButton,
  Icon,
  Divider,
  Container,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  useBreakpointValue,
} from '@chakra-ui/react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { FiHome, FiMenu } from 'react-icons/fi';
import { IconType } from 'react-icons';
import { SettingsService } from '../services/SettingsService';
import { SettingsDomain } from '../models/settings';
import { FiCreditCard, FiTruck, FiBell, FiLink, FiShoppingBag } from 'react-icons/fi';

interface NavItemProps {
  icon: IconType;
  title: string;
  path: string;
  isActive: boolean;
  onClose?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, title, path, isActive, onClose }) => {
  const navigate = useNavigate();
  const activeColor = useColorModeValue('blue.600', 'blue.300');
  const bgActive = useColorModeValue('blue.50', 'blue.900');
  
  const handleClick = () => {
    navigate(path);
    if (onClose) onClose();
  };
  
  return (
    <Flex
      align="center"
      px="4"
      py="3"
      cursor="pointer"
      role="group"
      fontWeight="semibold"
      transition=".15s ease"
      color={isActive ? activeColor : useColorModeValue('gray.600', 'gray.400')}
      bg={isActive ? bgActive : 'transparent'}
      borderRadius="md"
      onClick={handleClick}
      _hover={{
        bg: useColorModeValue('gray.100', 'gray.700'),
      }}
    >
      <Icon
        mr="3"
        fontSize="16"
        as={icon}
        color={isActive ? activeColor : useColorModeValue('gray.500', 'gray.400')}
        _groupHover={{
          color: activeColor,
        }}
      />
      <Text>{title}</Text>
    </Flex>
  );
};

// Map domain names to icons
const getDomainIcon = (domainName: string): IconType => {
  switch (domainName.toLowerCase()) {
    case 'store':
      return FiShoppingBag;
    case 'payment':
      return FiCreditCard;
    case 'shipping':
      return FiTruck;
    case 'notifications':
      return FiBell;
    case 'integrations':
      return FiLink;
    default:
      return FiHome;
  }
};

const SettingsDashboard: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const location = useLocation();
  const navigate = useNavigate();
  const [domains, setDomains] = useState<SettingsDomain[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const settingsService = new SettingsService();
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  // Get the current domain from the URL
  const currentPath = location.pathname;
  const pathParts = currentPath.split('/');
  const currentDomain = pathParts[pathParts.length - 1];
  
  // Load settings domains
  useEffect(() => {
    const loadDomains = async () => {
      setIsLoading(true);
      try {
        const domainsData = await settingsService.getDomains();
        setDomains(domainsData);
        
        // If we're at the root settings path, redirect to the first domain
        if (currentPath === '/settings' && domainsData.length > 0) {
          navigate(`/settings/${domainsData[0].name}`);
        }
      } catch (error) {
        console.error('Failed to load settings domains:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDomains();
  }, []);
  
  // Get current domain name for breadcrumb
  const currentDomainName = domains.find(domain => 
    domain.name === currentDomain
  )?.description || 'Settings';
  
  const Sidebar = (
    <Stack spacing="1">
      <Heading size="sm" mb="2" mt="4" px="4">
        Settings
      </Heading>
      <Divider />
      {domains.map((domain) => (
        <NavItem
          key={domain.id}
          icon={getDomainIcon(domain.name)}
          title={domain.description || domain.name}
          path={`/settings/${domain.name}`}
          isActive={currentDomain === domain.name}
          onClose={isMobile ? onClose : undefined}
        />
      ))}
    </Stack>
  );
  
  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.800')}>
      <Box display={{ base: 'block', md: 'none' }} p="4">
        <Flex alignItems="center">
          <IconButton
            aria-label="Open menu"
            icon={<FiMenu />}
            onClick={onOpen}
            variant="outline"
            mr="2"
          />
          <Heading size="md">Settings</Heading>
        </Flex>
      </Box>
      
      <Drawer
        isOpen={isOpen}
        placement="left"
        onClose={onClose}
        returnFocusOnClose={false}
        size="xs"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Settings</DrawerHeader>
          <DrawerBody>
            {Sidebar}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
      
      <Flex>
        <Box
          display={{ base: 'none', md: 'block' }}
          w="64"
          bg={useColorModeValue('white', 'gray.900')}
          borderRight="1px"
          borderRightColor={useColorModeValue('gray.200', 'gray.700')}
          h="100vh"
          position="fixed"
          overflowY="auto"
        >
          {Sidebar}
        </Box>
        
        <Box
          ml={{ base: 0, md: 64 }}
          p={{ base: '4', md: '8' }}
          flex="1"
          minH={{ md: '100vh' }}
        >
          <Container maxW="container.xl" p={{ base: '2', md: '4' }}>
            <Breadcrumb mb="6">
              <BreadcrumbItem>
                <BreadcrumbLink as={Link} to="/settings">
                  Settings
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem isCurrentPage>
                <BreadcrumbLink>{currentDomainName}</BreadcrumbLink>
              </BreadcrumbItem>
            </Breadcrumb>
            
            <Outlet />
          </Container>
        </Box>
      </Flex>
    </Box>
  );
};

export default SettingsDashboard;
