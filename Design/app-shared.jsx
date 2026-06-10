/* ───────────────────────────────────────────────────────────
   Discordo Alt — shared chrome: icons, avatars, rail, chat, members
   Exposes components on window for the direction files to use.
   ─────────────────────────────────────────────────────────── */

/* ── Icon set (Lucide-ish, 1.7px stroke) ─────────────────── */
const I = {
  hash:   (p) => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/></svg>,
  lock:   (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>,
  volume: (p) => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12"/></svg>,
  stage:  (p) => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v3"/></svg>,
  chev:   (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 9l6 6 6-6"/></svg>,
  chevR:  (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 6l6 6-6 6"/></svg>,
  search: (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>,
  plus:   (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  star:   (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none" {...p}><path d="M12 2l2.9 6.3 6.8.7-5 4.6 1.4 6.7L12 17.8 5.9 20.3l1.4-6.7-5-4.6 6.8-.7z"/></svg>,
  starO:  (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" {...p}><path d="M12 3l2.7 5.8 6.3.6-4.7 4.3 1.3 6.2L12 17l-5.6 2.9 1.3-6.2L3 9.4l6.3-.6z"/></svg>,
  pin:    (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 4h6l-1 6 3 3H7l3-3-1-6zM12 16v5"/></svg>,
  bell:   (p) => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>,
  users:  (p) => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>,
  inbox:  (p) => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/></svg>,
  settings:(p)=> <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>,
  mic:    (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/></svg>,
  micOff: (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 2l20 20M9 9v2a3 3 0 0 0 5 2M15 9.3V5a3 3 0 0 0-5.7-1.3M5 10a7 7 0 0 0 11 5.5M12 19v3"/></svg>,
  headset:(p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2" y="13" width="5" height="7" rx="2"/><rect x="17" y="13" width="5" height="7" rx="2"/><path d="M22 18v1a3 3 0 0 1-3 3h-5"/></svg>,
  screen: (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  video:  (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M16 8l5-3v14l-5-3M2 6h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/></svg>,
  thread: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 11.5a8.5 8.5 0 0 1-12 7.7L3 21l1.8-6A8.5 8.5 0 1 1 21 11.5z"/></svg>,
  hashBox:(p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/></svg>,
  arrow:  (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  enter:  (p) => <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 10l-4 4 4 4M5 14h11a4 4 0 0 0 4-4V6"/></svg>,
  clock:  (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
};

/* ── Avatar (deterministic color from name) ──────────────── */
const AV_COLORS = ['#5750d6','#0e9f6e','#d98316','#d6457f','#3a86c8','#7a52c7','#c2553f','#2aa39a','#b0843a','#5a6acf'];
function avColor(name){ let h=0; for(let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))>>>0; return AV_COLORS[h%AV_COLORS.length]; }
function initials(name){ const p=name.trim().split(/\s+/); return (p[0][0]+(p[1]?p[1][0]:'')).toUpperCase(); }
function Avatar({ name, size='m', style }){
  return <div className={`av ${size}`} style={{ background: avColor(name), ...style }}>{initials(name)}</div>;
}
function AvatarStack({ names, size='s', max=4, onCard }){
  const shown = names.slice(0, max); const extra = names.length - shown.length;
  const px = size==='s'?22:size==='m'?30:40;
  return (
    <div className={`av-stack ${onCard?'on-card':''}`}>
      {shown.map((n,i)=><Avatar key={i} name={n} size={size} />)}
      {extra>0 && <div className="av-more" style={{ width:px, height:px }}>+{extra}</div>}
    </div>
  );
}

/* ── Community rail ──────────────────────────────────────── */
function Rail({ active='DV' }){
  const servers = [
    { id:'DV', label:'DV' }, { id:'UX', label:'UX' }, { id:'GG', label:'GG' },
    { id:'ML', label:'ML' }, { id:'IN', label:'IN' },
  ];
  return (
    <div className="rail">
      <div className="rail-item active" title="Direct messages" style={{ background:'#17171b', borderColor:'#17171b' }}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12 7.7L3 21l1.8-6A8.5 8.5 0 1 1 21 11.5z"/></svg>
      </div>
      <div className="rail-sep" />
      {servers.map(s => (
        <div key={s.id} className={`rail-item ${s.id===active?'active':''}`} title={s.label}>{s.label}</div>
      ))}
      <div className="rail-item rail-add" title="Add a community"><I.plus /></div>
      <div className="spacer" />
      <div className="rail-item" title="Settings" style={{ background:'transparent', border:'none' }}><I.settings /></div>
    </div>
  );
}

/* ── Chat pane (main content) ────────────────────────────── */
const SAMPLE_MSGS = [
  { who:'Priya Nair', when:'10:42 AM', role:['Maintainer','#5750d6'], lines:['Shipping the v3 sidebar refactor today — two-level nav is finally behind a flag.','If you are on the canary build, flip `nav.sections` on and tell me what breaks.'] },
  { who:'Marcus Webb', when:'10:44 AM', lines:['oh nice, the flat list was getting unmanageable past ~40 channels'] },
  { who:'Dana Olsson', when:'10:47 AM', role:['Design','#0e9f6e'], lines:['Pushed the spec to #showcase. The voice rooms now show live occupancy inline so you can see where people are without joining.'] },
  { who:'Marcus Webb', when:'10:49 AM', lines:['that occupancy preview is the part I wanted forever 🙌'] },
];
function ChatPane({ name='general', topic='Project announcements & release notes', glyph='hash', count }){
  const G = I[glyph] || I.hash;
  return (
    <div className="main">
      <div className="topbar">
        <div className="title"><span className="muted"><G /></span> {name}</div>
        <div className="topic">{topic}</div>
        <div className="actions">
          <button className="icon-btn"><I.thread /></button>
          <button className="icon-btn"><I.pin /></button>
          <button className="icon-btn"><I.bell /></button>
          <button className="icon-btn"><I.users /></button>
        </div>
      </div>
      <div className="chat">
        <div className="day-div">Today</div>
        {SAMPLE_MSGS.map((m,i)=>(
          <div className="msg" key={i}>
            <Avatar name={m.who} size="l" />
            <div className="body">
              <div className="head">
                <span className="who">{m.who}</span>
                {m.role && <span className="role" style={{ color:m.role[1], background:m.role[1]+'1c' }}>{m.role[0]}</span>}
                <span className="when">{m.when}</span>
              </div>
              <div className="text">{m.lines.map((l,j)=><p key={j}>{l}</p>)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="composer">
        <I.plus />
        <span>Message #{name}</span>
        <div className="send"><I.arrow /></div>
      </div>
    </div>
  );
}

/* ── Member list (right column) ──────────────────────────── */
const MEMBERS = {
  Maintainers: [ {n:'Priya Nair', s:'online'}, {n:'Sam Cho', s:'dnd'} ],
  Online: [ {n:'Marcus Webb', s:'online'}, {n:'Dana Olsson', s:'online'}, {n:'Leah Kim', s:'idle'}, {n:'Tomas Reuben', s:'online'}, {n:'Iris Bauer', s:'online'} ],
  Offline: [ {n:'Owen Hart', s:'offline'}, {n:'Nadia Faraj', s:'offline'}, {n:'Theo Lang', s:'offline'} ],
};
function MemberList(){
  return (
    <div className="members">
      {Object.entries(MEMBERS).map(([grp, list]) => (
        <div key={grp}>
          <div className="grp">{grp} — {list.length}</div>
          {list.map((m,i)=>(
            <div className="member" key={i}>
              <div className="av-wrap" style={{ opacity: m.s==='offline'?.5:1 }}>
                <Avatar name={m.n} size="m" />
                <span className={`dot ${m.s}`} />
              </div>
              <span className={`nm ${m.s==='offline'?'off':''}`}>{m.n}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── User footer (bottom of a sidebar) ───────────────────── */
function UserFoot({ inVoice }){
  return (
    <div style={{ flex:'0 0 auto', borderTop:'1px solid var(--c-border)', padding:'9px 10px', display:'flex', flexDirection:'column', gap:8 }}>
      {inVoice && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', borderRadius:'var(--radius-sm)', background:'var(--voice-soft)' }}>
          <span style={{ display:'flex', color:'var(--voice-ink)' }}><I.volume /></span>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12.5, fontWeight:700, color:'var(--voice-ink)', whiteSpace:'nowrap' }}>Voice connected</div>
            <div style={{ fontSize:11, color:'var(--c-ink-4)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{inVoice}</div>
          </div>
          <button className="icon-btn" style={{ marginLeft:'auto', width:28, height:28 }}><I.screen /></button>
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:9, padding:'4px 4px' }}>
        <div className="av-wrap"><Avatar name="You Alvarez" size="m" /><span className="dot online" /></div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--c-ink)', lineHeight:1.1 }}>you</div>
          <div style={{ fontSize:11, color:'var(--c-ink-4)' }}>Online</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:2, color:'var(--c-ink-4)' }}>
          <button className="icon-btn" style={{ width:28, height:28 }}><I.mic /></button>
          <button className="icon-btn" style={{ width:28, height:28 }}><I.headset /></button>
          <button className="icon-btn" style={{ width:28, height:28 }}><I.settings /></button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { I, Avatar, AvatarStack, avColor, initials, Rail, ChatPane, MemberList, UserFoot, SAMPLE_MSGS, MEMBERS });
