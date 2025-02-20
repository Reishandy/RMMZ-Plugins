/*:
 * @target MZ
 * @plugindesc v1.0.0 - Smart pathfinding movement system
 * @author Reishandy
 *
 * @param MaxIteration
 * @type number
 * @min 100
 * @max 10000
 * @text Max Iteration
 * @desc Maximum number of iterations for the pathfinding algorithm, used to prevent infinite loops.
 * @default 500
 *
 * @param ThroughIfHardBlocked
 * @type boolean
 * @text Through If Hard Blocked (Recommended to enable)
 * @desc If true, characters will move through hard blocked situations. (See help for more info)
 * @default true
 *
 * @help
 * =======================================================================
 * Reishandy_PathFindMove.js - Version 1.0.0
 * =======================================================================
 * This plugin provides intelligent pathfinding for events and player movement.
 * Characters will automatically find the shortest path to their destination
 * while avoiding obstacles.
 *
 * Features:
 * - Efficient A* pathfinding algorithm
 * - Move events or player to any destination
 * - Automatically avoid obstacles
 * - Recalculate path if blocked
 * - Move through hard blocked situations (optional)
 *
 * About ThroughIfHardBlocked:
 * - !WARNING! Sometimes the character may move through or stay at impassable tiles.
 * - If enabled, characters will move through hard blocked situations if no other path is available.
 * - Hard blocked situations are when an event is blocking the way and there is no other path to the destination.
 * - This is useful for situations where the player or another event is blocking the way and there is no other path to the destination.
 * - If disabled, characters will not move if the path is blocked by an event, potentially causing them to get stuck.
 *
 * So, I recommend enabling this feature to prevent characters from getting stuck.
 *
 *  Usage
 * =============================================================================
 * Use the plugin command "MoveTo" to make a character move to a destination.
 *
 * Example:
 * 1. Moving current event to coordinates (5,7):
 *    - Subject: This Event
 *    - Target Type: Coordinates
 *    - X: 5
 *    - Y: 7
 *
 * 2. Moving Event ID 3 to the player:
 *    - Subject: Specific Event
 *    - Event ID: 3
 *    - Target Type: Player
 *
 *  Terms of Use
 * =============================================================================
 * Free for both commercial and non-commercial use.
 * Credit is appreciated but not required.
 * =============================================================================
 *
 * @command MoveTo
 * @text Move Character
 * @desc Make a character move to a specific destination using pathfinding
 *
 * @arg subject
 * @type select
 * @option This Event
 * @value thisEvent
 * @option Specific Event
 * @value event
 * @option Player
 * @value player
 * @text Subject
 * @desc Who should move? !WARNING! This Event would not work in parallel / autorun events
 * @default thisEvent
 *
 * @arg subjectEventId
 * @type number
 * @min 1
 * @text ├─ Event ID
 * @desc Which event should move? (Only if Subject is "Specific Event")
 * @default 1
 *
 * @arg targetType
 * @type select
 * @option Coordinates
 * @value coordinates
 * @option Specific Event
 * @value event
 * @text Target Type
 * @desc Where should they move to?
 * @default coordinates
 *
 * @arg targetX
 * @type number
 * @min 0
 * @text ├─ X Coordinate
 * @desc X coordinate to move to (Only if Target Type is "Coordinates")
 * @default 0
 *
 * @arg targetY
 * @type number
 * @min 0
 * @text ├─ Y Coordinate
 * @desc Y coordinate to move to (Only if Target Type is "Coordinates")
 * @default 0
 *
 * @arg targetEventId
 * @type number
 * @min 1
 * @text ├─ Event ID
 * @desc Which event should they move to? (Only if Target Type is "Specific Event")
 * @default 1
 *
 * @arg recalculateIfBlocked
 * @type boolean
 * @text Recalculate If Blocked
 * @desc If true, the path will be recalculated if blocked by an event
 * @default true
 */

(() => {
    "use strict";

    //-------------------------------------------------------------------------
    // Plugin Parameters
    //-------------------------------------------------------------------------
    const PLUGIN_NAME = "Reishandy_PathFindMove";
    const pluginParams = PluginManager.parameters(PLUGIN_NAME);
    const MAX_ITERATIONS = Number(pluginParams["MaxIteration"]) || 1000;
    const THROUGH_IF_HARD_BLOCKED =
        pluginParams["ThroughIfHardBlocked"] === "true";

    //-------------------------------------------------------------------------
    // Plugin Commands
    //-------------------------------------------------------------------------
    PluginManager.registerCommand(PLUGIN_NAME, "MoveTo", (args) => {
        const subject = args.subject;
        const subjectEventId = Number(args.subjectEventId);
        const targetType = args.targetType;
        const targetEventId = Number(args.targetEventId);
        const targetX = Number(args.targetX);
        const targetY = Number(args.targetY);
        const recalculateIfBlocked = args.recalculateIfBlocked === "true";

        // Get the character that will move
        let character;
        switch (subject) {
            case "thisEvent":
                character = $gameMap.event($gameMap._interpreter.eventId());
                break;
            case "player":
                character = $gamePlayer;
                break;
            case "event":
                character = $gameMap.event(subjectEventId);
                break;
        }

        // Get the target position
        let target;
        switch (targetType) {
            case "coordinates":
                target = { x: targetX, y: targetY };
                break;
            case "event":
                const targetEvent = $gameMap.event(targetEventId);
                target = { x: targetEvent.x, y: targetEvent.y };
                break;
        }

        if (character && target) {
            character.startPathfinding(target.x, target.y, recalculateIfBlocked);
        }
    });

    //-------------------------------------------------------------------------
    // Game_Character Pathfinding Methods
    //-------------------------------------------------------------------------
    Game_Character.prototype.startPathfinding = function (
        targetX,
        targetY,
        recalculateIfBlocked = true
    ) {
        this._pathfindingTarget = { x: targetX, y: targetY };
        this._pathfindingPath = this.findPath(targetX, targetY, false);

        // Handle path not found
        if (this._pathfindingPath.length === 0) {
            const closestPoint = this.findClosestAccessiblePoint(targetX, targetY);
            if (closestPoint) {
                this._pathfindingPath = this.findPath(closestPoint.x, closestPoint.y, false);
            }
        }

        this._pathfindingIndex = 0;
        this._recalculateIfBlocked = recalculateIfBlocked;
        this._pathfindingStuckCount = 0;
        this._originalThrough = this._through;
        this._forcingThrough = false;
        return true;
    };

    Game_Character.prototype.updatePathfinding = function () {
        if (!this._pathfindingTarget) return;

        // If no path or reached end of path
        if (!this._pathfindingPath || this._pathfindingIndex >= this._pathfindingPath.length) {
            this._pathfindingPath = null;
            this._pathfindingTarget = null;
            this._through = this._originalThrough;
            this._forcingThrough = false;
            return;
        }

        if (!this.isMoving()) {
            const nextNode = this._pathfindingPath[this._pathfindingIndex];

            if (this.x === nextNode.x && this.y === nextNode.y) {
                this._pathfindingIndex++;
                this._pathfindingStuckCount = 0;
                // Turn off through after successful movement
                if (this._forcingThrough) {
                    this._through = this._originalThrough;
                    this._forcingThrough = false;
                }
            } else {
                const direction = this.findDirectionTo(nextNode.x, nextNode.y);
                if (direction > 0) {
                    const nextX = $gameMap.roundXWithDirection(
                        this.x,
                        direction
                    );
                    const nextY = $gameMap.roundYWithDirection(
                        this.y,
                        direction
                    );
                    const canPassNormally = this.canPass(
                        this.x,
                        this.y,
                        direction
                    );

                    if (canPassNormally) {
                        this.moveStraight(direction);
                        this._pathfindingStuckCount = 0;
                    } else {
                        this._pathfindingStuckCount++;
                        if (
                            this._pathfindingStuckCount >= 3 &&
                            this._recalculateIfBlocked
                        ) {
                            // First try to find a normal path
                            const newPath = this.findPath(
                                this._pathfindingTarget.x,
                                this._pathfindingTarget.y,
                                false
                            );

                            if (newPath.length > 0) {
                                // Normal path found, use it
                                this._pathfindingPath = newPath;
                                this._pathfindingIndex = 0;
                                this._pathfindingStuckCount = 0;
                                this._through = this._originalThrough;
                                this._forcingThrough = false;
                            } else if (THROUGH_IF_HARD_BLOCKED) {
                                // No normal path found, try with through
                                this._forcingThrough = true;
                                this._through = true;
                                this.moveStraight(direction);
                                this._pathfindingStuckCount = 0;
                            }
                        }
                    }
                }
            }
        }
    };

    Game_Character.prototype.findPath = function (
        targetX,
        targetY,
        allowThrough = false
    ) {
        let iterations = 0;

        const openList = [];
        const closedList = [];
        const startNode = {
            x: this.x,
            y: this.y,
            g: 0,
            h: 0,
            f: 0,
            parent: null,
        };
        const targetNode = {
            x: targetX,
            y: targetY,
            g: 0,
            h: 0,
            f: 0,
            parent: null,
        };

        openList.push(startNode);

        while (openList.length > 0 && iterations < MAX_ITERATIONS) {
            iterations++;

            // Find node with lowest f cost
            const currentNode = openList.reduce((prev, curr) =>
                prev.f < curr.f ? prev : curr
            );

            // Check if we reached the target
            if (
                currentNode.x === targetNode.x &&
                currentNode.y === targetNode.y
            ) {
                const path = [];
                let node = currentNode;
                while (node) {
                    path.unshift({ x: node.x, y: node.y });
                    node = node.parent;
                }
                return path;
            }

            // Move current node from open to closed list
            openList.splice(openList.indexOf(currentNode), 1);
            closedList.push(currentNode);

            // Process neighbors
            const neighbors = this.getNeighbors(currentNode, allowThrough);
            for (const neighbor of neighbors) {
                // Skip if in closed list
                if (
                    closedList.some(
                        (node) => node.x === neighbor.x && node.y === neighbor.y
                    )
                ) {
                    continue;
                }

                // Calculate costs
                const g = currentNode.g + 1;
                const h =
                    Math.abs(neighbor.x - targetNode.x) +
                    Math.abs(neighbor.y - targetNode.y);
                const f = g + h;

                // Check if neighbor is in open list
                const existingNode = openList.find(
                    (node) => node.x === neighbor.x && node.y === neighbor.y
                );
                if (existingNode) {
                    if (g < existingNode.g) {
                        existingNode.g = g;
                        existingNode.f = f;
                        existingNode.parent = currentNode;
                    }
                } else {
                    openList.push({
                        ...neighbor,
                        g,
                        h,
                        f,
                        parent: currentNode,
                    });
                }
            }
        }

        // If no path is found, return empty array
        return [];
    };

    //-------------------------------------------------------------------------
    // Game_Character Neighbor Processing
    //-------------------------------------------------------------------------
    Game_Character.prototype.getNeighbors = function (
        node,
        allowThrough = false
    ) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1, dir: 8 }, // up
            { x: 1, y: 0, dir: 6 }, // right
            { x: 0, y: 1, dir: 2 }, // down
            { x: -1, y: 0, dir: 4 }, // left
        ];

        for (const direction of directions) {
            const x = node.x + direction.x;
            const y = node.y + direction.y;

            // Check if the tile is within map bounds
            if (
                x >= 0 &&
                x < $gameMap.width() &&
                y >= 0 &&
                y < $gameMap.height()
            ) {
                const mapPassable = $gameMap.isPassable(
                    node.x,
                    node.y,
                    direction.dir
                );
                const characterPassable = this.canPass(
                    node.x,
                    node.y,
                    direction.dir
                );

                if (mapPassable && (characterPassable || allowThrough)) {
                    neighbors.push({ x, y });
                }
            }
        }

        return neighbors;
    };

    //-------------------------------------------------------------------------
    // Game_Character Closest Accessible Point
    //-------------------------------------------------------------------------
    Game_Character.prototype.findClosestAccessiblePoint = function (
        targetX,
        targetY
    ) {
        const maxRadius = 5; // Maximum search radius
        let closestPoint = null;
        let closestDistance = Number.MAX_VALUE;

        // Search in expanding radius
        for (let radius = 0; radius <= maxRadius; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (Math.abs(dx) + Math.abs(dy) !== radius) continue;

                    const x = targetX + dx;
                    const y = targetY + dy;

                    // Check if position is valid and passable
                    if (
                        x >= 0 &&
                        x < $gameMap.width() &&
                        y >= 0 &&
                        y < $gameMap.height()
                    ) {
                        const path = this.findPath(x, y, false);
                        if (path && path.length > 0) {
                            const distance =
                                Math.abs(x - targetX) + Math.abs(y - targetY);
                            if (distance < closestDistance) {
                                closestDistance = distance;
                                closestPoint = { x, y };
                            }
                        }
                    }
                }
            }

            // If we found a point in this radius, return it
            if (closestPoint) return closestPoint;
        }

        return null;
    };

    //-------------------------------------------------------------------------
    // Game_Event & Game_Player Update Hooks
    //-------------------------------------------------------------------------
    const _Game_Event_update = Game_Event.prototype.update;
    Game_Event.prototype.update = function () {
        _Game_Event_update.call(this);
        this.updatePathfinding();
    };

    const _Game_Player_update = Game_Player.prototype.update;
    Game_Player.prototype.update = function (sceneActive) {
        _Game_Player_update.call(this, sceneActive);
        this.updatePathfinding();
    };
})();
