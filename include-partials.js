// include-partials.js
// 用法：在 HTML 放 <div data-include="partials/header.html"></div>
// 這支工具會把對應檔案抓回來塞進去，並在全部載完後丟出事件：partials:loaded

document.addEventListener('DOMContentLoaded', async () => {
  const nodes = Array.from(document.querySelectorAll('[data-include]'));

  // 就算沒有任何 partial，也丟事件，讓外部初始化流程一致
  if (!nodes.length) {
    document.dispatchEvent(new CustomEvent('partials:loaded', { detail: { count: 0 } }));
    return;
  }

  await Promise.all(
    nodes.map(async (el) => {
      const file = el.getAttribute('data-include');
      if (!file) return;

      try {
        const res = await fetch(file, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`Failed to load ${file}: ${res.status}`);

        const html = await res.text();
        el.innerHTML = html;
      } catch (err) {
        console.error('Include failed:', file, err);
        el.innerHTML =
          '<div style="font-size:11px;color:#b91c1c;">Failed to load section.</div>';
      } finally {
        // 防止重複載入（例如你未來想重跑 include）
        el.removeAttribute('data-include');
      }
    })
  );

  document.dispatchEvent(new CustomEvent('partials:loaded', { detail: { count: nodes.length } }));
});
