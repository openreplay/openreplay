import React from 'react';

import { hashString } from 'App/types/session/session';

import { SessionAvatar } from 'Shared/SessionAvatar/SessionAvatar';

/** The person's own picture when they set one, else the session glyph. */
export function PersonAvatar({
  userId,
  avatarUrl,
  size = 24,
}: {
  userId: string;
  avatarUrl?: string;
  size?: number;
}) {
  const [broken, setBroken] = React.useState(false);
  if (avatarUrl && !broken)
    return (
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        className="m-dmg__avatar"
        style={{ width: size, height: size }}
        onError={() => setBroken(true)}
      />
    );
  return <SessionAvatar seed={hashString(userId)} size={size} />;
}

export function Where({
  city,
  state,
  country,
}: {
  city?: string;
  state?: string;
  country?: string;
}) {
  const place = [city, state].filter(Boolean).join(', ');
  if (!place && !country)
    return <span className="text-content-disabled">—</span>;
  return (
    <span
      className="m-dmg__where"
      title={[place, country].filter(Boolean).join(', ')}
    >
      {country && <span className="m-dmg__cc">{country}</span>}
      <span className="m-truncate">{place || country}</span>
    </span>
  );
}
