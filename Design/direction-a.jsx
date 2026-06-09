/* ───────────────────────────────────────────────────────────
   Direction A — "Sections"  ·  two-level navigation
   A slim section sub-rail folds the giant flat channel list into
   top-level groupings; only one section's channels show at a time.
   ─────────────────────────────────────────────────────────── */

const A_SECTIONS = [
  { id:'dev',   label:'Dev',     glyph:'</>',  desc:'Engineering & releases' },
  { id:'design',label:'Design',  glyph:'◑',    desc:'Product & brand design' },
  { id:'comm',  label:'Community',glyph:'◇',    desc:'General hangout' },
  { id:'events',label:'Events',  glyph:'▦',    desc:'Talks, AMAs & streams' },
  { id:'supp',  label:'Support', glyph:'?',    desc:'Help & troubleshooting' },
];

const A_CHANNELS = {
  text: [
    { name:'announcements', glyph:'bell', state:'' },
    { name:'general', state:'active' },
    { name:'release-notes', state:'' },
    { name:'code-review', state:'unread' },
    { name:'deploys', lock:true, state:'' },
    { name:'incidents', state:'mention', mentions:2 },
  ],
  voice: [
    { name:'Pairing Room', members:['Priya Nair','Marcus Webb','Dana Olsson'] },
    { name:'Focus — no mic', members:['Leah Kim'] },
    { name:'War Room', stage:true, members:[] },
  ],
};

function ASectionRail({ active }){
  return (
    <div style={{ width:88, flex:'0 0 88px', background:'var(--c-side-2)', borderRight:'1px solid var(--c-border)',
      display:'flex', flexDirection:'column', padding:'12px 0', gap:4, overflow:'hidden' }}>
      <div style={{ fontSize:10, fontWeight:800, letterSpacing:'.09em', color:'var(--c-ink-4)', textTransform:'uppercase', padding:'2px 0 8px', textAlign:'center' }}>Sections</div>
      {A_SECTIONS.map(s=>{
        const on = s.id===active;
        return (
          <div key={s.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'9px 6px', margin:'0 8px', borderRadius:'var(--radius)', cursor:'pointer',
            background: on?'var(--c-bg)':'transparent', boxShadow: on?'var(--shadow-sm)':'none', border: on?'1px solid var(--c-border)':'1px solid transparent', position:'relative' }}>
            {on && <span style={{ position:'absolute', left:-8, top:'50%', transform:'translateY(-50%)', width:3, height:24, borderRadius:'0 3px 3px 0', background:'var(--accent)' }} />}
            <div style={{ width:38, height:38, borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:16,
              background: on?'var(--accent)':'var(--c-side)', color: on?'#fff':'var(--c-ink-3)', border: on?'none':'1px solid var(--c-border)' }}>{s.glyph}</div>
            <span style={{ fontSize:11, fontWeight:on?700:600, color:on?'var(--c-ink)':'var(--c-ink-3)', whiteSpace:'nowrap' }}>{s.label}</span>
          </div>
        );
      })}
      <div className="spacer" />
      <div style={{ display:'flex', justifyContent:'center', padding:'4px 0' }}>
        <div className="rail-add" style={{ width:38, height:38, borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', border:'1px dashed var(--c-border-2)', color:'var(--voice)', cursor:'pointer' }}><I.plus /></div>
      </div>
    </div>
  );
}

function ATextRow({ c }){
  const G = c.glyph ? I[c.glyph] : I.hash;
  return (
    <div className={`ch text ${c.state}`}>
      <span className="glyph"><G /></span>
      <span className="label">{c.name}</span>
      <span className="meta">
        {c.lock && <span style={{ color:'var(--c-ink-4)', display:'flex' }}><I.lock /></span>}
        {c.state==='mention' && <span className="pill mention">{c.mentions}</span>}
        {c.state==='unread' && <span className="pill unread">7</span>}
      </span>
    </div>
  );
}

function AVoiceRow({ c }){
  const joined = c.members.length>0;
  return (
    <div>
      <div className={`ch voice ${joined?'':'empty'}`}>
        <span className="glyph">{c.stage?<I.stage/>:<I.volume/>}</span>
        <span className="label">{c.name}</span>
        <span className="meta">
          {c.stage && <span style={{ fontSize:10, fontWeight:700, color:'var(--voice-ink)', background:'var(--voice-soft2)', borderRadius:20, padding:'2px 7px', letterSpacing:'.03em' }}>STAGE</span>}
          {joined
            ? <><AvatarStack names={c.members} max={3} /><span className="occ">{c.members.length}</span></>
            : <span className="occ">— / 12</span>}
        </span>
      </div>
      {joined && (
        <div className="voice-members">
          {c.members.map((m,i)=>(
            <div className={`vm ${i===0?'speaking':''}`} key={i}>
              <Avatar name={m} size="s" />
              <span>{m.split(' ')[0]}</span>
              <span className="badges">{i===2 ? <span className="muted"><I.micOff/></span> : <I.mic/>}{i===0 && <I.screen/>}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DirectionA(){
  const sec = A_SECTIONS.find(s=>s.id==='dev');
  return (
    <div className="da">
      <Rail active="DV" />
      <ASectionRail active="dev" />
      <div className="side" style={{ width:236, flex:'0 0 236px' }}>
        <div className="side-head">
          <span className="name"><span style={{ width:24, height:24, borderRadius:7, background:'var(--accent)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>{sec.glyph}</span>{sec.label}</span>
          <span style={{ display:'flex', color:'var(--c-ink-4)' }}><I.chev /></span>
        </div>
        <div style={{ padding:'9px 14px 4px', fontSize:11.5, color:'var(--c-ink-4)', fontWeight:500 }}>{sec.desc} · 6 channels</div>
        <div className="side-scroll">
          <div className="cat">Text channels <span className="add"><I.plus/></span></div>
          {A_CHANNELS.text.map((c,i)=><ATextRow c={c} key={i} />)}
          <div className="cat" style={{ color:'var(--voice-ink)' }}>Voice channels <span className="add"><I.plus/></span></div>
          {A_CHANNELS.voice.map((c,i)=><AVoiceRow c={c} key={i} />)}
        </div>
        <UserFoot inVoice="Pairing Room · Dev" />
      </div>
      <ChatPane name="general" topic="Engineering general — keep it on-topic" count={6} />
      <MemberList />
    </div>
  );
}

window.DirectionA = DirectionA;
