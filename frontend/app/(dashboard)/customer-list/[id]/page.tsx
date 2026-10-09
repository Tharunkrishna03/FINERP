import CustomerAccountsPage from "@/features/customers/components/CustomerAccountsPage";

export default async function CustomerAccountsRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerAccountsPage profileId={id} />;
}
