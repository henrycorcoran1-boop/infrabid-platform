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
  var GREETING = "Hi — I'm the InfraBid support assistant. Ask me about tender reports, the live tender feed, Tom, pricing, your data, or a problem you've hit.";
  var SUGGESTIONS = [
    "How do tender reports work?",
    "What does InfraBid Pro cost?",
    "Where do the tenders come from?",
    "Are my documents kept private?"
  ];

  /* ---------- built-in knowledge base (offline / not-yet-deployed fallback) ----------
     Grounded in the live site content at www.infrabid.ie (swept 2026-08-22). */
  var KB = [
    { keys: ['price','pricing','cost','infrabid pro','plan','pay','month','much','€'],
      answer: "One plan: InfraBid Pro at €99.99 a month (ex VAT), billed monthly by card, cancel anytime. It includes 4 tender reports a month — that works out at €25 a report — plus every tool: Tom, the live tender feed, award intelligence, the programme tool and the bid book. Reruns of the same document are free, and the allowance resets each month (it doesn't roll over). Need more than 4 reports a month, or team pricing? Email info@infrabid.ie — the first 50 firms also get founding discounts in exchange for structured feedback." },
    { keys: ['tender report','report','estimate','bill','how it works','ten questions','price a bill','p50','p80','range','rerun','reruns'],
      answer: "Your pricing document in, a tender report out: upload the bill (Excel, CSV or PDF), answer ten questions about the job — company, location, contract form, return date, which trades you'll sublet, your margin — and every line comes back priced as a low/central/high range from Irish evidence, with P50 and P80 headline figures and commercial flags. The output is a PDF report on your name plus ready-to-send enquiry packs for each sublet trade. Anything the reader isn't confident about is routed to you for a look before it's priced, and reruns of the same document are free. Remember: it's an order-of-magnitude estimate and needs competent commercial review before anything is submitted." },
    { keys: ['format','pdf','excel','csv','xlsx','scan','scanned','upload','read','file'],
      answer: "The bill can be a PDF, Excel or CSV file. Excel and CSV are the most reliable; PDF reading is best effort, and scanned PDFs read poorly — if your document won't read, try an Excel or CSV export instead. Lines the reader isn't confident about are flagged for you to check before pricing, and every estimate can be exported back out to CSV with its full breakdown." },
    { keys: ['tenders','tender feed','etenders','ted','notice','notices','alert','county','counties','where do'],
      answer: "The live tender feed shows Irish public works out to tender now, sourced from contract notices on Tenders Electronic Daily (TED), the EU's open procurement record, filtered to Irish construction and refreshed through the day. Filter it to your county, trade and deadlines, then save that filter as an alert. InfraBid links out to eTenders for submissions — and to be straight about it, it doesn't claim complete coverage of every Irish tender." },
    { keys: [' tom','morning email','seven','7am','tender desk'],
      answer: "Tom is the Tender Opportunity Manager — he runs your tender desk. He reads every construction notice published in Ireland overnight, keeps the ones that suit your firm, and drops a single email at seven each morning to your registered address. He also prices bills from Irish evidence, tracks procurement schedules, manages your bid book, and he never invents a rate. Tom is included with InfraBid Pro." },
    { keys: ['cancel','cancellation','refund','unsubscribe','billing','stripe','apple','app store','card'],
      answer: "Subscribed on the web: cancel any time from Manage billing in Settings — your access runs to the end of the month you've paid for, nothing further is charged, and part-month fees aren't refunded. Subscribed through the Apple app: manage it in your Apple Account settings under Subscriptions — deleting the app does not cancel the subscription. For billing disputes, email info@infrabid.ie." },
    { keys: ['login','log in','sign in','signin','account','password','register','sign up'],
      answer: "The free tools need no account and no sign-in — the app opens straight to the tools, and your estimates are kept in browser storage on your device. An InfraBid Pro subscription does involve registering: your account holds the email where Tom's morning mail goes, and billing is managed from Settings. If you're locked out or can't sort a login, email info@infrabid.ie and a person will help, usually within one working day." },
    { keys: ['privacy','private','confidential','document','documents','data protection','gdpr','anthropic','cookie','cookies','track','secure','security','delete'],
      answer: "Your estimates and rates are kept in browser storage on your own device, and the site sets no advertising or analytics cookies and doesn't track you across other sites. For reading documents there are two paths: the on-device reader, where the file is never transmitted to anyone, and the AI reader, which sends the file to Anthropic for processing — InfraBid doesn't retain it, and Anthropic deletes it after a short abuse-monitoring period. The AI is never shown a rate and never produces a price. InfraBid doesn't sell personal data or train models on your commercial data. If a document may not lawfully leave your organisation, use the on-device reader. GDPR requests: info@infrabid.ie, answered within one month." },
    { keys: ['sync','device','devices','lost','disappear','disappeared','missing','gone','cleared','another computer'],
      answer: "Estimates, rate libraries and the programme are stored on the device you created them on — data doesn't sync between devices yet, so work done on one machine won't appear on another. Clearing your browser's site data also removes local drafts, so export anything important to CSV first. If something's missing on the same device and you haven't cleared data, email info@infrabid.ie." },
    { keys: ['notification','notifications','deadline alert','reminder','push'],
      answer: "If deadline alerts have stopped in the app, turn them back on in your device settings: Settings, then InfraBid, then Notifications, and switch Allow Notifications on. For alert emails from a saved tender filter, check the filter is still saved and your email address is right — or email info@infrabid.ie." },
    { keys: ['trial','free','sample','try','demo','preview'],
      answer: "There's no free trial, but you can see exactly what you'd get two ways: the How It Works page walks through the whole process, and there's a free sample tender report — a twelve-line drainage and watermain bill from Cork, priced through all six stages — downloadable without an account from the Sample Report page." },
    { keys: ['wrong','error','mistake','inaccurate','accurate','looks off','incorrect','quantity','quantities'],
      answer: "InfraBid produces order-of-magnitude estimates to support an estimator's judgement — never a bare number, always a range with flags. Quantities are taken on trust from the client's document, so check those first, then the confidence ratings and commercial flags. Reruns and corrections of the same document are free, and nothing should be submitted without line-by-line review by a competent person. If you think a figure is genuinely wrong, email info@infrabid.ie so the team can look at it." },
    { keys: ['directory','advertise','specialist','specialists','subcontractor','listing','trades directory'],
      answer: "The specialists directory will connect Irish subcontractors with main contractors during the pricing phase — your trade, the counties you cover, and your contact details, shown to contractors actively seeking quotes. It isn't live yet: you can register interest for free (nothing is charged and nothing committed), and the planned listing is €9.99 a month with no contract, cancellable any month. Listing will require public liability insurance, tax clearance and applicable registrations." },
    { keys: ['services','pmo','dashboard','programme','programming','schedule','scheduling','bespoke','software','consult'],
      answer: "Beyond the software, InfraBid offers professional services: full pricing and estimating (a bill priced end to end by people who've done it on site), PMO services and bespoke dashboards, project scheduling and construction programming, and bespoke construction software builds. Email info@infrabid.ie or use the enquiry form on the Services page." },
    { keys: ['human','person','agent','email','contact','phone','speak','talk','someone'],
      answer: "You can reach the team directly at info@infrabid.ie — a person answers, usually within one working day." }
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
    return "I didn't catch that one. I can help with tender reports, the live tender feed, Tom, InfraBid Pro pricing and billing, file formats, and how your data is handled — or email info@infrabid.ie to reach the team directly (a person answers, usually within one working day).";
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
