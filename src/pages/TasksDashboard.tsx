import { useState } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Tag } from "lucide-react";

const tasks = [
  {
    title: "חיבור בוט WhatsApp",
    status: "done" as const,
    dueDate: "2025-08-21",
    category: "AI",
    insights: "השלמה מוצלחת של אינטגרציה עם WhatsApp API"
  },
  {
    title: "שדרוג תצוגת הדשבורד ב-Lovable",
    status: "in_progress" as const,
    dueDate: "2025-08-22",
    category: "פיתוח",
    insights: "התקדמות טובה - נדרש עוד עבודה על הרספונסיביות"
  },
  {
    title: "הכנסת גרף סטטוס משימות",
    status: "open" as const,
    dueDate: "2025-08-23",
    category: "UI/UX",
    insights: "ממתין לאישור עיצוב מהצוות"
  },
  {
    title: "שיפור מודול ניתוח GPT",
    status: "in_progress" as const,
    dueDate: "2025-08-24",
    category: "AI",
    insights: "בדיקת ביצועים מראה שיפור של 25%"
  },
  {
    title: "אופטימיזציה של מסד הנתונים",
    status: "open" as const,
    dueDate: "2025-08-26",
    category: "Backend",
    insights: "זיהוי צווארי בקבוק בשאילתות מורכבות"
  },
  {
    title: "יישום מערכת התראות",
    status: "done" as const,
    dueDate: "2025-08-20",
    category: "פיתוח",
    insights: "פעילה בהצלחה עם 95% זמן פעילות"
  }
];

const statusVariants = {
  "open": "muted",
  "in_progress": "warning", 
  "done": "success",
} as const;

const statusLabels = {
  "open": "פתוח",
  "in_progress": "בתהליך",
  "done": "הושלם",
} as const;

export default function TasksDashboard() {
  const [filter, setFilter] = useState("");

  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(filter.toLowerCase()) ||
    task.category.toLowerCase().includes(filter.toLowerCase()) ||
    statusLabels[task.status].toLowerCase().includes(filter.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground">לוח משימות – CGC</h1>
          <p className="text-muted-foreground">מעקב אחר התקדמות הפרויקטים</p>
          
          {/* Filter */}
          <Input
            placeholder="חיפוש משימות לפי כותרת, קטגוריה או סטטוס..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">הושלמו</p>
                  <p className="text-2xl font-bold text-success">
                    {tasks.filter(t => t.status === 'done').length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-success rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">בתהליך</p>
                  <p className="text-2xl font-bold text-warning">
                    {tasks.filter(t => t.status === 'in_progress').length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-warning/10 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-warning rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">פתוחות</p>
                  <p className="text-2xl font-bold text-muted-foreground">
                    {tasks.filter(t => t.status === 'open').length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-muted/20 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {filteredTasks.map((task, index) => (
            <motion.div key={`${task.title}-${index}`} variants={cardVariants}>
              <Card className="h-full hover:shadow-lg transition-shadow duration-300 border border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg font-semibold text-foreground line-clamp-2">
                      {task.title}
                    </CardTitle>
                    <Badge variant={statusVariants[task.status]} className="shrink-0">
                      {statusLabels[task.status]}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Category and Due Date */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Tag className="w-4 h-4" />
                      <span>{task.category}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(new Date(task.dueDate), "d בMMMM yyyy", { 
                          locale: undefined 
                        })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Insights */}
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {task.insights}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-muted/20 rounded-full flex items-center justify-center">
              <Tag className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              לא נמצאו משימות
            </h3>
            <p className="text-muted-foreground">
              נסה לשנות את מילות החיפוש או לנקות את הפילטר
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}