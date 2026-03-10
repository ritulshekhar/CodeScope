import { createContext, useContext, useReducer, useEffect } from 'react';

const AuthContext = createContext(null);

const initialState = {
    user: null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: false,
    loading: true
};

function authReducer(state, action) {
    switch (action.type) {
        case 'LOGIN_SUCCESS':
            localStorage.setItem('token', action.payload.token);
            return { ...state, user: action.payload, token: action.payload.token, isAuthenticated: true, loading: false };
        case 'LOGOUT':
            localStorage.removeItem('token');
            return { ...state, user: null, token: null, isAuthenticated: false, loading: false };
        case 'SET_USER':
            return { ...state, user: action.payload, isAuthenticated: true, loading: false };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        default:
            return state;
    }
}

export function AuthProvider({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (token && userStr) {
            try {
                dispatch({ type: 'SET_USER', payload: JSON.parse(userStr) });
            } catch {
                dispatch({ type: 'LOGOUT' });
            }
        } else {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, []);

    const login = (userData) => {
        localStorage.setItem('user', JSON.stringify(userData));
        dispatch({ type: 'LOGIN_SUCCESS', payload: userData });
    };

    const logout = () => {
        localStorage.removeItem('user');
        dispatch({ type: 'LOGOUT' });
    };

    return (
        <AuthContext.Provider value={{ ...state, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
