/**
 * Clickable terminology popups for MkDocs Material 101 courses.
 * Loads assets/terms.json, auto-links terms in lesson prose, opens rich modal on click.
 */
(function () {
  "use strict";

  const SKIP_PARENT = new Set([
    "PRE", "CODE", "KBD", "SAMP", "VAR", "SCRIPT", "STYLE", "TEXTAREA",
    "BUTTON", "A", "H1", "H2", "H3", "H4", "H5", "H6", "TH", "TD",
  ]);
  const MAX_LINKS_PER_TERM = 4;
  const ROOT_SEL = ".md-typeset";

  let registry = null;
  let matchList = [];
  let backdrop = null;

  function slug(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function loadRegistry() {
    const el = document.getElementById("terms-registry");
    if (el && el.textContent) {
      try {
        return JSON.parse(el.textContent);
      } catch (e) {
        console.warn("terms-popup: invalid embedded registry", e);
      }
    }
    const script = document.querySelector('script[src*="terms-popup.js"]');
    if (!script) return null;
    const src = script.getAttribute("src") || "";
    const base = src.replace(/[^/]+$/, "");
    return fetch(base + "terms.json")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }

  function buildMatchList(data) {
    const terms = data && data.terms ? data.terms : {};
    const list = [];
    for (const id of Object.keys(terms)) {
      const t = terms[id];
      const labels = new Set();
      if (t.label) labels.add(t.label);
      if (t.title) labels.add(t.title);
      (t.aliases || []).forEach((a) => labels.add(a));
      labels.forEach((label) => {
        if (!label || label.length < 2) return;
        list.push({ id, label, re: new RegExp("\\b" + escapeRe(label) + "\\b", "gi") });
      });
    }
    list.sort((a, b) => b.label.length - a.label.length);
    return list;
  }

  function shouldSkip(node) {
    let p = node.parentElement;
    while (p) {
      if (p.classList && (p.classList.contains("term-link") || p.classList.contains("term-popup")))
        return true;
      if (SKIP_PARENT.has(p.tagName)) return true;
      if (p.matches && p.matches(".md-typeset .highlight, .md-typeset pre, .md-clipboard")) return true;
      p = p.parentElement;
    }
    return false;
  }

  function linkify(root) {
    if (!matchList.length) return;
    const counts = {};
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);

    for (const textNode of nodes) {
      if (shouldSkip(textNode)) continue;
      let text = textNode.nodeValue;
      if (!text || !text.trim()) continue;

      const parts = [];
      let cursor = 0;
      let changed = false;

      while (cursor < text.length) {
        let best = null;
        let bestIdx = -1;
        for (const m of matchList) {
          m.re.lastIndex = 0;
          const slice = text.slice(cursor);
          const hit = m.re.exec(slice);
          if (!hit || hit.index !== 0) continue;
          const id = m.id;
          counts[id] = counts[id] || 0;
          if (counts[id] >= MAX_LINKS_PER_TERM) continue;
          if (!best || m.label.length > best.label.length) {
            best = m;
            bestIdx = 0;
          }
        }
        if (!best) {
          const next = text.indexOf(" ", cursor);
          if (next === -1) {
            parts.push({ t: text.slice(cursor) });
            break;
          }
          parts.push({ t: text.slice(cursor, next + 1) });
          cursor = next + 1;
          continue;
        }
        const matched = text.slice(cursor, cursor + best.label.length);
        parts.push({ term: best.id, t: matched });
        counts[best.id]++;
        cursor += matched.length;
        changed = true;
      }

      if (!changed) continue;

      const frag = document.createDocumentFragment();
      for (const p of parts) {
        if (p.term) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "term-link";
          btn.dataset.term = p.term;
          btn.textContent = p.t;
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            openPopup(p.term);
          });
          frag.appendChild(btn);
        } else {
          frag.appendChild(document.createTextNode(p.t));
        }
      }
      textNode.parentNode.replaceChild(frag, textNode);
    }

    root.querySelectorAll("[data-term]").forEach((el) => {
      if (el.classList.contains("term-link")) return;
      el.classList.add("term-link");
      if (el.tagName !== "BUTTON") {
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
      }
      el.addEventListener("click", () => openPopup(el.dataset.term));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPopup(el.dataset.term);
        }
      });
    });
  }

  function renderSection(sec) {
    const wrap = document.createElement("div");
    if (sec.heading) {
      const h = document.createElement("h4");
      h.className = "term-popup__section-title";
      h.textContent = sec.heading;
      wrap.appendChild(h);
    }
    const body = document.createElement("div");
    body.className = "term-popup__section-body";
    if (sec.body) {
      sec.body.split(/\n\n+/).forEach((para) => {
        const p = document.createElement("p");
        p.textContent = para.trim();
        body.appendChild(p);
      });
    }
    if (sec.code) {
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      if (sec.code.lang) code.className = "language-" + sec.code.lang;
      code.textContent = sec.code.source || "";
      pre.appendChild(code);
      body.appendChild(pre);
    }
    wrap.appendChild(body);
    return wrap;
  }

  function openPopup(termId) {
    if (!registry || !registry.terms || !registry.terms[termId]) return;
    const t = registry.terms[termId];
    ensureBackdrop();

    const popup = backdrop.querySelector(".term-popup");
    popup.innerHTML = "";

    const header = document.createElement("div");
    header.className = "term-popup__header";
    const title = document.createElement("h3");
    title.className = "term-popup__title";
    title.textContent = t.title || t.label || termId;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "term-popup__close";
    close.setAttribute("aria-label", "Close");
    close.textContent = "×";
    close.addEventListener("click", closePopup);
    header.appendChild(title);
    header.appendChild(close);
    popup.appendChild(header);

    if (t.lead) {
      const lead = document.createElement("p");
      lead.className = "term-popup__lead";
      lead.textContent = t.lead;
      popup.appendChild(lead);
    }

    if (t.analogy) {
      const ah = document.createElement("h4");
      ah.className = "term-popup__analogy-title";
      ah.textContent = t.analogy.title || "Simple analogy";
      popup.appendChild(ah);
      const ab = document.createElement("blockquote");
      ab.className = "term-popup__analogy";
      (t.analogy.body || "").split(/\n\n+/).forEach((para) => {
        const p = document.createElement("p");
        p.textContent = para.trim();
        ab.appendChild(p);
      });
      popup.appendChild(ab);
    }

    (t.sections || []).forEach((sec) => popup.appendChild(renderSection(sec)));

    if (t.table && t.table.headers && t.table.rows) {
      const wrap = document.createElement("div");
      wrap.className = "term-popup__table-wrap";
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const trh = document.createElement("tr");
      t.table.headers.forEach((h) => {
        const th = document.createElement("th");
        th.textContent = h;
        trh.appendChild(th);
      });
      thead.appendChild(trh);
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      t.table.rows.forEach((row) => {
        const tr = document.createElement("tr");
        row.forEach((cell) => {
          const td = document.createElement("td");
          td.textContent = cell;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      popup.appendChild(wrap);
    } else if (t.short) {
      const p = document.createElement("p");
      p.textContent = t.short;
      popup.appendChild(p);
    }

    if (t.confused && t.confused.length) {
      const conf = document.createElement("div");
      conf.className = "term-popup__confused";
      const strong = document.createElement("p");
      strong.innerHTML = "<strong>Still not clear?</strong> Click a related term:";
      conf.appendChild(strong);
      const ul = document.createElement("ul");
      t.confused.forEach((relId) => {
        const rt = registry.terms[relId];
        if (!rt) return;
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "term-link";
        btn.dataset.term = relId;
        btn.textContent = rt.title || rt.label || relId;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          openPopup(relId);
        });
        li.appendChild(btn);
        ul.appendChild(li);
      });
      conf.appendChild(ul);
      popup.appendChild(conf);
    }

    backdrop.classList.add("is-open");
    document.body.style.overflow = "hidden";
    close.focus();
  }

  function closePopup() {
    if (!backdrop) return;
    backdrop.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function ensureBackdrop() {
    if (backdrop) return;
    backdrop = document.createElement("div");
    backdrop.className = "term-popup-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.innerHTML = '<div class="term-popup"></div>';
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closePopup();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePopup();
    });
    document.body.appendChild(backdrop);
  }

  function init(data) {
    registry = data;
    matchList = buildMatchList(data);
    const root = document.querySelector(ROOT_SEL);
    if (root) linkify(root);
  }

  function boot() {
    const p = loadRegistry();
    if (p && typeof p.then === "function") {
      p.then((data) => data && init(data));
    } else if (p) {
      init(p);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();