import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export function OpticalCard({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={clsx('optical-card', className)} {...props} />;
}

export function OpticalEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx('optical-eyebrow', className)}>{children}</p>;
}

export function OpticalButton({ className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={clsx('optical-button', className)} {...props} />;
}

export function OpticalStatus({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'signal' | 'success' | 'warning' }) {
  return <span className={`optical-status optical-status--${tone}`}>{children}</span>;
}
