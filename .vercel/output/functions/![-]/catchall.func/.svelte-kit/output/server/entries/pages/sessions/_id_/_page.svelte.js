import { c as create_ssr_component, b as subscribe, e as escape, f as add_attribute, d as each } from "../../../../chunks/ssr.js";
import { p as page } from "../../../../chunks/stores.js";
import { h as allCheckIns, s as sessions, m as members } from "../../../../chunks/stores2.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/state.svelte.js";
function formatDate(d) {
  return new Date(d).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  });
}
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let sid;
  let session;
  let checkIns;
  let checkinUrl;
  let qrUrl;
  let $allCheckIns, $$unsubscribe_allCheckIns;
  let $sessions, $$unsubscribe_sessions;
  let $page, $$unsubscribe_page;
  let $members, $$unsubscribe_members;
  $$unsubscribe_allCheckIns = subscribe(allCheckIns, (value) => $allCheckIns = value);
  $$unsubscribe_sessions = subscribe(sessions, (value) => $sessions = value);
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $$unsubscribe_members = subscribe(members, (value) => $members = value);
  sid = $page.params.id;
  session = $sessions.find((s) => s.id === sid);
  checkIns = $allCheckIns.filter((ci) => ci.sessionId === sid);
  checkinUrl = `/checkin/${sid}`;
  qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&color=1a1a1a&bgcolor=ffffff&data=${encodeURIComponent(checkinUrl)}`;
  $$unsubscribe_allCheckIns();
  $$unsubscribe_sessions();
  $$unsubscribe_page();
  $$unsubscribe_members();
  return `${!session ? `<div class="card text-center py-12"><p class="text-gray-500" data-svelte-h="svelte-yy8c7v">セッションが見つかりません</p> <button class="btn-primary mt-4" data-svelte-h="svelte-1q2f1n3">一覧へ</button></div>` : `<div class="space-y-4 max-w-md mx-auto"><div class="flex items-center gap-3"><button class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors" data-svelte-h="svelte-l4nu2f">←</button> <h1 class="text-xl font-bold text-gray-900 truncate">${escape(session.title)}</h1></div> <div class="card space-y-1.5"><div class="flex items-center gap-2 text-sm text-gray-600"><span data-svelte-h="svelte-1tqcvic">📅</span><span>${escape(formatDate(session.date))}</span></div> ${session.location ? `<div class="flex items-center gap-2 text-sm text-gray-600"><span data-svelte-h="svelte-m26kto">📍</span><span>${escape(session.location)}</span></div>` : ``} <div class="flex items-center gap-2 text-sm text-gray-600"><span data-svelte-h="svelte-o8q9lz">✅</span><span>${escape(checkIns.length)} 名チェックイン済み</span></div></div>  <div class="card text-center space-y-4"><div data-svelte-h="svelte-17oryxu"><h2 class="font-bold text-gray-800">チェックインQR</h2> <p class="text-xs text-gray-400 mt-0.5">メンバーにスキャンしてもらいます</p></div> <div class="flex justify-center"><div class="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 inline-block"><img${add_attribute("src", qrUrl, 0)} alt="QRコード" class="w-[200px] h-[200px] rounded-lg" loading="lazy"></div></div> <div class="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-500 font-mono break-all text-left">${escape(checkinUrl)}</div> <div class="flex gap-2"><button class="btn-primary flex-1" data-svelte-h="svelte-a2all2">📤 共有</button> <button class="${"btn-secondary flex-1 " + escape("", true)}">${escape("📋 コピー")}</button></div></div> ${checkIns.length > 0 ? `<div class="card"><h2 class="text-sm font-semibold text-gray-700 mb-3" data-svelte-h="svelte-hf3918">参加メンバー</h2> <div class="flex flex-wrap gap-1.5">${each(checkIns, (ci) => {
    let member = $members.find((m) => m.id === ci.memberId);
    return ` ${member ? `<span class="${"inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium " + escape(
      ci.gearType === "own" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700",
      true
    )}">${escape(member.name)} </span>` : ``}`;
  })}</div></div>` : ``} <button class="btn-primary w-full py-3" data-svelte-h="svelte-19ozr2">このセッションでチーム分けする →</button></div>`}`;
});
export {
  Page as default
};
