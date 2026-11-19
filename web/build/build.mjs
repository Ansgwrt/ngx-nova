// ngx-nova 前端构建：把 Vue 模板预编译成渲染函数、Tailwind 产出静态 CSS、
// Vue 运行时本地化 —— 构建完成后页面不再需要 CDN，也不再需要 CSP 的 'unsafe-eval'。
//
// 用法：cd web/build && npm ci && npm run build
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { compile } from '@vue/compiler-dom';

const BUILD_DIR = import.meta.dirname;
const ROOT = path.resolve(BUILD_DIR, '../..');
const SRC = path.join(ROOT, 'web/src');
const OUT = path.join(ROOT, 'web/static');
const NM = path.join(BUILD_DIR, 'node_modules');

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
};
const kb = (n) => (n / 1024).toFixed(1) + ' KB';

// ---------- 1. 预编译模板 ----------
// mode: 'function' 生成形如 (function(){ const {...} = Vue; return function render(){...} })()
// 的代码，配合 runtime-only 构建可直接使用，无需浏览器内编译器。
const template = read(path.join(SRC, 'template.html'));
const { code, errors } = compile(template, {
  mode: 'function',
  hoistStatic: true,
  onError: (e) => { throw new Error('模板编译失败: ' + e.message); },
});
if (errors && errors.length) throw new Error('模板编译错误: ' + errors[0].message);
if (!code.includes('Vue')) {
  throw new Error('编译产物未引用全局 Vue，mode 配置可能有误');
}

write(
  path.join(OUT, 'app-render.js'),
  `/* 由 web/build/build.mjs 从 web/src/template.html 预编译生成，请勿手改 */\nwindow.__APP_RENDER__ = (function () {\n${code}\n})();\n`
);

// ---------- 2. 注入 render，替换运行时编译 ----------
let appJs = read(path.join(SRC, 'app.js'));
const injected = appJs.replace(
  /createApp\(\{\s*\n(\s*)setup\(\) \{/,
  (_m, indent) => `createApp({\n${indent}render: window.__APP_RENDER__,\n${indent}setup() {`
);
if (injected === appJs) throw new Error('未能注入 render（createApp/setup 结构已变化？）');
if (!injected.includes('window.__APP_RENDER__')) throw new Error('render 注入失败');
write(path.join(OUT, 'app.js'), injected);

// ---------- 3. Tailwind 产出静态 CSS ----------
const tailwindInput = path.join(BUILD_DIR, '.tailwind.entry.css');
write(tailwindInput, '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');

const cssOut = path.join(BUILD_DIR, '.tailwind.out.css');
execFileSync(
  process.execPath,
  [
    path.join(NM, 'tailwindcss/lib/cli.js'),
    '-c', path.join(BUILD_DIR, 'tailwind.config.mjs'),
    '-i', tailwindInput,
    '-o', cssOut,
    '--minify',
  ],
  { cwd: BUILD_DIR, stdio: 'inherit' }
);

// 自定义样式追加在 Tailwind 之后，保证优先级与原来一致
const custom = read(path.join(SRC, 'custom.css'));
const css = read(cssOut) + '\n/* ===== 项目自定义样式 ===== */\n' + custom;
write(path.join(OUT, 'app.css'), css);
fs.rmSync(tailwindInput, { force: true });
fs.rmSync(cssOut, { force: true });

// ---------- 4. 本地化 Vue 运行时 ----------
const vueDist = path.join(NM, 'vue/dist/vue.runtime.global.prod.js');
if (!fs.existsSync(vueDist)) throw new Error('未找到 Vue runtime 构建: ' + vueDist);
const vueOut = path.join(OUT, 'vendor/vue.runtime.global.prod.js');
write(vueOut, read(vueDist));

// ---------- 5. 输出 shell ----------
write(path.join(OUT, 'index.html'), read(path.join(SRC, 'index.html')));

// ---------- 汇总 ----------
const stat = (p) => fs.statSync(p).size;
const rows = [
  ['index.html', stat(path.join(OUT, 'index.html'))],
  ['app.js', stat(path.join(OUT, 'app.js'))],
  ['app-render.js', stat(path.join(OUT, 'app-render.js'))],
  ['app.css', stat(path.join(OUT, 'app.css'))],
  ['vendor/vue.runtime.global.prod.js', stat(vueOut)],
];
console.log('\n构建完成：');
for (const [name, size] of rows) console.log(`  ${name.padEnd(34)} ${kb(size)}`);
console.log(`  合计 ${kb(rows.reduce((s, r) => s + r[1], 0))}（原方案：完整版 Vue + Tailwind JIT 运行时编译）\n`);
