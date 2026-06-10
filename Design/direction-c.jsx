/* ───────────────────────────────────────────────────────────
   Direction C — "Smart Sidebar"  ·  keep the familiar list, tame it
   Pinned favorites on top · compact density · categories that
   collapse to a count · a ⌘K command palette to jump anywhere.
   ─────────────────────────────────────────────────────────── */

function CFavRow({ c }){
  const voice = c.type==='voice';
  const G = voice ? I.volume : (c.glyph?I[c.glyph]:I.hash);
  return (
    <div className={`ch ${voice?'voice':'text'} ${c.state||''}`} style={{ padding:'5px 9px' }}>
      <span className="glyph"><G /></span>
      <span className="label">{c.name}</span>
      <span className="meta">
        {voice && c.members ? <><AvatarStack names={c.members} max={2}/><span className="occ">{c.members.length}</span></>
          : c.state==='mention' ? <span className="pill mention">{c.mentions}</span>
          : c.state==='unread' ? <span className="pill unread">3</span> : null}
        <span style={{ color:'var(--warn)', display:'flex' }}><I.star /></span>
      </span>
    </div>
  );
}

function CCat({ title, count, collapsed, voice, children }){
  return (
    <div>
      <div className={`cat ${collapsed?'collapsed':''}`} style={voice?{color:'var(--voice-ink)'}:null}>
        <span className="chev"><I.chevR /></span>{title}
        {collapsed ? <span className="count">{count}</span> : <span className="add"><I.plus/></span>}
      </div>
      {!collapsed && children}
    </div>
  );
}

function CRow({ name, type, glyph, state, mentions, members, lock }){
  const voice = type==='voice'; const G = voice?I.volume:(glyph?I[glyph]:I.hash);
  return (
    <div className={`ch ${voice?'voice':'text'} ${state||''}`} style={{ padding:'5px 9px' }}>
      <span className="glyph"><G /></span><span className="label">{name}</span>
      <span className="meta">
        {lock && <span style={{ color:'var(--c-ink-4)', display:'flex' }}><I.lock/></span>}
        {voice && members ? <><AvatarStack names={members} max={2}/><span className="occ">{members.length}</span></> : null}
        {state==='mention' && <span className="pill mention">{mentions}</span>}
        {state==='unread' && <span className="pill unread">5</span>}
      </span>
    </div>
  );
}

/* ── ⌘K command palette ──────────────────────────────────── */
function Hl({ text, q }){
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i<0) return <>{text}</>;
  return <>{text.slice(0,i)}<b style={{ color:'var(--accent-ink)', fontWeight:800 }}>{text.slice(i,i+q.length)}</b>{text.slice(i+q.length)}</>;
}
function CPalette(){
  const q = 'inc';
  const results = [
    { type:'text', name:'incidents', sec:'Development', state:'mention', sel:true },
    { type:'text', name:'incident-response', sec:'Development', lock:true },
    { type:'voice', name:'War Room', sec:'Development', members:['Priya Nair','Marcus Webb'] },
    { type:'text', name:'incident-postmortems', sec:'Archive' },
  ];
  return (
    <div style={{ position:'absolute', inset:0, zIndex:50, background:'rgba(20,20,30,.34)', backdropFilter:'blur(2px)', display:'flex', justifyContent:'center', alignItems:'flex-start', paddingTop:104 }}>
      <div style={{ width:580, background:'var(--c-bg)', borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-lg)', overflow:'hidden', border:'1px solid var(--c-border)' }}>
        {/* input */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 18px', borderBottom:'1px solid var(--c-border)' }}>
          <span style={{ color:'var(--c-ink-4)', display:'flex' }}><I.search style={{width:19,height:19}}/></span>
          <span style={{ fontSize:17, color:'var(--c-ink)', fontWeight:500, whiteSpace:'nowrap', flex:'1 1 auto' }}>{q}<span style={{ display:'inline-block', width:2, height:19, background:'var(--accent)', marginLeft:1, transform:'translateY(3px)' }} /></span>
          <span style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color:'var(--c-ink-4)', background:'var(--c-side-2)', border:'1px solid var(--c-border)', borderRadius:6, padding:'3px 8px', whiteSpace:'nowrap', flex:'0 0 auto' }}>Jump to</span>
        </div>
        {/* results */}
        <div style={{ padding:'8px 8px 6px' }}>
          <div style={{ fontSize:10.5, fontWeight:800, letterSpacing:'.08em', color:'var(--c-ink-4)', textTransform:'uppercase', padding:'6px 10px 4px' }}>Channels · 4</div>
          {results.map((r,i)=>{
            const voice = r.type==='voice'; const G=voice?I.volume:I.hash;
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:11, padding:'9px 11px', borderRadius:'var(--radius-sm)',
                background: r.sel?'var(--accent-soft)':'transparent' }}>
                <span style={{ display:'flex', color: voice?'var(--voice)':(r.sel?'var(--accent)':'var(--c-ink-4)') }}><G style={{width:16,height:16}}/></span>
                <span style={{ fontSize:14.5, fontWeight:600, color:'var(--c-ink)', whiteSpace:'nowrap', flex:'0 0 auto' }}><Hl text={r.name} q={q} /></span>
                {r.lock && <span style={{ color:'var(--c-ink-4)', display:'flex' }}><I.lock /></span>}
                {voice && <span style={{ fontSize:10, fontWeight:800, color:'var(--voice-ink)', background:'var(--voice-soft2)', borderRadius:20, padding:'1px 7px' }}>VOICE</span>}
                {r.state==='mention' && <span className="pill mention">2</span>}
                {voice && r.members && <div style={{ marginLeft:2 }}><AvatarStack names={r.members} max={3}/></div>}
                <span style={{ marginLeft:'auto', fontSize:12, color:'var(--c-ink-4)', fontWeight:500, whiteSpace:'nowrap' }}>{r.sec}</span>
                {r.sel && <span style={{ display:'flex', color:'var(--accent)' }}><I.enter /></span>}
              </div>
            );
          })}
        </div>
        {/* footer */}
        <div style={{ display:'flex', alignItems:'center', gap:16, padding:'10px 16px', borderTop:'1px solid var(--c-border)', background:'var(--c-side)', fontSize:11.5, color:'var(--c-ink-4)', fontWeight:500, flexWrap:'nowrap', whiteSpace:'nowrap' }}>
          <span style={{ display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}><b className="kbdk">↑</b><b className="kbdk">↓</b> navigate</span>
          <span style={{ display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}><b className="kbdk">↵</b> jump</span>
          <span style={{ display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}><b className="kbdk">⌘</b><b className="kbdk">P</b> filter voice</span>
          <span style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}><b className="kbdk">esc</b> close</span>
        </div>
      </div>
    </div>
  );
}

function DirectionC(){
  return (
    <div className="da">
      <Rail active="DV" />
      <div className="side dense">
        <div className="side-head"><span className="name"><span style={{ width:24, height:24, borderRadius:7, background:'var(--accent)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>DV</span>Devhouse</span><span className="badge">2.4k</span></div>
        <div className="cmdbar"><I.search /><span>Search or jump to…</span><span className="kbd"><b>⌘</b><b>K</b></span></div>
        <div className="side-scroll" style={{ paddingTop:2 }}>
          <div className="cat" style={{ color:'var(--warn)' }}><span style={{ display:'flex' }}><I.star /></span>Favorites</div>
          <CFavRow c={{ name:'general', type:'text', state:'active' }} />
          <CFavRow c={{ name:'incidents', type:'text', state:'mention', mentions:2 }} />
          <CFavRow c={{ name:'Pairing Room', type:'voice', members:['Priya Nair','Marcus Webb','Dana Olsson'] }} />

          <CCat title="Development" collapsed={false}>
            <CRow name="announcements" type="text" glyph="bell" />
            <CRow name="help" type="text" state="unread" />
            <CRow name="code-review" type="text" />
            <CRow name="deploys" type="text" lock />
          </CCat>
          <CCat title="Voice — Dev" voice collapsed={false}>
            <CRow name="Focus — no mic" type="voice" members={['Leah Kim']} />
            <CRow name="War Room" type="voice" />
          </CCat>
          <CCat title="Design" count={6} collapsed />
          <CCat title="Community" count={9} collapsed />
          <CCat title="Voice — Lounge" voice count={4} collapsed />
          <CCat title="Bots & Logs" count={5} collapsed />
          <CCat title="Archive" count={14} collapsed />
        </div>
        <UserFoot inVoice="Pairing Room · Dev" />
      </div>
      <ChatPane name="general" topic="Engineering general — keep it on-topic" />
      <CPalette />
    </div>
  );
}

window.DirectionC = DirectionC;
