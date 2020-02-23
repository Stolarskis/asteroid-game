import Phaser from "phaser";
import mainGame from "./mainGame.js";
import mainMenu from "./mainMenu.js";

const config = {
  type: Phaser.CANVAS,
  width: 800,
  height: 600,
  pixelArt: true,
  scene: [mainMenu, mainGame],
  physics: {
    default: "arcade",
    arcade: { debug: true }
  }
};

let game = new Phaser.Game(config);
