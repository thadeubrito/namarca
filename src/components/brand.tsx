import Link from 'next/link';

export function Brand({ href = '/', className = '', label = 'Namarca' }: { href?: string; className?: string; label?: string }) {
  return <Link href={href} className={`namarca-brand ${className}`} aria-label={label}><span>namarca</span></Link>;
}
