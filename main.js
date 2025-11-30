
    // 匯率：優先 API，備援常數 31.0（嚴格認定）
    const RATE_FALLBACK = 31.0;
    let RATE = RATE_FALLBACK;

    const FX_API = "https://open.er-api.com/v6/latest/USD";

    const RATE_LABEL_TEXT = {
      en: "Rates updated: Just now",
      zh: "匯率更新於：剛剛",
    };

    const RATE_LABEL_PREFIX = "1 USD ≈ ";

    const I18N = {
      en: {
        "nav.overview": "Overview",
        "nav.pricing": "Pricing",
        "nav.reports": "Reports",
        "nav.about": "About Taimic",
        "page.title": "Cross-border wealth platform",
        "page.desc":
          "Integrated view of Taiwan & US assets with FATCA / CRS compliance checks and AI insights.",
        "btn.add": "Add asset",
        "btn.upload": "Click to upload file",
        "stat.us": "US net worth",
        "stat.tw": "Taiwan net worth",
        "stat.global": "Global net worth",
        "stat.safe": "Estate tax risk: safe",
        "table.title": "Holdings",
        "col.name": "Asset",
        "col.region": "Region",
        "col.type": "Type",
        "col.val": "Value",
        "alert.title": "AI tax alert: potential FATCA risk detected",
        "alert.desc":
          "A new high cash-value policy in Taiwan may exceed the Form 8938 reporting threshold.",
        "chart.title": "Regional allocation",
        "chart.insight": "AI insight",
        "chart.desc":
          "Taiwan assets make up 40% of your net worth. Consider hedging TWD FX risk.",
        "modal.title": "Add Taiwan asset (AI OCR)",
        "modal.desc":
          "Upload a policy front page or bank statement, Taimic will extract key data with AI.",
        "modal.scanning": "AI processing...",
        "user.login": "Login",
        "user.register": "Sign up",
      },
      zh: {
        "nav.overview": "資產總覽",
        "nav.pricing": "價格",
        "nav.reports": "分析報告",
        "nav.about": "關於 Taimic",
        "page.title": "跨國資產整合平台",
        "page.desc":
          "整合台灣與海外資產，搭配 FATCA / CRS 稅務檢測與 AI 分析，讓跨境財務一眼看懂。",
        "btn.add": "新增資產",
        "btn.upload": "點擊上傳檔案",
        "stat.us": "美國總資產",
        "stat.tw": "台灣總資產",
        "stat.global": "全球總淨值",
        "stat.safe": "遺產稅風險：安全",
        "table.title": "資產持有清單",
        "col.name": "資產名稱",
        "col.region": "地區",
        "col.type": "類別",
        "col.val": "現值",
        "alert.title": "AI 稅務警示：偵測到 FATCA 風險",
        "alert.desc":
          "系統掃描到一張新增的台灣高現金價值保單，可能超過 IRS Form 8938 申報門檻。",
        "chart.title": "區域資產配置",
        "chart.insight": "AI 智能分析",
        "chart.desc": "您的台灣資產佔總淨值約 40%，建議評估台幣匯率風險。",
        "modal.title": "新增台灣資產 (AI OCR)",
        "modal.desc":
          "上傳保單首頁或銀行對帳單，AI 將自動提取關鍵數據。",
        "modal.scanning": "AI 分析中...",
        "user.login": "登入",
        "user.register": "註冊",
      },
    };

    const assets = [
      {
        id: 1,
        name: {
          en: "Vanguard Total Stock (VTI)",
          zh: "Vanguard 全球股票 ETF (VTI)",
        },
        type: { en: "ETF", zh: "指數型基金" },
        region: "US",
        usd: 145200,
      },
      {
        id: 2,
        name: { en: "Taipei Xinyi Condo", zh: "台北信義區公寓" },
        type: { en: "Real Estate", zh: "房地產" },
        region: "TW",
        usd: 280000,
      },
      {
        id: 3,
        name: { en: "Fidelity 401(k)", zh: "富達退休金 401(k)" },
        type: { en: "Retirement", zh: "退休金" },
        region: "US",
        usd: 98500,
      },
    ];

    let curr = "TWD";
    let lang = "en";
    let currentSection = "overview";
    let billing = "monthly";
    const API_BASE = "https://cool-cell-b227.amy20060226.workers.dev";

    // Dashboard state
    let loggedInEmail = null;
    let dashboardInitialized = false;

    // Hero Screener slide-up 狀態
    let heroCardOpen = false;
    let heroCardOuterEl = null;
    let heroOverlayEl = null;

    function fmt(usd) {
      const val = curr === "USD" ? usd : usd * RATE;
      return new Intl.NumberFormat(
        curr === "USD" ? "en-US" : "zh-TW",
        {
          style: "currency",
          currency: curr,
          maximumFractionDigits: 0,
        }
      ).format(val);
    }

    function fmtAbs(usd) {
      const val = curr === "USD" ? usd : usd * RATE;
      return new Intl.NumberFormat(
        curr === "USD" ? "en-US" : "zh-TW",
        {
          style: "currency",
          currency: curr,
          maximumFractionDigits: 0,
        }
      ).format(Math.abs(val));
    }

    function updateRateLabel() {
      const label = document.getElementById("hero-rate-label");
      if (!label) return;
      const prefix = `${RATE_LABEL_PREFIX}${RATE.toFixed(2)} TWD`;
      const suffix = RATE_LABEL_TEXT[lang] || RATE_LABEL_TEXT.en;
      label.textContent = `${prefix} • ${suffix}`;
    }

    async function fetchFXRate() {
      try {
        const res = await fetch(FX_API);
        if (!res.ok) throw new Error("FX API error");
        const data = await res.json();
        const r = data && data.rates && data.rates.TWD;
        if (typeof r === "number" && r > 0) {
          RATE = r;
        } else {
          RATE = RATE_FALLBACK;
        }
      } catch (e) {
        RATE = RATE_FALLBACK;
      } finally {
        updateRateLabel();
        render();
        calculateHeroTotal();
        if (loggedInEmail) {
          updateDashboardStats();
        }
      }
    }

    function render() {
      const t = I18N[lang];

      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.dataset.i18n;
        if (t[key]) el.textContent = t[key];
      });

      document.querySelectorAll(".val-display").forEach((el) => {
        el.textContent = fmt(parseFloat(el.dataset.usd));
      });

      const tbody = document.getElementById("asset-list");
      if (tbody) {
        tbody.innerHTML = "";
        assets.forEach((a) => {
          const n = a.name[lang];
          const tp = a.type[lang];
          const flag = a.region === "US" ? "🇺🇸" : "🇹🇼";
          const badge =
            a.region === "US"
              ? "bg-blue-50 text-blue-700"
              : "bg-green-50 text-green-700";
          const hl = a.new ? "bg-orange-50 animate-fade-in" : "";
          const riskTag = a.risk
            ? `<span class="ml-2 inline-flex items-center px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full border border-orange-200">FATCA</span>`
            : "";
          tbody.innerHTML += `
            <tr class="group transition-colors hover:bg-gray-50 border-b border-gray-100 last:border-0 ${hl}">
              <td class="py-4 pl-2">
                <div class="font-semibold text-[#111827] group-hover:text-[#0066cc] transition-colors">${n}</div>
              </td>
              <td class="py-4">
                <span class="px-2 py-1 rounded-full text-xs font-bold ${badge}">${flag} ${a.region}</span>${riskTag}
              </td>
              <td class="py-4 text-sm text-gray-600">${tp}</td>
              <td class="py-4 pr-2 text-right font-mono font-bold text-[#111827] tracking-tight">${fmt(
                a.usd
              )}</td>
            </tr>`;
        });
      }

      const btnUsd = document.getElementById("btn-usd");
      const btnTwd = document.getElementById("btn-twd");
      if (btnUsd && btnTwd) {
        if (curr === "USD") {
          btnUsd.className = "px-4 py-2 bg-white text-[#0066cc] font-semibold";
          btnTwd.className = "px-4 py-2 text-gray-500 hover:bg-gray-100";
        } else {
          btnTwd.className = "px-4 py-2 bg-white text-[#0066cc] font-semibold";
          btnUsd.className = "px-4 py-2 text-gray-500 hover:bg-gray-100";
        }
      }

      const aboutZh = document.getElementById("about-zh");
      const aboutEn = document.getElementById("about-en");
      if (aboutZh && aboutEn) {
        if (lang === "zh") {
          aboutZh.classList.remove("hidden");
          aboutEn.classList.add("hidden");
        } else {
          aboutEn.classList.remove("hidden");
          aboutZh.classList.add("hidden");
        }
      }

      const reportsZh = document.getElementById("reports-gate-zh");
      const reportsEn = document.getElementById("reports-gate-en");
      if (reportsZh && reportsEn) {
        if (lang === "zh") {
          reportsZh.classList.remove("hidden");
          reportsEn.classList.add("hidden");
        } else {
          reportsEn.classList.remove("hidden");
          reportsZh.classList.add("hidden");
        }
      }

      updatePricing();
      updateRateLabel();
    }

    function setCurrency(c) {
      curr = c;
      render();
      calculateHeroTotal();
      if (loggedInEmail) updateDashboardStats();
    }

    function changeLang(l) {
      lang = l;
      render();
      langMenu.classList.add("hidden");
      calculateHeroTotal();
    }

    function switchSection(section) {
      const ids = ["overview", "pricing", "about", "reports"];
      ids.forEach((id) => {
        const el = document.getElementById(`section-${id}`);
        if (el) el.classList.toggle("hidden", id !== section);
      });
      document.querySelectorAll("nav .nav-link").forEach((link) => {
        link.classList.toggle("active", link.dataset.section === section);
      });
      currentSection = section;

      if (section === "reports") {
        try {
          const raw = localStorage.getItem("taimic_demo_data");
          const hasDemo = !!raw;
          const headingEn = document.querySelector("#reports-gate-en h1");
          if (headingEn) {
            headingEn.textContent = hasDemo
              ? "Your Report is Ready! Sign in to view details."
              : "Unlock your asset insights.";
          }
        } catch (e) {
          console.error(e);
        }
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function updatePricing() {
      document.querySelectorAll("[data-plan-price]").forEach((el) => {
        const m = el.dataset.monthly;
        const y = el.dataset.yearly;
        if (!m || !y) return;
        el.textContent = billing === "monthly" ? m : y;
      });
      const knob = document.getElementById("billing-toggle-knob");
      if (knob) {
        knob.classList.toggle("translate-x-0", billing === "monthly");
        knob.classList.toggle("translate-x-5", billing === "yearly");
      }
      const mLabel = document.getElementById("billing-label-monthly");
      const yLabel = document.getElementById("billing-label-yearly");
      if (mLabel && yLabel) {
        mLabel.classList.toggle("text-gray-900", billing === "monthly");
        mLabel.classList.toggle("text-gray-500", billing !== "monthly");
        yLabel.classList.toggle("text-gray-900", billing === "yearly");
        yLabel.classList.toggle("text-gray-500", billing !== "yearly");
      }
    }

    function toggleBilling() {
      billing = billing === "monthly" ? "yearly" : "monthly";
      updatePricing();
    }

    // Hero 金額顯示縮寫
    function formatUSDAbbrev(value) {
      const n = Number(value) || 0;
      const abs = Math.abs(n);
      if (abs >= 1e9) {
        const v = n / 1e9;
        const num = v >= 100 ? v.toFixed(0) : v.toFixed(1);
        return `$${num}B`;
      } else if (abs >= 1e6) {
        const v = n / 1e6;
        const num = v >= 100 ? v.toFixed(0) : v.toFixed(1);
        return `$${num}M`;
      } else if (abs >= 1e3) {
        const v = n / 1e3;
        const num = v >= 100 ? v.toFixed(0) : v.toFixed(1);
        return `$${num}K`;
      }
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(n);
    }

    // Hero 快篩引擎（原本）
    function calculateHeroTotal() {
      const twdInput = document.getElementById("hero-twd");
      const usdInput = document.getElementById("hero-usd");
      const resultBox = document.getElementById("hero-result");
      const totalEl = document.getElementById("hero-total");

      const identityEl = document.getElementById("hero-identity");
      const residenceEl = document.getElementById("hero-residence");
      const cashChk = document.getElementById("hero-asset-cash");
      const stocksChk = document.getElementById("hero-asset-stocks");
      const fundsChk = document.getElementById("hero-asset-funds");
      const insuranceChk = document.getElementById("hero-asset-insurance");
      const assetsError = document.getElementById("hero-assets-error");

      if (
        !twdInput ||
        !usdInput ||
        !resultBox ||
        !totalEl ||
        !identityEl ||
        !residenceEl ||
        !cashChk ||
        !stocksChk ||
        !fundsChk ||
        !insuranceChk
      ) {
        return;
      }

      const twdRaw = (twdInput.value || "").replace(/,/g, "");
      const usdRaw = (usdInput.value || "").replace(/,/g, "");

      const twd = parseFloat(twdRaw) || 0;
      const usd = parseFloat(usdRaw) || 0;
      const hasAmount = twd > 0 || usd > 0;

      const assetsSelected =
        cashChk.checked ||
        stocksChk.checked ||
        fundsChk.checked ||
        insuranceChk.checked;

      if (!assetsSelected) {
        if (assetsError) assetsError.classList.remove("hidden");
      } else if (assetsError) {
        assetsError.classList.add("hidden");
      }

      const ctaBtn = document.getElementById("hero-cta-btn");
      if (!hasAmount || !assetsSelected) {
        resultBox.classList.add("hidden");
        if (ctaBtn) ctaBtn.classList.add("hidden");
        return;
      }

      const identity = identityEl.value;
      const residence = residenceEl.value;
      const isUSPerson = identity === "us";

      const hasFunds = !!fundsChk.checked;
      const hasInsurance = !!insuranceChk.checked;
      const hasHighRiskPFIC = hasFunds || hasInsurance;

      const globalUsd = twd / RATE + usd;
      const usAssetsUsd = usd;
      const totalTwd = globalUsd * RATE;

      const overseasROIusd = usAssetsUsd * 0.05;
      const overseasROItwd = overseasROIusd * RATE;

      totalEl.textContent = formatUSDAbbrev(globalUsd);
      updateRateLabel();

      // US Compliance
      let usStatus = "safe";
      let hasUsRisk = false;

      let hitFBAR = false;
      let hitFATCA = false;
      let hitPFIC = false;
      let hitEstateNonUS = false;

      if (isUSPerson) {
        hitFBAR = globalUsd > 10000;
        hitFATCA = residence === "tw" && globalUsd > 200000;
        hitPFIC = hasHighRiskPFIC;

        if (hitPFIC || hitFATCA) {
          usStatus = "critical";
          hasUsRisk = true;
        } else if (hitFBAR) {
          usStatus = "warning";
          hasUsRisk = true;
        } else {
          usStatus = "safe";
          hasUsRisk = false;
        }
      } else {
        hitEstateNonUS = usAssetsUsd > 60000;
        if (hitEstateNonUS) {
          usStatus = "critical";
          hasUsRisk = true;
        } else {
          usStatus = "safe";
          hasUsRisk = false;
        }
      }

      // Taiwan 稅務檢查
      const hitAMT = overseasROItwd > 1000000;
      const hitTWEstate = totalTwd > 13330000;
      let twStatus = (hitAMT || hitTWEstate) ? "review" : "optimized";
      let hasTwRisk = hitAMT || hitTWEstate;

      const usCard = document.getElementById("hero-us-status");
      const usTag = document.getElementById("hero-us-tag");
      const usBody = document.getElementById("hero-us-body");
      const twCard = document.getElementById("hero-tw-status");
      const twTag = document.getElementById("hero-tw-tag");
      const twBody = document.getElementById("hero-tw-body");

      resultBox.classList.remove("hidden");

      if (usCard) {
        let cls =
          "rounded-2xl border px-4 py-3 flex flex-col gap-2 ";
        if (usStatus === "critical") {
          cls += "border-red-200 bg-red-50";
        } else if (usStatus === "warning") {
          cls += "border-amber-200 bg-amber-50";
        } else {
          cls += "border-emerald-200 bg-emerald-50";
        }
        usCard.className = cls;
      }
      if (usTag) {
        usTag.className =
          "text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide";
        if (usStatus === "critical") {
          usTag.classList.add("bg-red-100", "text-red-700");
          usTag.textContent = "🚨 Critical";
        } else if (usStatus === "warning") {
          usTag.classList.add("bg-amber-100", "text-amber-700");
          usTag.textContent = "⚠️ Warning";
        } else {
          usTag.classList.add("bg-emerald-100", "text-emerald-700");
          usTag.textContent = "✅ Safe";
        }
      }

      if (usBody) {
        if (isUSPerson) {
          if (usStatus === "safe") {
            usBody.innerHTML = `
              <p class="text-xs font-semibold text-emerald-900">
                ✅ Safe • Compliant: No US Reporting Required
              </p>
              <p class="text-[11px] text-emerald-800 mt-1">
                合規：目前無須向美國申報（尚未觸發 FBAR、FATCA 或 PFIC 相關門檻）。
              </p>
              <p class="mt-1 text-[11px] text-emerald-700">
                本結果為智能快篩，實際申報義務與細節請與合格稅務顧問確認。
              </p>
            `;
          } else if (usStatus === "warning") {
            usBody.innerHTML = `
              <p class="text-xs font-semibold text-amber-900">
                ⚠️ Warning — FBAR Threshold Reached
              </p>
              <p class="text-[11px] mt-1 text-slate-800">
                Filing Required: FinCEN Form 114 (FBAR)
              </p>
              <p class="text-[11px] text-slate-800">
                需申報：肥咖條款 FBAR (Form 114)
              </p>
              <p class="mt-2 text-[11px] font-medium text-slate-900">
                Est. Penalty Risk: <span class="font-bold">$10,000+ USD / Year</span>
              </p>
              <p class="mt-1 text-[11px] text-slate-500">
                Form details: <span class="font-semibold text-slate-700">[🔒 Login to view]</span>
              </p>
            `;
          } else {
            let lines = `
              <p class="text-xs font-semibold text-red-900">
                🚨 Critical — US Compliance Risk Detected
              </p>
            `;

            if (hitFATCA) {
              lines += `
                <p class="text-[11px] mt-1 text-slate-800">
                  Critical Alert: Form 8938 Filing Required
                </p>
                <p class="text-[11px] text-slate-800">
                  高風險警告：需申報 FATCA (Form 8938)
                </p>
              `;
            }

            if (hitPFIC) {
              lines += `
                <p class="text-[11px] mt-1 text-slate-800">
                  Complex Tax Risk: PFIC / Excise Tax Detected
                </p>
                <p class="text-[11px] text-slate-800">
                  複雜稅務風險：檢測到 PFIC / 海外保單稅務問題
                </p>
              `;
            }

            if (hitFBAR) {
              lines += `
                <p class="text-[11px] mt-1 text-slate-800">
                  Filing Required: FinCEN Form 114 (FBAR)
                </p>
                <p class="text-[11px] text-slate-800">
                  需申報：肥咖條款 FBAR (Form 114)
                </p>
              `;
            }

            lines += `
              <p class="mt-2 text-[11px] font-medium text-slate-900">
                Est. Penalty Risk: <span class="font-bold">$10,000+ USD / Year</span>
              </p>
              <p class="mt-1 text-[11px] text-slate-500">
                Key Forms / 關鍵表單：<span class="font-semibold text-slate-700">[🔒 Login to view]</span>
              </p>
            `;

            usBody.innerHTML = lines;
          }
        } else {
          if (usStatus === "critical" && hitEstateNonUS) {
            usBody.innerHTML = `
              <p class="text-xs font-semibold text-red-900">
                🚨 Critical — US Estate Tax Exposure
              </p>
              <p class="text-[11px] mt-1 text-slate-800">
                Critical: Exceeds $60k Estate Tax Exemption (40% Tax Risk)
              </p>
              <p class="text-[11px] text-slate-800">
                嚴重警告：超過非美籍免稅額（面臨約 40% 美國遺產稅風險）。
              </p>
              <p class="mt-2 text-[11px] font-medium text-slate-900">
                Est. Penalty Risk: <span class="font-bold">$10,000+ USD / Year</span>
              </p>
              <p class="mt-1 text-[11px] text-slate-500">
                IRS exposure details: <span class="font-semibold text-slate-700">[🔒 Login to view]</span>
              </p>
            `;
          } else {
            usBody.innerHTML = `
              <p class="text-xs font-semibold text-emerald-900">
                ✅ Safe • Compliant: No US Reporting Required
              </p>
              <p class="text-[11px] text-emerald-800 mt-1">
                合規：目前無須向美國申報（非美籍且美國境內資產未超過 $60,000 USD 遺產稅免稅額）。
              </p>
              <p class="mt-1 text-[11px] text-emerald-700">
                本結果為初步快篩，實際稅務影響仍建議與專業顧問確認。
              </p>
            `;
          }
        }
      }

      if (twCard) {
        let cls = "rounded-2xl border px-4 py-3 flex flex-col gap-2 ";
        if (twStatus === "review") {
          cls += "border-sky-200 bg-sky-50";
        } else {
          cls += "border-emerald-200 bg-emerald-50";
        }
        twCard.className = cls;
      }
      if (twTag) {
        twTag.className =
          "text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide";
        if (twStatus === "review") {
          twTag.classList.add("bg-sky-100", "text-sky-800");
          twTag.textContent = "ℹ️ Review Needed";
        } else {
          twTag.classList.add("bg-emerald-100", "text-emerald-700");
          twTag.textContent = "✅ Optimized";
        }
      }

      if (twBody) {
        if (twStatus === "review") {
          let lines = `
            <p class="text-xs font-semibold text-sky-900">
              ℹ️ Review Needed — Taiwan Tax Exposure
            </p>
          `;

          if (hitAMT) {
            lines += `
              <p class="text-[11px] mt-1 text-slate-800">
                Attention: Overseas Income may require AMT Filing
              </p>
              <p class="text-[11px] text-slate-800">
                留意：海外所得可能達最低稅負制申報門檻（推估 US Assets × 5% 已超過 NT$ 1,000,000）。
              </p>
            `;
          }

          if (hitTWEstate) {
            lines += `
              <p class="text-[11px] mt-1 text-slate-800">
                Planning Recommended: TW Estate Tax Exposure
              </p>
              <p class="text-[11px] text-slate-800">
                建議規劃：全球資產總額已達台灣遺產稅課稅門檻（約 NT$ 13,330,000 以上）。
              </p>
            `;
          }

          lines += `
            <p class="mt-2 text-[11px] font-medium text-slate-900">
              Potential Tax Exposure: <span class="font-bold">20% AMT / Estate Tax</span>
            </p>
            <p class="mt-1 text-[11px] text-slate-500">
              Rule details: <span class="font-semibold text-slate-700">[🔒 Login to view]</span>
            </p>
          `;

          twBody.innerHTML = lines;
        } else {
          twBody.innerHTML = `
            <p class="text-xs font-semibold text-emerald-900">
              ✅ Optimized — No Immediate TW Tax Signal
            </p>
            <p class="text-[11px] text-emerald-800 mt-1">
              目前估算下，尚未明顯落入台灣最低稅負制或遺產稅的高壓區間，資產結構相對健康。
            </p>
            <p class="mt-1 text-[11px] text-emerald-700">
              若未來海外資產或全球總額進一步放大，建議提前與顧問討論 CFC、AMT 與傳承規劃。
            </p>
          `;
        }
      }

      const hasAnyRisk = hasUsRisk || hasTwRisk;
      if (ctaBtn) {
        ctaBtn.classList.toggle("hidden", !hasAnyRisk);
      }

      // 把快篩結果也存起來，Dashboard 可以用
      try {
        const payload = { twd, usd, totalUsd: globalUsd };
        localStorage.setItem("taimic_demo_data", JSON.stringify(payload));
      } catch (e) {
        console.error(e);
      }

      if (loggedInEmail && dashboardInitialized) {
        updateDashboardStats();
      }
    }

    function saveAndRedirect() {
      const twdInput = document.getElementById("hero-twd");
      const usdInput = document.getElementById("hero-usd");

      if (!twdInput || !usdInput) {
        switchSection("reports");
        return;
      }

      const twd = parseFloat((twdInput.value || "").replace(/,/g, "")) || 0;
      const usd = parseFloat((usdInput.value || "").replace(/,/g, "")) || 0;
      const totalUsd = twd / RATE + usd;

      try {
        const payload = { twd, usd, totalUsd };
        localStorage.setItem("taimic_demo_data", JSON.stringify(payload));
      } catch (e) {
        console.error(e);
      }

      switchSection("reports");
    }

    function openUploadModal() {
      modalOverlay.classList.remove("hidden");
      document.getElementById("modal-step-1").classList.remove("hidden");
      document.getElementById("modal-step-2").classList.add("hidden");
    }
    function closeUploadModal() {
      modalOverlay.classList.add("hidden");
    }

    function startScan() {
      document.getElementById("modal-step-1").classList.add("hidden");
      document.getElementById("modal-step-2").classList.remove("hidden");
      const bar = document.getElementById("scan-bar");
      bar.style.width = "0";
      setTimeout(() => (bar.style.width = "100%"), 100);

      const log = document.getElementById("scan-log");
      log.innerHTML = "";
      setTimeout(
        () => (log.innerHTML = "&gt; Detecting Language: zh-TW"),
        800
      );
      setTimeout(
        () => (log.innerHTML += '<br>&gt; Parsing: "富邦人壽 (Fubon Life)"'),
        1600
      );
      setTimeout(
        () => (log.innerHTML += "<br>&gt; Match IRS Code: 8938"),
        2400
      );

      setTimeout(() => {
        assets.unshift({
          id: 99,
          name: {
            en: "Fubon Life (Whole Life)",
            zh: "富邦人壽 (終身壽險)",
          },
          type: { en: "Insurance", zh: "儲蓄險" },
          region: "TW",
          usd: 52000,
          new: true,
          risk: true,
        });

        const tEl = document.getElementById("val-tw");
        if (tEl) tEl.dataset.usd = parseFloat(tEl.dataset.usd) + 52000;
        const gEl = document.getElementById("val-global");
        if (gEl) gEl.dataset.usd = parseFloat(gEl.dataset.usd) + 52000;
        if (geoChart) {
          geoChart.data.datasets[0].data[1] += 52000;
          geoChart.update();
        }

        const aiAlert = document.getElementById("ai-alert");
        if (aiAlert) aiAlert.classList.remove("hidden");
        render();
        closeUploadModal();
        window.scrollTo({ top: 0, behavior: "smooth" });

        if (loggedInEmail && dashboardInitialized) {
          updateDashboardStats();
        }
      }, 3000);
    }

    let authMode = "register";

    function applyAuthUI(email) {
      loggedInEmail = email || null;

      const userToggleBtn = document.getElementById("user-toggle");
      const userMenuGuest = document.getElementById("user-menu-guest");
      const userMenuLogged = document.getElementById("user-menu-loggedin");
      const userEmailLabel = document.getElementById("user-email-label");

      const marketingShell = document.getElementById("marketing-shell");
      const dashboardShell = document.getElementById("dashboard-shell");

      if (userToggleBtn) {
        if (email) {
          userToggleBtn.className =
            "w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors";
          const initial = email.charAt(0).toUpperCase();
          userToggleBtn.innerHTML = `<span class="text-sm font-semibold">${initial}</span>`;
        } else {
          userToggleBtn.className =
            "w-10 h-10 bg-[#f3f4f6] text-gray-600 rounded-full flex items-center justify-center hover:bg-[#0066cc] hover:text-white transition-colors";
          userToggleBtn.innerHTML = `<i class="fa-solid fa-user text-base"></i>`;
        }
      }

      if (userMenuGuest && userMenuLogged) {
        if (email) {
          userMenuGuest.classList.add("hidden");
          userMenuLogged.classList.remove("hidden");
        } else {
          userMenuGuest.classList.remove("hidden");
          userMenuLogged.classList.add("hidden");
        }
      }
      if (userEmailLabel) {
        userEmailLabel.textContent = email || "";
      }

      const noteEn = document.getElementById("reports-loggedin-note-en");
      const noteZh = document.getElementById("reports-loggedin-note-zh");
      const actionsEn = document.getElementById("reports-auth-actions-en");
      const actionsZh = document.getElementById("reports-auth-actions-zh");
      const reportsEmailEn = document.getElementById("reports-email-en");
      const reportsEmailZh = document.getElementById("reports-email-zh");

      if (email) {
        if (actionsEn) actionsEn.classList.add("hidden");
        if (actionsZh) actionsZh.classList.add("hidden");
        if (noteEn) noteEn.classList.remove("hidden");
        if (noteZh) noteZh.classList.remove("hidden");
        if (reportsEmailEn) reportsEmailEn.textContent = email;
        if (reportsEmailZh) reportsEmailZh.textContent = email;
      } else {
        if (actionsEn) actionsEn.classList.remove("hidden");
        if (actionsZh) actionsZh.classList.remove("hidden");
        if (noteEn) noteEn.classList.add("hidden");
        if (noteZh) noteZh.classList.add("hidden");
        if (reportsEmailEn) reportsEmailEn.textContent = "";
        if (reportsEmailZh) reportsEmailZh.textContent = "";
      }

      // Dashboard shell 切換：登入後直接進 Dashboard，而不是 Overview
      if (marketingShell && dashboardShell) {
        if (email) {
          marketingShell.classList.add("hidden");
          dashboardShell.classList.remove("hidden");
          if (!dashboardInitialized) {
            initDashboard();
          }
          updateDashboardStats();
        } else {
          dashboardShell.classList.add("hidden");
          marketingShell.classList.remove("hidden");
          switchSection("overview");
        }
      }

      // Dashboard header avatar & email
      const dashUserInitial = document.getElementById("dash-user-initial");
      const dashUserEmail = document.getElementById("dash-user-email");
      if (dashUserInitial && dashUserEmail) {
        if (email) {
          dashUserInitial.textContent = email.charAt(0).toUpperCase();
          dashUserEmail.textContent = email;
        } else {
          dashUserInitial.textContent = "T";
          dashUserEmail.textContent = "you@example.com";
        }
      }
    }

    function handleLogout() {
      try {
        localStorage.removeItem("taimic-user-email");
      } catch (e) {
        console.error(e);
      }
      applyAuthUI(null);
      if (authOverlay) {
        closeAuthModal();
      }
      if (userMenu) {
        userMenu.classList.add("hidden");
      }
      if (dashUserMenu) {
        dashUserMenu.classList.add("hidden");
      }
    }

    function goToReports() {
      switchSection("reports");
      if (userMenu) {
        userMenu.classList.add("hidden");
      }
    }

    function openAuthModal(mode) {
      authMode = mode;
      const title = document.getElementById("auth-title");
      const btnText = document.getElementById("auth-submit-text");
      const msg = document.getElementById("auth-message");
      msg.textContent = "";
      msg.className = "text-sm h-5 text-center";

      if (mode === "login") {
        title.textContent = "Login to Taimic";
        btnText.textContent = "Login";
      } else {
        title.textContent = "Create a Taimic account";
        btnText.textContent = "Sign up";
      }

      document.getElementById("auth-email").value = "";
      document.getElementById("auth-password").value = "";

      authOverlay.classList.remove("hidden");
    }

    function closeAuthModal() {
      authOverlay.classList.add("hidden");
    }

    async function callAuthAPI(path, payload) {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await res.json();
    }

    async function handleAuthSubmit() {
      const email = document.getElementById("auth-email").value.trim();
      const password = document.getElementById("auth-password").value;
      const msg = document.getElementById("auth-message");
      msg.textContent = "";
      msg.className = "text-sm h-5 text-center";

      if (!email || !password) {
        msg.textContent =
          lang === "zh"
            ? "請輸入 email 與密碼。"
            : "Please enter email and password.";
        msg.classList.add("text-red-500");
        return;
      }

      try {
        const path = authMode === "register" ? "/api/register" : "/api/login";
        const data = await callAuthAPI(path, { email, password });

        if (data.ok) {
          msg.textContent =
            authMode === "register"
              ? lang === "zh"
                ? "註冊成功，請重新登入。"
                : "Sign up successful, please log in."
              : lang === "zh"
              ? `登入成功，歡迎 ${data.user?.email || email}`
              : `Welcome back, ${data.user?.email || email}`;
          msg.classList.add("text-green-600");

          if (authMode === "login") {
            const savedEmail = data.user?.email || email;
            try {
              localStorage.setItem("taimic-user-email", savedEmail);
            } catch (e) {
              console.error(e);
            }
            applyAuthUI(savedEmail);
            setTimeout(closeAuthModal, 800);
          }
        } else {
          msg.textContent =
            data.message ||
            (lang === "zh"
              ? "操作失敗，請稍後再試。"
              : "Something went wrong, please try again.");
          msg.classList.add("text-red-500");
        }
      } catch (e) {
        console.error(e);
        msg.textContent =
          lang === "zh"
            ? "伺服器錯誤，請稍後再試。"
            : "Server error, please try again.";
        msg.classList.add("text-red-500");
      }
    }

    // Dashboard helper: aggregate numbers
    function computeDashboardData() {
      const data = {
        totalUsd: 0,
        byRegion: {},
        categories: { market: 0, realEstate: 0, defensive: 0 },
      };

      assets.forEach((a) => {
        if (!a.usd) return;
        data.totalUsd += a.usd;
        const region = a.region || "Other";
        data.byRegion[region] = (data.byRegion[region] || 0) + a.usd;

        const typeEn = (a.type && a.type.en) || "";
        if (typeEn.includes("Estate")) {
          data.categories.realEstate += a.usd;
        } else if (typeEn.includes("Insurance") || typeEn.includes("Cash")) {
          data.categories.defensive += a.usd;
        } else {
          data.categories.market += a.usd;
        }
      });

      // 如果 user 有跑 hero 快篩，用那個 totalUsd 覆蓋 demo 資料
      try {
        const raw = localStorage.getItem("taimic_demo_data");
        if (raw) {
          const payload = JSON.parse(raw);
          if (typeof payload.totalUsd === "number" && payload.totalUsd > 0) {
            data.totalUsd = payload.totalUsd;
            const twd = payload.twd || 0;
            const usd = payload.usd || 0;
            data.byRegion["TW"] = twd / RATE;
            data.byRegion["US"] = usd;
          }
        }
      } catch (e) {
        console.error(e);
      }

      return data;
    }

    let geoChart;
    let allocationChart;
    let langMenu, userMenu, modalOverlay, authOverlay, mobileMenu, dashUserMenu;

    function initDashboard() {
      dashboardInitialized = true;

      // Allocation donut chart
      const allocCanvas = document.getElementById("allocationChart");
      if (allocCanvas) {
        const ctxAlloc = allocCanvas.getContext("2d");
        allocationChart = new Chart(ctxAlloc, {
          type: "doughnut",
          data: {
            labels: ["Market", "Real Estate", "Defensive"],
            datasets: [
              {
                data: [40, 30, 30],
                backgroundColor: ["#0f5ad8", "rgba(15,90,216,0.6)", "#60a5fa"],
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
              legend: { display: false },
            },
          },
        });
      }

      updateDashboardStats();
    }

    function updateDashboardStats() {
      const data = computeDashboardData();
      const totalUsd = data.totalUsd || 0;
      const twUsd = data.byRegion["TW"] || 0;
      const usUsd = data.byRegion["US"] || 0;
      const otherUsd = Math.max(totalUsd - twUsd - usUsd, 0);

      const networthEl = document.getElementById("dash-networth-value");
      const curLabelEl = document.getElementById("dash-networth-currency-label");
      const changePill = document.getElementById("dash-networth-change-pill");
      const changeIcon = document.getElementById("dash-networth-change-icon");
      const changeVal = document.getElementById("dash-networth-change-value");

      const twValEl = document.getElementById("dash-region-tw-value");
      const twPctEl = document.getElementById("dash-region-tw-percent");
      const usValEl = document.getElementById("dash-region-us-value");
      const usPctEl = document.getElementById("dash-region-us-percent");

      const fxValueEl = document.getElementById("fx-impact-value");
      const tooltipTwEl = document.getElementById("dash-tooltip-tw");
      const tooltipUsEl = document.getElementById("dash-tooltip-us");

      const allocMarketPct = document.getElementById("alloc-market-percent");
      const allocRealPct = document.getElementById("alloc-realestate-percent");
      const allocDefPct = document.getElementById("alloc-defensive-percent");
      const allocSummary = document.getElementById("alloc-summary-text");

      if (!networthEl) return;

      networthEl.textContent = fmt(totalUsd);
      if (curLabelEl) {
        curLabelEl.textContent = curr === "USD" ? "Base: USD" : "Base: TWD";
      }

      const dailyChangeUsd = totalUsd * 0.0123; // demo 1.23%
      const isPositive = dailyChangeUsd >= 0;
      if (changePill && changeIcon && changeVal) {
        changePill.className =
          "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium " +
          (isPositive
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-700");
        changeIcon.className =
          "mr-1 text-[10px] fa-solid " +
          (isPositive ? "fa-arrow-trend-up" : "fa-arrow-trend-down");
        changeVal.textContent =
          (isPositive ? "+" : "-") + fmtAbs(dailyChangeUsd) + " (Today)";
      }

      const twPct = totalUsd ? Math.round((twUsd / totalUsd) * 100) : 0;
      const usPct = totalUsd ? Math.round((usUsd / totalUsd) * 100) : 0;

      if (twValEl) twValEl.textContent = fmtAbs(twUsd);
      if (twPctEl) twPctEl.textContent = `${twPct}% of total`;
      if (usValEl) usValEl.textContent = fmtAbs(usUsd + otherUsd);
      if (usPctEl) usPctEl.textContent = `${Math.min(
        100,
        100 - twPct
      )}% of total`;

      if (tooltipTwEl) tooltipTwEl.textContent = fmtAbs(twUsd);
      if (tooltipUsEl) tooltipUsEl.textContent = fmtAbs(usUsd);

      if (fxValueEl) {
        const fxImpactUsd = totalUsd * 0.023;
        fxValueEl.textContent = (fxImpactUsd >= 0 ? "+" : "-") + fmtAbs(fxImpactUsd);
      }

      // Allocation chart data
      const cats = data.categories;
      const totalAlloc = cats.market + cats.realEstate + cats.defensive || 1;
      const mPct = Math.round((cats.market / totalAlloc) * 100);
      const rPct = Math.round((cats.realEstate / totalAlloc) * 100);
      const dPct = Math.max(0, 100 - mPct - rPct);

      if (allocationChart) {
        allocationChart.data.datasets[0].data = [
          cats.market || 0.1,
          cats.realEstate || 0.1,
          cats.defensive || 0.1,
        ];
        allocationChart.update();
      }

      if (allocMarketPct) allocMarketPct.textContent = `${mPct}%`;
      if (allocRealPct) allocRealPct.textContent = `${rPct}%`;
      if (allocDefPct) allocDefPct.textContent = `${dPct}%`;

      if (allocSummary) {
        let largest = "Market";
        let largestValue = mPct;
        if (rPct > largestValue) {
          largest = "Real Estate";
          largestValue = rPct;
        }
        if (dPct > largestValue) {
          largest = "Defensive";
          largestValue = dPct;
        }
        allocSummary.innerHTML =
          `Your largest sleeve is <span class="font-semibold">${largest}</span> at ` +
          `<span class="font-semibold">${largestValue}%</span>. ` +
          `Review if this aligns with your risk tolerance and cash needs.`;
      }
    }

    window.onload = function () {
      // Geo chart (marketing)
      const geoCanvas = document.getElementById("geoChart");
      if (geoCanvas) {
        const ctx = geoCanvas.getContext("2d");
        geoChart = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: ["US", "TW"],
            datasets: [
              {
                data: [482500, 315200],
                backgroundColor: ["#2563eb", "#111827"],
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",
            plugins: {
              legend: { display: false },
            },
          },
        });
      }

      langMenu = document.getElementById("lang-menu");
      userMenu = document.getElementById("user-menu");
      mobileMenu = document.getElementById("mobile-menu");
      modalOverlay = document.getElementById("modal-overlay");
      authOverlay = document.getElementById("auth-overlay");
      dashUserMenu = document.getElementById("dash-user-menu");

      render();

      // 一進頁面就看 localStorage 有沒有登入過
      try {
        const storedEmail = localStorage.getItem("taimic-user-email");
        if (storedEmail) {
          applyAuthUI(storedEmail);
        } else {
          applyAuthUI(null);
        }
      } catch (e) {
        console.error(e);
        applyAuthUI(null);
      }

      // Hero Screener slide-up 初始化
      heroCardOuterEl = document.getElementById("compliance-card");
      heroOverlayEl = document.getElementById("hero-overlay");
      const heroRunScanBtn = document.getElementById("hero-run-scan-btn");

      if (heroRunScanBtn && heroCardOuterEl && heroOverlayEl) {
        heroRunScanBtn.addEventListener("click", function () {
          openHeroCard();
        });

        heroOverlayEl.addEventListener("click", function () {
          if (heroCardOpen) {
            closeHeroCard();
          }
        });
      }

      const langToggle = document.getElementById("lang-toggle");
      const userToggle = document.getElementById("user-toggle");
      const mobileBtn = document.getElementById("mobile-menu-btn");
      const dashUserToggle = document.getElementById("dash-user-toggle");

      function closeAllMenus() {
        if (langMenu) langMenu.classList.add("hidden");
        if (userMenu) userMenu.classList.add("hidden");
        if (mobileMenu) mobileMenu.classList.add("hidden");
        if (dashUserMenu) dashUserMenu.classList.add("hidden");
      }

      if (langToggle) {
        langToggle.addEventListener("click", (e) => {
          e.stopPropagation();
          const open = langMenu && langMenu.classList.contains("hidden");
          closeAllMenus();
          if (open && langMenu) langMenu.classList.remove("hidden");
        });
      }
      if (langMenu) langMenu.addEventListener("click", (e) => e.stopPropagation());

      if (userToggle) {
        userToggle.addEventListener("click", (e) => {
          e.stopPropagation();
          const open = userMenu && userMenu.classList.contains("hidden");
          closeAllMenus();
          if (open && userMenu) userMenu.classList.remove("hidden");
        });
      }
      if (userMenu) userMenu.addEventListener("click", (e) => e.stopPropagation());

      if (mobileBtn) {
        mobileBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const open = mobileMenu && mobileMenu.classList.contains("hidden");
          closeAllMenus();
          if (open && mobileMenu) mobileMenu.classList.remove("hidden");
        });
      }

      if (dashUserToggle) {
        dashUserToggle.addEventListener("click", (e) => {
          e.stopPropagation();
          const open = dashUserMenu && dashUserMenu.classList.contains("hidden");
          closeAllMenus();
          if (open && dashUserMenu) dashUserMenu.classList.remove("hidden");
        });
      }
      if (dashUserMenu) dashUserMenu.addEventListener("click", (e) => e.stopPropagation());

      document.querySelectorAll(".mobile-nav-link").forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const section = link.dataset.section;
          if (section) switchSection(section);
          if (mobileMenu) mobileMenu.classList.add("hidden");
        });
      });

      document.addEventListener("click", closeAllMenus);

      const authSubmitBtn = document.getElementById("auth-submit");
      if (authSubmitBtn) {
        authSubmitBtn.addEventListener("click", handleAuthSubmit);
      }

      document.querySelectorAll("nav .nav-link").forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const section = link.dataset.section;
          if (section) switchSection(section);
        });
      });

      // Dashboard nav click (現在只有一個實際畫面，用 active 樣式即可)
      document.querySelectorAll(".dash-nav-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          document
            .querySelectorAll(".dash-nav-item")
            .forEach((b) => b.classList.remove("dash-nav-item-active"));
          btn.classList.add("dash-nav-item-active");
        });
      });

      switchSection("overview");
      fetchFXRate();
    };

    function openHeroCard() {
      if (!heroCardOuterEl || !heroOverlayEl) return;
      heroCardOuterEl.classList.add("hero-card-open");
      heroOverlayEl.classList.remove("hidden");
      heroOverlayEl.classList.add("hero-overlay-active");
      heroCardOpen = true;
    }

    function closeHeroCard() {
      if (!heroCardOuterEl || !heroOverlayEl) return;
      heroCardOuterEl.classList.remove("hero-card-open");
      heroOverlayEl.classList.add("hidden");
      heroOverlayEl.classList.remove("hero-overlay-active");
      heroCardOpen = false;
    }
