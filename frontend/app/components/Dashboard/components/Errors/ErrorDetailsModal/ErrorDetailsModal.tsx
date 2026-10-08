import React from 'react';

// the drawer's trend chart pulls echarts: load it when an error is opened,
// not with every console / exceptions panel that can open one
const ErrorDrawer = React.lazy(() => import('Components/Errors/ErrorDrawer'));

export default function ErrorDetailsModal(
  props: React.ComponentProps<typeof ErrorDrawer>,
) {
  return (
    <React.Suspense fallback={null}>
      <ErrorDrawer {...props} />
    </React.Suspense>
  );
}
