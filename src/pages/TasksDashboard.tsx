import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Task {
  id: number;
  title: string;
  description: string;
  status: "Not Started" | "In Progress" | "Done";
}

const sampleTasks: Task[] = [
  {
    id: 1,
    title: "Connect to Lovable",
    description: "Ensure the app is connected via Magic Link.",
    status: "Done",
  },
  {
    id: 2,
    title: "Build dashboard layout",
    description: "Create layout with navigation and sectioning.",
    status: "In Progress",
  },
  {
    id: 3,
    title: "Design task cards",
    description: "Add styling and status badges.",
    status: "Not Started",
  },
];

export default function TasksDashboard() {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<Task["status"]>("Not Started");

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: tasks.length + 1,
      title: newTaskTitle,
      description: newTaskDescription,
      status: newTaskStatus,
    };
    setTasks([...tasks, newTask]);
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskStatus("Not Started");
  };

  const runLovableAutomation = () => {
    (window as any).Lovable?.runPrompt?.(`1. עדכן את כל לשוניות הדשבורד כך שיתבססו על הנתונים החדשים מה-CSV.
2. ודא שלשונית "AI תובנות" מציגה מידע ייחודי בהתאם לניתוח נתוני המכירות.
3. בלשונית "ניתוח מכירות" הוסף גרפים, פילטר לפי תאריכים וסיכום רווחים.
4. בלשונית "מלאי" הוסף חיזוי חוסרים והתרעות על מוצרים מתקרבים לאפס.
5. עדכן את Executive Summary עם תובנות מרכזיות, המלצות ומגמות.
6. תקן שגיאות בקוד React.
7. שמור גרסה חדשה בשם dashboard_v2 וודא שהשינויים זמינים בכל הדשבורד.`);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Task Dashboard</h1>

      {/* כפתור אוטומציה */}
      <Button
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded-xl"
        onClick={runLovableAutomation}
      >
        עדכן דשבורד אוטומטית
      </Button>

      <div className="bg-card rounded-2xl shadow-sm border p-4">
        <h2 className="text-xl font-semibold mb-2">Add New Task</h2>
        <div className="grid gap-2">
          <Input
            placeholder="Task title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <Textarea
            placeholder="Task description"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
          />
          <Select
            value={newTaskStatus}
            onValueChange={(value) => setNewTaskStatus(value as Task["status"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select task status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Not Started">Not Started</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addTask}>Add Task</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tasks.map((task) => (
          <Card key={task.id} className="rounded-2xl border">
            <CardContent className="p-4 space-y-2">
              <h3 className="text-lg font-medium">{task.title}</h3>
              <p className="text-sm text-muted-foreground">{task.description}</p>
              <Badge
                variant={
                  task.status === "Done"
                    ? "default"
                    : task.status === "In Progress"
                    ? "secondary"
                    : "outline"
                }
              >
                {task.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}