import React from 'react';
import { Redirect } from 'react-router-dom';

interface Props {
  redirect: string;
}

function AdditionalRoutes(props: Props) {
  const { redirect } = props;
  return <Redirect to={redirect} />;
}

export default AdditionalRoutes;
