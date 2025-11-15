/**
 * Base GameObject class - provides common functionality for all game entities
 * Ships, asteroids, lasers, and particles inherit from this class
 */
class GameObject {
  constructor(x = 0, y = 0, radius = 20) {
    // Core physical properties
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.r = radius;

    // State management
    this.active = true;
    this.contact = false;

    // Damage system (optional - ships and asteroids use this)
    this.damg = 0;
    this.maxDamage = 0;
    this.damageSystem = false;

    // Particle system (optional - ships and asteroids use this)
    this.particlePool = [];
    this.numParticles = 0;

    // Visual properties
    this.alpha = 255;
    this.lifespan = -1; // -1 means infinite lifespan

    // Unique identifier for collision prevention
    this.id = random();
  }

  /**
   * Update object physics and state
   */
  update() {
    if (!this.active) return;

    // Apply acceleration to velocity
    this.vel.add(this.acc);

    // Update position
    this.pos.add(this.vel);

    // Apply drag/friction
    this.vel.mult(0.98);

    // Handle screen wrapping
    this.edges();

    // Update lifespan if applicable
    if (this.lifespan > 0) {
      this.lifespan -= 2;
      this.alpha = this.lifespan;
      if (this.lifespan <= 0) {
        this.active = false;
      }
    }

    // Update damage-based colors if damage system is enabled
    if (this.damageSystem) {
      this.updateDamageColors();
    }
  }

  /**
   * Render the object (to be overridden by subclasses)
   */
  render() {
    // Base implementation - subclasses should override
  }

  /**
   * Handle screen edge wrapping (toroidal world)
   */
  edges() {
    if (this.pos.x > width + this.r) {
      this.pos.x = -this.r;
    } else if (this.pos.x < -this.r) {
      this.pos.x = width + this.r;
    }
    if (this.pos.y > height + this.r) {
      this.pos.y = -this.r;
    } else if (this.pos.y < -this.r) {
      this.pos.y = height + this.r;
    }
  }

  /**
   * Check collision with another GameObject
   * @param {GameObject} other - Object to check collision with
   * @returns {boolean} True if collision detected
   */
  hits(other) {
    if (!this.active || !other || !other.active) return false;

    let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
    if (d < this.r + other.r) {
      this.contact = true;
      other.contact = true;
      return true;
    }
    return false;
  }

  /**
   * Apply damage to the object
   * @param {number} amount - Amount of damage to apply
   */
  takeDamage(amount) {
    if (!this.damageSystem) return;

    this.damg += amount;
    this.activateParticlesFromPool();

    // Check for destruction
    if (this.damg >= this.maxDamage) {
      this.destroy();
    }
  }

  /**
   * Update colors based on damage levelF
   */
  updateDamageColors() {
    // Override in subclasses that use damage colors
  }

  /**
   * Initialize particle pool for damage effects
   * @param {number} count - Number of particles to create
   */
  initializeParticlePool(count = 15) {
    this.numParticles = count;
    this.particlePool = [];

    for (let i = 0; i < this.numParticles; i++) {
      let angle = random(TWO_PI);
      let distance = random(0, this.r * 0.8);
      let relativePos = createVector(cos(angle) * distance, sin(angle) * distance);

      let particle = new Particles(this.pos.copy().add(relativePos), random(1.5, 10));
      particle.initialRelativePos = relativePos.copy();
      particle.relativePos = relativePos.copy();
      particle.active = false;
      particle.vel = createVector(0, 0);
      this.particlePool.push(particle);
    }
  }

  /**
   * Activate particles from pool as damage increases
   */
  activateParticlesFromPool() {
    if (this.particlePool.length === 0) return;

    let damageRatio = this.damg / this.maxDamage;
    let particlesToActivate = floor(damageRatio * this.particlePool.length);

    for (let i = 0; i < particlesToActivate; i++) {
      if (i < this.particlePool.length && !this.particlePool[i].active) {
        this.particlePool[i].relativePos = this.particlePool[i].initialRelativePos.copy();
        this.particlePool[i].pos = p5.Vector.add(this.pos, this.particlePool[i].relativePos);
        this.particlePool[i].active = true;
      }
    }
  }

  /**
   * Handle object destruction and particle explosion
   */
  destroy() {
    // Explode all particles outward
    for (let particle of this.particlePool) {
      particle.active = true;
      let direction = p5.Vector.sub(particle.pos, this.pos).normalize();
      particle.vel = direction.mult(random(2, 5));
      G.parts.push(particle);
    }

    // Clear particle pool
    this.particlePool = [];
    this.active = false;
  }

  /**
   * Render particles at relative positions (for embedded particles)
   */
  renderRelativeParticles() {
    for (let particle of this.particlePool) {
      if (particle.active) {
        push();
        translate(particle.relativePos.x, particle.relativePos.y);
        particle.showRelative();
        pop();
      }
    }
  }

  /**
   * Check if object is off-screen
   * @returns {boolean} True if off-screen
   */
  isOffscreen() {
    return this.pos.x < -this.r * 2 ||
           this.pos.x > width + this.r * 2 ||
           this.pos.y < -this.r * 2 ||
           this.pos.y > height + this.r * 2;
  }

  /**
   * Safely play sound effect
   * @param {Object} sound - Sound object to play
   */
  playSound(sound) {
    if (G.soundOn && sound && typeof sound.play === 'function') {
      try {
        sound.play();
      } catch (error) {
        console.warn('Failed to play sound:', error);
      }
    }
  }
}

/**
 * Asteroid class representing space rocks in the game
 * Extends GameObject for common functionality
 * Handles asteroid physics, rendering, damage, and breakup mechanics
 */
/**
 * Particle class for explosion and visual effects
 * Uses asteroid-like shapes for particles without inheriting full Asteroid class
 */
class Particles extends GameObject{
   constructor (pos, r, vx = null, vy = null, col = null) {
   super(pos, r, vx, vy, col);

    // Position and physical properties
    this.pos = pos ? pos.copy() : createVector(random(width), random(height));
    this.r = r || random(1.5, 10); // Size 1.5-5 as requested
    this.alpha = 255; // Transparency for fade-out effect
    this.lifespan = 300; // Longer lifespan to prevent premature disappearance

    // Movement properties - particles should move outward on explosion
    this.vel = createVector(vx || 0, vy || 0);
    this.acc = createVector(0, 0); // No gravity for space particles

    // Visual properties - asteroid-like shape properties
    this.vertices = floor(random(5, 9)); // Similar to asteroids
    this.offset = [];
    for (let i = 0; i < this.vertices; i++) {
      this.offset.push(random(0.5, this.r * 0.25)); // Smaller offsets for particles
    }

    // State
    this.active = true;
    this.relativePos = createVector(0, 0); // For positioning relative to parent asteroid
  }

  /**
   * Update particle physics and lifecycle
   */
  update() {
    // Apply acceleration to velocity
    this.vel.add(this.acc);

    // Update position
    this.pos.add(this.vel);

    // Fade out over time (slower fade)
    this.lifespan -= 2; // Slower fade to prevent quick disappearance
    this.alpha = this.lifespan;

    // Deactivate when faded out
    if (this.lifespan <= 0) {
      this.active = false;
    }
  }

  /**
   * Render the particle using asteroid shape
   */
  show() {
    if (!this.active) return;

    push();
    translate(this.pos.x, this.pos.y);

    // Use asteroid rendering with alpha - match asteroid colors
    let strokeColor = color(255, this.alpha); // White stroke like asteroids
    stroke(strokeColor);
    strokeWeight(1); // Normal stroke weight
    fill(100, 100, 100, this.alpha * 0.5); // Gray fill like asteroids

    beginShape();
    rotate(noise(0.005 * this.r, 0.360 * this.r));

    for (let i = 0; i < this.vertices; i++) {
      let ro = this.r + this.offset[i];
      let angle = map(i, 0.5, this.vertices, 0, TWO_PI);
      let x = ro * cos(angle) - atan(angle);
      let y = ro * sin(angle) - tan(-angle);
      vertex(x, y);
    }
    endShape(CLOSE);

    pop();
  }

  /**
   * Render the particle at relative position (no translation needed)
   */
  showRelative() {
    if (!this.active) return;

    // Use asteroid rendering with alpha - match asteroid colors
    let strokeColor = color(255, this.alpha); // White stroke like asteroids
    stroke(strokeColor);
    strokeWeight(1); // Normal stroke weight
    fill(100, 100, 100, this.alpha * 0.5); // Gray fill like asteroids

    beginShape();
    rotate(noise(0.005 * this.r, 0.360 * this.r));

    for (let i = 0; i < this.vertices; i++) {
      let ro = this.r + this.offset[i];
      let angle = map(i, 0.5, this.vertices, 0, TWO_PI);
      let x = ro * cos(angle) - atan(angle);
      let y = ro * sin(angle) - tan(-angle);
      vertex(x, y);
    }
    endShape(CLOSE);
  }

  /**
   * Check if particle is off-screen or inactive
   */
  isFinished() {
    return !this.active ||
           this.pos.x < -this.r ||
           this.pos.x > width + this.r ||
           this.pos.y < -this.r ||
           this.pos.y > height + this.r;
  }

  /**
   * Handle screen wrapping for particles (optional)
   */
  edges() {
    if (this.pos.x > width + this.r) {
      this.pos.x = -this.r;
    } else if (this.pos.x < -this.r) {
      this.pos.x = width + this.r;
    }
    if (this.pos.y > height + this.r) {
      this.pos.y = -this.r;
    } else if (this.pos.y < -this.r) {
      this.pos.y = height + this.r;
    }
  }
}
class Asteroid extends GameObject {
  constructor(pos, radius, v, isSub = false, parentId = null) {
    // Initialize position and radius
    let startPos = pos ? createVector(pos.x, pos.y) : createVector(random(width), random(height));
    let startRadius = radius || random(5, 60);

    super(startPos.x, startPos.y, startRadius);

    // Asteroid-specific properties
    this.maxDamage = Math.max(50, (this.r / 60) * 250); // Minimum 50 damage for small asteroids, 250 for large ones
    this.damageSystem = true; // Enable damage system
    this.vel.add(random(-.01, .001) % this.r);
    this.vertices = v || floor(random(7, 10));
    this.inc = [];
    this.inc.push("");
    this.offset = [];
    this.heading = random(TWO_PI);
    this.cracks = []; // Array to hold crack lines
    this.subAsteroids = []; // Array to hold sub-asteroids for breakup
    this.id = random(); // Unique ID for each asteroid
    this.parentId = parentId; // Parent ID to prevent sub-asteroids from same breakup colliding
    this.immunityTimer = 0; // Timer for collision immunity after creation
    this.isSub = isSub; // Flag to identify sub-asteroids

    // Initialize vertex offsets for asteroid shape
    for (let i = 0; i < this.vertices; i++) {
      this.offset.push(random(2, this.r * 0.25));
    }

    // Create sub-asteroids for breakup only if not a sub-asteroid
    if (!isSub) {
      let numSubs = floor(random(3, 6));
      for (let i = 0; i < numSubs; i++) {
        let angle = random(TWO_PI);
        let dist = random(this.r * 0.2, this.r * 0.6);
        let subPos = createVector(cos(angle) * dist, sin(angle) * dist);
        // Ensure sub-asteroids are always smaller than parent (20-60% of original size)
        let subR = Math.max(5, this.r * random(0.2, 0.6));
        let sub = new Asteroid(subPos, subR, floor(random(5, 8)), true, this.id);
        sub.pos = p5.Vector.add(this.pos, subPos); // Set absolute position
        sub.relativePos = subPos.copy(); // Store relative position for updates
        sub.vel = this.vel.copy(); // Inherit main asteroid's velocity
        sub.active = false;
        this.subAsteroids.push(sub);
      }

      // Initialize particle system
      this.initializeParticlePool(floor(random(10, 15)));
    }
  }

  /**
   * Safely play sound effect
   * @param {Object} sound - Sound object to play
   */
  playSound(sound) {
    if (G.soundOn && sound && typeof sound.play === 'function') {
      try {
        sound.play();
      } catch (error) {
        console.warn('Failed to play sound:', error);
      }
    }
  }

  update() {
    this.pos.add(this.vel);
    // Decrement immunity timer
    if (this.immunityTimer > 0) this.immunityTimer--;
  }

  render() {
    push();
    translate(this.pos.x, this.pos.y);

    // Change stroke color to red as damage increases
    let damageRatio = this.damg / this.maxDamage;
    let strokeColor = lerpColor(color(255), color(255, 0, 0), damageRatio);
    stroke(strokeColor);
    strokeWeight(1);
    fill(100, 100, 100, 125);

    // Draw accumulated particles BEFORE the asteroid shape so they're visible inside
    for (let particle of this.particlePool) {
      if (particle.active) {
        // Draw particle at its relative position within the asteroid's coordinate space
        push();
        translate(particle.relativePos.x, particle.relativePos.y);
        particle.showRelative();
        pop();
      }
    }

    beginShape();
    rotate(noise(0.005 * this.r, 0.360 * this.r));

    for (let i = 0; i < this.vertices; i++) {
      let ro = this.r + this.offset[i];
      let angle = map(i, 0.5, this.vertices, 0, TWO_PI);
      let x = ro * cos(angle) - atan(angle);
      let y = ro * sin(angle) - tan(-angle);
      vertex(x, y);
    }
    endShape(CLOSE);

    // Draw static cracks between vertices when damage > 50%
    if (damageRatio > 0.25) {

      stroke(255, 150);
      noFill();
      strokeWeight(2);
      let numCracks = floor(map(damageRatio, 0.5, 1, 1, this.vertices / 2));
      let halfVertices = floor(this.vertices / 2);
      for (let i = 0; i < numCracks; i++) {
        let startIdx = i;
        let endIdx = (startIdx + halfVertices) % this.vertices;
        let startAngle = map(startIdx, 0, this.vertices, 0, TWO_PI);
        let endAngle = map(endIdx, 0, this.vertices, 0, TWO_PI);
        let startR = this.r + this.offset[startIdx];
        let endR = this.r + this.offset[endIdx];
        let x1 = startR * cos(startAngle) - atan(startAngle);
        let y1 = startR * sin(startAngle) - tan(-startAngle);
        let x2 = endR * cos(endAngle) - atan(endAngle);
        let y2 = endR * sin(endAngle) - tan(-endAngle);
        line(x1, y1, x2, y2);

      }
    }



    pop();
  }
  pts() {
    if (!G.parts || !Array.isArray(G.parts)) G.parts = [];

    // Explode all particles from pool outward (both active and inactive become active)
    for (let particle of this.particlePool) {
      particle.active = true; // Activate any remaining inactive particles
      // Set velocity outward from asteroid center
      let direction = p5.Vector.sub(particle.pos, this.pos).normalize();
      particle.vel = direction.mult(random(2, 5)); // Random outward speed
      G.parts.push(particle);
    }

    // Clear particle pool since they're now in the global pool
    this.particlePool = [];

    // Add some additional random particles for explosion effect, more localized
    let extraParticleCount = Math.max(1, Math.min(3, Math.floor(this.r / 10)));
    for (let i = 0; i < extraParticleCount; i++) {
      let particle = new Particles();
      particle.active = true;
      // Start particles at the asteroid's center for more localized explosion
      particle.pos = createVector(this.pos.x, this.pos.y);
      particle.r = random(1.5, 5); // Size 1.5-5 as requested
      particle.alpha = 255;
      particle.vel = p5.Vector.random2D().mult(random(2, 5)); // Random outward direction
      G.parts.push(particle);
    }
    return G.parts;
  }
  hits(inc) {
    // Check collision with main asteroid
    let d = dist(this.pos.x, this.pos.y, inc.pos.x, inc.pos.y);
    let hit = false;
    if (d < this.r + inc.r + 5) {
      this.contact = true;
      inc.contact = true;
      hit = true;
    }

    if (hit) {
      // Apply damage based on size of the object hitting (laser r=2, ship r=10)
      this.damg += inc.r * 25; // Proportional damage: lasers do 50, ships do 250

      // Activate particles from pool as damage increases
      this.activateParticlesFromPool();

      return true;
    } else {
      this.contact = false;
      return false;
    }
  }

  /**
   * Activate particles from pool as damage increases
   */
  activateParticlesFromPool() {
    let damageRatio = this.damg / this.maxDamage;
    let particlesToActivate = floor(damageRatio * this.particlePool.length);

    for (let i = 0; i < particlesToActivate; i++) {
      if (i < this.particlePool.length && !this.particlePool[i].active) {
        // Set the particle's position relative to current asteroid position
        this.particlePool[i].relativePos = this.particlePool[i].initialRelativePos.copy();
        this.particlePool[i].pos = p5.Vector.add(this.pos, this.particlePool[i].relativePos);
        this.particlePool[i].active = true;
      }
    }
  }

  breakup() {
    // Always create explosion particles
    this.pts();

    // Separate sub-asteroids into individual asteroids
    for (let sub of this.subAsteroids) {
      // Set absolute position based on current parent position
      sub.pos = p5.Vector.add(this.pos, sub.relativePos);
      // Add some random velocity variation plus parent's velocity
      sub.vel = this.vel.copy();
      sub.vel.add(p5.Vector.random2D().mult(random(0.5, 1.5)));
      sub.active = true;
      sub.immunityTimer = 30; // Set immunity timer to prevent immediate collisions
      G.newAsteroids.push(sub); // Add to new asteroids list to avoid processing in current loop
    }

    // Return this asteroid to pool
    this.active = false;
  }

  /**
   * Safely access game arrays with validation
   * @param {Array} arr - Array to access
   * @param {number} index - Index to access
   * @returns {*} Value at index or undefined if invalid
   */
  safeArrayAccess(arr, index) {
    if (Array.isArray(arr) && index >= 0 && index < arr.length) {
      return arr[index];
    }
    return undefined;
  }

  edges() {
    if (this.pos.x > width + this.r) {
      this.pos.x = -this.r;
    } else if (this.pos.x < -this.r) {
      this.pos.x = width + this.r;
    }
    if (this.pos.y > height + this.r) {
      this.pos.y = -this.r;
    } else if (this.pos.y < -this.r) {
      this.pos.y = height + this.r;
    }
  }
}

function drawAsteroid() {
  const a = G.asteroids,
        lazers = G.lasers,
        sps = G.ship;

  // Initialize new asteroids list if not exists
  if (!G.newAsteroids) G.newAsteroids = [];

  // Check for level progression
  if (a.length <= 0) {
    G.level.push(1);
    let reset = new resetGame(false); // false means it's a level progression, not full reset
  }

  // Limit processing for performance - skip some frames for asteroids when there are many
  let processEveryNth = Math.max(1, Math.floor(a.length / 30)); // Process all when <30 asteroids, every 2nd when 60, etc.

  // Single loop to handle all asteroids - update, render, check collisions
  for (let i = a.length - 1; i >= 0; i--) {
    let ast = a[i];

    // Skip processing some asteroids on busy frames for performance
    if (frameCount % processEveryNth !== 0 && a.length > 20) {
      // Still update position and render, but skip collision checks
      ast.update();
      ast.edges();
      ast.render();
      continue;
    }

    // Update position and handle edges
    ast.update();
    ast.edges();

    // Check collisions with other asteroids (no score for asteroid-asteroid collisions)
    for (let j = i + 1; j < a.length; j++) {
      let other = a[j];
      if (other && other.active && ast.id !== other.id && ast.parentId !== other.parentId && ast.immunityTimer <= 0 && other.immunityTimer <= 0) {
        let d = dist(ast.pos.x, ast.pos.y, other.pos.x, other.pos.y);
        if (d < ast.r + other.r) {
          // Collision detected between two asteroids - apply damage but NO SCORE
          ast.damg += other.r * 10; // Damage based on size
          other.damg += ast.r * 10;

          // Activate particles from pool as damage increases
          ast.activateParticlesFromPool();
          other.activateParticlesFromPool();

          // Separate asteroids to prevent overlapping
          let overlap = (ast.r + other.r) - d;
          let separation = p5.Vector.sub(ast.pos, other.pos).normalize().mult(overlap / 2);
          ast.pos.add(separation);
          other.pos.sub(separation);

          // Adjust velocities slightly for realism
          let tempVel = ast.vel.copy();
          ast.vel.add(p5.Vector.sub(other.vel, ast.vel).mult(0.1));
          other.vel.add(p5.Vector.sub(tempVel, other.vel).mult(0.1));
        }
      }
    }

    // Check collisions with lasers (limit checks when many asteroids)
    if (lazers && (a.length < 50 || i % 2 === 0)) { // Check every other asteroid when crowded
      lazers.forEach((lsr) => {
        if (lsr && !lsr.contact) {
          ast.hits(lsr);
        }
      });
    }

    // Check collisions with ships (player and enemies)
    if (sps) {
      for (let ship of sps) {
        if (ship && !ship.contact) {
          if (ast.hits(ship)) {
            // Apply damage to ship when asteroid hits it
            ship.applyDamage(20); // Fixed 20 damage per asteroid collision
            ship.contact = true;
          }
        }
      }
    }

    // Check ship-to-ship collisions (player vs enemy) - MAXIMUM DAMAGE SCENARIO
    if (sps && sps.length > 1) {
      let playerShip = sps.find(s => !s.isEnemy);
      if (playerShip) {
        for (let enemyShip of sps) {
          if (enemyShip.isEnemy && !enemyShip.contact && !playerShip.contact) {
            let d = dist(playerShip.pos.x, playerShip.pos.y, enemyShip.pos.x, enemyShip.pos.y);
            if (d < playerShip.r + enemyShip.r) {
              // Ship-to-ship collision detected - INSTANT DESTRUCTION
              // Apply maximum damage to both ships (instant destruction)
              playerShip.applyDamage(playerShip.maxDamage); // Destroy player
              enemyShip.applyDamage(enemyShip.maxDamage);   // Destroy enemy
              
              // Apply collision physics - bounce off each other
              let collisionNormal = p5.Vector.sub(playerShip.pos, enemyShip.pos).normalize();
              let relativeVel = p5.Vector.sub(playerShip.vel, enemyShip.vel);
              let impulse = relativeVel.dot(collisionNormal);
              
              playerShip.vel.add(p5.Vector.mult(collisionNormal, impulse * 0.5));
              enemyShip.vel.sub(p5.Vector.mult(collisionNormal, impulse * 0.5));
              
              // Separate ships to prevent overlap
              let overlap = (playerShip.r + enemyShip.r) - d;
              let separation = p5.Vector.mult(collisionNormal, overlap / 2);
              playerShip.pos.add(separation);
              enemyShip.pos.sub(separation);
              
              playerShip.contact = true;
              enemyShip.contact = true;
            }
          }
        }
      }
    }

    // Render the asteroid
    ast.render();

    // Handle destruction if damage threshold met
    if (ast.damg >= ast.maxDamage) {
      ast.breakup();
      if (G.soundOn) G.bl.play();
      G.score += 10;
      G.asteroids.splice(i, 1);
      ast.contact = false; // Reset contact after destruction
    } else if (ast.contact) {
      // Reset contact if damage not enough to destroy
      ast.contact = false;
    }
  }

  // Add new asteroids from breakup to the main array
  if (G.newAsteroids.length > 0) {
    G.asteroids.push(...G.newAsteroids);
    G.newAsteroids = [];
  }
}
// Game configuration and global state management
// Contains all game variables, audio assets, and initialization functions

const Game = {
  // Game statistics and scoring
  "allTime": [0, 0, 0, 0, 0],  // High scores history
  "beat": 4400,                 // Audio beat interval
  "level": [0],                  // Current level progression
  "score": 0,                   // Current game score

  // Game object arrays (will be initialized as arrays)
  "ship": [],                   // Player and enemy ships
  "asteroids": [],              // Active asteroids
  "parts": [],                  // Active particles
  "lasers": [],
  "shipimg": [],                 // Active laser shots
  "enemyShips": [],             // Enemy ships array for spawning logic

  // Audio assets (loaded in preload)
  "bl": null,    // Bang Large sound
  "sm": null,    // Bang Small sound
  "bm": null,    // Bang Medium sound
  "bt2": null,   // Beat 2 sound
  "bt1": null,   // Beat 1 sound
  "fire": null,  // Laser fire sound
  "xtraship": null, // Extra ship sound
  "ss": null,    // Saucer Small sound
  "bs": null,    // Saucer Big sound
  "thruster": null, // Ship thruster sound
  "bkg": null,   // Background image

  // Game state management
  "gameStats": {},              // Additional game statistics
  "newAsteroids": [],           // Queue for newly created asteroids
  "offset": [],                 // Asteroid shape offsets
  "soundOn": true,              // Sound toggle state

  // Object pools for performance optimization
  "asteroidPool": null,         // Pool of reusable asteroid objects
  "particlePool": null,         // Pool of reusable particle objects
  "smallPiecePool": null        // Pool of reusable small piece objects
};

// Global reference to game object
const G = Game;

function preload() {
  try {
    G.bl = loadSound("sound/bangLarge.wav");
    G.sm = loadSound("sound/bangSmall.wav");
    G.bm = loadSound("sound/bangMedium.wav");
    G.bt2 = loadSound("sound/beat2.wav");
    G.bt1 = loadSound("sound/beat1.wav");
    G.fire = loadSound("sound/fire.wav");
    G.xtraship = loadSound("sound/extraShip.wav");
    G.ss = loadSound("sound/saucerSmall.wav");
    G.bs = loadSound("sound/saucerBig.wav");
    G.thruster = loadSound("sound/thrust.wav");
    G.bkg = loadImage("IMG/stars1.png"); // Changed from stars.jpg to stars1.png
    G.shipimg = [loadImage("IMG/mship1.png")];
  } catch (error) {
    console.error("Error loading game assets:", error);
    // Continue with game even if some assets fail to load
  }
}
/**
 * Add score to all-time high scores array
 * @param {number} a - Score to add
 */
function addAlltime(a) {
  if (typeof game_over !== 'undefined' && game_over) {
    G.allTime.push(a);
    if (G.allTime.length >= 6) {
      G.newAT = G.allTime.sort().reverse();
      G.newAT.splice(-1, 1);
    }
  }
}
/**
 * Set up audio beat playback with specified interval
 * @param {number} a - Beat interval in milliseconds
 * @param {Object} b - Audio object to play (optional)
 */
function playBeat(a, b) {
  G.beat = a;
  // console.log(b);
  setInterval(() => {
    if (G.soundOn) {
      !b ? G.bt1.play() : b.play();
    }
  }, G.beat);
}

// End game setup functions
class resetGame {
  constructor(isFullReset = false) {
    addAlltime(G.score);
    if (isFullReset) {
      G.score = 0;
      G.level = [0]; // Reset level on full reset
    }
    G.parts = [];
    G.lasers = [];
    G.ship = [];
    G.asteroids = [];

    // Initialize object pools if not already done
    if (!G.asteroidPool) {
      this.initializePools();
    }

    this.acount = 5;
    this.shipnum = 1;
    this.astnum = this.calculateAstnum();
    this.makeshp();
    this.makeast();
  }

  fullReset() {
    // Preserve high scores - don't reset G.allTime
    G.score = 0;
    G.level = [0];
    G.ship = [];
    G.asteroids = [];
    G.parts = [];
    G.lasers = [];
    G.enemyShips = [];
    this.acount = 5;
    this.shipnum = 1;
    this.astnum = this.calculateAstnum();
    G.gameStats = {};
    G.newAsteroids = [];
    G.offset = [];
    G.asteroidPool = null;
    G.particlePool = null;
    // G.smallPiecePool = null;
    G.shipimg = [loadImage("IMG/mship1.png")];
    // G.allTime is preserved - high scores persist across full resets
    G.beat = 4400;
    this.initializePools();
    this.makeshp();
    this.makeast();
  }

  reset() {
    // Initialize object pools if not already done
    if (!G.asteroidPool) {
      this.initializePools();
    }

    // Reset all pools to inactive state
    this.resetPools();

    this.acount = 5;
    this.shipnum = 1;
    this.astnum = this.calculateAstnum();
    this.makeshp();
    this.makeast();
  }

  calculateAstnum() {
    return this.acount * G.level.length;
  }

  initializePools() {
    // Create asteroid pool
    G.asteroidPool = [];
    for (let i = 0; i < 150; i++) {
      let asteroid = new Asteroid();
      asteroid.active = false;
      G.asteroidPool.push(asteroid);
    }

    // Create particle pool
    G.particlePool = [];
    for (let i = 0; i < 1000; i++) {
      let particle = new Particles();
      particle.active = false;
      G.particlePool.push(particle);
    }

    // Create small piece pool (for asteroid fragments)
    // G.smallPiecePool = [];
    // for (let i = 0; i < 500; i++) {
    //   let piece = {
    //     x: 0,
    //     y: 0,
    //     r: 0,
    //     active: false
    //   };
    //   G.smallPiecePool.push(piece);
    // }

    // Assign pool getter methods to G for global access
    G.getInactiveParticle = this.getInactiveParticle.bind(this);
    G.getInactiveAsteroid = this.getInactiveAsteroid.bind(this);
    G.getInactiveSmallPiece = this.getInactiveSmallPiece.bind(this);
  }

  resetPools() {
    // Reset asteroid pool
    G.asteroidPool.forEach(ast => {
      ast.active = false;
      ast.damg = 0;
      ast.contact = false;
      ast.smallPieces = [];
    });

    // Reset particle pool
    G.particlePool.forEach(p => {
      p.active = false;
      p.alpha = 255;
    });

    // Reset small piece pool
    G.smallPiecePool.forEach(p => {
      p.active = false;
    });
  }

  makeshp() {
    for (let i = 0; i < this.shipnum; i++) {
      let s = new Ships(false, 0); // Create player ship (isEnemy=false, shipType=0)
      if (s) {
        G.ship.push(s);
      }
    }
  }
  makeast() {
    // Activate asteroids from pool instead of creating new ones
    for (let j = 0; j < this.astnum; j++) {
      let asteroid = this.getInactiveAsteroid();
      if (asteroid) {
        asteroid.active = true;
        // Reset asteroid properties
        let pos;
        do {
          pos = createVector(random(width), random(height));
        } while (G.ship[0] && dist(pos.x, pos.y, G.ship[0].pos.x, G.ship[0].pos.y) < 100);
        asteroid.pos = pos;
        asteroid.r = random(15, 60);
        asteroid.damg = 0;
        asteroid.contact = false;
        asteroid.maxDamage = Math.max(50, (asteroid.r / 60) * 250);
        asteroid.vel = p5.Vector.random2D();
        asteroid.vel.mult(random(0.5, 2));
        asteroid.smallPieces = [];
        G.asteroids.push(asteroid);
      }
    }
  }

  getInactiveAsteroid() {
    return G.asteroidPool.find(ast => !ast.active);
  }

  getInactiveParticle() {
    return G.particlePool.find(p => !p.active);
  }

  getInactiveSmallPiece() {
    return G.smallPiecePool.find(p => !p.active);
  }
}


function moving() {
  // Removed continuous acceleration - now handled by keyPressed() for single bursts
  return G;
};

function turning() {
  // Find player ship
  let playerShip = G.ship.find(s => !s.isEnemy);
  if (playerShip) {
    // Left arrow or A key
    if (keyIsDown(37) || keyIsDown(65)) {
      playerShip.heading += -0.06;
    }
    // Right arrow or D key
    if (keyIsDown(39) || keyIsDown(68)) {
      playerShip.heading += 0.06;
    }
  }
  return G;
}
/**
 * Game over screen constants and utilities
 */
const wcenter = innerWidth / 2;
const hcenter = innerHeight / 2;
let game_over = false;

/**
 * Display text on game over screen - centered
 * @param {string} tx1 - First text component
 * @param {string|number} tx2 - Second text component
 * @param {number} yOffset - Y offset from center
 */
function setText(tx1, tx2, yOffset) {
  textAlign(CENTER, CENTER);
  return text(
    `${tx1}: ${tx2}`,
    width / 2,
    height / 2 + yOffset * gameScale
  );
}

/**
 * Display game over screen with scores and restart option
 */
function gameOver() {
  game_over = true;

  push();
  // Draw border rectangle
  rectMode(CENTER);
  stroke(255, 200);
  strokeWeight(4 * gameScale);
  noFill();
  rect(width / 2, height / 2, width * 0.8, height * 0.8, 50 * gameScale);
  pop();

  push();
  // Game Over title
  textAlign(CENTER, CENTER);
  stroke(random(100, 255), 0, 0, random(100, 255));
  strokeWeight(4 * gameScale);
  fill(255, 0, 0);
  textSize(60 * gameScale);
  text("GAME OVER", width / 2, height / 2 - 200 * gameScale);
  pop();

  push();
  // Scores - all centered
  textAlign(CENTER, CENTER);
  stroke(0);
  fill(255);
  textSize(20 * gameScale);
  
  let t;
  G.allTime[0] > G.score ? t = G.allTime[0] : t = G.score;

  text(`High Score: ${t}`, width / 2, height / 2 - 100 * gameScale);
  text(`Your Score: ${G.score}`, width / 2, height / 2 - 70 * gameScale);
  
  textSize(18 * gameScale);
  text('All Time Highs', width / 2, height / 2 - 30 * gameScale);
  
  textSize(16 * gameScale);
  text(`#1 Player: ${G.allTime[0]}`, width / 2, height / 2 + 10 * gameScale);
  text(`#2 Player: ${G.allTime[1]}`, width / 2, height / 2 + 35 * gameScale);
  text(`#3 Player: ${G.allTime[2]}`, width / 2, height / 2 + 60 * gameScale);
  text(`#4 Player: ${G.allTime[3]}`, width / 2, height / 2 + 85 * gameScale);
  text(`#5 Player: ${G.allTime[4]}`, width / 2, height / 2 + 110 * gameScale);
  
  textSize(14 * gameScale);
  text('Click to restart', width / 2, height / 2 + 150 * gameScale);
  pop();

  G.ship.splice(0,1);

  return;
}
/**
 * Ship explosion effects - creates particle explosions when ship is destroyed
 * Integrates with the particle system for visual feedback
 */

/**
 * Create explosion particles at ship position when destroyed
 * @param {p5.Vector} pos - Position where ship was destroyed
 */
function createShipExplosion(pos) {
  if (!G.parts || !Array.isArray(G.parts)) G.parts = [];

  // Create large explosion particles for ship destruction
  let explosionParticleCount = Math.max(15, Math.min(30, Math.floor(width / 20))); // Scale with screen size

  for (let i = 0; i < explosionParticleCount; i++) {
    let particle = G.getInactiveParticle ? G.getInactiveParticle() : new Particles();
    if (particle) {
      particle.active = true;
      particle.pos = createVector(pos.x, pos.y);
      particle.r = random(8, 20); // Larger particles for ship explosion
      particle.alpha = 255;
      particle.lifespan = 255; // Full lifespan for dramatic effect

      // Random explosion velocity - more spread out than asteroid particles
      let angle = random(TWO_PI);
      let speed = random(2, 8);
      particle.vel = createVector(cos(angle) * speed, sin(angle) * speed);

      // Ship explosion colors - mix of red, orange, yellow
      let explosionColors = [
        color(255, 100, 0),    // Orange
        color(255, 200, 0),    // Yellow
        color(255, 50, 50),    // Red
        color(255, 150, 0),    // Orange-red
        color(255, 255, 100)   // Light yellow
      ];
      particle.col = random(explosionColors);

      G.parts.push(particle);
    }
  }

  // Add some smaller debris particles for realism
  let debrisCount = Math.max(5, Math.min(15, Math.floor(width / 40)));
  for (let i = 0; i < debrisCount; i++) {
    let particle = G.getInactiveParticle ? G.getInactiveParticle() : new Particles();
    if (particle) {
      particle.active = true;
      particle.pos = createVector(pos.x + random(-10, 10), pos.y + random(-10, 10));
      particle.r = random(2, 6); // Smaller debris
      particle.alpha = 255;
      particle.lifespan = 180; // Shorter lifespan for debris

      // Debris moves slower and more randomly
      let angle = random(TWO_PI);
      let speed = random(1, 4);
      particle.vel = createVector(cos(angle) * speed, sin(angle) * speed);

      // Debris colors - metallic grays and silvers
      particle.col = color(random(150, 200), random(150, 200), random(150, 200));

      G.parts.push(particle);
    }
  }
}
/**
 * Ship class - handles both player and enemy ships
 * Extends GameObject for common functionality
 * Manages ship physics, damage, rendering, and AI for enemy ships
 */
class Ships extends GameObject {
  constructor(isEnemy = false, shipType = 0) {
    // Initialize position based on ship type
    let startX = isEnemy ?
      (random() > 0.5 ?random() * -20 : width + random()*20) :
      width / 2;
    let startY = isEnemy ? random(height) : height / 2;

    // Adjust ship size for mobile devices
    let shipRadius = 10;
    if (Joystick.isMobile()) {
      shipRadius = 7; // Smaller ships on mobile (70% of original size)
    }

    super(startX, startY, shipRadius); // Call parent constructor

    // Ship-specific properties
    this.heading = isEnemy ? (this.pos.x < 0 ? 0 : PI) : 0; // Face toward screen for enemies
    this.rotation = 0;              // Current rotation speed

    // Ship type and enemy properties
    this.isEnemy = isEnemy;         // Whether this is an enemy ship
    this.shipType = shipType;       // Ship type for different appearances/behavior
    this.damageSystem = true;       // Enable damage system like asteroids
    this.maxDamage = 100;           // Maximum damage before destruction (reduced from 250)

    // Movement state
    this.isBoosting = false;        // Whether ship is currently thrusting
    this.shieldActive = false;      // Whether shield is currently active
    this.shieldHealth = 100;        // Shield health (0-100)
    this.shieldRegenRate = 0.1;     // Shield regeneration per frame when not active
    this.shieldAbsorption = 0.5;    // Shield damage absorption (0.5 = 50%)

    // Visual state
    this.red = 255;                 // Ship color components (damage affects green/blue)
    this.green = 255;
    this.blue = 255;

    // Enemy AI properties
    if (isEnemy) {
      this.fireTimer = 0;           // Timer for automatic firing
      this.fireRate = 60;           // Frames between shots (adjustable by level)
      this.accuracy = 0.1;          // Base accuracy (0-1, adjustable by level)
      this.targetPos = createVector(width / 2, height / 2); // Target player position
      this.crossingSpeed = random(1.5, 3.5); // Random initial speed
      this.targetHeading = random(TWO_PI); // Random initial direction
    }

    // Initialize particle system
    this.initializeParticlePool(floor(random(10, 15)));

    // Game state reference
    this.gs = G.gameStats;
  }

  /**
   * Set boosting state for thrust control
   * @param {boolean} b - Whether ship should boost
   */
  boosting(b) {
    this.isBoosting = b;
  }

  /**
   * Render the ship with damage-based color changes
   * @param {number} damage - Damage level for visual feedback
   */
  render(damage) {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.heading + PI / 2);

    // Draw accumulated particles BEFORE the ship shape so they're visible inside
    for (let particle of this.particlePool) {
      if (particle.active) {
        // Draw particle at its relative position within the ship's coordinate space
        push();
        translate(particle.relativePos.x, particle.relativePos.y);
        particle.showRelative();
        pop();
      }
    }

    // Ship outline with damage color
    if (!this.isEnemy) {
      // Configure shield based on level
      if (G.level.length === 1) {
        // Level 1: Shield always active, 50% absorption
        this.shieldActive = true;
        this.shieldAbsorption = 0.5;
      } else if (G.level.length === 2) {
        // Level 2: Shield controlled by F key, 50% absorption
        this.shieldAbsorption = 0.5;
      } else if (G.level.length >= 3) {
        // Level 3+: Shield controlled by F key, 30% absorption
        this.shieldAbsorption = 0.3;
      }
      
      // Draw shield if active and has health
      if (this.shieldActive && this.shieldHealth > 0) {
        this.Shield();
      }
      
      shipDamage(225);
    }
    // Use circle as placeholder for enemy ships, image for player
    if (this.isEnemy) {
      // Enemy ship: red circle with damage-based color
      stroke(this.red, this.green - this.damg, this.blue - this.damg);
      strokeWeight(2);
      fill(255, 100, 100, 150); // Reddish fill for enemy
      ellipse(0, 0, this.r * 2);
    } else {
      // Player ship: use image
      image(G.shipimg[0], -this.r * 2, -this.r * 2, this.r * 4, this.r * 4);
      // Ship interior (cockpit)
      noStroke();
      fill(0);
      triangle(-this.r + 4, this.r - 4, this.r - 4, this.r - 5, 0, -this.r + 20);
    }
    pop();
  }

  /**
   * Update ship physics and handle input/AI
   */
  update() {
    if (this.isEnemy) {
      this.updateEnemyAI();
    } else {
      // Check for continuous acceleration while up arrow or W key is held down
      if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
        this.boost(0.5);
      }

      // Handle collision resolution
      if (this.contact) {
        resolve_contact();
        this.contact = false;
      }
      
      // Regenerate shield when not active
      if (!this.shieldActive && this.shieldHealth < 100) {
        this.shieldHealth = Math.min(100, this.shieldHealth + this.shieldRegenRate);
      }
    }

    // Update position and apply drag
    this.pos.add(this.vel);
    this.vel.mult(0.98);

    // Handle screen wrapping
    this.edges();

    // Update damage-based colors
    this.updateDamageColors();
  }

  /**
   * Update enemy AI behavior
   */
  updateEnemyAI() {
    // Random movement pattern - choose random direction and speed
    if (frameCount % 120 === 0) { // Change direction every 2 seconds
      this.targetHeading = random(TWO_PI);
      this.crossingSpeed = random(1.5, 3.5); // Random speed between 1.5 and 3.5
    }

    // Move in the chosen direction
    let moveVec = p5.Vector.fromAngle(this.targetHeading);
    moveVec.mult(this.crossingSpeed);
    this.vel = moveVec;

    // Update target position (player ship)
    let playerShip = G.ship.find(s => !s.isEnemy);
    if (playerShip) {
      this.targetPos = playerShip.pos.copy();
    }

    // Automatic firing
    this.fireTimer++;
    if (this.fireTimer >= this.fireRate) {
      this.fireAtPlayer();
      this.fireTimer = 0;
    }

    // Handle collision resolution for enemies
    if (this.contact) {
      this.contact = false;
      // Enemy ships take damage from collisions
      this.damg += 20;
      this.activateParticlesFromPool();
    }

    // Remove enemy ships that have left the screen completely
    if (this.pos.x < -this.r * 2 || this.pos.x > width + this.r * 2 ||
        this.pos.y < -this.r * 2 || this.pos.y > height + this.r * 2) {
      // Remove enemy ship from array when it leaves the screen
      let enemyIndex = G.ship.findIndex(s => s === this);
      if (enemyIndex !== -1) {
        G.ship.splice(enemyIndex, 1);
      }
    }
  }

  /**
   * Respawn enemy ship on the opposite side of the screen
   */
  respawnEnemy() {
    // Choose a random edge to spawn from
    let edge = floor(random(4)); // 0=top, 1=right, 2=bottom, 3=left

    switch(edge) {
      case 0: // Top
        this.pos = createVector(random(width), -this.r);
        this.targetHeading = random(PI/4, 3*PI/4); // Downward direction
        break;
      case 1: // Right
        this.pos = createVector(width + this.r, random(height));
        this.targetHeading = random(3*PI/4, 5*PI/4); // Leftward direction
        break;
      case 2: // Bottom
        this.pos = createVector(random(width), height + this.r);
        this.targetHeading = random(5*PI/4, 7*PI/4); // Upward direction
        break;
      case 3: // Left
        this.pos = createVector(-this.r, random(height));
        this.targetHeading = random(7*PI/4, 2*PI) + random(-PI/4, PI/4); // Rightward direction
        break;
    }

    // Reset velocity and choose new speed
    this.vel = p5.Vector.fromAngle(this.targetHeading);
    this.crossingSpeed = random(1.5, 3.5);
    this.vel.mult(this.crossingSpeed);

    // Reset damage and contact
    this.damg = 0;
    this.contact = false;
  }

  /**
   * Fire at player with some inaccuracy
   */
  fireAtPlayer() {
    if (!G.ship || !G.ship[0] || G.ship[0].isEnemy) return;

    // Calculate direction to player
    let toPlayer = p5.Vector.sub(this.targetPos, this.pos);
    let distance = toPlayer.mag();

    // Add inaccuracy based on level and distance
    let inaccuracy = (1 - this.accuracy) * distance * 0.1;
    let angleOffset = random(-inaccuracy, inaccuracy);
    toPlayer.rotate(angleOffset);

    // Create laser
    let laserPos = p5.Vector.fromAngle(toPlayer.heading());
    laserPos.mult(this.r + 5);
    laserPos.add(this.pos);

    let enemyLaser = new Laser(laserPos, toPlayer.heading(), true); // isEnemy = true
    enemyLaser.r = 3; // Slightly larger enemy lasers
    G.lasers.push(enemyLaser);

    // Play fire sound
    if (G.fire && G.fire.play) this.playSound(G.fire);
  }
  Shield() {
    // Only show shield if active
    if (!this.shieldActive) return;

    // Implement shield functionality here
    stroke(this.red, this.green, this.blue);
    fill(this.red, this.green, this.blue, 100);
    triangle(-this.r * 2, this.r, this.r * 2, this.r, 0, -this.r * 3);
  }
  /**
   * Render thrust effect when boosting
   */
  thrust() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.heading + PI / 2);

    // Random thrust flame colors and size
    stroke(255, 205, random(255), 255);
    strokeWeight(random(2) * gameScale);
    fill(255, 255, random(255), random(255));

    beginShape();
    triangle(
      -this.r + 2, this.r - 2,
      this.r - 2, this.r - 2,
      0, -this.r + random(20, 40)
    );
    endShape();
    pop();

    // Play thrust sound
    if (G.thruster && G.thruster.play) this.playSound(G.thruster);
  }

  /**
   * Handle screen edge wrapping (toroidal world)
   */
  edges() {
    if (this.pos.x > width + this.r) {
      this.pos.x = -this.r;
    } else if (this.pos.x < -this.r) {
      this.pos.x = width + this.r;
    }
    if (this.pos.y > height + this.r) {
      this.pos.y = -this.r;
    } else if (this.pos.y < -this.r) {
      this.pos.y = height + this.r;
    }
  }

  /**
   * Apply thrust force in current heading direction
   * @param {number} a - Thrust acceleration magnitude
   */
  boost(a) {
    let force = p5.Vector.fromAngle(this.heading);
    force.mult(a);
    this.vel.add(force);
    this.thrust();
  }

  /**
   * Apply damage to ship with configurable shield absorption
   * @param {number} amount - Amount of damage to apply
   */
  applyDamage(amount) {
    let finalDamage = amount;
    
    // Apply shield absorption if shield is active
    if (this.shieldActive && this.shieldHealth > 0) {
      let absorbed = amount * this.shieldAbsorption;
      finalDamage = amount - absorbed;
      
      // Deplete shield health
      this.shieldHealth -= absorbed;
      if (this.shieldHealth <= 0) {
        this.shieldHealth = 0;
        this.shieldActive = false;
      }
      
      console.log(`Shield absorbed ${absorbed.toFixed(1)} damage (${(this.shieldAbsorption * 100)}%). Ship takes ${finalDamage.toFixed(1)}`);
    }
    
    // Apply remaining damage to ship
    this.damg += finalDamage;
    this.activateParticlesFromPool();
    
    console.log(`Ship damage: ${this.damg.toFixed(1)}/${this.maxDamage}`);
  }

  /**
   * Check collision with another object
   * @param {Object} inc - Incoming object to check collision with
   * @returns {boolean} - True if collision detected
   */
  hits(inc) {
    let d = dist(this.pos.x, this.pos.y, inc.pos.x, inc.pos.y);
    if (d < this.r + inc.r + 5) {
      this.contact = true;
      inc.contact = true;

      // Apply damage if this ship has damage system enabled
      if (this.damageSystem) {
        this.applyDamage(inc.r * 25); // Use new damage method with shield
      }

      return true;
    } else {
      this.contact = false;
      return false;
    }
  }

  /**
   * Activate particles from pool as damage increases (like asteroids)
   */
  activateParticlesFromPool() {
    let damageRatio = this.damg / this.maxDamage;
    let particlesToActivate = floor(damageRatio * this.particlePool.length);

    for (let i = 0; i < particlesToActivate; i++) {
      if (i < this.particlePool.length && !this.particlePool[i].active) {
        // Set the particle's position relative to current ship position
        this.particlePool[i].relativePos = this.particlePool[i].initialRelativePos.copy();
        this.particlePool[i].pos = p5.Vector.add(this.pos, this.particlePool[i].relativePos);
        this.particlePool[i].active = true;
      }
    }
  }

  /**
   * Handle destruction and particle explosion
   */
  destroy() {
    // Explode all particles from pool outward
    for (let particle of this.particlePool) {
      particle.active = true;
      // Set velocity outward from ship center
      let direction = p5.Vector.sub(particle.pos, this.pos).normalize();
      particle.vel = direction.mult(random(2, 5));
      G.parts.push(particle);
    }

    // Clear particle pool
    this.particlePool = [];
  }

  /**
   * Apply rotation to ship heading
   */
  turn() {
    this.heading += this.rotation;
    G.gameStats.headings = this.heading;
  }
}

function shipDamage(a) {
  if (!G.ship || G.ship.length <= 0) {
    return;
  }
  // Find the player ship (first non-enemy ship)
  let playerShip = G.ship.find(s => !s.isEnemy);
  if (playerShip && playerShip.damg >= playerShip.maxDamage) {
    // Handle player ship destruction
    playerShip.destroy();
    let playerIndex = G.ship.findIndex(s => !s.isEnemy);
    if (playerIndex !== -1) {
      G.ship.splice(playerIndex, 1);
    }
  }
  return G;
}

// Handle enemy ship damage and destruction
function enemyShipDamage() {
  for (let i = G.ship.length - 1; i >= 0; i--) {
    let ship = G.ship[i];
    if (ship.isEnemy && ship.damg >= ship.maxDamage) {
      // Handle enemy ship destruction
      ship.destroy();
      G.ship.splice(i, 1);
      G.score += 200; // Points for destroying enemy ship (increased from 50)
      if (G.xtraship && G.xtraship.play) G.xtraship.play();
    }
  }
}

// function clearShip() {
//   if (!G.ship || G.ship.length <= 0) {
//     return;
//   }
//   if (G.ship[0]) {
//     if (G.ship[0].damg >= 250) {
//       G.ship.splice(0, 1);
//     }
//     return G;
//   }
// }
let cnt = 0;

function resolve_contact() {
  cnt++;
  G.asteroids.forEach((a, index) => {

    if (a.contact) {

      G.bl.play();
      G.score += -10;

      // Find player ship and apply damage
      let playerShip = G.ship.find(s => !s.isEnemy);
      if (playerShip) {
        playerShip.applyDamage(20);

        // Apply impact force to ship
        let impactDir = p5.Vector.sub(playerShip.pos, a.pos).normalize();
        let impactForce = p5.Vector.mult(impactDir, a.vel.mag() * 0.5 + a.r * 0.2);
        playerShip.vel.add(impactForce);

        // Add spin if asteroid is bigger
        if (a.r > playerShip.r * 2) {
          let spinForce = (a.vel.mag() * 0.02 + a.r * 0.005) * (random() > 0.5 ? 1 : -1);
          playerShip.rotation += spinForce;
        }
      }

      let limit = 25;
      if (a.r > limit) {
        if (G.asteroids.length <= 0) {
          return;
        }
        a.breakup();
        G.asteroids.splice(index, 1);
      } else {
        G.asteroids.splice(index, 1);

      }
    }
  });

}

function drawShip() {
  // Handle all ships (player and enemies)
  for (let i = G.ship.length - 1; i >= 0; i--) {
    let s = G.ship[i];
    if (s) { // Safety check
      s.render(s.damg);
      s.update();

      // Only apply player-specific logic to player ships
      if (!s.isEnemy) {
        s.turn();
        shoot();
        shipDamage(225);
        //ship[0].defend();
      }
    }
  }

  // Check for enemy ship destruction
  enemyShipDamage();

  // Game over if no player ship
  if (G.ship.length === 0 || !G.ship.some(s => !s.isEnemy)) {
    gameOver();
  }
}
/**
 * Laser class for ship projectiles
 * Handles laser physics, rendering, and collision detection
 */
class Laser extends GameObject {
  constructor(spos, angle, isEnemy = false) {
    super(spos.x, spos.y, 2); // Call parent constructor with position and radius

    this.vel = p5.Vector.fromAngle(angle);
    this.vel.mult(10); // Laser speed

    this.isEnemy = isEnemy; // Track if this is an enemy laser

    // Disable drag for lasers
    this.drag = false;
  }

  /**
   * Update laser position and check bounds
   * Override parent update to handle offscreen deactivation instead of wrapping
   */
  update() {
    if (!this.active) return;

    this.pos.add(this.vel);

    // Check if laser is off-screen (deactivate instead of wrapping)
    if (this.isOffscreen()) {
      this.active = false;
    }
  }

  /**
   * Render the laser as a small white circle
   */
  render() {
    if (!this.active) return;

    push();
    stroke(255);
    strokeWeight(4);
    // fill(255);
    point(this.pos.x, this.pos.y);
    // ellipse(this.pos.x, this.pos.y, this.r * 2);
    pop();
  }

  /**
   * Check collision with another object
   * @param {Object} inc - Object to check collision with
   * @returns {boolean} True if collision detected
   */
  hits(inc) {
    if (!this.active || !inc) return false;

    let d = dist(this.pos.x, this.pos.y, inc.pos.x, inc.pos.y);
    if (d < this.r + inc.r) {
      this.contact = true;
      this.active = false; // Deactivate laser on hit
      return true;
    }
    return false;
  }
}

/**
 * Update and render all active lasers
 * Handles laser lifecycle management
 */
function shoot() {
  for (let l = G.lasers.length - 1; l >= 0; l--) {
    let laser = G.lasers[l];

    // Update laser physics
    laser.update();

    // Render if still active
    if (laser.active) {
      laser.render();
    } else {
      // Remove inactive lasers
      G.lasers.splice(l, 1);
    }
  }
}
/**
 * UI Controls and HUD display management
 * Handles game interface elements, buttons, and status displays
 */

class Controls {
  constructor() {
    // Color properties for damage-based visual feedback
    this.btnStyle = 'color: yellow;';
    this.damg = 0;
    this.myred = 255;
    this.mygreen = 255 - this.damg;
    this.myblue = 255 - this.damg;
    this.buttonsCreated = false; // Flag to prevent duplicate buttons
  }

  /**
   * Create transparent header with game buttons and HUD
   */
  createHeader() {
    // Create semi-transparent header background
    push();
    fill(0, 0, 0, 150); // Semi-transparent black
    noStroke();
    rect(0, 0, width, 80 * gameScale); // Header height scaled
    pop();

    // Create game control buttons in header (only once)
    this.createButtons();
  }

  /**
   * Create game control buttons positioned in the header
   */

  createButtons() {
    // Only create buttons if they don't already exist
    if (!this.buttonsCreated) {
      // Create dropdown menu button
      let menuBtn = createButton("☰ Menu");
      menuBtn.size(100, 35);
      menuBtn.position(20, 20);
      menuBtn.style('color', 'yellow');
      menuBtn.style('background', 'rgba(0, 0, 0, 0.8)');
      menuBtn.style('border', '1px solid #ccc');
      menuBtn.style('border-radius', '5px');
      menuBtn.style('font-size', '16px');
      menuBtn.style('cursor', 'pointer');
      
      // Create dropdown container
      let dropdown = createDiv('');
      dropdown.id('game-menu-dropdown');
      dropdown.style('position', 'absolute');
      dropdown.style('top', '60px');
      dropdown.style('left', '20px');
      dropdown.style('background', 'rgba(0, 0, 0, 0.95)');
      dropdown.style('border', '2px solid #ccc');
      dropdown.style('border-radius', '5px');
      dropdown.style('padding', '10px');
      dropdown.style('display', 'none'); // Hidden by default
      dropdown.style('z-index', '1000');
      dropdown.style('min-width', '150px');
      
      // Reset button
      let resetBtn = createButton("🔄 Reset Game");
      resetBtn.parent(dropdown);
      resetBtn.style('display', 'block');
      resetBtn.style('width', '100%');
      resetBtn.style('margin', '5px 0');
      resetBtn.style('padding', '10px');
      resetBtn.style('color', 'yellow');
      resetBtn.style('background', 'rgba(50, 50, 50, 0.8)');
      resetBtn.style('border', '1px solid #666');
      resetBtn.style('border-radius', '3px');
      resetBtn.style('cursor', 'pointer');
      resetBtn.style('font-size', '14px');
      resetBtn.mousePressed(() => {
        new resetGame(true);
        dropdown.style('display', 'none'); // Close menu after action
      });
      resetBtn.mouseOver(() => resetBtn.style('background', 'rgba(80, 80, 80, 0.9)'));
      resetBtn.mouseOut(() => resetBtn.style('background', 'rgba(50, 50, 50, 0.8)'));

      // Pause button
      let pauseBtn = createButton(isPaused ? "▶️ Resume" : "⏸️ Pause");
      pauseBtn.parent(dropdown);
      pauseBtn.style('display', 'block');
      pauseBtn.style('width', '100%');
      pauseBtn.style('margin', '5px 0');
      pauseBtn.style('padding', '10px');
      pauseBtn.style('color', 'yellow');
      pauseBtn.style('background', 'rgba(50, 50, 50, 0.8)');
      pauseBtn.style('border', '1px solid #666');
      pauseBtn.style('border-radius', '3px');
      pauseBtn.style('cursor', 'pointer');
      pauseBtn.style('font-size', '14px');
      pauseBtn.mousePressed(() => {
        isPaused = !isPaused;
        pauseBtn.html(isPaused ? "▶️ Resume" : "⏸️ Pause");
        dropdown.style('display', 'none'); // Close menu after action
      });
      pauseBtn.mouseOver(() => pauseBtn.style('background', 'rgba(80, 80, 80, 0.9)'));
      pauseBtn.mouseOut(() => pauseBtn.style('background', 'rgba(50, 50, 50, 0.8)'));

      // Sound toggle button
      let soundBtn = createButton(G.soundOn ? "🔊 Sound On" : "🔈 Sound Off");
      soundBtn.parent(dropdown);
      soundBtn.style('display', 'block');
      soundBtn.style('width', '100%');
      soundBtn.style('margin', '5px 0');
      soundBtn.style('padding', '10px');
      soundBtn.style('color', 'yellow');
      soundBtn.style('background', 'rgba(50, 50, 50, 0.8)');
      soundBtn.style('border', '1px solid #666');
      soundBtn.style('border-radius', '3px');
      soundBtn.style('cursor', 'pointer');
      soundBtn.style('font-size', '14px');
      soundBtn.mousePressed(() => {
        G.soundOn = !G.soundOn;
        soundBtn.html(G.soundOn ? "🔊 Sound On" : "🔈 Sound Off");
      });
      soundBtn.mouseOver(() => soundBtn.style('background', 'rgba(80, 80, 80, 0.9)'));
      soundBtn.mouseOut(() => soundBtn.style('background', 'rgba(50, 50, 50, 0.8)'));

      // Toggle dropdown on menu button click
      menuBtn.mousePressed(() => {
        let currentDisplay = dropdown.style('display');
        dropdown.style('display', currentDisplay === 'none' ? 'block' : 'none');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!menuBtn.elt.contains(e.target) && !dropdown.elt.contains(e.target)) {
          dropdown.style('display', 'none');
        }
      });

      this.buttonsCreated = true;
    }
  }

  /**
   * Display HUD elements in the header
   */
  displayHUD() {
    // Check if mobile device
    const isMobile = Joystick.isMobile();
    
    // Set text properties for HUD - smaller on PC, larger on mobile
    const hudTextSize = isMobile ? 24 * gameScale : 14 * gameScale; // Reduced PC size from 18 to 14
    textSize(hudTextSize);
    
    // Add text outline for better visibility on mobile
    if (isMobile) {
      strokeWeight(2);
      stroke(0, 0, 0, 150);
    } else {
      noStroke();
    }

    let playerShip = G.ship.find(s => !s.isEnemy);
    let lives = G.ship.filter(s => !s.isEnemy).length;
    let damageValue = playerShip ? Math.floor(playerShip.damg) : 0;
    let maxDamage = playerShip ? playerShip.maxDamage : 100;
    let damagePercent = damageValue / maxDamage;
    let currentHP = maxDamage - damageValue;

    if (isMobile) {
      // Mobile: Vertical stack in right half, left-aligned
      textAlign(LEFT, CENTER);
      const rightContainerStart = width / 2; // Start of right half
      const hudX = rightContainerStart + 15 * gameScale; // Left-aligned in right half
      const startY = 25 * gameScale;
      const lineHeight = 30 * gameScale;
      
      stroke(0, 0, 0, 150);
      strokeWeight(2);
      
      // Score
      fill(255);
      text(`Score: ${G.score}`, hudX, startY);
      
      // Level
      text(`Level: ${G.level.length}`, hudX, startY + lineHeight);
      
      // Lives with ship icon
      text(`Lives: ${lives}`, hudX, startY + lineHeight * 2);
      push();
      translate(hudX - 30 * gameScale, startY + lineHeight * 2);
      scale(0.7 * gameScale);
      fill(this.myred, this.mygreen, this.myblue, 255);
      stroke(255);
      strokeWeight(1);
      triangle(-10, 10, 10, 10, 0, -15);
      pop();
      
      // HP with color coding
      if (damagePercent < 0.33) {
        fill(0, 255, 0); // Green
      } else if (damagePercent < 0.66) {
        fill(255, 255, 0); // Yellow
      } else {
        fill(255, 0, 0); // Red
      }
      stroke(0, 0, 0, 150);
      strokeWeight(2);
      text(`HP: ${currentHP}/${maxDamage}`, hudX, startY + lineHeight * 3);
      
      // Shield indicator
      if (playerShip && playerShip.shieldActive && playerShip.shieldHealth > 0) {
        fill(0, 200, 255);
        stroke(0, 0, 0, 150);
        strokeWeight(2);
        text(`🛡️${Math.floor(playerShip.shieldHealth)}%`, hudX, startY + lineHeight * 4);
      }
    } else {
      // Desktop: Centered horizontal layout, compact
      textAlign(CENTER, CENTER);
      noStroke();
      const yPos = 30 * gameScale;
      const centerX = width / 2; // Center of screen
      const spacing = 110 * gameScale; // Spacing between elements
      
      // Calculate total width to center properly
      // Score, Level, Lives, HP, Shield (5 elements with 4 gaps)
      const numElements = playerShip && playerShip.shieldActive && playerShip.shieldHealth > 0 ? 5 : 4;
      const totalWidth = (numElements - 1) * spacing;
      const startX = centerX - totalWidth / 2;
      
      // Score
      fill(255);
      text(`Score: ${G.score}`, startX, yPos);
      
      // Level
      text(`Level: ${G.level.length}`, startX + spacing, yPos);
      
      // Lives with ship icon
      text(`Lives: ${lives}`, startX + spacing * 2, yPos);
      push();
      translate(startX + spacing * 2 - 35 * gameScale, yPos);
      scale(0.5 * gameScale);
      fill(this.myred, this.mygreen, this.myblue, 255);
      noStroke();
      triangle(-10, 10, 10, 10, 0, -15);
      pop();
      
      // HP with color coding
      if (damagePercent < 0.33) {
        fill(0, 255, 0);
      } else if (damagePercent < 0.66) {
        fill(255, 255, 0);
      } else {
        fill(255, 0, 0);
      }
      text(`HP: ${currentHP}/${maxDamage}`, startX + spacing * 3, yPos);
      
      // Shield indicator
      if (playerShip && playerShip.shieldActive && playerShip.shieldHealth > 0) {
        fill(0, 200, 255);
        text(`🛡️${Math.floor(playerShip.shieldHealth)}%`, startX + spacing * 4, yPos);
      }
    }
  }

  /**
   * Legacy methods for backward compatibility (deprecated)
   */
  button() {
    // This method is now handled by createHeader()
    console.warn('Controls.button() is deprecated. Use Controls.createHeader() instead.');
  }

  Scored() {
    // This method is now handled by createHeader()
    console.warn('Controls.Scored() is deprecated. HUD is now in header.');
  }

  LevelT() {
    // This method is now handled by createHeader()
    console.warn('Controls.LevelT() is deprecated. HUD is now in header.');
  }

  AsteroidCount() {
    // Removed as requested
    console.warn('Controls.AsteroidCount() is removed. Not displayed in header.');
  }

  FRAMERATE() {
    // Removed as requested
    console.warn('Controls.FRAMERATE() is removed. Not displayed in header.');
  }

  lives() {
    // This method is now handled by createHeader()
    console.warn('Controls.lives() is deprecated. HUD is now in header.');
  }

  damage() {
    // This method is now handled by createHeader()
    console.warn('Controls.damage() is deprecated. HUD is now in header.');
  }
}
/**
 * Main game file - handles setup, draw loop, and core game logic
 * Coordinates all game systems and manages the main game loop
 */

// Global controls instance
const c = new Controls();

// Global scale factor for responsive design
let gameScale = 1;

// Game state management
let gameState = 'start'; // 'start', 'playing', 'paused', 'gameOver'
let isPaused = false;

// Parallax background offset
let bgOffsetX = 0;
let bgOffsetY = 0;





/**
 * p5.js setup function - initializes the game canvas and systems
 */
function setup() {
  // Make canvas full width and height
  let canvasWidth = windowWidth;
  let canvasHeight = windowHeight;

  let cans;
  cans = createCanvas(canvasWidth, canvasHeight, P2D);
  cans.parent("agame");

  // Calculate scale factor for responsive elements based on screen size
  gameScale = min(canvasWidth / 800, canvasHeight / 500); // Base scale on 800x500 reference

  // Start with start screen
  gameState = 'start';
  showStartScreen();

  // Add click/touch listeners to start button
  let startButton = document.getElementById('start-button');
  if (startButton) {
    startButton.addEventListener('click', startGame);
    startButton.addEventListener('touchstart', startGame);
  }
}

/**
 * Draw parallax background that moves with ship
 */
function drawParallaxBackground() {
  // Get player ship for parallax calculation
  let playerShip = G.ship.find(s => !s.isEnemy);
  
  if (playerShip) {
    // Update background offset based on ship velocity (parallax effect)
    // Use a smaller multiplier for subtle parallax (0.1 = 10% of ship movement)
    bgOffsetX -= playerShip.vel.x * 0.1;
    bgOffsetY -= playerShip.vel.y * 0.1;
    
    // Wrap background offsets to create seamless tiling
    // Assuming background image is tileable
    if (G.bkg.width > 0) {
      bgOffsetX = bgOffsetX % G.bkg.width;
      bgOffsetY = bgOffsetY % G.bkg.height;
    }
  }
  
  // Draw background tiles to cover entire screen with parallax offset
  push();
  imageMode(CORNER);
  
  // Calculate how many tiles we need to cover the screen
  let tilesX = Math.ceil(width / G.bkg.width) + 2;
  let tilesY = Math.ceil(height / G.bkg.height) + 2;
  
  // Starting position (offset by parallax)
  let startX = bgOffsetX - G.bkg.width;
  let startY = bgOffsetY - G.bkg.height;
  
  // Draw tiled background
  for (let x = 0; x < tilesX; x++) {
    for (let y = 0; y < tilesY; y++) {
      image(G.bkg, startX + x * G.bkg.width, startY + y * G.bkg.height);
    }
  }
  
  pop();
}

/**
 * p5.js draw function - main game loop called every frame
 */
function draw() {
  if (gameState === 'start') {
    // Show start screen - nothing to draw here as it's handled by HTML/CSS
    return;
  }

  // Draw parallax background
  drawParallaxBackground();
  
  // Draw HUD first (always visible)
  c.displayHUD();
  
  // Handle pause state - STOP ALL GAME LOGIC
  if (isPaused) {
    // Draw pause overlay on top of frozen game
    push();
    fill(0, 0, 0, 150);
    rect(0, 0, width, height);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(48 * gameScale);
    text('PAUSED', width / 2, height / 2 - 50 * gameScale);
    textSize(24 * gameScale);
    text('Press P or ESC to resume', width / 2, height / 2 + 20 * gameScale);
    pop();
    return; // EXIT EARLY - Don't run any game logic
  }
  
  // Game logic only runs when NOT paused
  turning();
  moving();
  shipDamage(225);

  // Spawn enemy ships based on level
  spawnEnemyShips();

  // Force spawn enemy ships for testing (disabled for level 1 balancing)
  // if (frameCount % 300 === 0 && G.ship && G.ship.some(s => !s.isEnemy)) { // Every 5 seconds
  //   console.log('Force spawning enemy ship for testing');
  //   let enemyShip = new Ships(true, 0);
  //   enemyShip.fireRate = 60;
  //   enemyShip.accuracy = 0.1;
  //   enemyShip.crossingSpeed = 2;
  //   G.ship.push(enemyShip);
  //   console.log(`Force spawned enemy. Total ships: ${G.ship.length}`);
  // }

  // Update and render joysticks for mobile controls
  if (leftJoystick) leftJoystick.update();
  if (rightJoystick) rightJoystick.update();
  renderJoysticks();

  // Handle mobile joystick input
  if (Joystick.isMobile() && rightJoystick) {
    let moveVec = rightJoystick.getVector();
    if (moveVec.mag() > 0.1) {
      let playerShip = G.ship.find(s => !s.isEnemy);
      if (playerShip) {
        // Calculate target heading from joystick
        let targetHeading = moveVec.heading();

        // Calculate angle difference and normalize to -PI to PI
        let angleDiff = targetHeading - playerShip.heading;
        angleDiff = (angleDiff + PI) % (2 * PI) - PI;

        // Limit turn rate (radians per frame)
        let maxTurnRate = 0.08; // Adjust this value to control turn speed
        let turnAmount = constrain(angleDiff, -maxTurnRate, maxTurnRate);

        // Incrementally turn towards target heading
        playerShip.heading += turnAmount;

        // Only boost if joystick is pushed forward (in direction ship is facing)
        let forwardComponent = moveVec.dot(p5.Vector.fromAngle(playerShip.heading));
        if (forwardComponent > 0.1) {
          playerShip.boosting(true);
          // Apply force in the direction the ship is facing, scaled by joystick forward component
          let boostForce = p5.Vector.fromAngle(playerShip.heading);
          boostForce.mult(forwardComponent * 0.5); // Scale boost by forward component
          playerShip.vel.add(boostForce);
          // Trigger thruster graphics and sound for mobile
          playerShip.thrust();
          // Limit velocity
          let maxSpeed = 8;
          if (playerShip.vel.mag() > maxSpeed) {
            playerShip.vel.setMag(maxSpeed);
          }
        } else {
          playerShip.boosting(false);
        }
      }
    } else {
      let playerShip = G.ship.find(s => !s.isEnemy);
      if (playerShip) {
        playerShip.boosting(false);
      }
    }
  }

  // Fire button now fires directly in Joystick.touchStarted, so no need to check isFiring() here

  drawShip();
  drawAsteroid();

  // Check laser collisions with ships
  checkLaserShipCollisions();

  // Render particles for explosions
  drawParts();

  // Update performance stats
  if (window.stats) {
    window.stats.update();
  }
}

/**
 * Spawn enemy ships based on level and timing
 */
function spawnEnemyShips() {
  // Only spawn if player ship exists
  if (!G.ship || !G.ship.some(s => !s.isEnemy)) return;

  // Calculate spawn parameters based on level
  let currentLevel = G.level.length;
  let enemyCount = G.ship.filter(s => s.isEnemy).length;

  // Level-based spawn configuration with increasing frequency
  let spawnConfig = {
    1: { rate: 1800, max: 1, chance: 0.6 },   // 30 seconds, 1 enemy, 60% chance
    2: { rate: 1200, max: 2, chance: 0.7 },   // 20 seconds, 2 enemies, 70% chance
    3: { rate: 900, max: 3, chance: 0.8 },    // 15 seconds, 3 enemies, 80% chance
    4: { rate: 720, max: 4, chance: 0.85 },   // 12 seconds, 4 enemies, 85% chance
    5: { rate: 600, max: 5, chance: 0.9 },    // 10 seconds, 5 enemies, 90% chance
  };

  // For levels beyond 5, keep increasing difficulty
  let config = spawnConfig[currentLevel] || {
    rate: Math.max(300, 600 - (currentLevel - 5) * 50),  // Minimum 5 seconds
    max: Math.min(8, 5 + Math.floor((currentLevel - 5) / 2)), // Max 8 enemies
    chance: Math.min(0.95, 0.9 + (currentLevel - 5) * 0.01)  // Max 95% chance
  };

  // Check if we should spawn
  if (enemyCount < config.max && frameCount % config.rate === 0 && random() < config.chance) {
    let enemyShip = new Ships(true, 0); // Create enemy ship

    // Adjust enemy properties based on level - gets harder each level
    enemyShip.fireRate = Math.max(20, 60 - currentLevel * 4); // Faster firing (min 20 frames = 3 shots/sec)
    enemyShip.accuracy = Math.min(0.9, 0.1 + currentLevel * 0.08); // More accurate (max 90%)
    enemyShip.crossingSpeed = 1.5 + currentLevel * 0.3; // Faster movement
    enemyShip.maxDamage = 100 + currentLevel * 10; // Tougher enemies at higher levels

    G.ship.push(enemyShip);
  }
}

/**
 * Render and update all active particles
 */
function drawParts() {
  for (let p = G.parts.length - 1; p >= 0; p--) {
    let P = G.parts[p];
    P.show();
    P.update();

    // Return inactive particles to pool and remove from active array
    if (!P.active) {
      // Return to particle pool if available
      if (G.particlePool && G.particlePool.length < 1000) {
        // Reset particle properties before returning to pool
        P.alpha = 255;
        P.lifespan = 300;
        P.vel.set(0, 0);
        P.acc.set(0, 0);
        P.active = false;
        G.particlePool.push(P);
      }
      G.parts.splice(p, 1);
    }
  }
}

/**
 * Handle key press events for ship controls
 */
function keyPressed() {
  if (gameState === 'start') {
    startGame();
    return false;
  }

  // Handle pause toggle (P key or ESC)
  if (keyCode == 80 || keyCode == 27) { // P or ESC
    isPaused = !isPaused;
    return false;
  }
  
  // Don't process other keys when paused
  if (isPaused) {
    return false;
  }

  if (keyCode == 32) { // Spacebar for shooting
    // Find player ship
    let playerShip = G.ship.find(s => !s.isEnemy);
    if (playerShip) {
      let laserPos = p5.Vector.fromAngle(playerShip.heading);
      laserPos.mult(playerShip.r + 10);
      laserPos.add(playerShip.pos);
      G.lasers.push(new Laser(laserPos, playerShip.heading));
      G.fire.play();
    }
  } else if (keyCode == 38 || keyCode == 87) { // Up arrow or W key for acceleration
    // Find player ship
    let playerShip = G.ship.find(s => !s.isEnemy);
    if (playerShip) {
      playerShip.boosting(true);
    }
  } else if (keyCode == 70 || keyCode == 48) { // F key or 0 key for shield (level 2+)
    let playerShip = G.ship.find(s => !s.isEnemy);
    if (playerShip && G.level.length >= 2) {
      playerShip.shieldActive = true;
    }
  }
  return false;
}

/**
 * Handle key release events for ship controls
 */
function keyReleased() {
  if (keyCode == 38 || keyCode == 87) {
    // Up arrow or W key - stop boosting when released (all levels)
    let playerShip = G.ship.find(s => !s.isEnemy);
    if (playerShip) {
      playerShip.boosting(false);
    }
  } else if (keyCode == 70 || keyCode == 48) {
    // F key or 0 key for shield
    let playerShip = G.ship.find(s => !s.isEnemy);
    if (playerShip) {
      playerShip.shieldActive = false;
    }
  }
}

/**
 * Check collisions between lasers and ships (both player and enemy)
 */
function checkLaserShipCollisions() {
  if (!G.lasers || !G.ship) return;

  for (let i = G.lasers.length - 1; i >= 0; i--) {
    let laser = G.lasers[i];
    if (!laser || laser.contact) continue;

    for (let j = G.ship.length - 1; j >= 0; j--) {
      let ship = G.ship[j];
      if (!ship) continue;

      // Prevent friendly fire - player lasers don't hit player ships, enemy lasers don't hit enemy ships
      if ((laser.isEnemy && ship.isEnemy) || (!laser.isEnemy && !ship.isEnemy)) {
        continue;
      }

      // Check if laser hits this ship
      if (laser.hits(ship)) {
        // Apply damage to the ship with shield absorption
        ship.applyDamage(laser.r * 125); // Damage based on laser size

        // Activate particles from ship's pool
        ship.activateParticlesFromPool();

        // Remove the laser
        G.lasers.splice(i, 1);
        break; // Laser can only hit one ship
      }
    }
  }
}

/**
 * Show the start screen
 */
function showStartScreen() {
  let startScreen = document.getElementById('start-screen');
  if (startScreen) {
    startScreen.style.display = 'flex';
  // startScreen.classList.toggle('open', true);
    
  }
}

/**
 * Hide the start screen and start the game
 */
function startGame() {
  gameState = 'playing';
  let startScreen = document.getElementById('start-screen');
  if (startScreen) {
    startScreen.style.display = 'none';
    // startScreen.classList.toggle('open', false); 
  }

  // Initialize game after user interaction
  new resetGame();
  c.createHeader(); // Create the transparent header with buttons and HUD
  initJoysticks(); // Initialize mobile joysticks
  playBeat(2500, G.thruster);
}

/**
 * Handle mouse press events
 */
function mousePressed() {
  if (gameState === 'start') {
    startGame();
  }
  return false;
}

function windowResized() {
  // Make canvas full width and height on resize
  let canvasWidth = windowWidth;
  let canvasHeight = windowHeight;

  resizeCanvas(canvasWidth, canvasHeight);

  // Recalculate scale factor
  gameScale = min(canvasWidth / 800, canvasHeight / 500);

  initJoysticks(); // Reinitialize joysticks on resize
}

class Joystick {
  constructor(x, y, radius, isMovement = false) {
    this.basePos = createVector(x, y); // Base position of joystick
    this.stickPos = createVector(x, y); // Current stick position
    this.radius = radius; // Maximum movement radius
    this.isMovement = isMovement; // Whether this is a movement joystick (true) or fire button (false)
    this.isActive = false; // Whether joystick is being touched
    this.touchId = null; // ID of the touch controlling this joystick
    this.vector = createVector(0, 0); // Movement vector (normalized -1 to 1)
    this.joystickImg = loadImage('IMG/joystick.png'); // Will hold the joystick image
    this.id = 'joystick_' + Math.random().toString(36).substr(2, 9); // Unique ID for this joystick
    
    // Fire rate limiting properties (for fire button only)
    this.lastFireTime = 0; // Timestamp of last fire
    this.fireRate = 200; // Milliseconds between shots (5 shots per second)
    this.isFiring = false; // Whether fire button is currently being held
  }
  

  
  
  static isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (window.innerWidth <= 768 && window.innerHeight <= 1024);
  }

isTouchInRadius(touch) {
    const dx = touch.x - this.basePos.x;
    const dy = touch.y - this.basePos.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.radius;
  }
  
  isTrackingTouch(touch) {
    return this.touchId === touch.identifier;
  }
  /**
   * Handle touch start event
   */
  touchStarted(touch) {
    if (this.isTouchInRadius(touch)) {
      this.isActive = true;
      this.touchId = touch.identifier;
      
      // Only update stick position for movement joystick
      if (this.isMovement) {
        this.updateStickPosition(touch);
      }
      
      return true; // Touch captured
    }
    return false; // Touch not for this joystick
  }

  /**
   * Handle touch move event
   */
  touchMoved(touch) {
    if (this.isTrackingTouch(touch)) {
      // Only movement joystick can move, fire button stays stationary
      if (this.isMovement) {
        this.updateStickPosition(touch);
      }
      return true;
    }
    return false;
  }

  /**
   * Handle touch end event
   */
  touchEnded(touch) {
    // Only process if this touch belongs to this joystick
    if (this.touchId === touch.identifier) {
      this.isActive = false;
      this.touchId = null;
      this.isFiring = false;
      
      // Only reset position for movement joystick
      if (this.isMovement) {
        this.stickPos = this.basePos.copy();
        this.vector.set(0, 0);
      }
      
      return true;
    }
    return false;
  }



  /**
   * Update stick position based on touch
   */
  updateStickPosition(touch) {
    let dir = createVector(touch.x - this.basePos.x, touch.y - this.basePos.y);
    let mag = dir.mag();

    if (mag > this.radius) {
      dir.normalize();
      dir.mult(this.radius);
    }

    this.stickPos = p5.Vector.add(this.basePos, dir);

    // Calculate normalized vector for movement
    this.vector = dir.copy();
    this.vector.div(this.radius);
  }

  /**
   * Update joystick state (called every frame)
   */
  update() {
    // Always spring back to center for movement joystick
    let dir = p5.Vector.sub(this.basePos, this.stickPos);
    let distance = dir.mag();

    if (distance > 0.1) { // Only animate if not already at center
      // Use lerp for smooth spring effect - increased speed for better responsiveness
      this.stickPos.lerp(this.basePos, 0.25); // Increased from 0.15 to 0.25 for faster spring

      // Update vector based on current position
      let currentDir = p5.Vector.sub(this.stickPos, this.basePos);
      this.vector = currentDir.copy();
      this.vector.div(this.radius);
    } else {
      // Snap to exact center when very close
      this.stickPos = this.basePos.copy();
      this.vector.set(0, 0);
    }
  }

  /**
   * Render the joystick
   */
  render() {
    if (!Joystick.isMobile()) return; // Only show on mobile

    push();

    // Draw joystick base (semi-transparent circle)
    fill(255, 255, 255, 100);
    stroke(255, 255, 255, 150);
    strokeWeight(2);
    ellipse(this.basePos.x, this.basePos.y, this.radius * 4);

    // For fire button, draw centered icon. For movement joystick, draw moveable stick
    if (this.isMovement) {
      // Movement joystick - draw moveable stick
      if (this.joystickImg) {
        imageMode(CENTER);
        image(this.joystickImg, this.stickPos.x, this.stickPos.y, this.radius * 0.8, this.radius * 0.8);
      } else {
        fill(255, 255, 255, 200);
        stroke(255);
        strokeWeight(1);
        ellipse(this.stickPos.x, this.stickPos.y, this.radius * 0.6);
      }
    } else {
      // Fire button - draw stationary icon at center with visual feedback when pressed
      let buttonAlpha = this.isActive ? 255 : 200;
      let buttonSize = this.isActive ? this.radius * 1.5 : this.radius * 0.8;
      
      if (this.joystickImg) {
        imageMode(CENTER);
        tint(255, buttonAlpha);
        image(this.joystickImg, this.basePos.x, this.basePos.y, buttonSize, buttonSize);
        noTint();
      } else {
        fill(255, 100, 100, buttonAlpha); // Red color for fire button
        stroke(255);
        strokeWeight(2);
        ellipse(this.basePos.x, this.basePos.y, buttonSize);
      }
    }

    pop();
  }

  /**
   * Get current movement vector
   */
  getVector() {
    return this.vector.copy();
  }
  /**
   * Check if joystick can fire (with rate limiting)
   * @returns {boolean} True if enough time has passed since last fire
   */
  isFiring() {
    if (!this.isActive) return false;
    
    const now = Date.now();
    if (now - this.lastFireTime >= this.fireRate) {
      this.lastFireTime = now;
      return true;
    }
    return false;
  }

  /**
   * Fire a laser from the player ship with rate limiting
   * Called when fire button is tapped
   */
  fireLaser() {
    // Check rate limiting
    const now = Date.now();
    if (now - this.lastFireTime < this.fireRate) {
      return false; // Too soon since last fire
    }
    
    let playerShip = G.ship.find(s => !s.isEnemy);
    if (playerShip) {
      let laserPos = p5.Vector.fromAngle(playerShip.heading);
      laserPos.mult(playerShip.r + 10);
      laserPos.add(playerShip.pos);
      G.lasers.push(new Laser(laserPos, playerShip.heading));
      if (G.fire) G.fire.play();
      this.lastFireTime = now;
      return true;
    }
    
    return false;
  }
}

// Global joystick instances
let leftJoystick = null; // Fire button (left side)
let rightJoystick = null; // Movement joystick (right side)

/**
 * Initialize joysticks for mobile play
 */
function initJoysticks() {
  if (!Joystick.isMobile()) return;

  let joystickRadius = 50;
  let bottomMargin = 100;

  // Fire button (left side)
  leftJoystick = new Joystick(width * 0.25, height - bottomMargin, joystickRadius/2, false);

  // Right joystick (movement)
  rightJoystick = new Joystick(width * 0.75, height - bottomMargin, joystickRadius/2, true);
}

/**
 * Handle touch events for joysticks
 */
function handleJoystickTouches(touches, eventType) {
  if (!Joystick.isMobile() || !leftJoystick || !rightJoystick) return;

  for (let touch of touches) {
    if (eventType === 'start') {
      // Check BOTH joysticks independently - remove else-if to allow both to activate
      if (leftJoystick.isTouchInRadius(touch) && !leftJoystick.isTrackingTouch(touch)) {
        leftJoystick.touchStarted(touch);
        leftJoystick.fireLaser();
      }
      if (rightJoystick.isTouchInRadius(touch) && !rightJoystick.isTrackingTouch(touch)) {
        rightJoystick.touchStarted(touch);
      }
    } else if (eventType === 'move') {
      // Check BOTH joysticks independently
      if (leftJoystick.isTrackingTouch(touch)) {
        leftJoystick.touchMoved(touch);
      }
      if (rightJoystick.isTrackingTouch(touch)) {
        rightJoystick.touchMoved(touch);
      }
    } else if (eventType === 'end') {
      // Check BOTH joysticks independently
      if (leftJoystick.isTrackingTouch(touch)) {
        leftJoystick.touchEnded(touch);
      }
      if (rightJoystick.isTrackingTouch(touch)) {
        rightJoystick.touchEnded(touch);
      }
    }
  }
}

function renderJoysticks() {
  if (!Joystick.isMobile() || !leftJoystick || !rightJoystick) return;
  leftJoystick.render();
  rightJoystick.render();
}

/**
 * Render joysticks
 */

function touchStarted() {
  // Handle start screen touch to begin game
  if (gameState === 'start') {
    startGame();
    return false;
  }

  // Handle joystick touches
  handleJoystickTouches(touches, 'start');
  return false;
}

function touchMoved() {
  handleJoystickTouches(touches, 'move');
  return false;
}

function touchEnded() {
  // When a touch ends, we need to check ALL joysticks to see which one was tracking it
  // The 'touches' array only contains remaining touches, not the one that ended
  if (!Joystick.isMobile() || !leftJoystick || !rightJoystick) return false;
  
  // Check each joystick to see if it should deactivate
  // We can't rely on the touches array here since the ended touch is not in it
  // Instead, check if the joystick's tracked touch is still in the touches array
  let leftTouchStillActive = touches.some(t => t.identifier === leftJoystick.touchId);
  let rightTouchStillActive = touches.some(t => t.identifier === rightJoystick.touchId);
  
  // If the joystick's touch is not in the remaining touches, it ended
  if (leftJoystick.isActive && !leftTouchStillActive) {
    leftJoystick.isActive = false;
    leftJoystick.touchId = null;
    leftJoystick.isFiring = false;
  }
  
  if (rightJoystick.isActive && !rightTouchStillActive) {
    rightJoystick.isActive = false;
    rightJoystick.touchId = null;
    rightJoystick.isFiring = false;
    rightJoystick.stickPos = rightJoystick.basePos.copy();
    rightJoystick.vector.set(0, 0);
  }
  
  return false;
}

/**
 * Get movement vector from right joystick
 */
function getMovementVector() {
  if (!Joystick.isMobile() || !rightJoystick) return createVector(0, 0);
  
  return rightJoystick.getVector();
}

/**
 * Check if fire button is pressed (legacy function, may not be needed)
 */
function isFirePressed() {
  if (!Joystick.isMobile() || !leftJoystick) return false;
  return leftJoystick.isActive;
}
