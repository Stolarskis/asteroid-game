import { throws } from "assert";
import { runInThisContext } from "vm";

import Bolt from "./projectiles/Bolt.js";
import AsteroidController from "./asteroids/AsteroidController.js";
import PlayerHud from "./PlayerHud.js";

class mainGame extends Phaser.Scene {
  constructor() {
    super("mainGame");
  }

  create() {
    //Game World Deminsions
    this.worldWidth = 800;
    this.worldHeight = 600;
    this.difficultyMultiplier = 5;
    this.level = 1;
    this.scoreIncrease = 30;
    this.bulletFrequency = 75;

    this.createWorld(this.worldHeight, this.worldWidth);
    this.createBackground();
    this.createPlayer();

    //Create physics group, objects will be added automatically when a bolt object/asteroid is created
    this.bolts = this.physics.add.group();
    this.asteroids = this.physics.add.group();

    //Colliders are used to trigger functions when two objects collide
    this.createColliders();

    //Camera Setup
    this.myCam = this.cameras.main;
    //Scenes are infinite, so we set boundaries with the camera and the player
    this.myCam.setBounds(0, 0, this.worldWidth, this.worldHeight);
    //Tell the camera to follow the player
    this.myCam.startFollow(this.player);

    //Create asteroidController
    this.asteroidController = new AsteroidController();
    this.createPlayerHUD();

    //Start Level 1
    this.spawnWaveOfAsteroids(1);

    //Used to space out time between shots for shooting controller method
    this.bulletTime = this.time.now;
  }

  update() {
    if (!this.disablePlayer) {
      this.speedController();
      this.directionController();
      this.inertiaDampenerController();
      this.parallaxController();
      this.shootingController();

      //Wait until wave is completed
      if (this.asteroids.getLength() === 0) {
        this.level += 1;
        this.playerHud.updateLevel(this.level);
        this.spawnWaveOfAsteroids(this.level);
      }
    }
  }

  //Main player movement functions

  //Controls player input for acceleration and deceleration
  speedController() {
    if (this.cursorKeys.up.isDown) {
      //Accelerate
      this.physics.velocityFromRotation(
        this.player.rotation,
        250,
        this.player.body.acceleration
      );
    } else if (this.cursorKeys.down.isDown) {
      //Decelerate
      this.physics.velocityFromRotation(
        this.player.rotation,
        -250,
        this.player.body.acceleration
      );
    } else {
      this.player.setAcceleration(0);
    }
  }
  //Controlers player input for rotation
  directionController() {
    if (this.cursorKeys.left.isDown) {
      //Rotate left
      this.player.setRotation(this.player.rotation - 0.15);
    } else if (this.cursorKeys.right.isDown) {
      //Rotate Right
      this.player.setRotation(this.player.rotation + 0.15);
    }
  }

  //Shooting Controller
  shootingController() {
    //Working solution to not allowing the player to just hold the down key.
    //Later on I want to implement a recharging ammo system. But thats for a later day
    if (this.cursorKeys.space.isDown && this.bulletTime <= this.time.now) {
      this.bulletTime = this.time.now + this.bulletFrequency;
      new Bolt(this);
    }
  }

  setupShootingEvent() {}

  //Toggles player drag on and off
  inertiaDampenerController() {
    if (this.cursorKeys.shift.isDown) {
      if (this.dampeners) {
        this.dampeners = false;
        this.player.setDrag(0);
      } else {
        this.dampeners = true;
        this.player.setDrag(0.99);
      }
    }
  }

  //Controls tilesprites scroll factor.
  //Parallax functinos by moving objects (tilesprites) across the screen, based on camera movement, at different speeds.
  //Objects supposed to be closer up move faster while objects supposed to be far away move slower. This creates a depth effect.
  parallaxController() {
    this.planet_far.tilePositionX = this.myCam.scrollX * 0.05;
    this.planet_far.tilePositionY = this.myCam.scrollY * 0.05;
    this.planet_ring.tilePositionX = this.myCam.scrollX * 0.1;
    this.planet_ring.tilePositionY = this.myCam.scrollY * 0.1;
    this.planet_big.tilePositionX = this.myCam.scrollX * 0.22;
    this.planet_big.tilePositionY = this.myCam.scrollY * 0.22;
  }

  createWorld(worldHeight, worldWidth) {
    this.bounds = this.physics.world.setBounds(
      0,
      0,
      worldWidth,
      worldHeight,
      true,
      true,
      true,
      true
    );
    //Upon a collision with world boundries, delete whatever body comes in contact.
    //This only works if the object's body is set to collide with boundries and onWorldsBounds is set to true.
    this.physics.world.on(
      "worldbounds",
      function(body) {
        body.gameObject.destroy();
      },
      this
    );
  }

  createBackground() {
    this.background = this.add.image(
      window.innerWidth / 2,
      window.innerHeight / 2,
      "background"
    );
    this.background.setDisplaySize(window.innerWidth, window.innerHeight);

    this.background.setSize(window.innerWidth, window.innerHeight);
    this.background.setScrollFactor(0);

    //Add in stars layer
    this.stars = this.add.tileSprite(
      0,
      0,
      this.sys.canvas.width,
      this.sys.canvas.height,
      "stars"
    );
    this.stars.setScale(2);
    this.stars.setScrollFactor(0);

    //Add in far off planets layer
    this.planet_far = this.add.tileSprite(
      0,
      0,
      this.sys.canvas.width,
      this.sys.canvas.height,
      "planet_far"
    );
    this.planet_far.setScale(6);
    this.planet_far.setScrollFactor(0);

    //Add in ring planet layer
    this.planet_ring = this.add.tileSprite(0, 0, 2000, 2000, "planet_ring");
    this.planet_ring.setScale(5);
    this.planet_ring.setScrollFactor(0);

    //Add in big planets layer
    this.planet_big = this.add.tileSprite(
      -1000,
      -200,
      this.sys.canvas.width,
      this.sys.canvas.height,
      "planet_big"
    );
    this.planet_big.setScale(4);
    this.planet_big.setScrollFactor(0);
  }

  createPlayer() {
    //Player Settings
    this.playerMaxVelocity = 600;
    this.playerDrag = 0.99;
    //Create player in the center of the world
    this.player = this.physics.add.sprite(
      this.worldWidth / 2,
      this.worldHeight / 2,
      "player_sprite"
    );
    //Double the size + Play the player idle anim
    this.player.setScale(2);
    this.player.play("playerIdle_anim");

    //Player input/movement settings
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    //this.cursorKeys.space.setEmitOnRepeat(true);
    //Drag will use a damping effect rather than a linear approach. Much smoother brakes.
    this.player.setDamping(true);
    this.player.setDrag(this.playerDrag);
    //Used for the toggle in the dampener function
    this.dampeners = true;
    this.player.setMaxVelocity(this.playerMaxVelocity);
    this.player.setCollideWorldBounds(true);

    //Alter Player Hitbox
    this.player.setSize(14, 14);
    this.player.setOffset(5, 0);

    //In order to play the explosion animation we need the player to exist.
    //This is used to disable player input when the player dies.
    this.disablePlayer = false;
    //Upon player death we want to play an animation and then kill the player.
  }

  //ASK RON!!! Im not able to access the scene here for some reason. WHY????
  killPlayer(player, asteroid, scene) {
    if (!this.disablePlayer) {
      //Upon Collision, play the explosion animation
      player.play("explosion_anim");
      //Destroy asteroid for a better impact
      asteroid.destroyAsteroid();
      //If we delete the player right after playing the explosion anim the game will crash.
      //This will cut the animation short && the player controller functions will crash the game because
      //they are still lisening for player input on an object that no longer exists.

      //To fix this we wait until the animation is complete BEFORE we destroy the player object.
      player.on(
        "animationcomplete",
        () => {
          player.destroy();
        },
        scene
      );

      //It is possible that before the explosion animation is finished the player will hit another asteroid.
      //This causes this function to be invoked again causes the player to crash because in that time the player object
      //has been deleted.

      //To fix this we use the disable player member to prevent this function from being called again && disable the player input listener functions.
      scene.disablePlayer = true;
    }
  }

  createColliders() {
    //Colliders are used to trigger functions when two objects collide

    //When a bolt collides with an asteroid, destroy that asteroid
    this.physics.add.collider(this.bolts, this.asteroids, (bolt, asteroid) => {
      this.score += this.scoreIncrease;
      this.playerHud.updateScore(this.score);
      delete bolt.destroy();
      asteroid.destroyAsteroid();
    });

    //This allows asteroids to collide with one another rather than move through one another.
    this.physics.add.collider(this.asteroids, this.asteroids);

    //When the player collides with an asteroid, destroy that asteroid and end the game.
    this.physics.add.collider(
      this.player,
      this.asteroids,
      (player, asteroid) => {
        if (!this.disablePlayer) {
          this.killPlayer(player, asteroid, this);
          this.playerHud.displayGameOverOverlay(this);
        }
      }
    );
  }

  spawnWaveOfAsteroids(level) {
    this.asteroidController.genAsteroids(
      this,
      level * this.difficultyMultiplier
    );
  }
  createPlayerHUD() {
    this.score = 0;
    this.lives = 3;
    this.playerHud = new PlayerHud(this);
  }
}

export default mainGame;
