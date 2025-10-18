import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SCHEDULED_TASKS } from "@/constants/data";
import { getNextExecutionDescription } from "@/lib/cron-utils";



export function BackgroundTasksCard() {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>后台任务</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-4">
          {SCHEDULED_TASKS.map((task) => (
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
}