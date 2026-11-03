// Lesson 1: Why the sky is blue (science-01).
// Reference lesson: shows the intended use of the kit (beats, Pop/Fade/Slide,
// Camera, local helper components, live-computed animation values).
import React from 'react';
import {
  Abs,
  Arrow,
  Bars,
  Bit,
  C,
  Camera,
  Counter,
  Em,
  Fade,
  Float,
  Glow,
  Ground,
  Headline,
  Label,
  List,
  Panel,
  Pop,
  Ring,
  Sfx,
  Slide,
  Token,
  Traveler,
  alpha,
  defineLesson,
  mix,
  progress,
  random,
  useBeats,
  useCurrentFrame,
} from '../src/kit';

// --- local helpers ---------------------------------------------------------

/** The colours of sunlight, long waves first. Wavelengths in nm. */
const SPECTRUM = [
  { name: 'red', nm: 700, color: C.red },
  { name: 'orange', nm: 610, color: C.orange },
  { name: 'yellow', nm: 580, color: C.yellow },
  { name: 'green', nm: 530, color: C.green },
  { name: 'blue', nm: 450, color: C.blue },
  { name: 'violet', nm: 400, color: C.purple },
];
/** Rayleigh: scattering grows as 1 / wavelength⁴ (relative to red). */
const scattering = (nm: number) => (700 / nm) ** 4;

/** A cartoon sun with slowly turning rays. */
const Sun: React.FC<{ size?: number; color?: string }> = ({ size = 200, color = C.yellow }) => {
  const frame = useCurrentFrame();
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{ overflow: 'visible' }}>
      <g transform={`rotate(${frame * 0.4})`}>
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x={-6} y={-96} width={12} height={26} rx={6} fill={color} transform={`rotate(${i * 30})`} />
        ))}
      </g>
      <circle r={62} fill={color} />
      <circle r={62} fill="none" stroke={alpha(C.white, 0.35)} strokeWidth={6} strokeDasharray="60 400" />
    </svg>
  );
};

/** A glass prism. */
const Prism: React.FC<{ size?: number }> = ({ size = 220 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M50 6 L94 90 L6 90 Z" fill={alpha(C.mist, 0.28)} stroke={C.cream} strokeWidth={3} strokeLinejoin="round" />
    <path d="M50 18 L30 70" stroke={alpha(C.white, 0.5)} strokeWidth={3} strokeLinecap="round" />
  </svg>
);

/** A travelling sine wave: `wavelength` and `amp` in px; it scrolls to the right. */
const Wave: React.FC<{ width: number; wavelength: number; amp?: number; color: string; speed?: number; stroke?: number }> = ({
  width,
  wavelength,
  amp = 50,
  color,
  speed = 3,
  stroke = 10,
}) => {
  const frame = useCurrentFrame();
  const phase = (frame * speed) / wavelength;
  const d = Array.from({ length: 121 }, (_, i) => {
    const x = (i / 120) * width;
    const y = amp + amp * Math.sin(2 * Math.PI * (x / wavelength - phase));
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={width} height={amp * 2 + stroke} style={{ overflow: 'visible' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" transform={`translate(0 ${stroke / 2})`} />
    </svg>
  );
};

/** A horizontal bracket showing one length, with a label above. */
const Span: React.FC<{ width: number; color: string; label: string }> = ({ width, color, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
    <Token text={label} color={color} textColor={C.ink} size={34} />
    <div style={{ width, height: 22, borderLeft: `5px solid ${color}`, borderRight: `5px solid ${color}`, position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 9, height: 5, background: color }} />
    </div>
  </div>
);

/** A two-atom molecule (N₂ or O₂). `shake` jiggles its electron cloud up and down, in px. */
const Molecule: React.FC<{ size?: number; color?: string; shake?: number; period?: number }> = ({
  size = 60,
  color = C.blue,
  shake = 0,
  period = 20,
}) => {
  const frame = useCurrentFrame();
  const dy = shake * Math.sin((2 * Math.PI * frame) / period);
  return (
    <svg width={size * 2} height={size * 2} viewBox="-60 -60 120 120" style={{ overflow: 'visible' }}>
      <circle cx={-14} cy={0} r={22} fill={color} />
      <circle cx={14} cy={0} r={22} fill={color} />
      <ellipse cx={0} cy={dy} rx={46} ry={34} fill="none" stroke={alpha(C.cream, 0.7)} strokeWidth={4} strokeDasharray="8 8" />
      <circle cx={-20} cy={-8} r={6} fill={alpha(C.white, 0.5)} />
    </svg>
  );
};

/** Rings of light spreading out from a point. `strength` 0..1 sets brightness and reach. */
const Radiate: React.FC<{ at: number; period: number; strength: number; color: string }> = ({ at, period, strength, color }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  return (
    <svg width={600} height={600} viewBox="-300 -300 600 600" style={{ overflow: 'visible' }}>
      {[0, 1, 2, 3].map((k) => {
        const t = (((frame - at) / period + k / 4) % 1 + 1) % 1;
        return <circle key={k} r={40 + t * 220} fill="none" stroke={color} strokeWidth={8 * strength + 2} opacity={(1 - t) * strength} />;
      })}
    </svg>
  );
};

/** A rounded window of sky. `sunset` 0..1 blends the day sky into a sunset. */
const SkyWindow: React.FC<{ w: number; h: number; sunset?: number; pale?: boolean }> = ({ w, h, sunset = 0, pale }) => {
  const top = mix(pale ? '#5aa8f0' : '#2f7fe0', '#3b2a78', sunset);
  const bottom = mix(pale ? '#cfe6fb' : '#8cc8ff', '#ff8a3d', sunset);
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 36,
        background: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`,
        boxShadow: `0 18px 40px ${alpha('#000000', 0.35)}, inset 0 0 0 6px ${alpha(C.white, 0.25)}`,
      }}
    />
  );
};

/** A jar of air: clear glass you can see straight through. */
const Jar: React.FC<{ size?: number }> = ({ size = 320 }) => (
  <svg width={size} height={size * 1.2} viewBox="0 0 100 120">
    <rect x={18} y={4} width={64} height={12} rx={4} fill={alpha(C.mist, 0.6)} />
    <rect x={10} y={16} width={80} height={100} rx={18} fill={alpha(C.white, 0.06)} stroke={C.cream} strokeWidth={3} />
    <path d="M22 30 L22 92" stroke={alpha(C.white, 0.45)} strokeWidth={4} strokeLinecap="round" />
  </svg>
);

/** The curve of the Earth with its thin shell of air, seen from space. */
const Earth: React.FC<{ r: number; air: number }> = ({ r, air }) => (
  <svg width={(r + air) * 2} height={(r + air) * 2} viewBox={`${-r - air} ${-r - air} ${(r + air) * 2} ${(r + air) * 2}`}>
    <circle r={r + air} fill={alpha(C.blue, 0.22)} />
    <circle r={r + air * 0.5} fill={alpha(C.blue, 0.12)} />
    <circle r={r} fill={C.green} />
    <circle r={r} fill="none" stroke={alpha(C.white, 0.3)} strokeWidth={8} />
  </svg>
);

// Air molecules for the close-up: seeded, so every render is identical.
const MOLECULES = Array.from({ length: 16 }, (_, i) => ({
  x: 420 + random(`mx${i}`) * 1080,
  y: 250 + random(`my${i}`) * 440,
  oxygen: random(`mo${i}`) < 0.22,
  tilt: random(`mt${i}`) * 180,
}));

// --- scenes ----------------------------------------------------------------

export default defineLesson({
  hook: () => {
    const b = useBeats();
    const frame = useCurrentFrame();
    const sunset = progress(frame, b[2], b[2] + 36);
    return (
      <>
        <Ground />
        {/* clear air… */}
        <Abs x={1180} y={420}>
          <Fade at={b[0]} out={b[1]}>
            <Pop at={b[0]}>
              <Jar />
            </Pop>
          </Fade>
        </Abs>
        <Abs x={1180} y={640}>
          <Fade at={b[0] + 10} out={b[1]}>
            <Label size={44}>a jar of air: see-through</Label>
          </Fade>
        </Abs>
        {/* …yet the sky is blue, then red */}
        <Abs x={1180} y={400}>
          <Pop at={b[1]}>
            <SkyWindow w={980} h={560} sunset={sunset} />
          </Pop>
        </Abs>
        <Sfx at={b[1]} name="swell" volume={0.25} />
        <Arrow from={[720, 140]} to={[1640, 660]} at={b[3]} color={alpha(C.yellow, 0.9)} width={18} head={false} z={5} />
        <Abs x={1180} y={760}>
          <Pop at={b[3] + 12}>
            <Token text="one sunbeam" size={40} />
          </Pop>
        </Abs>
        <Abs x={430} y={770}>
          <Slide at={0} from="left">
            <Bit size={200} color={C.teal} mood={frame < b[1] ? 'think' : 'wow'} look={[0.7, -0.8]} seed={1} idea={frame > b[3] + 12} />
          </Slide>
        </Abs>
      </>
    );
  },

  'white-light': () => {
    const b = useBeats();
    return (
      <>
        <Fade out={b[3]}>
          <Abs x={230} y={380}>
            <Pop at={b[0]}>
              <Sun size={240} />
            </Pop>
          </Abs>
          <Arrow from={[350, 380]} to={[800, 380]} at={b[0] + 10} color={C.cream} width={16} head={false} />
          <Abs x={570} y={300}>
            <Fade at={b[0] + 16}>
              <Label size={36} color={C.cream}>
                white sunlight
              </Label>
            </Fade>
          </Abs>
          <Abs x={860} y={380}>
            <Pop at={b[1]}>
              <Prism />
            </Pop>
          </Abs>
          {SPECTRUM.map((c, i) => (
            <Arrow key={c.name} from={[900, 380]} to={[1560, 180 + i * 80]} at={b[1] + 8 + i * 3} color={c.color} width={12} head={false} />
          ))}
          <Sfx at={b[1] + 8} name="whoosh" />
          {SPECTRUM.map((c, i) => (
            <Abs key={c.name} x={1660} y={180 + i * 80}>
              <Fade at={b[1] + 20 + i * 3}>
                <Label size={30} color={c.color}>
                  {c.name}
                </Label>
              </Fade>
            </Abs>
          ))}
          <Abs x={960} y={700}>
            <Pop at={b[2]}>
              <Headline size={64}>
                white = <Em>every colour</Em>, together
              </Headline>
            </Pop>
          </Abs>
        </Fade>
        {/* each colour is a wave; only the length differs */}
        <Fade at={b[3]} out={b[5]}>
          <Abs x={980} y={300}>
            <Wave width={1100} wavelength={300} color={C.red} />
          </Abs>
          <Abs x={980} y={600}>
            <Wave width={1100} wavelength={193} color={C.blue} />
          </Abs>
          <Abs x={300} y={300}>
            <Label size={44} color={C.red}>
              red
            </Label>
          </Abs>
          <Abs x={300} y={600}>
            <Label size={44} color={C.blue}>
              blue
            </Label>
          </Abs>
        </Fade>
        <Abs x={580} y={190}>
          <Fade at={b[4]} out={b[5]}>
            <Span width={300} color={C.red} label="≈ 700 nm" />
          </Fade>
        </Abs>
        <Abs x={527} y={490}>
          <Fade at={b[4] + 12} out={b[5]}>
            <Span width={193} color={C.blue} label="≈ 450 nm" />
          </Fade>
        </Abs>
        <Abs x={960} y={420}>
          <Pop at={b[5]}>
            <Panel w={1180} h={260} color={C.night2}>
              <Headline size={60}>
                1 nanometre = <Em>a billionth</Em> of a metre
              </Headline>
            </Panel>
          </Pop>
        </Abs>
        <Abs x={960} y={720}>
          <Fade at={b[5] + 15}>
            <Counter from={1} to={1_000_000_000} at={b[5] + 15} dur={45} size={64} suffix=" nm in a metre" />
          </Fade>
        </Abs>
      </>
    );
  },

  air: () => {
    const b = useBeats();
    const frame = useCurrentFrame();
    const dim = progress(frame, b[1], b[1] + 15) * (1 - progress(frame, b[2], b[2] + 15));
    return (
      <Camera keys={[[0, { s: 1 }], [b[3], { s: 1 }], [b[3] + 24, { x: 960, y: 470, s: 1.5 }], [b[4] + 20, { x: 960, y: 470, s: 1.5 }]]}>
        <Abs x={960} y={470}>
          <Pop at={b[0]}>
            <Panel w={1300} h={620} color={C.night2} />
          </Pop>
        </Abs>
        <Abs x={330} y={200} anchor="topleft">
          <Fade at={b[0] + 6} out={b[1]}>
            <Label size={36} color={C.mist}>
              air, up close
            </Label>
          </Fade>
        </Abs>
        {MOLECULES.map((m, i) => (
          <Abs key={i} x={m.x} y={m.y} rotate={m.tilt} opacity={1 - dim * 0.75}>
            <Pop at={b[0] + 8 + i * 2}>
              <Float amp={4} phase={i}>
                <Molecule size={28} color={m.oxygen ? C.pink : C.blue} />
              </Float>
            </Pop>
          </Abs>
        ))}
        <Abs x={1390} y={230}>
          <Fade at={b[0] + 30}>
            <div style={{ display: 'flex', gap: 20 }}>
              <Token text="nitrogen" color={C.blue} size={30} />
              <Token text="oxygen" color={C.pink} size={30} />
            </div>
          </Fade>
        </Abs>
        {/* size check: one molecule vs one wave */}
        <Fade at={b[1]} out={b[2]}>
          <Abs x={960} y={470}>
            <Wave width={1100} wavelength={1100} amp={130} color={C.cream} speed={0} stroke={8} />
          </Abs>
          <Abs x={960} y={130}>
            <Label size={38} color={C.cream}>
              one wave of blue light ≈ 450 nm
            </Label>
          </Abs>
          <Abs x={960} y={470}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: C.yellow }} />
          </Abs>
          <Abs x={960} y={470}>
            <Ring r={50} color={C.yellow} at={b[1] + 6} />
          </Abs>
          <Abs x={960} y={580}>
            <Token text="a molecule ≈ 0.3 nm" size={34} />
          </Abs>
        </Fade>
        {/* most light sails straight through */}
        <Fade at={b[2]} out={b[3]}>
          {[300, 420, 540, 660].map((y, i) => (
            <Traveler key={y} from={[280, y]} to={[1640, y]} at={b[2] + i * 5} period={50} count={3} color={C.cream} r={10} />
          ))}
        </Fade>
        {/* one wave meets one molecule: scattered */}
        <Traveler from={[280, 470]} to={[945, 470]} at={b[3]} period={30} loop={false} color={C.blue} r={14} />
        <Traveler from={[960, 470]} to={[1250, 260]} at={b[3] + 30} period={26} loop={false} color={C.blue} r={14} />
        <Abs x={960} y={470}>
          <Pop at={b[3]}>
            <Molecule size={44} color={C.blue} shake={frame > b[3] + 26 && frame < b[3] + 40 ? 10 : 0} period={6} />
          </Pop>
        </Abs>
        <Sfx at={b[3] + 30} name="click" volume={0.5} />
        <Abs x={960} y={640}>
          <Pop at={b[4]}>
            <Token text="scattering" size={44} color={C.blue} textColor={C.white} />
          </Pop>
        </Abs>
        <Sfx at={b[4]} name="pop" />
      </Camera>
    );
  },

  scattering: () => {
    const b = useBeats();
    const frame = useCurrentFrame();
    // Both molecules start radiating the same; from b[2] the fast-shaken one outshines the other.
    const split = progress(frame, b[2], b[2] + 30);
    const sides = [
      { x: 520, label: 'red: long wave', color: C.red, wavelength: 260, period: 30, strength: 0.45 - split * 0.25 },
      { x: 1400, label: 'blue: short wave', color: C.blue, wavelength: 167, period: 19, strength: 0.45 + split * 0.55 },
    ];
    return (
      <>
        <Abs x={960} y={130}>
          <Pop at={b[0]}>
            <Headline size={66}>
              short waves scatter <Em>far more</Em>
            </Headline>
          </Pop>
        </Abs>
        <Fade out={b[3]}>
          {sides.map((s, i) => (
            <React.Fragment key={s.label}>
              <Abs x={s.x} y={500}>
                <Pop at={b[1] + i * 6}>
                  <Panel w={760} h={560} color={C.night2} />
                </Pop>
              </Abs>
              <Abs x={s.x} y={500}>
                <Radiate at={b[1] + 20} period={s.period * 1.6} strength={s.strength} color={s.color} />
              </Abs>
              <Abs x={s.x - 230} y={500}>
                <Fade at={b[1] + i * 6}>
                  <Wave width={300} wavelength={s.wavelength} amp={30} color={s.color} speed={s.wavelength / s.period} stroke={8} />
                </Fade>
              </Abs>
              <Abs x={s.x} y={500}>
                <Pop at={b[1] + 10 + i * 6}>
                  <Molecule size={56} color={C.mist} shake={14} period={s.period} />
                </Pop>
              </Abs>
              <Abs x={s.x} y={300}>
                <Fade at={b[1] + i * 6}>
                  <Label size={38} color={s.color}>
                    {s.label}
                  </Label>
                </Fade>
              </Abs>
              <Abs x={s.x} y={730}>
                <Fade at={b[2] + i * 10}>
                  <Label size={34} color={C.mist}>
                    {i ? 'faster shaking → much brighter' : 'slow shaking → faint'}
                  </Label>
                </Fade>
              </Abs>
            </React.Fragment>
          ))}
        </Fade>
        <Sfx at={b[2] + 10} name="swell" volume={0.2} />
        {/* Rayleigh: 1 / wavelength⁴ */}
        <Fade at={b[3]}>
          <Abs x={700} y={590}>
            <Bars
              values={SPECTRUM.map((c) => scattering(c.nm))}
              labels={SPECTRUM.map((c) => c.name)}
              colors={SPECTRUM.map((c) => c.color)}
              width={900}
              height={420}
              at={b[3]}
              step={4}
              format={(v) => `${v.toFixed(1)}×`}
            />
          </Abs>
          <Abs x={700} y={225}>
            <Label size={34} color={C.mist}>
              how much each colour scatters, compared with red
            </Label>
          </Abs>
          <Abs x={1520} y={360}>
            <Pop at={b[3] + 10}>
              <Panel w={520} h={300} color={C.dusk} title="Rayleigh scattering">
                <Label size={36}>half the wavelength →</Label>
                <Counter from={1} to={16} at={b[3] + 30} dur={40} size={88} suffix="×" color={C.yellow} />
              </Panel>
            </Pop>
          </Abs>
        </Fade>
        <Abs x={1520} y={680}>
          <Pop at={b[4]}>
            <Token text="blue ≈ 6 × red" size={52} color={C.blue} textColor={C.white} />
          </Pop>
        </Abs>
        <Sfx at={b[4]} name="ding" volume={0.3} />
      </>
    );
  },

  'blue-sky': () => {
    const b = useBeats();
    const frame = useCurrentFrame();
    const moon = frame >= b[3];
    // Points along the sunbeam where blue light is knocked toward the viewer.
    const kicks = [0.2, 0.38, 0.56, 0.74].map((t) => [1560 - t * 1380, 200 + t * 120] as [number, number]);
    return (
      <>
        <Fade out={b[3]}>
          <Abs x={960} y={330}>
            <Fade at={b[2]}>
              <Glow r={900} color={C.blue} strength={0.55} />
            </Fade>
          </Abs>
          <Ground />
          <Abs x={1680} y={170}>
            <Pop at={b[0]}>
              <Sun size={190} />
            </Pop>
          </Abs>
          <Arrow from={[1580, 200]} to={[180, 320]} at={b[0] + 10} color={alpha(C.cream, 0.85)} width={18} head={false} />
          {kicks.map((p, i) => (
            <Traveler key={i} from={p} to={[470, 640]} at={b[1] + i * 6} period={36} count={2} color={C.blue} r={11} />
          ))}
          <Abs x={720} y={430}>
            <Fade at={b[1] + 20}>
              <Label size={34} color={C.mist}>
                scattered toward you
              </Label>
            </Fade>
          </Abs>
          <Abs x={1100} y={560}>
            <Pop at={b[2]}>
              <Headline size={60}>
                scattered light is <Em color={C.blue}>mostly blue</Em>
              </Headline>
            </Pop>
          </Abs>
          <Sfx at={b[2]} name="swell" volume={0.25} />
        </Fade>
        <Fade at={b[3]}>
          <Abs x={0} y={0} anchor="topleft">
            <div style={{ width: 1920, height: 1080, background: '#04050c' }} />
          </Abs>
          <Ground color={C.dim} />
          <Abs x={1680} y={170}>
            <Sun size={190} color={C.cream} />
          </Abs>
          <Abs x={1050} y={420}>
            <Pop at={b[3] + 8}>
              <Token text="the Moon: no air, nothing scatters → black sky" size={40} color={C.cream} />
            </Pop>
          </Abs>
        </Fade>
        <Abs x={470} y={760}>
          <Bit size={200} color={C.yellow} mood={moon ? 'wow' : frame > b[2] ? 'happy' : 'think'} look={[0.4, -0.9]} seed={3} />
        </Abs>
      </>
    );
  },

  sunset: () => {
    const b = useBeats();
    const frame = useCurrentFrame();
    const redden = progress(frame, b[2], b[2] + 40);
    const beam = mix(C.cream, C.orange, redden);
    // Points along the long sunset path where blue is scattered out of the beam.
    const peel = [0.15, 0.3, 0.45, 0.6, 0.75].map((t) => [180 + t * 720, 560 + t * 20] as [number, number]);
    return (
      <>
        <Abs x={960} y={1660}>
          <Earth r={1000} air={150} />
        </Abs>
        <Abs x={960} y={605}>
          <Pop at={b[0]}>
            <Bit size={90} color={C.yellow} mood={frame > b[2] ? 'happy' : 'think'} look={[-0.9, 0]} seed={7} />
          </Pop>
        </Abs>
        {/* noon: a short path straight down */}
        <Arrow from={[960, 330]} to={[960, 545]} at={b[0]} color={alpha(C.cream, 0.7)} width={14} head={false} />
        <Abs x={1130} y={420}>
          <Fade at={b[0] + 6}>
            <Label size={32} color={C.mist}>
              noon: short path
            </Label>
          </Fade>
        </Abs>
        {/* sunset: a long path through the air */}
        <Abs x={140} y={555}>
          <Pop at={b[0] + 14}>
            <Sun size={130} color={mix(C.yellow, C.red, redden)} />
          </Pop>
        </Abs>
        <Arrow from={[200, 558]} to={[905, 590]} at={b[0] + 20} color={beam} width={16} head={false} />
        <Abs x={540} y={660}>
          <Fade at={b[0] + 30}>
            <Label size={32} color={C.mist}>
              sunset: a long path through the air
            </Label>
          </Fade>
        </Abs>
        {peel.map((p, i) => (
          <Traveler key={i} from={p} to={[p[0] + 60 + random(`pe${i}`) * 120, 220 + random(`pf${i}`) * 80]} at={b[1] + i * 6} period={40} count={2} color={C.blue} r={10} />
        ))}
        <Abs x={540} y={200}>
          <Fade at={b[1] + 20}>
            <Label size={34} color={C.blue}>
              blue scattered away on the way
            </Label>
          </Fade>
        </Abs>
        <Abs x={1440} y={250}>
          <Pop at={b[2] + 10}>
            <SkyWindow w={520} h={300} sunset={redden} />
          </Pop>
        </Abs>
        <Sfx at={b[2] + 10} name="swell" volume={0.25} />
        <Abs x={1440} y={490}>
          <Slide at={b[3]} from="right">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
              <Token text="scattered → blue" size={38} color={C.blue} textColor={C.white} />
              <Token text="gets through → red" size={38} color={C.orange} />
            </div>
          </Slide>
        </Abs>
      </>
    );
  },

  'not-violet': () => {
    const b = useBeats();
    const frame = useCurrentFrame();
    const violet = SPECTRUM[5];
    const blue = SPECTRUM[4];
    return (
      <>
        <Abs x={960} y={140}>
          <Pop at={b[0]}>
            <Headline size={64}>
              shorter still… so why not <Em color={C.purple}>violet</Em>?
            </Headline>
          </Pop>
        </Abs>
        <Abs x={300} y={480}>
          <Slide at={b[0]} from="left">
            <Bit size={200} color={C.pink} mood={frame > b[3] ? 'happy' : 'think'} look={[0.8, -0.2]} seed={5} idea={frame > b[3]} />
          </Slide>
        </Abs>
        <Abs x={800} y={500}>
          <Fade at={b[1]} out={b[3]}>
            <Panel w={480} h={500} color={C.night2} title="in sunlight">
              <Bars values={[0.65, 1]} labels={['violet', 'blue']} colors={[violet.color, blue.color]} width={360} height={280} at={b[1]} showValues={false} />
            </Panel>
          </Fade>
        </Abs>
        <Abs x={1360} y={500}>
          <Fade at={b[2]} out={b[3]}>
            <Panel w={480} h={500} color={C.night2} title="what our eyes catch">
              <Bars values={[0.15, 1]} labels={['violet', 'blue']} colors={[violet.color, blue.color]} width={360} height={280} at={b[2]} showValues={false} />
            </Panel>
          </Fade>
        </Abs>
        <Abs x={1080} y={500}>
          <Pop at={b[3]}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <SkyWindow w={560} h={280} pale />
              <Token text="= a soft, pale blue" size={42} />
            </div>
          </Pop>
        </Abs>
        <Sfx at={b[3]} name="ding" volume={0.25} />
      </>
    );
  },

  recap: () => {
    const b = useBeats();
    return (
      <>
        <Abs x={960} y={170}>
          <Pop at={b[0]}>
            <Headline size={80}>
              The sky is <Em color={C.blue}>scattered sunlight</Em>
            </Headline>
          </Pop>
        </Abs>
        <Abs x={830} y={460}>
          <List
            items={['Sunlight = every colour, as waves', 'Air scatters short blue waves most', 'Sky: scattered blue · Sunset: the red that is left']}
            at={[b[0] + 20, b[1], b[2]]}
            size={46}
            width={1300}
          />
        </Abs>
        <Abs x={1660} y={460}>
          <Pop at={b[2]}>
            <Bit size={190} color={C.teal} mood="grin" idea seed={8} />
          </Pop>
        </Abs>
        <Abs x={960} y={760}>
          <Pop at={b[3]}>
            <Token text="NEXT IN SCIENCE  →  How a fridge makes cold" color={C.teal} textColor={C.white} size={40} />
          </Pop>
        </Abs>
        <Sfx at={b[3]} name="ding" volume={0.25} />
      </>
    );
  },
});
