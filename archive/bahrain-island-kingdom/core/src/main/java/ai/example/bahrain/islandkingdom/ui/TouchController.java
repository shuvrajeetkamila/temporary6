package ai.example.bahrain.islandkingdom.ui;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input.Keys;
import com.badlogic.gdx.InputAdapter;
import com.badlogic.gdx.math.Vector2;

/**
 * Universal Mobile Touch and Keyboard/Mouse Input Controller for Bahrain.
 * Features:
 * - Floating analog thumbstick on the left screen half for dual-stick movement and steering.
 * - Right-screen touch dragging for orbital third-person camera rotation.
 * - Dedicated on-screen touch buttons for Sprint, Jump/Handbrake, and Enter/Exit Vehicle.
 * - Full desktop fallback bindings (WASD, Shift, Space, F/Enter, Arrow Keys).
 */
public class TouchController extends InputAdapter {

    private final GameHUD hud;

    // Virtual Joystick State
    private int joystickPointer = -1;
    public boolean joystickActive = false;
    public final Vector2 joystickCenter = new Vector2(160f, 160f);
    public final Vector2 joystickKnob = new Vector2(160f, 160f);
    public float joystickRadius = 80f;

    // Camera Touch State
    private int cameraPointer = -1;
    private final Vector2 lastTouchPos = new Vector2();
    public float cameraDeltaYaw = 0.0f;
    public float cameraDeltaPitch = 0.0f;

    // Action Button Touch Regions (Computed dynamically on resize)
    public final Vector2 btnSprintCenter = new Vector2();
    public float btnSprintRadius = 45f;
    public boolean btnSprintPressed = false;

    public final Vector2 btnJumpCenter = new Vector2();
    public float btnJumpRadius = 45f;
    public boolean btnJumpPressed = false;

    public final Vector2 btnEnterCenter = new Vector2();
    public float btnEnterRadius = 50f;
    public boolean btnEnterPressed = false;
    public boolean showEnterPrompt = false;

    // Keyboard state
    private boolean keyForward = false;
    private boolean keyBackward = false;
    private boolean keyLeft = false;
    private boolean keyRight = false;
    private boolean keySprint = false;
    private boolean keyJump = false;

    // Radar Minimap Bounds (for tapping to open map modal)
    public final Vector2 radarMinimapCenter = new Vector2();
    public float radarMinimapRadius = 90f;
    public boolean requestOpenMap = false;

    // 5 Entity Switcher Touch Bounds (Human, Car, Boat, Heli, Plane)
    public final Vector2[] btnVehicleSlots = new Vector2[] {
            new Vector2(), new Vector2(), new Vector2(), new Vector2(), new Vector2()
    };
    public float btnVehicleW = 75f;
    public float btnVehicleH = 40f;

    // Quick vehicle swap request
    public int requestVehicleSwap = 0; // 0 = none, 1 = foot, 2 = car, 3 = boat, 4 = heli, 5 = plane

    public TouchController(GameHUD hud) {
        this.hud = hud;
        updateButtonPositions(Gdx.graphics != null ? Gdx.graphics.getWidth() : 1280,
                Gdx.graphics != null ? Gdx.graphics.getHeight() : 720);
    }

    public void updateButtonPositions(int screenWidth, int screenHeight) {
        joystickRadius = screenHeight * 0.12f;
        btnSprintRadius = screenHeight * 0.08f;
        btnJumpRadius = screenHeight * 0.08f;
        btnEnterRadius = screenHeight * 0.09f;

        btnSprintCenter.set(screenWidth - btnSprintRadius * 1.6f, btnSprintRadius * 1.6f);
        btnJumpCenter.set(screenWidth - btnJumpRadius * 1.6f, btnSprintRadius * 3.6f);
        btnEnterCenter.set(screenWidth - btnEnterRadius * 1.6f, btnSprintRadius * 5.8f);

        radarMinimapRadius = screenHeight * 0.14f;
        radarMinimapCenter.set(radarMinimapRadius * 1.35f, radarMinimapRadius * 1.45f);

        btnVehicleW = Math.min(90f, screenWidth * 0.12f);
        btnVehicleH = screenHeight * 0.055f;
        float startX = (screenWidth - (btnVehicleW * 5 + 40f)) / 2f;
        float barY = 15f;
        for (int i = 0; i < 5; i++) {
            btnVehicleSlots[i].set(startX + i * (btnVehicleW + 10f), barY);
        }
    }

    @Override
    public boolean touchDown(int screenX, int screenY, int pointer, int button) {
        int height = Gdx.graphics.getHeight();
        float touchY = height - screenY; // Convert to OpenGL Y-up

        Vector2 touch = new Vector2(screenX, touchY);

        // 0. Check Minimap Tap to open Fullscreen World Map
        if (touch.dst(radarMinimapCenter) <= radarMinimapRadius) {
            requestOpenMap = true;
            return true;
        }

        // 0b. Check 5 Entity Switcher Touch Buttons
        for (int i = 0; i < 5; i++) {
            if (screenX >= btnVehicleSlots[i].x && screenX <= btnVehicleSlots[i].x + btnVehicleW &&
                    touchY >= btnVehicleSlots[i].y && touchY <= btnVehicleSlots[i].y + btnVehicleH) {
                requestVehicleSwap = i + 1;
                return true;
            }
        }

        // 1. Check Action Buttons on the Right Side
        if (touch.dst(btnSprintCenter) <= btnSprintRadius) {
            btnSprintPressed = true;
            hud.inputAction1 = true;
            return true;
        }
        if (touch.dst(btnJumpCenter) <= btnJumpRadius) {
            btnJumpPressed = true;
            hud.inputAction2 = true;
            return true;
        }
        if (touch.dst(btnEnterCenter) <= btnEnterRadius) {
            btnEnterPressed = true;
            hud.inputInteract = true;
            return true;
        }

        // 2. Left 45% Screen: Analog Thumbstick
        if (screenX < Gdx.graphics.getWidth() * 0.45f) {
            if (joystickPointer == -1) {
                joystickPointer = pointer;
                joystickActive = true;
                joystickCenter.set(screenX, touchY);
                joystickKnob.set(screenX, touchY);
                hud.inputMoveX = 0.0f;
                hud.inputMoveY = 0.0f;
                return true;
            }
        }

        // 3. Right Screen (not on buttons): Orbital Camera Drag
        if (cameraPointer == -1 && screenX >= Gdx.graphics.getWidth() * 0.45f) {
            cameraPointer = pointer;
            lastTouchPos.set(screenX, touchY);
            return true;
        }

        return false;
    }

    @Override
    public boolean touchDragged(int screenX, int screenY, int pointer) {
        int height = Gdx.graphics.getHeight();
        float touchY = height - screenY;

        // Joystick Drag
        if (pointer == joystickPointer) {
            Vector2 drag = new Vector2(screenX, touchY).sub(joystickCenter);
            float dist = drag.len();
            if (dist > joystickRadius) {
                drag.nor().scl(joystickRadius);
            }
            joystickKnob.set(joystickCenter).add(drag);

            hud.inputMoveX = drag.x / joystickRadius;
            hud.inputMoveY = drag.y / joystickRadius;
            return true;
        }

        // Camera Drag
        if (pointer == cameraPointer) {
            float dx = screenX - lastTouchPos.x;
            float dy = touchY - lastTouchPos.y;
            cameraDeltaYaw -= dx * 0.35f;
            cameraDeltaPitch += dy * 0.25f;
            lastTouchPos.set(screenX, touchY);
            return true;
        }

        return false;
    }

    @Override
    public boolean touchUp(int screenX, int screenY, int pointer, int button) {
        if (pointer == joystickPointer) {
            joystickPointer = -1;
            joystickActive = false;
            joystickKnob.set(joystickCenter);
            if (!keyForward && !keyBackward && !keyLeft && !keyRight) {
                hud.inputMoveX = 0.0f;
                hud.inputMoveY = 0.0f;
            }
            return true;
        }

        if (pointer == cameraPointer) {
            cameraPointer = -1;
            return true;
        }

        int height = Gdx.graphics.getHeight();
        float touchY = height - screenY;
        Vector2 touch = new Vector2(screenX, touchY);

        if (touch.dst(btnSprintCenter) <= btnSprintRadius * 1.4f) {
            btnSprintPressed = false;
            if (!keySprint) hud.inputAction1 = false;
        }
        if (touch.dst(btnJumpCenter) <= btnJumpRadius * 1.4f) {
            btnJumpPressed = false;
            if (!keyJump) hud.inputAction2 = false;
        }
        if (touch.dst(btnEnterCenter) <= btnEnterRadius * 1.4f) {
            btnEnterPressed = false;
            hud.inputInteract = false;
        }

        return false;
    }

    @Override
    public boolean keyDown(int keycode) {
        if (keycode == Keys.W || keycode == Keys.UP) {
            keyForward = true;
            hud.inputMoveY = 1.0f;
            return true;
        }
        if (keycode == Keys.S || keycode == Keys.DOWN) {
            keyBackward = true;
            hud.inputMoveY = -1.0f;
            return true;
        }
        if (keycode == Keys.A || keycode == Keys.LEFT) {
            keyLeft = true;
            hud.inputMoveX = -1.0f;
            return true;
        }
        if (keycode == Keys.D || keycode == Keys.RIGHT) {
            keyRight = true;
            hud.inputMoveX = 1.0f;
            return true;
        }
        if (keycode == Keys.SHIFT_LEFT || keycode == Keys.SHIFT_RIGHT) {
            keySprint = true;
            hud.inputAction1 = true;
            return true;
        }
        if (keycode == Keys.SPACE) {
            keyJump = true;
            hud.inputAction2 = true;
            return true;
        }
        if (keycode == Keys.F || keycode == Keys.E || keycode == Keys.ENTER) {
            hud.inputInteract = true;
            return true;
        }
        if (keycode == Keys.M) {
            requestOpenMap = true;
            return true;
        }
        // Quick vehicle sandbox keys
        if (keycode == Keys.NUM_1) requestVehicleSwap = 1;
        if (keycode == Keys.NUM_2) requestVehicleSwap = 2;
        if (keycode == Keys.NUM_3) requestVehicleSwap = 3;
        if (keycode == Keys.NUM_4) requestVehicleSwap = 4;
        if (keycode == Keys.NUM_5) requestVehicleSwap = 5;

        return false;
    }

    @Override
    public boolean keyUp(int keycode) {
        if (keycode == Keys.W || keycode == Keys.UP) {
            keyForward = false;
            hud.inputMoveY = keyBackward ? -1.0f : 0.0f;
            return true;
        }
        if (keycode == Keys.S || keycode == Keys.DOWN) {
            keyBackward = false;
            hud.inputMoveY = keyForward ? 1.0f : 0.0f;
            return true;
        }
        if (keycode == Keys.A || keycode == Keys.LEFT) {
            keyLeft = false;
            hud.inputMoveX = keyRight ? 1.0f : 0.0f;
            return true;
        }
        if (keycode == Keys.D || keycode == Keys.RIGHT) {
            keyRight = false;
            hud.inputMoveX = keyLeft ? -1.0f : 0.0f;
            return true;
        }
        if (keycode == Keys.SHIFT_LEFT || keycode == Keys.SHIFT_RIGHT) {
            keySprint = false;
            if (!btnSprintPressed) hud.inputAction1 = false;
            return true;
        }
        if (keycode == Keys.SPACE) {
            keyJump = false;
            if (!btnJumpPressed) hud.inputAction2 = false;
            return true;
        }
        if (keycode == Keys.F || keycode == Keys.E || keycode == Keys.ENTER) {
            hud.inputInteract = false;
            return true;
        }
        return false;
    }
}
