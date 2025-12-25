import React, { createContext, useReducer, useEffect } from 'react';
import * as authApi from '../api/auth';

const initialState = {
  token: localStorage.getItem('token'),
  isAuthenticated: null,
  loading: true,
  user: null
};

export const AuthContext = createContext(initialState);

const authReducer = (state, action) => {
  const { type, payload } = action;
  switch (type) {
    case 'USER_LOADED':
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: payload
      };
    case 'REGISTER_SUCCESS':
    case 'LOGIN_SUCCESS':
      // localStorage.setItem('token', payload.token); // Removed side effect
      return {
        ...state,
        ...payload,
        isAuthenticated: true,
        loading: false
      };
    case 'REGISTER_FAIL':
    case 'AUTH_ERROR':
    case 'LOGIN_FAIL':
    case 'LOGOUT':
      // localStorage.removeItem('token'); // Removed side effect
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        loading: false,
        user: null
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const res = await authApi.loadUser();
      dispatch({
        type: 'USER_LOADED',
        payload: res.data
      });
    } catch (err) {
      dispatch({
        type: 'AUTH_ERROR'
      });
      // Ensure token is removed if invalid
      localStorage.removeItem('token');
    }
  };

  const register = async ({ name, email, password }) => {
    try {
      const res = await authApi.register({ name, email, password });

      // Set token immediately
      localStorage.setItem('token', res.data.token);

      dispatch({
        type: 'REGISTER_SUCCESS',
        payload: res.data
      });

      await loadUser();
    } catch (err) {
      localStorage.removeItem('token'); // Cleanup on fail
      dispatch({
        type: 'REGISTER_FAIL'
      });
    }
  };

  const login = async (email, password) => {
    try {
      const res = await authApi.login({ email, password });

      // Set token immediately before dispatching or loading user
      localStorage.setItem('token', res.data.token);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: res.data
      });

      await loadUser();
    } catch (err) {
      localStorage.removeItem('token'); // Cleanup on fail
      dispatch({
        type: 'LOGIN_FAIL'
      });
      throw err; // Allow component to handle specific error
    }
  };

  const loginWithGoogle = async (credential) => {
    try {
      const res = await authApi.googleLogin(credential);

      localStorage.setItem('token', res.data.token);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: res.data
      });

      await loadUser();
    } catch (err) {
      localStorage.removeItem('token');
      dispatch({
        type: 'LOGIN_FAIL'
      });
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider
      value={{
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        loading: state.loading,
        user: state.user,
        register,
        login,
        loginWithGoogle,
        logout,
        loadUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
