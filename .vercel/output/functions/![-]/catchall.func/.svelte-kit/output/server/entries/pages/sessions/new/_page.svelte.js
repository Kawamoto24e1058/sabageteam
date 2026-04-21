import { c as create_ssr_component, f as add_attribute, e as escape } from "../../../../chunks/ssr.js";
import "../../../../chunks/stores2.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/state.svelte.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let title = "";
  let date = today;
  let location = "";
  return `<div class="space-y-6 max-w-md mx-auto"><div class="flex items-center gap-3"><button class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors" data-svelte-h="svelte-1c88y30">←</button> <h1 class="text-xl font-bold text-gray-900" data-svelte-h="svelte-idy7ic">セッション作成</h1></div> <div class="card space-y-5"><div><label class="block text-sm font-medium text-gray-700 mb-1.5" for="title" data-svelte-h="svelte-1sa098i">タイトル <span class="text-red-500">*</span></label> <input id="title" type="text" placeholder="例: 春季定例戦 #4" class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 text-sm transition"${add_attribute("value", title, 0)}></div> <div><label class="block text-sm font-medium text-gray-700 mb-1.5" for="date" data-svelte-h="svelte-107wydb">日付 <span class="text-red-500">*</span></label> <input id="date" type="date" class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm transition"${add_attribute("value", date, 0)}></div> <div><label class="block text-sm font-medium text-gray-700 mb-1.5" for="location" data-svelte-h="svelte-16hoipk">場所 <span class="text-gray-400 text-xs font-normal">任意</span></label> <input id="location" type="text" placeholder="例: フィールドA" class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 text-sm transition"${add_attribute("value", location, 0)}></div> ${``} <button class="btn-primary w-full py-3 text-base" ${""}>${escape("セッションを作成")}</button></div></div>`;
});
export {
  Page as default
};
