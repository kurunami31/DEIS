/**
 * Rule-based responder used when GROQ_API_KEY is not configured.
 * Covers common DOrSU enrollment topics so the assistant stays useful offline.
 */
export function localRespond(question, ctx) {
  const text = question.toLowerCase();
  const { role, acadInfo } = { role: ctx.role, acadInfo: ctx };

  const mentions = (...words) => words.some((w) => text.includes(w));
  const term = ctx.activeTerm?.label ?? 'the active term';
  const open = ctx.activeTerm?.enrollmentOpen ? 'currently OPEN' : 'currently CLOSED';

  if (mentions('hi', 'hello', 'hey')) return `Hello${ctx.user?.fullName ? `, ${ctx.user.fullName.split(' ')[0]}` : ''}! I can help you with enrollment, grades, clearance, programs, and DOrSU processes. What would you like to know?`;

  if (mentions('clearance', 'coc', 'sign')) {
    if (ctx.clearance) {
      const total = ctx.clearance.signoffs.length;
      const cleared = ctx.clearance.signoffs.filter((s) => s.status === 'CLEARED').length;
      return `Your clearance for ${term} is ${ctx.clearance.status === 'CLEARED' ? 'fully CLEARED' : `in progress (${cleared} of ${total} offices cleared)`}. Required offices: Library, Finance, Department, Guidance, Registrar.`;
    }
    return 'Clearance is processed per term by the Registrar, Library, Finance, Department, and Guidance offices. See the Clearance page to track your status.';
  }

  if (mentions('enroll', 'how to enroll', 'enrollment')) {
    if (role === 'STUDENT') {
      return open
        ? `Enrollment for ${term} is ${open}. Go to Enrollment → Enroll, pick your subjects, and submit. First, make sure your Student Profile is complete and you are cleared.`
        : `Enrollment for ${term} is ${open}. Once it opens, submit your request from the Enroll page after completing your Student Profile and clearance requirements.`;
    }
    return `Enrollment for ${term} is ${open}. Requests are reviewed by the Registrar — you can review them from the Requests page.`;
  }

  if (mentions('grade', 'gwa', 'mark')) {
    if (ctx.gwa != null) return `Your grades are on file. If you have grades this term, your current GWA is about ${ctx.gwa.toFixed(2)} (based on finalized records). View My Grades for details.`;
    return 'Grades are posted per subject each term after faculty finalization. Check the Grades section under your student menu.';
  }

  if (mentions('refund', 'tuition', 'pay', 'fee', 'misc')) {
    return 'Tuition and miscellaneous fees are handled by the Finance & Accounting Office. For refunds, submit your request with official receipts to that office.';
  }

  if (mentions('spr', 'report of grades', 'transcript', 'tor')) {
    return 'Your Report of Grades (ROG) and Transcript of Records (TOR) are issued by the Registrar. Uploading a Report of Grades is required when applying for re-enrollment (Returning Student).';
  }

  if (mentions('spf', 'student profile', 'applicant')) {
    return 'The Student Profile Form (FM-DOrSU-ODI-05) collects your application, personal, family, and educational background. Complete it under Profile → Student Profile Form before enrollment so your request is not rejected.';
  }

  if (mentions('approve', 'withdraw', 'status', 'pending', 'my request')) {
    return 'Your enrollment request goes PENDING → APPROVED / REJECTED. You can withdraw a PENDING request from My Requests. The Registrar reviews requests and will contact you if additional documents are needed.';
  }

  if (mentions('calendar', 'event', 'activity', 'intramurals', 'foundation')) {
    const events = ctx.upcoming?.length ? ctx.upcoming.map((e) => `• ${e.title} (${new Date(e.startsAt).toLocaleDateString()})`).join('\n') : null;
    return events ? `Upcoming activities:\n${events}` : 'Check the Calendar of Activities page for university events.';
  }

  if (mentions('library', 'book')) return 'The University Library issues clearance sign-offs each term. Borrowed books must be returned before enrolling for the next term.';

  if (mentions('id', 'student number')) {
    if (ctx.user?.student) return `Your student number is ${ctx.user.student.studentNo}. Format: YYYY-XXXX (year admitted - sequence).`;
    return 'Student numbers follow the format YYYY-XXXX: the first four digits are the year of admission, the last four are your sequence number, e.g. 2025-0001.';
  }

  if (mentions('password', 'change password', 'reset')) {
    return 'You can change your password under Profile → Security. New passwords must be at least 12 characters with uppercase, lowercase, a number, and a special character.';
  }

  if (mentions('help', 'what can you', 'usage')) {
    return 'Try asking me about: enrollment, clearance, grades, the Student Profile Form, tuition fees, calendar of activities, student numbers, or passwords.';
  }

  return `I can help with DOrSU enrollment topics (enrollment, clearance, grades, profile form, calendar, fees). For the ${term} term, enrollment is ${open}. If you need something specific, try rephrasing — or contact the Registrar for detailed questions.`;
}

const TOOLS = ['enrollment', 'clearance', 'grades', 'profile', 'calendar', 'fees', 'spr', 'tor'];
export function isLocalOnly() {
  return !process.env.GROQ_API_KEY;
}
export { TOOLS };