// 站点里的小趣味：会动的机器人标志、首页标题轮换、长任务的碎碎念和完成时的彩纸。
// 这些都只是页面装饰（aria-hidden、不可选中），不进入编辑器、复制和导出的内容。
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const eye = x => '<circle cx="' + x + '" cy="9.9" r="1.6" fill="currentColor" stroke="none"/>';
  const FACES = {
    wink: '<circle cx="8" cy="10" r="1.6" fill="currentColor" stroke="none"/><path d="M13 10.6q2.2-2.8 4.4 0"/><path d="M8.4 15.2q3.6 2.9 7.2 0"/>',
    happy: '<path d="M6 10.8q2.2-2.8 4.4 0"/><path d="M13.6 10.8q2.2-2.8 4.4 0"/><path d="M8 14.6q4 3.8 8 0"/>',
    wow: eye(8.2) + eye(15.8) + '<circle cx="12" cy="15.6" r="1.6"/>',
    cool: '<path d="M5.4 9.2h5v1.4a2.5 2.5 0 0 1-5 0z" fill="currentColor"/><path d="M13.6 9.2h5v1.4a2.5 2.5 0 0 1-5 0z" fill="currentColor"/><path d="M9.4 15.8q3 1.5 5.6-.8M10.4 9.6h3.2"/>',
    sleepy: '<path d="M6.2 10.6h3.6"/><path d="M14.2 10.6h3.6"/><path d="M10.2 15.4q1.8 1 3.6 0"/>'
  };
  const FACE_ORDER = Object.keys(FACES);

  // ---- 机器人标志：眼睛跟着鼠标，点一下换表情（眨眼在 CSS 里） ----
  let lookFrame = 0;
  document.addEventListener('pointermove', event => {
    if (lookFrame || reduceMotion.matches || event.pointerType === 'touch') return;
    lookFrame = requestAnimationFrame(() => {
      lookFrame = 0;
      document.querySelectorAll('.brand-mark svg').forEach(svg => {
        const box = svg.getBoundingClientRect();
        const dx = event.clientX - box.left - box.width / 2;
        const dy = event.clientY - box.top - box.height / 2;
        const distance = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, distance / 140) * 1.3;
        svg.style.setProperty('--look-x', (dx / distance * reach).toFixed(2) + 'px');
        svg.style.setProperty('--look-y', (dy / distance * reach).toFixed(2) + 'px');
      });
    });
  }, { passive: true });
  const pagePath = path => path.replace(/\.html$/, '').replace(/\/index$/, '/');
  document.addEventListener('click', event => {
    const mark = event.target.closest && event.target.closest('.brand-mark');
    const svg = mark && mark.querySelector('svg');
    if (!svg) return;
    const link = mark.closest('a[href]');
    // 其他页面上的标志仍然是回首页的链接；已经在首页（或标志不是链接）时才换表情。
    if (link && pagePath(link.pathname) !== pagePath(location.pathname)) return;
    event.preventDefault();
    const next = FACE_ORDER[(FACE_ORDER.indexOf(mark.dataset.face || 'wink') + 1) % FACE_ORDER.length];
    mark.dataset.face = next;
    svg.innerHTML = FACES[next];
    mark.classList.remove('pop');
    void mark.offsetWidth;
    mark.classList.add('pop');
  });

  // ---- 首页标题：按时段随机换一句 ----
  const HEADLINES = {
    any: [
      ['今天想偷哪个懒', '？', '报表、排版、压缩、拼图，脏活累活放这儿。'],
      ['又来干活啦', '？', '老规矩，脏活累活放这儿。'],
      ['手动复制粘贴之前，先看看这儿', '。', '报表、排版、压缩、拼图都在下面。'],
      ['工具都在，随便用', '。', '不用登录，也没人催你。'],
      ['把文件丢进来试试', '。', '大多数在浏览器里处理，不出你的电脑。'],
      ['能点一下解决的，就别手动了', '。', '报表、排版、压缩、拼图，挑一个。']
    ],
    morning: [
      ['早，今天先干哪件', '？', '咖啡先喝一口，文件慢慢传。'],
      ['早上好，手还没热吧', '？', '那就先让工具干。']
    ],
    noon: [
      ['饭吃了吗', '？', '没吃先去吃，文件不会跑。'],
      ['午休前再搞定一个', '？', '一般也就点两下。']
    ],
    afternoon: [
      ['下午了，还剩几件', '？', '一件一件来，脏活放这儿。'],
      ['三点几了，饮茶先', '。', '回来再压图也不迟。']
    ],
    evening: [
      ['还没下班', '？', '那快点弄完，早点走。'],
      ['加班的话，我陪你', '。', '报表、排版、压缩，能省几分钟是几分钟。']
    ],
    night: [
      ['这么晚还在肝', '？', '弄完早点睡，文件明天还在。'],
      ['夜深了，工具还醒着', '。', '你也别熬太久。']
    ]
  };
  function timeSlot(hour) {
    return hour < 5 ? 'night' : hour < 11 ? 'morning' : hour < 14 ? 'noon' : hour < 18 ? 'afternoon' : hour < 23 ? 'evening' : 'night';
  }
  function headline(date) {
    const slot = HEADLINES[timeSlot((date || new Date()).getHours())];
    return pick(Math.random() < .6 ? slot : HEADLINES.any);
  }
  const title = document.querySelector('.welcome-row h1');
  if (title && title.nextElementSibling) {
    const [text, mark, sub] = headline();
    title.firstChild.textContent = text;
    title.querySelector('span').textContent = mark;
    title.nextElementSibling.textContent = sub;
  }

  // ---- 右下角气泡：长任务的碎碎念，完成时说句人话再撒点彩纸 ----
  const CHATTER = {
    image: ['正在给图片瘦身…', '一张一张来，别催…', '像素们在排队称体重…', '快了快了，在挤水分…'],
    pdf: ['正在给 PDF 减肥…', '一页一页翻，找胖图…', '文字和矢量不动，只动图片…', '快好了，在重新装订…'],
    word: ['正在把 Word 搬上网页…', '图片有点重，慢慢抬…', '标题、表格、图片，一个个对…', '马上搬完…'],
    article: ['正在去微信那边取文章…', '微信有时候回得慢，再等等…', '图片也一起打包带回来…'],
    zip: ['正在打包…', '找个大点的箱子…'],
    load: ['正在把工具从仓库里搬出来…', '第一次用会慢一点，之后就快了…', '组件有点大，在路上了…']
  };
  const stack = [];
  let bubble, bubbleText, bubbleFace, rotateTimer, hideTimer;
  function show(text, face) {
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'luyu-bubble';
      bubble.setAttribute('aria-hidden', 'true');
      bubble.innerHTML = '<span class="luyu-bubble-face"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></svg></span><span class="luyu-bubble-text"></span>';
      bubbleFace = bubble.querySelector('svg');
      bubbleText = bubble.querySelector('.luyu-bubble-text');
      document.body.append(bubble);
      void bubble.offsetWidth;
    }
    clearTimeout(hideTimer);
    bubbleText.textContent = text;
    bubbleFace.innerHTML = FACES[face] || FACES.wink;
    bubble.classList.add('show');
  }
  function resume() {
    clearInterval(rotateTimer);
    const current = stack[stack.length - 1];
    if (!current) { if (bubble) bubble.classList.remove('show'); return; }
    let index = 0;
    show(current[0], 'wink');
    rotateTimer = setInterval(() => { index = (index + 1) % current.length; bubbleText.textContent = current[index]; }, 2600);
  }
  function say(text, face, duration) {
    clearInterval(rotateTimer);
    show(text, face);
    hideTimer = setTimeout(resume, duration);
  }
  function confetti() {
    if (reduceMotion.matches) return;
    const burst = document.createElement('div');
    burst.className = 'luyu-confetti';
    burst.setAttribute('aria-hidden', 'true');
    const colors = ['#ff3b3b', '#0a84ff', '#34c759', '#ffcc00', '#af52de', '#ff9500'];
    for (let index = 0; index < 26; index++) {
      const piece = document.createElement('i');
      piece.style.cssText = '--c:' + colors[index % colors.length] + ';--x:' + Math.round(40 - Math.random() * 260) + 'px;--y:' + Math.round(-70 - Math.random() * 230) + 'px;--r:' + Math.round(Math.random() * 720 - 360) + 'deg;--d:' + Math.round(Math.random() * 120) + 'ms';
      burst.append(piece);
    }
    document.body.append(burst);
    setTimeout(() => burst.remove(), 1500);
  }
  function cheer(message, options) {
    say(message, 'happy', 2800);
    if (!options || options.confetti !== false) confetti();
  }
  function busy(kind) {
    const lines = CHATTER[kind] || CHATTER.load;
    stack.push(lines);
    resume();
    let open = true;
    const close = () => {
      if (!open) return false;
      open = false;
      clearTimeout(guard);
      stack.splice(stack.indexOf(lines), 1);
      return true;
    };
    const handle = {
      done(message, options) { if (close()) cheer(message, options); },
      fail(message) { if (close()) say(message || '这次没成，原因写在页面上了。', 'wow', 3200); },
      hide() { if (close()) resume(); }
    };
    // 调用方漏掉收尾时，气泡不会一直挂着。
    const guard = setTimeout(handle.hide, 120000);
    return handle;
  }

  // 第一次用到大组件时要现下载，等得久了才出来说一声。
  const dependencies = window.ToolDependencies;
  if (dependencies) {
    const load = dependencies.load;
    dependencies.load = (...names) => {
      const result = load(...names);
      let mood;
      const timer = setTimeout(() => { mood = busy('load'); }, 600);
      const end = () => { clearTimeout(timer); if (mood) mood.hide(); };
      result.then(end, end);
      return result;
    };
  }

  window.LuyuPlayful = { busy, cheer, headline, timeSlot, faces: FACES };
})();
