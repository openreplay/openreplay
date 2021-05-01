import JobCard from './JobCard';

const job = {
  name: "Job Name",
  sessionsCount: 32000,
  userName: 'Username'
}

export default {  
  title: 'WatchDog|JobCard',
};

export const empty = () => <JobCard job={ job } />;
