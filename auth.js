// InfraBid — shared Supabase auth helpers. Include after supabase-config.js
// and the Supabase JS CDN script, before any other page script.
(function(){
  var sb = null;
  var usingDevFallback = false;

  function isConfigured(){
    return !!window.SUPABASE_URL && window.SUPABASE_URL.indexOf('YOUR-PROJECT-REF') === -1;
  }

  // No real Supabase project wired up yet (or the CDN failed to load): fall back to a
  // browser-only, localStorage-backed mock so the product can still be demoed end to end.
  // Any email/password logs in. Swap in real supabase-config.js values to replace this
  // automatically — no other code needs to change.
  function createLocalDevClient(){
    var SESSION_KEY='infrabid_dev_session';
    function readSession(){ try{ var r=localStorage.getItem(SESSION_KEY); return r?JSON.parse(r):null; }catch(e){ return null; } }
    function writeSession(s){ try{ if(s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); }catch(e){} }
    function readTable(t){ try{ var r=localStorage.getItem('infrabid_dev_table_'+t); return r?JSON.parse(r):[]; }catch(e){ return []; } }
    function writeTable(t, rows){ try{ localStorage.setItem('infrabid_dev_table_'+t, JSON.stringify(rows)); }catch(e){} }
    var idSeed=1;
    function makeId(){ return 'dev-'+Date.now().toString(36)+'-'+(idSeed++); }

    function queryBuilder(table, op, payload){
      var filters=[], sort=null, limitN=null;
      var q={
        eq:function(col,val){ filters.push([col,val]); return q; },
        order:function(col,opts){ sort={ col:col, ascending: !opts || opts.ascending!==false }; return q; },
        limit:function(n){ limitN=n; return q; },
        select:function(){ return q; },
        then:function(resolve){
          var rows=readTable(table), result;
          if(op==='select'){
            var list=rows.filter(function(r){ return filters.every(function(f){ return String(r[f[0]])===String(f[1]); }); });
            if(sort){
              list=list.slice().sort(function(a,b){
                var av=a[sort.col], bv=b[sort.col];
                if(av===bv) return 0;
                var cmp=(av>bv)?1:-1;
                return sort.ascending?cmp:-cmp;
              });
            }
            if(limitN!=null) list=list.slice(0,limitN);
            result={ data:list, error:null };
          } else if(op==='insert'){
            var session=readSession();
            var row=Object.assign({ id:makeId(), user_id: session&&session.user?session.user.id:'dev-user', created_at:new Date().toISOString() }, payload);
            rows.push(row); writeTable(table, rows);
            result={ data:[row], error:null };
          } else if(op==='update'){
            rows=rows.map(function(r){
              var match=filters.every(function(f){ return String(r[f[0]])===String(f[1]); });
              return match ? Object.assign({}, r, payload) : r;
            });
            writeTable(table, rows);
            result={ data:null, error:null };
          } else if(op==='delete'){
            var kept=rows.filter(function(r){ return !filters.every(function(f){ return String(r[f[0]])===String(f[1]); }); });
            writeTable(table, kept);
            result={ data:null, error:null };
          }
          resolve(result);
        }
      };
      return q;
    }

    var authChangeCbs=[];
    function doSignIn(creds){
      var session={ user:{ id:'dev-user', email:(creds&&creds.email)||'demo@infrabid.ie' } };
      writeSession(session);
      authChangeCbs.forEach(function(cb){ cb('SIGNED_IN', session); });
      return Promise.resolve({ data:{ session:session, user:session.user }, error:null });
    }

    return {
      auth:{
        getSession:function(){ return Promise.resolve({ data:{ session:readSession() } }); },
        signInWithPassword:doSignIn,
        signUp:doSignIn,
        signOut:function(){
          writeSession(null);
          authChangeCbs.forEach(function(cb){ cb('SIGNED_OUT', null); });
          return Promise.resolve({ error:null });
        },
        onAuthStateChange:function(cb){ authChangeCbs.push(cb); return { data:{ subscription:{ unsubscribe:function(){} } } }; }
      },
      from:function(table){
        return {
          select:function(){ return queryBuilder(table,'select'); },
          insert:function(payload){ return queryBuilder(table,'insert',payload); },
          update:function(payload){ return queryBuilder(table,'update',payload); },
          delete:function(){ return queryBuilder(table,'delete'); }
        };
      }
    };
  }

  function client(){
    if(!sb){
      if(isConfigured() && window.supabase){
        sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      } else {
        if(!isConfigured()) console.warn('InfraBid auth: supabase-config.js has no real project URL/key yet — using local dev-mode login (any email/password), data stored in this browser only.');
        else console.warn('InfraBid auth: Supabase library failed to load — falling back to local dev-mode login.');
        usingDevFallback = true;
        sb = createLocalDevClient();
      }
    }
    return sb;
  }

  function isDevMode(){ client(); return usingDevFallback; }

  var UNAVAILABLE_ERROR = { message: 'Login is temporarily unavailable. Please refresh and try again.' };

  async function getSession(){
    try{
      var res = await client().auth.getSession();
      return res.data.session;
    }catch(e){
      console.error('InfraBid auth: getSession failed', e);
      return null;
    }
  }

  async function signUp(email, password){
    try{
      return await client().auth.signUp({ email: email, password: password });
    }catch(e){
      console.error('InfraBid auth: signUp failed', e);
      return { data: { session: null }, error: UNAVAILABLE_ERROR };
    }
  }

  async function signIn(email, password){
    try{
      return await client().auth.signInWithPassword({ email: email, password: password });
    }catch(e){
      console.error('InfraBid auth: signIn failed', e);
      return { data: { session: null }, error: UNAVAILABLE_ERROR };
    }
  }

  async function signOut(){
    try{ await client().auth.signOut(); }catch(e){ console.error('InfraBid auth: signOut failed', e); }
    window.location.href = 'login.html';
  }

  function onChange(cb){
    try{ client().auth.onAuthStateChange(function(_event, session){ cb(session); }); }
    catch(e){ console.error('InfraBid auth: onAuthStateChange unavailable', e); }
  }

  // Call on protected pages: redirects to login if there's no session.
  async function requireAuth(){
    var session = await getSession();
    if(!session){
      var next = encodeURIComponent(window.location.pathname.split('/').pop());
      window.location.href = 'login.html?next=' + next;
      return null;
    }
    return session;
  }

  // Call on every page to populate the nav's auth slot (desktop + mobile).
  async function initNavAuthUI(){
    var session = await getSession();
    renderNavAuthUI(session);
    onChange(renderNavAuthUI);
  }

  function renderNavAuthUI(session){
    var slots = document.querySelectorAll('[data-auth-slot]');
    slots.forEach(function(slot){
      if(session){
        var email = session.user && session.user.email ? session.user.email : 'Account';
        slot.innerHTML = '<span class="auth-email">' + escapeHtml(email) + '</span>' +
          '<button type="button" class="btn btn-ghost auth-logout-btn">Log Out</button>';
        var btn = slot.querySelector('.auth-logout-btn');
        if(btn) btn.addEventListener('click', signOut);
      } else {
        slot.innerHTML = '<a href="login.html" class="btn btn-ghost">Log In</a>';
      }
    });
  }

  function escapeHtml(s){
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  // Raw Supabase client, for pages that need to query tables directly.
  function getClient(){ return client(); }

  window.InfraBidAuth = {
    getSession: getSession,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    onChange: onChange,
    requireAuth: requireAuth,
    initNavAuthUI: initNavAuthUI,
    getClient: getClient,
    isDevMode: isDevMode
  };

  document.addEventListener('DOMContentLoaded', function(){
    initNavAuthUI();
    if(document.body.hasAttribute('data-requires-auth')){
      var main = document.getElementById('main');
      if(main) main.style.visibility = 'hidden';
      requireAuth().then(function(session){
        if(session && main) main.style.visibility = 'visible';
      });
    }
  });
})();
