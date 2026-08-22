// InfraBid — AI Support Chat widget. Include after supabase-config.js and
// auth.js on every page. Renders a floating chat launcher that answers
// product and troubleshooting questions.
//
// How it answers:
//   1. If a Supabase project is configured, questions go to the support-chat
//      edge function (supabase/functions/support-chat), which calls the
//      Claude API server-side — the API key never reaches the browser.
//   2. If not (demo/dev mode), or if the function call fails, it falls back
//      to the built-in knowledge base below so the widget always responds.
//
// Signed-in users' transcripts are saved to the support_conversations table
// (see supabase/schema.sql) so recurring problems can be reviewed later.
(function(){
  "use strict";

  var STORAGE_KEY = 'infrabid_support_chat';
  var GREETING = "Hi — I'm the InfraBid support assistant. Ask me anything about the Valuation Suite, AI Takeoff, Tender Import, your rate library, pricing, or a problem you've hit.";
  var SUGGESTIONS = [
    "I can't log in",
    "Which drawing formats does AI Takeoff read?",
    "How do I price a client's BOQ?",
    "What does InfraBid cost?"
  ];

  /* ---------- built-in knowledge base (dev-mode / offline fallback) ---------- */
  var KB = [
    { keys: ['login','log in','password','sign in','signin','account','locked','forgot'],
      answer: "A few things to check: 1) Make sure your email and password are typed correctly (watch for caps lock). 2) If you signed up in a different browser, your session won't carry over — log in again on this one. 3) If this site is running in demo mode (no Supabase project connected), any email and password will log you in, and your data lives only in this browser. Still stuck? Email info@infrabid.ie and the team will reset you within one working day." },
    { keys: ['save','saved','saving','disappear','lost','missing','gone','persist'],
      answer: "Saving tenders, valuations, takeoff schedules, rate items, and tender imports requires being logged in — each account only sees its own data. In demo mode, data is stored in this browser only, so it won't follow you to another device or browser. If something you saved is missing, first confirm you're logged in with the same email you used when you saved it." },
    { keys: ['takeoff','drawing','dwg','dxf','pdf','cad','measure','format','upload'],
      answer: "AI Takeoff reads vector PDFs, DWG/DXF CAD exports, and NBS-structured specification documents. Scanned or photographed drawings won't parse — if a drawing isn't reading, re-export it as a vector PDF from your CAD package. Your drawings are processed in the browser and never uploaded; only the extracted measurement schedule is saved, and only if you choose to save it while signed in." },
    { keys: ['tender import','boq','bill of quantities','import','excel','xlsx','pricing document','client'],
      answer: "Open Tender Import and upload the client's pricing document — an Excel file or a text-based PDF with a tabular bill of quantities works best (scanned PDFs won't extract). InfraBid pulls out the BOQ rows and prices them against your rate library, then you set markup and contingency percentages and save the priced bill to your account." },
    { keys: ['rate','rates','library','ceca','line item'],
      answer: "Your rate library combines a built-in illustrative CECA-style rate set with custom line items you add yourself — each has a category, description, unit, and rate. Custom items are saved to your account (log in first) and are used automatically when Tender Import prices a bill of quantities." },
    { keys: ['valuation','estimate','margin','total'],
      answer: "In the Valuation Suite, enter your project inputs and InfraBid computes a calibrated estimate with total and margin, priced against the live merchant index. When you're logged in you can save each valuation result to your account and reload it later from the same page." },
    { keys: ['price','pricing','cost','tier','plan','subscription','pay','month'],
      answer: "InfraBid has three tiers: Starter at €199/month (solo estimators — up to 15 valuations a month, Leinster merchant index, PDF export), Professional at €350/month (unlimited valuations, national index, tender dossier compiler, 5 seats), and Enterprise at €950/month (custom integrations, dedicated success manager, SSO and audit controls, unlimited seats). There's no lock-in — you can change tier any month." },
    { keys: ['data','privacy','confidential','secure','security','gdpr','encrypt'],
      answer: "All drawings and ledgers are encrypted in transit and at rest, and each account's data is isolated — your project data is never used to price competitors' tenders. Enterprise adds SSO and full audit controls. For data-protection requests, email info@infrabid.ie." },
    { keys: ['region','leinster','munster','connacht','ulster','coverage','ireland'],
      answer: "The Starter tier covers the Leinster merchant index. Professional and Enterprise extend the national index across all Irish provinces, and bespoke regional integrations are available on request." },
    { keys: ['merchant','index','fresh','current','sweep','live'],
      answer: "Validation sweeps run daily across active merchant frameworks, so estimates reflect live, localized rates rather than outdated national average cost books." },
    { keys: ['human','person','agent','email','contact','phone','speak','talk','demo'],
      answer: "You can reach the team directly at info@infrabid.ie — they reply within one working day, and can also arrange a no-obligation walkthrough of your first tender." }
  ];

  function localAnswer(text){
    var t = ' ' + text.toLowerCase() + ' ';
    var best = null, bestScore = 0;
    KB.forEach(function(entry){
      var score = 0;
      entry.keys.forEach(function(k){ if(t.indexOf(k) !== -1) score += k.length; });
      if(score > bestScore){ bestScore = score; best = entry; }
    });
    if(best) return best.answer;
    return "I didn't catch that one. I can help with logging in, the Valuation Suite, AI Takeoff drawing formats, Tender Import, your rate library, pricing tiers, and data security — or email info@infrabid.ie to reach the team directly (replies within one working day).";
  }

  /* ---------- state ---------- */
  function loadState(){
    try{ var r = sessionStorage.getItem(STORAGE_KEY); if(r) return JSON.parse(r); }catch(e){}
    return { messages: [], conversationId: null };
  }
  function saveState(){
    try{ sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}
  }
  var state = loadState();

  function supabaseConfigured(){
    return !!window.SUPABASE_URL && window.SUPABASE_URL.indexOf('YOUR-PROJECT-REF') === -1;
  }
  function chatEndpoint(){
    if(window.SUPPORT_CHAT_URL) return window.SUPPORT_CHAT_URL;
    if(supabaseConfigured()) return window.SUPABASE_URL.replace(/\/$/,'') + '/functions/v1/support-chat';
    return null;
  }

  /* ---------- backend calls ---------- */
  async function askAssistant(){
    var endpoint = chatEndpoint();
    if(!endpoint) return localAnswer(lastUserMessage());
    var headers = { 'Content-Type': 'application/json' };
    if(window.SUPABASE_ANON_KEY){
      headers['apikey'] = window.SUPABASE_ANON_KEY;
      headers['Authorization'] = 'Bearer ' + window.SUPABASE_ANON_KEY;
    }
    try{
      var session = window.InfraBidAuth ? await window.InfraBidAuth.getSession() : null;
      if(session && session.access_token) headers['Authorization'] = 'Bearer ' + session.access_token;
      var res = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ messages: apiHistory() })
      });
      if(!res.ok) throw new Error('support-chat HTTP ' + res.status);
      var data = await res.json();
      if(data && typeof data.reply === 'string' && data.reply) return data.reply;
      throw new Error('support-chat: empty reply');
    }catch(e){
      console.warn('InfraBid support: falling back to built-in answers —', e);
      return localAnswer(lastUserMessage());
    }
  }

  // History for the API: drop the local greeting so it starts with a user turn.
  function apiHistory(){
    var msgs = state.messages.filter(function(m,i){ return !(i===0 && m.role==='assistant'); });
    return msgs.slice(-20).map(function(m){ return { role: m.role, content: m.content }; });
  }
  function lastUserMessage(){
    for(var i=state.messages.length-1;i>=0;i--){
      if(state.messages[i].role==='user') return state.messages[i].content;
    }
    return '';
  }

  // Best-effort transcript persistence for signed-in users.
  async function persistTranscript(){
    try{
      if(!window.InfraBidAuth) return;
      var session = await window.InfraBidAuth.getSession();
      if(!session) return;
      var client = window.InfraBidAuth.getClient();
      var page = window.location.pathname.split('/').pop() || 'index.html';
      if(state.conversationId){
        await client.from('support_conversations')
          .update({ messages: state.messages, updated_at: new Date().toISOString() })
          .eq('id', state.conversationId);
      } else {
        var res = await client.from('support_conversations')
          .insert({ page: page, messages: state.messages })
          .select();
        if(res && res.data && res.data[0] && res.data[0].id){
          state.conversationId = res.data[0].id;
          saveState();
        }
      }
    }catch(e){ /* transcript logging must never break the chat */ }
  }

  /* ---------- UI ---------- */
  var root, panel, launcher, msgList, form, input, sendBtn, chipRow;
  var busy = false;

  function el(tag, cls, text){
    var n = document.createElement(tag);
    if(cls) n.className = cls;
    if(text) n.textContent = text;
    return n;
  }

  function build(){
    root = el('div'); root.id = 'ib-support';

    launcher = el('button', null); launcher.id = 'ib-support-launcher';
    launcher.type = 'button';
    launcher.setAttribute('aria-label','Open support chat');
    launcher.setAttribute('aria-expanded','false');
    launcher.setAttribute('aria-controls','ib-support-panel');
    launcher.innerHTML =
      '<svg class="ic-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H4l2.2-2.8A8 8 0 1 1 21 12z"/><path d="M8.5 10.5h7M8.5 13.5h4.5"/></svg>' +
      '<svg class="ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

    panel = el('div'); panel.id = 'ib-support-panel';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label','InfraBid support chat');
    panel.hidden = true;

    var head = el('div','ibs-head');
    var headL = el('div','ibs-head-l');
    headL.innerHTML = '<span class="ibs-dot"></span>';
    var headTitle = el('div','ibs-title');
    headTitle.appendChild(el('b', null, 'InfraBid Support'));
    headTitle.appendChild(el('span','ibs-sub','AI assistant · answers in seconds'));
    headL.appendChild(headTitle);
    var newBtn = el('button','ibs-new','New chat');
    newBtn.type = 'button';
    newBtn.addEventListener('click', resetChat);
    head.appendChild(headL);
    head.appendChild(newBtn);

    msgList = el('div','ibs-msgs');
    msgList.setAttribute('aria-live','polite');

    chipRow = el('div','ibs-chips');
    SUGGESTIONS.forEach(function(s){
      var chip = el('button','ibs-chip', s);
      chip.type = 'button';
      chip.addEventListener('click', function(){ submitQuestion(s); });
      chipRow.appendChild(chip);
    });

    form = el('form','ibs-form');
    input = el('input');
    input.type = 'text';
    input.placeholder = 'Ask about a tool or a problem…';
    input.maxLength = 2000;
    input.setAttribute('aria-label','Your question');
    sendBtn = el('button','ibs-send');
    sendBtn.type = 'submit';
    sendBtn.setAttribute('aria-label','Send');
    sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>';
    form.appendChild(input);
    form.appendChild(sendBtn);
    form.addEventListener('submit', function(e){
      e.preventDefault();
      submitQuestion(input.value);
    });

    var foot = el('div','ibs-foot','AI answers can make mistakes — for a human, email info@infrabid.ie');

    panel.appendChild(head);
    panel.appendChild(msgList);
    panel.appendChild(chipRow);
    panel.appendChild(form);
    panel.appendChild(foot);

    root.appendChild(panel);
    root.appendChild(launcher);
    document.body.appendChild(root);

    launcher.addEventListener('click', toggle);
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && !panel.hidden) toggle();
    });

    if(!state.messages.length){
      state.messages.push({ role:'assistant', content: GREETING });
      saveState();
    }
    renderAll();
  }

  function toggle(){
    var open = panel.hidden;
    panel.hidden = !open;
    root.classList.toggle('open', open);
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', open ? 'Close support chat' : 'Open support chat');
    if(open){
      scrollToEnd();
      input.focus();
    }
  }

  function resetChat(){
    if(busy) return;
    state = { messages: [{ role:'assistant', content: GREETING }], conversationId: null };
    saveState();
    renderAll();
    input.focus();
  }

  function renderAll(){
    msgList.innerHTML = '';
    state.messages.forEach(function(m){ appendBubble(m.role, m.content); });
    chipRow.style.display = state.messages.length > 1 ? 'none' : '';
    scrollToEnd();
  }

  function appendBubble(role, text){
    var b = el('div','ibs-msg ' + (role === 'user' ? 'me' : 'bot'));
    // textContent + CSS white-space keeps this XSS-safe for both user and AI text.
    b.textContent = text;
    msgList.appendChild(b);
    return b;
  }

  function showTyping(){
    var t = el('div','ibs-msg bot ibs-typing');
    t.innerHTML = '<span></span><span></span><span></span>';
    msgList.appendChild(t);
    scrollToEnd();
    return t;
  }

  function scrollToEnd(){
    msgList.scrollTop = msgList.scrollHeight;
  }

  async function submitQuestion(text){
    text = (text || '').trim();
    if(!text || busy) return;
    busy = true;
    input.value = '';
    sendBtn.disabled = true;
    chipRow.style.display = 'none';

    state.messages.push({ role:'user', content: text });
    saveState();
    appendBubble('user', text);
    var typing = showTyping();

    var reply = await askAssistant();

    typing.remove();
    state.messages.push({ role:'assistant', content: reply });
    saveState();
    appendBubble('assistant', reply);
    scrollToEnd();

    busy = false;
    sendBtn.disabled = false;
    input.focus();
    persistTranscript();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
