/* 由 web/build/build.mjs 从 web/src/template.html 预编译生成，请勿手改 */
window.__APP_RENDER__ = (function () {
const _Vue = Vue
const { createElementVNode: _createElementVNode, createCommentVNode: _createCommentVNode, createTextVNode: _createTextVNode, createStaticVNode: _createStaticVNode } = _Vue

const _hoisted_1 = { class: "fixed top-3 left-3 right-3 z-[70] space-y-2 md:top-6 md:right-6 md:left-auto md:w-72 safe-top" }
const _hoisted_2 = { class: "pr-4 leading-relaxed" }
const _hoisted_3 = ["onClick"]
const _hoisted_4 = {
  key: 0,
  class: "absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 md:p-6"
}
const _hoisted_5 = { class: "glass rounded-3xl w-full max-w-md border border-white/10 shadow-2xl max-h-[92dvh] overflow-y-auto" }
const _hoisted_6 = { class: "px-5 py-5 md:px-8 md:py-6 space-y-4" }
const _hoisted_7 = { class: "space-y-2" }
const _hoisted_8 = ["onUpdate:modelValue"]
const _hoisted_9 = {
  key: 0,
  class: "text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded-xl px-4 py-2"
}
const _hoisted_10 = { class: "px-5 py-5 md:px-8 md:py-6 bg-white/5 flex justify-end safe-bottom" }
const _hoisted_11 = ["onClick", "disabled"]
const _hoisted_12 = { class: "flex h-[100dvh] overflow-hidden" }
const _hoisted_13 = ["onClick"]
const _hoisted_14 = { class: "p-5 md:p-8 flex items-center justify-between safe-top" }
const _hoisted_15 = ["onClick"]
const _hoisted_16 = { class: "flex-grow mt-2 md:mt-4 px-3 md:px-4 space-y-1.5 md:space-y-2 overflow-y-auto scroll-thin" }
const _hoisted_17 = ["onClick"]
const _hoisted_18 = { class: "font-medium" }
const _hoisted_19 = {
  key: 0,
  class: "ml-auto w-2 h-2 rounded-full bg-red-500",
  title: "存在待修复的安全公告"
}
const _hoisted_20 = { class: "p-4 md:p-6 border-t border-white/5 safe-bottom" }
const _hoisted_21 = { class: "flex items-center space-x-3 text-xs text-gray-500" }
const _hoisted_22 = { class: "flex-grow overflow-y-auto p-4 pb-28 md:p-8 md:pb-8 space-y-5 md:space-y-6 relative" }
const _hoisted_23 = { class: "flex items-start justify-between gap-3" }
const _hoisted_24 = { class: "flex items-start gap-3 min-w-0" }
const _hoisted_25 = ["onClick"]
const _hoisted_26 = { class: "min-w-0" }
const _hoisted_27 = { class: "text-xl md:text-3xl font-bold text-white mb-1 truncate" }
const _hoisted_28 = { class: "flex items-center space-x-2 md:space-x-4 shrink-0" }
const _hoisted_29 = { class: "glass px-3 md:px-4 py-2 rounded-full flex items-center space-x-2 md:space-x-3 border border-white/5" }
const _hoisted_30 = { class: "text-[11px] md:text-xs font-mono text-gray-400" }
const _hoisted_31 = {
  key: 0,
  class: "hidden lg:block text-[11px] text-gray-500 text-right"
}
const _hoisted_32 = ["onClick"]
const _hoisted_33 = {
  key: 0,
  class: "md:hidden text-[11px] text-gray-500 -mt-2"
}
const _hoisted_34 = {
  key: 1,
  class: "space-y-6 animate-fadeIn"
}
const _hoisted_35 = { class: "grid grid-cols-1 md:grid-cols-3 gap-6" }
const _hoisted_36 = { class: "glass p-6 rounded-3xl relative overflow-hidden group" }
const _hoisted_37 = { class: "absolute top-4 right-4 w-28 h-28 glass border border-white/10 rounded-full shadow-lg" }
const _hoisted_38 = { class: "flex flex-col items-center justify-center text-center h-full space-y-1 px-3" }
const _hoisted_39 = { class: "text-lg font-bold text-white" }
const _hoisted_40 = {
  key: 0,
  class: "text-[10px] text-gray-300"
}
const _hoisted_41 = {
  key: 1,
  class: "text-[10px] text-gray-500"
}
const _hoisted_42 = { class: "mt-5 flex flex-wrap gap-3" }
const _hoisted_43 = ["onClick"]
const _hoisted_44 = ["onClick"]
const _hoisted_45 = ["onClick"]
const _hoisted_46 = {
  key: 0,
  class: "mt-5 space-y-2"
}
const _hoisted_47 = { class: "h-1.5 bg-white/10 rounded-full overflow-hidden" }
const _hoisted_48 = { class: "flex justify-between text-[10px] text-gray-500" }
const _hoisted_49 = { class: "glass p-6 rounded-3xl relative overflow-hidden group" }
const _hoisted_50 = { class: "text-3xl font-bold text-white mb-4" }
const _hoisted_51 = { class: "grid grid-cols-2 gap-3 text-xs" }
const _hoisted_52 = { class: "bg-white/5 rounded-xl px-3 py-2 text-gray-300" }
const _hoisted_53 = { class: "float-right text-white font-semibold" }
const _hoisted_54 = { class: "bg-white/5 rounded-xl px-3 py-2 text-gray-300" }
const _hoisted_55 = { class: "float-right text-white font-semibold" }
const _hoisted_56 = { class: "bg-white/5 rounded-xl px-3 py-2 text-gray-300" }
const _hoisted_57 = { class: "float-right text-white font-semibold" }
const _hoisted_58 = { class: "bg-white/5 rounded-xl px-3 py-2 text-gray-300" }
const _hoisted_59 = { class: "float-right text-white font-semibold" }
const _hoisted_60 = { class: "glass p-6 rounded-3xl relative overflow-hidden group" }
const _hoisted_61 = { class: "text-3xl font-bold text-white mb-2" }
const _hoisted_62 = { class: "flex flex-wrap items-center justify-between gap-x-4 gap-y-2" }
const _hoisted_63 = { class: "flex items-center space-x-3 min-w-0" }
const _hoisted_64 = { class: "min-w-0" }
const _hoisted_65 = { class: "text-white font-bold font-mono text-sm leading-tight mt-1" }
const _hoisted_66 = { class: "flex flex-wrap items-center gap-1.5 md:gap-2" }
const _hoisted_67 = ["onClick"]
const _hoisted_68 = ["onClick", "disabled"]
const _hoisted_69 = { class: "mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-relaxed" }
const _hoisted_70 = {
  key: 0,
  class: "flex flex-wrap gap-1"
}
const _hoisted_71 = {
  key: 0,
  class: "text-[10px] text-gray-400"
}
const _hoisted_72 = {
  key: 1,
  class: "text-gray-500"
}
const _hoisted_73 = { class: "font-mono text-gray-300" }
const _hoisted_74 = { class: "grid grid-cols-1 lg:grid-cols-3 gap-6" }
const _hoisted_75 = { class: "lg:col-span-2 space-y-6" }
const _hoisted_76 = { class: "glass rounded-3xl p-6" }
const _hoisted_77 = { class: "flex items-center justify-between mb-4" }
const _hoisted_78 = ["onClick"]
const _hoisted_79 = { class: "hidden md:block overflow-hidden rounded-2xl border border-white/5" }
const _hoisted_80 = { class: "w-full text-sm" }
const _hoisted_81 = { class: "divide-y divide-white/5" }
const _hoisted_82 = { class: "px-4 py-3 font-mono text-sm text-white" }
const _hoisted_83 = { class: "px-4 py-3" }
const _hoisted_84 = { class: "px-4 py-3 text-gray-300" }
const _hoisted_85 = { key: 0 }
const _hoisted_86 = { key: 1 }
const _hoisted_87 = { key: 2 }
const _hoisted_88 = { key: 3 }
const _hoisted_89 = { class: "md:hidden space-y-2" }
const _hoisted_90 = { class: "flex items-start justify-between gap-2" }
const _hoisted_91 = { class: "min-w-0" }
const _hoisted_92 = { class: "text-white font-mono text-sm break-anywhere" }
const _hoisted_93 = { class: "text-[11px] text-gray-500 mt-1 break-anywhere" }
const _hoisted_94 = { key: 0 }
const _hoisted_95 = { key: 1 }
const _hoisted_96 = { key: 2 }
const _hoisted_97 = { key: 3 }
const _hoisted_98 = {
  key: 1,
  class: "p-8 md:p-10 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl text-sm"
}
const _hoisted_99 = { class: "glass rounded-3xl p-6 flex flex-col justify-between" }
const _hoisted_100 = ["onClick"]
const _hoisted_101 = { class: "glass rounded-3xl p-6 space-y-4" }
const _hoisted_102 = { class: "space-y-3" }
const _hoisted_103 = ["onClick"]
const _hoisted_104 = { class: "space-y-2" }
const _hoisted_105 = ["onClick"]
const _hoisted_106 = ["onClick"]
const _hoisted_107 = ["onClick"]
const _hoisted_108 = {
  key: 2,
  class: "space-y-6 animate-fadeIn"
}
const _hoisted_109 = { class: "flex flex-col md:flex-row md:items-center md:justify-between gap-4" }
const _hoisted_110 = ["onClick"]
const _hoisted_111 = { class: "grid grid-cols-1 lg:grid-cols-5 gap-6" }
const _hoisted_112 = { class: "glass rounded-3xl p-4 lg:col-span-2 h-full" }
const _hoisted_113 = { class: "flex items-center justify-between mb-3" }
const _hoisted_114 = { class: "text-xs text-gray-500 uppercase" }
const _hoisted_115 = { class: "space-y-2 max-h-[42vh] md:max-h-[520px] overflow-y-auto pr-1 scroll-thin" }
const _hoisted_116 = ["onClick"]
const _hoisted_117 = { class: "flex items-center justify-between" }
const _hoisted_118 = { class: "text-white font-semibold text-sm" }
const _hoisted_119 = { class: "text-xs text-gray-500 mt-1 font-mono truncate" }
const _hoisted_120 = { key: 0 }
const _hoisted_121 = { key: 1 }
const _hoisted_122 = { key: 2 }
const _hoisted_123 = { key: 3 }
const _hoisted_124 = {
  key: 0,
  class: "text-sm text-gray-500 text-center py-16"
}
const _hoisted_125 = { class: "glass rounded-3xl p-6 lg:col-span-3 h-full" }
const _hoisted_126 = { class: "flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6" }
const _hoisted_127 = { class: "flex items-center space-x-4" }
const _hoisted_128 = { class: "text-2xl font-bold text-white" }
const _hoisted_129 = { class: "flex flex-wrap gap-2" }
const _hoisted_130 = ["onClick"]
const _hoisted_131 = ["onClick"]
const _hoisted_132 = ["onClick"]
const _hoisted_133 = { class: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-6" }
const _hoisted_134 = { class: "glass border border-white/5 rounded-2xl px-4 py-4" }
const _hoisted_135 = { class: "text-white font-semibold text-lg" }
const _hoisted_136 = { class: "text-xs text-gray-500 mt-1" }
const _hoisted_137 = { class: "glass border border-white/5 rounded-2xl px-4 py-4" }
const _hoisted_138 = { class: "text-white font-semibold text-sm font-mono" }
const _hoisted_139 = { class: "text-xs text-gray-500 mt-1" }
const _hoisted_140 = { class: "space-y-6" }
const _hoisted_141 = {
  key: 0,
  class: "glass border border-white/5 rounded-2xl px-5 py-4"
}
const _hoisted_142 = { class: "text-white font-mono" }
const _hoisted_143 = {
  key: 1,
  class: "glass border border-white/5 rounded-2xl px-5 py-4"
}
const _hoisted_144 = { class: "space-y-2 text-sm" }
const _hoisted_145 = {
  key: 0,
  class: "text-gray-500"
}
const _hoisted_146 = {
  key: 2,
  class: "glass border border-white/5 rounded-2xl px-5 py-4"
}
const _hoisted_147 = { class: "text-blue-300 font-mono break-all" }
const _hoisted_148 = {
  key: 3,
  class: "glass border border-white/5 rounded-2xl px-5 py-4"
}
const _hoisted_149 = { class: "text-white font-mono" }
const _hoisted_150 = {
  key: 1,
  class: "h-full flex items-center justify-center text-gray-500 text-sm"
}
const _hoisted_151 = {
  key: 3,
  class: "space-y-6 animate-fadeIn"
}
const _hoisted_152 = { class: "flex flex-col md:flex-row md:items-center md:justify-between gap-4" }
const _hoisted_153 = ["onClick"]
const _hoisted_154 = { class: "glass rounded-3xl p-4 md:p-6 border border-white/5" }
const _hoisted_155 = { class: "hidden md:block overflow-x-auto" }
const _hoisted_156 = { class: "min-w-full text-sm" }
const _hoisted_157 = { class: "divide-y divide-white/5" }
const _hoisted_158 = { class: "px-4 py-3 font-semibold text-white" }
const _hoisted_159 = { class: "px-4 py-3 text-gray-300 font-mono" }
const _hoisted_160 = { class: "px-4 py-3 text-gray-300 font-mono" }
const _hoisted_161 = { class: "px-4 py-3 text-right space-x-3" }
const _hoisted_162 = ["onClick"]
const _hoisted_163 = ["onClick"]
const _hoisted_164 = ["onClick"]
const _hoisted_165 = { class: "md:hidden space-y-3" }
const _hoisted_166 = { class: "flex items-start justify-between gap-2" }
const _hoisted_167 = { class: "min-w-0" }
const _hoisted_168 = { class: "text-white font-semibold text-sm break-anywhere" }
const _hoisted_169 = { class: "text-[11px] text-gray-500 mt-1 font-mono break-anywhere" }
const _hoisted_170 = { class: "shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-400/30" }
const _hoisted_171 = { class: "grid grid-cols-3 gap-2" }
const _hoisted_172 = ["onClick"]
const _hoisted_173 = ["onClick"]
const _hoisted_174 = ["onClick"]
const _hoisted_175 = {
  key: 1,
  class: "text-gray-500 text-sm text-center py-12 md:py-16 border border-dashed border-white/10 rounded-2xl"
}
const _hoisted_176 = {
  key: 4,
  class: "space-y-6 animate-fadeIn"
}
const _hoisted_177 = { class: "flex flex-col md:flex-row md:items-center md:justify-between gap-4" }
const _hoisted_178 = { class: "text-sm text-gray-400 leading-relaxed" }
const _hoisted_179 = { class: "flex items-center gap-3" }
const _hoisted_180 = ["onClick", "disabled"]
const _hoisted_181 = { class: "glass rounded-3xl p-6" }
const _hoisted_182 = {
  key: 0,
  class: "flex items-center justify-center py-16 text-sm text-gray-500"
}
const _hoisted_183 = {
  key: 1,
  class: "py-16 text-center text-sm text-gray-500 border border-dashed border-white/10 rounded-2xl"
}
const _hoisted_184 = {
  key: 2,
  class: "space-y-4 max-h-[520px] overflow-y-auto pr-1"
}
const _hoisted_185 = { class: "flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3" }
const _hoisted_186 = { class: "flex-1" }
const _hoisted_187 = { class: "flex items-center gap-3" }
const _hoisted_188 = { class: "text-sm font-semibold text-white truncate" }
const _hoisted_189 = { class: "text-[11px] text-gray-400 mt-1" }
const _hoisted_190 = { key: 0 }
const _hoisted_191 = {
  key: 1,
  class: "mx-1 text-gray-600"
}
const _hoisted_192 = { key: 2 }
const _hoisted_193 = { class: "flex items-center gap-2" }
const _hoisted_194 = ["onClick"]
const _hoisted_195 = ["onClick", "disabled"]
const _hoisted_196 = {
  key: 0,
  class: "mb-3"
}
const _hoisted_197 = { class: "bg-black/30 rounded-xl px-3 py-2 text-[11px] text-gray-300 whitespace-pre-wrap leading-5 max-h-32 overflow-y-auto" }
const _hoisted_198 = { key: 1 }
const _hoisted_199 = { class: "bg-black/30 rounded-xl px-3 py-2 text-[11px] text-red-200/80 whitespace-pre-wrap leading-5 max-h-32 overflow-y-auto" }
const _hoisted_200 = {
  key: 2,
  class: "text-[11px] text-gray-500 border border-dashed border-white/10 rounded-xl px-3 py-3"
}
const _hoisted_201 = {
  key: 5,
  class: "space-y-6 animate-fadeIn"
}
const _hoisted_202 = { class: "glass rounded-3xl border border-white/5 p-6" }
const _hoisted_203 = { class: "flex flex-col md:flex-row md:items-center md:justify-between gap-4" }
const _hoisted_204 = { class: "text-xs text-gray-500 bg-white/5 border border-white/10 rounded-2xl px-4 py-2" }
const _hoisted_205 = { class: "text-gray-300" }
const _hoisted_206 = {
  key: 0,
  class: "glass rounded-3xl border border-white/5 p-10 text-sm text-gray-400 flex items-center justify-center space-x-3"
}
const _hoisted_207 = ["onSubmit"]
const _hoisted_208 = { class: "grid grid-cols-1 xl:grid-cols-2 gap-4" }
const _hoisted_209 = { class: "glass rounded-3xl border border-white/5 p-4 space-y-3" }
const _hoisted_210 = { class: "grid grid-cols-1 md:grid-cols-2 gap-2" }
const _hoisted_211 = { class: "space-y-2" }
const _hoisted_212 = ["onUpdate:modelValue"]
const _hoisted_213 = { class: "space-y-2" }
const _hoisted_214 = ["onUpdate:modelValue"]
const _hoisted_215 = { class: "grid grid-cols-1 md:grid-cols-2 gap-2" }
const _hoisted_216 = { class: "space-y-2" }
const _hoisted_217 = ["onUpdate:modelValue"]
const _hoisted_218 = { class: "glass rounded-3xl border border-white/5 p-4 space-y-3" }
const _hoisted_219 = { class: "grid grid-cols-1 md:grid-cols-2 gap-2" }
const _hoisted_220 = { class: "space-y-2" }
const _hoisted_221 = ["onUpdate:modelValue"]
const _hoisted_222 = { class: "space-y-2" }
const _hoisted_223 = { class: "flex items-center space-x-2" }
const _hoisted_224 = ["onUpdate:modelValue"]
const _hoisted_225 = { class: "grid grid-cols-1 xl:grid-cols-2 gap-3" }
const _hoisted_226 = { class: "glass rounded-3xl border border-white/5 p-4 space-y-3" }
const _hoisted_227 = { class: "flex items-center justify-between" }
const _hoisted_228 = { class: "flex items-center space-x-2 text-xs text-gray-400" }
const _hoisted_229 = ["onUpdate:modelValue"]
const _hoisted_230 = { class: "space-y-2" }
const _hoisted_231 = ["onUpdate:modelValue", "disabled"]
const _hoisted_232 = { class: "space-y-2" }
const _hoisted_233 = ["onUpdate:modelValue", "disabled"]
const _hoisted_234 = { class: "glass rounded-3xl border border-white/5 p-4 space-y-3" }
const _hoisted_235 = { class: "flex items-center justify-between" }
const _hoisted_236 = { class: "flex items-center space-x-2 text-xs text-gray-400" }
const _hoisted_237 = ["onUpdate:modelValue"]
const _hoisted_238 = { class: "space-y-2" }
const _hoisted_239 = ["onUpdate:modelValue", "disabled"]
const _hoisted_240 = { class: "space-y-2" }
const _hoisted_241 = ["onUpdate:modelValue", "disabled"]
const _hoisted_242 = { class: "flex justify-end" }
const _hoisted_243 = ["disabled"]
const _hoisted_244 = {
  key: 6,
  class: "space-y-6 animate-fadeIn"
}
const _hoisted_245 = { class: "grid grid-cols-1 xl:grid-cols-3 gap-6" }
const _hoisted_246 = { class: "space-y-6" }
const _hoisted_247 = { class: "glass rounded-3xl p-6 border border-white/5 h-full" }
const _hoisted_248 = { class: "flex items-center justify-between mb-4" }
const _hoisted_249 = {
  key: 0,
  class: "text-xs text-blue-300 flex items-center space-x-2"
}
const _hoisted_250 = ["onClick"]
const _hoisted_251 = { class: "space-y-3 text-sm" }
const _hoisted_252 = { class: "flex items-center justify-between" }
const _hoisted_253 = { class: "flex items-center justify-between" }
const _hoisted_254 = { class: "flex items-center justify-between" }
const _hoisted_255 = { class: "text-xs text-gray-500 leading-relaxed" }
const _hoisted_256 = { class: "font-mono text-white" }
const _hoisted_257 = { class: "mt-1" }
const _hoisted_258 = { class: "font-mono text-white break-all" }
const _hoisted_259 = { class: "mt-6 space-y-3" }
const _hoisted_260 = ["onClick", "disabled"]
const _hoisted_261 = { class: "text-sm font-medium text-emerald-200 flex items-center space-x-2" }
const _hoisted_262 = ["onClick", "disabled"]
const _hoisted_263 = { class: "text-sm font-medium text-blue-200 flex items-center space-x-2" }
const _hoisted_264 = { class: "glass border border-orange-400/30 bg-orange-500/5 rounded-2xl px-4 py-4 space-y-3" }
const _hoisted_265 = { class: "space-y-2" }
const _hoisted_266 = ["onUpdate:modelValue"]
const _hoisted_267 = ["onClick", "disabled"]
const _hoisted_268 = { class: "text-sm font-medium text-orange-100 flex items-center space-x-2" }
const _hoisted_269 = { class: "glass rounded-3xl p-6 border border-white/5 xl:col-span-2" }
const _hoisted_270 = ["onSubmit"]
const _hoisted_271 = { class: "grid grid-cols-1 md:grid-cols-2 gap-4" }
const _hoisted_272 = { class: "space-y-2" }
const _hoisted_273 = ["onUpdate:modelValue"]
const _hoisted_274 = { class: "space-y-2" }
const _hoisted_275 = ["onUpdate:modelValue"]
const _hoisted_276 = { class: "space-y-2" }
const _hoisted_277 = ["onUpdate:modelValue"]
const _hoisted_278 = { class: "grid grid-cols-1 md:grid-cols-2 gap-4" }
const _hoisted_279 = { class: "space-y-2" }
const _hoisted_280 = ["onUpdate:modelValue"]
const _hoisted_281 = { class: "space-y-2" }
const _hoisted_282 = ["onUpdate:modelValue"]
const _hoisted_283 = { class: "flex items-center space-x-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-gray-400" }
const _hoisted_284 = ["onUpdate:modelValue"]
const _hoisted_285 = { class: "flex flex-col md:flex-row md:items-center md:justify-between gap-3" }
const _hoisted_286 = ["disabled"]
const _hoisted_287 = { class: "mobile-tabbar" }
const _hoisted_288 = ["onClick"]
const _hoisted_289 = { class: "relative" }
const _hoisted_290 = {
  key: 0,
  class: "absolute -top-0.5 -right-1.5 w-1.5 h-1.5 rounded-full bg-red-500"
}
const _hoisted_291 = {
  key: 1,
  class: "fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-end md:items-center justify-center p-0 md:p-4"
}
const _hoisted_292 = { class: "glass modal-panel rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[92dvh] md:max-h-[88vh]" }
const _hoisted_293 = { class: "px-5 py-4 md:px-8 md:py-6 border-b border-white/5 flex justify-between items-center shrink-0" }
const _hoisted_294 = { class: "text-lg md:text-2xl font-bold text-white" }
const _hoisted_295 = ["onClick"]
const _hoisted_296 = { class: "p-5 md:p-8 space-y-5 md:space-y-6 overflow-y-auto flex-1" }
const _hoisted_297 = { class: "grid grid-cols-1 md:grid-cols-2 gap-4" }
const _hoisted_298 = { class: "space-y-2" }
const _hoisted_299 = ["onUpdate:modelValue", "disabled"]
const _hoisted_300 = { class: "space-y-2" }
const _hoisted_301 = ["onUpdate:modelValue"]
const _hoisted_302 = ["value"]
const _hoisted_303 = {
  key: 0,
  class: "grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn"
}
const _hoisted_304 = { class: "space-y-2" }
const _hoisted_305 = ["onUpdate:modelValue"]
const _hoisted_306 = { class: "space-y-2" }
const _hoisted_307 = ["onUpdate:modelValue"]
const _hoisted_308 = {
  key: 1,
  class: "space-y-3 animate-fadeIn"
}
const _hoisted_309 = ["onUpdate:modelValue"]
const _hoisted_310 = {
  key: 2,
  class: "space-y-3 animate-fadeIn"
}
const _hoisted_311 = ["onUpdate:modelValue"]
const _hoisted_312 = {
  key: 3,
  class: "p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs"
}
const _hoisted_313 = { class: "px-5 py-4 md:px-8 md:py-6 bg-white/5 flex justify-end gap-3 md:gap-4 shrink-0 safe-bottom" }
const _hoisted_314 = ["onClick"]
const _hoisted_315 = ["onClick"]
const _hoisted_316 = {
  key: 2,
  class: "fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-end md:items-center justify-center p-0 md:p-4"
}
const _hoisted_317 = { class: "glass modal-panel rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[92dvh] md:max-h-[88vh]" }
const _hoisted_318 = { class: "px-5 py-4 md:px-8 md:py-6 border-b border-white/5 flex justify-between items-center shrink-0" }
const _hoisted_319 = { class: "text-lg md:text-2xl font-bold text-white flex items-center space-x-2 md:space-x-3 min-w-0" }
const _hoisted_320 = { class: "truncate" }
const _hoisted_321 = ["onClick"]
const _hoisted_322 = { class: "p-4 md:p-6 space-y-3 overflow-y-auto flex-1" }
const _hoisted_323 = ["onUpdate:modelValue", "disabled"]
const _hoisted_324 = {
  key: 0,
  class: "text-xs text-blue-300"
}
const _hoisted_325 = { class: "px-5 py-4 md:px-8 md:py-6 bg-white/5 flex justify-end gap-3 md:gap-4 shrink-0 safe-bottom" }
const _hoisted_326 = ["onClick"]
const _hoisted_327 = ["onClick", "disabled"]
const _hoisted_328 = {
  key: 3,
  class: "fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-end md:items-center justify-center p-0 md:p-4"
}
const _hoisted_329 = { class: "glass modal-panel rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[92dvh] md:max-h-[88vh]" }
const _hoisted_330 = { class: "px-5 py-4 md:px-8 md:py-6 border-b border-white/5 flex justify-between items-center shrink-0" }
const _hoisted_331 = { class: "text-lg md:text-2xl font-bold text-white" }
const _hoisted_332 = ["onClick"]
const _hoisted_333 = { class: "p-5 md:p-8 space-y-4 md:space-y-5 overflow-y-auto flex-1" }
const _hoisted_334 = { class: "space-y-2" }
const _hoisted_335 = ["onUpdate:modelValue", "disabled"]
const _hoisted_336 = { class: "space-y-2" }
const _hoisted_337 = ["onUpdate:modelValue"]
const _hoisted_338 = { class: "space-y-2" }
const _hoisted_339 = ["onUpdate:modelValue"]
const _hoisted_340 = { class: "px-5 py-4 md:px-8 md:py-6 bg-white/5 flex justify-end gap-3 md:gap-4 shrink-0 safe-bottom" }
const _hoisted_341 = ["onClick"]
const _hoisted_342 = ["onClick"]
const _hoisted_343 = {
  key: 4,
  class: "fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-end md:items-center justify-center p-0 md:p-4"
}
const _hoisted_344 = { class: "glass modal-panel rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[92dvh] md:max-h-[88vh]" }
const _hoisted_345 = { class: "px-5 py-4 md:px-8 md:py-6 border-b border-white/5 flex justify-between items-center shrink-0" }
const _hoisted_346 = { class: "text-lg md:text-2xl font-bold text-white flex items-center space-x-2 md:space-x-3 min-w-0" }
const _hoisted_347 = { class: "truncate" }
const _hoisted_348 = ["onClick"]
const _hoisted_349 = { class: "p-4 md:p-6 space-y-3 overflow-y-auto flex-1" }
const _hoisted_350 = ["onUpdate:modelValue", "disabled"]
const _hoisted_351 = {
  key: 0,
  class: "text-xs text-blue-300"
}
const _hoisted_352 = { class: "px-5 py-4 md:px-8 md:py-6 bg-white/5 flex justify-end gap-3 md:gap-4 shrink-0 safe-bottom" }
const _hoisted_353 = ["onClick"]
const _hoisted_354 = ["onClick", "disabled"]
const _hoisted_355 = {
  key: 5,
  class: "fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
}
const _hoisted_356 = { class: "glass modal-panel rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[92dvh] md:max-h-[88vh]" }
const _hoisted_357 = { class: "px-5 py-4 md:px-8 md:py-6 border-b border-white/5 flex justify-between items-center shrink-0" }
const _hoisted_358 = { class: "text-lg md:text-2xl font-bold text-white flex items-center space-x-2 md:space-x-3 min-w-0" }
const _hoisted_359 = { class: "truncate" }
const _hoisted_360 = ["onClick"]
const _hoisted_361 = { class: "p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 overflow-y-auto flex-1" }
const _hoisted_362 = { class: "flex items-center justify-between mb-2" }
const _hoisted_363 = { class: "flex items-center space-x-3" }
const _hoisted_364 = ["onClick"]
const _hoisted_365 = { class: "text-[11px] text-gray-500" }
const _hoisted_366 = { class: "bg-black/40 border border-white/10 rounded-2xl h-52 md:h-72 overflow-y-auto text-[11px] text-gray-200 font-mono p-3 md:p-4 leading-5" }
const _hoisted_367 = {
  key: 1,
  class: "text-gray-500 text-xs text-center py-10"
}
const _hoisted_368 = { class: "flex items-center justify-between mb-2" }
const _hoisted_369 = { class: "flex items-center space-x-3" }
const _hoisted_370 = ["onClick"]
const _hoisted_371 = { class: "text-[11px] text-gray-500" }
const _hoisted_372 = { class: "bg-black/40 border border-white/10 rounded-2xl h-52 md:h-72 overflow-y-auto text-[11px] text-red-200 font-mono p-3 md:p-4 leading-5" }
const _hoisted_373 = {
  key: 1,
  class: "text-gray-500 text-xs text-center py-10"
}
const _hoisted_374 = { class: "px-5 py-4 md:px-8 md:py-6 bg-white/5 flex justify-end shrink-0 safe-bottom" }
const _hoisted_375 = ["onClick"]
const _hoisted_376 = {
  key: 6,
  class: "fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-end md:items-center justify-center p-0 md:p-4"
}
const _hoisted_377 = { class: "glass modal-panel rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[92dvh] md:max-h-[88vh]" }
const _hoisted_378 = { class: "px-5 py-4 md:px-8 md:py-6 border-b border-white/5 flex justify-between items-center shrink-0" }
const _hoisted_379 = ["onClick"]
const _hoisted_380 = { class: "p-4 md:p-6 space-y-4 overflow-y-auto flex-1" }
const _hoisted_381 = { class: "flex items-center justify-between text-sm text-white" }
const _hoisted_382 = { class: "ml-2" }
const _hoisted_383 = { class: "text-xs text-gray-400" }
const _hoisted_384 = { class: "mt-3 h-2 bg-white/10 rounded-full overflow-hidden" }
const _hoisted_385 = {
  ref: "installLogRef",
  class: "bg-black/45 border border-white/10 rounded-2xl p-3 md:p-4 h-52 md:h-64 overflow-y-auto text-xs font-mono text-gray-200 space-y-1 break-anywhere"
}
const _hoisted_386 = {
  key: 0,
  class: "text-gray-500"
}
const _hoisted_387 = { class: "px-5 py-4 md:px-8 md:py-6 bg-white/5 text-right text-xs text-gray-500 shrink-0 safe-bottom" }
const _hoisted_388 = { key: 0 }
const _hoisted_389 = { key: 1 }
const _hoisted_390 = {
  key: 7,
  class: "fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
}
const _hoisted_391 = { class: "glass modal-panel rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[92dvh] md:max-h-[88vh]" }
const _hoisted_392 = { class: "px-5 py-4 md:px-8 md:py-6 border-b border-white/5 flex justify-between items-center shrink-0" }
const _hoisted_393 = ["onClick"]
const _hoisted_394 = { class: "p-4 md:p-6 space-y-4 overflow-y-auto flex-1" }
const _hoisted_395 = { class: "grid grid-cols-2 md:grid-cols-4 gap-3" }
const _hoisted_396 = { class: "glass border border-white/5 rounded-2xl px-3 py-3" }
const _hoisted_397 = { class: "text-white font-mono text-sm mt-1" }
const _hoisted_398 = { class: "glass border border-white/5 rounded-2xl px-3 py-3" }
const _hoisted_399 = { class: "text-white text-sm mt-1" }
const _hoisted_400 = { class: "glass border border-white/5 rounded-2xl px-3 py-3" }
const _hoisted_401 = { class: "text-emerald-300 font-mono text-sm mt-1" }
const _hoisted_402 = { class: "glass border border-white/5 rounded-2xl px-3 py-3" }
const _hoisted_403 = { class: "text-white text-sm mt-1" }
const _hoisted_404 = {
  key: 0,
  class: "space-y-2"
}
const _hoisted_405 = { class: "flex items-start justify-between gap-3" }
const _hoisted_406 = { class: "min-w-0" }
const _hoisted_407 = { class: "text-sm text-white break-anywhere" }
const _hoisted_408 = { class: "text-[11px] text-gray-500 font-mono mt-1 break-anywhere" }
const _hoisted_409 = {
  key: 1,
  class: "p-6 text-center text-sm text-gray-400 border border-dashed border-white/10 rounded-2xl"
}
const _hoisted_410 = { class: "text-[11px] text-gray-500 leading-relaxed" }
const _hoisted_411 = { class: "font-mono text-gray-400" }
const _hoisted_412 = { class: "px-5 py-4 md:px-8 md:py-6 bg-white/5 flex flex-col md:flex-row justify-end gap-3 shrink-0 safe-bottom" }
const _hoisted_413 = ["onClick"]
const _hoisted_414 = ["onClick", "disabled"]

return function render(_ctx, _cache) {
  with (_ctx) {
    const { createCommentVNode: _createCommentVNode, renderList: _renderList, Fragment: _Fragment, openBlock: _openBlock, createElementBlock: _createElementBlock, toDisplayString: _toDisplayString, createElementVNode: _createElementVNode, normalizeClass: _normalizeClass, createTextVNode: _createTextVNode, vModelText: _vModelText, withDirectives: _withDirectives, normalizeStyle: _normalizeStyle, vModelCheckbox: _vModelCheckbox, withModifiers: _withModifiers, vModelSelect: _vModelSelect, createStaticVNode: _createStaticVNode } = _Vue

    return (_openBlock(), _createElementBlock(_Fragment, null, [
      _createCommentVNode(" Toast Notifications "),
      _createElementVNode("div", _hoisted_1, [
        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(notifications, (notice) => {
          return (_openBlock(), _createElementBlock("div", {
            key: notice.id,
            class: _normalizeClass(['glass px-4 py-3 rounded-2xl border flex items-start justify-between text-sm', noticeStyle(notice.type)])
          }, [
            _createElementVNode("span", _hoisted_2, _toDisplayString(notice.message), 1 /* TEXT */),
            _createElementVNode("button", {
              onClick: $event => (removeNotification(notice.id)),
              class: "text-xs text-gray-400 hover:text-white transition"
            }, [...(_cache[0] || (_cache[0] = [
              _createElementVNode("i", { class: "fas fa-times" }, null, -1 /* CACHED */)
            ]))], 8 /* PROPS */, _hoisted_3)
          ], 2 /* CLASS */))
        }), 128 /* KEYED_FRAGMENT */))
      ]),
      _createCommentVNode(" Login Overlay "),
      (!isAuthenticated)
        ? (_openBlock(), _createElementBlock("div", _hoisted_4, [
            _createElementVNode("div", _hoisted_5, [
              _cache[4] || (_cache[4] = _createStaticVNode("<div class=\"px-5 py-5 md:px-8 md:py-6 border-b border-white/10 space-y-3\"><h2 class=\"text-xl md:text-2xl font-bold text-white flex items-center justify-center space-x-3 text-center\"><i class=\"fas fa-lock text-blue-400\"></i><span>登录 Nginx Manager</span></h2><p class=\"text-sm text-gray-500\">请输入访问令牌以继续操作。若无令牌，请联系系统管理员。</p><p class=\"text-xs text-gray-500 leading-relaxed bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center\"><i class=\"fas fa-terminal text-blue-300 mr-2\"></i> 首次登录或需要修改令牌时，请在服务器终端执行<br><code class=\"font-mono text-emerald-300 block text-center break-anywhere mt-1\">tokenctl --set &quot;YOUR_TOKEN&quot; --file /opt/nginx-mgr/auth_token.json</code><br>会话有效期为 24 小时，到期后在此页面重新登录即可继续使用。 </p></div>", 1)),
              _createElementVNode("div", _hoisted_6, [
                _createElementVNode("div", _hoisted_7, [
                  _cache[1] || (_cache[1] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "访问令牌", -1 /* CACHED */)),
                  _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((loginToken) = $event),
                    type: "password",
                    placeholder: "Bearer Token",
                    autocomplete: "current-password",
                    class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-blue-400/60 font-mono"
                  }, null, 8 /* PROPS */, _hoisted_8), [
                    [_vModelText, loginToken]
                  ])
                ]),
                loginError
                  ? (_openBlock(), _createElementBlock("p", _hoisted_9, [
                      _cache[2] || (_cache[2] = _createElementVNode("i", { class: "fas fa-circle-exclamation mr-2" }, null, -1 /* CACHED */)),
                      _createTextVNode(_toDisplayString(loginError), 1 /* TEXT */)
                    ]))
                  : _createCommentVNode("v-if", true)
              ]),
              _createElementVNode("div", _hoisted_10, [
                _createElementVNode("button", {
                  onClick: login,
                  disabled: authenticating,
                  class: "btn-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 w-full md:w-auto"
                }, [
                  _cache[3] || (_cache[3] = _createElementVNode("i", { class: "fas fa-right-to-bracket" }, null, -1 /* CACHED */)),
                  _createElementVNode("span", null, _toDisplayString(authenticating ? '验证中...' : '登录'), 1 /* TEXT */)
                ], 8 /* PROPS */, _hoisted_11)
              ])
            ])
          ]))
        : _createCommentVNode("v-if", true),
      _createElementVNode("div", _hoisted_12, [
        _createCommentVNode(" 移动端抽屉遮罩 "),
        mobileNavOpen
          ? (_openBlock(), _createElementBlock("div", {
              key: 0,
              onClick: $event => (mobileNavOpen = false),
              class: "drawer-backdrop fixed inset-0 bg-black/60 z-40 md:hidden"
            }, null, 8 /* PROPS */, _hoisted_13))
          : _createCommentVNode("v-if", true),
        _createCommentVNode(" Sidebar（桌面固定 / 手机抽屉） "),
        _createElementVNode("aside", {
          class: _normalizeClass(['drawer glass border-r border-white/10 flex flex-col fixed inset-y-0 left-0 z-50 w-72 max-w-[84vw] md:static md:z-auto md:w-64 md:translate-x-0',
                            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'])
        }, [
          _createElementVNode("div", _hoisted_14, [
            _cache[6] || (_cache[6] = _createElementVNode("div", { class: "flex items-center space-x-3" }, [
              _createElementVNode("div", { class: "w-10 h-10 btn-primary rounded-xl flex items-center justify-center shadow-lg" }, [
                _createElementVNode("i", { class: "fas fa-bolt text-white text-xl" })
              ]),
              _createElementVNode("span", { class: "text-xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400" }, " NGX NOVA ")
            ], -1 /* CACHED */)),
            _createElementVNode("button", {
              onClick: $event => (mobileNavOpen = false),
              class: "md:hidden w-9 h-9 rounded-full glass border border-white/10 text-gray-400 flex items-center justify-center"
            }, [...(_cache[5] || (_cache[5] = [
              _createElementVNode("i", { class: "fas fa-times" }, null, -1 /* CACHED */)
            ]))], 8 /* PROPS */, _hoisted_15)
          ]),
          _createElementVNode("nav", _hoisted_16, [
            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(navItems, (item) => {
              return (_openBlock(), _createElementBlock("button", {
                key: item.id,
                onClick: $event => (selectTab(item.id)),
                class: _normalizeClass(['w-full flex items-center space-x-3 px-4 py-3 rounded-xl nav-item tap-target', currentTab === item.id ? 'active' : 'text-gray-400 hover:bg-white/5'])
              }, [
                _createElementVNode("i", {
                  class: _normalizeClass(['fas', item.icon, 'w-5 text-center'])
                }, null, 2 /* CLASS */),
                _createElementVNode("span", _hoisted_18, _toDisplayString(item.label), 1 /* TEXT */),
                (item.id === 'dashboard' && versionReport && versionReport.vulnerable)
                  ? (_openBlock(), _createElementBlock("span", _hoisted_19))
                  : _createCommentVNode("v-if", true)
              ], 10 /* CLASS, PROPS */, _hoisted_17))
            }), 128 /* KEYED_FRAGMENT */))
          ]),
          _createElementVNode("div", _hoisted_20, [
            _createElementVNode("div", _hoisted_21, [
              _createElementVNode("div", {
                class: _normalizeClass(["w-2 h-2 rounded-full", status.nginx_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'])
              }, null, 2 /* CLASS */),
              _createElementVNode("span", null, _toDisplayString(status.nginx_active ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'), 1 /* TEXT */)
            ])
          ])
        ], 2 /* CLASS */),
        _createCommentVNode(" Main Content "),
        _createElementVNode("main", _hoisted_22, [
          _createElementVNode("header", _hoisted_23, [
            _createElementVNode("div", _hoisted_24, [
              _createElementVNode("button", {
                onClick: $event => (mobileNavOpen = true),
                "aria-label": "打开菜单",
                class: "md:hidden shrink-0 w-10 h-10 mt-0.5 glass border border-white/10 rounded-xl text-gray-300 flex items-center justify-center"
              }, [...(_cache[7] || (_cache[7] = [
                _createElementVNode("i", { class: "fas fa-bars" }, null, -1 /* CACHED */)
              ]))], 8 /* PROPS */, _hoisted_25),
              _createElementVNode("div", _hoisted_26, [
                _createElementVNode("h1", _hoisted_27, _toDisplayString(tabTitle), 1 /* TEXT */),
                _cache[8] || (_cache[8] = _createElementVNode("p", { class: "text-gray-500 text-xs md:text-sm truncate" }, "实时运维与自动化管理中心", -1 /* CACHED */))
              ])
            ]),
            _createElementVNode("div", _hoisted_28, [
              _createElementVNode("div", _hoisted_29, [
                _createElementVNode("span", _hoisted_30, _toDisplayString(status.nginx_version || '未知版本'), 1 /* TEXT */),
                _cache[9] || (_cache[9] = _createElementVNode("div", { class: "hidden md:block w-px h-4 bg-white/10" }, null, -1 /* CACHED */)),
                _createElementVNode("span", {
                  class: _normalizeClass(["hidden md:inline text-xs font-bold", status.nginx_active ? 'text-green-400' : 'text-red-400'])
                }, _toDisplayString(status.nginx_active ? 'ACTIVE' : 'STOPPED'), 3 /* TEXT, CLASS */),
                _createElementVNode("span", {
                  class: _normalizeClass(["md:hidden w-2 h-2 rounded-full", status.nginx_active ? 'bg-green-500' : 'bg-red-500'])
                }, null, 2 /* CLASS */)
              ]),
              sessionExpiryText
                ? (_openBlock(), _createElementBlock("div", _hoisted_31, " 会话到期：" + _toDisplayString(sessionExpiryText), 1 /* TEXT */))
                : _createCommentVNode("v-if", true),
              _createElementVNode("button", {
                onClick: logout,
                "aria-label": "退出登录",
                class: "glass px-3 md:px-4 py-2 rounded-full flex items-center space-x-2 border border-white/10 text-xs text-gray-300 hover:text-white transition"
              }, [...(_cache[10] || (_cache[10] = [
                _createElementVNode("i", { class: "fas fa-sign-out-alt text-red-300" }, null, -1 /* CACHED */),
                _createElementVNode("span", { class: "hidden md:inline" }, "退出", -1 /* CACHED */)
              ]))], 8 /* PROPS */, _hoisted_32)
            ])
          ]),
          sessionExpiryText
            ? (_openBlock(), _createElementBlock("div", _hoisted_33, "会话到期：" + _toDisplayString(sessionExpiryText), 1 /* TEXT */))
            : _createCommentVNode("v-if", true),
          _createCommentVNode(" Dashboard "),
          (currentTab === 'dashboard')
            ? (_openBlock(), _createElementBlock("section", _hoisted_34, [
                _createElementVNode("div", _hoisted_35, [
                  _createElementVNode("div", _hoisted_36, [
                    _createElementVNode("div", _hoisted_37, [
                      _createElementVNode("div", _hoisted_38, [
                        _cache[11] || (_cache[11] = _createElementVNode("span", { class: "text-[10px] text-cyan-200 tracking-[0.35em] uppercase" }, "当前周期", -1 /* CACHED */)),
                        _createElementVNode("span", _hoisted_39, _toDisplayString(trafficSummary.totalLabel), 1 /* TEXT */),
                        (trafficSummary.hasLimit)
                          ? (_openBlock(), _createElementBlock("span", _hoisted_40, "配额 " + _toDisplayString(trafficSummary.limitLabel), 1 /* TEXT */))
                          : _createCommentVNode("v-if", true),
                        (trafficSummary.nextReset)
                          ? (_openBlock(), _createElementBlock("span", _hoisted_41, "重置 " + _toDisplayString(trafficSummary.nextReset), 1 /* TEXT */))
                          : _createCommentVNode("v-if", true)
                      ])
                    ]),
                    _cache[16] || (_cache[16] = _createElementVNode("div", { class: "text-gray-400 text-xs font-bold uppercase tracking-wider mb-4" }, "服务引擎", -1 /* CACHED */)),
                    _cache[17] || (_cache[17] = _createElementVNode("div", { class: "text-3xl font-bold text-white mb-2" }, "Nginx", -1 /* CACHED */)),
                    _createElementVNode("div", {
                      class: _normalizeClass(["text-sm flex items-center", status.nginx_active ? 'text-green-400' : 'text-red-400'])
                    }, [
                      _cache[12] || (_cache[12] = _createElementVNode("i", { class: "fas fa-circle mr-2 text-xs" }, null, -1 /* CACHED */)),
                      _createTextVNode(_toDisplayString(status.nginx_active ? '服务运行正常' : '服务已停止'), 1 /* TEXT */)
                    ], 2 /* CLASS */),
                    _createElementVNode("div", _hoisted_42, [
                      _createElementVNode("button", {
                        onClick: startInstall,
                        class: "glass border border-blue-400/40 text-blue-100 px-4 py-2 rounded-xl text-xs hover:border-blue-300 transition flex items-center space-x-2"
                      }, [...(_cache[13] || (_cache[13] = [
                        _createElementVNode("i", { class: "fas fa-download" }, null, -1 /* CACHED */),
                        _createElementVNode("span", null, "安装 Nginx", -1 /* CACHED */)
                      ]))], 8 /* PROPS */, _hoisted_43),
                      (installStatus.is_running)
                        ? (_openBlock(), _createElementBlock("button", {
                            key: 0,
                            onClick: openInstallModal,
                            class: "glass border border-emerald-400/40 text-emerald-100 px-4 py-2 rounded-xl text-xs hover:border-emerald-300 transition flex items-center space-x-2"
                          }, [...(_cache[14] || (_cache[14] = [
                            _createElementVNode("i", { class: "fas fa-spinner fa-spin" }, null, -1 /* CACHED */),
                            _createElementVNode("span", null, "安装中 · 查看进度", -1 /* CACHED */)
                          ]))], 8 /* PROPS */, _hoisted_44))
                        : _createCommentVNode("v-if", true),
                      _createElementVNode("button", {
                        onClick: confirmUninstall,
                        class: "glass border border-red-400/40 text-red-200 px-4 py-2 rounded-xl text-xs hover:border-red-300 transition flex items-center space-x-2"
                      }, [...(_cache[15] || (_cache[15] = [
                        _createElementVNode("i", { class: "fas fa-trash-alt" }, null, -1 /* CACHED */),
                        _createElementVNode("span", null, "卸载 Nginx", -1 /* CACHED */)
                      ]))], 8 /* PROPS */, _hoisted_45)
                    ]),
                    (trafficSummary.hasLimit)
                      ? (_openBlock(), _createElementBlock("div", _hoisted_46, [
                          _createElementVNode("div", _hoisted_47, [
                            _createElementVNode("div", {
                              class: "h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500",
                              style: _normalizeStyle({ width: Math.min(100, trafficSummary.progress || 0) + '%' })
                            }, null, 4 /* STYLE */)
                          ]),
                          _createElementVNode("div", _hoisted_48, [
                            _createElementVNode("span", null, "统计起始：" + _toDisplayString(trafficSummary.cycleStart || '本次启动'), 1 /* TEXT */),
                            _createElementVNode("span", null, "已用 " + _toDisplayString(trafficSummary.progress || 0) + "%", 1 /* TEXT */)
                          ])
                        ]))
                      : _createCommentVNode("v-if", true)
                  ]),
                  _createElementVNode("div", _hoisted_49, [
                    _cache[22] || (_cache[22] = _createElementVNode("div", { class: "absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity" }, [
                      _createElementVNode("i", { class: "fas fa-layer-group text-6xl" })
                    ], -1 /* CACHED */)),
                    _cache[23] || (_cache[23] = _createElementVNode("div", { class: "text-gray-400 text-xs font-bold uppercase tracking-wider mb-4" }, "站点总览", -1 /* CACHED */)),
                    _createElementVNode("div", _hoisted_50, _toDisplayString(siteStats.total) + " 个站点", 1 /* TEXT */),
                    _createElementVNode("div", _hoisted_51, [
                      _createElementVNode("div", _hoisted_52, [
                        _cache[18] || (_cache[18] = _createTextVNode("反向代理 ", -1 /* CACHED */)),
                        _createElementVNode("span", _hoisted_53, _toDisplayString(siteStats.proxy), 1 /* TEXT */)
                      ]),
                      _createElementVNode("div", _hoisted_54, [
                        _cache[19] || (_cache[19] = _createTextVNode("静态站点 ", -1 /* CACHED */)),
                        _createElementVNode("span", _hoisted_55, _toDisplayString(siteStats.static), 1 /* TEXT */)
                      ]),
                      _createElementVNode("div", _hoisted_56, [
                        _cache[20] || (_cache[20] = _createTextVNode("负载均衡 ", -1 /* CACHED */)),
                        _createElementVNode("span", _hoisted_57, _toDisplayString(siteStats.lb), 1 /* TEXT */)
                      ]),
                      _createElementVNode("div", _hoisted_58, [
                        _cache[21] || (_cache[21] = _createTextVNode("域名重定向 ", -1 /* CACHED */)),
                        _createElementVNode("span", _hoisted_59, _toDisplayString(siteStats.redirect), 1 /* TEXT */)
                      ])
                    ])
                  ]),
                  _createElementVNode("div", _hoisted_60, [
                    _cache[24] || (_cache[24] = _createElementVNode("div", { class: "absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity" }, [
                      _createElementVNode("i", { class: "fas fa-plug text-6xl" })
                    ], -1 /* CACHED */)),
                    _cache[25] || (_cache[25] = _createElementVNode("div", { class: "text-gray-400 text-xs font-bold uppercase tracking-wider mb-4" }, "端口转发", -1 /* CACHED */)),
                    _createElementVNode("div", _hoisted_61, _toDisplayString(streams.length) + " 条规则", 1 /* TEXT */),
                    _cache[26] || (_cache[26] = _createElementVNode("div", { class: "text-sm text-cyan-300 flex items-center" }, [
                      _createElementVNode("i", { class: "fas fa-signal mr-2" }),
                      _createTextVNode(" TCP/UDP 四层转发可视化管理 ")
                    ], -1 /* CACHED */))
                  ])
                ]),
                _createCommentVNode(" 版本与安全自检（紧凑两行） "),
                _createElementVNode("div", {
                  class: _normalizeClass(['glass rounded-3xl px-4 py-3 md:px-5 md:py-4 border', versionReport.vulnerable ? 'border-red-400/40' : 'border-white/10'])
                }, [
                  _createElementVNode("div", _hoisted_62, [
                    _createElementVNode("div", _hoisted_63, [
                      _createElementVNode("div", {
                        class: _normalizeClass(["w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border", versionBadge.bg])
                      }, [
                        _createElementVNode("i", {
                          class: _normalizeClass(['fas', versionBadge.icon])
                        }, null, 2 /* CLASS */)
                      ], 2 /* CLASS */),
                      _createElementVNode("div", _hoisted_64, [
                        _cache[27] || (_cache[27] = _createElementVNode("div", { class: "text-[10px] text-gray-400 uppercase tracking-widest leading-none" }, "版本与安全", -1 /* CACHED */)),
                        _createElementVNode("div", _hoisted_65, _toDisplayString(versionReport.installed || '未检测到 Nginx'), 1 /* TEXT */)
                      ])
                    ]),
                    _createElementVNode("div", _hoisted_66, [
                      _createElementVNode("span", {
                        class: _normalizeClass(["px-2.5 py-0.5 rounded-full text-[10px] font-semibold border", versionBadge.chip])
                      }, _toDisplayString(versionBadge.label), 3 /* TEXT, CLASS */),
                      _createElementVNode("button", {
                        onClick: $event => (showVersionModal = true),
                        class: "glass border border-white/10 px-2.5 py-1 rounded-lg text-[11px] text-gray-200 tap-target"
                      }, " 公告详情 ", 8 /* PROPS */, _hoisted_67),
                      _createElementVNode("button", {
                        onClick: upgradeNginx,
                        disabled: installStatus.is_running,
                        class: "btn-primary text-white px-3 py-1 rounded-lg text-[11px] font-bold disabled:opacity-50 tap-target"
                      }, [
                        _cache[28] || (_cache[28] = _createElementVNode("i", { class: "fas fa-shield-alt mr-1" }, null, -1 /* CACHED */)),
                        _createTextVNode(_toDisplayString(versionReport.vulnerable ? '一键修复升级' : '升级到最新'), 1 /* TEXT */)
                      ], 8 /* PROPS */, _hoisted_68)
                    ])
                  ]),
                  _createElementVNode("div", _hoisted_69, [
                    _createElementVNode("span", {
                      class: _normalizeClass(["break-anywhere", versionReport.vulnerable ? 'text-red-200' : 'text-gray-400'])
                    }, _toDisplayString(versionReport.summary || '正在读取本机 Nginx 版本…'), 3 /* TEXT, CLASS */),
                    (versionReport.affected && versionReport.affected.length)
                      ? (_openBlock(), _createElementBlock("span", _hoisted_70, [
                          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(versionReport.affected.slice(0, 5), (adv) => {
                            return (_openBlock(), _createElementBlock("span", {
                              key: adv.cve,
                              class: "px-1.5 py-0.5 rounded bg-red-500/10 border border-red-400/30 text-[10px] text-red-200 font-mono"
                            }, _toDisplayString(adv.cve), 1 /* TEXT */))
                          }), 128 /* KEYED_FRAGMENT */)),
                          (versionReport.affected.length > 5)
                            ? (_openBlock(), _createElementBlock("span", _hoisted_71, " +" + _toDisplayString(versionReport.affected.length - 5) + " 条 ", 1 /* TEXT */))
                            : _createCommentVNode("v-if", true)
                        ]))
                      : (_openBlock(), _createElementBlock("span", _hoisted_72, [
                          _createTextVNode(" 已比对 " + _toDisplayString(advisoryCount) + " 条公告 · 建议 ", 1 /* TEXT */),
                          _createElementVNode("span", _hoisted_73, _toDisplayString(versionReport.upgrade_to || '—'), 1 /* TEXT */)
                        ]))
                  ])
                ], 2 /* CLASS */),
                _createElementVNode("div", _hoisted_74, [
                  _createElementVNode("div", _hoisted_75, [
                    _createElementVNode("div", _hoisted_76, [
                      _createElementVNode("div", _hoisted_77, [
                        _cache[29] || (_cache[29] = _createElementVNode("h3", { class: "text-xl font-bold text-white flex items-center space-x-3" }, [
                          _createElementVNode("i", { class: "fas fa-globe text-blue-400" }),
                          _createElementVNode("span", null, "活跃站点")
                        ], -1 /* CACHED */)),
                        _createElementVNode("button", {
                          onClick: $event => (currentTab = 'sites'),
                          class: "text-xs text-blue-300 hover:text-blue-200 transition"
                        }, "前往站点管理", 8 /* PROPS */, _hoisted_78)
                      ]),
                      (siteConfigs.length)
                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                            _createElementVNode("div", _hoisted_79, [
                              _createElementVNode("table", _hoisted_80, [
                                _cache[30] || (_cache[30] = _createElementVNode("thead", { class: "bg-white/5 text-gray-400 uppercase tracking-widest text-xs" }, [
                                  _createElementVNode("tr", null, [
                                    _createElementVNode("th", { class: "px-4 py-3 text-left" }, "域名"),
                                    _createElementVNode("th", { class: "px-4 py-3 text-left" }, "类型"),
                                    _createElementVNode("th", { class: "px-4 py-3 text-left" }, "后端")
                                  ])
                                ], -1 /* CACHED */)),
                                _createElementVNode("tbody", _hoisted_81, [
                                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(siteConfigs.slice(0,6), (site) => {
                                    return (_openBlock(), _createElementBlock("tr", {
                                      key: site.domain,
                                      class: "hover:bg-white/5 transition"
                                    }, [
                                      _createElementVNode("td", _hoisted_82, _toDisplayString(site.domain), 1 /* TEXT */),
                                      _createElementVNode("td", _hoisted_83, [
                                        _createElementVNode("span", {
                                          class: _normalizeClass(["px-3 py-1 rounded-full text-xs font-semibold border", siteTypeStyle(site.type)])
                                        }, _toDisplayString(siteTypeLabel(site.type)), 3 /* TEXT, CLASS */)
                                      ]),
                                      _createElementVNode("td", _hoisted_84, [
                                        (site.type === 'proxy')
                                          ? (_openBlock(), _createElementBlock("span", _hoisted_85, _toDisplayString(site.backend_ip) + ":" + _toDisplayString(site.backend_port), 1 /* TEXT */))
                                          : (site.type === 'lb')
                                            ? (_openBlock(), _createElementBlock("span", _hoisted_86, _toDisplayString(site.backends.length) + " 个节点", 1 /* TEXT */))
                                            : (site.type === 'redirect')
                                              ? (_openBlock(), _createElementBlock("span", _hoisted_87, _toDisplayString(site.target_url), 1 /* TEXT */))
                                              : (_openBlock(), _createElementBlock("span", _hoisted_88, "静态资源"))
                                      ])
                                    ]))
                                  }), 128 /* KEYED_FRAGMENT */))
                                ])
                              ])
                            ]),
                            _createCommentVNode(" 手机端：表格转卡片 "),
                            _createElementVNode("div", _hoisted_89, [
                              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(siteConfigs.slice(0,6), (site) => {
                                return (_openBlock(), _createElementBlock("div", {
                                  key: site.domain,
                                  class: "glass border border-white/5 rounded-2xl px-4 py-3"
                                }, [
                                  _createElementVNode("div", _hoisted_90, [
                                    _createElementVNode("div", _hoisted_91, [
                                      _createElementVNode("div", _hoisted_92, _toDisplayString(site.domain), 1 /* TEXT */),
                                      _createElementVNode("div", _hoisted_93, [
                                        (site.type === 'proxy')
                                          ? (_openBlock(), _createElementBlock("span", _hoisted_94, _toDisplayString(site.backend_ip) + ":" + _toDisplayString(site.backend_port), 1 /* TEXT */))
                                          : (site.type === 'lb')
                                            ? (_openBlock(), _createElementBlock("span", _hoisted_95, _toDisplayString(site.backends.length) + " 个节点", 1 /* TEXT */))
                                            : (site.type === 'redirect')
                                              ? (_openBlock(), _createElementBlock("span", _hoisted_96, _toDisplayString(site.target_url), 1 /* TEXT */))
                                              : (_openBlock(), _createElementBlock("span", _hoisted_97, "静态资源"))
                                      ])
                                    ]),
                                    _createElementVNode("span", {
                                      class: _normalizeClass(["shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold border", siteTypeStyle(site.type)])
                                    }, _toDisplayString(siteTypeLabel(site.type)), 3 /* TEXT, CLASS */)
                                  ])
                                ]))
                              }), 128 /* KEYED_FRAGMENT */))
                            ])
                          ], 64 /* STABLE_FRAGMENT */))
                        : (_openBlock(), _createElementBlock("div", _hoisted_98, " 没有发现站点配置，点击右上角“站点管理”开始部署。 "))
                    ]),
                    _createElementVNode("div", _hoisted_99, [
                      _cache[32] || (_cache[32] = _createElementVNode("div", { class: "space-y-3" }, [
                        _createElementVNode("h3", { class: "text-xl font-bold text-white flex items-center space-x-3" }, [
                          _createElementVNode("i", { class: "fas fa-clipboard-list text-indigo-300" }),
                          _createElementVNode("span", null, "日志中心")
                        ]),
                        _createElementVNode("p", { class: "text-sm text-gray-400 leading-relaxed" }, " 实时查看各站点的 Access / Error 日志。点击下方按钮进入独立的“日志中心”板块，支持手动刷新与快速预览。 ")
                      ], -1 /* CACHED */)),
                      _createElementVNode("button", {
                        onClick: $event => (currentTab = 'logs'),
                        class: "mt-6 glass border border-indigo-400/40 text-indigo-200 px-4 py-3 rounded-xl text-xs hover:border-indigo-300 transition flex items-center justify-center space-x-2"
                      }, [...(_cache[31] || (_cache[31] = [
                        _createElementVNode("i", { class: "fas fa-arrow-right" }, null, -1 /* CACHED */),
                        _createElementVNode("span", null, "打开日志中心", -1 /* CACHED */)
                      ]))], 8 /* PROPS */, _hoisted_100)
                    ])
                  ]),
                  _createElementVNode("div", _hoisted_101, [
                    _cache[38] || (_cache[38] = _createElementVNode("h3", { class: "text-xl font-bold text-white flex items-center space-x-3 mb-4" }, [
                      _createElementVNode("i", { class: "fas fa-toolbox text-emerald-400" }),
                      _createElementVNode("span", null, "运维操作")
                    ], -1 /* CACHED */)),
                    _createElementVNode("div", _hoisted_102, [
                      _createElementVNode("button", {
                        onClick: reloadNginx,
                        class: "w-full glass border border-white/5 px-4 py-3 rounded-2xl flex items-center justify-between hover:bg-blue-500/20 transition"
                      }, [...(_cache[33] || (_cache[33] = [
                        _createElementVNode("span", { class: "text-sm font-medium text-gray-200 flex items-center space-x-2" }, [
                          _createElementVNode("i", { class: "fas fa-sync-alt text-blue-300" }),
                          _createElementVNode("span", null, "验证并重载配置")
                        ], -1 /* CACHED */),
                        _createElementVNode("i", { class: "fas fa-chevron-right text-gray-500 text-xs" }, null, -1 /* CACHED */)
                      ]))], 8 /* PROPS */, _hoisted_103),
                      _createElementVNode("div", _hoisted_104, [
                        _createElementVNode("button", {
                          onClick: backupConfig,
                          class: "w-full glass border border-white/5 px-4 py-3 rounded-2xl flex items-center justify-between hover:bg-emerald-500/20 transition"
                        }, [...(_cache[34] || (_cache[34] = [
                          _createElementVNode("span", { class: "text-sm font-medium text-gray-200 flex items-center space-x-2" }, [
                            _createElementVNode("i", { class: "fas fa-cloud-download-alt text-emerald-300" }),
                            _createElementVNode("span", null, "生成配置备份")
                          ], -1 /* CACHED */),
                          _createElementVNode("i", { class: "fas fa-chevron-right text-gray-500 text-xs" }, null, -1 /* CACHED */)
                        ]))], 8 /* PROPS */, _hoisted_105),
                        _cache[35] || (_cache[35] = _createElementVNode("p", { class: "text-[11px] text-gray-500 bg-white/5 border border-white/10 rounded-xl px-3 py-2" }, [
                          _createTextVNode(" 备份文件存储于 "),
                          _createElementVNode("code", { class: "font-mono text-emerald-300" }, "/root/nginx_backups"),
                          _createTextVNode("，可随时下载或恢复。 ")
                        ], -1 /* CACHED */))
                      ]),
                      _createElementVNode("button", {
                        onClick: restoreLocalBackup,
                        class: "w-full glass border border-orange-400/40 px-4 py-3 rounded-2xl flex items-center justify-between hover:bg-orange-500/20 transition"
                      }, [...(_cache[36] || (_cache[36] = [
                        _createElementVNode("span", { class: "text-sm font-medium text-orange-200 flex items-center space-x-2" }, [
                          _createElementVNode("i", { class: "fas fa-undo-alt" }),
                          _createElementVNode("span", null, "从本地备份恢复")
                        ], -1 /* CACHED */),
                        _createElementVNode("i", { class: "fas fa-chevron-right text-orange-200/70 text-xs" }, null, -1 /* CACHED */)
                      ]))], 8 /* PROPS */, _hoisted_106),
                      _createElementVNode("button", {
                        onClick: openInstallModal,
                        class: "w-full glass border border-white/5 px-4 py-3 rounded-2xl flex items-center justify-between hover:bg-cyan-500/20 transition"
                      }, [...(_cache[37] || (_cache[37] = [
                        _createElementVNode("span", { class: "text-sm font-medium text-gray-200 flex items-center space-x-2" }, [
                          _createElementVNode("i", { class: "fas fa-list text-cyan-300" }),
                          _createElementVNode("span", null, "查看安装日志")
                        ], -1 /* CACHED */),
                        _createElementVNode("i", { class: "fas fa-chevron-right text-gray-500 text-xs" }, null, -1 /* CACHED */)
                      ]))], 8 /* PROPS */, _hoisted_107)
                    ])
                  ])
                ])
              ]))
            : _createCommentVNode("v-if", true),
          _createCommentVNode(" Site Management "),
          (currentTab === 'sites')
            ? (_openBlock(), _createElementBlock("section", _hoisted_108, [
                _createElementVNode("div", _hoisted_109, [
                  _cache[40] || (_cache[40] = _createElementVNode("p", { class: "text-gray-500 text-sm max-w-xl leading-relaxed" }, " 管理所有站点的反向代理、静态资源、负载均衡与重定向配置，支持一键新增与同步重载。 ", -1 /* CACHED */)),
                  _createElementVNode("button", {
                    onClick: openCreateSiteModal,
                    class: "btn-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center shadow-xl"
                  }, [...(_cache[39] || (_cache[39] = [
                    _createElementVNode("i", { class: "fas fa-plus-circle mr-2" }, null, -1 /* CACHED */),
                    _createTextVNode("新增站点 ", -1 /* CACHED */)
                  ]))], 8 /* PROPS */, _hoisted_110)
                ]),
                _createElementVNode("div", _hoisted_111, [
                  _createElementVNode("div", _hoisted_112, [
                    _createElementVNode("div", _hoisted_113, [
                      _cache[41] || (_cache[41] = _createElementVNode("h3", { class: "text-lg font-semibold text-white" }, "站点列表", -1 /* CACHED */)),
                      _createElementVNode("span", _hoisted_114, "总计 " + _toDisplayString(siteConfigs.length), 1 /* TEXT */)
                    ]),
                    _createElementVNode("div", _hoisted_115, [
                      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(siteConfigs, (site) => {
                        return (_openBlock(), _createElementBlock("button", {
                          key: site.domain,
                          onClick: $event => (selectSite(site.domain)),
                          class: _normalizeClass(['w-full glass border px-4 py-3 rounded-2xl text-left transition-all', selectedSite === site.domain ? 'border-blue-400/60 bg-blue-500/10 shadow-lg' : 'border-white/5 hover:bg-white/5'])
                        }, [
                          _createElementVNode("div", _hoisted_117, [
                            _createElementVNode("div", null, [
                              _createElementVNode("div", _hoisted_118, _toDisplayString(site.domain), 1 /* TEXT */),
                              _createElementVNode("div", _hoisted_119, [
                                (site.type === 'proxy')
                                  ? (_openBlock(), _createElementBlock("span", _hoisted_120, _toDisplayString(site.backend_ip) + ":" + _toDisplayString(site.backend_port), 1 /* TEXT */))
                                  : (site.type === 'lb')
                                    ? (_openBlock(), _createElementBlock("span", _hoisted_121, _toDisplayString(site.backends.length) + " backend(s)", 1 /* TEXT */))
                                    : (site.type === 'redirect')
                                      ? (_openBlock(), _createElementBlock("span", _hoisted_122, _toDisplayString(site.target_url), 1 /* TEXT */))
                                      : (_openBlock(), _createElementBlock("span", _hoisted_123, "静态资源"))
                              ])
                            ]),
                            _createElementVNode("span", {
                              class: _normalizeClass(["px-3 py-1 rounded-full text-[11px] font-semibold border", siteTypeStyle(site.type)])
                            }, _toDisplayString(siteTypeLabel(site.type)), 3 /* TEXT, CLASS */)
                          ])
                        ], 10 /* CLASS, PROPS */, _hoisted_116))
                      }), 128 /* KEYED_FRAGMENT */))
                    ]),
                    (!siteConfigs.length)
                      ? (_openBlock(), _createElementBlock("div", _hoisted_124, " 暂无站点，可点击右上角“新增站点”快速部署。 "))
                      : _createCommentVNode("v-if", true)
                  ]),
                  _createElementVNode("div", _hoisted_125, [
                    selectedSiteDetail
                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                          _createElementVNode("div", _hoisted_126, [
                            _createElementVNode("div", null, [
                              _cache[42] || (_cache[42] = _createElementVNode("div", { class: "text-gray-500 text-xs uppercase tracking-[0.5em] mb-2" }, "当前站点", -1 /* CACHED */)),
                              _createElementVNode("div", _hoisted_127, [
                                _createElementVNode("h3", _hoisted_128, _toDisplayString(selectedSiteDetail.domain), 1 /* TEXT */),
                                _createElementVNode("span", {
                                  class: _normalizeClass(["px-3 py-1 rounded-full text-xs font-semibold border", siteTypeStyle(selectedSiteDetail.type)])
                                }, _toDisplayString(siteTypeLabel(selectedSiteDetail.type)), 3 /* TEXT, CLASS */)
                              ])
                            ]),
                            _createElementVNode("div", _hoisted_129, [
                              _createElementVNode("button", {
                                onClick: $event => (openEditSiteModal(selectedSiteDetail)),
                                class: "glass border border-white/10 px-4 py-2 rounded-xl text-xs text-gray-200 hover:text-white transition flex items-center space-x-2"
                              }, [...(_cache[43] || (_cache[43] = [
                                _createElementVNode("i", { class: "fas fa-edit text-blue-300" }, null, -1 /* CACHED */),
                                _createElementVNode("span", null, "编辑", -1 /* CACHED */)
                              ]))], 8 /* PROPS */, _hoisted_130),
                              _createElementVNode("button", {
                                onClick: openRawModal,
                                class: "glass border border-white/10 px-4 py-2 rounded-xl text-xs text-gray-200 hover:text-white transition flex items-center space-x-2"
                              }, [...(_cache[44] || (_cache[44] = [
                                _createElementVNode("i", { class: "fas fa-code text-emerald-300" }, null, -1 /* CACHED */),
                                _createElementVNode("span", null, "手动编辑配置", -1 /* CACHED */)
                              ]))], 8 /* PROPS */, _hoisted_131),
                              _createElementVNode("button", {
                                onClick: $event => (deleteSite(selectedSiteDetail.domain)),
                                class: "glass border border-white/10 px-4 py-2 rounded-xl text-xs text-red-300 hover:text-red-200 transition flex items-center space-x-2"
                              }, [...(_cache[45] || (_cache[45] = [
                                _createElementVNode("i", { class: "fas fa-trash" }, null, -1 /* CACHED */),
                                _createElementVNode("span", null, "删除", -1 /* CACHED */)
                              ]))], 8 /* PROPS */, _hoisted_132)
                            ])
                          ]),
                          _createElementVNode("div", _hoisted_133, [
                            _createElementVNode("div", _hoisted_134, [
                              _cache[46] || (_cache[46] = _createElementVNode("div", { class: "text-xs text-gray-500 uppercase tracking-widest mb-2" }, "站点类型", -1 /* CACHED */)),
                              _createElementVNode("div", _hoisted_135, _toDisplayString(siteTypeLabel(selectedSiteDetail.type)), 1 /* TEXT */),
                              _createElementVNode("p", _hoisted_136, _toDisplayString(siteTypeDescription(selectedSiteDetail.type)), 1 /* TEXT */)
                            ]),
                            _createElementVNode("div", _hoisted_137, [
                              _cache[47] || (_cache[47] = _createElementVNode("div", { class: "text-xs text-gray-500 uppercase tracking-widest mb-2" }, "部署目录", -1 /* CACHED */)),
                              _createElementVNode("div", _hoisted_138, "/etc/nginx/sites-available/" + _toDisplayString(selectedSiteDetail.domain), 1 /* TEXT */),
                              _createElementVNode("p", _hoisted_139, "启用链接：/etc/nginx/sites-enabled/" + _toDisplayString(selectedSiteDetail.domain), 1 /* TEXT */)
                            ])
                          ]),
                          _createElementVNode("div", _hoisted_140, [
                            (selectedSiteDetail.type === 'proxy')
                              ? (_openBlock(), _createElementBlock("div", _hoisted_141, [
                                  _cache[48] || (_cache[48] = _createElementVNode("div", { class: "text-xs text-gray-500 uppercase tracking-widest mb-2" }, "后端目标", -1 /* CACHED */)),
                                  _createElementVNode("div", _hoisted_142, _toDisplayString(selectedSiteDetail.backend_ip) + ":" + _toDisplayString(selectedSiteDetail.backend_port), 1 /* TEXT */)
                                ]))
                              : _createCommentVNode("v-if", true),
                            (selectedSiteDetail.type === 'lb')
                              ? (_openBlock(), _createElementBlock("div", _hoisted_143, [
                                  _cache[49] || (_cache[49] = _createElementVNode("div", { class: "text-xs text-gray-500 uppercase tracking-widest mb-3" }, "负载均衡节点", -1 /* CACHED */)),
                                  _createElementVNode("ul", _hoisted_144, [
                                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(selectedSiteDetail.backends, (backend) => {
                                      return (_openBlock(), _createElementBlock("li", {
                                        key: backend,
                                        class: "glass border border-white/5 rounded-xl px-3 py-2 font-mono text-gray-200"
                                      }, _toDisplayString(backend), 1 /* TEXT */))
                                    }), 128 /* KEYED_FRAGMENT */)),
                                    (!selectedSiteDetail.backends.length)
                                      ? (_openBlock(), _createElementBlock("li", _hoisted_145, "暂无后端节点"))
                                      : _createCommentVNode("v-if", true)
                                  ])
                                ]))
                              : _createCommentVNode("v-if", true),
                            (selectedSiteDetail.type === 'redirect')
                              ? (_openBlock(), _createElementBlock("div", _hoisted_146, [
                                  _cache[50] || (_cache[50] = _createElementVNode("div", { class: "text-xs text-gray-500 uppercase tracking-widest mb-2" }, "跳转目标", -1 /* CACHED */)),
                                  _createElementVNode("div", _hoisted_147, _toDisplayString(selectedSiteDetail.target_url), 1 /* TEXT */)
                                ]))
                              : _createCommentVNode("v-if", true),
                            (selectedSiteDetail.type === 'static')
                              ? (_openBlock(), _createElementBlock("div", _hoisted_148, [
                                  _cache[51] || (_cache[51] = _createElementVNode("div", { class: "text-xs text-gray-500 uppercase tracking-widest mb-2" }, "静态资源目录", -1 /* CACHED */)),
                                  _createElementVNode("div", _hoisted_149, "/var/www/html/" + _toDisplayString(selectedSiteDetail.domain), 1 /* TEXT */),
                                  _cache[52] || (_cache[52] = _createElementVNode("p", { class: "text-xs text-gray-500 mt-1" }, "请通过 SFTP/SSH 上传静态文件至该目录。", -1 /* CACHED */))
                                ]))
                              : _createCommentVNode("v-if", true)
                          ])
                        ], 64 /* STABLE_FRAGMENT */))
                      : (_openBlock(), _createElementBlock("div", _hoisted_150, " 请选择左侧的站点查看详情。 "))
                  ])
                ])
              ]))
            : _createCommentVNode("v-if", true),
          _createCommentVNode(" Stream Management "),
          (currentTab === 'streams')
            ? (_openBlock(), _createElementBlock("section", _hoisted_151, [
                _createElementVNode("div", _hoisted_152, [
                  _cache[54] || (_cache[54] = _createElementVNode("p", { class: "text-gray-500 text-sm max-w-xl leading-relaxed" }, " 管理四层 TCP/UDP 转发规则，快速维护上游目标并实时回滚。 ", -1 /* CACHED */)),
                  _createElementVNode("button", {
                    onClick: openCreateStreamModal,
                    class: "btn-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center shadow-xl"
                  }, [...(_cache[53] || (_cache[53] = [
                    _createElementVNode("i", { class: "fas fa-plus mr-2" }, null, -1 /* CACHED */),
                    _createTextVNode("新增转发 ", -1 /* CACHED */)
                  ]))], 8 /* PROPS */, _hoisted_153)
                ]),
                _createElementVNode("div", _hoisted_154, [
                  (streams.length)
                    ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                        _createElementVNode("div", _hoisted_155, [
                          _createElementVNode("table", _hoisted_156, [
                            _cache[55] || (_cache[55] = _createElementVNode("thead", { class: "bg-white/5 text-gray-400 uppercase tracking-widest text-xs" }, [
                              _createElementVNode("tr", null, [
                                _createElementVNode("th", { class: "px-4 py-3 text-left" }, "名称"),
                                _createElementVNode("th", { class: "px-4 py-3 text-left" }, "监听端口"),
                                _createElementVNode("th", { class: "px-4 py-3 text-left" }, "目标地址"),
                                _createElementVNode("th", { class: "px-4 py-3 text-right" }, "操作")
                              ])
                            ], -1 /* CACHED */)),
                            _createElementVNode("tbody", _hoisted_157, [
                              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(streams, (stream) => {
                                return (_openBlock(), _createElementBlock("tr", {
                                  key: stream.name,
                                  class: "hover:bg-white/5 transition"
                                }, [
                                  _createElementVNode("td", _hoisted_158, _toDisplayString(stream.name), 1 /* TEXT */),
                                  _createElementVNode("td", _hoisted_159, _toDisplayString(stream.listen_port), 1 /* TEXT */),
                                  _createElementVNode("td", _hoisted_160, _toDisplayString(stream.target), 1 /* TEXT */),
                                  _createElementVNode("td", _hoisted_161, [
                                    _createElementVNode("button", {
                                      onClick: $event => (openEditStreamModal(stream)),
                                      class: "text-blue-300 hover:text-blue-200 text-xs transition"
                                    }, "编辑", 8 /* PROPS */, _hoisted_162),
                                    _createElementVNode("button", {
                                      onClick: $event => (openStreamRawModal(stream)),
                                      class: "text-emerald-300 hover:text-emerald-200 text-xs transition"
                                    }, "手动编辑", 8 /* PROPS */, _hoisted_163),
                                    _createElementVNode("button", {
                                      onClick: $event => (deleteStream(stream.name)),
                                      class: "text-red-300 hover:text-red-200 text-xs transition"
                                    }, "删除", 8 /* PROPS */, _hoisted_164)
                                  ])
                                ]))
                              }), 128 /* KEYED_FRAGMENT */))
                            ])
                          ])
                        ]),
                        _createCommentVNode(" 手机端：表格转卡片 "),
                        _createElementVNode("div", _hoisted_165, [
                          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(streams, (stream) => {
                            return (_openBlock(), _createElementBlock("div", {
                              key: stream.name,
                              class: "glass border border-white/5 rounded-2xl p-4 space-y-3"
                            }, [
                              _createElementVNode("div", _hoisted_166, [
                                _createElementVNode("div", _hoisted_167, [
                                  _createElementVNode("div", _hoisted_168, _toDisplayString(stream.name), 1 /* TEXT */),
                                  _createElementVNode("div", _hoisted_169, _toDisplayString(stream.listen_port) + " → " + _toDisplayString(stream.target), 1 /* TEXT */)
                                ]),
                                _createElementVNode("span", _hoisted_170, _toDisplayString(stream.listen_port), 1 /* TEXT */)
                              ]),
                              _createElementVNode("div", _hoisted_171, [
                                _createElementVNode("button", {
                                  onClick: $event => (openEditStreamModal(stream)),
                                  class: "tap-target glass border border-white/10 rounded-xl text-xs text-blue-200"
                                }, "编辑", 8 /* PROPS */, _hoisted_172),
                                _createElementVNode("button", {
                                  onClick: $event => (openStreamRawModal(stream)),
                                  class: "tap-target glass border border-white/10 rounded-xl text-xs text-emerald-200"
                                }, "配置", 8 /* PROPS */, _hoisted_173),
                                _createElementVNode("button", {
                                  onClick: $event => (deleteStream(stream.name)),
                                  class: "tap-target glass border border-white/10 rounded-xl text-xs text-red-200"
                                }, "删除", 8 /* PROPS */, _hoisted_174)
                              ])
                            ]))
                          }), 128 /* KEYED_FRAGMENT */))
                        ])
                      ], 64 /* STABLE_FRAGMENT */))
                    : (_openBlock(), _createElementBlock("div", _hoisted_175, " 暂无端口转发规则，点击右上角“新增转发”添加第一条规则。 "))
                ])
              ]))
            : _createCommentVNode("v-if", true),
          _createCommentVNode(" Log Management "),
          (currentTab === 'logs')
            ? (_openBlock(), _createElementBlock("section", _hoisted_176, [
                _createElementVNode("div", _hoisted_177, [
                  _createElementVNode("div", null, [
                    _createElementVNode("p", _hoisted_178, " 手动加载并查看各站点的访问与错误日志，支持逐站点预览与独立查看。日志默认仅显示今日（" + _toDisplayString(todayText) + "）的内容。 ", 1 /* TEXT */)
                  ]),
                  _createElementVNode("div", _hoisted_179, [
                    _createElementVNode("button", {
                      onClick: $event => (refreshSiteLogs(true)),
                      disabled: siteLogsLoading,
                      class: "glass border border-indigo-400/40 text-indigo-200 px-4 py-2 rounded-xl text-xs hover:border-indigo-300 transition flex items-center space-x-2 disabled:opacity-50"
                    }, [
                      _createElementVNode("i", {
                        class: _normalizeClass(siteLogsLoading ? 'fas fa-spinner fa-spin' : 'fas fa-rotate-right')
                      }, null, 2 /* CLASS */),
                      _createElementVNode("span", null, _toDisplayString(siteLogsLoading ? '刷新中...' : '刷新全部'), 1 /* TEXT */)
                    ], 8 /* PROPS */, _hoisted_180)
                  ])
                ]),
                _createElementVNode("div", _hoisted_181, [
                  siteLogsLoading
                    ? (_openBlock(), _createElementBlock("div", _hoisted_182, [...(_cache[56] || (_cache[56] = [
                        _createElementVNode("i", { class: "fas fa-circle-notch fa-spin mr-2" }, null, -1 /* CACHED */),
                        _createTextVNode("正在加载日志... ", -1 /* CACHED */)
                      ]))]))
                    : (!siteConfigs.length)
                      ? (_openBlock(), _createElementBlock("div", _hoisted_183, " 暂无站点配置，先在“站点管理”中新增站点。 "))
                      : (_openBlock(), _createElementBlock("div", _hoisted_184, [
                          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(siteConfigs, (site) => {
                            return (_openBlock(), _createElementBlock("div", {
                              key: site.domain,
                              class: "glass border border-white/5 rounded-2xl p-5"
                            }, [
                              _createElementVNode("div", _hoisted_185, [
                                _createElementVNode("div", _hoisted_186, [
                                  _createElementVNode("div", _hoisted_187, [
                                    _createElementVNode("div", _hoisted_188, _toDisplayString(site.domain), 1 /* TEXT */),
                                    _createElementVNode("span", {
                                      class: _normalizeClass(["px-2 py-0.5 rounded-full text-[11px] font-semibold border", siteTypeStyle(site.type)])
                                    }, _toDisplayString(siteTypeLabel(site.type)), 3 /* TEXT, CLASS */)
                                  ]),
                                  _createElementVNode("div", _hoisted_189, [
                                    (siteLogsMap[site.domain])
                                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                                          (siteLogsMap[site.domain].access.length || siteLogsMap[site.domain].error.length)
                                            ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                                                (siteLogsMap[site.domain].access.length)
                                                  ? (_openBlock(), _createElementBlock("span", _hoisted_190, "访问 " + _toDisplayString(siteLogsMap[site.domain].access.length) + " 行", 1 /* TEXT */))
                                                  : _createCommentVNode("v-if", true),
                                                (siteLogsMap[site.domain].access.length && siteLogsMap[site.domain].error.length)
                                                  ? (_openBlock(), _createElementBlock("span", _hoisted_191, "·"))
                                                  : _createCommentVNode("v-if", true),
                                                (siteLogsMap[site.domain].error.length)
                                                  ? (_openBlock(), _createElementBlock("span", _hoisted_192, "错误 " + _toDisplayString(siteLogsMap[site.domain].error.length) + " 行", 1 /* TEXT */))
                                                  : _createCommentVNode("v-if", true)
                                              ], 64 /* STABLE_FRAGMENT */))
                                            : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                                                _createTextVNode(" 已加载，暂无日志记录 ")
                                              ], 64 /* STABLE_FRAGMENT */))
                                        ], 64 /* STABLE_FRAGMENT */))
                                      : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                                          _createTextVNode(" 暂未加载日志，点击右侧“刷新”获取最新数据 ")
                                        ], 64 /* STABLE_FRAGMENT */))
                                  ])
                                ]),
                                _createElementVNode("div", _hoisted_193, [
                                  _createElementVNode("button", {
                                    onClick: $event => (openLogViewer(site.domain)),
                                    class: "glass border border-white/10 text-xs px-3 py-2 rounded-xl hover:border-blue-300 transition flex items-center space-x-1 text-blue-200"
                                  }, [...(_cache[57] || (_cache[57] = [
                                    _createElementVNode("i", { class: "fas fa-eye" }, null, -1 /* CACHED */),
                                    _createElementVNode("span", null, "查看日志", -1 /* CACHED */)
                                  ]))], 8 /* PROPS */, _hoisted_194),
                                  _createElementVNode("button", {
                                    onClick: $event => (refreshSingleLog(site.domain)),
                                    disabled: siteLogsLoading,
                                    class: "glass border border-white/10 text-xs px-3 py-2 rounded-xl hover:border-emerald-300 transition flex items-center space-x-1 text-emerald-200 disabled:opacity-50"
                                  }, [
                                    _createElementVNode("i", {
                                      class: _normalizeClass(siteLogsLoading ? 'fas fa-spinner fa-spin' : 'fas fa-rotate-right')
                                    }, null, 2 /* CLASS */),
                                    _cache[58] || (_cache[58] = _createElementVNode("span", null, "刷新", -1 /* CACHED */))
                                  ], 8 /* PROPS */, _hoisted_195)
                                ])
                              ]),
                              (logPreview(siteLogsMap[site.domain], 'access'))
                                ? (_openBlock(), _createElementBlock("div", _hoisted_196, [
                                    _cache[59] || (_cache[59] = _createElementVNode("div", { class: "text-[11px] text-emerald-300 uppercase tracking-widest mb-1 flex items-center" }, [
                                      _createElementVNode("i", { class: "fas fa-file-alt mr-2" }),
                                      _createTextVNode("Access 预览 ")
                                    ], -1 /* CACHED */)),
                                    _createElementVNode("pre", _hoisted_197, _toDisplayString(logPreview(siteLogsMap[site.domain], 'access')), 1 /* TEXT */)
                                  ]))
                                : _createCommentVNode("v-if", true),
                              (logPreview(siteLogsMap[site.domain], 'error'))
                                ? (_openBlock(), _createElementBlock("div", _hoisted_198, [
                                    _cache[60] || (_cache[60] = _createElementVNode("div", { class: "text-[11px] text-red-300 uppercase tracking-widest mb-1 flex items-center" }, [
                                      _createElementVNode("i", { class: "fas fa-triangle-exclamation mr-2" }),
                                      _createTextVNode("Error 预览 ")
                                    ], -1 /* CACHED */)),
                                    _createElementVNode("pre", _hoisted_199, _toDisplayString(logPreview(siteLogsMap[site.domain], 'error')), 1 /* TEXT */)
                                  ]))
                                : _createCommentVNode("v-if", true),
                              (!logPreview(siteLogsMap[site.domain], 'access') && !logPreview(siteLogsMap[site.domain], 'error'))
                                ? (_openBlock(), _createElementBlock("div", _hoisted_200, " 暂无可预览日志片段，刷新后即可查看最新内容。 "))
                                : _createCommentVNode("v-if", true)
                            ]))
                          }), 128 /* KEYED_FRAGMENT */))
                        ]))
                ])
              ]))
            : _createCommentVNode("v-if", true),
          _createCommentVNode(" Notification Settings "),
          (currentTab === 'notifications')
            ? (_openBlock(), _createElementBlock("section", _hoisted_201, [
                _createElementVNode("div", _hoisted_202, [
                  _createElementVNode("div", _hoisted_203, [
                    _cache[62] || (_cache[62] = _createElementVNode("div", null, [
                      _createElementVNode("h2", { class: "text-xl font-semibold text-white flex items-center space-x-3" }, [
                        _createElementVNode("i", { class: "fas fa-bell text-amber-300" }),
                        _createElementVNode("span", null, "通知策略")
                      ]),
                      _createElementVNode("p", { class: "text-sm text-gray-500 mt-2 leading-relaxed" }, " 配置钉钉与 Telegram 告警渠道。当出入站流量达到设定阈值或服务器即将到期时，将按照偏好发送提醒。 ")
                    ], -1 /* CACHED */)),
                    _createElementVNode("div", _hoisted_204, [
                      _cache[61] || (_cache[61] = _createTextVNode(" 上次保存：", -1 /* CACHED */)),
                      _createElementVNode("span", _hoisted_205, _toDisplayString(notificationLastUpdated), 1 /* TEXT */)
                    ])
                  ])
                ]),
                notificationLoading
                  ? (_openBlock(), _createElementBlock("div", _hoisted_206, [...(_cache[63] || (_cache[63] = [
                      _createElementVNode("i", { class: "fas fa-circle-notch fa-spin" }, null, -1 /* CACHED */),
                      _createElementVNode("span", null, "正在加载通知设置...", -1 /* CACHED */)
                    ]))]))
                  : (_openBlock(), _createElementBlock("form", {
                      key: 1,
                      onSubmit: _withModifiers(saveNotificationSettings, ["prevent"]),
                      class: "space-y-5"
                    }, [
                      _createElementVNode("div", _hoisted_208, [
                        _createElementVNode("div", _hoisted_209, [
                          _cache[68] || (_cache[68] = _createElementVNode("div", { class: "flex items-center justify-between" }, [
                            _createElementVNode("h3", { class: "text-base font-semibold text-white" }, "基础信息"),
                            _createElementVNode("span", { class: "text-[11px] text-gray-500" }, "通知标题显示备注名")
                          ], -1 /* CACHED */)),
                          _createElementVNode("div", _hoisted_210, [
                            _createElementVNode("div", _hoisted_211, [
                              _cache[64] || (_cache[64] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "服务器备注", -1 /* CACHED */)),
                              _withDirectives(_createElementVNode("input", {
                                "onUpdate:modelValue": $event => ((notificationSettings.server_label) = $event),
                                type: "text",
                                maxlength: "64",
                                placeholder: "如：深圳-生产节点 A",
                                class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none"
                              }, null, 8 /* PROPS */, _hoisted_212), [
                                [_vModelText, notificationSettings.server_label]
                              ])
                            ]),
                            _createElementVNode("div", _hoisted_213, [
                              _cache[65] || (_cache[65] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "月流量上限（GB）", -1 /* CACHED */)),
                              _withDirectives(_createElementVNode("input", {
                                "onUpdate:modelValue": $event => ((notificationSettings.traffic_monthly_limit_gb) = $event),
                                type: "number",
                                min: "0",
                                step: "0.1",
                                placeholder: "0 表示不限",
                                class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none"
                              }, null, 8 /* PROPS */, _hoisted_214), [
                                [
                                  _vModelText,
                                  notificationSettings.traffic_monthly_limit_gb,
                                  void 0,
                                  { number: true }
                                ]
                              ])
                            ])
                          ]),
                          _createElementVNode("div", _hoisted_215, [
                            _createElementVNode("div", _hoisted_216, [
                              _cache[66] || (_cache[66] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "流量告警阈值 (%)", -1 /* CACHED */)),
                              _withDirectives(_createElementVNode("input", {
                                "onUpdate:modelValue": $event => ((notificationSettings.traffic_threshold) = $event),
                                type: "number",
                                min: "0",
                                max: "100",
                                class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-sm outline-none"
                              }, null, 8 /* PROPS */, _hoisted_217), [
                                [
                                  _vModelText,
                                  notificationSettings.traffic_threshold,
                                  void 0,
                                  { number: true }
                                ]
                              ])
                            ]),
                            _cache[67] || (_cache[67] = _createElementVNode("div", { class: "space-y-2" }, [
                              _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "说明"),
                              _createElementVNode("div", { class: "bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-[11px] text-gray-400 leading-relaxed" }, " 阈值设为 0 时关闭流量告警；配额用于计算圆环进度。 ")
                            ], -1 /* CACHED */))
                          ])
                        ]),
                        _createElementVNode("div", _hoisted_218, [
                          _cache[72] || (_cache[72] = _createElementVNode("div", { class: "flex items-center justify-between" }, [
                            _createElementVNode("h3", { class: "text-base font-semibold text-white" }, "服务器到期提醒"),
                            _createElementVNode("span", { class: "text-[11px] text-gray-500" }, "到期日也是流量重置日")
                          ], -1 /* CACHED */)),
                          _createElementVNode("div", _hoisted_219, [
                            _createElementVNode("div", _hoisted_220, [
                              _cache[69] || (_cache[69] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "到期日期", -1 /* CACHED */)),
                              _withDirectives(_createElementVNode("input", {
                                "onUpdate:modelValue": $event => ((notificationSettings.server_expiry_date) = $event),
                                type: "date",
                                class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none"
                              }, null, 8 /* PROPS */, _hoisted_221), [
                                [_vModelText, notificationSettings.server_expiry_date]
                              ])
                            ]),
                            _createElementVNode("div", _hoisted_222, [
                              _cache[71] || (_cache[71] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "提前通知天数", -1 /* CACHED */)),
                              _createElementVNode("div", _hoisted_223, [
                                _withDirectives(_createElementVNode("input", {
                                  "onUpdate:modelValue": $event => ((notificationSettings.expiry_notify_days) = $event),
                                  type: "number",
                                  min: "0",
                                  class: "flex-1 bg-slate-900/70 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-sm outline-none"
                                }, null, 8 /* PROPS */, _hoisted_224), [
                                  [
                                    _vModelText,
                                    notificationSettings.expiry_notify_days,
                                    void 0,
                                    { number: true }
                                  ]
                                ]),
                                _cache[70] || (_cache[70] = _createElementVNode("span", { class: "text-gray-400 text-xs" }, "天", -1 /* CACHED */))
                              ])
                            ])
                          ]),
                          _cache[73] || (_cache[73] = _createElementVNode("div", { class: "bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-[11px] text-gray-400 leading-relaxed" }, " 留空或 0 表示不发送到期提醒；修改保存即重置流量统计基线。 ", -1 /* CACHED */))
                        ])
                      ]),
                      _createElementVNode("div", _hoisted_225, [
                        _createElementVNode("div", _hoisted_226, [
                          _createElementVNode("div", _hoisted_227, [
                            _cache[74] || (_cache[74] = _createElementVNode("h3", { class: "text-base font-semibold text-white flex items-center space-x-2" }, [
                              _createElementVNode("i", { class: "fab fa-dingtalk text-blue-300" }),
                              _createElementVNode("span", null, "钉钉通知")
                            ], -1 /* CACHED */)),
                            _createElementVNode("label", _hoisted_228, [
                              _withDirectives(_createElementVNode("input", {
                                type: "checkbox",
                                "onUpdate:modelValue": $event => ((notificationSettings.dingtalk.enabled) = $event),
                                class: "form-checkbox rounded border-white/20 bg-slate-900"
                              }, null, 8 /* PROPS */, _hoisted_229), [
                                [_vModelCheckbox, notificationSettings.dingtalk.enabled]
                              ]),
                              _createElementVNode("span", null, _toDisplayString(notificationSettings.dingtalk.enabled ? '已启用' : '已停用'), 1 /* TEXT */)
                            ])
                          ]),
                          _createElementVNode("div", _hoisted_230, [
                            _cache[75] || (_cache[75] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "Webhook 地址", -1 /* CACHED */)),
                            _withDirectives(_createElementVNode("input", {
                              "onUpdate:modelValue": $event => ((notificationSettings.dingtalk.webhook) = $event),
                              disabled: !notificationSettings.dingtalk.enabled,
                              type: "text",
                              placeholder: "https://oapi.dingtalk.com/robot/send?access_token=...",
                              class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none disabled:opacity-40"
                            }, null, 8 /* PROPS */, _hoisted_231), [
                              [_vModelText, notificationSettings.dingtalk.webhook]
                            ])
                          ]),
                          _createElementVNode("div", _hoisted_232, [
                            _cache[76] || (_cache[76] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "加签密钥（可选）", -1 /* CACHED */)),
                            _withDirectives(_createElementVNode("input", {
                              "onUpdate:modelValue": $event => ((notificationSettings.dingtalk.secret) = $event),
                              disabled: !notificationSettings.dingtalk.enabled,
                              type: "text",
                              placeholder: "SECxxxxxxxxxxxxxxxx",
                              class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none disabled:opacity-40"
                            }, null, 8 /* PROPS */, _hoisted_233), [
                              [_vModelText, notificationSettings.dingtalk.secret]
                            ])
                          ]),
                          _cache[77] || (_cache[77] = _createElementVNode("p", { class: "text-[11px] text-gray-500" }, "钉钉安全设置开启加签时需要填写密钥。", -1 /* CACHED */))
                        ]),
                        _createElementVNode("div", _hoisted_234, [
                          _createElementVNode("div", _hoisted_235, [
                            _cache[78] || (_cache[78] = _createElementVNode("h3", { class: "text-base font-semibold text-white flex items-center space-x-2" }, [
                              _createElementVNode("i", { class: "fab fa-telegram text-sky-300" }),
                              _createElementVNode("span", null, "Telegram 通知")
                            ], -1 /* CACHED */)),
                            _createElementVNode("label", _hoisted_236, [
                              _withDirectives(_createElementVNode("input", {
                                type: "checkbox",
                                "onUpdate:modelValue": $event => ((notificationSettings.telegram.enabled) = $event),
                                class: "form-checkbox rounded border-white/20 bg-slate-900"
                              }, null, 8 /* PROPS */, _hoisted_237), [
                                [_vModelCheckbox, notificationSettings.telegram.enabled]
                              ]),
                              _createElementVNode("span", null, _toDisplayString(notificationSettings.telegram.enabled ? '已启用' : '已停用'), 1 /* TEXT */)
                            ])
                          ]),
                          _createElementVNode("div", _hoisted_238, [
                            _cache[79] || (_cache[79] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "Bot Token", -1 /* CACHED */)),
                            _withDirectives(_createElementVNode("input", {
                              "onUpdate:modelValue": $event => ((notificationSettings.telegram.bot_token) = $event),
                              disabled: !notificationSettings.telegram.enabled,
                              type: "text",
                              placeholder: "123456:ABCDEF...",
                              class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none disabled:opacity-40"
                            }, null, 8 /* PROPS */, _hoisted_239), [
                              [_vModelText, notificationSettings.telegram.bot_token]
                            ])
                          ]),
                          _createElementVNode("div", _hoisted_240, [
                            _cache[80] || (_cache[80] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "Chat ID", -1 /* CACHED */)),
                            _withDirectives(_createElementVNode("input", {
                              "onUpdate:modelValue": $event => ((notificationSettings.telegram.chat_id) = $event),
                              disabled: !notificationSettings.telegram.enabled,
                              type: "text",
                              placeholder: "@your_channel 或者 123456789",
                              class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none disabled:opacity-40"
                            }, null, 8 /* PROPS */, _hoisted_241), [
                              [_vModelText, notificationSettings.telegram.chat_id]
                            ])
                          ]),
                          _cache[81] || (_cache[81] = _createElementVNode("p", { class: "text-[11px] text-gray-500" }, "确保机器人已加入目标会话，并具备发送消息的权限。", -1 /* CACHED */))
                        ])
                      ]),
                      _createElementVNode("div", _hoisted_242, [
                        _createElementVNode("button", {
                          type: "submit",
                          disabled: notificationSaving,
                          class: "btn-primary px-8 py-3 rounded-2xl font-bold text-white shadow-xl flex items-center space-x-2 disabled:opacity-60"
                        }, [
                          _createElementVNode("i", {
                            class: _normalizeClass(notificationSaving ? 'fas fa-spinner fa-spin' : 'fas fa-save')
                          }, null, 2 /* CLASS */),
                          _createElementVNode("span", null, _toDisplayString(notificationSaving ? '保存中...' : '保存设置'), 1 /* TEXT */)
                        ], 8 /* PROPS */, _hoisted_243)
                      ])
                    ], 40 /* PROPS, NEED_HYDRATION */, _hoisted_207))
              ]))
            : _createCommentVNode("v-if", true),
          _createCommentVNode(" Backup Management "),
          (currentTab === 'backup')
            ? (_openBlock(), _createElementBlock("section", _hoisted_244, [
                _cache[103] || (_cache[103] = _createElementVNode("div", { class: "flex flex-col md:flex-row md:items-center md:justify-between gap-4" }, [
                  _createElementVNode("div", null, [
                    _createElementVNode("div", { class: "text-gray-500 text-xs uppercase tracking-[0.4em] mb-1" }, "R2 AUTOMATION"),
                    _createElementVNode("p", { class: "text-gray-500 text-sm mt-2" }, "通过 Cloudflare R2 对 Nginx 配置进行备份与恢复，自动化守护您的线上环境。")
                  ])
                ], -1 /* CACHED */)),
                _createElementVNode("div", _hoisted_245, [
                  _createElementVNode("div", _hoisted_246, [
                    _createElementVNode("div", _hoisted_247, [
                      _createElementVNode("div", _hoisted_248, [
                        _cache[83] || (_cache[83] = _createElementVNode("h3", { class: "text-lg font-semibold text-white flex items-center space-x-2" }, [
                          _createElementVNode("i", { class: "fas fa-shield-alt text-emerald-300" }),
                          _createElementVNode("span", null, "当前状态")
                        ], -1 /* CACHED */)),
                        backupStatusLoading
                          ? (_openBlock(), _createElementBlock("div", _hoisted_249, [...(_cache[82] || (_cache[82] = [
                              _createElementVNode("i", { class: "fas fa-spinner fa-spin" }, null, -1 /* CACHED */),
                              _createElementVNode("span", null, "刷新中", -1 /* CACHED */)
                            ]))]))
                          : (_openBlock(), _createElementBlock("button", {
                              key: 1,
                              onClick: $event => (fetchBackupStatus()),
                              class: "text-xs text-blue-300 hover:text-blue-200 transition"
                            }, "刷新", 8 /* PROPS */, _hoisted_250))
                      ]),
                      _createElementVNode("div", _hoisted_251, [
                        _createElementVNode("div", _hoisted_252, [
                          _cache[84] || (_cache[84] = _createElementVNode("span", { class: "text-gray-400" }, "rclone 配置", -1 /* CACHED */)),
                          _createElementVNode("span", {
                            class: _normalizeClass(backupStatus.rclone_configured ? 'text-emerald-300' : 'text-red-300')
                          }, _toDisplayString(backupStatus.rclone_configured ? '已就绪' : '未配置'), 3 /* TEXT, CLASS */)
                        ]),
                        _createElementVNode("div", _hoisted_253, [
                          _cache[85] || (_cache[85] = _createElementVNode("span", { class: "text-gray-400" }, "备份任务", -1 /* CACHED */)),
                          _createElementVNode("span", {
                            class: _normalizeClass(backupStatus.backup_configured ? 'text-emerald-300' : 'text-red-300')
                          }, _toDisplayString(backupStatus.backup_configured ? '正常运行' : '未配置'), 3 /* TEXT, CLASS */)
                        ]),
                        _createElementVNode("div", _hoisted_254, [
                          _cache[86] || (_cache[86] = _createElementVNode("span", { class: "text-gray-400" }, "密钥状态", -1 /* CACHED */)),
                          _createElementVNode("span", {
                            class: _normalizeClass(backupStatus.has_secret ? 'text-emerald-300' : 'text-red-300')
                          }, _toDisplayString(backupStatus.has_secret ? '已保存' : '未设置'), 3 /* TEXT, CLASS */)
                        ]),
                        _createElementVNode("div", _hoisted_255, [
                          _createElementVNode("div", null, [
                            _cache[87] || (_cache[87] = _createTextVNode("源目录：", -1 /* CACHED */)),
                            _createElementVNode("span", _hoisted_256, _toDisplayString(backupStatus.source_dir || '未设置'), 1 /* TEXT */)
                          ]),
                          _createElementVNode("div", _hoisted_257, [
                            _cache[88] || (_cache[88] = _createTextVNode("R2 路径：", -1 /* CACHED */)),
                            _createElementVNode("span", _hoisted_258, _toDisplayString(backupStatus.remote_path || '未设置'), 1 /* TEXT */)
                          ])
                        ])
                      ]),
                      _createElementVNode("div", _hoisted_259, [
                        _createElementVNode("button", {
                          onClick: runBackupNow,
                          disabled: backupRunLoading,
                          class: "w-full glass border border-emerald-400/40 px-4 py-3 rounded-2xl flex items-center justify-between hover:bg-emerald-500/20 transition disabled:opacity-50"
                        }, [
                          _createElementVNode("span", _hoisted_261, [
                            _createElementVNode("i", {
                              class: _normalizeClass(backupRunLoading ? 'fas fa-spinner fa-spin' : 'fas fa-cloud-upload-alt')
                            }, null, 2 /* CLASS */),
                            _createElementVNode("span", null, _toDisplayString(backupRunLoading ? '备份执行中...' : '立即执行备份'), 1 /* TEXT */)
                          ]),
                          _cache[89] || (_cache[89] = _createElementVNode("i", { class: "fas fa-chevron-right text-emerald-200/60 text-xs" }, null, -1 /* CACHED */))
                        ], 8 /* PROPS */, _hoisted_260),
                        _createElementVNode("button", {
                          onClick: testBackupConnection,
                          disabled: backupTestLoading,
                          class: "w-full glass border border-blue-400/40 px-4 py-3 rounded-2xl flex items-center justify-between hover:bg-blue-500/20 transition disabled:opacity-50"
                        }, [
                          _createElementVNode("span", _hoisted_263, [
                            _createElementVNode("i", {
                              class: _normalizeClass(backupTestLoading ? 'fas fa-spinner fa-spin' : 'fas fa-plug')
                            }, null, 2 /* CLASS */),
                            _createElementVNode("span", null, _toDisplayString(backupTestLoading ? '测试连接...' : '测试 R2 连接'), 1 /* TEXT */)
                          ]),
                          _cache[90] || (_cache[90] = _createElementVNode("i", { class: "fas fa-chevron-right text-blue-200/60 text-xs" }, null, -1 /* CACHED */))
                        ], 8 /* PROPS */, _hoisted_262),
                        _createElementVNode("div", _hoisted_264, [
                          _createElementVNode("div", _hoisted_265, [
                            _cache[91] || (_cache[91] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "R2 存储路径", -1 /* CACHED */)),
                            _withDirectives(_createElementVNode("input", {
                              "onUpdate:modelValue": $event => ((restoreForm.remote_path) = $event),
                              type: "text",
                              placeholder: "bucket/path",
                              class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none"
                            }, null, 8 /* PROPS */, _hoisted_266), [
                              [_vModelText, restoreForm.remote_path]
                            ])
                          ]),
                          _createElementVNode("button", {
                            onClick: restoreBackup,
                            disabled: restoreLoading,
                            class: "w-full glass border border-orange-400/50 px-4 py-3 rounded-2xl flex items-center justify-between hover:bg-orange-500/20 transition disabled:opacity-60"
                          }, [
                            _createElementVNode("span", _hoisted_268, [
                              _createElementVNode("i", {
                                class: _normalizeClass(restoreLoading ? 'fas fa-spinner fa-spin' : 'fas fa-undo-alt')
                              }, null, 2 /* CLASS */),
                              _createElementVNode("span", null, _toDisplayString(restoreLoading ? '恢复中...' : '恢复最新备份'), 1 /* TEXT */)
                            ]),
                            _cache[92] || (_cache[92] = _createElementVNode("i", { class: "fas fa-chevron-right text-orange-200/70 text-xs" }, null, -1 /* CACHED */))
                          ], 8 /* PROPS */, _hoisted_267),
                          _cache[93] || (_cache[93] = _createElementVNode("p", { class: "text-[11px] text-orange-200/80 bg-orange-500/10 border border-orange-400/20 rounded-xl px-3 py-2" }, [
                            _createTextVNode(" 将下载最新的 "),
                            _createElementVNode("code", { class: "font-mono text-emerald-300" }, ".tar.gz"),
                            _createTextVNode(" 包并自动恢复，操作前建议先生成本地备份。 ")
                          ], -1 /* CACHED */))
                        ]),
                        _cache[94] || (_cache[94] = _createElementVNode("div", { class: "text-[11px] text-gray-500 leading-relaxed bg-white/5 border border-white/10 rounded-2xl px-4 py-3" }, [
                          _createTextVNode(" 定时任务默认每天 02:00 自动备份，可在服务器执行 "),
                          _createElementVNode("code", { class: "font-mono text-emerald-300" }, "crontab -l"),
                          _createTextVNode(" 查看。 ")
                        ], -1 /* CACHED */))
                      ])
                    ])
                  ]),
                  _createElementVNode("div", _hoisted_269, [
                    _cache[102] || (_cache[102] = _createElementVNode("div", { class: "flex items-center justify-between mb-6" }, [
                      _createElementVNode("h3", { class: "text-xl font-bold text-white flex items-center space-x-3" }, [
                        _createElementVNode("i", { class: "fas fa-sliders-h text-blue-300" }),
                        _createElementVNode("span", null, "Cloudflare R2 配置")
                      ])
                    ], -1 /* CACHED */)),
                    _createElementVNode("form", {
                      class: "space-y-5",
                      onSubmit: _withModifiers(saveBackupSetup, ["prevent"])
                    }, [
                      _createElementVNode("div", _hoisted_271, [
                        _createElementVNode("div", _hoisted_272, [
                          _cache[95] || (_cache[95] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "Access Key ID", -1 /* CACHED */)),
                          _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((backupForm.access_key) = $event),
                            type: "text",
                            autocomplete: "off",
                            placeholder: "示例：ABC123...",
                            class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
                          }, null, 8 /* PROPS */, _hoisted_273), [
                            [_vModelText, backupForm.access_key]
                          ])
                        ]),
                        _createElementVNode("div", _hoisted_274, [
                          _cache[96] || (_cache[96] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "Secret Access Key", -1 /* CACHED */)),
                          _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((backupForm.secret_key) = $event),
                            type: "password",
                            placeholder: "仅用于写入配置，不会保存明文",
                            class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
                          }, null, 8 /* PROPS */, _hoisted_275), [
                            [_vModelText, backupForm.secret_key]
                          ])
                        ])
                      ]),
                      _createElementVNode("div", _hoisted_276, [
                        _cache[97] || (_cache[97] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "R2 Endpoint", -1 /* CACHED */)),
                        _withDirectives(_createElementVNode("input", {
                          "onUpdate:modelValue": $event => ((backupForm.endpoint) = $event),
                          type: "text",
                          placeholder: "https://<accountid>.r2.cloudflarestorage.com",
                          class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
                        }, null, 8 /* PROPS */, _hoisted_277), [
                          [_vModelText, backupForm.endpoint]
                        ])
                      ]),
                      _createElementVNode("div", _hoisted_278, [
                        _createElementVNode("div", _hoisted_279, [
                          _cache[98] || (_cache[98] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "备份源目录", -1 /* CACHED */)),
                          _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((backupForm.source_dir) = $event),
                            type: "text",
                            placeholder: "/etc/nginx",
                            class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none"
                          }, null, 8 /* PROPS */, _hoisted_280), [
                            [_vModelText, backupForm.source_dir]
                          ])
                        ]),
                        _createElementVNode("div", _hoisted_281, [
                          _cache[99] || (_cache[99] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "R2 存储路径", -1 /* CACHED */)),
                          _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((backupForm.remote_path) = $event),
                            type: "text",
                            placeholder: "bucket/path",
                            class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none"
                          }, null, 8 /* PROPS */, _hoisted_282), [
                            [_vModelText, backupForm.remote_path]
                          ])
                        ])
                      ]),
                      _createElementVNode("div", _hoisted_283, [
                        _withDirectives(_createElementVNode("input", {
                          id: "skipBackup",
                          "onUpdate:modelValue": $event => ((skipInitialBackup) = $event),
                          type: "checkbox",
                          class: "h-4 w-4 rounded border-white/20 bg-slate-900/70"
                        }, null, 8 /* PROPS */, _hoisted_284), [
                          [_vModelCheckbox, skipInitialBackup]
                        ]),
                        _cache[100] || (_cache[100] = _createElementVNode("label", {
                          for: "skipBackup",
                          class: "cursor-pointer"
                        }, "跳过首次立即备份（仅写入配置）", -1 /* CACHED */))
                      ]),
                      _createElementVNode("div", _hoisted_285, [
                        _cache[101] || (_cache[101] = _createElementVNode("p", { class: "text-[11px] text-gray-500 bg-white/5 border border-white/10 rounded-xl px-4 py-3 leading-relaxed" }, [
                          _createTextVNode(" 保存后会自动安装 "),
                          _createElementVNode("code", { class: "font-mono text-emerald-300" }, "rclone"),
                          _createTextVNode("、"),
                          _createElementVNode("code", { class: "font-mono text-emerald-300" }, "pigz"),
                          _createTextVNode(" 等依赖，并生成每日备份任务。 成功配置后，可在左侧状态卡片执行手动备份或恢复。 ")
                        ], -1 /* CACHED */)),
                        _createElementVNode("button", {
                          type: "submit",
                          disabled: backupSaving,
                          class: "btn-primary text-white px-10 py-3 rounded-2xl font-bold shadow-lg flex items-center space-x-2 disabled:opacity-60"
                        }, [
                          _createElementVNode("i", {
                            class: _normalizeClass(backupSaving ? 'fas fa-spinner fa-spin' : 'fas fa-save')
                          }, null, 2 /* CLASS */),
                          _createElementVNode("span", null, _toDisplayString(backupSaving ? '保存中...' : '保存配置'), 1 /* TEXT */)
                        ], 8 /* PROPS */, _hoisted_286)
                      ])
                    ], 40 /* PROPS, NEED_HYDRATION */, _hoisted_270)
                  ])
                ])
              ]))
            : _createCommentVNode("v-if", true)
        ]),
        _createCommentVNode(" 手机端底部导航 "),
        _createElementVNode("nav", _hoisted_287, [
          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(mobileTabs, (item) => {
            return (_openBlock(), _createElementBlock("button", {
              key: item.id,
              onClick: $event => (onMobileTab(item)),
              class: _normalizeClass(['flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] transition',
                                 currentTab === item.id ? 'text-blue-300' : 'text-gray-500'])
            }, [
              _createElementVNode("span", _hoisted_289, [
                _createElementVNode("i", {
                  class: _normalizeClass(['fas', item.icon, 'text-base'])
                }, null, 2 /* CLASS */),
                (item.id === 'more' && versionReport.vulnerable)
                  ? (_openBlock(), _createElementBlock("span", _hoisted_290))
                  : _createCommentVNode("v-if", true)
              ]),
              _createElementVNode("span", null, _toDisplayString(item.label), 1 /* TEXT */)
            ], 10 /* CLASS, PROPS */, _hoisted_288))
          }), 128 /* KEYED_FRAGMENT */))
        ])
      ]),
      _createCommentVNode(" Modal: Create/Edit Site "),
      showSiteModal
        ? (_openBlock(), _createElementBlock("div", _hoisted_291, [
            _createElementVNode("div", _hoisted_292, [
              _createElementVNode("div", _hoisted_293, [
                _createElementVNode("h3", _hoisted_294, _toDisplayString(isSiteEdit ? '编辑站点' : '新增站点'), 1 /* TEXT */),
                _createElementVNode("button", {
                  onClick: $event => (showSiteModal = false),
                  class: "text-gray-500 hover:text-white transition p-2 -mr-2"
                }, [...(_cache[104] || (_cache[104] = [
                  _createElementVNode("i", { class: "fas fa-times text-xl" }, null, -1 /* CACHED */)
                ]))], 8 /* PROPS */, _hoisted_295)
              ]),
              _createElementVNode("div", _hoisted_296, [
                _createElementVNode("div", _hoisted_297, [
                  _createElementVNode("div", _hoisted_298, [
                    _cache[105] || (_cache[105] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "访问域名", -1 /* CACHED */)),
                    _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((siteForm.domain) = $event),
                      disabled: isSiteEdit,
                      type: "text",
                      placeholder: "example.com",
                      class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-5 py-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50"
                    }, null, 8 /* PROPS */, _hoisted_299), [
                      [_vModelText, siteForm.domain]
                    ])
                  ]),
                  _createElementVNode("div", _hoisted_300, [
                    _cache[106] || (_cache[106] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "站点类型", -1 /* CACHED */)),
                    _withDirectives(_createElementVNode("select", {
                      "onUpdate:modelValue": $event => ((siteForm.type) = $event),
                      class: "w-full bg-slate-900/80 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500"
                    }, [
                      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(siteTypes, (t) => {
                        return (_openBlock(), _createElementBlock("option", {
                          key: t.id,
                          value: t.id
                        }, _toDisplayString(t.name), 9 /* TEXT, PROPS */, _hoisted_302))
                      }), 128 /* KEYED_FRAGMENT */))
                    ], 8 /* PROPS */, _hoisted_301), [
                      [_vModelSelect, siteForm.type]
                    ])
                  ])
                ]),
                (siteForm.type === 'proxy')
                  ? (_openBlock(), _createElementBlock("div", _hoisted_303, [
                      _createElementVNode("div", _hoisted_304, [
                        _cache[107] || (_cache[107] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "后端 IP", -1 /* CACHED */)),
                        _withDirectives(_createElementVNode("input", {
                          "onUpdate:modelValue": $event => ((siteForm.backend_ip) = $event),
                          type: "text",
                          class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-5 py-4 text-white outline-none"
                        }, null, 8 /* PROPS */, _hoisted_305), [
                          [_vModelText, siteForm.backend_ip]
                        ])
                      ]),
                      _createElementVNode("div", _hoisted_306, [
                        _cache[108] || (_cache[108] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "后端端口", -1 /* CACHED */)),
                        _withDirectives(_createElementVNode("input", {
                          "onUpdate:modelValue": $event => ((siteForm.backend_port) = $event),
                          type: "number",
                          class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-5 py-4 text-white outline-none"
                        }, null, 8 /* PROPS */, _hoisted_307), [
                          [
                            _vModelText,
                            siteForm.backend_port,
                            void 0,
                            { number: true }
                          ]
                        ])
                      ])
                    ]))
                  : _createCommentVNode("v-if", true),
                (siteForm.type === 'lb')
                  ? (_openBlock(), _createElementBlock("div", _hoisted_308, [
                      _cache[109] || (_cache[109] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "后端列表 (每行一个 IP:PORT)", -1 /* CACHED */)),
                      _withDirectives(_createElementVNode("textarea", {
                        "onUpdate:modelValue": $event => ((backendsText) = $event),
                        rows: "3",
                        class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-5 py-4 text-white outline-none font-mono text-sm"
                      }, null, 8 /* PROPS */, _hoisted_309), [
                        [_vModelText, backendsText]
                      ])
                    ]))
                  : _createCommentVNode("v-if", true),
                (siteForm.type === 'redirect')
                  ? (_openBlock(), _createElementBlock("div", _hoisted_310, [
                      _cache[110] || (_cache[110] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "目标 URL", -1 /* CACHED */)),
                      _withDirectives(_createElementVNode("input", {
                        "onUpdate:modelValue": $event => ((siteForm.target_url) = $event),
                        type: "text",
                        placeholder: "https://new-site.com",
                        class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-5 py-4 text-white outline-none"
                      }, null, 8 /* PROPS */, _hoisted_311), [
                        [_vModelText, siteForm.target_url]
                      ])
                    ]))
                  : _createCommentVNode("v-if", true),
                (siteForm.type === 'static')
                  ? (_openBlock(), _createElementBlock("div", _hoisted_312, [
                      _cache[111] || (_cache[111] = _createElementVNode("i", { class: "fas fa-info-circle mr-2" }, null, -1 /* CACHED */)),
                      _cache[112] || (_cache[112] = _createTextVNode("静态资源将存放在 ", -1 /* CACHED */)),
                      _createElementVNode("code", null, "/var/www/html/" + _toDisplayString(siteForm.domain || 'your-domain'), 1 /* TEXT */)
                    ]))
                  : _createCommentVNode("v-if", true)
              ]),
              _createElementVNode("div", _hoisted_313, [
                _createElementVNode("button", {
                  onClick: $event => (showSiteModal = false),
                  class: "px-6 py-3 text-gray-400 hover:text-white transition font-bold"
                }, "取消", 8 /* PROPS */, _hoisted_314),
                _createElementVNode("button", {
                  onClick: saveSite,
                  class: "btn-primary text-white px-10 py-3 rounded-2xl font-bold shadow-lg"
                }, _toDisplayString(isSiteEdit ? '保存修改' : '确认创建'), 9 /* TEXT, PROPS */, _hoisted_315)
              ])
            ])
          ]))
        : _createCommentVNode("v-if", true),
      _createCommentVNode(" Modal: Manual Raw Edit "),
      showRawModal
        ? (_openBlock(), _createElementBlock("div", _hoisted_316, [
            _createElementVNode("div", _hoisted_317, [
              _createElementVNode("div", _hoisted_318, [
                _createElementVNode("h3", _hoisted_319, [
                  _cache[113] || (_cache[113] = _createElementVNode("i", { class: "fas fa-code text-emerald-300" }, null, -1 /* CACHED */)),
                  _createElementVNode("span", _hoisted_320, "手动编辑配置 - " + _toDisplayString(selectedSite), 1 /* TEXT */)
                ]),
                _createElementVNode("button", {
                  onClick: $event => (showRawModal = false),
                  class: "text-gray-500 hover:text-white transition p-2 -mr-2 shrink-0"
                }, [...(_cache[114] || (_cache[114] = [
                  _createElementVNode("i", { class: "fas fa-times text-xl" }, null, -1 /* CACHED */)
                ]))], 8 /* PROPS */, _hoisted_321)
              ]),
              _createElementVNode("div", _hoisted_322, [
                _cache[116] || (_cache[116] = _createElementVNode("div", { class: "text-xs text-gray-500 flex items-center space-x-2" }, [
                  _createElementVNode("i", { class: "fas fa-circle-info text-blue-300" }),
                  _createElementVNode("span", null, [
                    _createTextVNode("提交后自动执行 "),
                    _createElementVNode("code", { class: "font-mono text-emerald-300" }, "nginx -t"),
                    _createTextVNode(" & "),
                    _createElementVNode("code", { class: "font-mono text-emerald-300" }, "systemctl reload nginx"),
                    _createTextVNode("，失败将回滚。")
                  ])
                ], -1 /* CACHED */)),
                _withDirectives(_createElementVNode("textarea", {
                  "onUpdate:modelValue": $event => ((rawContentDraft) = $event),
                  disabled: rawLoading,
                  rows: "12",
                  spellcheck: "false",
                  autocomplete: "off",
                  autocapitalize: "off",
                  class: "w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-emerald-100 font-mono outline-none"
                }, null, 8 /* PROPS */, _hoisted_323), [
                  [_vModelText, rawContentDraft]
                ]),
                rawLoading
                  ? (_openBlock(), _createElementBlock("div", _hoisted_324, [...(_cache[115] || (_cache[115] = [
                      _createElementVNode("i", { class: "fas fa-spinner fa-spin mr-2" }, null, -1 /* CACHED */),
                      _createTextVNode("请求处理中，请稍候...", -1 /* CACHED */)
                    ]))]))
                  : _createCommentVNode("v-if", true)
              ]),
              _createElementVNode("div", _hoisted_325, [
                _createElementVNode("button", {
                  onClick: $event => (showRawModal = false),
                  class: "px-6 py-3 text-gray-400 hover:text-white transition font-bold"
                }, "取消", 8 /* PROPS */, _hoisted_326),
                _createElementVNode("button", {
                  onClick: saveRaw,
                  disabled: rawLoading,
                  class: "btn-primary text-white px-10 py-3 rounded-2xl font-bold shadow-lg flex items-center space-x-2 disabled:opacity-60"
                }, [
                  _cache[117] || (_cache[117] = _createElementVNode("i", { class: "fas fa-shield-check" }, null, -1 /* CACHED */)),
                  _createElementVNode("span", null, _toDisplayString(rawLoading ? '验证中...' : '验证并重载'), 1 /* TEXT */)
                ], 8 /* PROPS */, _hoisted_327)
              ])
            ])
          ]))
        : _createCommentVNode("v-if", true),
      _createCommentVNode(" Modal: Create/Edit Stream "),
      showStreamModal
        ? (_openBlock(), _createElementBlock("div", _hoisted_328, [
            _createElementVNode("div", _hoisted_329, [
              _createElementVNode("div", _hoisted_330, [
                _createElementVNode("h3", _hoisted_331, _toDisplayString(isStreamEdit ? '编辑端口转发' : '新增端口转发'), 1 /* TEXT */),
                _createElementVNode("button", {
                  onClick: $event => (showStreamModal = false),
                  class: "text-gray-500 hover:text-white transition p-2 -mr-2"
                }, [...(_cache[118] || (_cache[118] = [
                  _createElementVNode("i", { class: "fas fa-times text-xl" }, null, -1 /* CACHED */)
                ]))], 8 /* PROPS */, _hoisted_332)
              ]),
              _createElementVNode("div", _hoisted_333, [
                _createElementVNode("div", _hoisted_334, [
                  _cache[119] || (_cache[119] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "规则名称", -1 /* CACHED */)),
                  _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((streamForm.name) = $event),
                    disabled: isStreamEdit,
                    type: "text",
                    placeholder: "api-gateway",
                    class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-5 py-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50"
                  }, null, 8 /* PROPS */, _hoisted_335), [
                    [_vModelText, streamForm.name]
                  ])
                ]),
                _createElementVNode("div", _hoisted_336, [
                  _cache[120] || (_cache[120] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "监听端口", -1 /* CACHED */)),
                  _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((streamForm.listen_port) = $event),
                    type: "number",
                    placeholder: "443",
                    class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-5 py-4 text-white outline-none"
                  }, null, 8 /* PROPS */, _hoisted_337), [
                    [
                      _vModelText,
                      streamForm.listen_port,
                      void 0,
                      { number: true }
                    ]
                  ])
                ]),
                _createElementVNode("div", _hoisted_338, [
                  _cache[121] || (_cache[121] = _createElementVNode("label", { class: "text-xs font-bold text-gray-400 uppercase tracking-widest" }, "目标地址 (IP:PORT)", -1 /* CACHED */)),
                  _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((streamForm.target) = $event),
                    type: "text",
                    placeholder: "10.0.0.12:443",
                    class: "w-full bg-slate-900/70 border border-white/10 rounded-xl px-5 py-4 text-white outline-none"
                  }, null, 8 /* PROPS */, _hoisted_339), [
                    [_vModelText, streamForm.target]
                  ])
                ]),
                _cache[122] || (_cache[122] = _createElementVNode("div", { class: "p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-xs" }, [
                  _createElementVNode("i", { class: "fas fa-info-circle mr-2" }),
                  _createTextVNode("保存后将自动验证并重载 Nginx，如重载失败会自动回滚到原配置。 ")
                ], -1 /* CACHED */))
              ]),
              _createElementVNode("div", _hoisted_340, [
                _createElementVNode("button", {
                  onClick: $event => (showStreamModal = false),
                  class: "px-6 py-3 text-gray-400 hover:text-white transition font-bold"
                }, "取消", 8 /* PROPS */, _hoisted_341),
                _createElementVNode("button", {
                  onClick: saveStream,
                  class: "btn-primary text-white px-10 py-3 rounded-2xl font-bold shadow-lg"
                }, _toDisplayString(isStreamEdit ? '保存修改' : '确认创建'), 9 /* TEXT, PROPS */, _hoisted_342)
              ])
            ])
          ]))
        : _createCommentVNode("v-if", true),
      _createCommentVNode(" Modal: Stream Raw Edit "),
      showStreamRawModal
        ? (_openBlock(), _createElementBlock("div", _hoisted_343, [
            _createElementVNode("div", _hoisted_344, [
              _createElementVNode("div", _hoisted_345, [
                _createElementVNode("h3", _hoisted_346, [
                  _cache[123] || (_cache[123] = _createElementVNode("i", { class: "fas fa-terminal text-emerald-300" }, null, -1 /* CACHED */)),
                  _createElementVNode("span", _hoisted_347, "手动编辑转发 - " + _toDisplayString(streamRawName), 1 /* TEXT */)
                ]),
                _createElementVNode("button", {
                  onClick: $event => (showStreamRawModal = false),
                  class: "text-gray-500 hover:text-white transition p-2 -mr-2 shrink-0"
                }, [...(_cache[124] || (_cache[124] = [
                  _createElementVNode("i", { class: "fas fa-times text-xl" }, null, -1 /* CACHED */)
                ]))], 8 /* PROPS */, _hoisted_348)
              ]),
              _createElementVNode("div", _hoisted_349, [
                _cache[126] || (_cache[126] = _createElementVNode("div", { class: "text-xs text-gray-500 flex items-center space-x-2" }, [
                  _createElementVNode("i", { class: "fas fa-circle-info text-blue-300" }),
                  _createElementVNode("span", null, [
                    _createTextVNode("保存后自动执行 "),
                    _createElementVNode("code", { class: "font-mono text-emerald-300" }, "nginx -t"),
                    _createTextVNode(" 与 "),
                    _createElementVNode("code", { class: "font-mono text-emerald-300" }, "systemctl reload nginx"),
                    _createTextVNode("，失败会回滚原配置。")
                  ])
                ], -1 /* CACHED */)),
                _withDirectives(_createElementVNode("textarea", {
                  "onUpdate:modelValue": $event => ((streamRawContent) = $event),
                  disabled: streamRawLoading,
                  rows: "12",
                  spellcheck: "false",
                  autocapitalize: "off",
                  class: "w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-emerald-100 font-mono outline-none"
                }, null, 8 /* PROPS */, _hoisted_350), [
                  [_vModelText, streamRawContent]
                ]),
                streamRawLoading
                  ? (_openBlock(), _createElementBlock("div", _hoisted_351, [...(_cache[125] || (_cache[125] = [
                      _createElementVNode("i", { class: "fas fa-spinner fa-spin mr-2" }, null, -1 /* CACHED */),
                      _createTextVNode("请求处理中，请稍候...", -1 /* CACHED */)
                    ]))]))
                  : _createCommentVNode("v-if", true)
              ]),
              _createElementVNode("div", _hoisted_352, [
                _createElementVNode("button", {
                  onClick: $event => (showStreamRawModal = false),
                  class: "px-6 py-3 text-gray-400 hover:text-white transition font-bold"
                }, "取消", 8 /* PROPS */, _hoisted_353),
                _createElementVNode("button", {
                  onClick: saveStreamRaw,
                  disabled: streamRawLoading,
                  class: "btn-primary text-white px-10 py-3 rounded-2xl font-bold shadow-lg flex items-center space-x-2 disabled:opacity-60"
                }, [
                  _cache[127] || (_cache[127] = _createElementVNode("i", { class: "fas fa-shield-check" }, null, -1 /* CACHED */)),
                  _createElementVNode("span", null, _toDisplayString(streamRawLoading ? '验证中...' : '验证并重载'), 1 /* TEXT */)
                ], 8 /* PROPS */, _hoisted_354)
              ])
            ])
          ]))
        : _createCommentVNode("v-if", true),
      _createCommentVNode(" Modal: Site Log Viewer "),
      showLogModal
        ? (_openBlock(), _createElementBlock("div", _hoisted_355, [
            _createElementVNode("div", _hoisted_356, [
              _createElementVNode("div", _hoisted_357, [
                _createElementVNode("h3", _hoisted_358, [
                  _cache[128] || (_cache[128] = _createElementVNode("i", { class: "fas fa-eye text-indigo-300" }, null, -1 /* CACHED */)),
                  _createElementVNode("span", _hoisted_359, _toDisplayString(logModalSite) + " · 日志详情", 1 /* TEXT */)
                ]),
                _createElementVNode("button", {
                  onClick: closeLogModal,
                  class: "text-gray-500 hover:text-white transition p-2 -mr-2 shrink-0"
                }, [...(_cache[129] || (_cache[129] = [
                  _createElementVNode("i", { class: "fas fa-times text-xl" }, null, -1 /* CACHED */)
                ]))], 8 /* PROPS */, _hoisted_360)
              ]),
              _createElementVNode("div", _hoisted_361, [
                _createElementVNode("div", null, [
                  _createElementVNode("div", _hoisted_362, [
                    _createElementVNode("div", _hoisted_363, [
                      _cache[130] || (_cache[130] = _createElementVNode("h4", { class: "text-sm font-semibold text-emerald-300 uppercase tracking-widest" }, "Access Log", -1 /* CACHED */)),
                      _createElementVNode("button", {
                        onClick: $event => (copyLog('access')),
                        class: "text-sm text-gray-200 hover:text-white transition font-semibold",
                        title: "复制 Access Log"
                      }, "拷贝", 8 /* PROPS */, _hoisted_364)
                    ]),
                    _createElementVNode("span", _hoisted_365, _toDisplayString(logModalContent.access.length) + " 行", 1 /* TEXT */)
                  ]),
                  _createElementVNode("div", _hoisted_366, [
                    (logModalContent.access.length)
                      ? (_openBlock(true), _createElementBlock(_Fragment, { key: 0 }, _renderList(logModalContent.access, (line, idx) => {
                          return (_openBlock(), _createElementBlock("div", {
                            key: idx,
                            class: "whitespace-pre-wrap mb-1"
                          }, _toDisplayString(line), 1 /* TEXT */))
                        }), 128 /* KEYED_FRAGMENT */))
                      : (_openBlock(), _createElementBlock("div", _hoisted_367, "暂无访问日志记录。"))
                  ])
                ]),
                _createElementVNode("div", null, [
                  _createElementVNode("div", _hoisted_368, [
                    _createElementVNode("div", _hoisted_369, [
                      _cache[131] || (_cache[131] = _createElementVNode("h4", { class: "text-sm font-semibold text-red-300 uppercase tracking-widest" }, "Error Log", -1 /* CACHED */)),
                      _createElementVNode("button", {
                        onClick: $event => (copyLog('error')),
                        class: "text-sm text-gray-200 hover:text-white transition font-semibold",
                        title: "复制 Error Log"
                      }, "拷贝", 8 /* PROPS */, _hoisted_370)
                    ]),
                    _createElementVNode("span", _hoisted_371, _toDisplayString(logModalContent.error.length) + " 行", 1 /* TEXT */)
                  ]),
                  _createElementVNode("div", _hoisted_372, [
                    (logModalContent.error.length)
                      ? (_openBlock(true), _createElementBlock(_Fragment, { key: 0 }, _renderList(logModalContent.error, (line, idx) => {
                          return (_openBlock(), _createElementBlock("div", {
                            key: idx,
                            class: "whitespace-pre-wrap mb-1"
                          }, _toDisplayString(line), 1 /* TEXT */))
                        }), 128 /* KEYED_FRAGMENT */))
                      : (_openBlock(), _createElementBlock("div", _hoisted_373, "暂无错误日志记录。"))
                  ])
                ])
              ]),
              _createElementVNode("div", _hoisted_374, [
                _createElementVNode("button", {
                  onClick: closeLogModal,
                  class: "w-full md:w-auto px-6 py-3 text-gray-400 hover:text-white transition font-bold"
                }, "关闭", 8 /* PROPS */, _hoisted_375)
              ])
            ])
          ]))
        : _createCommentVNode("v-if", true),
      _createCommentVNode(" Modal: Install Progress "),
      showInstallModal
        ? (_openBlock(), _createElementBlock("div", _hoisted_376, [
            _createElementVNode("div", _hoisted_377, [
              _createElementVNode("div", _hoisted_378, [
                _cache[133] || (_cache[133] = _createElementVNode("h3", { class: "text-lg md:text-2xl font-bold text-white flex items-center space-x-2 md:space-x-3" }, [
                  _createElementVNode("i", { class: "fas fa-terminal text-blue-300" }),
                  _createElementVNode("span", null, "Nginx 安装进度")
                ], -1 /* CACHED */)),
                _createElementVNode("button", {
                  onClick: closeInstallModal,
                  class: "text-gray-500 hover:text-white transition p-2 -mr-2"
                }, [...(_cache[132] || (_cache[132] = [
                  _createElementVNode("i", { class: "fas fa-times text-xl" }, null, -1 /* CACHED */)
                ]))], 8 /* PROPS */, _hoisted_379)
              ]),
              _createElementVNode("div", _hoisted_380, [
                _createElementVNode("div", null, [
                  _cache[134] || (_cache[134] = _createElementVNode("div", { class: "text-xs text-gray-400 uppercase tracking-widest mb-2" }, "当前状态", -1 /* CACHED */)),
                  _createElementVNode("div", _hoisted_381, [
                    _createElementVNode("span", null, [
                      _createElementVNode("i", {
                        class: _normalizeClass(installStatus.is_running ? 'fas fa-spinner fa-spin text-blue-300' : (installStatus.exit_code === 0 ? 'fas fa-check-circle text-emerald-300' : 'fas fa-triangle-exclamation text-red-300'))
                      }, null, 2 /* CLASS */),
                      _createElementVNode("span", _hoisted_382, _toDisplayString(installStatusText), 1 /* TEXT */)
                    ]),
                    _createElementVNode("span", _hoisted_383, _toDisplayString(installProgress) + "%", 1 /* TEXT */)
                  ]),
                  _createElementVNode("div", _hoisted_384, [
                    _createElementVNode("div", {
                      class: "h-full bg-gradient-to-r from-blue-400 to-cyan-300 transition-all duration-500",
                      style: _normalizeStyle({ width: installProgress + '%' })
                    }, null, 4 /* STYLE */)
                  ])
                ]),
                _createElementVNode("div", null, [
                  _cache[135] || (_cache[135] = _createElementVNode("div", { class: "text-xs text-gray-400 uppercase tracking-widest mb-2" }, "进度日志", -1 /* CACHED */)),
                  _createElementVNode("div", _hoisted_385, [
                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(installStatus.logs, (line, idx) => {
                      return (_openBlock(), _createElementBlock("div", { key: idx }, _toDisplayString(line), 1 /* TEXT */))
                    }), 128 /* KEYED_FRAGMENT */)),
                    (!installStatus.logs || !installStatus.logs.length)
                      ? (_openBlock(), _createElementBlock("div", _hoisted_386, "暂无日志输出。"))
                      : _createCommentVNode("v-if", true)
                  ], 512 /* NEED_PATCH */)
                ])
              ]),
              _createElementVNode("div", _hoisted_387, [
                (installStatus.is_running)
                  ? (_openBlock(), _createElementBlock("span", _hoisted_388, "安装进行中，请勿关闭窗口，日志每 2 秒自动刷新。"))
                  : (_openBlock(), _createElementBlock("span", _hoisted_389, "安装任务已结束，可关闭窗口。"))
              ])
            ])
          ]))
        : _createCommentVNode("v-if", true),
      _createCommentVNode(" Modal: Version & Advisories "),
      showVersionModal
        ? (_openBlock(), _createElementBlock("div", _hoisted_390, [
            _createElementVNode("div", _hoisted_391, [
              _createElementVNode("div", _hoisted_392, [
                _cache[137] || (_cache[137] = _createElementVNode("h3", { class: "text-lg md:text-2xl font-bold text-white flex items-center space-x-2 md:space-x-3 min-w-0" }, [
                  _createElementVNode("i", { class: "fas fa-shield-alt text-emerald-300" }),
                  _createElementVNode("span", { class: "truncate" }, "版本与安全公告")
                ], -1 /* CACHED */)),
                _createElementVNode("button", {
                  onClick: $event => (showVersionModal = false),
                  class: "text-gray-500 hover:text-white transition p-2 -mr-2 shrink-0"
                }, [...(_cache[136] || (_cache[136] = [
                  _createElementVNode("i", { class: "fas fa-times text-xl" }, null, -1 /* CACHED */)
                ]))], 8 /* PROPS */, _hoisted_393)
              ]),
              _createElementVNode("div", _hoisted_394, [
                _createElementVNode("div", _hoisted_395, [
                  _createElementVNode("div", _hoisted_396, [
                    _cache[138] || (_cache[138] = _createElementVNode("div", { class: "text-[10px] text-gray-500 uppercase tracking-widest" }, "当前版本", -1 /* CACHED */)),
                    _createElementVNode("div", _hoisted_397, _toDisplayString(versionReport.installed || '—'), 1 /* TEXT */)
                  ]),
                  _createElementVNode("div", _hoisted_398, [
                    _cache[139] || (_cache[139] = _createElementVNode("div", { class: "text-[10px] text-gray-500 uppercase tracking-widest" }, "分支", -1 /* CACHED */)),
                    _createElementVNode("div", _hoisted_399, _toDisplayString(versionReport.branch || '—'), 1 /* TEXT */)
                  ]),
                  _createElementVNode("div", _hoisted_400, [
                    _cache[140] || (_cache[140] = _createElementVNode("div", { class: "text-[10px] text-gray-500 uppercase tracking-widest" }, "建议版本", -1 /* CACHED */)),
                    _createElementVNode("div", _hoisted_401, _toDisplayString(versionReport.upgrade_to || '—'), 1 /* TEXT */)
                  ]),
                  _createElementVNode("div", _hoisted_402, [
                    _cache[141] || (_cache[141] = _createElementVNode("div", { class: "text-[10px] text-gray-500 uppercase tracking-widest" }, "命中公告", -1 /* CACHED */)),
                    _createElementVNode("div", _hoisted_403, _toDisplayString(versionReport.total_affected || 0) + " / " + _toDisplayString(advisoryCount), 1 /* TEXT */)
                  ])
                ]),
                (versionReport.affected && versionReport.affected.length)
                  ? (_openBlock(), _createElementBlock("div", _hoisted_404, [
                      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(versionReport.affected, (adv) => {
                        return (_openBlock(), _createElementBlock("div", {
                          key: adv.cve,
                          class: "glass border border-red-400/20 rounded-2xl px-4 py-3"
                        }, [
                          _createElementVNode("div", _hoisted_405, [
                            _createElementVNode("div", _hoisted_406, [
                              _createElementVNode("div", _hoisted_407, _toDisplayString(adv.title), 1 /* TEXT */),
                              _createElementVNode("div", _hoisted_408, _toDisplayString(adv.cve) + " · 影响 " + _toDisplayString(adv.vulnerable_text || '—') + " · 修复 " + _toDisplayString(adv.not_vulnerable_text || '—'), 1 /* TEXT */)
                            ]),
                            _createElementVNode("span", {
                              class: _normalizeClass(["shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border", adv.severity === 'major' ? 'bg-red-500/15 text-red-200 border-red-400/40' : 'bg-amber-500/15 text-amber-200 border-amber-400/40'])
                            }, _toDisplayString(adv.severity), 3 /* TEXT, CLASS */)
                          ])
                        ]))
                      }), 128 /* KEYED_FRAGMENT */))
                    ]))
                  : (_openBlock(), _createElementBlock("div", _hoisted_409, " 当前版本未命中任何已知公告。 ")),
                _createElementVNode("p", _hoisted_410, [
                  _cache[142] || (_cache[142] = _createTextVNode(" 公告数据内嵌自 ", -1 /* CACHED */)),
                  _createElementVNode("span", _hoisted_411, _toDisplayString(versionReport.advisory_source || 'nginx.org'), 1 /* TEXT */),
                  _createTextVNode(" （生成于 " + _toDisplayString(versionReport.advisory_generated_at || '—') + "），比对在本机离线完成。 如需刷新公告库，运行 ", 1 /* TEXT */),
                  _cache[143] || (_cache[143] = _createElementVNode("code", { class: "font-mono text-emerald-300" }, "python3 scripts/gen_advisories.py", -1 /* CACHED */)),
                  _cache[144] || (_cache[144] = _createTextVNode(" 后重新编译。 ", -1 /* CACHED */))
                ])
              ]),
              _createElementVNode("div", _hoisted_412, [
                _createElementVNode("button", {
                  onClick: $event => (showVersionModal = false),
                  class: "w-full md:w-auto px-6 py-3 text-gray-400 hover:text-white transition font-bold"
                }, "关闭", 8 /* PROPS */, _hoisted_413),
                _createElementVNode("button", {
                  onClick: upgradeNginx,
                  disabled: installStatus.is_running,
                  class: "w-full md:w-auto btn-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg disabled:opacity-50"
                }, _toDisplayString(versionReport.vulnerable ? '立即升级到 ' + (versionReport.upgrade_to || '最新版') : '升级到最新'), 9 /* TEXT, PROPS */, _hoisted_414)
              ])
            ])
          ]))
        : _createCommentVNode("v-if", true)
    ], 64 /* STABLE_FRAGMENT */))
  }
}
})();
