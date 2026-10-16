import { IconButton } from '@/ui/actions/IconButton';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Input } from './input';
import './search-field.css';

export interface SearchFieldProps {
  size?: 'sm' | 'md';

  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Every list search: the magnifier, an input's height, a clear once typed in. */
export function SearchField({
  placeholder,
  value,
  onChange,
  size = 'md',
  className,
}: SearchFieldProps) {
  const { t } = useTranslation();
  return (
    <div className={className ? `m-search ${className}` : 'm-search'}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={120}
        aria-label={placeholder}
        prefix={<Search />}
        suffix={
          value ? (
            <IconButton
              icon={<X size={12} />}
              label={t('Clear search')}
              variant="ghost"
              size="xs"
              onClick={() => onChange('')}
            />
          ) : undefined
        }
        className={size === 'sm' ? 'text-sm' : undefined}
      />
    </div>
  );
}
