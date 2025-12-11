// 這支小工具：自動把 data-include="xxx.html" 的檔案載進來
document.addEventListener('DOMContentLoaded', () => {
  // 找出頁面上所有有 data-include 屬性的元素
  const includes = document.querySelectorAll('[data-include]');
  if (!includes.length) return;

  includes.forEach(async (el) => {
    const file = el.getAttribute('data-include');
    if (!file) return;

    try {
      // 去抓對應的 HTML 檔案
      const res = await fetch(file);
      if (!res.ok) {
        throw new Error(`Failed to load ${file}: ${res.status}`);
      }

      // 把抓回來的 HTML 塞進這個元素裡
      const html = await res.text();
      el.innerHTML = html;
    } catch (err) {
      console.error('Include failed:', file, err);
      // 失敗就顯示一行小字，避免整塊空掉
      el.innerHTML = '<div style="font-size:11px;color:#b91c1c;">Failed to load section.</div>';
    }
  });
});
