/*:
 * @target MZ
 * @plugindesc v1.0.0 - Customizes menu layout with compact design
 * @author Reishandy
 * @help 
 * This plugin makes three modifications to the menu system:
 * 1. Removes the actor status window from the main menu
 * 2. Makes the command and gold windows more compact
 * 
 * @param windowWidth
 * @text Window Width (%)
 * @type number
 * @min 10
 * @max 100
 * @default 30
 */

(() => {
    const parameters = PluginManager.parameters('menu');
    const windowWidthPercent = Number(parameters['windowWidth'] || 30);

    // Remove status window from main menu
    Scene_Menu.prototype.createStatusWindow = function() {
        this._statusWindow = new Window_Base(new Rectangle(0, 0, 0, 0));
        this._statusWindow.refresh = function() {};
        this.addWindow(this._statusWindow);
    };

    // Place gold window below the command window in the main menu
    Scene_Menu.prototype.createGoldWindow = function() {
        const rect = this.goldWindowRect();
        this._goldWindow = new Window_Gold(rect);
        this.addWindow(this._goldWindow);
    };

    Scene_Menu.prototype.goldWindowRect = function() {
        const ww = Graphics.boxWidth * (windowWidthPercent / 100);
        const wh = this.calcWindowHeight(1, true);
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = this._commandWindow.y + this._commandWindow.height + 10;
        return new Rectangle(wx, wy, ww, wh);
    };

    // Modify command window to fit content
    Scene_Menu.prototype.commandWindowRect = function() {
        const ww = Graphics.boxWidth * (windowWidthPercent / 100);
        const wh = this.calcWindowHeight(5, true);
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = Math.floor((Graphics.boxHeight - wh) / 2);
        return new Rectangle(wx, wy, ww, wh);
    };
})();