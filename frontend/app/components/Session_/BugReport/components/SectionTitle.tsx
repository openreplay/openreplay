import React from 'react'

export default function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xl font-semibold mb-2">{children}</div>;
}
