const getCompletionPercentage = (total: number, completed: number): number => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

const Dashboard = () => {

};