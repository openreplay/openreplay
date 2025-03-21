export function mergeListsWithZoom<
  T extends Record<string, any>,
  Y extends Record<string, any>,
  Z extends Record<string, any>,
>(
  arr1: T[],
  arr2: Y[],
  arr3: Z[],
  zoom?: { enabled: boolean; start: number; end: number },
): Array<T | Y | Z> {
  // Early return for empty arrays
  if (arr1.length === 0 && arr2.length === 0 && arr3.length === 0) {
    return [];
  }

  // Optimized for common case - no zoom
  if (!zoom?.enabled) {
    return mergeThreeSortedArrays(arr1, arr2, arr3);
  }

  // Binary search for start indexes (faster than linear search for large arrays)
  const index1 = binarySearchStartIndex(arr1, zoom.start);
  const index2 = binarySearchStartIndex(arr2, zoom.start);
  const index3 = binarySearchStartIndex(arr3, zoom.start);

  // Merge arrays within zoom range
  return mergeThreeSortedArraysWithinRange(
    arr1,
    arr2,
    arr3,
    index1,
    index2,
    index3,
    zoom.start,
    zoom.end,
  );
}

function binarySearchStartIndex<T extends Record<string, any>>(
  arr: T[],
  threshold: number,
): number {
  if (arr.length === 0) return 0;

  let low = 0;
  let high = arr.length - 1;

  // Handle edge cases first for better performance
  if (arr[high].time < threshold) return arr.length;
  if (arr[low].time >= threshold) return 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (arr[mid].time < threshold) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return low;
}

function mergeThreeSortedArrays<
  T extends Record<string, any>,
  Y extends Record<string, any>,
  Z extends Record<string, any>,
>(arr1: T[], arr2: Y[], arr3: Z[]): Array<T | Y | Z> {
  const totalLength = arr1.length + arr2.length + arr3.length;
  // prealloc array size
  const result = new Array(totalLength);

  let i = 0,
    j = 0,
    k = 0,
    index = 0;

  while (i < arr1.length || j < arr2.length || k < arr3.length) {
    const val1 = i < arr1.length ? arr1[i].time : Infinity;
    const val2 = j < arr2.length ? arr2[j].time : Infinity;
    const val3 = k < arr3.length ? arr3[k].time : Infinity;

    if (val1 <= val2 && val1 <= val3) {
      result[index++] = arr1[i++];
    } else if (val2 <= val1 && val2 <= val3) {
      result[index++] = arr2[j++];
    } else {
      result[index++] = arr3[k++];
    }
  }

  return result;
}

// same as above, just with zoom stuff
function mergeThreeSortedArraysWithinRange<
  T extends Record<string, any>,
  Y extends Record<string, any>,
  Z extends Record<string, any>,
>(
  arr1: T[],
  arr2: Y[],
  arr3: Z[],
  startIdx1: number,
  startIdx2: number,
  startIdx3: number,
  start: number,
  end: number,
): Array<T | Y | Z> {
  // we don't know beforehand how many items will be there
  const result = [];

  let i = startIdx1;
  let j = startIdx2;
  let k = startIdx3;

  while (i < arr1.length || j < arr2.length || k < arr3.length) {
    const val1 = i < arr1.length ? arr1[i].time : Infinity;
    const val2 = j < arr2.length ? arr2[j].time : Infinity;
    const val3 = k < arr3.length ? arr3[k].time : Infinity;

    // Early termination: if all remaining values exceed end time
    if (Math.min(val1, val2, val3) > end) {
      break;
    }

    if (val1 <= val2 && val1 <= val3) {
      if (val1 <= end) {
        result.push(arr1[i]);
      }
      i++;
    } else if (val2 <= val1 && val2 <= val3) {
      if (val2 <= end) {
        result.push(arr2[j]);
      }
      j++;
    } else {
      if (val3 <= end) {
        result.push(arr3[k]);
      }
      k++;
    }
  }

  return result;
}

export function processInChunks(
  items: any[],
  processFn: (item: any) => any,
  chunkSize = 1000,
  overscan = 0,
) {
  return new Promise((resolve) => {
    if (items.length === 0) {
      resolve([]);
      return;
    }

    let result: any[] = [];
    let index = 0;

    const processNextChunk = () => {
      const chunk = items.slice(index, index + chunkSize + overscan);
      result = result.concat(processFn(chunk));
      index += chunkSize;

      if (index < items.length) {
        setTimeout(processNextChunk, 0);
      } else {
        resolve(result);
      }
    };

    processNextChunk();
  });
}
