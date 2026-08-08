import type {Metadata} from 'next';import {StoreProvider} from '@/store/provider';
export const metadata:Metadata={title:'RailRoute Optimizer',description:'Frontend-only rail logistics optimization'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body style={{margin:0}}><StoreProvider>{children}</StoreProvider></body></html>}
