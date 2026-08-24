import React from 'react'
import './globals.css'
import { PermissionsProvider } from './context/PermissionsContext'

export const metadata = {
  title: 'Stayflexi v2.0 - Operations Dashboard',
  description: 'Enterprise PMS & Channel Manager GraphQL Console',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
      </head>
      <body>
        <PermissionsProvider>{children}</PermissionsProvider>
      </body>
    </html>
  )
}
