// Data Privacy Act (RA 10173) notice — single editable source of truth.
// The backend enforces consent via CURRENT_DPA_VERSION; bump BOTH when the
// notice text changes so every user re-consents on next login.
export const DPA_NOTICE_VERSION = 1;

export const DPA_NOTICE = {
  title: 'DOrSU Student Portal – Data Privacy Consent',
  intro:
    'Welcome to the Davao Oriental State University (DOrSU) Student Portal. Before accessing your personalized dashboard, please review and consent to the following data privacy terms:',
  sections: [
    {
      heading: 'Purpose of Data Collection',
      body: 'By logging into this portal, you acknowledge that DOrSU collects and processes your personal information to:',
      bullets: [
        'Manage your academic records.',
        'Provide essential student services.',
        'Communicate important updates and announcements.',
      ],
    },
    {
      heading: 'Data Privacy Commitment',
      body:
        'DOrSU is committed to safeguarding your personal data in compliance with the Data Privacy Act of 2012 (Republic Act No. 10173). This law protects individual personal information in information and communications systems in the government and the private sector, ensuring that personal data is secured and protected.',
      bullets: [
        'Access your personal data.',
        'Correct inaccuracies in your information.',
        'Withdraw consent at any time, subject to legal limitations.',
      ],
    },
  ],
  closing:
    'By clicking "I Agree", you consent to the collection and processing of your personal data as described above. If you do not agree, please exit the portal.',
};