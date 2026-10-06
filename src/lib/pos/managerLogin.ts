export interface ManagerLogin {
  userId: string;
  password: string;
}

export const EMPTY_MANAGER_LOGIN: ManagerLogin = { userId: "", password: "" };

export const managerLoginFilled = (login: ManagerLogin) =>
  Boolean(login.userId.trim() && login.password);
