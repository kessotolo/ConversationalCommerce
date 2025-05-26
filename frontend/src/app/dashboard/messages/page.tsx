'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Search, 
  ChevronDown, 
  Send, 
  Image as ImageIcon, 
  MessageCircle, 
  Phone, 
  Video, 
  MoreVertical, 
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';

// Mock conversations
const mockConversations = [
  {
    id: '1',
    customerName: 'John Doe',
    phone: '+234 123 456 7890',
    lastMessage: 'Do you have this in red color?',
    unread: 2,
    timestamp: '2025-05-25T15:30:00',
    avatar: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'
  },
  {
    id: '2',
    customerName: 'Sarah Johnson',
    phone: '+234 234 567 8901',
    lastMessage: 'Thanks for the quick delivery!',
    unread: 0,
    timestamp: '2025-05-24T12:15:00',
    avatar: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'
  },
  {
    id: '3',
    customerName: 'Michael Smith',
    phone: '+234 345 678 9012',
    lastMessage: 'When will my order arrive?',
    unread: 1,
    timestamp: '2025-05-25T09:45:00',
    avatar: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'
  },
  {
    id: '4',
    customerName: 'Elizabeth Brown',
    phone: '+234 456 789 0123',
    lastMessage: 'I'd like to place an order for...',
    unread: 0,
    timestamp: '2025-05-23T16:20:00',
    avatar: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'
  }
];

// Mock messages for a selected conversation
const mockMessages = [
  {
    id: '1',
    content: 'Hello! I'm interested in your products.',
    timestamp: '2025-05-25T10:00:00',
    sender: 'customer',
    status: 'read'
  },
  {
    id: '2',
    content: 'Hi there! Thank you for your interest. How can I help you today?',
    timestamp: '2025-05-25T10:02:00',
    sender: 'store',
    status: 'read'
  },
  {
    id: '3',
    content: 'I saw your wireless earbuds. Do you have them in stock?',
    timestamp: '2025-05-25T10:05:00',
    sender: 'customer',
    status: 'read'
  },
  {
    id: '4',
    content: 'Yes, we do have the wireless earbuds in stock! They come in black, white, and blue. Which color would you prefer?',
    timestamp: '2025-05-25T10:07:00',
    sender: 'store',
    status: 'read'
  },
  {
    id: '5',
    content: 'Do you have them in red color?',
    timestamp: '2025-05-25T15:30:00',
    sender: 'customer',
    status: 'delivered'
  }
];

// Quick reply templates
const quickReplies = [
  'Thank you for your order! We'll process it right away.',
  'Your order has been shipped and should arrive within 2-3 business days.',
  'We're currently out of stock on that item. Would you like to be notified when it's back?',
  'Can I help you with anything else today?',
  'What's your delivery address?'
];

export default function MessagesPage() {
  const [conversations, setConversations] = useState(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conv => 
    conv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.phone.includes(searchTerm)
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
    setError(null);
    
    try {
      // This is where you would make a real API call
      // const response = await conversationService.getConversations();
      // setConversations(response.data);
      
      // Simulate API call with mock data
      setTimeout(() => {
        setConversations(mockConversations);
        setIsLoading(false);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch conversations');
      setIsLoading(false);
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const messageToSend = {
      id: Date.now().toString(),
      content: newMessage,
      timestamp: new Date().toISOString(),
      sender: 'store',
      status: 'sending'
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
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageToSend.id 
            ? { ...msg, status: 'sent' } 
            : msg
        )
      );
      
      // Then simulate delivered status
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageToSend.id 
              ? { ...msg, status: 'delivered' } 
              : msg
          )
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

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex h-full">
          {/* Conversations sidebar */}
          <div className="w-full sm:w-80 md:w-96 border-r flex flex-col bg-gray-50">
            <div className="p-4 border-b">
              <h1 className="text-lg font-semibold mb-4">Messages</h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    className={`w-full text-left px-4 py-3 border-b hover:bg-gray-100 flex items-start ${
                      selectedConversation === conv.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleSelectConversation(conv.id)}
                  >
                    <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-300 mr-3 flex-shrink-0">
                      {conv.avatar ? (
                        <Image src={conv.avatar} alt={conv.customerName} fill className="object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          {conv.customerName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-medium truncate">{conv.customerName}</h3>
                        <span className="text-xs text-gray-500">
                          {formatDate(conv.timestamp, 'time')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                      <p className="text-xs text-gray-500 mt-1">{conv.phone}</p>
                    </div>
                    {conv.unread > 0 && (
                      <span className="ml-2 bg-blue-500 text-white text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center">
                        {conv.unread}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No conversations found
                </div>
              )}
            </div>
          </div>

          {/* Message content area */}
          <div className="hidden sm:flex flex-col flex-1 bg-white">
            {selectedConversation ? (
              <>
                {/* Chat header */}
                <div className="px-4 py-3 border-b flex justify-between items-center bg-white">
                  <div className="flex items-center">
                    <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-300 mr-3">
                      <Image 
                        src={
                          conversations.find(c => c.id === selectedConversation)?.avatar || 
                          'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'
                        } 
                        alt="Customer" 
                        fill 
                        className="object-cover" 
                      />
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {conversations.find(c => c.id === selectedConversation)?.customerName}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {conversations.find(c => c.id === selectedConversation)?.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Voice Call">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Video Call">
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="More Options">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Messages area */}
                <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender === 'store' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-4 py-2 ${
                            message.sender === 'store'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white border border-gray-200 text-gray-800'
                          }`}
                        >
                          <p>{message.content}</p>
                          <div className="text-xs mt-1 flex justify-end items-center space-x-1">
                            <span className={message.sender === 'store' ? 'text-blue-100' : 'text-gray-500'}>
                              {formatDate(message.timestamp, 'time')}
                            </span>
                            {message.sender === 'store' && renderMessageStatus(message.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Quick replies */}
                <div className="px-4 py-2 border-t border-b bg-gray-50">
                  <p className="text-xs text-gray-500 mb-2">Quick Replies:</p>
                  <div className="flex overflow-x-auto space-x-2 pb-2">
                    {quickReplies.map((reply, index) => (
                      <button
                        key={index}
                        className="px-3 py-1 border rounded-full text-sm whitespace-nowrap hover:bg-gray-100"
                        onClick={() => insertQuickReply(reply)}
                      >
                        {reply.length > 30 ? reply.substring(0, 30) + '...' : reply}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message input */}
                <div className="p-4 border-t bg-white">
                  <div className="flex">
                    <Button variant="ghost" size="sm" className="h-10 w-10 p-0 mr-2" title="Attach Image">
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                    <input
                      type="text"
                      placeholder="Type a message..."
                      className="flex-1 border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <Button
                      className="ml-2 h-10 w-10 p-0 rounded-full"
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <MessageCircle className="h-16 w-16 mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Your Conversations</h3>
                <p className="text-center max-w-md mb-6">
                  Select a conversation from the list to view messages and reply to your customers.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
