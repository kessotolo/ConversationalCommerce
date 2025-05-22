import { UserButton, useUser } from "@clerk/nextjs";
import { ClerkProvider } from "@clerk/nextjs";
import Link from "next/link";
import "./globals.css";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ClerkProvider>
            <html lang="en">
                <body className="font-sans">
                    <NavBar />
                    <main className="container mx-auto px-4 py-8">{children}</main>
                </body>
            </html>
        </ClerkProvider>
    );
}

function NavBar() {
    const { user, isLoaded } = useUser();

    return (
        <nav className="bg-white shadow-sm">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <Link href="/" className="text-xl font-bold text-violet-600">
                        ConversationalCommerce
                    </Link>

                    <div className="flex items-center space-x-4">
                        {isLoaded && (
                            <>
                                {user ? (
                                    <>
                                        <Link
                                            href="/dashboard"
                                            className="text-gray-600 hover:text-violet-600"
                                        >
                                            Dashboard
                                        </Link>
                                        <UserButton afterSignOutUrl="/" />
                                    </>
                                ) : (
                                    <div className="space-x-4">
                                        <Link
                                            href="/sign-in"
                                            className="text-gray-600 hover:text-violet-600"
                                        >
                                            Sign In
                                        </Link>
                                        <Link
                                            href="/sign-up"
                                            className="bg-violet-600 text-white px-4 py-2 rounded-md hover:bg-violet-700"
                                        >
                                            Sign Up
                                        </Link>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}