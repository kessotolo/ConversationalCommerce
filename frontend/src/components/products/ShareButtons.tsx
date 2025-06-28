import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FacebookIcon from '@mui/icons-material/Facebook';
import QrCodeIcon from '@mui/icons-material/QrCode';
import ShareIcon from '@mui/icons-material/Share';
import TwitterIcon from '@mui/icons-material/Twitter';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { MessageCircle, Send, Camera } from 'lucide-react';
import React, { useState } from 'react';

import { CardContent } from '@/components/ui/Card';
import { ConversationEventType } from '@/modules/conversation/models/event';
import { ConversationEventLogger } from '@/modules/conversation/utils/eventLogger';

// Custom TikTok icon
const TikTokIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M19.321 7.40997C17.9076 7.40997 16.6331 6.87341 15.6826 5.97845C14.732 5.08349 14.1666 3.88213 14.1666 2.54913H10.4786V15.0366C10.4786 15.3333 10.4137 15.6269 10.2878 15.8981C10.1619 16.1693 9.97787 16.4119 9.74742 16.6101C9.51697 16.8082 9.24817 16.9575 8.95846 17.0483C8.66874 17.1392 8.36425 17.1696 8.0624 17.1376C7.76055 17.1056 7.46899 17.0118 7.20642 16.8619C6.94385 16.7119 6.71628 16.5088 6.53982 16.2657C6.36335 16.0225 6.24248 15.7448 6.18641 15.453C6.13035 15.1612 6.14043 14.8614 6.21591 14.5739C6.2914 14.2864 6.43042 14.0176 6.62362 13.7851C6.81682 13.5526 7.06006 13.3612 7.33608 13.2229C7.6121 13.0846 7.91402 13.0018 8.22336 12.9797C8.5327 12.9576 8.84395 12.9967 9.13767 13.095V9.67C8.52493 9.55689 7.89403 9.58256 7.29282 9.74544C6.69161 9.90833 6.13587 10.2043 5.66449 10.6126C5.1931 11.0209 4.81769 11.5316 4.5648 12.105C4.31191 12.6783 4.18828 13.2996 4.20288 13.9253C4.21747 14.551 4.37002 15.1661 4.65029 15.7278C4.93056 16.2895 5.33035 16.7831 5.82213 17.1702C6.31391 17.5574 6.88511 17.8285 7.49538 17.9645C8.10565 18.1005 8.7396 18.0982 9.34841 17.9577C9.95722 17.8172 10.5263 17.5418 11.015 17.1511C11.5037 16.7603 11.8995 16.2638 12.1751 15.7003C12.4507 15.1368 12.5982 14.5207 12.6075 13.8949V8.3685C13.4514 9.01209 14.4353 9.41855 15.47 9.54998C16.5047 9.68141 17.5537 9.53391 18.5117 9.12139V5.72137C18.1139 5.82365 17.701 5.86045 17.2917 5.83044C16.6319 5.77941 16.0009 5.56104 15.4661 5.19994C14.9314 4.83885 14.5133 4.34809 14.2563 3.7809C14.2563 3.7809 14.6233 7.40997 19.321 7.40997Z"
      fill="currentColor"
    />
  </svg>
);

// Define types for the component
interface ShareButtonsProps {
  productId: string;
  title?: string;
  compact?: boolean;
  className?: string;
}

interface ShareResponse {
  platform: string;
  link?: string;
  utm_url?: string;
  campaign?: string;
  error?: string;
  instructions?: string;
  caption?: string;
  [key: string]: unknown;
}

const ShareButtons: React.FC<ShareButtonsProps> = ({
  productId,
  title = 'Share This Product',
  compact = false,
  className = '',
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [shareData, setShareData] = useState<Record<string, ShareResponse>>({});
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [qrSize, setQrSize] = useState<number>(10);
  const [qrWithLogo, setQrWithLogo] = useState<boolean>(true);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Platforms config
  const platforms = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: <MessageCircle />,
      color: '#25D366',
      endpoint: '/api/v1/share/whatsapp-link',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: <FacebookIcon />,
      color: '#1877F2',
      endpoint: '/api/v1/share/facebook-link',
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: <TwitterIcon />,
      color: '#1DA1F2',
      endpoint: '/api/v1/share/twitter-link',
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: <Camera />,
      color: '#E4405F',
      endpoint: '/api/v1/share/instagram-share',
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: <TikTokIcon />,
      color: '#000000',
      endpoint: '/api/v1/share/tiktok-share',
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: <Send />,
      color: '#0088cc',
      endpoint: '/api/v1/share/telegram-link',
    },
    {
      id: 'qr-code',
      name: 'QR Code',
      icon: <QrCodeIcon />,
      color: '#555555',
      endpoint: '/api/v1/share/qr-code',
    },
  ];

  // Function to get share link for a platform
  const getShareLink = async (platformId: string) => {
    if (shareData[platformId] && !shareData[platformId].error) {
      setActiveDialog(platformId);
      return;
    }

    setLoading(true);
    try {
      const platform = platforms.find((p) => p.id === platformId);
      if (!platform) throw new Error('Platform not found');

      if (platformId === 'qr-code') {
        setActiveDialog(platformId);
        setLoading(false);
        return;
      }

      const response = await fetch(`${platform.endpoint}?product_id=${productId}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      setShareData((prev) => ({
        ...prev,
        [platformId]: data,
      }));
      setActiveDialog(platformId);

      // Log the event
      ConversationEventLogger.log({
        conversation_id: undefined, // Set if available
        user_id: undefined, // Set if available
        event_type: ConversationEventType.PRODUCT_CLICKED,
        payload: {
          product_id: productId,
          platform: platformId,
          utm_url: data.utm_url,
          campaign: data.campaign,
        },
        tenant_id: '', // Set tenant_id if available
        metadata: undefined,
      });
    } catch (error) {
      console.error('Error fetching share link:', error);
      setShareData((prev) => ({
        ...prev,
        [platformId]: {
          platform: platformId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    } finally {
      setLoading(false);
    }
  };

  // Function to get all share links at once
  const getAllShareLinks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/share/all-platforms?product_id=${productId}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      setShareData(data);
    } catch (error) {
      console.error('Error fetching all share links:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to copy link to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      },
      (err) => {
        console.error('Could not copy text: ', err);
      },
    );
  };

  // Render the appropriate dialog content based on platform
  const renderDialogContent = (platformId: string) => {
    const data = shareData[platformId];

    if (!data && platformId !== 'qr-code') {
      return <CircularProgress />;
    }

    if (data?.error) {
      return <Alert severity="error">{data.error}</Alert>;
    }

    switch (platformId) {
      case 'whatsapp':
      case 'facebook':
      case 'twitter':
      case 'telegram':
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              href={data?.link || '#'}
              target="_blank"
              startIcon={platforms.find((p) => p.id === platformId)?.icon}
              sx={{ mb: 2 }}
              disabled={!data?.link}
            >
              Open in {platforms.find((p) => p.id === platformId)?.name}
            </Button>

            {data?.link && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Or copy this link:
                </Typography>

                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      p: 1,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '300px',
                    }}
                  >
                    {data.link}
                  </Typography>
                  <IconButton
                    onClick={() => copyToClipboard(data.link || '')}
                    color="primary"
                    size="small"
                  >
                    {copySuccess ? (
                      <CheckIcon fontSize="small" />
                    ) : (
                      <ContentCopyIcon fontSize="small" />
                    )}
                  </IconButton>
                </Box>
              </>
            )}
          </Box>
        );

      case 'instagram':
      case 'tiktok':
        return (
          <Box sx={{ textAlign: 'center' }}>
            {typeof data?.['profile_link'] === 'string' && data['profile_link'] && (
              <Button
                variant="contained"
                color="primary"
                href={data['profile_link']}
                target="_blank"
                startIcon={platforms.find((p) => p.id === platformId)?.icon}
                sx={{ mb: 2 }}
              >
                Open {platforms.find((p) => p.id === platformId)?.name} Profile
              </Button>
            )}

            {typeof data?.['caption'] === 'string' && data['caption'] && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Caption for your post:
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 2,
                    position: 'relative',
                  }}
                >
                  <Typography variant="body2" align="left">
                    {data['caption']}
                  </Typography>
                  <IconButton
                    onClick={() =>
                      copyToClipboard(typeof data['caption'] === 'string' ? data['caption'] : '')
                    }
                    color="primary"
                    size="small"
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    {copySuccess ? (
                      <CheckIcon fontSize="small" />
                    ) : (
                      <ContentCopyIcon fontSize="small" />
                    )}
                  </IconButton>
                </Box>
              </>
            )}

            {data && data['instructions'] && (
              <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
                <Typography variant="body2">{data && data['instructions']}</Typography>
              </Alert>
            )}
          </Box>
        );

      case 'qr-code':
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ mb: 2 }}>
              <img
                src={`/api/v1/share/qr-code?product_id=${productId}&size=${qrSize}&logo=${qrWithLogo}`}
                alt="Product QR Code"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  border: '1px solid #eee',
                  borderRadius: '4px',
                  padding: '8px',
                }}
              />
            </Box>

            <Grid container spacing={2}>
              <Grid sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2">QR Code Size:</Typography>
                <ButtonGroup size="small" sx={{ mt: 1 }}>
                  {[6, 10, 14].map((size) => (
                    <Button
                      key={size}
                      variant={qrSize === size ? 'contained' : 'outlined'}
                      onClick={() => setQrSize(size)}
                    >
                      {size < 10 ? 'S' : size < 14 ? 'M' : 'L'}
                    </Button>
                  ))}
                </ButtonGroup>
              </Grid>

              <Grid sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2">Include Logo:</Typography>
                <ButtonGroup size="small" sx={{ mt: 1 }}>
                  <Button
                    variant={qrWithLogo ? 'contained' : 'outlined'}
                    onClick={() => setQrWithLogo(true)}
                  >
                    Yes
                  </Button>
                  <Button
                    variant={!qrWithLogo ? 'contained' : 'outlined'}
                    onClick={() => setQrWithLogo(false)}
                  >
                    No
                  </Button>
                </ButtonGroup>
              </Grid>
            </Grid>

            <Button
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => {
                const img = document.createElement('a');
                img.href = `/api/v1/share/qr-code?product_id=${productId}&size=${qrSize}&logo=${qrWithLogo}`;
                img.download = `product-qr-code-${productId}.png`;
                document.body.appendChild(img);
                img.click();
                document.body.removeChild(img);
              }}
            >
              Download QR Code
            </Button>
          </Box>
        );

      default:
        return <Typography>No content available for this platform.</Typography>;
    }
  };

  // Compact view renders just icons
  if (compact) {
    return (
      <Box className={className}>
        {title && (
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {title}
          </Typography>
        )}
        <ButtonGroup size="small" variant="outlined">
          {platforms.slice(0, 4).map((platform) => (
            <IconButton
              key={platform.id}
              onClick={() => getShareLink(platform.id)}
              sx={{ color: platform.color }}
              disabled={loading}
            >
              {platform.icon}
            </IconButton>
          ))}
          <IconButton
            onClick={() => {
              getAllShareLinks();
              setActiveDialog('all');
            }}
            disabled={loading}
          >
            <ShareIcon />
          </IconButton>
        </ButtonGroup>

        {/* Dialogs */}
        <Dialog open={!!activeDialog} onClose={() => setActiveDialog(null)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {activeDialog === 'all'
              ? 'Share This Product'
              : `Share on ${platforms.find((p) => p.id === activeDialog)?.name || ''}`}
          </DialogTitle>
          <DialogContent>
            {activeDialog === 'all' ? (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {platforms.map((platform) => (
                  <Grid sx={{ display: 'flex', flexDirection: 'column' }} key={platform.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: 2,
                        },
                      }}
                      onClick={() => setActiveDialog(platform.id)}
                    >
                      <Box sx={{ textAlign: 'center' }}>
                        <CardContent>
                          <Box sx={{ color: platform.color, mb: 1 }}>{platform.icon}</Box>
                          <Typography variant="body2">{platform.name}</Typography>
                        </CardContent>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              renderDialogContent(activeDialog || '')
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setActiveDialog(null)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={copySuccess}
          autoHideDuration={2000}
          onClose={() => setCopySuccess(false)}
          message="Copied to clipboard!"
        />
      </Box>
    );
  }

  // Full view with labeled buttons
  return (
    <Box className={className}>
      {title && (
        <Typography variant="h6" sx={{ mb: 2 }}>
          {title}
        </Typography>
      )}

      <Grid container spacing={2}>
        {platforms.map((platform) => (
          <Grid sx={{ display: 'flex', flexDirection: 'column' }} key={platform.id}>
            <Button
              variant="outlined"
              startIcon={platform.icon}
              onClick={() => getShareLink(platform.id)}
              fullWidth
              sx={{
                justifyContent: 'flex-start',
                color: platform.color,
                borderColor: 'divider',
                '&:hover': {
                  borderColor: platform.color,
                  backgroundColor: `${platform.color}10`,
                },
              }}
              disabled={loading}
            >
              {platform.name}
            </Button>
          </Grid>
        ))}
      </Grid>

      {/* Dialogs */}
      <Dialog open={!!activeDialog} onClose={() => setActiveDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {activeDialog === 'all'
            ? 'Share This Product'
            : `Share on ${platforms.find((p) => p.id === activeDialog)?.name || ''}`}
        </DialogTitle>
        <DialogContent>
          {activeDialog === 'all' ? (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {platforms.map((platform) => (
                <Grid sx={{ display: 'flex', flexDirection: 'column' }} key={platform.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: 2,
                      },
                    }}
                    onClick={() => setActiveDialog(platform.id)}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <CardContent>
                        <Box sx={{ color: platform.color, mb: 1 }}>{platform.icon}</Box>
                        <Typography variant="body2">{platform.name}</Typography>
                      </CardContent>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            renderDialogContent(activeDialog || '')
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        onClose={() => setCopySuccess(false)}
        message="Copied to clipboard!"
      />
    </Box>
  );
};

export default ShareButtons;
