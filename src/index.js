import Phaser from "phaser";
import mainGame from "./mainGame.js";
import mainMenu from "./mainMenu.js";

const config = {
  //type: Phaser.AUTO,
  //parent: "phaser-example",
  //width: window.innerWidth * window.devicePixelRatio,
  //height: window.innerHeight * window.devicePixelRatio,

  type: Phaser.CANVAS,
  width: window.innerWidth,
  height: window.innerHeight,
  pixelArt: true,
  scene: [mainMenu, mainGame],
  physics: {
    default: "matter"
  }
};

let game = new Phaser.Game(config);
