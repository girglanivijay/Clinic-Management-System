import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Stethoscope, Users, FileText, Activity, Leaf, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { href: "/", label: "Patient Registration", icon: Users },
  { href: "/daily-register", label: "Daily Register", icon: Activity },
  { href: "/ayurvedic-register", label: "Ayurvedic Register", icon: Leaf },
  { href: "/complaint-codes", label: "Complaint Codes", icon: FileText },
  { href: "/pathya-apathya", label: "Pathya-Apathya", icon: Printer },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <div className="fixed top-0 left-0 right-0 bottom-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50 px-4 md:px-8 py-3 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 text-white">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none text-slate-900 font-display">Manglam Clinic</h1>
              <p className="text-sm font-medium text-slate-500">Dr. Vijay Girglani</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-1 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors duration-200 z-10 hover:text-primary",
                    isActive ? "text-primary" : "text-slate-600",
                    item.href === "/ayurvedic-register" && isActive ? "text-emerald-700" : "",
                    item.href === "/ayurvedic-register" && !isActive ? "hover:text-emerald-700" : "",
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className={cn(
                        "absolute inset-0 rounded-lg shadow-sm border -z-10",
                        item.href === "/ayurvedic-register"
                          ? "bg-emerald-50 border-emerald-200/50"
                          : "bg-white border-slate-200/50"
                      )}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 z-10 print:p-0 print:max-w-none">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
