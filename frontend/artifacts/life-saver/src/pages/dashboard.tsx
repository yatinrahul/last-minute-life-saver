import { useGetTaskDashboard, useGetUrgentTasks } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, Clock, ListTodo, Activity } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: dashboard, isLoading: isLoadingDashboard } = useGetTaskDashboard();
  const { data: urgentTasks, isLoading: isLoadingUrgent } = useGetUrgentTasks();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-2 text-lg">Your personal urgency radar.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tasks"
          value={dashboard?.total}
          icon={ListTodo}
          isLoading={isLoadingDashboard}
        />
        <StatCard
          title="Due Today"
          value={dashboard?.dueToday}
          icon={Clock}
          isLoading={isLoadingDashboard}
          alert={dashboard?.dueToday ? dashboard.dueToday > 0 : false}
        />
        <StatCard
          title="Urgent/Overdue"
          value={(dashboard?.urgent || 0) + (dashboard?.overdue || 0)}
          icon={AlertTriangle}
          isLoading={isLoadingDashboard}
          alert={true}
        />
        <StatCard
          title="Completion Rate"
          value={dashboard?.completionRate ? `${dashboard.completionRate}%` : "0%"}
          icon={Activity}
          isLoading={isLoadingDashboard}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-destructive/20 shadow-sm">
          <CardHeader className="bg-destructive/5 pb-4 border-b border-destructive/10">
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Urgent Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingUrgent ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : urgentTasks && urgentTasks.length > 0 ? (
              <div className="divide-y divide-border">
                {urgentTasks.map(task => (
                  <div key={task.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div>
                      <h4 className="font-semibold text-foreground">{task.title}</h4>
                      {task.dueDate && (
                        <p className="text-sm text-destructive mt-1 font-mono">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <CheckCircle2 className="h-12 w-12 text-primary/50 mb-3" />
                <p>No urgent tasks at the moment. You're clear.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              Feeling Overwhelmed?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              When everything feels urgent, let the AI coach help you break things down and find the right path forward.
            </p>
            <div className="flex flex-col gap-3">
              <Link 
                href="/ai-prioritize"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Prioritize My Tasks
              </Link>
              <Link 
                href="/ai-coach"
                className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Talk to AI Coach
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  isLoading, 
  alert = false 
}: { 
  title: string; 
  value?: string | number; 
  icon: any; 
  isLoading: boolean;
  alert?: boolean;
}) {
  return (
    <Card className={alert && Number(value) > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${alert && Number(value) > 0 ? "text-destructive" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className={`text-2xl font-bold font-mono ${alert && Number(value) > 0 ? "text-destructive" : ""}`}>
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
