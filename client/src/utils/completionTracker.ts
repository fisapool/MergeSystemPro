
interface Task {
  id: string;
  name: string;
  completed: boolean;
}

export const tasks: Task[] = [
  { id: "1", name: "Implement product listing", completed: false },
  { id: "2", name: "Implement price optimization", completed: false },
  { id: "3", name: "Create user authentication", completed: true },
  { id: "4", name: "Build dashboard layout", completed: true },
  { id: "5", name: "Set up backend API", completed: true },
  { id: "6", name: "Connect frontend to backend", completed: false },
  { id: "7", name: "Test and deploy the application", completed: false }
];

let completedTasksCount = tasks.filter(task => task.completed).length;

export function updateCompletedTasks(taskId: string, completed: boolean) {
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = completed;
    completedTasksCount = tasks.filter(t => t.completed).length;
  }
}

export function getCompletionPercentage(): number {
  return (completedTasksCount / tasks.length) * 100;
}
