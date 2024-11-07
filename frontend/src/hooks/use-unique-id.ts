"use client";

import { nanoid } from "nanoid";
import { useMemo } from "react";

const useUniqueId = (count: number = 1) => {
  const uniqueIds = useMemo(
    () => Array.from({ length: count }, () => nanoid()),
    [count],
  );

  return uniqueIds;
};

export default useUniqueId;
