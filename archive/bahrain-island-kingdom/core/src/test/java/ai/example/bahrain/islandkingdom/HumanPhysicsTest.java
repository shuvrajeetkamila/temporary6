package ai.example.bahrain.islandkingdom;

import ai.example.bahrain.islandkingdom.human.HumanController;
import org.junit.Test;
import static org.junit.Assert.*;

public class HumanPhysicsTest {

    @Test
    public void testJumpVelocityPhysics() {
        HumanController human = new HumanController(0.0, 0.0, 0.0);

        // Initial ground state
        assertEquals("Initial state is IDLE", HumanController.LocomotionState.IDLE, human.getState());

        // Jump trigger
        human.step(1.0f / 60.0f, 0.0f, 0.0f, false, true, 28.0f, -10.0f);
        assertEquals("State transitions to JUMP", HumanController.LocomotionState.JUMP, human.getState());
        assertTrue("Capsule height exceeds ground", human.getPosY() > 0.0);
    }

    @Test
    public void testHeatFatigueAndStaminaRecovery() {
        HumanController human = new HumanController(0.0, 0.0, 0.0);
        float initStamina = human.getStamina();
        assertEquals(100.0f, initStamina, 0.1f);

        // Sprinting in 45C summer heat should drain stamina
        for (int i = 0; i < 60; i++) {
            human.step(1.0f / 60.0f, 1.0f, 0.0f, true, false, 45.0f, -10.0f);
        }
        float drainedStamina = human.getStamina();
        assertTrue("Stamina should deplete during sprint", drainedStamina < initStamina);

        // Rest in covered shaded hub
        human.setInShadeOrHub(true);
        for (int i = 0; i < 60; i++) {
            human.step(1.0f / 60.0f, 0.0f, 0.0f, false, false, 45.0f, -10.0f);
        }
        assertTrue("Stamina recovers in shade", human.getStamina() > drainedStamina);
    }
}
