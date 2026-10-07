import type { ButtonHTMLAttributes } from 'react'
import './Button.css'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }

export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  return <button type="button" className={`btn btn--${variant} ${className}`} {...rest} />
}
