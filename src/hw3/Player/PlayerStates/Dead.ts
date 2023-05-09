import GameEvent from "../../../Wolfie2D/Events/GameEvent";
import { PlayerAnimations, PlayerTweens } from "../PlayerController";
import PlayerState from "./PlayerState";

/**
 * The Dead state for the player's FSM AI. 
 */
export default class Dead extends PlayerState {

    // Trigger the player's death animation when we enter the dead state
    public onEnter(options: Record<string, any>): void {
        this.alive = false;
        // this.owner.tweens.play(PlayerTweens.DEATH);
        this.owner.animation.play(PlayerAnimations.DYING, false, "dead");
    }

    // Ignore all events from the rest of the game
    public handleInput(event: GameEvent): void { 
        switch(event.type) {
            case "dead": {
                if (event.data.get("owner") === this.owner.id) {
                    this.owner.animation.play(PlayerAnimations.DEAD);
                    this.owner.visible = false;
                    this.parent.healthbar.visible = false;
                }
                break;
            }
            default: {
                break;
            }
        }
    }

    // Empty update method - if the player is dead, don't update anything
    public update(deltaT: number): void {
        super.update(deltaT);
    }

    public onExit(): Record<string, any> { return {}; }
    
}