export interface CustomerData {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Example domain entity.
 * Copy this pattern when adding a new business resource.
 */
export class Customer {
  public id: number;
  public name: string;
  public phone: string;
  public email: string;
  public address: string;
  public createdAt: string;
  public updatedAt: string;

  [key: string]: unknown;

  constructor(
    data: CustomerData | Partial<CustomerData> | Record<string, unknown>
  ) {
    if (!data) {
      throw new Error("Customer data is required");
    }

    const getProperty = (
      obj: Record<string, unknown>,
      key: string,
      defaultValue: unknown
    ) => (obj[key] !== undefined ? obj[key] : defaultValue);

    const record = data as Record<string, unknown>;

    this.id = Number(getProperty(record, "id", 0));
    this.name = String(getProperty(record, "name", ""));
    this.phone = String(getProperty(record, "phone", ""));
    this.email = String(getProperty(record, "email", ""));
    this.address = String(getProperty(record, "address", ""));
    this.createdAt = String(
      getProperty(record, "createdAt", new Date().toISOString())
    );
    this.updatedAt = String(
      getProperty(record, "updatedAt", new Date().toISOString())
    );
  }

  isValid(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;

    return (
      !!this.id &&
      !!this.name &&
      !!this.phone &&
      phoneRegex.test(this.phone) &&
      !!this.email &&
      emailRegex.test(this.email) &&
      !!this.address
    );
  }
}
