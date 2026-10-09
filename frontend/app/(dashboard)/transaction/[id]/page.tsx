import TransactionPassbook from "@/features/transactions/components/TransactionPassbook";

export default async function PassbookPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <TransactionPassbook id={resolvedParams.id} />;
}
