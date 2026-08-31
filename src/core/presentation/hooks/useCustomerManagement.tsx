import { useState, useCallback } from "react";
import { ICustomerService } from "../../domain/services/ICustomerService";
import { Customer, CustomerInteraction } from "../../domain/entities/Customer";
import {
  CreateCustomerDTO,
  CreateCustomerInteractionDTO,
  CustomerFilterDTO,
  CustomerDomainListResponseDTO,
  CustomerInteractionFilterDTO,
  CustomerInteractionListResponseDTO,
  UpdateCustomerDTO,
  UpdateCustomerInteractionDTO,
} from "../../application/dtos/CustomerDTO";
import container from "../../infrastructure/di/container";

interface UseCustomerManagementReturn {
  customers: Customer[];
  totalCustomers: number;
  page: number;
  limit: number;
  totalPages: number;
  currentCustomer: Customer | null;
  interactions: CustomerInteraction[];
  isLoading: boolean;
  error: string | null;
  createCustomer: (customerData: CreateCustomerDTO) => Promise<Customer>;
  getCustomers: (
    params?: CustomerFilterDTO
  ) => Promise<CustomerDomainListResponseDTO>;
  getCustomerById: (id: string) => Promise<Customer>;
  updateCustomer: (
    id: string,
    customerData: UpdateCustomerDTO
  ) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<boolean>;
  getInteractionsForCustomer: (
    customerId: string,
    params?: CustomerInteractionFilterDTO
  ) => Promise<CustomerInteractionListResponseDTO>;
  createCustomerInteraction: (
    customerId: string,
    payload: CreateCustomerInteractionDTO
  ) => Promise<CustomerInteraction>;
  updateCustomerInteraction: (
    customerId: string,
    id: string,
    payload: UpdateCustomerInteractionDTO
  ) => Promise<CustomerInteraction>;
  deleteCustomerInteraction: (
    customerId: string,
    id: string
  ) => Promise<boolean>;
  clearError: () => void;
  clearCurrentCustomer: () => void;
}

export function useCustomerManagement(): UseCustomerManagementReturn {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [totalPages, setTotalPages] = useState(1);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [interactions, setInteractions] = useState<CustomerInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerService =
    container.resolve<ICustomerService>("customerService");

  const applyList = (result: CustomerDomainListResponseDTO) => {
    setCustomers(result.customers);
    setTotalCustomers(result.total);
    setPage(result.page);
    setLimit(result.limit);
    setTotalPages(result.totalPages);
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearCurrentCustomer = useCallback(() => {
    setCurrentCustomer(null);
    setInteractions([]);
  }, []);

  const createCustomer = useCallback(
    async (customerData: CreateCustomerDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const customer = await customerService.createCustomer(customerData);
        setCustomers((prev) => [customer, ...prev]);
        setTotalCustomers((prev) => prev + 1);
        setCurrentCustomer(customer);
        return customer;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create customer";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const getCustomers = useCallback(
    async (params?: CustomerFilterDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await customerService.getCustomers(params);
        applyList(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch customers";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const getCustomerById = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        clearError();
        const customer = await customerService.getCustomerById(id);
        setCurrentCustomer(customer);
        return customer;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch customer";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const updateCustomer = useCallback(
    async (id: string, customerData: UpdateCustomerDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const updatedCustomer = await customerService.updateCustomer(
          id,
          customerData
        );
        setCustomers((prev) =>
          prev.map((customer) =>
            customer.id === id ? updatedCustomer : customer
          )
        );
        setCurrentCustomer((current) =>
          current?.id === id ? updatedCustomer : current
        );
        return updatedCustomer;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update customer";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const deleteCustomer = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        clearError();
        const success = await customerService.deleteCustomer(id);
        if (success) {
          setCustomers((prev) => prev.filter((customer) => customer.id !== id));
          setTotalCustomers((prev) => Math.max(0, prev - 1));
          setCurrentCustomer((current) =>
            current?.id === id ? null : current
          );
          if (currentCustomer?.id === id) {
            setInteractions([]);
          }
        }
        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete customer";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService, currentCustomer]
  );

  const getInteractionsForCustomer = useCallback(
    async (customerId: string, params?: CustomerInteractionFilterDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await customerService.getInteractionsForCustomer(
          customerId,
          params
        );
        setInteractions(result.interactions);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch interactions";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const createCustomerInteraction = useCallback(
    async (customerId: string, payload: CreateCustomerInteractionDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const created = await customerService.createCustomerInteraction(
          customerId,
          payload
        );
        setInteractions((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create interaction";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const updateCustomerInteraction = useCallback(
    async (
      customerId: string,
      id: string,
      payload: UpdateCustomerInteractionDTO
    ) => {
      try {
        setIsLoading(true);
        clearError();
        const updated = await customerService.updateCustomerInteraction(
          customerId,
          id,
          payload
        );
        setInteractions((prev) =>
          prev.map((item) => (item.id === id ? updated : item))
        );
        return updated;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update interaction";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const deleteCustomerInteraction = useCallback(
    async (customerId: string, id: string) => {
      try {
        setIsLoading(true);
        clearError();
        const success = await customerService.deleteCustomerInteraction(
          customerId,
          id
        );
        if (success) {
          setInteractions((prev) => prev.filter((item) => item.id !== id));
        }
        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete interaction";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  return {
    customers,
    totalCustomers,
    page,
    limit,
    totalPages,
    currentCustomer,
    interactions,
    isLoading,
    error,
    createCustomer,
    getCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
    getInteractionsForCustomer,
    createCustomerInteraction,
    updateCustomerInteraction,
    deleteCustomerInteraction,
    clearError,
    clearCurrentCustomer,
  };
}
