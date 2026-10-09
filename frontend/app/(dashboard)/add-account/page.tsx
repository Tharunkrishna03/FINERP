import AddCustomerAccountForm from "@/features/customers/components/AddCustomerAccountForm";
import Loader from "@/components/ui/Loader";
import { Suspense } from "react";

export default function AddAccountPage() {
  return (
    <Suspense fallback={<Loader />}>
      <AddCustomerAccountForm />
    </Suspense>
  );
}
