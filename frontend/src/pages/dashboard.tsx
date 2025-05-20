import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs'

export default function Dashboard() {
    return (
        <>
            <SignedIn>
                <h1 className="text-xl font-bold">Welcome to your dashboard 🎯</h1>
            </SignedIn>
            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>
        </>
    )
}
