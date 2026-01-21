import React from 'react';
import { Navigate } from 'App/routing';

interface Props {
  redirect: string;
}

function AdditionalRoutes(props: Props) {
  const { redirect } = props;
  return <Navigate to={redirect} replace />;
}

export default AdditionalRoutes;
