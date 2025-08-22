import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const mockTasks = [
  {
    id: 1,
    title: "חיבור בוט WhatsApp",
    category: "AI",
    status: "בוצע",
    dueDate: "2025-08-21",
  },
  {
    id: 2,
    title: "שדרוג תצוגת הדשבורד ב-Lovable",
    category: "פיתוח",
    status: "בתהליך",
    dueDate: "2025-08-22",
  },
  {
    id: 3,
    title: "הכנסת גרף סטטוס משימות",
    category: "UI/UX",
    status: "לא התחיל",
    dueDate: "2025-08-23",
  },
  {
    id: 4,
    title: "שיפור מודול ניתוח GPT",
    category: "AI",
    status: "בתהליך",
    dueDate: "2025-08-24",
  },
];

const statusVariants = {
  "לא התחיל": "muted",
  "בתהליך": "warning",
  "בוצע": "success",
} as const;

export default function TasksDashboard() {
  const [filter, setFilter] = useState("");

  const filteredTasks = mockTasks.filter((task) =>
    task.status.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">לוח משימות – CGC</h1>
      <Input
        placeholder="סנן לפי סטטוס (לדוג׳: בוצע, בתהליך)"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full md:w-1/2"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.map((task) => (
          <Card key={task.id} className="shadow">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">{task.title}</h2>
                <Badge variant={statusVariants[task.status] || "muted"}>
                  {task.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">קטגוריה: {task.category}</p>
              <p className="text-sm text-muted-foreground">תאריך יעד: {task.dueDate}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}