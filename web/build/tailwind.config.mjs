/** Tailwind 构建配置：只扫描本项目源码，产出最小 CSS */
export default {
  content: [
    '../src/template.html',
    '../src/app.js',
    '../src/index.html',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};
