import { jwtDecode } from "jwt-decode";

export const setToken = (token) => localStorage.setItem("token", token);
export const getToken = () => localStorage.getItem("token");
export const removeToken = () => localStorage.removeItem("token");

export const getUser = () => {
  try {
    const token = getToken();
    return jwtDecode(token).sub;
  } catch {
    return null;
  }
};

export const getUsername = () => {
  const token = getToken();
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    return decoded.sub || null;
  } catch {
    return null;
  }
};

