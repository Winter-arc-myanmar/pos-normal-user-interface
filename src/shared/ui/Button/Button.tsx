import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement>

export function Button({ className, ...props }: Props) {
  return <button {...props} className={['btn', className].filter(Boolean).join(' ')} />
}

