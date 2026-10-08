export interface CountSuffixProps {
  n: number;
}

export function CountSuffix({ n }: CountSuffixProps) {
  return (
    <span
      style={{
        marginLeft: 'var(--m-space-2)',
        color: 'var(--m-content-muted)',
        fontFamily: 'var(--m-font-num)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {n}
    </span>
  );
}
