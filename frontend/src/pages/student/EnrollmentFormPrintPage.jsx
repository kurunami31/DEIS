import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { request } from '../../lib/api.js';

const STATUS_LABEL = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn' };

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function EnrollmentFormPrintPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    request({ url: '/enrollments/my' })
      .then((requests) => {
        const found = requests.find((r) => r.id === id);
        if (!found) setError('Enrollment request not found.');
        else setRequest(found);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!request) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const student = request.student;
  const units = request.items.reduce((sum, item) => sum + item.section.subject.units, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <button onClick={() => navigate('/requests')} className="btn-secondary !px-3 !py-2 text-xs">
          <ArrowLeft size={14} /> Back
        </button>
        <button onClick={() => window.print()} className="btn-primary !px-4 !py-2 text-xs">
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      <div className="card card-pad bg-white">
        <header className="border-b-2 border-slate-800 pb-4 text-center">
          <p className="text-lg font-bold tracking-wide">Davao Oriental State University</p>
          <p className="text-[11px] uppercase tracking-widest text-slate-500">Enrollment Information System</p>
          <h1 className="mt-3 text-xl font-bold">Enrollment Form</h1>
          <p className="text-sm text-slate-500">{request.term?.label} · {STATUS_LABEL[request.status] ?? request.status}</p>
        </header>

        <section className="mt-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <p><span className="font-semibold">Student:</span> {student?.lastName}, {student?.firstName}{student?.nameSuffix ? ` ${student.nameSuffix}` : ''}</p>
            <p><span className="font-semibold">Student no.:</span> {student?.studentNo}</p>
            <p><span className="font-semibold">Program:</span> {student?.program?.name ?? '—'}</p>
            <p><span className="font-semibold">Campus:</span> {student?.campus?.name ?? '—'}</p>
            <p><span className="font-semibold">Submitted:</span> {formatDate(request.submittedAt)}</p>
            <p><span className="font-semibold">Status:</span> {STATUS_LABEL[request.status] ?? request.status}</p>
          </div>
        </section>

        <table className="mt-5 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-300">
              <th className="py-2 pr-2 font-semibold">#</th>
              <th className="py-2 pr-2 font-semibold">Subject Code</th>
              <th className="py-2 pr-2 font-semibold">Subject Title</th>
              <th className="py-2 pr-2 font-semibold">Units</th>
              <th className="py-2 pr-2 font-semibold">Schedule</th>
              <th className="py-2 pr-2 font-semibold">Room</th>
              <th className="py-2 font-semibold">Faculty</th>
            </tr>
          </thead>
          <tbody>
            {request.items.map((item, idx) => (
              <tr key={item.id} className="border-b border-slate-200">
                <td className="py-2 pr-2">{idx + 1}</td>
                <td className="py-2 pr-2">{item.section.subject.code}</td>
                <td className="py-2 pr-2">{item.section.subject.title}</td>
                <td className="py-2 pr-2">{item.section.subject.units}</td>
                <td className="py-2 pr-2">{item.section.schedule}</td>
                <td className="py-2 pr-2">{item.section.room}</td>
                <td className="py-2">{item.section.faculty?.fullName ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-4 text-sm font-semibold text-slate-700">Total units: {units}</p>

        {request.reviewNotes && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span className="font-semibold">Reviewer note:</span> {request.reviewNotes}
          </p>
        )}

        <footer className="mt-10 grid grid-cols-2 gap-8 text-center text-sm">
          <div>
            <p className="border-t border-slate-400 pt-1 font-medium">{student?.lastName}, {student?.firstName}</p>
            <p className="text-xs text-slate-500">Student</p>
          </div>
          <div>
            <p className="border-t border-slate-400 pt-1 font-medium">Office of the Registrar</p>
            <p className="text-xs text-slate-500">Registrar</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
