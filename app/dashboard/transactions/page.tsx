import { redirect } from 'next/navigation';

export default function TransactionsRedirectPage({ searchParams }: { searchParams: { orderId?: string } }) {
  const orderId = searchParams?.orderId;
  const target = `/dashboard?section=transactions${orderId ? `&orderId=${orderId}` : ''}`;
  return redirect(target);
}
