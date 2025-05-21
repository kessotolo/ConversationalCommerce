import "@/styles/globals.css"
import { ClerkProvider } from "@clerk/nextjs"
import type { AppProps } from "next/app"
import { useRouter } from "next/router"
import { TokenSaver } from '@/components/TokenSaver'

export default function MyApp({ Component, pageProps }: AppProps) {
  const { pathname } = useRouter()

  return (
    <ClerkProvider
      {...pageProps}
      navigate={(to) => window.history.pushState(null, "", to)}
    >
      <TokenSaver />
      <Component {...pageProps} key={pathname} />
    </ClerkProvider>
  )
}
