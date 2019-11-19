import Phaser from "phaser";
import Socket from "socket.io-client"
import mainGame from "./mainGame.js"
import mainMenu from "./mainMenu.js"

const config = {
  //type: Phaser.AUTO,
  //parent: "phaser-example",
  //width: window.innerWidth * window.devicePixelRatio,
  //height: window.innerHeight * window.devicePixelRatio,

  type: Phaser.CANVAS,
  width: 1600,
  height: 920,
  pixelArt:true,
  scene: [mainMenu,mainGame],
  physics:{
      default: "arcade",
      arcade: {}
  }
};

let game = new Phaser.Game(config);
