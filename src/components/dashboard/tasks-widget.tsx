import { getNextExecutionDescription } from "@/lib/cron-utils";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { SCHEDULED_TASKS } from "@/constants/data";

interface BackgroundTask {
  id: string;
  name: string;
  initial: string;
  schedule: string;
  status: string;
  description?: string;
  icon: React.ElementType;
}

export const TasksWidget = () => {
  return (
    <Card className="flex flex-col gap-0 py-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">任务</CardTitle>
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {SCHEDULED_TASKS.map((task: BackgroundTask) => (
            <div key={task.id} className="flex items-center">
              <task.icon className="h-4 w-4" />
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{task.name}</p>
                <p className="text-sm text-muted-foreground">
                  {getNextExecutionDescription(task.schedule)}
                </p>
              </div>
              <div className="ml-auto font-medium text-sm text-muted-foreground">
                {task.status}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};