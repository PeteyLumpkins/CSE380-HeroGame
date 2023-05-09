import StateMachineAI from "../../Wolfie2D/AI/StateMachineAI";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import OrthogonalTilemap from "../../Wolfie2D/Nodes/Tilemaps/OrthogonalTilemap";

import Fall from "./PlayerStates/Fall";
import Idle from "./PlayerStates/Idle";
import Jump from "./PlayerStates/Jump";
import Run from "./PlayerStates/Run";

import Input from "../../Wolfie2D/Input/Input";

import { HW3Controls } from "../HW3Controls";
import HW3AnimatedSprite from "../Nodes/HW3AnimatedSprite";
import MathUtils from "../../Wolfie2D/Utils/MathUtils";
import { HW3Events } from "../HW3Events";
import Dead from "./PlayerStates/Dead";
import Receiver from "../../Wolfie2D/Events/Receiver";
import Timer from "../../Wolfie2D/Timing/Timer";
import Healthbar from "../Scenes/Healthbar";
import Positioned from "../../Wolfie2D/DataTypes/Interfaces/Positioned";
import Unique from "../../Wolfie2D/DataTypes/Interfaces/Unique";

/**
 * Animation keys for the player spritesheet
 */
export const PlayerAnimations = {
    ATTACKING_LEFT: "ATTACKING_LEFT",
    ATTACKING_RIGHT: "ATTACKING_RIGHT",
    IDLE: "IDLE",
    TAKING_DAMAGE: "TAKING_DAMAGE",
    DYING: "DYING",
    DEAD: "DEAD"
} as const

/**
 * Tween animations the player can player.
 */
export const PlayerTweens = {
    FLIP: "FLIP",
    DEATH: "DEATH"
} as const

/**
 * Keys for the states the PlayerController can be in.
 */
export const PlayerStates = {
    IDLE: "IDLE",
    RUN: "RUN",
	JUMP: "JUMP",
    FALL: "FALL",
    DEAD: "DEAD",
} as const

/**
 * The controller that controls the player.
 */
export default class PlayerController extends StateMachineAI implements Unique, Positioned {
    public readonly MAX_SPEED: number = 200;
    public readonly MIN_SPEED: number = 100;

    /** Health and max health for the player */
    protected _health: number;
    protected _maxHealth: number;

    /** The players game node */
    protected owner: HW3AnimatedSprite;

    protected _moveDirCounter: number;
    protected _moveDir: number;

    protected _velocity: Vec2;
	protected _speed: number;

    protected tilemap: OrthogonalTilemap;

    protected receiver: Receiver;


    public healthbar: Healthbar;

    
    public initializeAI(owner: HW3AnimatedSprite, options: Record<string, any>){
        this.owner = owner;
        this.receiver = new Receiver();
        this.receiver.subscribe("attacking");
        this.receiver.subscribe("dead");
        this.receiver.subscribe("attack-end");

        this.tilemap = this.owner.getScene().getTilemap(options.tilemap) as OrthogonalTilemap;
        this.speed = 400;
        this.velocity = Vec2.ZERO;
        this._moveDir = 0;
        this._moveDirCounter = 0;

        this.health = 50;
        this.maxHealth = 50;

        // this.health = 10
        // this.maxHealth = 10;

        // Add the different states the player can be in to the PlayerController 
		this.addState(PlayerStates.IDLE, new Idle(this, this.owner));
		this.addState(PlayerStates.RUN, new Run(this, this.owner));
        this.addState(PlayerStates.JUMP, new Jump(this, this.owner));
        this.addState(PlayerStates.FALL, new Fall(this, this.owner));
        this.addState(PlayerStates.DEAD, new Dead(this, this.owner));
        
        // Start the player in the Idle state
        this.initialize(PlayerStates.IDLE);

        this.healthbar = new Healthbar(this.owner.getScene(), this, this.owner.getLayer().getName(), {
            size: new Vec2(32, 16),
            offset: new Vec2(0, -32)
        });
    }

    /** 
	 * Get the inputs from the keyboard, or Vec2.Zero if nothing is being pressed
	 */
    public get inputDir(): Vec2 {
        let direction = Vec2.ZERO;

		direction.x = this.moveDir >= 0 ? 1 : -1;
        if (this.owner.onWall) {
            this.moveDir = this.moveDir >= 0 ? -1 : 0;
        }
        
		return direction;
    }
    /** 
     * Gets the direction of the mouse from the player's position as a Vec2
     */
    public get faceDir(): Vec2 { return this.owner.position.dirTo(Input.getGlobalMousePosition()); }

    public update(deltaT: number): void {
        while (this.receiver.hasNextEvent()) {
            super.handleEvent(this.receiver.getNextEvent());
        }
        this.healthbar.update(deltaT);
		super.update(deltaT);
        this._moveDirCounter -= this._moveDirCounter > 0 ? 1 : 0;
	}

    public get velocity(): Vec2 { return this._velocity; }
    public set velocity(velocity: Vec2) { this._velocity = velocity; }

    public get speed(): number { return this._speed; }
    public set speed(speed: number) { this._speed = speed; }

    public get moveDir(): number { return this._moveDir; }
    public set moveDir(movedir: number) { 
        if (this._moveDirCounter <= 0) {
            this._moveDir = movedir;
            this._moveDirCounter = 50;
        }
        
    }

    public get id(): number { return this.owner.id; }
    
    public get position(): Vec2 { return this.owner.position; }
    public get relativePosition() { return this.owner.relativePosition; }

    public get health(): number { return this._health; }
    public set health(health: number) { 
        this._health = MathUtils.clamp(health, 0, this.maxHealth); 
        if (this.health <= 0) {
            this.changeState(PlayerStates.DEAD);
        }
    }

    public get maxHealth(): number { return this._maxHealth; }
    public set maxHealth(maxHealth: number) { this._maxHealth = maxHealth; }

    // public get healthbar(): Healthbar { return this.healthbar; }

}