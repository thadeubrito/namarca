import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

/** Page heading and secondary location trail. */
export function PageTitle({ title, endContent, links }: { title: string; endContent?: ReactNode; links?: { label: string; href: string }[] }) {
  return <div className="flex flex-wrap items-center justify-between gap-3">
    <h1 className="text-lg font-medium sm:text-xl">{title}</h1>
    {endContent ?? <Breadcrumb className="max-sm:hidden"><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link href="/admin">Admin</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />{links?.filter(link => link.label !== title).map(link => <Fragment key={link.href}><BreadcrumbItem><BreadcrumbLink asChild><Link href={link.href}>{link.label}</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /></Fragment>)}<BreadcrumbItem><BreadcrumbPage>{title}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>}
  </div>;
}
