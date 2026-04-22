'use client'

import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-adapta-800">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          ref={ref}
          id={inputId}
          {...props}
          className={`field-input ${error ? 'field-input-error' : ''} ${props.className ?? ''}`}
        />
        {hint && !error && <p className="text-xs text-adapta-500 leading-relaxed">{hint}</p>}
        {error && <p className="text-xs text-red-500 flex items-center gap-1">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
