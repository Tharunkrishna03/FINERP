import { fetchApi } from "@/services/api/client";
import { Customer } from "../types/customer.types";

export const customerService = {
  getCustomers: async (): Promise<Customer[]> => {
    const res = await fetchApi("/customers/");
    if (!res.ok) throw new Error("Failed to fetch customers");
    return res.json();
  },

  getCustomerById: async (id: number | string): Promise<Customer> => {
    const res = await fetchApi(`/customers/${id}/`);
    if (!res.ok) throw new Error("Failed to fetch customer details");
    return res.json();
  },

  createCustomer: async (data: FormData): Promise<Customer> => {
    const res = await fetchApi("/api/customers/", {
      method: "POST",
      body: data,
    });
    if (!res.ok) throw new Error("Failed to create customer");
    return res.json();
  },

  updateCustomer: async (id: number | string, data: Partial<Customer>): Promise<Customer> => {
    const res = await fetchApi(`/customers/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update customer");
    return res.json();
  },

  deleteCustomer: async (id: number | string): Promise<void> => {
    const res = await fetchApi(`/customers/${id}/`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete customer");
  },
};
