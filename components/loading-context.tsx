"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

interface LoadingContextType {
  isLoading: boolean
  loadingText: string
  setLoading: (loading: boolean, text?: string) => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('Loading...')

  const setLoading = (loading: boolean, text: string = 'Loading...') => {
    setIsLoading(loading)
    setLoadingText(text)
  }

  return (
    <LoadingContext.Provider value={{ isLoading, loadingText, setLoading }}>
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}
