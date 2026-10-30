import type { PasswordResetEmail, VerificationEmail } from './mailer';

/** Готовое письмо: тема, текстовая и HTML-версия. */
export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

const SIGNATURE = 'China.ru — маркетплейс промышленного оборудования из Китая';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Ссылка на страницу витрины с одноразовым токеном. Язык страницы выберет
 * витрина (middleware локалей), поэтому путь — без префикса языка.
 */
export function tokenLink(webUrl: string, path: string, token: string): string {
  const url = new URL(path, webUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

function render(input: {
  subject: string;
  greeting: string;
  lead: string;
  action: string;
  link: string;
  note: string;
}): MailContent {
  const text = [
    input.greeting,
    '',
    input.lead,
    '',
    `${input.action}: ${input.link}`,
    '',
    input.note,
    '',
    SIGNATURE,
  ].join('\n');

  const link = escapeHtml(input.link);
  const html = `<!doctype html>
<html lang="ru">
<body style="margin:0;padding:24px;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px">
    <tr><td style="padding:32px">
      <p style="margin:0 0 16px;font-size:16px">${escapeHtml(input.greeting)}</p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.5">${escapeHtml(input.lead)}</p>
      <p style="margin:0 0 24px">
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#c8102e;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold">${escapeHtml(input.action)}</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280">Если кнопка не открывается, скопируйте ссылку в браузер:</p>
      <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${link}" style="color:#c8102e">${link}</a></p>
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5">${escapeHtml(input.note)}</p>
    </td></tr>
  </table>
  <p style="max-width:560px;margin:16px auto 0;font-size:12px;color:#9ca3af;text-align:center">${escapeHtml(SIGNATURE)}</p>
</body>
</html>`;

  return { subject: input.subject, text, html };
}

const greetingFor = (name: string | null): string =>
  name && name.trim().length > 0 ? `Здравствуйте, ${name.trim()}!` : 'Здравствуйте!';

export function verificationMail(webUrl: string, msg: VerificationEmail): MailContent {
  return render({
    subject: 'Подтвердите адрес электронной почты',
    greeting: greetingFor(msg.name),
    lead: 'Вы зарегистрировались на площадке China.ru. Подтвердите, что этот адрес принадлежит вам.',
    action: 'Подтвердить адрес',
    link: tokenLink(webUrl, '/verify-email', msg.token),
    note:
      'Ссылка действует 24 часа. Если вы не регистрировались, просто проигнорируйте письмо — ' +
      'без подтверждения адрес не будет использован.',
  });
}

export function passwordResetMail(webUrl: string, msg: PasswordResetEmail): MailContent {
  return render({
    subject: 'Восстановление пароля',
    greeting: greetingFor(msg.name),
    lead: 'Для вашей учётной записи на площадке China.ru запрошен сброс пароля.',
    action: 'Задать новый пароль',
    link: tokenLink(webUrl, '/reset-password', msg.token),
    note:
      'Ссылка действует 1 час и срабатывает один раз. Если вы не запрашивали сброс, ' +
      'проигнорируйте письмо — пароль останется прежним.',
  });
}
