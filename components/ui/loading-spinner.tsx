import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps {
  size?: number
  className?: string
  text?: string
}

export function LoadingSpinner({ size = 24, className = "", text }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
      <Loader2 className="animate-spin" size={size} />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  )
}

export function LoadingSpinnerFull() {
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <LoadingSpinner size={32} text="Loading articles..." />
    </div>
  )
}
