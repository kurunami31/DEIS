import { useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { request } from '../../lib/api.js';
import { formatDate } from '../../lib/utils.js';

export default function GeneralLedger() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const load = () => {
    request({ url: `/accounting/ledger?page=${page}&limit=30` })
      .then((d) => { setEntries(d.entries); setTotal(d.total); })
      .catch(() => {});
  };

  useEffect(() => { load(); }, [page]);

  const filtered = entries.filter((e) => !search || e.account.name.toLowerCase().includes(search.toLowerCase()) || e.journalEntry.description.toLowerCase().includes(search.toLowerCase()));
  const fmt = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <BookOpen size={15} className="text-primary-600" />
          <span className="font-semibold text-slate-700">{total}</span> ledger entries
        </div>
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-8" placeholder="Search account or description…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Date</th><th>Account</th><th>Description</th><th>Debit</th><th>Credit</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">No ledger entries.</td></tr>
              ) : filtered.map((e) => (
                <tr key={e.id}>
                  <td className="text-xs">{formatDate(e.journalEntry.date)}</td>
                  <td className="text-xs"><span className="badge badge-gray">{e.account.code}</span> {e.account.name}</td>
                  <td className="text-xs">{e.journalEntry.description}</td>
                  <td className="text-xs font-semibold text-emerald-700">{Number(e.debit) > 0 ? fmt(e.debit) : '—'}</td>
                  <td className="text-xs font-semibold text-red-600">{Number(e.credit) > 0 ? fmt(e.credit) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {total > 30 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary !px-3 !py-1 text-xs" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="px-3 py-1 text-xs text-slate-500">Page {page} of {Math.ceil(total / 30)}</span>
          <button className="btn-secondary !px-3 !py-1 text-xs" disabled={page * 30 >= total} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
