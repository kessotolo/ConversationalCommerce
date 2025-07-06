'use client';

import { useUser, useOrganization } from '@clerk/nextjs';
import {
  Check,
  Phone,
  Clock,
  CheckCheck,
  Search,
  Video,
  MoreVertical,
  ImageIcon,
  Send,
} from 'lucide-react';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { ConversationEventLogger } from '@/modules/conversation/utils/eventLogger';
import { ConversationEventType } from '@/modules/conversation/models/event';
import type { ConversationEvent } from '@/modules/conversation/models/event';

// Helper to safely extract tenantId from user or organization
function getTenantId(user: unknown, organization: { id?: string } | null): string | undefined {
  if (organization && typeof organization.id === 'string') return organization.id;
  if (user && typeof user === 'object' && user !== null) {
    if ('tenantId' in user && typeof (user as Record<string, unknown>)['tenantId'] === 'string') {
      return (user as Record<string, unknown>)['tenantId'] as string;
    }
    if (
      'publicMetadata' in user &&
      typeof user.publicMetadata === 'object' &&
      user.publicMetadata !== null &&
      'tenantId' in user.publicMetadata &&
      typeof user.publicMetadata.tenantId === 'string'
    ) {
      return user.publicMetadata.tenantId;
    }
  }
  return undefined;
}

// Helper to extract display fields from ConversationEvent
function getConversationDisplayFields(event: ConversationEvent) {
  const payload = event.payload ?? {};
  return {
    id: event.conversation_id || event.id,
    customerName:
      typeof payload['customerName'] === 'string'
        ? payload['customerName']
        : ((payload['name'] as string) ?? ''),
    phone: typeof payload['phone'] === 'string' ? payload['phone'] : '',
    lastMessage: typeof payload['lastMessage'] === 'string' ? payload['lastMessage'] : '',
    unread: typeof payload['unread'] === 'number' ? payload['unread'] : 0,
    timestamp: event.created_at,
    avatar: typeof payload['avatar'] === 'string' ? payload['avatar'] : undefined,
    orderId: typeof payload['orderId'] === 'string' ? payload['orderId'] : undefined,
    orderStatus: typeof payload['orderStatus'] === 'string' ? payload['orderStatus'] : undefined,
  };
}

function isValidDate(d: unknown): d is Date {
  return d instanceof Date && !isNaN(d.getTime());
}

export default function MessagesPage() {
  const { user } = useUser();
  const { organization } = useOrganization();

  // Use Clerk user ID and organization (tenant) ID
  // Fallback to user publicMetadata.tenantId if not in an organization
  const currentUserId = user?.id;
  const tenantId = getTenantId(user, organization ?? null);

  // --- State ---
  const [conversations, setConversations] = useState<ConversationEvent[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationEvent[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevConversationRef = useRef<string | null>(null);

  // Filter conversations based on search term
  const filteredConversations = conversations.filter((conv) => {
    const { customerName, phone } = getConversationDisplayFields(conv);
    return (
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) || phone.includes(searchTerm)
    );
  });

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // --- Fetch conversations ---
  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/conversations');
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const data: ConversationEvent[] = await res.json();
      setConversations(data);
    } catch (err) {
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Log user_left when switching conversations or unmounting
  useEffect(() => {
    return () => {
      if (
        prevConversationRef.current &&
        typeof currentUserId === 'string' &&
        typeof tenantId === 'string'
      ) {
        ConversationEventLogger.log({
          conversation_id: prevConversationRef.current,
          user_id: currentUserId,
          event_type: ConversationEventType.USER_LEFT,
          payload: {},
          tenant_id: tenantId,
          metadata: {},
        });
      }
    };
  }, [currentUserId, tenantId]);

  // Log user_left when switching conversations
  useEffect(() => {
    if (
      prevConversationRef.current &&
      prevConversationRef.current !== selectedConversation &&
      typeof currentUserId === 'string' &&
      typeof tenantId === 'string'
    ) {
      ConversationEventLogger.log({
        conversation_id: prevConversationRef.current,
        user_id: currentUserId,
        event_type: ConversationEventType.USER_LEFT,
        payload: {},
        tenant_id: tenantId,
        metadata: {},
      });
    }
    prevConversationRef.current = selectedConversation;
  }, [selectedConversation, currentUserId, tenantId]);

  // Helper: get selected conversation object
  const selectedConvObj = conversations.find(
    (c) => (c.conversation_id || c.id) === selectedConversation,
  );
  const selectedConvDisplay = selectedConvObj
    ? getConversationDisplayFields(selectedConvObj)
    : null;
  // Helper: get last message date
  // Use optional chaining and last array element access for type safety
  const lastMsgDate = messages.length > 0
    ? new Date(messages.at(-1)?.created_at ?? Date.now())
    : null;
  // Helper: is expired (order closed or >2 weeks old)
  let isOrderClosed = false;
  if (selectedConvDisplay && typeof selectedConvDisplay.orderStatus === 'string') {
    isOrderClosed =
      selectedConvDisplay.orderStatus === 'delivered' ||
      selectedConvDisplay.orderStatus === 'cancelled';
  }
  const isMsgTooOld = (() => {
    // Using assertion-based narrowing with type predicate
    if (lastMsgDate && isValidDate(lastMsgDate)) {
      // We've established lastMsgDate is a valid Date with non-NaN timestamp
      return Date.now() - lastMsgDate.getTime() > 14 * 24 * 60 * 60 * 1000;
    }
    return false;
  })();
  const isExpired = !!isOrderClosed || isMsgTooOld;

  // Log conversation_closed when a conversation expires
  useEffect(() => {
    if (
      isExpired &&
      selectedConversation &&
      typeof currentUserId === 'string' &&
      typeof tenantId === 'string'
    ) {
      ConversationEventLogger.log({
        conversation_id: selectedConversation,
        user_id: currentUserId,
        event_type: ConversationEventType.CONVERSATION_CLOSED,
        payload: { reason: 'expired' },
        tenant_id: tenantId,
        metadata: {},
      });
    }
    // Only run when isExpired or selectedConversation changes
  }, [isExpired, selectedConversation, currentUserId, tenantId]);

  // Send a new message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    // Log the event
    if (typeof currentUserId === 'string' && typeof tenantId === 'string') {
      ConversationEventLogger.log({
        conversation_id: selectedConversation,
        user_id: currentUserId,
        event_type: ConversationEventType.MESSAGE_SENT,
        payload: { content: newMessage },
        tenant_id: tenantId,
        metadata: {},
      });
    }

    // This is where you would make a real API call
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: selectedConversation,
          content: newMessage,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data: ConversationEvent = await response.json();
      setMessages((prev) => [...prev, data]);
    } catch (error) {
      // Handle error, maybe mark message as failed
    }
  };

  // Handle conversation selection
  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    // Log user joined event
    if (typeof currentUserId === 'string' && typeof tenantId === 'string') {
      ConversationEventLogger.log({
        conversation_id: id,
        user_id: currentUserId, // Clerk user ID
        event_type: ConversationEventType.USER_JOINED,
        payload: {},
        tenant_id: tenantId, // Clerk org or user publicMetadata tenantId
        metadata: {},
      });
    }
    // In a real app, you would fetch messages for this conversation
    // For now, we'll just use the mock messages
  };

  // Render message status icon
  const renderMessageStatus = (status: string) => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-gray-400" />;
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  // Before rendering, define:
  const displayInitial = selectedConvDisplay && selectedConvDisplay.customerName ? selectedConvDisplay.customerName.charAt(0) : '?';
  const selectedConvInitial = selectedConvDisplay && selectedConvDisplay.customerName ? selectedConvDisplay.customerName.charAt(0) : '?';

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex h-full bg-[#f7faf9] rounded-2xl shadow-sm border border-[#e6f0eb] overflow-hidden">
        {/* Conversations sidebar */}
        <div className="w-full sm:w-80 md:w-96 border-r flex flex-col bg-[#f7faf9]">
          <div className="p-4 border-b bg-white">
            <h1 className="text-lg font-semibold mb-4">Messages</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C9A8B] bg-[#f7faf9]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const display = getConversationDisplayFields(conv);
                return (
                  <button
                    key={display.id}
                    className={`w-full text-left px-4 py-3 border-b flex items-start rounded-none transition-all duration-150 ${selectedConversation === display.id ? 'bg-[#e8f6f1] border-l-4 border-[#6C9A8B]' : 'hover:bg-gray-100'}`}
                    onClick={() => handleSelectConversation(display.id)}
                  >
                    <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-300 mr-3 flex-shrink-0 border border-[#e6f0eb]">
                      {display.avatar ? (
                        <Image
                          src={display.avatar}
                          alt={display.customerName}
                          width={48}
                          height={48}
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full w-full text-gray-500">
                          {displayInitial}
                        </div>
                      )}
                      {display.unread > 0 && (
                        <div className="absolute -bottom-1 -right-1 bg-[#6C9A8B] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {display.unread}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <h3 className="font-medium truncate">{display.customerName}</h3>
                        <span className="text-xs text-gray-500">
                          {display.timestamp ? formatDate(display.timestamp) : ''}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Phone className="h-3 w-3 mr-1" />
                        <span className="truncate">{display.phone}</span>
                      </div>
                      <p className="text-sm truncate mt-1">{display.lastMessage}</p>
                      {display.orderId && (
                        <div className="mt-1 text-xs">
                          <span className="bg-[#f0f7f4] text-[#6C9A8B] px-2 py-0.5 rounded">
                            {display.orderId}
                          </span>
                          {display.orderStatus && (
                            <span
                              className={`ml-2 px-2 py-0.5 rounded ${display.orderStatus === 'delivered'
                                ? 'bg-green-100 text-green-800'
                                : display.orderStatus === 'processing'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                                }`}
                            >
                              {display.orderStatus}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="flex justify-center items-center h-32">
                <p className="text-gray-500">No conversations found.</p>
              </div>
            )}
          </div>
        </div>
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          {selectedConvDisplay ? (
            <div className="p-4 border-b flex items-center bg-white">
              <div className="flex items-center">
                <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-300 mr-3 border border-[#e6f0eb]">
                  {selectedConvDisplay.avatar ? (
                    <Image
                      src={selectedConvDisplay.avatar}
                      alt={selectedConvDisplay.customerName}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full text-gray-500">
                      {selectedConvInitial}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium">{selectedConvDisplay.customerName}</h3>
                  <div className="flex items-center text-xs text-gray-500">
                    <Phone className="h-3 w-3 mr-1" />
                    <span>{selectedConvDisplay.phone}</span>
                  </div>
                </div>
              </div>
              <div className="flex ml-auto">
                <Button className="h-8 w-8 p-0 mr-2 btn-ghost" title="Video Call">
                  <Video className="h-4 w-4" />
                </Button>
                <Button className="h-8 w-8 p-0 btn-ghost" title="More Actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f7faf9]">
            {messages.map((msg) => {
              if (!msg) return null;
              const payload = msg.payload ?? {};
              const content = typeof payload['content'] === 'string' ? payload['content'] : '';
              const sender =
                typeof payload['sender'] === 'string'
                  ? payload['sender']
                  : msg.event_type === ConversationEventType.MESSAGE_SENT
                    ? 'store'
                    : 'customer';
              const status = typeof payload['status'] === 'string' ? payload['status'] : '';
              return (
                <div
                  key={msg.id}
                  className={`flex ${sender === 'store' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-2 ${sender === 'store'
                      ? 'bg-[#6C9A8B] text-white rounded-tr-none'
                      : 'bg-white border rounded-tl-none'
                      }`}
                  >
                    <p>{content}</p>
                    <div
                      className={`text-xs mt-1 flex justify-end items-center gap-1 ${sender === 'store' ? 'text-[#e6f0eb]' : 'text-gray-500'
                        }`}
                    >
                      {formatDate(msg.created_at)}
                      {sender === 'store' && renderMessageStatus(status)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          {/* Message input */}
          <div className="p-4 border-t bg-white">
            <div className="flex">
              <Button className="h-10 w-10 p-0 mr-2" title="Attach Image">
                <ImageIcon className="h-5 w-5" />
              </Button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 border rounded-l-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#6C9A8B]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="bg-[#6C9A8B] hover:bg-[#5a8676] text-white rounded-l-none"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
