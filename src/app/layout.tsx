import type {Metadata} from 'next';import {StoreProvider} from '@/store/provider';import {CssBaseline} from '@mui/material';
export const metadata:Metadata={title:'RailRoute Optimizer',description:'Frontend-only rail logistics optimization'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body style={{margin:0}}><StoreProvider><CssBaseline/>{children}</StoreProvider></body></html>}
