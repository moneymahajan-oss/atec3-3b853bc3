import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, IndianRupee, Eye, Sparkles, Brain, Megaphone, Server, Calculator, Laptop, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { courses, courseCategories, Course } from "@/data/mockData";

const categoryIcons: Record<string, React.ElementType> = {
  "AI & Emerging Tech": Brain,
  "Digital Skills & Marketing": Megaphone,
  "Full Stack & Networking": Server,
  "Finance & Accounting": Calculator,
  "Office & Productivity": Laptop,
  "Student Courses": GraduationCap,
};

export default function CoursesSection() {
  const [active, setActive] = useState("All");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const filtered = active === "All" ? courses : courses.filter((c) => c.category === active);

  return (
    <section id="courses" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/5">
            <Sparkles className="w-3 h-3 mr-1" /> Our Programs
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-foreground mb-4">
            Explore Our Courses
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">Industry-aligned curriculum designed to give you practical, job-ready skills</p>
        </motion.div>

        {/* Category tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {courseCategories.map((cat) => {
            const Icon = categoryIcons[cat];
            return (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  active === cat
                    ? "gradient-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {cat}
              </button>
            );
          })}
        </div>

        {/* Course grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((course) => (
              <motion.div
                key={course.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="glass rounded-2xl overflow-hidden group hover:shadow-xl transition-shadow"
              >
                <div className="relative h-48 overflow-hidden">
                  <img src={course.thumbnail_url} alt={course.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className="bg-primary/90 text-primary-foreground text-xs">{course.category}</Badge>
                    {course.badge_label && (
                      <Badge className="gradient-accent text-accent-foreground text-xs border-0">{course.badge_label}</Badge>
                    )}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-heading font-bold text-lg text-foreground mb-2">{course.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{course.short_description}</p>
                  <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{course.duration}</span>
                    <span className="flex items-center gap-1"><IndianRupee className="w-4 h-4" />{course.fee}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedCourse(course)}>
                      <Eye className="w-4 h-4 mr-1" /> Syllabus
                    </Button>
                    <Button size="sm" className="flex-1 gradient-accent text-accent-foreground border-0 hover:opacity-90" asChild>
                      <a href="#contact">Enroll</a>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Syllabus Modal */}
      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedCourse && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">{selectedCourse.name} — Syllabus</DialogTitle>
              </DialogHeader>
              <div className="flex gap-3 mb-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{selectedCourse.duration}</span>
                <span className="flex items-center gap-1"><IndianRupee className="w-4 h-4" />{selectedCourse.fee}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{selectedCourse.full_description}</p>
              <ol className="space-y-2">
                {selectedCourse.syllabus.map((topic, i) => (
                  <li key={i} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                    <span className="w-6 h-6 rounded-full gradient-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 font-bold">{i + 1}</span>
                    <span className="text-sm text-foreground">{topic}</span>
                  </li>
                ))}
              </ol>
              <Button className="w-full mt-4 gradient-accent text-accent-foreground border-0" asChild>
                <a href="#contact">Enroll in This Course</a>
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
