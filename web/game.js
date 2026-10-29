
(() => {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  const $ = id => document.getElementById(id);

  const ui = {
    home: $("home-score"),
    away: $("away-score"),
    inning: $("inning-label"),
    balls: $("balls"),
    strikes: $("strikes"),
    outs: $("outs-display"),
    hits: $("hits"),
    homeRuns: $("home-runs"),
    rbi: $("rbi"),
    lastPlay: $("last-play"),
    message: $("game-message"),
    pitchStatus: $("pitch-status"),
    title: $("result-title"),
    text: $("result-text"),
    swing: $("swing-btn"),
    pitch: $("pitch-btn"),
    start: $("start-btn"),
    sound: $("sound-btn")
  };

  const state = {
    started: false,
    over: false,
    home: 0,
    away: 0,
    inning: 1,
    half: "BOTTOM",
    outs: 0,
    balls: 0,
    strikes: 0,
    hits: 0,
    homeRuns: 0,
    rbi: 0,
    pitch: null,
    pitchStart: 0,
    pitchDuration: 1500,
    pitchNumber: 0,
    lastPlay: "—",
    swinging: false,
    swingTime: 0,
    batAngle: 0,
    ballFlight: null,
    particles: [],
    soundOn: false,
    audio: null,
    lastFrame: 0,
    easterEgg: false
  };

  const W = canvas.width;
  const H = canvas.height;

  function roundedRect(x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function polygon(points, fill, stroke, lineWidth = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  function ellipse(x, y, rx, ry, fill, rotation = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function line(x1, y1, x2, y2, color, width = 1) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function text(str, x, y, size, color, align = "center", weight = "700") {
    ctx.font = `${weight} ${size}px system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, 250);
    sky.addColorStop(0, "#31516e");
    sky.addColorStop(.65, "#7895a7");
    sky.addColorStop(1, "#d4cbb0");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ellipse(785, 80, 34, 34, "#f6d58a");
    ellipse(785, 80, 45, 45, "#f6d58a24");

    polygon([[0, 135], [100, 95], [205, 126], [310, 83],
      [440, 128], [560, 87], [690, 124], [820, 90],
      [960, 126], [960, 240], [0, 240]], "#354d5c");

    polygon([[0, 163], [150, 133], [285, 164], [420, 127],
      [570, 159], [720, 131], [850, 162], [960, 137],
      [960, 258], [0, 258]], "#263e4c");

    drawStadium();
  }

  function drawStadium() {
    polygon([[0, 150], [960, 150], [960, 285], [0, 285]], "#263744");

    for (let row = 0; row < 5; row++) {
      const y = 165 + row * 18;
      const inset = row * 8;
      for (let x = -20 + inset; x < W; x += 28) {
        const colors = ["#bc7c59", "#e1c49b", "#9ca7a9", "#e4e4d7", "#657d8c"];
        ellipse(x, y, 5, 3.5, colors[(x + row * 13 + 2000) % colors.length | 0]);
      }
    }

    polygon([[0, 225], [180, 225], [480, 245], [780, 225], [960, 225],
      [960, 260], [0, 260]], "#15272c");

    roundedRect(30, 192, 180, 28, 3, "#172a3a");
    text("UKUBOT BALLPARK", 120, 210, 11, "#f6c453", "center", "900");

    roundedRect(755, 192, 175, 28, 3, "#172a3a");
    text("HOME OF THE HITTERS", 842, 210, 9, "#f4f0df", "center", "900");

    line(0, 244, 960, 244, "#9eaaad", 2);
  }

  function drawField() {
    const grass = ctx.createLinearGradient(0, 235, 0, H);
    grass.addColorStop(0, "#38764b");
    grass.addColorStop(1, "#173d2c");
    ctx.fillStyle = grass;
    ctx.fillRect(0, 230, W, H - 230);

    polygon([[480, 234], [900, 278], [960, 480], [960, 600],
      [0, 600], [0, 480], [60, 278]], "#286342");

    // Mowed grass lanes converge toward the outfield.
    for (let i = 0; i < 7; i++) {
      polygon([
        [480 + (i - 3) * 12, 235],
        [480 + (i - 3) * 60, 235],
        [480 + (i - 3) * 175, 600],
        [480 + (i - 3) * 110, 600]
      ], i % 2 ? "#32754a" : "#2c6b42");
    }

    // Infield dirt and the base paths.
    polygon([[480, 305], [630, 400], [480, 535], [330, 400]],
      "#bd9164", "#e4c39a", 2);

    polygon([[480, 318], [602, 400], [480, 510], [358, 400]],
      "#c9a078");

    polygon([[480, 334], [584, 400], [480, 490], [376, 400]],
      "#b9895e");

    // Pitcher's mound.
    ellipse(480, 365, 31, 12, "#d4b087");
    ellipse(480, 363, 25, 8, "#dfbd91");
    roundedRect(472, 361, 16, 4, 2, "#f7f0dc");

    // Base paths.
    line(480, 493, 355, 400, "#f2e7cf", 2);
    line(480, 493, 605, 400, "#f2e7cf", 2);
    line(355, 400, 480, 331, "#f2e7cf", 2);
    line(605, 400, 480, 331, "#f2e7cf", 2);

    drawBase(480, 331, 8);
    drawBase(355, 400, 10);
    drawBase(605, 400, 10);

    // Home plate.
    polygon([[480, 485], [493, 494], [490, 508], [470, 508], [467, 494]],
      "#f5f0df", "#c5c4b7", 1);

    // Foul lines.
    line(480, 494, 15, 274, "#eee6cf", 2);
    line(480, 494, 945, 274, "#eee6cf", 2);

    // Outfield wall.
    line(35, 278, 925, 278, "#182f38", 12);
    line(35, 272, 925, 272, "#648b75", 3);

    // Tiny hidden message on the wall.
    text("FOR AUSTIN", 480, 266, 7, "#e2c66c", "center", "900");

    drawPitcher();
    drawBatter();
    drawCatcher();
    drawUmpire();
  }

  function drawBase(x, y, size) {
    polygon([[x, y - size], [x + size, y], [x, y + size],
      [x - size, y]], "#f5f0df", "#c9c8bc", 1);
  }

  function drawPlayer(x, y, scale, jersey, pants, cap, facing = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * facing, scale);

    // Ground shadow.
    ellipse(0, 0, 22, 6, "#10251d77");

    // Legs and cleats.
    line(-7, -28, -12, -3, pants, 10);
    line(7, -28, 12, -3, pants, 10);
    line(-12, -3, -18, 0, "#202832", 7);
    line(12, -3, 18, 0, "#202832", 7);

    // Torso and arms.
    polygon([[-14, -57], [13, -57], [18, -29],
      [10, -23], [-10, -23], [-18, -29]], jersey, "#152638", 1);

    line(-12, -52, -21, -36, jersey, 8);
    line(12, -52, 20, -39, jersey, 8);
    ellipse(-21, -35, 4, 5, "#d7a27b");
    ellipse(20, -39, 4, 5, "#d7a27b");

    // Neck and head.
    roundedRect(-4, -64, 8, 10, 3, "#c58e6b");
    ellipse(0, -72, 12, 14, "#d5a17d");
    ellipse(-11, -72, 3, 5, "#d5a17d");

    // Helmet / cap.
    ellipse(0, -81, 13, 7, cap);
    polygon([[-12, -81], [13, -81], [18, -77], [-5, -76]], cap);

    // Face details.
    ellipse(5, -73, 1.4, 1.8, "#30251e");
    line(6, -67, 10, -68, "#8e5945", 1);

    // Jersey trim and number.
    line(-11, -52, 11, -52, "#ffffff88", 1.5);
    text("9", 0, -36, 11, "#ffffff", "center", "1000");

    ctx.restore();
  }

  function drawPitcher() {
    drawPlayer(480, 355, .72, "#e9e8e0", "#24344b", "#17243a", 1);

    // Throwing arm.
    line(488, 316, 501, 326, "#e9e8e0", 5);
    ellipse(502, 327, 4, 4, "#d7a27b");

    if (state.pitch && state.pitch.phase === "windup") {
      line(470, 316, 455, 307, "#e9e8e0", 5);
    }
  }

  function drawBatter() {
    // Batter appears large in the foreground, from the familiar hitting POV.
    drawPlayer(615, 558, 1.48, "#f2f0e8", "#26354a", "#16263b", -1);

    // Bat, animated through the swing.
    const angle = state.swinging ? state.batAngle : -.68;
    const shoulderX = 600;
    const shoulderY = 480;
    const batLength = 105;
    const endX = shoulderX + Math.cos(angle) * batLength;
    const endY = shoulderY + Math.sin(angle) * batLength;

    line(shoulderX, shoulderY, endX, endY, "#75472a", 10);
    line(shoulderX, shoulderY, endX, endY, "#d9b17a", 6);
    line(shoulderX + 7, shoulderY + 2, shoulderX + 19, shoulderY + 5,
      "#f0e0c4", 4);
    ellipse(shoulderX, shoulderY, 7, 7, "#d6a17d");

    // Batter's box.
    line(555, 520, 660, 520, "#f1e8d2", 2);
    line(555, 520, 555, 558, "#f1e8d2", 2);
    line(660, 520, 660, 558, "#f1e8d2", 2);
  }

  function drawCatcher() {
    drawPlayer(478, 513, .72, "#d9e0e7", "#1e2938", "#1c2836", 1);

    // Catcher's mask.
    ctx.strokeStyle = "#26313b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(478, 461, 10, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    line(468, 460, 488, 460, "#26313b", 1);
    line(478, 450, 478, 472, "#26313b", 1);
  }

  function drawUmpire() {
    drawPlayer(449, 516, .69, "#242a35", "#252b34", "#171e2a", 1);
  }

  function drawPitch() {
    if (!state.pitch) return;

    const p = state.pitch;
    const elapsed = performance.now() - state.pitchStart;
    const t = Math.min(1, elapsed / state.pitchDuration);

    if (p.phase === "flying") {
      const ease = t * t * (3 - 2 * t);
      const x = p.startX + (p.endX - p.startX) * ease;
      const y = p.startY + (p.endY - p.startY) * ease;
      const r = 3 + ease * 8;

      ellipse(x + 2, y + 3, r * 1.2, r * .8, "#15251c44");
      ellipse(x, y, r, r, "#fffdf0");
      line(x - r * .5, y - r * .6, x + r * .5, y + r * .6, "#d46e66", 1.2);

      p.x = x;
      p.y = y;

      if (t >= 1) finishPitch();
    }

    if (p.phase === "windup") {
      if (elapsed > 400) {
        p.phase = "flying";
        state.pitchStart = performance.now();
        state.pitchDuration = 1050 + Math.random() * 350;
        p.startX = 480 + (Math.random() - .5) * 16;
        p.startY = 348;
        p.endX = 550 + Math.random() * 65;
        p.endY = 482 + Math.random() * 40;
      }
    }
  }

  function drawFlight() {
    const f = state.ballFlight;
    if (!f) return;

    const elapsed = performance.now() - f.start;
    const t = Math.min(1, elapsed / f.duration);
    const ease = 1 - Math.pow(1 - t, 2);

    const x = f.x0 + (f.x1 - f.x0) * ease;
    const y = f.y0 + (f.y1 - f.y0) * ease - Math.sin(t * Math.PI) * f.height;
    const r = Math.max(2, 8 - t * 6);

    line(f.x0, f.y0, x, y, "#fff5d977", 2);
    ellipse(x, y, r, r, "#fffdf0");
    line(x - r * .5, y - r * .6, x + r * .5, y + r * .6, "#d46e66", 1);

    if (t >= 1) {
      if (f.homeRun) {
        addParticles(480, 240, 32);
      }
      state.ballFlight = null;
    }
  }

  function drawParticles() {
    state.particles = state.particles.filter(p => p.life > 0);

    for (const p of state.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += .08;
      p.life--;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ellipse(p.x, p.y, p.size, p.size, p.color);
    }
    ctx.globalAlpha = 1;
  }

  function addParticles(x, y, count) {
    const colors = ["#f6c453", "#f8f2dc", "#63cf9b", "#e88c6a"];
    for (let i = 0; i < count; i++) {
      const life = 25 + Math.random() * 40;
      state.particles.push({
        x, y,
        vx: (Math.random() - .5) * 7,
        vy: -Math.random() * 6,
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life,
        maxLife: life
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawField();
    drawFlight();
    drawPitch();
    drawParticles();

    if (state.easterEgg) {
      roundedRect(320, 18, 320, 38, 8, "#101b30e8");
      text("A LITTLE MESSAGE: FOR AUSTIN ❤️", 480, 42, 13, "#f6c453");
    }
  }

  function animate(now) {
    const dt = now - state.lastFrame;
    state.lastFrame = now;

    if (state.swinging) {
      const elapsed = now - state.swingTime;
      const progress = Math.min(1, elapsed / 350);
      state.batAngle = -.68 + progress * 1.85;
      if (progress >= 1) state.swinging = false;
    }

    draw();
    requestAnimationFrame(animate);
  }

  function updateUI() {
    ui.home.textContent = state.home;
    ui.away.textContent = state.away;
    ui.inning.textContent = `${state.half} ${state.inning}`;
    ui.balls.textContent = state.balls;
    ui.strikes.textContent = state.strikes;
    ui.hits.textContent = state.hits;
    ui.homeRuns.textContent = state.homeRuns;
    ui.rbi.textContent = state.rbi;
    ui.lastPlay.textContent = state.lastPlay;

    [...ui.outs.children].forEach((dot, i) => {
      dot.classList.toggle("active", i < state.outs);
    });

    ui.swing.disabled = !state.started || state.over || !state.pitch ||
      state.pitch.phase !== "flying" || state.pitch.swung;
    ui.pitch.disabled = !state.started || state.over || !!state.pitch;
  }

  function say(title, description, status) {
    ui.title.textContent = title;
    ui.text.textContent = description;
    ui.pitchStatus.textContent = status.toUpperCase();
  }

  function beginGame() {
    state.started = true;
    state.over = false;
    ui.message.classList.add("hidden");
    ui.start.textContent = "PLAY BALL";
    ui.swing.disabled = false;
    say("You're up!", "Watch the ball travel toward the plate and time your swing.", "Ready for the pitch");
    newPitch();
    updateUI();
  }

  function newPitch() {
    if (!state.started || state.over || state.pitch) return;

    state.pitchNumber++;
    state.pitch = {
      phase: "windup",
      swung: false,
      x: 480,
      y: 350
    };
    state.pitchStart = performance.now();
    state.pitchDuration = 1200;
    say("Here comes the pitch!", "Swing as the ball reaches the plate. Early or late swings are less likely to connect.", "Pitcher winding up");
    updateUI();
  }

  function swing() {
    if (!state.started || state.over || !state.pitch ||
        state.pitch.phase !== "flying" || state.pitch.swung) return;

    state.pitch.swung = true;
    state.swinging = true;
    state.swingTime = performance.now();
    state.batAngle = -.68;

    const p = state.pitch;
    const targetX = 590;
    const targetY = 510;
    const distance = Math.hypot(p.x - targetX, p.y - targetY);
    const timing = Math.abs(p.x - targetX) / 75 + Math.abs(p.y - targetY) / 100;
    const quality = Math.max(0, 1 - distance / 100);

    if (quality > .43 && timing < 1.25) {
      const roll = Math.random();
      let outcome;

      if (quality > .79 && roll < .34) {
        outcome = "homer";
      } else if (quality > .65 && roll < .72) {
        outcome = "double";
      } else if (roll < .83) {
        outcome = "single";
      } else {
        outcome = "out";
      }

      hitBall(outcome, quality);
    } else if (distance < 100) {
      if (Math.random() < .58) {
        state.strikes++;
        state.lastPlay = "FOUL";
        say("Foul ball!", "You got a piece of it, but the ball went foul.", "Foul ball");
        if (state.strikes >= 3) state.strikes = 2;
        finishAtBatDelay();
      } else {
        state.strikes++;
        state.lastPlay = "SWING & MISS";
        say("Swing and a miss!", "The pitcher got you that time. Reset and watch the next pitch.", "Strike");
        checkStrikeout();
        finishAtBatDelay();
      }
    } else {
      state.strikes++;
      state.lastPlay = "SWING & MISS";
      say("Too early or too late!", "Try swinging when the ball is closer to the batter.", "Strike");
      checkStrikeout();
      finishAtBatDelay();
    }

    updateUI();
  }

  function hitBall(outcome, quality) {
    state.pitch = null;
    const x0 = 590, y0 = 500;
    let x1 = 480, y1 = 240, height = 180;
    let duration = 750;
    let isHomer = false;

    if (outcome === "homer") {
      isHomer = true;
      state.homeRuns++;
      state.hits++;
      state.home += 1;
      state.rbi += 1;
      state.lastPlay = "HOME RUN";
      x1 = 480 + (Math.random() - .5) * 150;
      y1 = 80;
      height = 260;
      duration = 1000;
      say("HOME RUN!", "You crushed it! The crowd is going wild. One run scores.", "Home run");
      addParticles(480, 180, 26);
      maybeEasterEgg();
      playTone(660, .16);
      setTimeout(() => playTone(880, .22), 130);
    } else if (outcome === "double") {
      state.hits++;
      state.home += Math.random() < .3 ? 1 : 0;
      state.rbi += state.home > 0 ? 1 : 0;
      state.lastPlay = "DOUBLE";
      x1 = 270;
      y1 = 200;
      height = 220;
      say("That's a double!", "Solid contact! You drove the ball deep into the outfield.", "Double");
      playTone(520, .12);
    } else if (outcome === "single") {
      state.hits++;
      if (Math.random() < .18) {
        state.home++;
        state.rbi++;
      }
      state.lastPlay = "SINGLE";
      x1 = 350;
      y1 = 260;
      height = 130;
      say("Base hit!", "You found a gap in the defense. Nice swing!", "Single");
      playTone(440, .12);
    } else {
      state.outs++;
      state.strikes = 0;
      state.balls = 0;
      state.lastPlay = "OUT";
      x1 = 410;
      y1 = 260;
      height = 90;
      say("Caught in the air!", "The defense made the play. Get ready for the next batter.", "Fly out");
      playTone(220, .15);
      if (state.outs >= 3) nextHalfInning();
    }

    state.ballFlight = { x0, y0, x1, y1, height, duration, start: performance.now(), homeRun: isHomer };
    state.pitch = null;
    updateUI();

    setTimeout(() => {
      if (!state.over) {
        ui.pitch.disabled = false;
        ui.swing.disabled = true;
        say(ui.title.textContent, ui.text.textContent, "Ready for next pitch");
        updateUI();
      }
    }, duration + 150);
  }

  function finishPitch() {
    const p = state.pitch;
    if (!p || p.phase !== "flying") return;

    if (p.swung) return;

    state.pitch = null;

    // Pitches outside the strike zone become balls.
    const isBall = p.endX > 596 || p.endX < 560 || p.endY > 514 || p.endY < 478;

    if (isBall) {
      state.balls++;
      state.lastPlay = "BALL";
      say("Ball!", "That pitch missed the zone. Keep an eye on the count.", "Ball");
      if (state.balls >= 4) {
        state.balls = 0;
        state.strikes = 0;
        state.lastPlay = "WALK";
        say("Take your base!", "Four balls. You've earned a walk.", "Walk");
      }
    } else {
      state.strikes++;
      state.lastPlay = "CALLED STRIKE";
      say("Called strike!", "That one caught the zone. Look for a better pitch.", "Strike");
      checkStrikeout();
    }

    updateUI();
    ui.pitch.disabled = false;
  }

  function checkStrikeout() {
    if (state.strikes >= 3) {
      state.outs++;
      state.balls = 0;
      state.strikes = 0;
      state.lastPlay = "STRIKEOUT";
      say("Strike three!", "The batter is out. Step back up for the next at-bat.", "Strikeout");
      if (state.outs >= 3) nextHalfInning();
    }
  }

  function finishAtBatDelay() {
    state.pitch = null;
    setTimeout(() => {
      if (!state.over) updateUI();
    }, 450);
  }

  function nextHalfInning() {
    state.outs = 0;
    state.balls = 0;
    state.strikes = 0;

    if (state.half === "BOTTOM") {
      state.half = "TOP";
    } else {
      state.half = "BOTTOM";
      state.inning++;
    }

    if (state.inning > 9) {
      state.over = true;
      state.started = false;
      ui.message.classList.remove("hidden");
      ui.message.querySelector(".message-kicker").textContent = "FINAL SCORE";
      ui.message.querySelector("h2").textContent =
        state.home > state.away ? "HOME TEAM WINS!" :
        state.home < state.away ? "AWAY TEAM WINS!" : "IT'S A TIE!";
      ui.message.querySelector("p").textContent =
        `Home ${state.home} — Away ${state.away}. Start a new game to play again.`;
      ui.start.textContent = "NEW GAME";
      say("Game over!", "Thanks for playing Baseball by Ukubot.", "Final score");
    } else {
      say("New half-inning!", "The teams switch sides. Let's keep playing.", `${state.half} ${state.inning}`);
    }
    updateUI();
  }

  function maybeEasterEgg() {
    if (state.homeRuns >= 1 && !state.easterEgg) {
      state.easterEgg = true;
      say("A special home run!", "Look closely around the ballpark. There's a message hidden just for Austin.", "Easter egg found");
    }
  }

  function playTone(frequency, duration) {
    if (!state.soundOn) return;
    try {
      if (!state.audio) state.audio = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = state.audio.createOscillator();
      const gain = state.audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.08, state.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, state.audio.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(state.audio.destination);
      oscillator.start();
      oscillator.stop(state.audio.currentTime + duration);
    } catch (e) {}
  }

  function resetGame() {
    state.started = false;
    state.over = false;
    state.home = 0;
    state.away = 0;
    state.inning = 1;
    state.half = "BOTTOM";
    state.outs = 0;
    state.balls = 0;
    state.strikes = 0;
    state.hits = 0;
    state.homeRuns = 0;
    state.rbi = 0;
    state.pitch = null;
    state.pitchNumber = 0;
    state.lastPlay = "—";
    state.swinging = false;
    state.batAngle = -.68;
    state.ballFlight = null;
    state.particles = [];
    state.easterEgg = false;

    ui.message.classList.remove("hidden");
    ui.message.querySelector(".message-kicker").textContent = "WELCOME TO THE BALLPARK";
    ui.message.querySelector("h2").textContent = "YOUR AT-BAT STARTS NOW";
    ui.message.querySelector("p").textContent = "Watch the pitch. Time your swing. Send it deep.";
    ui.start.textContent = "PLAY BALL";

    say("Ready, batter?", "Wait for the pitcher, then swing at the right moment.", "Ready for the pitch");
    updateUI();
  }

  ui.start.addEventListener("click", beginGame);
  ui.swing.addEventListener("click", swing);
  ui.pitch.addEventListener("click", newPitch);
  $("reset-btn").addEventListener("click", resetGame);

  ui.sound.addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    ui.sound.textContent = `SOUND: ${state.soundOn ? "ON" : "OFF"}`;
    if (state.soundOn) playTone(440, .1);
  });

  canvas.addEventListener("click", () => {
    if (state.started && state.pitch && state.pitch.phase === "flying") swing();
  });

  document.addEventListener("keydown", event => {
    if (event.code === "Space" && state.started) {
      event.preventDefault();
      swing();
    }
    if (event.key.toLowerCase() === "n" && state.started && !state.pitch) {
      newPitch();
    }
  });

  resetGame();
  requestAnimationFrame(animate);
})();
