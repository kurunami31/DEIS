import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpen, CalendarDays, ClipboardList, FileText, GraduationCap,
  Inbox, LayoutGrid, Users, BarChart3,
} from 'lucide-react';
import { request } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate } from '../lib/utils.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role;

  return (
    <div className="space-y-5">
      <WelcomeBanner user={user} />
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card card-pad lg:col-span-2">
          <RoleOverview role={role} />
        </section>
        <QuickActions role={role} />
      </div>
    </div>
  );
}

function WelcomeBanner({ user }) {
  return (
    <section className="card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent-start via-primary-800 to-primary-900 opacity-95" />
      <div className="absolute -right-10 -top-10 size-52 rounded-full bg-white/5 blur-2xl" />
      <div className="relative z-10 p-6 text-white md:p-8">
        <p className="text-sm text-primary-100">{todayGreeting()}</p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">{user?.fullName}</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-primary-100">
          {roleBlurb(user?.role)}
        </p>
      </div>
    </section>
  );
}

function RoleOverview({ role }) {
  if (role === 'STUDENT') return <StudentOverview />;
  if (role === 'FACULTY') return <FacultyOverview />;
  return <OfficerOverview role={role} />;
}

function StudentOverview() {
  const [data, setData] = useState(null);

  useEffect(() => {
    request({ url: '/students/me' }).then(setData).catch(() => {});
  }, []);

  if (!data) return <LoadingCards />;

  const latest = data.enrollmentRequests?.[0] ?? null;
  const latestStatus = latest?.status ?? null;
  const gradeCount = data.grades?.length ?? 0;
  const gradeAvg = gradeCount
    ? (data.grades.reduce((sum, g) => sum + Number(g.grade ?? 0), 0) / gradeCount).toFixed(2)
    : null;

  const statusMap = {
    PENDING: { label: 'Pending review', cls: 'badge-amber' },
    APPROVED: { label: 'Approved', cls: 'badge-green' },
    REJECTED: { label: 'Rejected', cls: 'badge-red' },
    WITHDRAWN: { label: 'Withdrawn', cls: 'badge-gray' },
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          <GraduationCap size={16} className="text-primary-600" /> My Enrollment
        </h2>
        <Link to="/enroll" className="btn-primary !px-3 !py-1.5 text-xs">
          Start enrollment <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat icon={BookOpen} label="Program" value={data.program?.code ?? '—'} />
        <MiniStat icon={CalendarDays} label="Year level" value={`Year ${data.yearLevel ?? '—'}`} />
        <MiniStat icon={ClipboardList} label="Latest request" value={latestStatus ? statusMap[latestStatus].label : 'None'} tone={latestStatus ? statusMap[latestStatus].cls : 'badge-gray'} />
        <MiniStat icon={BarChart3} label="Grade average" value={gradeAvg != null ? Number(gradeAvg).toFixed(2) : '—'} />
      </div>

      {latest && (
        <div className="rounded-[15px] border border-primary-100 bg-primary-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-primary-700">{latest.term?.label}</p>
              <p className="text-xs text-slate-500">
                {latest.items?.length ?? 0} sections · submitted {formatDate(latest.submittedAt)}
              </p>
            </div>
            <span className={`badge ${statusMap[latest.status]?.cls ?? 'badge-gray'}`}>{latest.status}</span>
          </div>
          {latest.reviewNotes && (
            <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
              <span className="font-semibold">Registrar note:</span> {latest.reviewNotes}
            </p>
          )}
        </div>
      )}

      {gradeCount > 0 && (
        <p className="text-xs text-slate-400">{gradeCount} finalized grade record(s) across your terms.</p>
      )}
    </div>
  );
}

function FacultyOverview() {
  const [sections, setSections] = useState(null);

  useEffect(() => {
    request({ url: '/sections/my' }).then(setSections).catch(() => setSections([]));
  }, []);

  if (!sections) return <LoadingCards />;

  const studentCount = sections.reduce((sum, s) => sum + (s._count?.items ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          <BookOpen size={16} className="text-primary-600" /> My Teaching Load
        </h2>
        <Link to="/my-sections" className="btn-primary !px-3 !py-1.5 text-xs">
          Open grade sheets <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MiniStat icon={LayoutGrid} label="Sections" value={sections.length} />
        <MiniStat icon={Users} label="Students" value={studentCount} />
        <MiniStat icon={BookOpen} label="Subjects" value={new Set(sections.map((s) => s.subject?.id)).size} />
      </div>

      {sections.length === 0 ? (
        <p className="rounded-[15px] border border-dashed border-slate-200 p-4 text-sm text-slate-400">
          No sections assigned yet. The Registrar will assign your teaching load when the term opens.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {sections.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-slate-700">{s.subject?.title}</p>
                <p className="text-xs text-slate-400">
                  {s.code} · {s.term?.label} · {s.schedule} · {s.room}
                </p>
              </div>
              <span className="badge badge-blue">{s._count?.items ?? 0} students</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OfficerOverview({ role }) {
  const [overview, setOverview] = useState(null);
  const [sections, setSections] = useState(null);

  useEffect(() => {
    Promise.all([
      request({ url: '/analytics/overview' }),
      request({ url: '/analytics/sections' }),
    ])
      .then(([overviewData, sectionData]) => {
        setOverview(overviewData);
        setSections(sectionData);
      })
      .catch(() => {});
  }, []);

  if (!overview || !sections) return <LoadingCards />;

  const pending = overview.termSeries.reduce((sum, t) => sum + (t.pending ?? 0), 0);
  const totalRequests = overview.termSeries.reduce((sum, t) => sum + (t.pending ?? 0) + (t.approved ?? 0) + (t.rejected ?? 0), 0);
  const isAdmin = role === 'ADMIN';

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
        <BarChart3 size={16} className="text-primary-600" /> System at a glance
      </h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MiniStat icon={Inbox} label="Pending requests" value={pending} tone="badge-amber" />
        <MiniStat icon={Users} label="Active students" value={overview.totals.students} />
        <MiniStat icon={LayoutGrid} label="Sections" value={sections.length} />
        <MiniStat icon={ClipboardList} label="Approved requests" value={overview.totals.approvedEnrollments} />
        <MiniStat icon={FileText} label="Total requests" value={totalRequests} />
        <MiniStat icon={GraduationCap} label="Programs" value={overview.totals.programs} tone="badge-green" />
      </div>

      {isAdmin && (
        <p className="text-xs text-slate-400">
          Manage accounts, academic terms, and the catalog from the Administration menu.
        </p>
      )}
    </div>
  );
}

function QuickActions({ role }) {
  const actions = {
    STUDENT: [
      { to: '/enroll', label: 'Enroll for a term', icon: ClipboardList, desc: 'Pick sections and submit' },
      { to: '/requests', label: 'My requests', icon: FileText, desc: 'Track approvals' },
      { to: '/grades', label: 'My grades', icon: GraduationCap, desc: 'View finalized grades' },
    ],
    FACULTY: [
      { to: '/my-sections', label: 'My sections', icon: LayoutGrid, desc: 'Open grade sheets' },
    ],
    REGISTRAR: [
      { to: '/review', label: 'Review requests', icon: Inbox, desc: 'Approve or reject' },
      { to: '/students', label: 'Student records', icon: Users, desc: 'Browse the registry' },
      { to: '/sections', label: 'Sections', icon: LayoutGrid, desc: 'Monitor occupancy' },
    ],
    ADMIN: [
      { to: '/review', label: 'Review requests', icon: Inbox, desc: 'Approve or reject' },
      { to: '/users', label: 'User accounts', icon: Users, desc: 'Manage access' },
      { to: '/terms', label: 'Academic terms', icon: CalendarDays, desc: 'Set the calendar' },
    ],
  }[role] ?? [];

  return (
    <section className="card card-pad">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
        <ArrowRight size={15} className="text-primary-600" /> Quick actions
      </h2>
      <div className="space-y-2.5">
        {actions.map((action) => (
          <Link key={action.to} to={action.to} className="group flex items-center gap-3 rounded-[15px] border border-slate-100 p-3 transition-colors hover:border-primary-200 hover:bg-primary-50">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 group-hover:bg-white">
              <action.icon size={17} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-700">{action.label}</span>
              <span className="block truncate text-xs text-slate-400">{action.desc}</span>
            </span>
            <ArrowRight size={14} className="ml-auto shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-600" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function MiniStat({ icon: Icon, label, value, tone = 'badge-blue' }) {
  return (
    <div className="rounded-[15px] border border-slate-100 bg-slate-50/50 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <Icon size={14} className="shrink-0 text-primary-600/60" />
      </div>
      <p className="mt-1.5 text-xl font-bold text-slate-800">{value}</p>
      <span className={`badge mt-1 ${tone}`}>{tone === 'badge-amber' ? 'needs action' : 'current'}</span>
    </div>
  );
}

function LoadingCards() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-[15px] bg-slate-100" />
      ))}
    </div>
  );
}

function todayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function roleBlurb(role) {
  switch (role) {
    case 'STUDENT':
      return 'Manage your enrollment — select subjects, track request approvals, and review your finalized grades.';
    case 'FACULTY':
      return 'Your assigned sections and grade sheets for the current academic year.';
    case 'REGISTRAR':
      return 'Review enrollment requests, maintain student records, and monitor section occupancy.';
    case 'ADMIN':
      return 'Oversee the whole system — accounts, academic terms, and the institutional catalog.';
    default:
      return '';
  }
}