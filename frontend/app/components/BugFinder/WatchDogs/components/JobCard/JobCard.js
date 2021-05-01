import React from 'react';
import { Icon, CircularLoader } from 'UI';

const JobCard = ({ className, job, ...rest }) => {
  return (
    <div className="border rounded p-3 mb-4" { ...rest }>
      <div className="mb-2 flex justify-between">
        <div className="text-lg">{ job.name }</div>
        <div>{ job.isInProgress() ?
          <CircularLoader loading={ true } /> : 
          <Icon name="check-circle" size="20" color="teal" />}</div>
      </div>
      <div className="mb-1">
        <span className="font-semibold text-sm">Sessions: </span> { job.sessionsCount }
      </div>
      <div className="mb-3">
        <span className="font-semibold text-sm">Period: </span> { job.period() }
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Icon className="mr-2" name="calendar" size="14" />
          <span className="text-gray-500 text-sm">{ job.createdAt.toFormat('LLL dd, yyyy') }</span>
        </div>
        <div className="flex items-center">
          <Icon className="mr-2" name="user-alt" size="14" />
          <span className="text-gray-500 text-sm">{ job.user && job.user.name }</span>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
