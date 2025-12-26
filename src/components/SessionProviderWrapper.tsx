'use client';

import { SessionProvider } from 'next-auth/react';
import SessionSync from './SessionSync';

export default function SessionProviderWrapper({ children, session }: { children: React.ReactNode, session: any }) {
    return (
        <SessionProvider session={session}>
            <SessionSync />
            {children}
        </SessionProvider>
    );
}
