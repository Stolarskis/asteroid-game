import { throws } from "assert";
import { runInThisContext } from "vm";

import Bolt from "./Bolt.js";

class mainGame extends Phaser.Scene {
  constructor() {
    super("mainGame");
  }

  create() {
    //Game World Deminsions
    this.worldHeight = 10000;
    this.worldWidth = 10000;

    this.createWorld(this.worldHeight, this.worldWidth);
    //Upon a collision with world boundries, delete whatever body comes in contact.
    //This only works if the object's body is set to collide with boundries and onWorldsBounds is set to true.

    //Create physics group, objects will be added automatically when a bolt object is created
    //    this.bolts = this.physics.add.group();

    //Add in parallax background layers
    this.createBackground();

    this.asteroid = this.matter.add.sprite(
      this.matter.world,
      this.worldWidth / 2,
      this.worldHeight / 2,
      "large_asteroid",
      2
    );
    //this.matter.applyForceFromAngle(this.asteroid.body.vel, 0.1, 0.01);

    this.asteroid.setScale(2);
    this.createPlayer();

    //Camera Setup
    this.myCam = this.cameras.main;
    //Scenes are infinite, so we set boundaries with the camera and the player
    this.myCam.setBounds(0, 0, this.worldWidth, this.worldHeight);
    //Tell the camera to follow the player
    this.myCam.startFollow(this.player);
  }

  update() {
    this.speedController();
    this.directionController();
    //this.inertiaDampenerController();
    this.parallaxController();
    this.shootingController();
  }

  //Main player movement functions

  //Controls player input for acceleration and deceleration
  speedController() {
    if (this.cursorKeys.up.isDown) {
      //Accelerate
      /**
      this.physics.velocityFromRotation(
        this.player.rotation,
        250,
        this.player.body.acceleration
      );
      */
      this.matter.applyForceFromAngle(
        this.player.body,
        0.01,
        this.player.rotation
      );
      //this.matter.applyForceFromAngle(this.player.rotation, 0.1, 0.01);
    } else if (this.cursorKeys.down.isDown) {
      //Decelerate
      /**
      this.physics.velocityFromRotation(
        this.player.rotation,
        -250,
        this.player.body.acceleration
      );
      */
      this.matter.applyForceFromAngle(
        this.player.body,
        -0.01,
        this.player.rotation
      );
    } else {
      this.player.body.acceleration = 0;
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
    if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.space)) {
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
    this.bounds = this.matter.world.setBounds({
      setBounds: {
        width: this.worldWidth,
        height: this.worldHeight
      }
    });
    //Upon a collision with world boundries, delete whatever body comes in contact.
    //This only works if the object's body is set to collide with boundries and onWorldsBounds is set to true.
    this.matter.world.on(
      "worldbounds",
      function(body) {
        body.gameObject.destroy();
      },
      this
    );
  }

  createBackground() {
    this.background = this.add.tileSprite(
      0,
      0,
      this.sys.canvas.width,
      this.sys.canvas.height,
      "background"
    );
    this.background.setScale(6);
    this.background.setOrigin(0, 0);
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
    this.player = this.matter.add.sprite(
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
    //this.player.setDamping(true);
    //this.player.setDrag(this.playerDrag);
    //Used for the toggle in the dampener function
    //this.dampeners = true;
    //this.player.setMaxVelocity(this.playerMaxVelocity);
    //this.player.setCollideWorldBounds(true);
  }
}

export default mainGame;
