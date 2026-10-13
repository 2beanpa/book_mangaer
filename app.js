// Book Manager — 데이터는 브라우저 localStorage에 저장한다.

const BOOKS_KEY = "bookManager.books";
const QUOTES_KEY = "bookManager.quotes";

function loadList(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

const saveError = document.getElementById("save-error");

// 저장 공간이 꽉 찼거나 막혀 있으면 독자님께 알린다.
function saveList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
    saveError.hidden = true;
  } catch {
    saveError.hidden = false;
  }
}

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// "10월 13일"처럼 쓴다. 올해가 아니면 앞에 연도를 붙인다.
function formatDate(isoString) {
  const date = new Date(isoString);
  const day = `${date.getMonth() + 1}월 ${date.getDate()}일`;
  return date.getFullYear() === new Date().getFullYear() ? day : `${date.getFullYear()}년 ${day}`;
}

// 최근에 기록한 것이 위에 오도록 정렬한다.
function newestFirst(a, b) {
  return b.createdAt.localeCompare(a.createdAt);
}

// 별 다섯 개를 버튼으로 만든다. value가 null이면 별점이 없는 상태다.
function createStarRating(value, onChange) {
  const stars = document.createElement("div");
  stars.className = "stars";
  stars.setAttribute("role", "group");
  stars.setAttribute("aria-label", value ? `별점 ${value}점이에요` : "아직 별점이 없어요");

  for (let score = 1; score <= 5; score++) {
    const star = document.createElement("button");
    star.type = "button";
    star.className = score <= (value ?? 0) ? "star filled" : "star";
    star.textContent = "★";
    star.title = `${score}점을 줘요`;
    star.setAttribute("aria-label", `${score}점을 줘요`);
    star.addEventListener("click", () => onChange(score));
    stars.append(star);
  }
  return stars;
}

let books = loadList(BOOKS_KEY);
let quotes = loadList(QUOTES_KEY);

function findBook(id) {
  return books.find((b) => b.id === id);
}

function quotesOf(bookId) {
  return quotes.filter((q) => q.bookId === bookId);
}

// ---------- 책 목록 화면 ----------

const listView = document.getElementById("list-view");
const bookForm = document.getElementById("book-form");
const titleInput = document.getElementById("book-title");
const formRatingBox = document.getElementById("form-rating");
const formMessage = document.getElementById("form-message");
const bookList = document.getElementById("book-list");
const emptyMessage = document.getElementById("empty-message");
const bookListHint = document.getElementById("book-list-hint");

let formRating = null;

function renderFormRating() {
  // 같은 별을 한 번 더 누르면 선택을 취소한다.
  formRatingBox.replaceChildren(
    createStarRating(formRating, (score) => {
      formRating = score === formRating ? null : score;
      renderFormRating();
    })
  );
}

function setBookRating(id, score) {
  const book = findBook(id);
  if (!book) return;
  book.rating = score;
  saveList(BOOKS_KEY, books);
  route();
}

function renderBooks() {
  bookList.replaceChildren();
  emptyMessage.hidden = books.length > 0;
  bookListHint.hidden = books.length === 0;

  // 책의 차례처럼 제목과 별점 사이를 점선으로 잇는다.
  for (const book of [...books].sort(newestFirst)) {
    const item = document.createElement("li");

    const title = document.createElement("a");
    title.className = "book-title-link";
    title.href = `#book/${book.id}`;
    title.textContent = book.title;

    const leader = document.createElement("span");
    leader.className = "leader";
    leader.setAttribute("aria-hidden", "true");

    const rating = createStarRating(book.rating, (score) => setBookRating(book.id, score));

    const row = document.createElement("div");
    row.className = "toc-row";
    row.append(title, leader, rating);

    const meta = document.createElement("p");
    meta.className = "book-date";
    const count = quotesOf(book.id).length;
    meta.textContent = count
      ? `${formatDate(book.createdAt)}에 기록하고 문장 ${count}개를 남겼어요.`
      : `${formatDate(book.createdAt)}에 기록했어요.`;

    item.append(row, meta);
    bookList.append(item);
  }
}

bookForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  if (!title) {
    formMessage.textContent = "독자님, 책 제목을 먼저 적어 주세요.";
    titleInput.focus();
    return;
  }

  books.push({
    id: createId(),
    title,
    rating: formRating,
    createdAt: new Date().toISOString(),
  });
  saveList(BOOKS_KEY, books);

  formMessage.textContent = "";
  titleInput.value = "";
  formRating = null;
  titleInput.focus();
  renderFormRating();
  route();
});

// ---------- 책 상세 화면 ----------

const detailView = document.getElementById("detail-view");
const detailTitle = document.getElementById("detail-title");
const detailDate = document.getElementById("detail-date");
const detailRating = document.getElementById("detail-rating");
const quoteForm = document.getElementById("quote-form");
const quoteInput = document.getElementById("quote-text");
const quoteMessage = document.getElementById("quote-message");
const quoteList = document.getElementById("quote-list");
const quoteEmpty = document.getElementById("quote-empty");
const titleDisplay = document.getElementById("title-display");
const titleForm = document.getElementById("title-form");
const titleEditInput = document.getElementById("title-input");
const titleMessage = document.getElementById("title-message");
const titleEditButton = document.getElementById("title-edit");
const titleCancelButton = document.getElementById("title-cancel");
const bookDeleteButton = document.getElementById("book-delete");

let currentBookId = null;
let editingTitle = false;
let editingQuoteId = null;

function createButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function createQuoteView(quote) {
  const text = document.createElement("p");
  text.className = "quote-text";
  text.textContent = quote.text;

  const date = document.createElement("span");
  date.className = "book-date";
  date.textContent = `${formatDate(quote.createdAt)}에 남겼어요`;

  const actions = document.createElement("div");
  actions.className = "item-actions";
  actions.append(
    createButton("고쳐요", "secondary", () => {
      editingQuoteId = quote.id;
      route();
    }),
    createButton("지워요", "danger", () => deleteQuote(quote.id))
  );

  const row = document.createElement("div");
  row.className = "quote-row";
  row.append(date, actions);

  return [text, row];
}

function createQuoteEditForm(quote) {
  const form = document.createElement("form");
  form.noValidate = true;

  const textarea = document.createElement("textarea");
  textarea.rows = 3;
  textarea.maxLength = 1000;
  textarea.value = quote.text;
  textarea.setAttribute("aria-label", "고칠 문장이에요");

  const message = document.createElement("p");
  message.className = "message";
  message.setAttribute("role", "alert");

  const actions = document.createElement("div");
  actions.className = "form-actions";
  const save = document.createElement("button");
  save.type = "submit";
  save.textContent = "저장해요";
  actions.append(
    createButton("취소해요", "secondary", () => {
      editingQuoteId = null;
      route();
    }),
    save
  );

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = textarea.value.trim();
    if (!text) {
      message.textContent = "독자님, 문장을 비워 둘 수는 없어요. 지우려면 취소하고 지워요를 눌러 주세요.";
      textarea.focus();
      return;
    }
    quote.text = text;
    saveList(QUOTES_KEY, quotes);
    editingQuoteId = null;
    route();
  });

  form.append(textarea, actions, message);
  // 화면에 붙은 뒤에 입력 칸으로 바로 옮겨 간다.
  setTimeout(() => textarea.focus());
  return [form];
}

function renderDetail(book) {
  detailTitle.textContent = book.title;
  titleDisplay.hidden = editingTitle;
  titleForm.hidden = !editingTitle;
  titleEditButton.hidden = editingTitle;

  detailDate.textContent = `${formatDate(book.createdAt)}에 기록했어요`;
  detailRating.replaceChildren(createStarRating(book.rating, (score) => setBookRating(book.id, score)));

  const bookQuotes = quotesOf(book.id).sort(newestFirst);
  quoteList.replaceChildren();
  quoteEmpty.hidden = bookQuotes.length > 0;

  for (const quote of bookQuotes) {
    const item = document.createElement("li");
    item.append(...(quote.id === editingQuoteId ? createQuoteEditForm(quote) : createQuoteView(quote)));
    quoteList.append(item);
  }
}

titleEditButton.addEventListener("click", () => {
  editingTitle = true;
  titleEditInput.value = findBook(currentBookId).title;
  titleMessage.textContent = "";
  route();
  titleEditInput.focus();
});

titleCancelButton.addEventListener("click", () => {
  editingTitle = false;
  route();
});

titleForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = titleEditInput.value.trim();
  if (!title) {
    titleMessage.textContent = "독자님, 책 제목을 비워 둘 수는 없어요.";
    titleEditInput.focus();
    return;
  }
  findBook(currentBookId).title = title;
  saveList(BOOKS_KEY, books);
  editingTitle = false;
  route();
});

const confirmDialog = document.getElementById("confirm-dialog");
const confirmMessage = document.getElementById("confirm-message");

// 브라우저 기본 확인 창 대신 쓴다. "지워요"를 누르면 true, 취소하거나 Esc를 누르면 false다.
function askConfirm(message) {
  confirmMessage.textContent = message;
  confirmDialog.returnValue = "";
  confirmDialog.showModal();
  return new Promise((resolve) => {
    confirmDialog.addEventListener("close", () => resolve(confirmDialog.returnValue === "ok"), { once: true });
  });
}

bookDeleteButton.addEventListener("click", async () => {
  const book = findBook(currentBookId);
  const count = quotesOf(book.id).length;
  const question = count
    ? `독자님, "${book.title}" 책과 남긴 문장 ${count}개를 모두 지울까요? 지우면 되돌릴 수 없어요.`
    : `독자님, "${book.title}" 책을 지울까요? 지우면 되돌릴 수 없어요.`;
  if (!(await askConfirm(question))) return;

  // 책을 지우면 그 책의 문장도 함께 지운다.
  books = books.filter((b) => b.id !== book.id);
  quotes = quotes.filter((q) => q.bookId !== book.id);
  saveList(BOOKS_KEY, books);
  saveList(QUOTES_KEY, quotes);
  location.hash = "";
});

async function deleteQuote(id) {
  if (!(await askConfirm("독자님, 이 문장을 지울까요? 지우면 되돌릴 수 없어요."))) return;
  quotes = quotes.filter((q) => q.id !== id);
  saveList(QUOTES_KEY, quotes);
  if (editingQuoteId === id) editingQuoteId = null;
  route();
}

quoteForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = quoteInput.value.trim();
  if (!text) {
    quoteMessage.textContent = "독자님, 남길 문장을 먼저 적어 주세요.";
    quoteInput.focus();
    return;
  }

  quotes.push({
    id: createId(),
    bookId: currentBookId,
    text,
    createdAt: new Date().toISOString(),
  });
  saveList(QUOTES_KEY, quotes);

  quoteMessage.textContent = "";
  quoteInput.value = "";
  quoteInput.focus();
  route();
});

// ---------- 최근에 남긴 문장 ----------

const latestQuote = document.getElementById("latest-quote");
const latestQuoteText = document.getElementById("latest-quote-text");
const latestQuoteBook = document.getElementById("latest-quote-book");
const latestQuoteDate = document.getElementById("latest-quote-date");

// 메인 화면에 가장 최근 문장 하나를 보여준다. 문장이 없으면 숨긴다.
function renderLatestQuote() {
  const quote = [...quotes].sort(newestFirst).find((q) => findBook(q.bookId));
  latestQuote.hidden = !quote;
  if (!quote) return;
  const book = findBook(quote.bookId);
  latestQuoteText.textContent = quote.text;
  latestQuoteBook.href = `#book/${book.id}`;
  latestQuoteBook.textContent = book.title;
  latestQuoteDate.textContent = `에서 ${formatDate(quote.createdAt)}에 옮겨 적었어요.`;
}

// ---------- 독서 통계 화면 ----------

// 목록 화면 안에 숫자 요약(목록 위)과 그래프(목록 아래)로 보여준다.

const statsSummary = document.getElementById("stats-summary");

// 숫자 요약은 상자 대신 독자님께 건네는 문장으로 쓴다. 숫자만 굵게 두고,
// key가 true인 숫자(지금까지 기록한 권수)만 강조색으로 보여준다.
function strongNumber(text, key = false) {
  const el = document.createElement("strong");
  if (key) el.className = "key";
  el.textContent = text;
  return el;
}

function renderStats() {
  // 책이 없으면 목록의 안내 문구만 보이고 통계는 모두 숨긴다.
  for (const el of [statsSummary, monthlyCard, ratingCard]) el.hidden = books.length === 0;
  if (books.length === 0) return;

  const now = new Date();
  const thisMonthCount = books.filter((b) => {
    const date = new Date(b.createdAt);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;

  // 평균 별점은 별점을 매긴 책만으로 계산한다.
  const rated = books.filter((b) => b.rating);
  const average = rated.length
    ? (rated.reduce((sum, b) => sum + b.rating, 0) / rated.length).toFixed(1)
    : null;

  statsSummary.replaceChildren(
    "지금까지 ", strongNumber(`${books.length}권`, true), "을 기록했고, ",
    `${now.getMonth() + 1}월에는 `, strongNumber(`${thisMonthCount}권`), "을 기록했어요. ",
    ...(average
      ? [`별점을 매긴 ${rated.length}권의 평균은 `, strongNumber(`${average}점`), "이에요. "]
      : ["아직 매긴 별점은 없어요. "]),
    "남긴 문장은 ", strongNumber(`${quotes.length}개`), "예요."
  );

  renderMonthlyChart(now);
  renderRatingChart();
}

// ---------- 월별 책 수 그래프 (SVG) ----------

const monthlyCard = document.getElementById("monthly-card");
const monthlyChart = document.getElementById("monthly-chart");
const monthlyText = document.getElementById("monthly-text");

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

// 최근 12개월을 오래된 달부터 돌려준다. 이번 달이 마지막이다.
function lastTwelveMonths(now) {
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: date.getFullYear(), month: date.getMonth(), count: 0 });
  }
  for (const book of books) {
    const date = new Date(book.createdAt);
    const slot = months.find((m) => m.year === date.getFullYear() && m.month === date.getMonth());
    if (slot) slot.count++;
  }
  return months;
}

// 두 그래프 모두 막대를 책 한 권당 한 칸씩 쌓아 그린다. 칸 사이는 2px 띄운다.
// 한 달에 두세 권이라 칸을 세면 바로 권수가 보여서 눈금과 격자선이 필요 없다.
const BOOK_GAP = 2;

// 책 한 칸이 차지하는 길이(틈 포함, 최대 max). 칸이 많아져도 전체 길이가 limit을 넘지 않게 줄인다.
function bookStep(count, limit, max) {
  return Math.max(4, Math.min(max, Math.floor(limit / Math.max(count, 1))));
}

// 칸들을 하나의 묶음(g)으로 만든다. 마우스를 올리면 묶음 전체가 옅어진다.
function bookStack(rects) {
  const group = svgEl("g", { class: "bar" });
  for (const r of rects) group.append(svgEl("rect", { ...r, rx: 2 }));
  return group;
}

// 그래프 하나에 툴팁 하나. 값이 굵게 먼저, 이름이 뒤에 온다.
function createTooltip(svg, W) {
  const el = document.createElement("div");
  el.className = "chart-tooltip";
  el.hidden = true;
  const valueEl = document.createElement("strong");
  const labelEl = document.createElement("span");
  el.append(valueEl, labelEl);

  return {
    el,
    // (x, y)는 SVG 좌표다. 툴팁은 그 점 바로 위에 뜨고, 그래프 밖으로 나가지 않는다.
    show(x, y, value, label) {
      valueEl.textContent = value;
      labelEl.textContent = label;
      el.hidden = false;
      const scale = svg.getBoundingClientRect().width / W;
      const half = el.offsetWidth / 2;
      el.style.left = `${Math.min(Math.max(x * scale, half), W * scale - half)}px`;
      el.style.top = `${y * scale}px`;
    },
    hide() {
      el.hidden = true;
    },
  };
}

// 지금 열려 있는 툴팁을 닫는 함수. 툴팁은 화면 전체에서 하나만 열린다.
let closeOpenTooltip = null;

// 막대보다 넓은 투명 영역(hit)이 마우스, 터치, 키보드를 받는다.
// 마우스는 올리면 열리고 벗어나면 닫힌다. 터치는 누르면 열리고 다른 곳을 누르면 닫힌다.
function attachHover(hit, bar, tooltip, x, y, value, label) {
  const show = () => {
    if (closeOpenTooltip && closeOpenTooltip !== hide) closeOpenTooltip();
    bar?.classList.add("active");
    tooltip.show(x, y, value, label);
    closeOpenTooltip = hide;
  };
  const hide = () => {
    bar?.classList.remove("active");
    tooltip.hide();
    if (closeOpenTooltip === hide) closeOpenTooltip = null;
  };
  hit.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") show(); });
  hit.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hide(); });
  hit.addEventListener("click", show);
  hit.addEventListener("focus", show);
  hit.addEventListener("blur", hide);
}

document.addEventListener("pointerdown", (e) => {
  if (!(e.target instanceof Element && e.target.classList.contains("hit"))) closeOpenTooltip?.();
});

// 그래프는 실제 화면 폭으로 그린다. 그래야 좁은 화면에서도 글자가 줄어들지 않는다.
function chartWidth(container) {
  return container.clientWidth || 600;
}

function renderMonthlyChart(now) {
  const months = lastTwelveMonths(now);
  const W = chartWidth(monthlyChart);
  const margin = { top: 24, right: 8, bottom: 44, left: 8 };
  const plotW = W - margin.left - margin.right;
  const band = plotW / months.length;
  const barW = Math.min(24, band * 0.6);

  // 달마다 책을 눕혀 쌓은 더미다. 높이는 가장 많이 읽은 달에 맞추되 최소 다섯 칸은 남긴다.
  const maxCount = Math.max(...months.map((m) => m.count));
  const step = bookStep(maxCount, 160, 16);
  const plotH = Math.max(maxCount, 5) * step;
  const H = margin.top + plotH + margin.bottom;
  const baseY = margin.top + plotH;
  const cx = (i) => margin.left + band * i + band / 2;
  const fullLabel = (m) => `${m.year}년 ${m.month + 1}월`;

  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "최근 12개월 동안 달마다 기록한 책 수를 한 권에 한 칸씩 쌓아 보여 주는 막대그래프예요" });

  // 숫자는 모든 막대에 적지 않고, 이번 달과 가장 많이 기록한 달에만 적는다.
  const lastIndex = months.length - 1;
  const maxIndex = maxCount > 0 ? months.findIndex((m) => m.count === maxCount) : -1;
  const labelEvery = band < 36 ? 2 : 1;
  let shownYear = null;
  let prevYearLabel = null;

  const tooltip = createTooltip(svg, W);

  months.forEach((m, i) => {
    const x = cx(i);
    const yTop = baseY - m.count * step + BOOK_GAP;
    let bar = null;

    if (m.count > 0) {
      bar = bookStack(Array.from({ length: m.count }, (_, k) => ({
        x: x - barW / 2, y: baseY - (k + 1) * step + BOOK_GAP, width: barW, height: step - BOOK_GAP,
      })));
      svg.append(bar);
    }

    if (m.count > 0 && (i === lastIndex || i === maxIndex)) {
      const value = svgEl("text", { class: "value-label", x, y: yTop - 6, "text-anchor": "middle" });
      value.textContent = m.count;
      svg.append(value);
    }

    // x축: 달 이름. 칸이 좁으면 이번 달부터 거꾸로 한 달씩 건너뛰어 적는다.
    // 연도는 처음 적는 달과 연도가 바뀌는 달 아래에 한 줄 더 적는다.
    if ((lastIndex - i) % labelEvery === 0) {
      const monthLabel = svgEl("text", {
        class: i === lastIndex ? "axis-text current" : "axis-text",
        x, y: baseY + 18, "text-anchor": "middle",
      });
      monthLabel.textContent = `${m.month + 1}월`;
      svg.append(monthLabel);
      if (m.year !== shownYear) {
        const yearLabel = svgEl("text", { class: "axis-text", x, y: baseY + 34, "text-anchor": "middle" });
        yearLabel.textContent = `${m.year}년`;
        svg.append(yearLabel);
        // 앞의 연도와 너무 가까우면 앞은 왼쪽으로, 새 연도는 오른쪽으로 펼쳐 겹치지 않게 한다.
        if (prevYearLabel && x - prevYearLabel.x < 56) {
          prevYearLabel.el.setAttribute("text-anchor", "end");
          prevYearLabel.el.setAttribute("x", prevYearLabel.x + 12);
          yearLabel.setAttribute("text-anchor", "start");
          yearLabel.setAttribute("x", x - 12);
        }
        prevYearLabel = { el: yearLabel, x };
        shownYear = m.year;
      }
    }

    const hit = svgEl("rect", {
      class: "hit", x: margin.left + band * i, y: margin.top, width: band, height: plotH, rx: 4,
      tabindex: 0, "aria-label": `${fullLabel(m)}에는 ${m.count}권을 기록했어요`,
    });
    attachHover(hit, bar, tooltip, x, Math.min(yTop, baseY - 4), `${m.count}권`, fullLabel(m));
    svg.append(hit);
  });

  svg.append(svgEl("line", { class: "baseline", x1: margin.left, x2: W - margin.right, y1: baseY, y2: baseY }));

  monthlyChart.replaceChildren(svg, tooltip.el);

  // 그래프를 보지 않고도 같은 숫자를 읽을 수 있게 글로도 적는다. 최근 달이 위에 온다.
  monthlyText.replaceChildren(
    ...[...months].reverse().map((m) => {
      const item = document.createElement("li");
      item.textContent = `${fullLabel(m)}에는 ${m.count}권을 기록했어요.`;
      return item;
    })
  );
}

// ---------- 별점 분포 그래프 (SVG, 가로 막대) ----------

const ratingCard = document.getElementById("rating-card");
const ratingChart = document.getElementById("rating-chart");
const ratingText = document.getElementById("rating-text");
const ratingUnrated = document.getElementById("rating-unrated");

function renderRatingChart() {
  // 5점이 맨 위에 온다.
  const rows = [5, 4, 3, 2, 1].map((score) => ({
    score,
    count: books.filter((b) => b.rating === score).length,
  }));
  const unrated = books.filter((b) => !b.rating).length;
  ratingUnrated.textContent = unrated
    ? `별점을 아직 매기지 않은 책 ${unrated}권은 빼고 세어요.`
    : "기록한 책 모두 별점을 매겼어요.";

  const W = chartWidth(ratingChart);
  const rowH = 36;
  const barH = 20;
  const margin = { top: 4, right: 40, bottom: 4, left: 48 };
  const H = margin.top + rowH * rows.length + margin.bottom;
  const plotW = W - margin.left - margin.right;

  // 별점마다 책을 세워 꽂은 책장이다. 한 권이 책등 한 칸이다.
  const step = bookStep(Math.max(...rows.map((r) => r.count)), plotW, 12);
  const x = (v) => margin.left + v * step;

  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "별점마다 책이 몇 권인지 한 권에 한 칸씩 보여 주는 가로 막대그래프예요" });
  const tooltip = createTooltip(svg, W);

  rows.forEach((row, i) => {
    const rowTop = margin.top + rowH * i;
    const cy = rowTop + rowH / 2;
    const xEnd = x(row.count);
    let bar = null;

    const label = svgEl("text", { class: "axis-text", x: margin.left - 10, y: cy + 4, "text-anchor": "end" });
    label.textContent = `${row.score}점`;
    svg.append(label);

    if (row.count > 0) {
      bar = bookStack(Array.from({ length: row.count }, (_, k) => ({
        x: margin.left + BOOK_GAP + k * step, y: cy - barH / 2, width: step - BOOK_GAP, height: barH,
      })));
      svg.append(bar);
    }

    // 막대가 다섯 개뿐이고 가로 눈금이 없어서, 숫자는 막대 끝에 모두 적는다.
    const value = svgEl("text", { class: "value-label", x: xEnd + 6, y: cy + 4 });
    value.textContent = row.count;
    svg.append(value);

    const hit = svgEl("rect", {
      class: "hit", x: 4, y: rowTop, width: W - 8, height: rowH, rx: 4,
      tabindex: 0, "aria-label": `별점 ${row.score}점인 책은 ${row.count}권이에요`,
    });
    attachHover(hit, bar, tooltip, xEnd, cy - barH / 2, `${row.count}권`, `별점 ${row.score}점`);
    svg.append(hit);
  });

  svg.append(svgEl("line", { class: "baseline", x1: margin.left, x2: margin.left, y1: margin.top, y2: H - margin.bottom }));

  ratingChart.replaceChildren(svg, tooltip.el);

  const lines = rows.map((row) => `별점 ${row.score}점인 책은 ${row.count}권이에요.`);
  if (unrated) lines.push(`별점을 매기지 않은 책은 ${unrated}권이에요.`);
  ratingText.replaceChildren(
    ...lines.map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    })
  );
}

// ---------- 화면 전환 ----------
// 주소의 #book/<id>로 어떤 화면을 보여줄지 정한다. 그래서 브라우저 뒤로 가기도 동작한다.

function showView(view) {
  for (const v of [listView, detailView]) {
    v.hidden = v !== view;
  }
}

function route() {
  const match = location.hash.match(/^#book\/(.+)$/);
  const book = match && findBook(match[1]);

  if (book) {
    if (currentBookId !== book.id) {
      // 다른 책으로 옮겨 가면 쓰던 입력과 고치던 상태는 비운다.
      quoteInput.value = "";
      quoteMessage.textContent = "";
      editingTitle = false;
      editingQuoteId = null;
    }
    currentBookId = book.id;
    renderDetail(book);
    showView(detailView);
  } else {
    currentBookId = null;
    editingTitle = false;
    editingQuoteId = null;
    renderBooks();
    renderLatestQuote();
    // 목록 화면이 보인 뒤에 통계를 그려야 그래프 폭을 잴 수 있다.
    showView(listView);
    renderStats();
  }
}

// 창 폭이 바뀌면 그래프를 새 폭으로 다시 그린다.
let resizeFrame = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    if (listView.hidden || books.length === 0) return;
    renderMonthlyChart(new Date());
    renderRatingChart();
  });
});

window.addEventListener("hashchange", () => {
  route();
  window.scrollTo(0, 0);
});

// 다른 탭에서 기록을 바꾸면 이 탭도 새로 읽는다. 오래된 목록으로 덮어써서 기록을 잃지 않게 한다.
window.addEventListener("storage", (event) => {
  if (event.key !== BOOKS_KEY && event.key !== QUOTES_KEY && event.key !== null) return;
  books = loadList(BOOKS_KEY);
  quotes = loadList(QUOTES_KEY);
  route();
});

renderFormRating();
route();
