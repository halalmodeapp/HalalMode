/* Catches throwaway or mistyped email addresses before they reach the
 * waitlist. Mirrors public.waitlist_email_plausible() in
 * supabase/migrations/20261018120000_instant_waitlist_join.sql; keep the two
 * in step. check(email) returns { ok, suggestion }: when a common provider is
 * mistyped, `suggestion` is the corrected address. */
(function (root) {
  let GENERIC = ['com', 'net', 'org', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'name', 'pro', 'mobi', 'asia',
    'app', 'dev', 'online', 'site', 'store', 'shop', 'tech', 'xyz', 'club', 'blog', 'live', 'life',
    'email', 'cloud', 'page', 'space', 'website', 'world', 'one', 'family', 'love', 'studio',
    'design', 'media', 'news', 'agency', 'company', 'group', 'team', 'today', 'digital', 'network',
    'solutions', 'services', 'systems', 'consulting', 'academy', 'education', 'school', 'health',
    'care', 'law', 'legal', 'finance', 'money', 'capital', 'global', 'international', 'london',
    'nyc', 'paris', 'berlin', 'dubai', 'istanbul', 'africa', 'mail', 'me', 'icu', 'top', 'vip',
    'work', 'works', 'co', 'io', 'ai'];
  let BLOCKED = ['example.com', 'example.org', 'example.net', 'test.com', 'testing.com', 'domain.com',
    'fake.com', 'fakeemail.com', 'none.com', 'nomail.com', 'noemail.com', 'no.com', 'asdf.com',
    'qwerty.com', 'blah.com', 'blahblah.com', 'foo.com', 'bar.com', 'foobar.com',
    'mailinator.com', 'guerrillamail.com', 'sharklasers.com', '10minutemail.com', 'tempmail.com',
    'temp-mail.org', 'yopmail.com', 'trashmail.com', 'dispostable.com', 'getnada.com', 'maildrop.cc',
    'throwawaymail.com', 'fakeinbox.com', 'mintemail.com'];
  let TYPOS = {
    'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com',
    'hotmial.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
    'yahoo.con': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com',
    'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'iclod.com': 'icloud.com', 'icloud.con': 'icloud.com'
  };
  let JUNK_NAMES = ['asdf', 'asdfgh', 'asdfghjkl', 'qwerty', 'qwertyuiop', 'zxcv', 'hjkl', 'sdfg', 'test', 'testing',
    'fake', 'none', 'nothing', 'nobody', 'null', 'sample', 'example', 'lorem', 'ipsum'];
  let JUNK_LOCALS = ['test', 'asdf', 'qwerty', 'fake', 'none', 'nobody', 'null', 'sample', 'example', 'abc', 'xxx',
    'aaa', 'noreply', 'no-reply'];

  function check(input) {
    let v = String(input || '').trim().toLowerCase();
    let no = { ok: false, suggestion: '' };
    if (v.length < 6 || v.length > 254 || !/^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(v)) return no;
    let at = v.indexOf('@'), local = v.slice(0, at), domain = v.slice(at + 1);
    if (local.length > 64 || /(^\.|\.$|\.\.)/.test(local)) return no;
    if (TYPOS[domain]) return { ok: false, suggestion: local + '@' + TYPOS[domain] };
    let labels = domain.split('.');
    for (let i = 0; i < labels.length; i++) {
      if (!labels[i] || labels[i].length > 63 || /(^-|-$)/.test(labels[i])) return no;
    }
    let tld = labels[labels.length - 1], name = labels[labels.length - 2];
    if (!/^[a-z]{2,}$/.test(tld)) return no;
    if (tld.length > 2 && GENERIC.indexOf(tld) < 0) return no;
    if (['test', 'invalid', 'localhost', 'example', 'local'].indexOf(tld) >= 0) return no;
    if (BLOCKED.indexOf(domain) >= 0) return no;
    if (/^(blah)+$/.test(name) || /^(blah)+$/.test(local) || /(.)\1{3,}/.test(name) || /^(.)\1{3,}$/.test(local)) return no;
    if (name.length >= 5 && !/[aeiouy0-9]/.test(name)) return no;
    if (JUNK_NAMES.indexOf(name) >= 0) return no;
    if (JUNK_LOCALS.indexOf(local) >= 0 && name.length <= 4) return no;
    return { ok: true, suggestion: '' };
  }

  let api = { check: check };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HalalWaitlistEmail = api;
})(this);
