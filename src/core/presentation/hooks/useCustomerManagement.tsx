import { useState, useCallback } from "react";
import { ICustomerService } from "../../domain/services/ICustomerService";
import { Customer } from "../../domain/entities/Customer";
import {
  CreateCustomerDTO,
  UpdateCustomerDTO,
  CustomerFilterDTO,
  CustomerDomainListResponseDTO,
} from "../../application/dtos/CustomerDTO";
import container from "../../infrastructure/di/container";

interface UseCustomerManagementReturn {
  customers: Customer[];
  totalCustomers: number;
  currentCustomer: Customer | null;
  isLoading: boolean;
  error: string | null;
  createCustomer: (customerData: CreateCustomerDTO) => Promise<Customer>;
  getCustomers: (
    params?: CustomerFilterDTO
  ) => Promise<CustomerDomainListResponseDTO>;
  getAllCustomers: () => Promise<Customer[]>;
  getCustomerById: (id: number) => Promise<Customer>;
  updateCustomer: (
    id: number,
    customerData: UpdateCustomerDTO
  ) => Promise<Customer>;
  deleteCustomer: (id: number) => Promise<boolean>;
  searchCustomers: (
    query: string,
    take?: number,
    skip?: number
  ) => Promise<CustomerDomainListResponseDTO>;
  clearError: () => void;
}

/**
 * Example presentation hook.
 * UI pages should depend on this hook, not on repositories.
 */
export function useCustomerManagement(): UseCustomerManagementReturn {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerService =
    container.resolve<ICustomerService>("customerService");

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const createCustomer = useCallback(
    async (customerData: CreateCustomerDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const customer = await customerService.createCustomer(customerData);
        setCustomers((prev) => [customer, ...prev]);
        setTotalCustomers((prev) => prev + 1);
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
        setCustomers(result.customers);
        setTotalCustomers(result.total);
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

  const getAllCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      clearError();
      const allCustomers = await customerService.getAllCustomers();
      setCustomers(allCustomers);
      setTotalCustomers(allCustomers.length);
      return allCustomers;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch all customers";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [clearError, customerService]);

  const getCustomerById = useCallback(
    async (id: number) => {
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
    async (id: number, customerData: UpdateCustomerDTO) => {
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
        if (currentCustomer?.id === id) {
          setCurrentCustomer(updatedCustomer);
        }
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
    [clearError, customerService, currentCustomer]
  );

  const deleteCustomer = useCallback(
    async (id: number) => {
      try {
        setIsLoading(true);
        clearError();
        const success = await customerService.deleteCustomer(id);
        if (success) {
          setCustomers((prev) => prev.filter((customer) => customer.id !== id));
          setTotalCustomers((prev) => prev - 1);
          if (currentCustomer?.id === id) {
            setCurrentCustomer(null);
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

  const searchCustomers = useCallback(
    async (query: string, take?: number, skip?: number) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await customerService.searchCustomers(query, take, skip);
        setCustomers(result.customers);
        setTotalCustomers(result.total);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to search customers";
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
    currentCustomer,
    isLoading,
    error,
    createCustomer,
    getCustomers,
    getAllCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
    searchCustomers,
    clearError,
  };
}
