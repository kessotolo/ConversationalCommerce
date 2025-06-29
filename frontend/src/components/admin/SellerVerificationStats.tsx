import React from "react";
import {
  Box,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Heading,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { useQuery } from "react-query";
import { getSellerDashboardStats } from "../../services/sellerOnboardingService";

interface StatCardProps {
  title: string;
  stat: number;
  helpText?: string;
  colorScheme?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  stat,
  helpText,
  colorScheme = "blue",
}) => {
  const bgColor = useColorModeValue(`${colorScheme}.50`, `${colorScheme}.900`);
  const textColor = useColorModeValue(`${colorScheme}.600`, `${colorScheme}.200`);

  return (
    <Stat
      px={4}
      py={3}
      borderWidth="1px"
      borderRadius="lg"
      boxShadow="sm"
      bg={bgColor}
    >
      <StatLabel color={textColor} fontWeight="medium">
        {title}
      </StatLabel>
      <StatNumber fontSize="3xl" fontWeight="bold">
        {stat}
      </StatNumber>
      {helpText && <StatHelpText>{helpText}</StatHelpText>}
    </Stat>
  );
};

const SellerVerificationStats: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery(
    "sellerDashboardStats",
    getSellerDashboardStats
  );

  if (isLoading) {
    return <Text>Loading statistics...</Text>;
  }

  if (error || !stats) {
    return (
      <Text color="red.500">
        Error loading dashboard statistics: {(error as Error)?.message || "Unknown error"}
      </Text>
    );
  }

  return (
    <Box mb={8}>
      <Heading size="md" mb={4}>
        Seller Verification Dashboard
      </Heading>

      <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4} mb={8}>
        <StatCard
          title="Pending Verifications"
          stat={stats.pending_verifications}
          colorScheme="yellow"
        />
        <StatCard
          title="In Review"
          stat={stats.in_review_verifications}
          colorScheme="blue"
        />
        <StatCard
          title="Approved Sellers"
          stat={stats.approved_sellers}
          colorScheme="green"
        />
        <StatCard
          title="Rejected"
          stat={stats.rejected_verifications}
          colorScheme="red"
        />
        <StatCard
          title="Additional Info Needed"
          stat={stats.additional_info_needed}
          colorScheme="orange"
        />
      </SimpleGrid>

      <Heading size="sm" mb={3}>
        Pending by Type
      </Heading>
      <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
        <StatCard title="Identity" stat={stats.pending_identity} />
        <StatCard title="Business" stat={stats.pending_business} />
        <StatCard title="Banking" stat={stats.pending_banking} />
        <StatCard title="Tax" stat={stats.pending_tax} />
        <StatCard title="Address" stat={stats.pending_address} />
      </SimpleGrid>
    </Box>
  );
};

export default SellerVerificationStats;
