// InfraBid — shared Supabase auth helpers. Include after supabase-config.js
// and the Supabase JS CDN script, before any other page script.
(function(){
  var sb = null;
  function client(){
    if(!sb){
      if(!window.supabase){
        throw new Error('Supabase library failed to load (check network/CDN).');
      }
      if(!window.SUPABASE_URL || window.SUPABASE_URL.indexOf('YOUR-PROJECT-REF') !== -1){
        console.warn('InfraBid auth: supabase-config.js has no real project URL/key yet.');
      }
      sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }
    return sb;
  }

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
    getClient: getClient
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
