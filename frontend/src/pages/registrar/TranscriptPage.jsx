import { useEffect, useState } from 'react';
import { Search, FileText } from 'lucide-react';
import { request } from '../../lib/api.js';
import { formatDate } from '../../lib/utils.js';

export default function TranscriptPage() {
  const [query, setQuery] = useState('');
  const [student, setStudent] = useState(null);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const students = await request({ url: '/students', params: { search: query, pageSize: 1 } });
      if (!students.items?.length) { setError('Student not found.'); setStudent(null); return; }
      const s = students.items[0];
      setStudent(s);
      const gradeData = await request({ url: `/grades/student/${s.id}` });
      setGrades(gradeData);
    } catch (err) { setError(err.message); setStudent(null); } finally { setLoading(false); }
  };

  const fmt = (n) => n != null ? Number(n).toFixed(2) : '—';

  const printTranscript = () => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Transcript - ${student.firstName} ${student.lastName}</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 40px; color: #111; }
        h1 { text-align: center; font-size: 18px; margin-bottom: 4px; }
        h2 { text-align: center; font-size: 14px; font-weight: normal; margin-top: 0; color: #555; }
        .info { margin: 20px 0; font-size: 13px; line-height: 1.8; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
        th, td { border: 1px solid #333; padding: 6px 10px; text-align: left; }
        th { background: #f0f0f0; font-weight: bold; }
        .footer { margin-top: 30px; font-size: 11px; text-align: center; color: #777; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>Davao Oriental State University</h1>
      <h2>Official Transcript of Records</h2>
      <div class="info">
        <strong>Name:</strong> ${student.lastName}, ${student.firstName}<br>
        <strong>Student No.:</strong> ${student.studentNo}<br>
        <strong>Program:</strong> ${student.program?.name ?? '—'}<br>
        <strong>Year Level:</strong> ${student.yearLevel ?? '—'}
      </div>
      <table>
        <thead><tr><th>Code</th><th>Subject</th><th>Prelim</th><th>Midterm</th><th>Final</th><th>Grade</th><th>Status</th></tr></thead>
        <tbody>
          ${grades.map((g) => `<tr><td>${g.section?.subject?.code ?? '—'}</td><td>${g.section?.subject?.name ?? '—'}</td><td>${fmt(g.prelim)}</td><td>${fmt(g.midterm)}</td><td>${fmt(g.final)}</td><td>${fmt(g.grade)}</td><td>${g.status}</td></tr>`).join('')}
        </tbody>
      </table>
      <div class="footer">Generated on ${new Date().toLocaleDateString()} via DEIS</div>
      <script>window.onload = () => { window.print(); }</script>
    </body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-slate-800">Student Transcript</h1>

      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Search by student number or name…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        <button className="btn-primary !px-4" onClick={search} disabled={loading}>
          <Search size={15} /> {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error && <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {student && (
        <div className="space-y-4">
          <section className="card card-pad">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-800">{student.firstName} {student.lastName}</h2>
                <p className="text-xs text-slate-500">{student.studentNo} · {student.program?.name ?? '—'} · Year {student.yearLevel ?? '—'}</p>
              </div>
              <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={printTranscript}>
                <FileText size={14} /> Print Transcript
              </button>
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr><th>Code</th><th>Subject</th><th>Prelim</th><th>Midterm</th><th>Final</th><th>Grade</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {grades.length === 0 ? (
                    <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">No grade records found.</td></tr>
                  ) : grades.map((g) => (
                    <tr key={g.id}>
                      <td className="text-xs font-medium">{g.section?.subject?.code ?? '—'}</td>
                      <td className="text-xs">{g.section?.subject?.name ?? '—'}</td>
                      <td className="text-xs">{fmt(g.prelim)}</td>
                      <td className="text-xs">{fmt(g.midterm)}</td>
                      <td className="text-xs">{fmt(g.final)}</td>
                      <td className="text-xs font-semibold">{fmt(g.grade)}</td>
                      <td className="text-xs"><span className={`badge ${g.status === 'PASSED' ? 'badge-green' : g.status === 'FAILED' ? 'badge-red' : 'badge-gray'}`}>{g.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
