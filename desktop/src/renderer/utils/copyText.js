/** Clipboard API requires a secure context; support trusted LAN HTTP deployments too. */
export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; }
    catch { /* Fall through when browser permissions disallow the modern API. */ }
  }
  const previousFocus = document.activeElement;
  const clipboardField = document.createElement('textarea');
  clipboardField.value = text;
  clipboardField.setAttribute('readonly', '');
  clipboardField.style.position = 'fixed';
  clipboardField.style.opacity = '0';
  document.body.appendChild(clipboardField);
  try {
    clipboardField.select();
    if (!document.execCommand('copy')) throw new Error('浏览器拒绝复制，请选中文字后手动复制');
  } finally {
    clipboardField.remove();
    previousFocus?.focus?.();
  }
}
