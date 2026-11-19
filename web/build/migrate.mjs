// 一次性迁移脚本：把原 web/static/index.html 里内联的模板与脚本拆成源码文件。
// 用法：node web/build/migrate.mjs
// 产物：web/src/{template.html,app.js,custom.css,index.html}
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SRC_HTML = path.join(ROOT, 'web/static/index.html');
const OUT_DIR = path.join(ROOT, 'web/src');

const html = fs.readFileSync(SRC_HTML, 'utf8');

// ---- 1. 抽 #app 内部模板（按 div 深度匹配闭合标签）----
const appStart = html.indexOf('<div id="app"');
if (appStart < 0) throw new Error('找不到 #app 根节点');
const openTagEnd = html.indexOf('>', appStart) + 1;
const openTag = html.slice(appStart, openTagEnd);

let depth = 1;
let i = openTagEnd;
let closeStart = -1;
const tagRe = /<div\b|<\/div>/g;
tagRe.lastIndex = openTagEnd;
let m;
while ((m = tagRe.exec(html))) {
  if (m[0] === '</div>') {
    depth--;
    if (depth === 0) { closeStart = m.index; break; }
  } else {
    depth++;
  }
}
if (closeStart < 0) throw new Error('找不到 #app 闭合标签');

const template = html.slice(openTagEnd, closeStart);

// ---- 2. 抽内联应用脚本 ----
const scriptMarker = 'const { createApp';
const scriptPos = html.indexOf(scriptMarker);
if (scriptPos < 0) throw new Error('找不到应用脚本');
const scriptOpen = html.lastIndexOf('<script>', scriptPos);
const scriptClose = html.indexOf('</script>', scriptPos);
if (scriptOpen < 0 || scriptClose < 0) throw new Error('脚本标签不完整');
const appJs = html.slice(scriptOpen + '<script>'.length, scriptClose);

// ---- 3. 抽自定义样式 ----
const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/;
const styleMatch = html.match(styleRe);
if (!styleMatch) throw new Error('找不到 <style> 块');
const customCss = styleMatch[1];

// ---- 4. 生成新 shell ----
const headEnd = html.indexOf('</head>');
let head = html.slice(0, headEnd);
// 只去掉 Vue/Tailwind 的 CDN 与内联 <style>；Font Awesome 与 Google Fonts 保留
// （它们只涉及 style/font，不涉及脚本执行，不影响去掉 unsafe-eval）
head = head
  .replace(/<script src="https:\/\/unpkg\.com[^"]*"><\/script>\s*/g, '')
  .replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\s*/g, '')
  .replace(styleRe, '');

const shell = `${head.trimEnd()}
    <!-- 脚本全部本地化、无 eval；样式由 Tailwind 构建产出 -->
    <link rel="stylesheet" href="/ui/app.css">
</head>
<body class="min-h-screen overflow-x-hidden">
    ${openTag}</div>

    <script src="/ui/vendor/vue.runtime.global.prod.js"></script>
    <script src="/ui/app-render.js"></script>
    <script src="/ui/app.js"></script>
</body>
</html>
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'template.html'), template.trim() + '\n');
fs.writeFileSync(path.join(OUT_DIR, 'app.js'), appJs.replace(/^\s*\n/, ''));
fs.writeFileSync(path.join(OUT_DIR, 'custom.css'), customCss.trim() + '\n');
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), shell);

console.log('template.html :', template.length, 'bytes');
console.log('app.js        :', appJs.length, 'bytes');
console.log('custom.css    :', customCss.length, 'bytes');
console.log('index.html    :', shell.length, 'bytes');
