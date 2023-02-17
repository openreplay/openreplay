import React from 'react';
import SectionTitle from './SectionTitle';

interface EnvObj {
  Device: string;
  Resolution: string;
  Browser: string;
  OS: string;
  Country: string;
  Rev?: string;
}

export default function MetaInfo({
  envObject,
  metadata,
}: {
  envObject: EnvObj;
  metadata: Record<string, any>;
}) {
  return (
    <div className="flex gap-8">
      <div className="flex flex-col gap-2">
        <SectionTitle>Environment</SectionTitle>
        {Object.keys(envObject).map((envTag) => (
          <div key={envTag} className="flex items-center">
            <div className="py-1 px-2 font-medium">{envTag}</div>
            <div className="rounded text-base bg-active-blue px-2 py-1 whitespace-nowrap overflow-hidden text-clip">
              {/* @ts-ignore */}
              {envObject[envTag]}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(metadata).length > 0 ? (
        <div className="flex flex-col gap-2">
          <SectionTitle>Metadata</SectionTitle>
          {Object.keys(metadata).map((meta) => (
            <div key={meta} className="flex items-center rounded overflow-hidden bg-gray-lightest">
              <div className="bg-gray-light-shade py-1 px-2">{meta}</div>
              <div className="py-1 px-2 text-gray-medium">{metadata[meta]}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
