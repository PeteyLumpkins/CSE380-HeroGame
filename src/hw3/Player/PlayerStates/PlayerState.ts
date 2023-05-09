import State from "../../../Wolfie2D/DataTypes/State/State";
import GameEvent from "../../../Wolfie2D/Events/GameEvent";
import MathUtils from "../../../Wolfie2D/Utils/MathUtils";
import HW3AnimatedSprite from "../../Nodes/HW3AnimatedSprite";
import PlayerController, { PlayerStates, PlayerAnimations } from "../PlayerController";

/**
 * An abstract state for the PlayerController 
 */
export default abstract class PlayerState extends State {

    protected parent: PlayerController;
	protected owner: HW3AnimatedSprite;

    protected alive: boolean;
	protected gravity: number;

	public constructor(parent: PlayerController, owner: HW3AnimatedSprite){
		super(parent);
		this.owner = owner;
        this.gravity = 500;
        this.alive = true;
	}

    public abstract onEnter(options: Record<string, any>): void;

    /**
     * Handle game events from the parent.
     * @param event the game event
     */
	public handleInput(event: GameEvent): void {
        switch(event.type) {
            case "attack-end": {
                if (event.data.get("owner") === this.owner.id) { 
                    this.owner.animation.play(PlayerAnimations.IDLE); 
                }
                break;
            }
            case "attacking": {
                if (event.data.get("id") !== this.owner.id) {
                    this.owner.animation.play(PlayerAnimations.TAKING_DAMAGE)
                    this.parent.health -= 1
                }
                break;
            }
            case "dead": {
                break;
            }
            // Default - throw an error
            default: {
                throw new Error(`Unhandled event in PlayerState of type ${event.type}`);
            }
        }
	}

	public update(deltaT: number): void {

        if (this.alive) {
            let num = Math.random();
            if (num > .95) {
                this.parent.velocity.y -= 10;
                this.finished(PlayerStates.JUMP);
            }

            let attack = Math.random();
            if (attack > .99) {
                let halfsize = this.owner.collisionShape.halfSize;
                let radius = halfsize.x > halfsize.y ? halfsize.x : halfsize.y;
                this.emitter.fireEvent("attacking", {
                    id: this.owner.id, 
                    position: this.owner.position.clone(), 
                    radius: radius,
                    direction: this.parent.velocity.x
                });
                if (this.parent.velocity.x < 0) {
                    this.owner.animation.playIfNotAlready(PlayerAnimations.ATTACKING_LEFT, false, "attack-end");
                } else {
                    this.owner.animation.playIfNotAlready(PlayerAnimations.ATTACKING_RIGHT, false, "attack-end");
                }
            }
        }

    }

    public abstract onExit(): Record<string, any>;
}