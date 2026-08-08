'use client';

import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import('@/components/Dashboard'), {
  ssr: false,
  loading: () => <main>Загрузка приложения…</main>,
});

export default function Page() {
  return <Dashboard />;
}
