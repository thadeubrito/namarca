'use client';

import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { CalendarIcon } from 'lucide-react';
import { ptBR } from 'react-day-picker/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useDarkTheme } from '@/components/theme-scope';

const emptyValue = '__none__';
type Option = { value: string; label: string };

export function SelectField({ name, label, options, value, defaultValue = '', onValueChange }: { name: string; label: string; options: Option[]; value?: string; defaultValue?: string; onValueChange?: (value: string) => void }) {
  const dark = useDarkTheme();
  const [local, setLocal] = useState(defaultValue);
  const current = value ?? local;
  const input = useRef<HTMLInputElement>(null);
  return <><input ref={input} type="hidden" name={name} value={current} readOnly /><Select value={current || emptyValue} onValueChange={next => {
    const selected = next === emptyValue ? '' : next;
    flushSync(() => { setLocal(selected); onValueChange?.(selected); });
    // The existing draft observer reads FormData after this render commits.
    input.current?.dispatchEvent(new Event('change', { bubbles: true }));
  }}><SelectTrigger aria-label={label} className="ws-shadcn-control"><SelectValue /></SelectTrigger><SelectContent position="popper" className={`ui-scope ws-select-popover${dark ? ' dark' : ''}`}>{options.map(option => <SelectItem key={option.value} value={option.value || emptyValue}>{option.label}</SelectItem>)}</SelectContent></Select></>;
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}
function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function DatePickerField({ name, label, value, defaultValue = '', onValueChange, required = false }: { name: string; label: string; value?: string; defaultValue?: string; onValueChange?: (value: string) => void; required?: boolean }) {
  const dark = useDarkTheme();
  const [local, setLocal] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const current = value ?? local;
  const selected = parseDate(current);
  const input = useRef<HTMLInputElement>(null);
  function change(next: string) {
    flushSync(() => { setLocal(next); onValueChange?.(next); });
    input.current?.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return <><input ref={input} className="sr-only" tabIndex={-1} aria-label={label} name={name} value={current} onChange={() => {}} required={required} onInvalid={event => { event.preventDefault(); setOpen(true); }} /><Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button type="button" className="ws-shadcn-control ws-date-trigger" aria-label={label}><span>{selected ? selected.toLocaleDateString('pt-BR') : 'Selecionar data'}</span><CalendarIcon aria-hidden size={16} /></button></PopoverTrigger><PopoverContent align="start" className={`ui-scope ws-date-popover${dark ? ' dark' : ''}`}><Calendar mode="single" locale={ptBR} selected={selected} defaultMonth={selected} onSelect={date => { if (date) { change(dateValue(date)); setOpen(false); } }} />{!required && <button type="button" className="ws-date-clear" onClick={() => { change(''); setOpen(false); }}>Limpar data</button>}</PopoverContent></Popover></>;
}
