import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import GameEvent from "../../Wolfie2D/Events/GameEvent";
import { GameEventType } from "../../Wolfie2D/Events/GameEventType";
import Input from "../../Wolfie2D/Input/Input";
import { TweenableProperties } from "../../Wolfie2D/Nodes/GameNode";
import { GraphicType } from "../../Wolfie2D/Nodes/Graphics/GraphicTypes";
import Rect from "../../Wolfie2D/Nodes/Graphics/Rect";
import AnimatedSprite from "../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import OrthogonalTilemap from "../../Wolfie2D/Nodes/Tilemaps/OrthogonalTilemap";
import Label from "../../Wolfie2D/Nodes/UIElements/Label";
import { UIElementType } from "../../Wolfie2D/Nodes/UIElements/UIElementTypes";
import RenderingManager from "../../Wolfie2D/Rendering/RenderingManager";
import Scene from "../../Wolfie2D/Scene/Scene";
import SceneManager from "../../Wolfie2D/Scene/SceneManager";
import Viewport from "../../Wolfie2D/SceneGraph/Viewport";
import Timer from "../../Wolfie2D/Timing/Timer";
import Color from "../../Wolfie2D/Utils/Color";
import { EaseFunctionType } from "../../Wolfie2D/Utils/EaseFunctions";
import PlayerController, { PlayerTweens } from "../Player/PlayerController";

import { HW3Events } from "../HW3Events";
import { HW3PhysicsGroups } from "../HW3PhysicsGroups";
import HW3FactoryManager from "../Factory/HW3FactoryManager";
import MainMenu from "./MainMenu";
import Particle from "../../Wolfie2D/Nodes/Graphics/Particle";
import RandUtils from "../../Wolfie2D/Utils/RandUtils";
import HW3Level1 from "./HW3Level1";

/**
 * A const object for the layer names
 */
export const HW3Layers = {
    // The primary layer
    PRIMARY: "PRIMARY",
    // The UI layer
    UI: "UI"
} as const;

// The layers as a type
export type HW3Layer = typeof HW3Layers[keyof typeof HW3Layers]

/**
 * An abstract HW4 scene class.
 */
export default abstract class HW3Level extends Scene {

    /** Overrride the factory manager */
    public add: HW3FactoryManager;


    /** The key for the player's animated sprite */
    protected playerSpriteKey: string;
    /** The animated sprite that is the player */
    protected player: AnimatedSprite;
    /** The player's spawn position */
    protected playerSpawn: Vec2;

    /** The keys to the tilemap and different tilemap layers */
    protected tilemapKey: string;
    protected destructibleLayerKey: string;
    protected wallsLayerKey: string;
    /** The scale for the tilemap */
    protected tilemapScale: Vec2;
    /** The destrubtable layer of the tilemap */
    protected destructable: OrthogonalTilemap;
    /** The wall layer of the tilemap */
    protected walls: OrthogonalTilemap;

    protected timer: Timer;
    protected time: Label;

    protected sprites: AnimatedSprite[];
    protected names: Label[];

    protected heroKeys: string[];

    public constructor(viewport: Viewport, sceneManager: SceneManager, renderingManager: RenderingManager, options: Record<string, any>) {
        super(viewport, sceneManager, renderingManager, {...options, physics: {
            groupNames: [
                HW3PhysicsGroups.GROUND, 
                HW3PhysicsGroups.PLAYER, 
                HW3PhysicsGroups.PLAYER_WEAPON, 
                HW3PhysicsGroups.DESTRUCTABLE
            ],
            collisions:
            [
                [0, 1, 1, 0],
                [1, 0, 0, 1],
                [1, 0, 0, 1],
                [0, 1, 1, 0],
            ]
        }});
        this.sprites = new Array<AnimatedSprite>();
        this.names = new Array<Label>();


        this.timer = new Timer(1000*30, () => {
            this.sceneManager.changeToScene(HW3Level1);
        });
        this.add = new HW3FactoryManager(this, this.tilemaps);
    }

    public startScene(): void {
        // Initialize the layers
        this.initLayers();
        
        this.receiver.subscribe("dead");
        // Initialize the tilemaps
        this.initializeTilemap();

        // Initialize the player 
        for (let key of this.heroKeys) this.initializePlayer(key, parseInt(key.substring(4)));

        // Initialize the viewport - this must come after the player has been initialized
        this.initializeViewport();
        this.subscribeToEvents();
        this.initializeUI();
        
        // Start the black screen fade out
        this.timer.start();
        this.time = <Label>this.add.uiElement(UIElementType.LABEL, HW3Layers.UI, {position: new Vec2(500, 64), text: "60"});

        // Initially disable player movement
        Input.disableInput();

    }

    public loadScene(): void {
        this.heroKeys = new Array<string>();
        let set = new Set<number>();
        while (set.size < 10) {
            let num = Math.floor(Math.random() * 35)
            while (set.has(num) || num === 22) num = Math.floor(Math.random() * 35);
            set.add(num);
        }
        for (let num of set) this.heroKeys.push(("hero" + num));
        console.log(this.heroKeys);
        for (let i = 0; i < this.heroKeys.length; i++) {
            this.load.spritesheet(this.heroKeys[i], `assets/spritesheets/${this.heroKeys[i]}/${this.heroKeys[i]}.json`);
        }
        this.load.object("names", "./assets/names.json");
    }

    public unloadScene(): void {

    }

    /* Update method for the scene */

    public updateScene(deltaT: number) {
        // Handle all game events
        while (this.receiver.hasNextEvent()) {
            this.handleEvent(this.receiver.getNextEvent());
        }

        let s = Math.round(this.timer.getTimeLeft() / 1000);
        let ms = Math.round(this.timer.getTimeLeft()) % 1000;
        this.time.text = ("" + s + "." + ms);

        let names = this.load.getObject("names");
        for (let i = 0; i < this.sprites.length; i++) {
            this.names[i].position.copy(this.sprites[i].position).inc(0, -64);
        }
    }

    /**
     * Handle game events. 
     * @param event the game event
     */
    protected handleEvent(event: GameEvent): void {
        switch (event.type) {
            // When the level starts, reenable user input
            case HW3Events.LEVEL_START: {
                Input.enableInput();
                break;
            }
            case "dead": {
                let id = event.data.get("owner");
                let k = 0;
                for (let i = 0; i < this.sprites.length; i++) {
                    if (this.sprites[i].id === id) {
                        k = i;
                        break;
                    }
                }
                this.names[k].visible = false;
                break;
            }
            // Default: Throw an error! No unhandled events allowed.
            default: {
                throw new Error(`Unhandled event caught in scene with type ${event.type}`)
            }
        }
    }

    /* Initialization methods for everything in the scene */

    /**
     * Initialzes the layers
     */
    protected initLayers(): void {
        // Add a layer for UI
        this.addUILayer(HW3Layers.UI);
        // Add a layer for players and enemies
        this.addLayer(HW3Layers.PRIMARY);
    }
    /**
     * Initializes the tilemaps
     * @param key the key for the tilemap data
     * @param scale the scale factor for the tilemap
     */
    protected initializeTilemap(): void {
        if (this.tilemapKey === undefined || this.tilemapScale === undefined) {
            throw new Error("Cannot add the homework 4 tilemap unless the tilemap key and scale are set.");
        }
        // Add the tilemap to the scene
        this.add.tilemap(this.tilemapKey, new Vec2(6, 6));

        if (this.destructibleLayerKey === undefined || this.wallsLayerKey === undefined) {
            throw new Error("Make sure the keys for the destuctible layer and wall layer are both set");
        }

        // Get the wall and destructible layers 
        this.walls = this.getTilemap(this.wallsLayerKey) as OrthogonalTilemap;
    }
    /**
     * Handles all subscriptions to events
     */
    protected subscribeToEvents(): void {
        // this.receiver.subscribe(HW3Events.PLAYER_ENTERED_LEVEL_END);
        // this.receiver.subscribe(HW3Events.LEVEL_START);
        // this.receiver.subscribe(HW3Events.LEVEL_END);
        // this.receiver.subscribe(HW3Events.PARTICLE_HIT_DESTRUCTIBLE);
        // this.receiver.subscribe(HW3Events.HEALTH_CHANGE);
        // this.receiver.subscribe(HW3Events.PLAYER_DEAD);
    }
    /**
     * Adds in any necessary UI to the game
     */
    protected initializeUI(): void {

    }

    /**
     * Initializes the player, setting the player's initial position to the given position.
     * @param position the player's spawn position
     */
    protected initializePlayer(key: string, index: number): void {
        console.log(index);
        if (this.playerSpawn === undefined) {
            throw new Error("Player spawn must be set before initializing the player!");
        }

        let spawn = RandUtils.randVec(64, 160*4 - 64, 64, 64);

        // Add the player to the scene
        this.player = this.add.animatedSprite(key, HW3Layers.PRIMARY);
        this.player.scale.set(1, 1);
        this.player.position.copy(spawn);
        
        // Give the player physics and setup collision groups and triggers for the player
        this.player.addPhysics(new AABB(this.player.position.clone(), this.player.boundary.getHalfSize().clone()));
        this.player.setGroup(HW3PhysicsGroups.PLAYER);

        // Give the player a flip animation
        this.player.tweens.add(PlayerTweens.FLIP, {
            startDelay: 0,
            duration: 500,
            effects: [
                {
                    property: "rotation",
                    start: 0,
                    end: 2*Math.PI,
                    ease: EaseFunctionType.IN_OUT_QUAD
                }
            ]
        });
        // Give the player a death animation
        this.player.tweens.add(PlayerTweens.DEATH, {
            startDelay: 0,
            duration: 500,
            effects: [
                {
                    property: "rotation",
                    start: 0,
                    end: Math.PI,
                    ease: EaseFunctionType.IN_OUT_QUAD
                },
                {
                    property: "alpha",
                    start: 1,
                    end: 0,
                    ease: EaseFunctionType.IN_OUT_QUAD
                }
            ],
            onEnd: HW3Events.PLAYER_DEAD
        });

        // Give the player it's AI
        this.player.addAI(PlayerController, { 
            tilemap: "Destructable" 
        });

        this.sprites.push(this.player);
        this.initializeLabel(index);
    }
    protected initializeLabel(index: number): void {
        this.names.push(<Label>this.add.uiElement(UIElementType.LABEL, HW3Layers.UI, {position: Vec2.ZERO, text: ""}));
        let names = this.load.getObject("names");
        this.names[this.names.length - 1].fontSize = 16;
        this.names[this.names.length - 1].text = names.students[index];
        this.names[this.names.length - 1].position.copy(this.sprites[this.names.length - 1].position);
    }
    /**
     * Initializes the viewport
     */
    protected initializeViewport(): void {
        if (this.player === undefined) {
            throw new Error("Player must be initialized before setting the viewport to folow the player");
        }
        this.viewport.setBounds(0, 0, 160*4, 160*4);
    }

}