export function getEmailProviderUrl(emailStr) {
  if (!emailStr) return 'https://mail.google.com';
  const domain = emailStr.split('@')[1]?.toLowerCase() || '';
  if (domain.includes('gmail') || domain.includes('googlemail')) return 'https://mail.google.com';
  if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live') || domain.includes('msn')) return 'https://outlook.live.com';
  if (domain.includes('yahoo') || domain.includes('ymail')) return 'https://mail.yahoo.com';
  if (domain.includes('icloud')) return 'https://www.icloud.com/mail';
  return 'https://mail.google.com';
}

export function getEmailProviderName(emailStr) {
  if (!emailStr) return 'Email App';
  const domain = emailStr.split('@')[1]?.toLowerCase() || '';
  if (domain.includes('gmail')) return 'Gmail';
  if (domain.includes('outlook') || domain.includes('hotmail')) return 'Outlook';
  if (domain.includes('yahoo')) return 'Yahoo Mail';
  if (domain.includes('icloud')) return 'iCloud Mail';
  return 'Email App';
}
