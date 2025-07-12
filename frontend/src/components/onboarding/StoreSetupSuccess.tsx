import React from 'react';
import { CheckCircle, Store, ArrowRight, MessageCircle, Globe, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StoreSetupSuccessProps {
    storeName: string;
    subdomain: string;
    onContinue: () => void;
}

export default function StoreSetupSuccess({ storeName, subdomain, onContinue }: StoreSetupSuccessProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f7faf9] to-[#e6f0eb] px-4 py-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-full">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">🎉 Store Created Successfully!</h1>
                    </div>
                    <p className="text-gray-600 text-lg">Your store is ready to start selling</p>
                </div>

                {/* Success Card */}
                <Card className="w-full shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="text-center pb-6">
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                                <CheckCircle className="w-10 h-10 text-white" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold text-gray-900">
                            Welcome to {storeName}!
                        </CardTitle>
                        <p className="text-gray-600 mt-3 text-lg">
                            Your conversational commerce store is now live and ready for customers.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Store Details */}
                        <div className="bg-gradient-to-r from-[#f7faf9] to-[#e6f0eb] rounded-xl p-6 border border-[#e6f0eb]">
                            <h3 className="font-semibold text-gray-900 mb-4 text-lg flex items-center gap-2">
                                <Store className="w-5 h-5 text-[#6C9A8B]" />
                                Your Store Details
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                                    <span className="text-gray-600 font-medium">Store Name:</span>
                                    <span className="font-semibold text-gray-900">{storeName}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                                    <span className="text-gray-600 font-medium flex items-center gap-2">
                                        <Globe className="w-4 h-4" />
                                        Store URL:
                                    </span>
                                    <span className="font-mono font-semibold text-[#6C9A8B]">
                                        {subdomain}.enwhe.io
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                                    <span className="text-gray-600 font-medium flex items-center gap-2">
                                        <MessageCircle className="w-4 h-4" />
                                        WhatsApp Support:
                                    </span>
                                    <span className="font-semibold text-green-600">
                                        Enabled
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Next Steps */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                            <h3 className="font-semibold text-blue-900 mb-4 text-lg">🚀 What's Next?</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100">
                                    <div className="w-8 h-8 bg-[#6C9A8B] rounded-full flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">1</span>
                                    </div>
                                    <span className="font-medium text-blue-900">Add your first products</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100">
                                    <div className="w-8 h-8 bg-[#6C9A8B] rounded-full flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">2</span>
                                    </div>
                                    <span className="font-medium text-blue-900">Customize your storefront</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100">
                                    <div className="w-8 h-8 bg-[#6C9A8B] rounded-full flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">3</span>
                                    </div>
                                    <span className="font-medium text-blue-900">Set up payment methods</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100">
                                    <div className="w-8 h-8 bg-[#6C9A8B] rounded-full flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">4</span>
                                    </div>
                                    <span className="font-medium text-blue-900">Start selling on WhatsApp</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="flex justify-center pt-6">
                            <Button
                                onClick={onContinue}
                                className="flex items-center gap-3 h-14 px-10 text-lg font-semibold bg-gradient-to-r from-[#6C9A8B] to-[#5d8a7b] hover:from-[#5d8a7b] hover:to-[#4e7a6a] text-white shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                                Go to Dashboard
                                <ArrowRight className="w-5 h-5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>
                        Need help? Check out our{' '}
                        <a href="/docs" className="text-[#6C9A8B] hover:underline font-medium">
                            Getting Started Guide
                        </a>{' '}
                        or{' '}
                        <a href="/support" className="text-[#6C9A8B] hover:underline font-medium">
                            contact support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}