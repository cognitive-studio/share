export function cleanShareUrl(value) {
  const url = new URL(value);
  url.search = '';
  url.hash = '';
  return url.href;
}

export function sharePayload({ title, text, url }) {
  return { title, text, url: cleanShareUrl(url) };
}

export function wireQuizSharing({
  root = document,
  navigatorObject = navigator,
  currentUrl = window.location.href,
  pageTitle = document.title,
  resetAfter = window.setTimeout,
} = {}) {
  root.querySelectorAll('[data-share-quiz]').forEach((button) => {
    const label = button.querySelector('[data-share-label]');
    const originalLabel = label.textContent;
    button.addEventListener('click', async () => {
      const payload = sharePayload({
        title: button.dataset.shareTitle || pageTitle,
        text: button.dataset.shareText || 'Take this quiz.',
        url: currentUrl,
      });
      try {
        if (navigatorObject.share) {
          await navigatorObject.share(payload);
          label.textContent = 'SHARED';
        } else {
          await navigatorObject.clipboard.writeText(payload.url);
          label.textContent = 'LINK COPIED';
        }
        button.dataset.shareStatus = 'success';
        resetAfter(() => {
          label.textContent = originalLabel;
          delete button.dataset.shareStatus;
        }, 1800);
      } catch (error) {
        if (error?.name === 'AbortError') return;
        label.textContent = 'COPY FAILED';
        button.dataset.shareStatus = 'error';
      }
    });
  });
}

if (typeof document !== 'undefined') wireQuizSharing();
