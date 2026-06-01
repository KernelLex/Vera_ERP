import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users, Briefcase, UserCheck, CalendarClock,
  Plus, UserPlus, Shield, Activity,
  CheckCircle2, XCircle, Circle, FileText, Calendar,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { api, apiUrl } from "@/lib/api"

const ADMIN_USERS = new Set(["Administrator", "owais@veraenterprises.in"])

function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      const res = await api.get(apiUrl("hr_client.api.dashboard.get_dashboard_stats"))
      return res.data.message as {
        stats: {
          total_employees: number
          open_positions: number
          candidates_this_month: number
          interviews_today: number
        }
        recent_activity: Array<{
          action: string
          detail: string
          time: string
          dot: string
        }>
      }
    },
    staleTime: 1000 * 60,
  })
}

function StatSkeleton() {
  return (
    <div
      className="rounded-xl p-5 animate-pulse"
      style={{
        background: "#FFFFFF",
        border: "var(--border-card)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-300 rounded w-12" />
          <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
        <div className="h-10 w-10 bg-gray-100 rounded-full" />
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function formatTodayDate() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  blue: UserCheck,
  violet: Briefcase,
  emerald: CheckCircle2,
  red: XCircle,
  orange: CalendarClock,
  gray: Circle,
}

const ACTIVITY_ICON_COLORS: Record<string, string> = {
  blue: "#3B82F6",
  violet: "#7C3AED",
  emerald: "#10B981",
  red: "#EF4444",
  orange: "#F59E0B",
  gray: "#94A3B8",
}

export function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user && ADMIN_USERS.has(user.name)
  const { data, isLoading } = useDashboardStats()

  const stats = data?.stats
  const activity = data?.recent_activity ?? []

  const STAT_CARDS = [
    {
      label: "Total Employees",
      value: stats?.total_employees ?? "—",
      sub: "Active employees",
      icon: Users,
      iconBg: "#EEF2FF",
      iconColor: "#4F46E5",
    },
    {
      label: "Open Positions",
      value: stats?.open_positions ?? "—",
      sub: "Job openings",
      icon: Briefcase,
      iconBg: "#F5F3FF",
      iconColor: "#7C3AED",
    },
    {
      label: "Candidates",
      value: stats?.candidates_this_month ?? "—",
      sub: "This month",
      icon: UserCheck,
      iconBg: "#ECFDF5",
      iconColor: "#10B981",
    },
    {
      label: "Interviews Today",
      value: stats?.interviews_today ?? "—",
      sub: "Scheduled today",
      icon: CalendarClock,
      iconBg: "#FFFBEB",
      iconColor: "#F59E0B",
    },
  ]

  const QUICK_ACTIONS = [
    {
      label: "Post New Job",
      icon: Plus,
      bg: "#4F46E5",
      hover: "#3730A3",
      onClick: () => navigate("/recruitment"),
    },
    {
      label: "Add Candidate",
      icon: UserPlus,
      bg: "#7C3AED",
      hover: "#6D28D9",
      onClick: () => navigate("/recruitment"),
    },
    {
      label: "Schedule Interview",
      icon: Calendar,
      bg: "#059669",
      hover: "#047857",
      onClick: () => navigate("/recruitment"),
    },
  ]

  return (
    <div className="p-6 max-w-5xl space-y-6 min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-bold" style={{ fontSize: "26px", color: "var(--text-primary)" }}>
            {getGreeting()}{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Here's what's happening today.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            {formatTodayDate()}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : STAT_CARDS.map(({ label, value, sub, icon: Icon, iconBg, iconColor }) => (
              <div
                key={label}
                className="rounded-xl p-5 cursor-default transition-all duration-200"
                style={{
                  background: "#FFFFFF",
                  border: "var(--border-card)",
                  boxShadow: "var(--shadow-card)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "var(--shadow-card-hover)"
                  e.currentTarget.style.transform = "translateY(-1px)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "var(--shadow-card)"
                  e.currentTarget.style.transform = "translateY(0)"
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
                    <p
                      className="font-extrabold mt-1 leading-none"
                      style={{ fontSize: "32px", color: "var(--text-primary)" }}
                    >
                      {value}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>
                  </div>
                  <div
                    className="rounded-full p-2.5 shrink-0"
                    style={{ backgroundColor: iconBg }}
                  >
                    <Icon size={18} style={{ color: iconColor }} />
                  </div>
                </div>
              </div>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <Card
          className="lg:col-span-2 border-0"
          style={{
            background: "#FFFFFF",
            border: "var(--border-card)",
            boxShadow: "var(--shadow-card)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="font-semibold" style={{ fontSize: "15px", color: "var(--text-primary)" }}>
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 pt-0">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 py-3 animate-pulse">
                  <div className="w-6 h-6 bg-gray-100 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                  <div className="h-3 bg-gray-100 rounded w-12" />
                </div>
              ))
            ) : activity.length === 0 ? (
              <div className="text-center py-10">
                <FileText size={32} className="mx-auto mb-2 opacity-20" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No activity yet — add job openings and candidates to get started.
                </p>
              </div>
            ) : (
              activity.map(({ action, detail, time, dot }, i) => {
                const IconComp = ACTIVITY_ICONS[dot] ?? Circle
                const iconColor = ACTIVITY_ICON_COLORS[dot] ?? "#94A3B8"
                const isLast = i === activity.length - 1
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-3 transition-colors"
                    style={{
                      borderBottom: isLast ? "none" : "1px solid #F1F5F9",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: `${iconColor}18` }}
                    >
                      <IconComp size={13} style={{ color: iconColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{action}</p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{detail}</p>
                    </div>
                    <span className="text-[11px] shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }}>{time}</span>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card
          className="border-0"
          style={{
            background: "#FFFFFF",
            border: "var(--border-card)",
            boxShadow: "var(--shadow-card)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="font-semibold" style={{ fontSize: "15px", color: "var(--text-primary)" }}>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {QUICK_ACTIONS.map(({ label, icon: Icon, bg, hover, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="w-full flex items-center gap-2.5 text-sm font-semibold text-white transition-all duration-150"
                style={{
                  backgroundColor: bg,
                  borderRadius: "var(--radius-button)",
                  padding: "10px 16px",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = hover
                  e.currentTarget.style.boxShadow = `0 4px 12px ${bg}4D`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = bg
                  e.currentTarget.style.boxShadow = "none"
                }}
              >
                <Icon size={15} className="text-white opacity-90" />
                {label}
              </button>
            ))}
            {isAdmin && (
              <button
                onClick={() => navigate("/admin/attendance")}
                className="w-full flex items-center gap-2.5 text-sm font-semibold transition-all duration-150"
                style={{
                  backgroundColor: "#ECFDF5",
                  color: "#065F46",
                  borderRadius: "var(--radius-button)",
                  padding: "10px 16px",
                  border: "1px solid #6EE7B7",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#D1FAE5"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ECFDF5"
                }}
              >
                <Activity size={15} style={{ color: "#059669" }} />
                Live Attendance
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => navigate("/admin/permissions")}
                className="w-full flex items-center gap-2.5 text-sm font-semibold transition-all duration-150"
                style={{
                  backgroundColor: "#F5F3FF",
                  color: "#4C1D95",
                  borderRadius: "var(--radius-button)",
                  padding: "10px 16px",
                  border: "1px solid #DDD6FE",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#EDE9FE"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#F5F3FF"
                }}
              >
                <Shield size={15} style={{ color: "#7C3AED" }} />
                Role Control
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
