/* ───────────────────────────────────────────────────────────
   Direction B — "Split Rooms"  ·  voice & text physically separated
   A segmented Text|Voice toggle swaps the sidebar (and main pane).
   Text mode = lean text-only list. Voice mode = rooms with live
   occupancy, rendered as a gallery — the strongest take on the
   voice/text distinction.
   ─────────────────────────────────────────────────────────── */

const B_TEXT = {
  Announcements: [ {name:'announcements', glyph:'bell'}, {name:'changelog'} ],
  Development: [ {name:'general', state:'active'}, {name:'help', state:'unread'}, {name:'code-review'}, {name:'deploys', lock:true}, {name:'incidents', state:'mention', mentions:3} ],
  Design: [ {name:'critique'}, {name:'showcase'}, {name:'resources'} ],
  Community: [ {name:'introductions'}, {name:'off-topic', state:'unread'}, {name:'jobs'}, {name:'showcase'} ],
};

const B_ROOMS = [
  { name:'Pairing Room', topic:'Dev', members:['Priya Nair','Marcus Webb','Dana Olsson'], speaking:'Priya Nair', sharing:'Marcus Webb', cap:8 },
  { name:'Design Critique', topic:'Design', members:['Leah Kim','Iris Bauer'], speaking:'Leah Kim', cap:8 },
  { name:'Coffee & Co-work', topic:'Community', members:['Tomas Reuben','Sam Cho','Owen Hart','Nadia Faraj','Theo Lang'], speaking:'Sam Cho', cap:12 },
  { name:'Focus — no mic', topic:'Quiet', members:['Dana Olsson'], cap:20 },
  { name:'Meeting Room', topic:'Private', members:[], lock:true, cap:6 },
  { name:'Game Night', topic:'Community', members:[], cap:12 },
];

function BToggle({ mode }){
  return (
    <div style={{ display:'flex', gap:4, margin:'12px 12px 4px', padding:4, background:'var(--c-side-2)', borderRadius:'var(--radius)', border:'1px solid var(--c-border)' }}>
      {[['text','Text','hash'],['voice','Voice','volume']].map(([id,lbl,g])=>{
        const on = id===mode; const G=I[g];
        const col = id==='voice'?'var(--voice)':'var(--accent)';
        return (
          <div key={id} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'7px 0', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:13.5, fontWeight:700,
            background: on?'var(--c-bg)':'transparent', color: on?col:'var(--c-ink-4)', boxShadow: on?'var(--shadow-sm)':'none' }}>
            <span style={{ display:'flex', color: on?col:'var(--c-ink-4)' }}><G /></span>{lbl}
            {id==='voice' && <span style={{ fontSize:10, fontWeight:800, color:'var(--voice-ink)', background:'var(--voice-soft2)', borderRadius:20, padding:'1px 6px' }}>11</span>}
          </div>
        );
      })}
    </div>
  );
}

function BCat({ title, children, count }){
  return (
    <div>
      <div className="cat"><span style={{ display:'flex' }}><I.chev /></span>{title}<span className="count">{count}</span></div>
      {children}
    </div>
  );
}

function DirectionBText(){
  return (
    <div className="da">
      <Rail active="DV" />
      <div className="side">
        <div className="side-head"><span className="name"><span style={{ width:24, height:24, borderRadius:7, background:'var(--accent)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>DV</span>Devhouse</span><span className="badge">2.4k</span></div>
        <BToggle mode="text" />
        <div className="cmdbar"><I.search /><span>Jump to channel</span><span className="kbd"><b>⌘</b><b>K</b></span></div>
        <div className="side-scroll">
          {Object.entries(B_TEXT).map(([cat,list])=>(
            <BCat title={cat} count={list.length} key={cat}>
              {list.map((c,i)=>{
                const G = c.glyph ? I[c.glyph] : I.hash;
                return (
                  <div className={`ch text ${c.state||''}`} key={i}>
                    <span className="glyph"><G /></span><span className="label">{c.name}</span>
                    <span className="meta">
                      {c.lock && <span style={{ color:'var(--c-ink-4)', display:'flex' }}><I.lock/></span>}
                      {c.state==='mention' && <span className="pill mention">{c.mentions}</span>}
                      {c.state==='unread' && <span className="pill unread">4</span>}
                    </span>
                  </div>
                );
              })}
            </BCat>
          ))}
        </div>
        <UserFoot inVoice="Pairing Room" />
      </div>
      <ChatPane name="general" topic="Engineering general — keep it on-topic" />
      <MemberList />
    </div>
  );
}

/* ── Voice mode ──────────────────────────────────────────── */
function BRoomRow({ r, active }){
  const joined = r.members.length>0;
  return (
    <div className="ch voice" style={{ alignItems:'flex-start', padding:'9px', background: active?'var(--voice-soft)':'transparent', borderRadius:'var(--radius-sm)' }}>
      <span className="glyph" style={{ marginTop:1 }}>{r.lock?<I.lock/>:<I.volume/>}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span className="label" style={{ fontWeight:600 }}>{r.name}</span>
          <span className="occ" style={{ marginLeft:'auto' }}>{joined?`${r.members.length}/${r.cap}`:`—/${r.cap}`}</span>
        </div>
        {joined
          ? <div style={{ marginTop:6 }}><AvatarStack names={r.members} max={5} /></div>
          : <div style={{ fontSize:11.5, color:'var(--c-ink-5)', marginTop:3 }}>Empty · tap to start</div>}
      </div>
    </div>
  );
}

function BParticipant({ name, speaking, sharing }){
  return (
    <div style={{ background:'var(--c-bg)', border:`2px solid ${speaking?'var(--voice)':'var(--c-border)'}`, borderRadius:'var(--radius)', padding:'18px 14px 12px',
      display:'flex', flexDirection:'column', alignItems:'center', gap:10, position:'relative', boxShadow:'var(--shadow-sm)' }}>
      {sharing && <span style={{ position:'absolute', top:9, left:9, fontSize:10, fontWeight:800, color:'#fff', background:'var(--live)', borderRadius:20, padding:'2px 8px', display:'flex', alignItems:'center', gap:4 }}><I.screen style={{width:11,height:11}} stroke="#fff"/>LIVE</span>}
      <div style={{ position:'relative' }}>
        <Avatar name={name} size="l" style={{ width:56, height:56, fontSize:20, boxShadow: speaking?'0 0 0 4px var(--voice-soft2)':'none' }} />
        <span style={{ position:'absolute', right:-2, bottom:-2, width:22, height:22, borderRadius:'50%', background: speaking?'var(--voice)':'var(--c-side-2)', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', color: speaking?'#fff':'var(--c-ink-4)' }}>
          {speaking ? <I.mic style={{width:11,height:11}}/> : <I.micOff style={{width:11,height:11}}/>}
        </span>
      </div>
      <span style={{ fontSize:13.5, fontWeight:600, color:'var(--c-ink)' }}>{name.split(' ')[0]}</span>
    </div>
  );
}

function DirectionBVoice(){
  const active = B_ROOMS[0];
  return (
    <div className="da">
      <Rail active="DV" />
      <div className="side">
        <div className="side-head"><span className="name"><span style={{ width:24, height:24, borderRadius:7, background:'var(--accent)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>DV</span>Devhouse</span><span className="badge">2.4k</span></div>
        <BToggle mode="voice" />
        <div className="side-scroll">
          <div className="cat" style={{ color:'var(--voice-ink)' }}>Active now <span className="count">3</span></div>
          {B_ROOMS.filter(r=>r.members.length).map((r,i)=><BRoomRow r={r} active={i===0} key={i} />)}
          <div className="cat">Open rooms <span className="count">3</span></div>
          {B_ROOMS.filter(r=>!r.members.length).map((r,i)=><BRoomRow r={r} key={i} />)}
        </div>
        <UserFoot inVoice="Pairing Room · Dev" />
      </div>

      {/* Main = the room you're in */}
      <div className="main">
        <div className="topbar">
          <div className="title"><span style={{ color:'var(--voice)', display:'flex' }}><I.volume /></span> {active.name}</div>
          <div className="topic">{active.members.length} connected · {active.topic}</div>
          <div className="actions">
            <button className="icon-btn"><I.users /></button>
            <button className="icon-btn"><I.settings /></button>
          </div>
        </div>
        <div style={{ flex:'1 1 auto', overflow:'hidden', padding:'22px 24px', display:'flex', flexDirection:'column', gap:18 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14 }}>
            <BParticipant name="Priya Nair" speaking />
            <BParticipant name="Marcus Webb" sharing />
            <BParticipant name="Dana Olsson" />
          </div>
          <div style={{ marginTop:'auto', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
            {[['mic','Mute',false],['video','Video',false],['screen','Share',false]].map(([g,lbl])=>{
              const G=I[g];
              return <button key={lbl} style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 18px', borderRadius:'var(--radius)', border:'1px solid var(--c-border-2)', background:'var(--c-bg)', color:'var(--c-ink-2)', fontWeight:600, fontSize:13.5, fontFamily:'inherit', cursor:'pointer' }}><span style={{display:'flex'}}><G style={{width:16,height:16}}/></span>{lbl}</button>;
            })}
            <button style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 22px', borderRadius:'var(--radius)', border:'none', background:'var(--live)', color:'#fff', fontWeight:700, fontSize:13.5, fontFamily:'inherit', cursor:'pointer' }}>Leave</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DirectionBText, DirectionBVoice });
