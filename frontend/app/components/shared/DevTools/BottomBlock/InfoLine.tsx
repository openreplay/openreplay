import React from 'react';

function InfoLine({ children }: { children: React.ReactNode }) {
  return <p className="m-dt__figures">{children}</p>;
}

function Point({
  label = '',
  value = '',
  display = true,
  dotColor,
}: {
  label?: string;
  value?: string;
  display?: boolean;
  /** a background utility class for the dot */
  dotColor?: string;
}) {
  return display ? (
    <span>
      {dotColor != null && (
        <i className={`m-dt__dot ${dotColor}`} aria-hidden="true" />
      )}
      <b>{label}</b> {value}
    </span>
  ) : null;
}

InfoLine.Point = Point;

export default InfoLine;
