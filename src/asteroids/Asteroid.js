class Asteroid extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, rotation, speed) {
    super(scene, x, y, texture);

    this.scene = scene;
    //Then add to scene
    scene.add.existing(this);
    //Add to physics group
    scene.asteroids.add(this);

    //Configuration for asteroids
    this.setScale(2);
    this.setRotation(rotation);
    scene.physics.world.enableBody(this);
    //Set so the projectiles collide with the set world boundries
    this.setCollideWorldBounds(true);

    //Set Asteroid speed and direction
    scene.physics.velocityFromRotation(rotation, speed, this.body.velocity);
  }
}

export default Asteroid;