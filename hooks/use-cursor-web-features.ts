"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createApiResponse, type ApiResponse } from '@/lib/cursor-web-utils'

// Types that Cursor web can enhance with better IntelliSense
interface UseApiOptions {
  immediate?: boolean
  retryCount?: number
  retryDelay?: number
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  success: boolean
}

// Custom hook that demonstrates Cursor web's code generation capabilities
export function useApi<T = any>(
  apiCall: () => Promise<ApiResponse<T>>,
  options: UseApiOptions = {}
) {
  const {
    immediate = true,
    retryCount = 3,
    retryDelay = 1000,
    onSuccess,
    onError
  } = options

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false
  })

  const [retryAttempts, setRetryAttempts] = useState(0)

  // Memoized API call with retry logic
  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const response = await apiCall()
      
      if (response.success) {
        setState({
          data: response.data || null,
          loading: false,
          error: null,
          success: true
        })
        
        onSuccess?.(response.data)
        setRetryAttempts(0) // Reset retry count on success
      } else {
        throw new Error(response.error || 'API call failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Retry logic
      if (retryAttempts < retryCount) {
        setRetryAttempts(prev => prev + 1)
        setTimeout(() => {
          execute()
        }, retryDelay * Math.pow(2, retryAttempts)) // Exponential backoff
        return
      }
      
      setState({
        data: null,
        loading: false,
        error: errorMessage,
        success: false
      })
      
      onError?.(error instanceof Error ? error : new Error(errorMessage))
    }
  }, [apiCall, retryAttempts, retryCount, retryDelay, onSuccess, onError])

  // Auto-execute on mount if immediate is true
  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [immediate, execute])

  // Reset function
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false
    })
    setRetryAttempts(0)
  }, [])

  return {
    ...state,
    execute,
    reset,
    retryAttempts,
    canRetry: retryAttempts < retryCount
  }
}

// Hook for managing local storage with Cursor web optimizations
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, storedValue])

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error)
    }
  }, [key, initialValue])

  return [storedValue, setValue, removeValue]
}

// Hook for debounced values (useful for search, etc.)
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Hook for managing form state with validation
export function useFormState<T extends Record<string, any>>(
  initialValues: T,
  validationSchema?: (values: T) => Record<keyof T, string | null>
) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }, [errors])

  const setFieldTouched = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }, [])

  const validate = useCallback(() => {
    if (!validationSchema) return true
    
    const newErrors = validationSchema(values)
    const hasErrors = Object.values(newErrors).some(error => error !== null)
    
    setErrors(newErrors as Partial<Record<keyof T, string>>)
    return !hasErrors
  }, [values, validationSchema])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  const isValid = useMemo(() => {
    if (!validationSchema) return true
    const validationErrors = validationSchema(values)
    return Object.values(validationErrors).every(error => error === null)
  }, [values, validationSchema])

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validate,
    reset,
    isValid
  }
}

// Hook for managing loading states across multiple operations
export function useLoadingStates() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }))
  }, [])

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false
  }, [loadingStates])

  const isAnyLoading = useMemo(() => {
    return Object.values(loadingStates).some(loading => loading)
  }, [loadingStates])

  const clearLoading = useCallback((key: string) => {
    setLoadingStates(prev => {
      const newState = { ...prev }
      delete newState[key]
      return newState
    })
  }, [])

  return {
    setLoading,
    isLoading,
    isAnyLoading,
    clearLoading
  }
}

// Export types for better Cursor web assistance
export type { UseApiOptions, UseApiState }
