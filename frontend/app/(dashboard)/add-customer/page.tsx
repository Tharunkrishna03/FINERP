import CustomerProfileForm from "@/features/customers/components/CustomerProfileForm";
import Loader from "@/components/ui/Loader";
import { Suspense } from "react";

export default function AddCustomerPage() {
  return (
    <Suspense fallback={<Loader />}>
      <CustomerProfileForm />
    </Suspense>
  );
}
