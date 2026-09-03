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

export type OpticalStatusTone = 'neutral' | 'signal' | 'info' | 'success' | 'warning' | 'danger';

export function OpticalStatus({ children, tone = 'neutral' }: { children: ReactNode; tone?: OpticalStatusTone }) {
  return <span className={`optical-status optical-status--${tone}`}>{children}</span>;
}
