import { Suspense } from 'react';
import FailedOrdersPage from './page';

export default function Page() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <FailedOrdersPage />
    </Suspense>
  );
}