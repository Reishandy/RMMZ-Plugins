/*:
 * @target MZ
 * @plugindesc v1.0.2 - A simple toast notification system for RPG Maker MZ
 * @author Reishandy
 *
 * @param MaxWidth
 * @type number
 * @min 10
 * @max 100
 * @text Toast Width (%)
 * @desc Percentage of the screen width for toast notifications.
 * @default 70
 *
 * @param MaxToasts
 * @type number
 * @min 1
 * @max 100
 * @text Maximum Toasts
 * @desc Maximum number of toasts that can be displayed at once.
 * @default 3
 *
 * @param MaxLines
 * @type number
 * @min 1
 * @max 100
 * @text Maximum Lines
 * @desc Maximum number of lines for toast messages. Text will be truncated if exceeds.
 * @default 3
 *
 * @param DisplayTime
 * @type number
 * @min 30
 * @max 3600
 * @text Display Duration
 * @desc How long toasts stay visible (in frames, 60 frames = 1 second)
 * @default 180
 *
 * @param SlideSpeed
 * @type number
 * @min 1
 * @max 16
 * @text Slide Speed
 * @desc Speed of toast sliding animation (1-16)
 * @default 8
 *
 * @param ToastPosition
 * @type select
 * @option Top
 * @option Bottom
 * @text Toast Position
 * @desc Position of the toasts on the screen (Top or Bottom).
 * @default Bottom
 *
 * @param SoundEffect
 * @type struct<SoundEffect>
 * @text Sound Effect
 * @desc Sound effect settings for toast notifications.
 * @default {"enabled":"true","name":"Decision5","volume":"60","pitch":"100","pan":"0"}
 *
 *
 * @help
 * Reishandy_Toast.js - Version 1.0.2
 * ============================================================================
 *
 * Description:
 * This plugin provides a toast notification system that displays non-intrusive
 * messages that automatically fade away. Toasts can be displayed from the top
 * or bottom of the screen.
 *
 * Features:
 * - Configurable toast width and display duration
 * - Automatic word wrapping for long messages
 * - Smooth slide and fade animations
 * - Stack management for multiple toasts
 * - Can be called from events or other plugins
 *
 * Plugin Commands:
 * ---------------
 * 1. ShowToast
 *    - Shows a toast notification with specified text
 *    Parameters:
 *    - Text: The message to display
 *
 * For Other Plugins:
 * -----------------
 * To show a toast from another plugin, use:
 * PluginManager.callCommand(this, "Reishandy_Toast", "ShowToast", {
 *     text: "Your message here"
 * });
 *
 * Or use the global function:
 * $gameSystem.showToast("Your message here");
 *
 * Terms of Use:
 * Free for both commercial and non-commercial projects.
 * Credit is appreciated but not required.
 * ============================================================================
 *
 * @command ShowToast
 * @text Show Toast
 * @desc Shows a toast notification.
 *
 * @arg text
 * @type string
 * @text Message
 * @desc The text to show in the toast notification.
 */

/*~struct~SoundEffect:
 * @param enabled
 * @type boolean
 * @text Enable Sound
 * @desc Play a sound effect when toast appears?
 * @default true
 *
 * @param name
 * @type file
 * @dir audio/se/
 * @text Sound Effect
 * @desc Sound effect to play when toast appears. Leave empty to disable.
 * @default Decision5
 *
 * @param volume
 * @type number
 * @min 0
 * @max 100
 * @text Volume
 * @desc Volume of the sound effect (0-100)
 * @default 60
 *
 * @param pitch
 * @type number
 * @min 50
 * @max 150
 * @text Pitch
 * @desc Pitch of the sound effect (50-150)
 * @default 100
 *
 * @param pan
 * @type number
 * @min -100
 * @max 100
 * @text Pan
 * @desc Pan of the sound effect (-100 to 100)
 * @default 0
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "Reishandy_Toast";
    const params = PluginManager.parameters(PLUGIN_NAME);
    const MAX_WIDTH_PERCENT = Number(params["MaxWidth"]) / 100;
    const MAX_TOASTS = Number(params["MaxToasts"]);
    const DISPLAY_TIME = Number(params["DisplayTime"]);
    const SLIDE_SPEED = Number(params["SlideSpeed"]);
    const TOAST_POSITION = params["ToastPosition"];
    const MAX_LINES = Number(params["MaxLines"]);
    const soundSettings = JSON.parse(params["SoundEffect"] || "{}");
    const ENABLE_SOUND =
        String(soundSettings.enabled || "false").toLowerCase() === "true";
    const SOUND_NAME = soundSettings.name;
    const SOUND_VOLUME = Number(soundSettings.volume);
    const SOUND_PITCH = Number(soundSettings.pitch);
    const SOUND_PAN = Number(soundSettings.pan);
    const toastQueue = [];
    let isProcessingQueue = false;

    //------------------------------------------------------------------------
    // Plugin Command Registration
    //------------------------------------------------------------------------

    PluginManager.registerCommand(PLUGIN_NAME, "ShowToast", (args) => {
        const text = args.text;
        showToast(text);
    });

    //------------------------------------------------------------------------
    // Toast Notification System
    //------------------------------------------------------------------------

    function Window_Toast() {
        this.initialize(...arguments);
    }

    Window_Toast.prototype = Object.create(Window_Base.prototype);
    Window_Toast.prototype.constructor = Window_Toast;

    Window_Toast.prototype.initialize = function () {
        Window_Base.prototype.initialize.call(this, new Rectangle(0, 0, 1, 1));
        this.opacity = 255;
        this.contentsOpacity = 0;
        this.count = 0;
        this.slideY = 0;
        this.hide();
    };

    Window_Toast.prototype.update = function () {
        Window_Base.prototype.update.call(this);
        if (this.count > 0) {
            this.count--;
            this.contentsOpacity = Math.min(this.contentsOpacity + 16, 255);
            this.opacity = Math.min(this.opacity + 16, 255);
            if (this.slideY > 0) {
                this.slideY = Math.max(0, this.slideY - SLIDE_SPEED);
                this.updatePosition();
            }
            if (this.count === 0) {
                this.startFadeOut();
            }
        } else if (this.contentsOpacity > 0) {
            this.startFadeOut();
        }
    };

    Window_Toast.prototype.updatePosition = function () {
        const baseY =
            TOAST_POSITION === "Top" ? 0 : Graphics.height - this.height - 100;
        const currentToasts = SceneManager._scene._activeToasts;
        const myIndex = currentToasts.indexOf(this);
        let totalOffset = 0;

        for (let i = 0; i < myIndex; i++) {
            if (currentToasts[i] && currentToasts[i].visible) {
                totalOffset += currentToasts[i].height;
            }
        }

        let targetY =
            TOAST_POSITION === "Top"
                ? baseY + totalOffset + this.slideY
                : baseY - totalOffset + this.slideY;
        this.y = targetY;
    };

    Window_Toast.prototype.startFadeOut = function () {
        this.contentsOpacity = Math.max(this.contentsOpacity - 16, 0);
        this.opacity = Math.max(this.opacity - 16, 0);
        if (this.contentsOpacity === 0) {
            this.hide();
        }
    };

    Window_Toast.prototype.showMessage = function (text) {
        if (ENABLE_SOUND && SOUND_NAME) {
            AudioManager.playSe({
                name: SOUND_NAME,
                volume: SOUND_VOLUME,
                pitch: SOUND_PITCH,
                pan: SOUND_PAN,
            });
        }

        const maxWidth = Math.floor(Graphics.width * MAX_WIDTH_PERCENT);
        const padding = this.padding * 2;

        const processedText = this.convertEscapeCharacters(text);
        const lines = [];
        const words = processedText.split(" ");
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + " " + words[i];
            if (this.textSizeEx(testLine).width > maxWidth - padding - 32) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);

        if (lines.length > MAX_LINES) {
            const excessLines = lines.splice(MAX_LINES - 1);
            lines[MAX_LINES - 1] = excessLines[0] + "...";
        }

        const width = Math.min(
            maxWidth,
            Math.max(...lines.map((line) => this.textSizeEx(line).width)) +
                padding +
                32
        );
        const height =
            this.lineHeight() * Math.min(lines.length, MAX_LINES) + padding;

        this.width = width;
        this.height = height;
        this.x = (Graphics.width - width) / 2;
        this.y = TOAST_POSITION === "Top" ? 0 : Graphics.height - height - 100;

        this.createContents();
        this.count = DISPLAY_TIME;
        this.show();
        this.contents.clear();

        lines.forEach((line, index) => {
            if (index < MAX_LINES) {
                const lineWidth = this.textSizeEx(line).width;
                const x = Math.max(0, (width - padding - lineWidth) / 2);
                this.drawTextEx(line, x, this.lineHeight() * index);
            }
        });
    };

    function processToastQueue() {
        if (isProcessingQueue || toastQueue.length === 0) return;

        isProcessingQueue = true;
        const message = toastQueue.shift();

        if (!SceneManager._scene._activeToasts) {
            SceneManager._scene._activeToasts = [];
        }

        SceneManager._scene._activeToasts =
            SceneManager._scene._activeToasts.filter(
                (toast) => toast && toast.visible && toast.contentsOpacity > 0
            );

        if (SceneManager._scene._activeToasts.length >= MAX_TOASTS) {
            const oldestToast = SceneManager._scene._activeToasts.pop();
            if (oldestToast) {
                oldestToast.count = 0;
            }
        }

        const toast = new Window_Toast();

        SceneManager._scene.addWindow(toast);
        SceneManager._scene._activeToasts.unshift(toast);
        toast.showMessage(message);

        SceneManager._scene._activeToasts.forEach((t, index) => {
            if (t && t.visible && index > 0) {
                t.slideY = 50;
                t.updatePosition();
            }
        });

        setTimeout(() => {
            isProcessingQueue = false;
            processToastQueue();
        }, 500);
    }

    function showToast(message) {
        toastQueue.push(message);
        processToastQueue();
    }

    //------------------------------------------------------------------------
    // Global Functions
    //------------------------------------------------------------------------

    Game_System.prototype.showToast = function (message) {
        showToast(message);
    };
})();
