// === AUDIO SETUP ===
const audio = new Audio('assets/sounds/caution.mp3');
audio.loop = true;
audio.volume = 0;
audio.currentTime = 155.5;

const beamSound = new Audio('assets/sounds/beam.mp3');
beamSound.loop = true;
beamSound.volume = 0.18;

const starSound = new Audio('assets/sounds/star.mp3');
starSound.volume = 0.56;

let gameStarted = false;
let gameOver = false;
let score = 0;
let highestScore = localStorage.getItem('highestScore') || 0;
let missedStars = 0;
let beam = null;

const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x060a18,
});
document.body.appendChild(app.view);

const centerX = app.screen.width / 2;
const bottomY = app.screen.height - 100;
const shipSize = 60;

// === START MENU ===
const startMenu = new PIXI.Container();
app.stage.addChild(startMenu);

const title = new PIXI.Text("Shooting Stars", {
  fontFamily: "Arial",
  fontSize: 48,
  fill: 0xffffff,
});
title.anchor.set(0.5);
title.x = app.screen.width / 2;
title.y = 120;
startMenu.addChild(title);

function createButton(label, y, callback) {
  const btn = new PIXI.Container();
  const bg = new PIXI.Graphics();
  bg.beginFill(0x222222);
  bg.drawRoundedRect(-100, -25, 200, 50, 10);
  bg.endFill();
  btn.addChild(bg);

  const text = new PIXI.Text(label, {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0xffffff,
  });
  text.anchor.set(0.5);
  btn.addChild(text);

  btn.x = app.screen.width / 2;
  btn.y = y;
  btn.interactive = true;
  btn.buttonMode = true;
  btn.on('pointerdown', callback);
  startMenu.addChild(btn);
}

createButton("Play", 200, startGame);
createButton("Settings", 270, () => alert("Settings not implemented yet."));
createButton("Quit", 340, () => alert("You can't quit this universe!"));

function fadeInAudio(audio, duration = 3000) {
  let step = 0.02;
  const interval = setInterval(() => {
    if (audio.volume < 1.0) {
      audio.volume = Math.min(audio.volume + step, 1.0);
    } else {
      clearInterval(interval);
    }
  }, duration * step);
}

function startGame() {
  startMenu.visible = false;
  gameStarted = true;
  fadeInAudio(audio);
  audio.play();
}

// === MAIN GAME ===
PIXI.Assets.load('assets/images/spaceship_1.webp').then((texture) => {
  const ship = new PIXI.Sprite(texture);
  ship.width = shipSize;
  ship.height = shipSize;
  ship.scale.set(0.1);
  ship.anchor.set(0.5, 1);
  ship.x = centerX;
  ship.y = bottomY;
  app.stage.addChild(ship);

  let rotationSpeed = 0;
  app.ticker.add(() => {
    if (!gameOver && gameStarted) {
      ship.rotation += rotationSpeed;
    }
  });

  const scoreText = new PIXI.Text("Score: 0", {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0xffffff,
  });
  scoreText.x = 20;
  scoreText.y = 20;
  app.stage.addChild(scoreText);

  const highScoreText = new PIXI.Text(`High Score: ${highestScore}`, {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0x00ffcc,
  });
  highScoreText.x = 20;
  highScoreText.y = 50;
  app.stage.addChild(highScoreText);

  const missedText = new PIXI.Text("Missed: 0", {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0xffcc00,
  });
  missedText.x = 20;
  missedText.y = 80;
  app.stage.addChild(missedText);

  const gameOverText = new PIXI.Text('Game Over\nPress R to Restart', {
    fontFamily: 'Arial',
    fontSize: 48,
    fill: 0xff0000,
    align: 'center',
  });
  gameOverText.anchor.set(0.5);
  gameOverText.x = app.screen.width / 2;
  gameOverText.y = app.screen.height / 2;
  gameOverText.visible = false;
  app.stage.addChild(gameOverText);

  const stars = [];

  function createStar() {
    if (gameOver || !gameStarted) return;

    const star = new PIXI.Graphics();
    drawStar(star, 0, 0, 5, 20, 10);
    star.endFill();
    star.x = Math.random() * app.screen.width;
    star.y = -10;
    app.stage.addChild(star);
    stars.push(star);
  }

  function drawStar(graphics, x, y, points, outerRadius, innerRadius) {
    graphics.beginFill(0xffff00);
    const step = Math.PI / points;
    graphics.moveTo(x + outerRadius, y);
    for (let i = 0; i < 2 * points; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = i * step;
      graphics.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
    }
    graphics.closePath();
  }

  setInterval(createStar, 1000);

  function shootBeam() {
    if (beam) app.stage.removeChild(beam);

    const beamLength = 1000;
    const beamWidth = shipSize;

    beam = new PIXI.Graphics();
    beam.beginFill(0xff0000);
    beam.drawRect(-beamWidth / 2, -beamLength, beamWidth, beamLength);
    beam.endFill();

    const angle = ship.rotation;
    const xOffset = 0;
    const yOffset = -shipSize;

    beam.x = ship.x + Math.cos(angle) * xOffset - Math.sin(angle) * yOffset;
    beam.y = ship.y + Math.sin(angle) * xOffset + Math.cos(angle) * yOffset;
    beam.rotation = angle;

    app.stage.addChild(beam);

    beamSound.currentTime = 0;
    beamSound.play();

    setTimeout(() => {
      if (beam && beam.parent) app.stage.removeChild(beam);
      beam = null;
      beamSound.pause();
      beamSound.currentTime = 0;
    }, 200);
  }

  app.ticker.add(() => {
    if (gameOver || !gameStarted) return;

    for (let i = stars.length - 1; i >= 0; i--) {
      const star = stars[i];
      star.y += 1;

      if (beam && hitTestBeam(star, beam)) {
        app.stage.removeChild(star);
        stars.splice(i, 1);
        score++;
        scoreText.text = `Score: ${score}`;
        starSound.currentTime = 0;
        starSound.play();
        continue;
      }

      if (hitTestRectangle(star, ship)) {
        triggerGameOver();
        break;
      }

      if (star.y > app.screen.height) {
        app.stage.removeChild(star);
        stars.splice(i, 1);
        missedStars++;
        missedText.text = `Missed: ${missedStars}`;
        if (missedStars >= 10) {
          triggerGameOver();
          break;
        }
      }
    }
  });

  function hitTestBeam(star, beam) {
    const starBounds = star.getBounds();
    const starCenter = new PIXI.Point(
      starBounds.x + starBounds.width / 2,
      starBounds.y + starBounds.height / 2
    );
    const local = beam.toLocal(starCenter);
    const bw = beam.width;
    const bh = beam.height;
    return local.x >= -bw / 2 && local.x <= bw / 2 && local.y >= -bh && local.y <= 0;
  }

  function hitTestRectangle(r1, r2) {
    const r1Bounds = r1.getBounds();
    const r2Bounds = r2.getBounds();
    return (
      r1Bounds.x + r1Bounds.width > r2Bounds.x &&
      r1Bounds.x < r2Bounds.x + r2Bounds.width &&
      r1Bounds.y + r1Bounds.height > r2Bounds.y &&
      r1Bounds.y < r2Bounds.y + r2Bounds.height
    );
  }

  function triggerGameOver() {
    gameOver = true;
    gameOverText.visible = true;
    audio.pause();
    if (score > highestScore) {
      highestScore = score;
      localStorage.setItem("highestScore", highestScore);
      highScoreText.text = `High Score: ${highestScore}`;
    }
  }

  function restartGame() {
    gameOver = false;
    score = 0;
    missedStars = 0;
    scoreText.text = "Score: 0";
    missedText.text = "Missed: 0";
    gameOverText.visible = false;
    stars.forEach((star) => app.stage.removeChild(star));
    stars.length = 0;
    if (beam) {
      app.stage.removeChild(beam);
      beam = null;
    }
    ship.rotation = 0;
    audio.currentTime = 155.5;
    fadeInAudio(audio);
    audio.play();
  }

  window.addEventListener("keydown", (e) => {
    if (gameOver && e.code === "KeyR") restartGame();
    if (!gameOver && gameStarted) {
      if (e.code === "ArrowLeft") rotationSpeed = -0.05;
      else if (e.code === "ArrowRight") rotationSpeed = 0.05;
      else if (e.code === "Space") shootBeam();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") rotationSpeed = 0;
  });
});
