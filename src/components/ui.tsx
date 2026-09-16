import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'

export function Button({ className, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  return <button className={clsx('button', `button--${variant}`, className)} {...props} />
}
export function Card({ children, className }: { children: ReactNode; className?: string }) { return <section className={clsx('card', className)}>{children}</section> }
export function SectionTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="section-title"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header>
}
export function Field({ label, hint, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <label className={clsx('field', className)}><span>{label}</span><input {...props} />{hint && <small>{hint}</small>}</label>
}
export function TextArea({ label, hint, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  return <label className={clsx('field', className)}><span>{label}</span><textarea {...props} />{hint && <small>{hint}</small>}</label>
}
export function StatusDot({ ok }: { ok: boolean }) { return <span className={clsx('status-dot', ok && 'status-dot--ok')} aria-hidden /> }
export function EmptyState({ children }: { children: ReactNode }) { return <div className="empty-state">{children}</div> }
export function CodeBlock({ children, id }: { children: ReactNode; id?: string }) { return <pre className="code-block" id={id}>{children}</pre> }
