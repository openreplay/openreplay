import { withCopy } from 'HOCs';
import React from 'react';

function ProjectKey({ value, tooltip }: any) {
    return <div className="rounded border bg-gray-lightest w-fit px-2">{value}</div>;
}

export default withCopy(ProjectKey);
