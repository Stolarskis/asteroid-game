import { throws } from "assert";
import { runInThisContext } from "vm";

import Bolt from "./Bolt.js"

class mainGame extends Phaser.Scene {
    constructor() {
        super("mainGame");
    }

    create() {
        //Game World Deminsions
        this.worldHeight = 1440;
        this.worldWidth = 2448;
        this.bounds = this.physics.world.setBounds(0,0,this.worldWidth,this.worldHeight,true,true,true,true);
        //Upon a collision with world boundries, delete whatever body comes in contact.
        //This only works if the object's body is set to collide with boundries and onWorldsBounds is set to true. 
        this.physics.world.on('worldbounds',function(body){
            body.gameObject.destroy();
        },this);

        //Create physics group, objects will be added automatically when a bolt object is created
        this.bolts = this.physics.add.group();

        //Player Settings
        this.playerMaxVelocity = 400;
        this.playerDrag = 0.99;

        //Add in parallax background layers
        
        //Add in galaxy layer 
        this.background = this.add.tileSprite(0, 0, this.sys.canvas.width, this.sys.canvas.height, "background");
        this.background.setScale(6);
        this.background.setOrigin(0, 0);
        this.background.setScrollFactor(0);

        //Add in stars layer
        this.stars = this.add.tileSprite(0, 0, this.sys.canvas.width, this.sys.canvas.height, "stars");
        this.stars.setScale(2);
        this.stars.setScrollFactor(0)

        //Add in far off planets layer
        this.planet_far = this.add.tileSprite(0, 0, this.sys.canvas.width, this.sys.canvas.height, "planet_far");
        this.planet_far.setScale(6);
        this.planet_far.setScrollFactor(0)

        //Add in ring planet layer
        this.planet_ring = this.add.tileSprite(0, 0, 2000, 2000, "planet_ring");
        this.planet_ring.setScale(5);
        this.planet_ring.setScrollFactor(0)

        //Add in big planets layer
        this.planet_big = this.add.tileSprite(-1000, -200, this.sys.canvas.width, this.sys.canvas.height, "planet_big");
        this.planet_big.setScale(4);
        this.planet_big.setScrollFactor(0);

        /**
        //Create player in the center of the world 
        this.player = this.physics.add.sprite(this.worldWidth / 2, this.worldHeight / 2, "player_sprite");
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
        */

        this.cursorKeys = this.input.keyboard.createCursorKeys();
        //Camera Setup
        this.myCam = this.cameras.main;
        //Scenes are infinite, so we set boundaries with the camera and the player
        this.myCam.setBounds(0, 0, this.worldWidth, this.worldHeight);

        //Experimental socket.io
        //var self = this;
        this.players = this.physics.add.group()
        this.socket = io();
        var self = this;


        this.socket.on('currentPlayers', function (players) {
            Object.keys(players).forEach(function (id) {
                //console.log(id)
                //console.log(players[id]);
                if (players[id].playerId === self.socket.id) {
                    //Here is where we would init player
                    self.addPlayer(self,players[id]);
                }else{
                    self.addOtherPlayers(self,players[id]);
                }
            });
        });

        //When a new player connects, our server will send us just that players data
        //We add that player to the players group and reander it via the `addPlayer` function
        this.socket.on('newPlayer', function(player){
            self.addOtherPlayers(self, player)
        });

        //Upon receiving a disconnect event, we check the given player id in our player group. 
        //If we find it (we should always find it) then we delete that player's object from the group/game
        this.socket.on('disconnect', function (playerId) {
            self.players.getChildren().forEach(function (players) {
                if (playerId === players.playerId) {
                    players.destroy();
                }
                else{
                    console.error("Player does not exist");
                }
            });
        });

        this.socket.on('playerMoved', function (playerInfo) {
            self.players.getChildren().forEach(function (otherPlayer) {
                if (playerInfo.playerId === otherPlayer.playerId) {
                    otherPlayer.setRotation(playerInfo.rotation);
                    otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                }
            });
        });
    }

    update() {
        //The player is created upon a socket.io connection being made.
        //It is possible for the these functions to fire without the player being created
        //Causing the game to crash, this is at best a hacky solution
        if(this.player){
        this.speedController();
        this.directionController();
        this.inertiaDampenerController();
        this.shootingController();
        this.updatePlayerMovement();
        }
        this.parallaxController();
    }

    //Main player movement functions

    //Controls player input for acceleration and deceleration
    speedController() {
        if (this.cursorKeys.up.isDown) {
            //Accelerate
            this.physics.velocityFromRotation(this.player.rotation, 250, this.player.body.acceleration);
        }
        else if (this.cursorKeys.down.isDown) {
            //Decelerate
            this.physics.velocityFromRotation(this.player.rotation, -250, this.player.body.acceleration);
        }
        else {
            this.player.setAcceleration(0);
        }
    }
    //Controlers player input for rotation
    directionController() {
        if (this.cursorKeys.left.isDown) {
            //Rotate left
            this.player.setRotation(this.player.rotation - 0.15)
        }
        else if (this.cursorKeys.right.isDown) {
            //Rotate Right
            this.player.setRotation(this.player.rotation + 0.15)
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

    addPlayer(self, playerInfo) {
        //Player added in here
        self.player = this.physics.add.sprite(playerInfo.x, playerInfo.y, "player_sprite");
        //Double the size + Play the player idle anim
        self.player.setScale(2);
        self.player.play("playerIdle_anim");

        //Player input/movement settings 
        self.cursorKeys = this.input.keyboard.createCursorKeys();
        //this.cursorKeys.space.setEmitOnRepeat(true);
        //Drag will use a damping effect rather than a linear approach. Much smoother brakes.
        self.player.setDamping(true);
        self.player.setDrag(this.playerDrag);
        //Used for the toggle in the dampener function
        self.dampeners = true;
        self.players.add(self.player);
        self.player.setMaxVelocity(this.playerMaxVelocity);
        self.player.setCollideWorldBounds(true);

        this.player.oldPosition = {
        x: this.player.x,
        y: this.player.y,
        rotation: this.player.rotation
        };


        this.myCam.startFollow(this.player);
    }

    addOtherPlayers(self, playerInfo) {
        const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'player_sprite').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
        otherPlayer.play("playerIdle_anim");
        if (playerInfo.team === 'blue') {
            otherPlayer.setTint(0x0000ff);
        } else {
            otherPlayer.setTint(0xff0000);
        }
        otherPlayer.playerId = playerInfo.playerId;
        self.players.add(otherPlayer);
    }

    updatePlayerMovement(){
        let x = this.player.x;
        let y = this.player.y;
        let r = this.player.r;

        if (this.player.oldPosition && (x !== this.player.oldPosition.x || y !== this.player.oldPosition.y || r !== this.player.oldPosition.rotation)) {
            this.socket.emit('playerMovement', { x: this.player.x, y: this.player.y, rotation: this.player.rotation });
        }
 
        // save old position data
        this.player.oldPosition = {
        x: this.player.x,
        y: this.player.y,
        rotation: this.player.rotation
};


    }
}

export default mainGame;

