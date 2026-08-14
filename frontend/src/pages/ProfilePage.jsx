import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, CheckCircle2, GraduationCap, HeartHandshake, KeyRound, Lock, ShieldCheck, UserRound, Users } from 'lucide-react';
import { request } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate } from '../lib/utils.js';

const ROLE_LABEL = {
  STUDENT: 'Student',
  FACULTY: 'Faculty',
  REGISTRAR: 'Registrar',
  ADMIN: 'Administrator',
  ACCOUNTING: 'Accounting',
  ADMISSION: 'Admission',
  OSA: 'OSA',
  OHS: 'Health Services',
  CASHIERING: 'Cashiering',
  OSCD: 'Guidance & Counseling',
  FAASG: 'Financial Aids & Scholarships',
};

const SPF_STEPS = [
  { id: 'admission', label: 'Admission', icon: GraduationCap },
  { id: 'personal', label: 'Personal Info', icon: UserRound },
  { id: 'family', label: 'Family Background', icon: Users },
  { id: 'education', label: 'Education', icon: BookOpen },
  { id: 'scas', label: 'SCAS Result', icon: ShieldCheck },
  { id: 'features', label: 'Unique Features', icon: HeartHandshake },
];

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  const setTab = (t) => setSearchParams(t === 'overview' ? {} : { tab: t });

  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user.role === 'STUDENT') {
      request({ url: '/students/me' })
        .then(setProfile)
        .catch((err) => setError(err.message));
    }
  }, [user.role]);

  const tabs = user?.role === 'STUDENT'
    ? [
        { id: 'overview', label: 'Overview' },
        { id: 'edit', label: 'Edit details' },
        { id: 'spf', label: 'Profile Form (SPF)' },
        { id: 'security', label: 'Security' },
      ]
    : [
        { id: 'overview', label: 'Overview' },
        { id: 'security', label: 'Security' },
      ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-primary-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab user={user} profile={profile} error={error} />}
      {tab === 'edit' && user?.role === 'STUDENT' && <EditTab profile={profile} onSaved={setProfile} />}
      {tab === 'spf' && user?.role === 'STUDENT' && <SpfTab profile={profile} onSaved={setProfile} />}
      {tab === 'security' && <SecurityTab user={user} setUser={setUser} />}
    </div>
  );
}

/* ---------------------------------------------------------------- Overview */
function OverviewTab({ user, profile, error }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <section className="card card-pad">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-accent-start to-accent-end text-2xl font-bold text-white">
            {initialsOf(user?.fullName)}
          </span>
          <h2 className="mt-3 text-lg font-bold text-slate-800">{profile?.firstName} {profile?.lastName || user?.fullName}</h2>
          <p className="text-sm text-slate-400">{user?.email}</p>
          <span className={`badge mt-2 ${ROLE_BADGE[user?.role] ?? 'badge-green'}`}>
            {ROLE_LABEL[user?.role] ?? user?.role}
          </span>
        </div>

        {user?.role === 'STUDENT' && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            {error ? (
              <p className="text-xs text-red-600">{error}</p>
            ) : profile ? (
              <dl className="space-y-2.5 text-sm">
                <Field label="Student number" value={profile.studentNo} mono />
                <Field label="Program" value={profile.program?.name} />
                <Field label="Campus" value={profile.campus?.name} />
                <Field label="Year level" value={`Year ${profile.yearLevel ?? '—'}`} />
                <Field label="Civil status" value={profile.civilStatus ? labelEnum(profile.civilStatus) : '—'} />
                <Field label="Enrolled since" value={formatDate(profile.enrolledAt)} />
                <Field
                  label="Profile form"
                  value={profile.spfCompletedAt ? `Completed ${formatDate(profile.spfCompletedAt)}` : 'Not submitted'}
                  valueClass={profile.spfCompletedAt ? 'text-emerald-600' : 'text-amber-600'}
                />
              </dl>
            ) : (
              <div className="h-40 animate-pulse rounded-[15px] bg-slate-100" />
            )}
          </div>
        )}
      </section>

      <section className="card card-pad lg:col-span-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          <UserRound size={15} className="text-primary-600" /> Account details
        </h3>
        <dl className="mt-3 space-y-2.5 text-sm">
          <Field label="Role" value={ROLE_LABEL[user?.role] ?? user?.role} />
          <Field label="Member since" value={formatDate(user?.createdAt)} />
          <Field label="Last login" value={formatDate(user?.lastLoginAt)} />
        </dl>

        {user?.role === 'STUDENT' && profile && (
          <div className="mt-8 border-t border-slate-100 pt-4">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
              <CheckCircle2 size={15} className="text-emerald-600" />
              My enrollment status
            </h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Field label="Requests submitted" value={profile.enrollmentRequests?.length} />
              <Field label="Grades on record" value={profile.grades?.length} />
              <Field label="Active term" value={profile.enrollmentRequests?.[0]?.term?.label ?? '—'} />
            </dl>
          </div>
        )}
      </section>
    </div>
  );
}

/* --------------------------------------------------------------- Edit tab */
function EditTab({ profile, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        personalEmail: profile.personalEmail ?? '',
        contactNumber: profile.contactNumber ?? '',
        permanentAddress: profile.permanentAddress ?? '',
        zipCode: profile.zipCode ?? '',
        religion: profile.religion ?? '',
        tribe: profile.tribe ?? '',
        middleName: profile.middleName ?? '',
      });
    }
  }, [profile]);

  if (!profile || !form) return <div className="h-40 animate-pulse rounded-[15px] bg-slate-100" />;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await request({ method: 'patch', url: '/students/me', data: form });
      onSaved(res.student ?? profile);
      toast.success('Profile details updated.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card card-pad max-w-2xl">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
        <UserRound size={15} className="text-primary-600" /> Edit my details
      </h3>
      <form onSubmit={handleSave} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldInput label="Middle name" value={form.middleName} onChange={(v) => setForm({ ...form, middleName: v })} />
          <FieldInput label="Personal email" type="email" value={form.personalEmail} onChange={(v) => setForm({ ...form, personalEmail: v })} />
          <FieldInput label="Contact number" value={form.contactNumber} onChange={(v) => setForm({ ...form, contactNumber: v })} />
          <FieldInput label="Religion" value={form.religion} onChange={(v) => setForm({ ...form, religion: v })} />
          <FieldInput label="Tribe / Ethnic group" value={form.tribe} onChange={(v) => setForm({ ...form, tribe: v })} />
          <FieldInput label="Zip code" value={form.zipCode} onChange={(v) => setForm({ ...form, zipCode: v })} />
        </div>
        <div>
          <label className="label">Permanent address</label>
          <textarea className="input min-h-20" value={form.permanentAddress} onChange={(e) => setForm({ ...form, permanentAddress: e.target.value })} />
        </div>
        <button className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save details'}
        </button>
      </form>
    </section>
  );
}

/* ---------------------------------------------------------------- SPF tab */
function SpfTab({ profile, onSaved }) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    if (profile) {
      const p = profile;
      setForm({
        applicantType: p.applicantType ?? '',
        lrn: p.lrn ?? '',
        preferredCourse1: p.preferredCourse1 ?? '',
        preferredCourse2: p.preferredCourse2 ?? '',
        preferredCourse3: p.preferredCourse3 ?? '',
        admissionTerm: p.admissionTerm ?? `1st Semester, AY 2025-2026`,
        middleName: p.middleName ?? '',
        dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
        placeOfBirthCity: p.placeOfBirthCity ?? '',
        placeOfBirthProvince: p.placeOfBirthProvince ?? '',
        placeOfBirthCountry: p.placeOfBirthCountry ?? '',
        civilStatus: p.civilStatus ?? '',
        citizenship: p.citizenship ?? '',
        heightFt: p.heightFt ?? '',
        weightKg: p.weightKg ?? '',
        religion: p.religion ?? '',
        tribe: p.tribe ?? '',
        personalEmail: p.personalEmail ?? '',
        contactNumber: p.contactNumber ?? '',
        permanentAddress: p.permanentAddress ?? '',
        zipCode: p.zipCode ?? '',
        photo: p.photo ?? '',
        spouseName: p.spouseName ?? '',
        spouseOccupation: p.spouseOccupation ?? '',
        numberOfChildren: p.numberOfChildren ?? '',
        fatherName: p.fatherName ?? '',
        fatherOccupation: p.fatherOccupation ?? '',
        fatherContact: p.fatherContact ?? '',
        motherName: p.motherName ?? '',
        motherOccupation: p.motherOccupation ?? '',
        motherContact: p.motherContact ?? '',
        parentsStatus: p.parentsStatus ?? '',
        monthlyFamilyIncome: p.monthlyFamilyIncome ?? '',
        emergencyName: p.emergencyName ?? '',
        emergencyContact: p.emergencyContact ?? '',
        emergencyAddress: p.emergencyAddress ?? '',
        scasGeneral: p.scasGeneral ?? '',
        scasSpatial: p.scasSpatial ?? '',
        scasVerbal: p.scasVerbal ?? '',
        scasPerceptual: p.scasPerceptual ?? '',
        scasNumerical: p.scasNumerical ?? '',
        scasManualDexterity: p.scasManualDexterity ?? '',
        hobbies: p.hobbies ?? '',
        motto: p.motto ?? '',
        specialSkills: p.specialSkills ?? '',
        specialInterests: p.specialInterests ?? '',
        elementarySchool: p.elementarySchool ?? '',
        elementaryYear: p.elementaryYear ?? '',
        shsSchool: p.shsSchool ?? '',
        shsStrand: p.shsStrand ?? '',
        shsYear: p.shsYear ?? '',
        vocationalCourse: p.vocationalCourse ?? '',
        vocationalYear: p.vocationalYear ?? '',
        collegeDegree: p.collegeDegree ?? '',
        collegeYear: p.collegeYear ?? '',
      });
    }
  }, [profile]);

  const filledFraction = useMemo(() => {
    if (!form) return 0;
    const filled = Object.values(form).filter((v) => v !== '' && v !== null && v !== undefined).length;
    return Math.round((filled / Object.keys(form).length) * 100);
  }, [form]);

  if (!profile || !form) return <div className="h-60 animate-pulse rounded-[15px] bg-slate-100" />;

  const patch = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const set = (key) => (e) => patch(key, e.target.value);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      toast.error('Photo must be under 1 MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch('photo', reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await request({ method: 'patch', url: '/students/me', data: form });
      onSaved(res.student ?? profile);
      setMissing(res.missing ?? []);
      toast.success(res.spfCompleted ? 'Profile form submitted. You can now enroll!' : 'Saved. Some required fields are still missing.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <section className="card card-pad">
        <div className="mb-1 flex items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
              <GraduationCap size={15} className="text-primary-600" /> Student Profile Form
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">FM-DOrSU-ODI-05 · required before enrollment</p>
          </div>
          <span className="badge badge-green">{filledFraction}% complete</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${filledFraction}%` }} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SPF_STEPS.map((s, i) => (
            <button
              type="button"
              key={s.id}
              onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                step === i ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <s.icon size={13} />
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {missing.length > 0 && (
        <section className="rounded-[15px] border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Almost there — these required fields are still missing:</p>
          <p className="mt-1 text-xs text-amber-700">{missing.map(labelEnum).join(', ')}</p>
        </section>
      )}

      {step === 0 && (
        <SpfStep title="I. Application for Admission">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Applicant type" value={form.applicantType} onChange={set('applicantType')} options={[
              ['', 'Select…'], ['FIRST_YEAR', 'First Year'], ['TRANSFEREE', 'Transferee'], ['RETURNEE', 'Returnee'],
            ]} />
            <FieldInput label="LRN (Learner Reference Number)" value={form.lrn} onChange={set('lrn')} />
            <FieldInput label="Preferred course 1" value={form.preferredCourse1} onChange={set('preferredCourse1')} />
            <FieldInput label="Preferred course 2" value={form.preferredCourse2} onChange={set('preferredCourse2')} />
            <FieldInput label="Preferred course 3" value={form.preferredCourse3} onChange={set('preferredCourse3')} />
            <FieldInput label="Semester / Academic year" value={form.admissionTerm} onChange={set('admissionTerm')} />
          </div>
        </SpfStep>
      )}

      {step === 1 && (
        <SpfStep title="II. Personal Information">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldInput label="Middle name" value={form.middleName} onChange={set('middleName')} />
            <FieldInput label="Date of birth" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
            <FieldInput label="Place of birth (municipality/city)" value={form.placeOfBirthCity} onChange={set('placeOfBirthCity')} />
            <FieldInput label="Place of birth (province)" value={form.placeOfBirthProvince} onChange={set('placeOfBirthProvince')} />
            <FieldInput label="Place of birth (country)" value={form.placeOfBirthCountry} onChange={set('placeOfBirthCountry')} />
            <Select label="Civil status" value={form.civilStatus} onChange={set('civilStatus')} options={[
              ['', 'Select…'], ['SINGLE', 'Single'], ['MARRIED', 'Married'], ['WIDOWED', 'Widowed'], ['SEPARATED', 'Separated/Annulled'],
            ]} />
            <FieldInput label="Citizenship" value={form.citizenship} onChange={set('citizenship')} />
            <FieldInput label="Height (ft)" value={form.heightFt} onChange={set('heightFt')} />
            <FieldInput label="Weight (kg)" value={form.weightKg} onChange={set('weightKg')} />
            <FieldInput label="Religion" value={form.religion} onChange={set('religion')} />
            <FieldInput label="Tribe / Ethnic group" value={form.tribe} onChange={set('tribe')} />
            <FieldInput label="Email address" type="email" value={form.personalEmail} onChange={set('personalEmail')} />
            <FieldInput label="Contact number" value={form.contactNumber} onChange={set('contactNumber')} />
            <FieldInput label="Zip code" value={form.zipCode} onChange={set('zipCode')} />
            <div className="sm:col-span-2">
              <label className="label">Permanent address</label>
              <textarea className="input min-h-20" value={form.permanentAddress} onChange={set('permanentAddress')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">2x2 ID photo</label>
              <div className="flex items-center gap-4">
                <div className="flex size-24 items-center justify-center overflow-hidden rounded-[15px] border border-dashed border-slate-300 bg-slate-50">
                  {form.photo ? (
                    <img src={form.photo} alt="2x2" className="size-full object-cover" />
                  ) : (
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">2x2 photo</span>
                  )}
                </div>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                  <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
                    Upload photo
                  </button>
                  {form.photo && (
                    <button type="button" className="ml-2 text-xs text-red-500 hover:underline" onClick={() => patch('photo', '')}>
                      Remove
                    </button>
                  )}
                  <p className="mt-1 text-[11px] text-slate-400">PNG/JPG, under 1 MB</p>
                </div>
              </div>
            </div>
          </div>
        </SpfStep>
      )}

      {step === 2 && (
        <SpfStep title="III. Family Background">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldInput label="Name of spouse" value={form.spouseName} onChange={set('spouseName')} />
            <FieldInput label="Spouse occupation" value={form.spouseOccupation} onChange={set('spouseOccupation')} />
            <FieldInput label="Number of children" type="number" value={form.numberOfChildren} onChange={set('numberOfChildren')} />
            <FieldInput label="Father's name" value={form.fatherName} onChange={set('fatherName')} />
            <FieldInput label="Father's occupation" value={form.fatherOccupation} onChange={set('fatherOccupation')} />
            <FieldInput label="Father's contact no." value={form.fatherContact} onChange={set('fatherContact')} />
            <FieldInput label="Mother's name" value={form.motherName} onChange={set('motherName')} />
            <FieldInput label="Mother's occupation" value={form.motherOccupation} onChange={set('motherOccupation')} />
            <FieldInput label="Mother's contact no." value={form.motherContact} onChange={set('motherContact')} />
            <Select label="Parents are" value={form.parentsStatus} onChange={set('parentsStatus')} options={[
              ['', 'Select…'], ['LIVING_TOGETHER', 'Living together'], ['PERMANENTLY_SEPARATED', 'Permanently separated'],
              ['ANNULLED', 'Marriage annulled/legally separated'], ['TEMPORARILY_SEPARATED', 'Temporarily separated'],
              ['FATHER_OTHER_PARTNER', 'Father with another partner'], ['MOTHER_OTHER_PARTNER', 'Mother with another partner'],
            ]} />
            <FieldInput label="Monthly family income (estimated)" value={form.monthlyFamilyIncome} onChange={set('monthlyFamilyIncome')} />
            <div className="sm:col-span-2">
              <h4 className="label">Person to contact in case of emergency</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldInput label="Name" value={form.emergencyName} onChange={set('emergencyName')} />
                <FieldInput label="Contact number" value={form.emergencyContact} onChange={set('emergencyContact')} />
                <div className="sm:col-span-2">
                  <FieldInput label="Address" value={form.emergencyAddress} onChange={set('emergencyAddress')} />
                </div>
              </div>
            </div>
          </div>
        </SpfStep>
      )}

      {step === 3 && (
        <SpfStep title="VI. Educational Background">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldInput label="Elementary school" value={form.elementarySchool} onChange={set('elementarySchool')} />
            <FieldInput label="Year graduated" value={form.elementaryYear} onChange={set('elementaryYear')} />
            <FieldInput label="Senior High School" value={form.shsSchool} onChange={set('shsSchool')} />
            <FieldInput label="Senior High School strand" value={form.shsStrand} onChange={set('shsStrand')} />
            <FieldInput label="Senior High School year graduated" value={form.shsYear} onChange={set('shsYear')} />
            <FieldInput label="Vocational course" value={form.vocationalCourse} onChange={set('vocationalCourse')} />
            <FieldInput label="Vocational year graduated" value={form.vocationalYear} onChange={set('vocationalYear')} />
            <FieldInput label="College degree" value={form.collegeDegree} onChange={set('collegeDegree')} />
            <FieldInput label="College year graduated" value={form.collegeYear} onChange={set('collegeYear')} />
          </div>
        </SpfStep>
      )}

      {step === 4 && (
        <SpfStep title="IV. SCAS Result (indicate the index)">
          <div className="grid gap-4 sm:grid-cols-3">
            <FieldInput label="General ability" type="number" step="0.01" value={form.scasGeneral} onChange={set('scasGeneral')} />
            <FieldInput label="Spatial aptitude" type="number" step="0.01" value={form.scasSpatial} onChange={set('scasSpatial')} />
            <FieldInput label="Verbal aptitude" type="number" step="0.01" value={form.scasVerbal} onChange={set('scasVerbal')} />
            <FieldInput label="Perceptual aptitude" type="number" step="0.01" value={form.scasPerceptual} onChange={set('scasPerceptual')} />
            <FieldInput label="Numerical aptitude" type="number" step="0.01" value={form.scasNumerical} onChange={set('scasNumerical')} />
            <FieldInput label="Manual dexterity" type="number" step="0.01" value={form.scasManualDexterity} onChange={set('scasManualDexterity')} />
          </div>
        </SpfStep>
      )}

      {step === 5 && (
        <SpfStep title="V. Unique Features">
          <div className="space-y-4">
            <FieldInput label="Hobbies / Recreational activities" value={form.hobbies} onChange={set('hobbies')} />
            <FieldInput label="Motto" value={form.motto} onChange={set('motto')} />
            <FieldInput label="Special skills / Talents" value={form.specialSkills} onChange={set('specialSkills')} />
            <FieldInput label="Special interests" value={form.specialInterests} onChange={set('specialInterests')} />
          </div>
        </SpfStep>
      )}

      <div className="flex items-center justify-between gap-3">
        <button type="button" className="btn-secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Back
        </button>
        <div className="flex items-center gap-3">
          {step < SPF_STEPS.length - 1 && (
            <button type="button" className="btn-secondary" onClick={() => setStep((s) => s + 1)}>
              Next
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : profile?.spfCompletedAt ? 'Update profile form' : 'Submit profile form'}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------ Security tab */
function SecurityTab({ user, setUser }) {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changing, setChanging] = useState(false);

  // Two-factor (TOTP) state
  const [totpMode, setTotpMode] = useState(null); // 'enroll' | 'disable'
  const [enrollment, setEnrollment] = useState(null); // { secret, otpauthUrl }
  const [totpForm, setTotpForm] = useState({ secret: '', code: '' });
  const [totpBusy, setTotpBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState(null);

  // Security questions state
  const SECURITY_QUESTIONS = [
    { id: 'mother_maiden', label: "What is your mother's maiden name?" },
    { id: 'birth_city', label: 'In what city were you born?' },
    { id: 'first_school', label: 'What is the name of your first school?' },
    { id: 'pet_name', label: 'What was the name of your first pet?' },
    { id: 'favorite_teacher', label: 'What was the name of your favorite teacher in grade school?' },
  ];
  const [questionsMode, setQuestionsMode] = useState(false);
  const [questionsBusy, setQuestionsBusy] = useState(false);
  const [questionRows, setQuestionRows] = useState([
    { questionId: '', answer: '' },
    { questionId: '', answer: '' },
    { questionId: '', answer: '' },
  ]);
  const [hasQuestions, setHasQuestions] = useState(false);

  useEffect(() => {
    request({ url: '/auth/security-questions' })
      .then((data) => setHasQuestions(data.questions.length > 0))
      .catch(() => {});
  }, []);

  const refreshUser = async () => setUser(await request({ url: '/auth/me' }));

  const handlePassword = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (form.newPassword.length < 12) {
      toast.error('Password must be at least 12 characters.');
      return;
    }
    if (!/[A-Z]/.test(form.newPassword) || !/[a-z]/.test(form.newPassword) || !/[0-9]/.test(form.newPassword) || !/[^A-Za-z0-9]/.test(form.newPassword)) {
      toast.error('Password needs uppercase, lowercase, a number, and a special character.');
      return;
    }
    setChanging(true);
    try {
      await request({ method: 'post', url: '/auth/change-password', data: { currentPassword: form.currentPassword, newPassword: form.newPassword } });
      toast.success('Password updated. Other sessions have been signed out.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      await refreshUser();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setChanging(false);
    }
  };

  const startEnroll = async () => {
    setTotpBusy(true);
    try {
      const data = await request({ method: 'post', url: '/auth/totp/enroll' });
      setEnrollment(data);
      setTotpMode('enroll');
      setTotpForm({ ...totpForm, secret: data.secret });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTotpBusy(false);
    }
  };

  const confirmEnroll = async (e) => {
    e.preventDefault();
    setTotpBusy(true);
    try {
      const data = await request({ method: 'post', url: '/auth/totp/confirm', data: { code: totpForm.code.trim() } });
      setRecoveryCodes(data.recoveryCodes);
      setTotpMode(null);
      setEnrollment(null);
      setTotpForm({ secret: '', code: '' });
      await refreshUser();
      toast.success('Two-factor authentication is now enabled.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTotpBusy(false);
    }
  };

  const disableTotp = async (e) => {
    e.preventDefault();
    setTotpBusy(true);
    try {
      await request({ method: 'post', url: '/auth/totp/disable', data: { code: totpForm.code.trim() } });
      setTotpMode(null);
      setTotpForm({ secret: '', code: '' });
      await refreshUser();
      toast.success('Two-factor authentication is now disabled.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTotpBusy(false);
    }
  };

  const doneRecovery = async () => {
    setRecoveryCodes(null);
    await refreshUser();
  };

  const saveQuestions = async (e) => {
    e.preventDefault();
    if (questionRows.filter((r) => r.questionId && r.answer.trim()).length < 3) {
      toast.error('Please answer at least 3 unique questions.');
      return;
    }
    setQuestionsBusy(true);
    try {
      await request({
        method: 'put',
        url: '/auth/security-questions',
        data: { answers: questionRows.filter((r) => r.questionId && r.answer.trim()) },
      });
      setHasQuestions(true);
      setQuestionsMode(false);
      toast.success('Security questions updated.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setQuestionsBusy(false);
    }
  };

  if (user.role === 'ADMIN') {
    return (
      <section className="card card-pad max-w-xl">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          <Lock size={15} className="text-primary-600" /> Password
        </h3>
        <p className="mt-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-xs text-primary-700">
          The administrator account is system-managed. Its password is set during provisioning
          and cannot be changed from the portal.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="card card-pad max-w-xl">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          <KeyRound size={15} className="text-primary-600" /> Change password
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Your password must be at least 12 characters with upper and lowercase letters, a number, and a special character.
        </p>
        <form onSubmit={handlePassword} className="mt-4 space-y-4">
          <div>
            <label className="label">Current password</label>
            <input className="input" type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
          </div>
          <div>
            <label className="label">New password</label>
            <input className="input" type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input className="input" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
          </div>
          <button className="btn-primary" disabled={changing}>
            <ShieldCheck size={15} />
            {changing ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>

      <section className="card card-pad mt-6 max-w-xl">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          <ShieldCheck size={15} className="text-primary-600" /> Two-factor authentication
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Add a second verification step to your sign-in using an authenticator app.
        </p>

        {user.totpEnabled ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
            <p className="font-medium">Enabled</p>
            <p className="mt-0.5 text-xs text-emerald-700">
              Your account requires a 6-digit code after the password at sign-in.
              Recovery codes are stored securely and each can be used once.
            </p>
            {totpMode !== 'disable' && (
              <button className="btn-secondary mt-3" onClick={() => { setTotpMode('disable'); setTotpForm({ ...totpForm, code: '' }); }}>
                Disable 2FA
              </button>
            )}
            {totpMode === 'disable' && (
              <form onSubmit={disableTotp} className="mt-3 flex items-end gap-2">
                <div className="flex-1">
                  <label className="label">Authenticator or recovery code</label>
                  <input className="input font-mono" value={totpForm.code} onChange={(e) => setTotpForm({ ...totpForm, code: e.target.value })} required />
                </div>
                <button className="btn-primary" disabled={totpBusy}>{totpBusy ? 'Working…' : 'Confirm'}</button>
                <button type="button" className="btn-secondary" onClick={() => setTotpMode(null)}>Cancel</button>
              </form>
            )}
          </div>
        ) : (
          <div className="mt-4">
            {totpMode !== 'enroll' && (
              <button className="btn-primary" onClick={startEnroll} disabled={totpBusy}>
                <ShieldCheck size={15} />
                {totpBusy ? 'Preparing…' : 'Enable 2FA'}
              </button>
            )}

            {totpMode === 'enroll' && enrollment && (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-primary-100 bg-primary-50 px-3 py-3">
                  <p className="text-xs font-semibold text-primary-800">Scan or enter this secret in your authenticator app</p>
                  <p className="mt-2 break-all font-mono text-sm text-slate-700">{enrollment.otpauthUrl}</p>
                  <p className="mt-2 break-all font-mono text-xs text-slate-500">Manual key: {enrollment.secret}</p>
                </div>
                <form onSubmit={confirmEnroll} className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="label">6-digit code from the app</label>
                    <input
                      className="input font-mono tracking-[0.4em]"
                      value={totpForm.code}
                      onChange={(e) => setTotpForm({ ...totpForm, code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      inputMode="numeric"
                      placeholder="••••••"
                      required
                    />
                  </div>
                  <button className="btn-primary" disabled={totpBusy || totpForm.code.length !== 6}>
                    {totpBusy ? 'Verifying…' : 'Verify & enable'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => { setTotpMode(null); setEnrollment(null); }}>
                    Cancel
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </section>

      {recoveryCodes && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={doneRecovery}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Recovery codes"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-base font-bold text-slate-900">Save your recovery codes</h4>
            <p className="mt-1 text-xs text-slate-500">
              Store these one-time codes somewhere safe. Each can be used once to sign in when you
              don&apos;t have your authenticator app.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {recoveryCodes.map((c) => (
                <code key={c} className="rounded-lg bg-slate-50 px-3 py-2 text-center text-sm font-mono text-slate-700">{c}</code>
              ))}
            </div>
            <button className="btn-primary mt-5 w-full justify-center" onClick={doneRecovery} autoFocus>
              I&apos;ve saved my codes
            </button>
          </div>
        </div>
      )}

      <section className="card card-pad mt-6 max-w-xl">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          <UserRound size={15} className="text-primary-600" /> Security questions
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Used to recover your password if you ever forget it. Answers are stored encrypted and can
          only be used for account recovery.
        </p>
        {hasQuestions && !questionsMode && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Set up ({questionRows.filter((r) => r.questionId).length}/3 answered)
          </p>
        )}
        {!questionsMode && (
          <button className="btn-secondary mt-3" onClick={() => setQuestionsMode(true)}>
            {hasQuestions ? 'Update security questions' : 'Set up security questions'}
          </button>
        )}
        {questionsMode && (
          <form onSubmit={saveQuestions} className="mt-4 space-y-3">
            {questionRows.map((row, i) => (
              <div key={i} className="flex gap-2">
                <select
                  className="input flex-1"
                  value={row.questionId}
                  onChange={(e) => {
                    const next = [...questionRows];
                    next[i] = { ...next[i], questionId: e.target.value };
                    setQuestionRows(next);
                  }}
                >
                  <option value="">Select a question</option>
                  {SECURITY_QUESTIONS.map((q) => (
                    <option key={q.id} value={q.id} disabled={questionRows.some((r, j) => j !== i && r.questionId === q.id)}>
                      {q.label}
                    </option>
                  ))}
                </select>
                <input
                  className="input flex-1"
                  placeholder="Your answer"
                  value={row.answer}
                  onChange={(e) => {
                    const next = [...questionRows];
                    next[i] = { ...next[i], answer: e.target.value };
                    setQuestionRows(next);
                  }}
                />
              </div>
            ))}
            <div className="flex items-center gap-2">
              <button className="btn-primary" disabled={questionsBusy}>
                {questionsBusy ? 'Saving…' : 'Save questions'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setQuestionsMode(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}

/* --------------------------------------------------------------- helpers */
function SpfStep({ title, children }) {
  return (
    <section className="card card-pad">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-600">{title}</h3>
      {children}
    </section>
  );
}

function FieldInput({ label, value, onChange, type = 'text', step }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} step={step} value={value} onChange={onChange} />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={onChange}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  );
}

const LABEL_MAP = {
  single: 'Single',
  married: 'Married',
  widowed: 'Widowed',
  separated: 'Separated/Annulled',
  first_year: 'Applicant type',
  lrn: 'LRN',
  middlename: 'Middle name',
  dateofbirth: 'Date of birth',
  placeofbirthcity: 'Place of birth (city)',
  placeofbirthprovince: 'Place of birth (province)',
  placeofbirthcountry: 'Place of birth (country)',
  civilstatus: 'Civil status',
  citizenship: 'Citizenship',
  sex: 'Sex',
  contactnumber: 'Contact number',
  permanentaddress: 'Permanent address',
  zipcode: 'Zip code',
  fathername: "Father's name",
  mothername: "Mother's name",
  parentsstatus: 'Parents status',
  monthlyfamilyincome: 'Monthly family income',
  emergencyname: 'Emergency contact name',
  emergencycontact: 'Emergency contact no.',
  emergencyaddress: 'Emergency contact address',
  elementaryschool: 'Elementary school',
  elementaryyear: 'Elementary year graduated',
  shsschool: 'Senior High School',
  shsstrand: 'SHS strand',
  shsyear: 'SHS year graduated',
  collegedegree: 'College degree',
  collegeyear: 'College year graduated',
  hobbies: 'Hobbies',
  specialskills: 'Special skills',
};

function labelEnum(key) {
  const k = String(key).toLowerCase().replace(/_/g, '');
  return LABEL_MAP[k] ?? String(key).replace(/([a-z])([A-Z])/g, '$1 $2');
}

function Field({ label, value, mono = false, valueClass = '' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={`text-sm font-medium text-slate-700 ${mono ? 'font-mono' : ''} ${valueClass}`}>{value ?? '—'}</dd>
    </div>
  );
}

const ROLE_BADGE = {
  ADMIN: 'badge-purple',
  REGISTRAR: 'badge-orange',
  FACULTY: 'badge-blue',
  STUDENT: 'badge-green',
  ACCOUNTING: 'badge-orange',
  ADMISSION: 'badge-blue',
  OSA: 'badge-purple',
  OHS: 'badge-amber',
  CASHIERING: 'badge-orange',
  OSCD: 'badge-purple',
  FAASG: 'badge-blue',
};

function initialsOf(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}