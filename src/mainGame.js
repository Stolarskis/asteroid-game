import { throws } from "assert";
import { runInThisContext } from "vm";

import Bolt from "./projectiles/Bolt.js";
import AsteroidController from "./asteroids/AsteroidController.js";
import PlayerHud from "./PlayerHud.js";
import Player from "./Player.js";
import Background from "./Background.js";

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
    this.background = new Background(this);
    this.cursorKeys = this.input.keyboard.createCursorKeys();

    //Create physics group, objects will be added automatically when a bolt object/asteroid is created
    this.bolts = this.physics.add.group();
    this.asteroids = this.physics.add.group();
    this.players = this.physics.add.group();

    this.player = new Player(this, 800, 0.999);

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

    //Only allow game to reload when player has died.
    this.input.keyboard.on("keydown_ENTER", () => {
      if (!this.player.playerAlive) {
        this.scene.restart();
      }
    });
  }

  update() {
    this.physics.world.wrap(this.asteroids, 32);
    this.physics.world.wrap(this.bolts, 32);
    this.physics.world.wrap(this.player, 32);
    if (this.player.playerAlive) {
      this.speedController();
      this.directionController();
      this.inertiaDampenerController();
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
