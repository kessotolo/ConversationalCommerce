'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
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
  MessageCircle,
} from 'lucide-react';

// Mock conversations
const mockConversations = [
  {
    id: '1',
    customerName: 'John Doe',
    phone: '+234 123 456 7890',
    lastMessage: 'Do you have this in red color?',
    unread: 2,
    timestamp: '2025-05-25T15:30:00',
    avatar: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
    orderId: 'ORD-001',
    orderStatus: 'processing', // mock order status
  },
  {
    id: '2',
    customerName: 'Sarah Johnson',
    phone: '+234 234 567 8901',
    lastMessage: 'Thanks for the quick delivery!',
    unread: 0,
    timestamp: '2025-05-24T12:15:00',
    avatar: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
    orderId: 'ORD-002',
    orderStatus: 'delivered',
  },
  {
    id: '3',
    customerName: 'Michael Smith',
    phone: '+234 345 678 9012',
    lastMessage: 'When will my order arrive?',
    unread: 1,
    timestamp: '2025-05-25T09:45:00',
    avatar: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
    orderId: 'ORD-003',
    orderStatus: 'pending',
  },
  {
    id: '4',
    customerName: 'Elizabeth Brown',
    phone: '+234 456 789 0123',
    lastMessage: "I'd like to place an order for...",
    unread: 0,
    timestamp: '2025-05-23T16:20:00',
    avatar: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
    orderId: null,
    orderStatus: null,
  },
];

// Mock messages for a selected conversation
const mockMessages = [
  {
    id: '1',
    content: "Hello! I'm interested in your products.",
    timestamp: '2025-05-25T10:00:00',
    sender: 'customer',
    status: 'read',
  },
  {
    id: '2',
    content: 'Hi there! Thank you for your interest. How can I help you today?',
    timestamp: '2025-05-25T10:02:00',
    sender: 'store',
    status: 'read',
  },
  {
    id: '3',
    content: 'I saw your wireless earbuds. Do you have them in stock?',
    timestamp: '2025-05-25T10:05:00',
    sender: 'customer',
    status: 'read',
  },
  {
    id: '4',
    content:
      'Yes, we do have the wireless earbuds in stock! They come in black, white, and blue. Which color would you prefer?',
    timestamp: '2025-05-25T10:07:00',
    sender: 'store',
    status: 'read',
  },
  {
    id: '5',
    content: 'Do you have them in red color?',
    timestamp: '2025-05-25T15:30:00',
    sender: 'customer',
    status: 'delivered',
  },
];

// Quick reply templates
const quickReplies = [
  "Thank you for your order! We'll process it right away.",
  'Your order has been shipped and should arrive within 2-3 business days.',
  "We're currently out of stock on that item. Would you like to be notified when it's back?",
  'Can I help you with anything else today?',
  "What's your delivery address?",
];

export default function MessagesPage() {
  const [conversations, setConversations] = useState(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(
    (conv) =>
      conv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.phone.includes(searchTerm),
  );

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Fetch conversations with API integration structure
  const fetchConversations = async () => {
    setIsLoading(true);

    try {
      // This is where you would make a real API call
      // const response = await conversationService.getConversations();
      // setConversations(response.data);

      // Simulate API call with mock data
      setTimeout(() => {
        setConversations(mockConversations);
        setIsLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setIsLoading(false);
    }
  };

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Send a new message
  const sendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const messageToSend = {
      id: Date.now().toString(),
      content: newMessage,
      timestamp: new Date().toISOString(),
      sender: 'store',
      status: 'sending',
    };

    // Add message to UI immediately
    setMessages([...messages, messageToSend]);
    setNewMessage('');

    // This is where you would make a real API call
    // try {
    //   await messageService.sendMessage(selectedConversation, newMessage);
    //   // Update message status to sent
    // } catch (error) {
    //   // Handle error, maybe mark message as failed
    // }

    // Simulate API call for message delivery status
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageToSend.id ? { ...msg, status: 'sent' } : msg)),
      );

      // Then simulate delivered status
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageToSend.id ? { ...msg, status: 'delivered' } : msg)),
        );
      }, 1000);
    }, 1500);
  };

  // Handle conversation selection
  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    // In a real app, you would fetch messages for this conversation
    // For now, we'll just use the mock messages
  };

  // Insert quick reply
  const insertQuickReply = (reply: string) => {
    // Set the message input value to the quick reply text
    setNewMessage(reply);
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

  // Helper: get selected conversation object
  const selectedConvObj = conversations.find(
    (c: (typeof mockConversations)[0]) => c.id === selectedConversation,
  );
  // Helper: get last message date
  const lastMsgDate =
    messages.length > 0 ? new Date(messages[messages.length - 1].timestamp) : null;
  // Helper: is expired (order closed or >2 weeks old)
  const isOrderClosed =
    selectedConvObj &&
    (selectedConvObj.orderStatus === 'delivered' || selectedConvObj.orderStatus === 'cancelled');
  const isMsgTooOld = lastMsgDate
    ? Date.now() - lastMsgDate.getTime() > 14 * 24 * 60 * 60 * 1000
    : false;
  const isExpired = !!isOrderClosed || isMsgTooOld;

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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conv: (typeof mockConversations)[0]) => (
                <button
                  key={conv.id}
                  className={`w-full text-left px-4 py-3 border-b flex items-start rounded-none transition-all duration-150 ${selectedConversation === conv.id ? 'bg-[#e8f6f1] border-l-4 border-[#6C9A8B]' : 'hover:bg-gray-100'}`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-300 mr-3 flex-shrink-0 border border-[#e6f0eb]">
                    {conv.avatar ? (
                      <Image
                        src={conv.avatar}
                        alt={conv.customerName}
                        width={48}
                        height={48}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full bg-[#e6f0eb] text-[#6C9A8B]">
                        {conv.customerName.charAt(0)}
                      </div>
                    )}
                    {conv.unread > 0 && (
                      <div className="absolute -bottom-1 -right-1 bg-[#6C9A8B] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {conv.unread}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <h3 className="font-medium truncate">{conv.customerName}</h3>
                      <span className="text-xs text-gray-500">{formatDate(conv.timestamp)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Phone className="h-3 w-3 mr-1" />
                      <span className="truncate">{conv.phone}</span>
                    </div>
                    <p className="text-sm truncate mt-1">{conv.lastMessage}</p>
                    {conv.orderId && (
                      <div className="mt-1 text-xs">
                        <span className="bg-[#f0f7f4] text-[#6C9A8B] px-2 py-0.5 rounded">
                          {conv.orderId}
                        </span>
                        <span
                          className={`ml-2 px-2 py-0.5 rounded ${conv.orderStatus === 'delivered'
                            ? 'bg-green-100 text-green-800'
                            : conv.orderStatus === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                            }`}
                        >
                          {conv.orderStatus}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <p>No conversations found</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="hidden sm:flex flex-col flex-1 bg-white">
          {selectedConversation ? (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b flex justify-between items-center bg-white">
                <div className="flex items-center">
                  <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-300 mr-3 border border-[#e6f0eb]">
                    {selectedConvObj?.avatar ? (
                      <Image
                        src={selectedConvObj.avatar}
                        alt={selectedConvObj.customerName}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full bg-[#e6f0eb] text-[#6C9A8B]">
                        {selectedConvObj?.customerName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{selectedConvObj?.customerName}</h3>
                    <div className="flex items-center text-xs text-gray-500">
                      <Phone className="h-3 w-3 mr-1" />
                      <span>{selectedConvObj?.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="flex">
                  <Button
                    className="h-8 w-8 p-0 mr-2 btn-ghost"
                    title="Video Call"
                    disabled={isExpired}
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button className="h-8 w-8 p-0 btn-ghost" title="More Actions">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Order status alert */}
              {selectedConvObj?.orderId && (
                <div
                  className={`px-4 py-2 text-sm ${selectedConvObj.orderStatus === 'delivered'
                    ? 'bg-green-100'
                    : selectedConvObj.orderStatus === 'processing'
                      ? 'bg-blue-100'
                      : 'bg-yellow-100'
                    }`}
                >
                  Order {selectedConvObj.orderId} is{' '}
                  <span className="font-medium">{selectedConvObj.orderStatus}</span>
                </div>
              )}

              {/* Message area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f7faf9]">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'store' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-2 ${msg.sender === 'store'
                        ? 'bg-[#6C9A8B] text-white rounded-tr-none'
                        : 'bg-white border rounded-tl-none'
                        }`}
                    >
                      <p>{msg.content}</p>
                      <div
                        className={`text-xs mt-1 flex justify-end items-center gap-1 ${msg.sender === 'store' ? 'text-[#e6f0eb]' : 'text-gray-500'
                          }`}
                      >
                        {formatDate(msg.timestamp, 'time')}
                        {msg.sender === 'store' && renderMessageStatus(msg.status)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick replies */}
              {!isExpired && (
                <div className="bg-white border-t px-4 py-2">
                  <p className="text-xs text-gray-500 mb-2">Quick replies:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply, index) => (
                      <button
                        key={index}
                        onClick={() => insertQuickReply(reply)}
                        className="bg-[#f0f7f4] hover:bg-[#e8f6f1] text-[#6C9A8B] text-xs px-3 py-1 rounded-full"
                      >
                        {reply.length > 30 ? reply.substring(0, 30) + '...' : reply}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message input */}
              {isExpired ? (
                <div className="p-4 border-t bg-gray-100">
                  <div className="bg-yellow-100 text-yellow-800 p-3 rounded-lg text-sm">
                    This conversation is no longer active. The order is complete or the
                    conversation has expired.
                  </div>
                </div>
              ) : (
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
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center bg-white">
              <MessageCircle className="w-16 h-16 text-[#e6f0eb] mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-gray-700">
                No conversation selected
              </h2>
              <p className="text-gray-500 max-w-md">
                Select a conversation from the list to start messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
